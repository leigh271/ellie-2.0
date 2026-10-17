import { describe, expect, it } from 'vitest';
import { selectDictationProvider } from './dictationProviders';

describe('dictation provider priority', () => {
  it('uses local Whisper first when it returns text', () => {
    expect(selectDictationProvider({
      whisperSupported: true,
      serverAvailable: true,
      speechAvailable: true,
      language: 'en',
      whisperText: 'How did I sleep this week?',
    })).toBe('whisper');
  });

  it('uses server transcription before Web Speech when Whisper is unavailable', () => {
    expect(selectDictationProvider({
      whisperSupported: false,
      serverAvailable: true,
      speechAvailable: true,
      language: 'es',
    })).toBe('server');
  });

  it('uses Web Speech for an empty Haitian Creole Whisper result', () => {
    expect(selectDictationProvider({
      whisperSupported: true,
      serverAvailable: true,
      speechAvailable: true,
      language: 'ht',
      whisperText: '',
    })).toBe('speech');
  });

  it('reports unavailable when every transcription provider is unavailable', () => {
    expect(selectDictationProvider({
      whisperSupported: false,
      serverAvailable: false,
      speechAvailable: false,
      language: 'en',
    })).toBe('unavailable');
  });
});
