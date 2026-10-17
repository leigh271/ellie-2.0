import { useCallback, useEffect, useRef, useState } from 'react';
import type { PatientLanguage } from '../state/DemoStore';
import { selectDictationProvider } from './dictationProviders';
import { chooseFinalTranscript, createPartialScheduler } from './liveDictation';
import { cancelWhisperPartials, ensureWhisperWorker, getWhisperStatus, subscribeWhisperStatus, transcribePartialWithWhisper, transcribeWithWhisper } from './whisperClient';
import type { WhisperStatus } from './whisperClient';
import { mixAndResample, mixToMono, WHISPER_SAMPLE_RATE } from './whisperAudio';

const RECORDER_MIMES = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg'];
const LEVEL_COUNT = 40;
const MAX_RECORDING_MS = 60_000;

export type DictationState = 'idle' | 'recording' | 'transcribing' | 'error';
export type DictationError = 'permission' | 'unavailable';
export type DictationStartResult = 'recording' | 'fallback' | 'permission';

type RecognitionSpeechResult = ArrayLike<{ transcript: string }> & { isFinal: boolean };
type RecognitionResult = { results: ArrayLike<RecognitionSpeechResult> };
type SpeechRecognitionLike = {
  continuous: boolean;
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  onresult: ((event: RecognitionResult) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};
type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;
type SpeechWindow = Window & {
  SpeechRecognition?: SpeechRecognitionConstructor;
  webkitSpeechRecognition?: SpeechRecognitionConstructor;
};

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

function speechLanguage(language: PatientLanguage): string {
  return language === 'en' ? 'en-US' : language === 'es' ? 'es-US' : 'ht-HT';
}

function getSpeechRecognition(): SpeechRecognitionConstructor | null {
  if (typeof window === 'undefined') return null;
  const target = window as SpeechWindow;
  return target.SpeechRecognition ?? target.webkitSpeechRecognition ?? null;
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
  const [liveFinalTranscript, setLiveFinalTranscript] = useState('');
  const [liveInterimTranscript, setLiveInterimTranscript] = useState('');
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
  const liveUpdateTimer = useRef<number | null>(null);
  const recognitionRestartTimer = useRef<number | null>(null);
  const recognition = useRef<SpeechRecognitionLike | null>(null);
  const recognitionGeneration = useRef(0);
  const recognitionRestarted = useRef(false);
  const liveFinalRef = useRef('');
  const liveInterimRef = useRef('');
  const liveSource = useRef<'speech' | 'whisper' | 'none'>('none');
  const partialScheduler = useRef<ReturnType<typeof createPartialScheduler> | null>(null);
  const recordingMime = useRef('');
  const partialJobId = useRef(0);
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

  const publishLiveTranscript = useCallback((flush = false) => {
    if (liveUpdateTimer.current !== null) {
      if (!flush) return;
      window.clearTimeout(liveUpdateTimer.current);
      liveUpdateTimer.current = null;
    }
    if (flush) {
      setLiveFinalTranscript(liveFinalRef.current);
      setLiveInterimTranscript(liveInterimRef.current);
      return;
    }
    liveUpdateTimer.current = window.setTimeout(() => {
      liveUpdateTimer.current = null;
      setLiveFinalTranscript(liveFinalRef.current);
      setLiveInterimTranscript(liveInterimRef.current);
    }, 180);
  }, []);

  const resetLiveTranscript = useCallback(() => {
    if (liveUpdateTimer.current !== null) window.clearTimeout(liveUpdateTimer.current);
    liveUpdateTimer.current = null;
    liveFinalRef.current = '';
    liveInterimRef.current = '';
    setLiveFinalTranscript('');
    setLiveInterimTranscript('');
  }, []);

  const stopSpeechRecognition = useCallback(() => {
    recognitionGeneration.current += 1;
    if (recognitionRestartTimer.current !== null) window.clearTimeout(recognitionRestartTimer.current);
    recognitionRestartTimer.current = null;
    const activeRecognition = recognition.current;
    recognition.current = null;
    if (!activeRecognition) return;
    activeRecognition.onresult = null;
    activeRecognition.onerror = null;
    activeRecognition.onend = null;
    try { activeRecognition.stop(); } catch { /* already stopped */ }
  }, []);

  const stopPartialTranscription = useCallback(() => {
    partialJobId.current += 1;
    partialScheduler.current?.stop();
    partialScheduler.current = null;
    cancelWhisperPartials();
  }, []);

  const startPartialTranscription = useCallback(() => {
    if (partialScheduler.current) return;
    const scheduler = createPartialScheduler(async () => {
      if (stateRef.current !== 'recording' || cancelled.current || liveSource.current !== 'whisper'
        || provider.current !== 'whisper' || getWhisperStatus().state !== 'ready') return;
      const currentChunks = chunks.current.slice();
      if (!currentChunks.length) return;
      const blob = new Blob(currentChunks, { type: recordingMime.current || undefined });
      if (!blob.size) return;
      const decoded = await decodeMono16k(blob);
      const windowLength = WHISPER_SAMPLE_RATE * 30;
      const audio = decoded.length > windowLength ? decoded.slice(-windowLength) : decoded;
      if (stateRef.current !== 'recording' || cancelled.current || liveSource.current !== 'whisper') return;
      const requestId = ++partialJobId.current;
      const text = (await transcribePartialWithWhisper(audio, whisperLanguage(languageRef.current))).trim();
      if (requestId !== partialJobId.current || stateRef.current !== 'recording'
        || cancelled.current || liveSource.current !== 'whisper') return;
      if (text) {
        liveInterimRef.current = text;
        publishLiveTranscript();
      }
    });
    partialScheduler.current = scheduler;
    scheduler.start();
  }, [publishLiveTranscript]);

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
    const liveText = [liveFinalRef.current, liveInterimRef.current].filter(Boolean).join(' ').trim();
    const wasWhisper = provider.current === 'whisper';
    if (!blob.size) {
      if (liveText) {
        provider.current = null;
        updateState('idle');
        transcriptHandler.current(liveText);
      } else {
        beginFallback();
      }
      return;
    }
    let whisperSupported = wasWhisper && getWhisperStatus().state !== 'error';
    let whisperText = '';
    if (whisperSupported) {
      try {
        whisperText = (await transcribeWithWhisper(await decodeMono16k(blob), whisperLanguage(languageRef.current))).trim();
      } catch {
        whisperSupported = false;
      }
    }
    if (wasWhisper) {
      const result = chooseFinalTranscript(whisperText, liveText);
      if (result) {
        setUsedWhisper(Boolean(whisperText));
        provider.current = null;
        updateState('idle');
        transcriptHandler.current(result);
        return;
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
    if (liveText) {
      provider.current = null;
      updateState('idle');
      transcriptHandler.current(liveText);
      return;
    }
    provider.current = null;
    beginFallback();
  }, [beginFallback, updateState]);

  const cancel = useCallback(() => {
    cancelled.current = true;
    stopPartialTranscription();
    stopSpeechRecognition();
    const activeRecorder = recorder.current;
    recorder.current = null;
    chunks.current = [];
    if (activeRecorder && activeRecorder.state !== 'inactive') {
      try { activeRecorder.stop(); } catch { /* already stopped */ }
    }
    cleanupAudio();
    updateState('idle');
    setError(null);
    liveSource.current = 'none';
    resetLiveTranscript();
  }, [cleanupAudio, resetLiveTranscript, stopPartialTranscription, stopSpeechRecognition, updateState]);

  const confirm = useCallback(() => {
    if (stateRef.current !== 'recording') return;
    cancelled.current = false;
    updateState('transcribing');
    publishLiveTranscript(true);
    stopPartialTranscription();
    stopSpeechRecognition();
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
  }, [beginFallback, publishLiveTranscript, stopPartialTranscription, stopSpeechRecognition, updateState]);
  confirmRef.current = confirm;

  const start = useCallback(async (): Promise<DictationStartResult> => {
    setError(null);
    updateState('idle');
    setUsedWhisper(false);
    stopPartialTranscription();
    stopSpeechRecognition();
    resetLiveTranscript();
    liveSource.current = 'none';
    recognitionRestarted.current = false;
    provider.current = null;
    if (typeof MediaRecorder === 'undefined' || !navigator.mediaDevices?.getUserMedia) return 'fallback';
    const Recognition = getSpeechRecognition();
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
    recordingMime.current = activeRecorder.mimeType || mime;
    recorder.current = activeRecorder;
    activeRecorder.ondataavailable = (event) => {
      if (event.data.size) chunks.current.push(event.data);
    };
    activeRecorder.onstop = () => {
      const shouldTranscribe = !cancelled.current;
      const audio = new Blob(chunks.current, { type: activeRecorder.mimeType || mime });
      chunks.current = [];
      recorder.current = null;
      publishLiveTranscript(true);
      stopPartialTranscription();
      stopSpeechRecognition();
      liveSource.current = 'none';
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
      activeRecorder.start(1000);
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
    liveSource.current = Recognition ? 'speech' : 'whisper';
    if (Recognition) {
      const RecognitionConstructor = Recognition;
      function restartOrSwitch() {
        stopSpeechRecognition();
        if (stateRef.current !== 'recording' || cancelled.current) return;
        if (!recognitionRestarted.current) {
          recognitionRestarted.current = true;
          recognitionRestartTimer.current = window.setTimeout(() => {
            recognitionRestartTimer.current = null;
            if (stateRef.current === 'recording' && !cancelled.current) startRecognition();
          }, 150);
          return;
        }
        liveSource.current = 'whisper';
        startPartialTranscription();
      }

      function startRecognition() {
        if (stateRef.current !== 'recording' || cancelled.current) return;
        let input: SpeechRecognitionLike;
        try {
          input = new RecognitionConstructor();
        } catch {
          restartOrSwitch();
          return;
        }
        const generation = recognitionGeneration.current + 1;
        recognitionGeneration.current = generation;
        input.continuous = true;
        input.interimResults = true;
        input.maxAlternatives = 1;
        input.lang = speechLanguage(languageRef.current);
        let failureHandled = false;
        const handleFailure = () => {
          if (failureHandled || generation !== recognitionGeneration.current
            || recognition.current !== input || stateRef.current !== 'recording') return;
          failureHandled = true;
          restartOrSwitch();
        };
        input.onresult = (event) => {
          if (generation !== recognitionGeneration.current || stateRef.current !== 'recording') return;
          const finalParts: string[] = [];
          const interimParts: string[] = [];
          for (let index = 0; index < event.results.length; index += 1) {
            const result = event.results[index];
            const text = result?.[0]?.transcript?.trim();
            if (!text) continue;
            (result.isFinal ? finalParts : interimParts).push(text);
          }
          liveFinalRef.current = finalParts.join(' ').trim();
          liveInterimRef.current = interimParts.join(' ').trim();
          publishLiveTranscript();
        };
        input.onerror = handleFailure;
        input.onend = handleFailure;
        recognition.current = input;
        try {
          input.start();
        } catch {
          handleFailure();
        }
      }

      startRecognition();
    } else {
      startPartialTranscription();
    }
    return 'recording';
  }, [cleanupAudio, publishLiveTranscript, resetLiveTranscript, startPartialTranscription, stopPartialTranscription, stopSpeechRecognition, transcribe, updateState]);

  useEffect(() => () => {
    cancelled.current = true;
    stopPartialTranscription();
    stopSpeechRecognition();
    const activeRecorder = recorder.current;
    recorder.current = null;
    if (activeRecorder && activeRecorder.state !== 'inactive') {
      activeRecorder.onstop = null;
      try { activeRecorder.stop(); } catch { /* already stopped */ }
    }
    if (liveUpdateTimer.current !== null) window.clearTimeout(liveUpdateTimer.current);
    liveUpdateTimer.current = null;
    cleanupAudio();
  }, [cleanupAudio, stopPartialTranscription, stopSpeechRecognition]);

  const level = levels[levels.length - 1] ?? 0;
  const whisperLoading = whisperStatus.state === 'loading';
  const onDeviceReady = provider.current === 'whisper' && whisperStatus.state === 'ready';
  const liveTranscript = [liveFinalTranscript, liveInterimTranscript].filter(Boolean).join(' ').trim();
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
    liveFinalTranscript,
    liveInterimTranscript,
    liveTranscript,
    start,
    confirm,
    cancel,
  };
}
