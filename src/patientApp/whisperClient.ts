export type WhisperStatus = {
  state: 'idle' | 'loading' | 'ready' | 'error';
  progress: number;
};

export type WhisperLanguage = 'english' | 'spanish' | 'haitian creole';

type PendingTranscription = {
  resolve: (text: string) => void;
  reject: () => void;
};

let worker: Worker | null = null;
let status: WhisperStatus = { state: 'idle', progress: 0 };
let nextRequestId = 0;
const listeners = new Set<(nextStatus: WhisperStatus) => void>();
const pending = new Map<number, PendingTranscription>();

function updateStatus(next: WhisperStatus) {
  status = next;
  listeners.forEach((listener) => listener(status));
}

function failWorker() {
  updateStatus({ state: 'error', progress: 0 });
  pending.forEach(({ reject }) => reject());
  pending.clear();
  worker?.terminate();
  worker = null;
}

export function getWhisperStatus(): WhisperStatus {
  return status;
}

export function subscribeWhisperStatus(listener: (nextStatus: WhisperStatus) => void): () => void {
  listeners.add(listener);
  listener(status);
  return () => {
    listeners.delete(listener);
  };
}

export function ensureWhisperWorker(): boolean {
  if (status.state === 'error') return false;
  if (worker) return true;
  if (typeof Worker === 'undefined') {
    updateStatus({ state: 'error', progress: 0 });
    return false;
  }
  try {
    worker = new Worker(new URL('./whisperWorker.ts', import.meta.url), { type: 'module' });
    updateStatus({ state: 'loading', progress: 0 });
    worker.onmessage = (event: MessageEvent<{ type: string; id?: number; text?: string; progress?: number }>) => {
      const message = event.data;
      if (message.type === 'progress') {
        updateStatus({ state: 'loading', progress: message.progress ?? 0 });
      } else if (message.type === 'ready') {
        updateStatus({ state: 'ready', progress: 100 });
      } else if (message.type === 'load-error') {
        failWorker();
      } else if (message.type === 'result' && message.id !== undefined) {
        pending.get(message.id)?.resolve(message.text ?? '');
        pending.delete(message.id);
      } else if (message.type === 'transcription-error' && message.id !== undefined) {
        pending.get(message.id)?.reject();
        pending.delete(message.id);
      }
    };
    worker.onerror = failWorker;
    worker.postMessage({ type: 'load' });
    return true;
  } catch {
    failWorker();
    return false;
  }
}

export function transcribeWithWhisper(audio: Float32Array, language: WhisperLanguage): Promise<string> {
  if (!ensureWhisperWorker() || !worker) return Promise.reject(new Error('whisper_unavailable'));
  const id = ++nextRequestId;
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject });
    try {
      worker?.postMessage({ type: 'transcribe', id, audio, language }, [audio.buffer]);
    } catch {
      pending.delete(id);
      reject(new Error('whisper_unavailable'));
    }
  });
}
