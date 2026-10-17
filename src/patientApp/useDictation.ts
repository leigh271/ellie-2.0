import { useCallback, useEffect, useRef, useState } from 'react';
import type { PatientLanguage } from '../state/DemoStore';
import { selectDictationProvider } from './dictationProviders';
import { ensureWhisperWorker, getWhisperStatus, subscribeWhisperStatus, transcribeWithWhisper } from './whisperClient';
import type { WhisperStatus } from './whisperClient';
import { mixAndResample, mixToMono, WHISPER_SAMPLE_RATE } from './whisperAudio';

const RECORDER_MIMES = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg'];
const LEVEL_COUNT = 40;
const MAX_RECORDING_MS = 60_000;

export type DictationState = 'idle' | 'recording' | 'transcribing' | 'error';
export type DictationError = 'permission' | 'unavailable';
export type DictationStartResult = 'recording' | 'fallback' | 'permission';

export function pickRecorderMime(isTypeSupported: (mime: string) => boolean): string {
  return RECORDER_MIMES.find((mime) => isTypeSupported(mime)) ?? '';
}

export function formatDictationTime(milliseconds: number): string {
  const seconds = Math.floor(milliseconds / 1000);
  return `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
}

export async function decodeMono16k(blob: Blob): Promise<Float32Array> {
  const decodeContext = new AudioContext();
  try {
    const decoded = await decodeContext.decodeAudioData(await blob.arrayBuffer());
    const channels = Array.from({ length: decoded.numberOfChannels }, (_, index) => decoded.getChannelData(index));
    try {
      const length = Math.ceil(decoded.length * WHISPER_SAMPLE_RATE / decoded.sampleRate);
      const offline = new OfflineAudioContext(1, length, WHISPER_SAMPLE_RATE);
      const monoBuffer = offline.createBuffer(1, decoded.length, decoded.sampleRate);
      monoBuffer.copyToChannel(new Float32Array(mixToMono(channels)), 0);
      const source = offline.createBufferSource();
      source.buffer = monoBuffer;
      source.connect(offline.destination);
      source.start();
      const resampled = await offline.startRendering();
      return resampled.getChannelData(0).slice();
    } catch {
      return mixAndResample(channels, decoded.sampleRate, WHISPER_SAMPLE_RATE);
    }
  } finally {
    await decodeContext.close().catch(() => {});
  }
}

async function serverTranscriptionAvailable(): Promise<boolean> {
  try {
    const response = await fetch('/api/ai/status');
    if (!response.ok) return false;
    const status = await response.json() as { transcribe?: boolean };
    return Boolean(status.transcribe);
  } catch {
    return false;
  }
}

function whisperLanguage(language: PatientLanguage): 'english' | 'spanish' | 'haitian creole' {
  return language === 'en' ? 'english' : language === 'es' ? 'spanish' : 'haitian creole';
}

export function useDictation(
  language: PatientLanguage,
  onTranscript: (text: string) => void,
  onFallback: () => void,
  speechAvailable = false,
) {
  const [state, setState] = useState<DictationState>('idle');
  const [error, setError] = useState<DictationError | null>(null);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [levels, setLevels] = useState<number[]>(() => Array(LEVEL_COUNT).fill(0.04));
  const [whisperStatus, setWhisperStatus] = useState<WhisperStatus>(getWhisperStatus);
  const [usedWhisper, setUsedWhisper] = useState(false);
  const stateRef = useRef<DictationState>('idle');
  const languageRef = useRef(language);
  const speechAvailableRef = useRef(speechAvailable);
  const provider = useRef<'whisper' | 'server' | null>(null);
  const transcriptHandler = useRef(onTranscript);
  const fallbackHandler = useRef(onFallback);
  const recorder = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const stream = useRef<MediaStream | null>(null);
  const audioContext = useRef<AudioContext | null>(null);
  const analyser = useRef<AnalyserNode | null>(null);
  const animationFrame = useRef<number | null>(null);
  const elapsedTimer = useRef<number | null>(null);
  const stopTimer = useRef<number | null>(null);
  const startedAt = useRef(0);
  const cancelled = useRef(false);
  const confirmRef = useRef<() => void>(() => {});
  const canRecord = typeof MediaRecorder !== 'undefined'
    && typeof navigator !== 'undefined'
    && Boolean(navigator.mediaDevices?.getUserMedia);
  languageRef.current = language;
  speechAvailableRef.current = speechAvailable;
  transcriptHandler.current = onTranscript;
  fallbackHandler.current = onFallback;

  const updateState = useCallback((next: DictationState) => {
    stateRef.current = next;
    setState(next);
  }, []);

  useEffect(() => subscribeWhisperStatus(setWhisperStatus), []);

  const cleanupAudio = useCallback(() => {
    if (animationFrame.current !== null) window.cancelAnimationFrame(animationFrame.current);
    animationFrame.current = null;
    if (elapsedTimer.current !== null) window.clearInterval(elapsedTimer.current);
    elapsedTimer.current = null;
    if (stopTimer.current !== null) window.clearTimeout(stopTimer.current);
    stopTimer.current = null;
    stream.current?.getTracks().forEach((track) => track.stop());
    stream.current = null;
    analyser.current = null;
    void audioContext.current?.close().catch(() => {});
    audioContext.current = null;
    setElapsedMs(0);
    setLevels(Array(LEVEL_COUNT).fill(0.04));
  }, []);

  const beginFallback = useCallback(() => {
    cleanupAudio();
    updateState('idle');
    fallbackHandler.current();
  }, [cleanupAudio, updateState]);

  const transcribe = useCallback(async (blob: Blob) => {
    if (!blob.size) {
      beginFallback();
      return;
    }
    let whisperSupported = provider.current === 'whisper' && getWhisperStatus().state !== 'error';
    let whisperText = '';
    if (whisperSupported) {
      try {
        whisperText = (await transcribeWithWhisper(await decodeMono16k(blob), whisperLanguage(languageRef.current))).trim();
      } catch {
        whisperSupported = false;
      }
    }
    const needsServerCheck = !whisperSupported || !whisperText;
    const creoleEmpty = whisperSupported && languageRef.current === 'ht' && !whisperText;
    const serverAvailable = needsServerCheck && !creoleEmpty ? await serverTranscriptionAvailable() : false;
    const selectedProvider = selectDictationProvider({
      whisperSupported,
      serverAvailable,
      speechAvailable: speechAvailableRef.current,
      language: languageRef.current,
      whisperText,
    });
    if (selectedProvider === 'whisper') {
      setUsedWhisper(true);
      provider.current = null;
      updateState('idle');
      transcriptHandler.current(whisperText);
      return;
    }
    if (selectedProvider === 'server') {
      try {
        const response = await fetch(`/api/ai/transcribe?language=${languageRef.current}`, {
          method: 'POST',
          headers: { 'content-type': blob.type || 'application/octet-stream' },
          body: blob,
        });
        if (response.ok) {
          const body = await response.json() as { text?: unknown };
          const text = typeof body.text === 'string' ? body.text.trim() : '';
          if (text) {
            provider.current = null;
            updateState('idle');
            transcriptHandler.current(text);
            return;
          }
        }
      } catch {
        provider.current = null;
      }
    }
    provider.current = null;
    beginFallback();
  }, [beginFallback, updateState]);

  const cancel = useCallback(() => {
    cancelled.current = true;
    const activeRecorder = recorder.current;
    recorder.current = null;
    chunks.current = [];
    if (activeRecorder && activeRecorder.state !== 'inactive') {
      try { activeRecorder.stop(); } catch { /* already stopped */ }
    }
    cleanupAudio();
    updateState('idle');
    setError(null);
  }, [cleanupAudio, updateState]);

  const confirm = useCallback(() => {
    if (stateRef.current !== 'recording') return;
    cancelled.current = false;
    updateState('transcribing');
    if (stopTimer.current !== null) window.clearTimeout(stopTimer.current);
    stopTimer.current = null;
    if (elapsedTimer.current !== null) window.clearInterval(elapsedTimer.current);
    elapsedTimer.current = null;
    navigator.vibrate?.([30, 40, 30]);
    const activeRecorder = recorder.current;
    if (!activeRecorder || activeRecorder.state === 'inactive') {
      beginFallback();
      return;
    }
    try {
      activeRecorder.stop();
    } catch {
      beginFallback();
    }
  }, [beginFallback, updateState]);
  confirmRef.current = confirm;

  const start = useCallback(async (): Promise<DictationStartResult> => {
    setError(null);
    updateState('idle');
    setUsedWhisper(false);
    provider.current = null;
    if (typeof MediaRecorder === 'undefined' || !navigator.mediaDevices?.getUserMedia) return 'fallback';
    const whisperSupported = ensureWhisperWorker();
    if (whisperSupported) {
      provider.current = 'whisper';
    } else {
      const serverAvailable = await serverTranscriptionAvailable();
      const fallbackProvider = selectDictationProvider({
        whisperSupported: false,
        serverAvailable,
        speechAvailable: speechAvailableRef.current,
        language: languageRef.current,
      });
      if (fallbackProvider !== 'server') return 'fallback';
      provider.current = 'server';
    }
    const mime = pickRecorderMime((type) => MediaRecorder.isTypeSupported(type));
    if (!mime) return 'fallback';

    let media: MediaStream;
    try {
      media = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (cause) {
      const permissionDenied = cause instanceof DOMException
        ? cause.name === 'NotAllowedError' || cause.name === 'PermissionDeniedError'
        : false;
      if (permissionDenied) {
        setError('permission');
        updateState('error');
        return 'permission';
      }
      return 'fallback';
    }

    let activeRecorder: MediaRecorder;
    try {
      activeRecorder = new MediaRecorder(media, { mimeType: mime });
      stream.current = media;
    } catch {
      media.getTracks().forEach((track) => track.stop());
      return 'fallback';
    }
    cancelled.current = false;
    chunks.current = [];
    recorder.current = activeRecorder;
    activeRecorder.ondataavailable = (event) => {
      if (event.data.size) chunks.current.push(event.data);
    };
    activeRecorder.onstop = () => {
      const shouldTranscribe = !cancelled.current;
      const audio = new Blob(chunks.current, { type: activeRecorder.mimeType || mime });
      chunks.current = [];
      recorder.current = null;
      cleanupAudio();
      if (shouldTranscribe) void transcribe(audio);
    };

    let context: AudioContext | null = null;
    try {
      context = new AudioContext();
      const meter = context.createAnalyser();
      meter.fftSize = 256;
      context.createMediaStreamSource(media).connect(meter);
      audioContext.current = context;
      analyser.current = meter;
      const samples = new Uint8Array(meter.fftSize);
      const measure = () => {
        if (analyser.current !== meter) return;
        meter.getByteTimeDomainData(samples);
        const rms = Math.sqrt(samples.reduce((sum, sample) => sum + (sample - 128) ** 2, 0) / samples.length);
        const level = Math.min(1, rms / 40);
        setLevels((previous) => [...previous.slice(1), level]);
        animationFrame.current = window.requestAnimationFrame(measure);
      };
      measure();
    } catch {
      void context?.close().catch(() => {});
      audioContext.current = null;
      analyser.current = null;
    }
    try {
      activeRecorder.start();
    } catch {
      cancelled.current = true;
      activeRecorder.onstop = null;
      media.getTracks().forEach((track) => track.stop());
      recorder.current = null;
      cleanupAudio();
      return 'fallback';
    }
    startedAt.current = Date.now();
    setElapsedMs(0);
    updateState('recording');
    navigator.vibrate?.(40);
    elapsedTimer.current = window.setInterval(() => setElapsedMs(Date.now() - startedAt.current), 200);
    stopTimer.current = window.setTimeout(() => confirmRef.current(), MAX_RECORDING_MS);
    return 'recording';
  }, [cleanupAudio, transcribe, updateState]);

  useEffect(() => () => {
    cancelled.current = true;
    const activeRecorder = recorder.current;
    recorder.current = null;
    if (activeRecorder && activeRecorder.state !== 'inactive') {
      activeRecorder.onstop = null;
      try { activeRecorder.stop(); } catch { /* already stopped */ }
    }
    cleanupAudio();
  }, [cleanupAudio]);

  const level = levels[levels.length - 1] ?? 0;
  const whisperLoading = whisperStatus.state === 'loading';
  const onDeviceReady = provider.current === 'whisper' && whisperStatus.state === 'ready';
  return {
    state,
    error,
    elapsedMs,
    levels,
    level,
    canRecord,
    whisperStatus,
    whisperLoading,
    onDeviceReady,
    usedWhisper,
    start,
    confirm,
    cancel,
  };
}
