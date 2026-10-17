import { env, pipeline } from '@huggingface/transformers';
import wasmFactoryUrl from 'onnxruntime-web/ort-wasm-simd-threaded.jsep.mjs?url';
import wasmBinaryUrl from 'onnxruntime-web/ort-wasm-simd-threaded.jsep.wasm?url';

type WorkerMessage =
  | { type: 'load' }
  | { type: 'transcribe' | 'partial'; id: number; audio: Float32Array; language: string }
  | { type: 'cancel-partials' };

type WorkerScope = {
  onmessage: ((event: MessageEvent<WorkerMessage>) => void) | null;
  postMessage(message: unknown): void;
};

const scope = self as unknown as WorkerScope;
const BASE_MODEL = 'onnx-community/whisper-base';
const TINY_MODEL = 'onnx-community/whisper-tiny';
let transcriber: Awaited<ReturnType<typeof pipeline<'automatic-speech-recognition'>>> | null = null;
let loading: Promise<void> | null = null;
type TranscriptionJob = Extract<WorkerMessage, { type: 'transcribe' | 'partial' }>;
const jobs: TranscriptionJob[] = [];
const cancelledPartialIds = new Set<number>();
let activeJob: TranscriptionJob | null = null;
let processingJobs = false;

env.useBrowserCache = true;
if (env.backends.onnx.wasm) {
  env.backends.onnx.wasm.wasmPaths = { mjs: wasmFactoryUrl, wasm: wasmBinaryUrl };
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

async function selectDevice(): Promise<'webgpu' | 'wasm'> {
  const gpu = (navigator as Navigator & { gpu?: { requestAdapter: () => Promise<unknown> } }).gpu;
  if (!gpu) return 'wasm';
  try {
    return await gpu.requestAdapter() ? 'webgpu' : 'wasm';
  } catch {
    return 'wasm';
  }
}

async function loadModel(model: string, device: 'webgpu' | 'wasm') {
  return pipeline('automatic-speech-recognition', model, {
    device,
    dtype: device === 'webgpu'
      ? { encoder_model: 'fp32', decoder_model_merged: 'q4' }
      : 'q8',
    progress_callback: (info) => {
      const progress = 'progress' in info && typeof info.progress === 'number' ? info.progress : 0;
      scope.postMessage({ type: 'progress', progress: Math.min(100, Math.max(0, Math.round(progress))) });
    },
  });
}

function ensureLoaded() {
  if (loading) return loading;
  loading = (async () => {
    const device = await selectDevice();
    try {
      transcriber = await loadModel(BASE_MODEL, device);
    } catch (baseError) {
      try {
        transcriber = await loadModel(TINY_MODEL, device);
      } catch (tinyError) {
        scope.postMessage({ type: 'load-error', detail: `base: ${errorMessage(baseError)}; tiny: ${errorMessage(tinyError)}` });
        throw tinyError;
      }
    }
    scope.postMessage({ type: 'ready' });
  })().catch((error) => {
    transcriber = null;
    scope.postMessage({ type: 'load-error', detail: errorMessage(error) });
    throw new Error('whisper_unavailable');
  });
  return loading;
}

function cancelPartialJobs() {
  for (let index = jobs.length - 1; index >= 0; index -= 1) {
    if (jobs[index].type === 'partial') jobs.splice(index, 1);
  }
  if (activeJob?.type === 'partial') cancelledPartialIds.add(activeJob.id);
}

async function processJobs() {
  if (processingJobs) return;
  processingJobs = true;
  try {
    await ensureLoaded();
    while (jobs.length) {
      const job = jobs.shift();
      if (!job) continue;
      if (job.type === 'partial' && cancelledPartialIds.delete(job.id)) continue;
      activeJob = job;
      try {
        if (!transcriber) throw new Error('whisper_unavailable');
        const result = await transcriber(job.audio, {
          language: job.language,
          task: 'transcribe',
          ...(job.audio.length > 30 * 16_000 ? { chunk_length_s: 30 } : {}),
        });
        if (!(job.type === 'partial' && cancelledPartialIds.has(job.id))) {
          scope.postMessage({ type: 'result', id: job.id, text: result.text });
        }
      } catch {
        if (!(job.type === 'partial' && cancelledPartialIds.has(job.id))) {
          scope.postMessage({ type: 'transcription-error', id: job.id });
        }
      } finally {
        cancelledPartialIds.delete(job.id);
        activeJob = null;
      }
    }
  } catch {
    jobs.splice(0);
  } finally {
    activeJob = null;
    processingJobs = false;
    if (jobs.length) void processJobs();
  }
}

scope.onmessage = (event) => {
  const message = event.data;
  if (message.type === 'load') {
    void ensureLoaded().catch(() => {});
    return;
  }
  if (message.type === 'cancel-partials') {
    cancelPartialJobs();
    return;
  }
  if (message.type === 'transcribe') {
    cancelPartialJobs();
    jobs.unshift(message);
  } else {
    if (activeJob?.type === 'transcribe' || jobs.some((job) => job.type === 'transcribe')) {
      scope.postMessage({ type: 'result', id: message.id, text: '' });
      return;
    }
    jobs.push(message);
  }
  void processJobs();
};
