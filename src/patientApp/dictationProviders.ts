import type { PatientLanguage } from '../state/DemoStore';

export type DictationProvider = 'whisper' | 'server' | 'speech' | 'unavailable';

export function selectDictationProvider({
  whisperSupported,
  serverAvailable,
  speechAvailable,
  language,
  whisperText,
}: {
  whisperSupported: boolean;
  serverAvailable: boolean;
  speechAvailable: boolean;
  language: PatientLanguage;
  whisperText?: string;
}): DictationProvider {
  if (whisperSupported && (whisperText === undefined || whisperText.trim())) return 'whisper';
  if (whisperSupported && language === 'ht') return speechAvailable ? 'speech' : 'unavailable';
  if (serverAvailable) return 'server';
  return speechAvailable ? 'speech' : 'unavailable';
}
