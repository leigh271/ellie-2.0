import { env, pipeline } from '@huggingface/transformers';
import wasmFactoryUrl from 'onnxruntime-web/ort-wasm-simd-threaded.jsep.mjs?url';
import wasmBinaryUrl from 'onnxruntime-web/ort-wasm-simd-threaded.jsep.wasm?url';

type WorkerMessage =
  | { type: 'load' }
  | { type: 'transcribe'; id: number; audio: Float32Array; language: string };

type WorkerScope = {
  onmessage: ((event: MessageEvent<WorkerMessage>) => void) | null;
  postMessage(message: unknown): void;
};

const scope = self as unknown as WorkerScope;
const BASE_MODEL = 'onnx-community/whisper-base';
const TINY_MODEL = 'onnx-community/whisper-tiny';
let transcriber: Awaited<ReturnType<typeof pipeline<'automatic-speech-recognition'>>> | null = null;
let loading: Promise<void> | null = null;

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

scope.onmessage = (event) => {
  const message = event.data;
  if (message.type === 'load') {
    void ensureLoaded().catch(() => {});
    return;
  }
  void ensureLoaded().then(async () => {
    if (!transcriber) throw new Error('whisper_unavailable');
    const result = await transcriber(message.audio, {
      language: message.language,
      task: 'transcribe',
      ...(message.audio.length > 30 * 16_000 ? { chunk_length_s: 30 } : {}),
    });
    scope.postMessage({ type: 'result', id: message.id, text: result.text });
  }).catch(() => {
    scope.postMessage({ type: 'transcription-error', id: message.id });
  });
};
