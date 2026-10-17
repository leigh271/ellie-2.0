import { describe, expect, it } from 'vitest';
import { formatDictationTime, pickRecorderMime } from './useDictation';

describe('dictation helpers', () => {
  it('picks the first supported recorder MIME type', () => {
    const supported = ['audio/webm', 'audio/ogg'];
    expect(pickRecorderMime((mime) => supported.includes(mime))).toBe('audio/webm');
  });

  it('returns an empty MIME type when recording formats are unsupported', () => {
    expect(pickRecorderMime(() => false)).toBe('');
  });

  it('formats elapsed recording time as minutes and seconds', () => {
    expect(formatDictationTime(0)).toBe('00:00');
    expect(formatDictationTime(61_900)).toBe('01:01');
  });
});
