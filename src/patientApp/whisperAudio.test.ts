import { describe, expect, it } from 'vitest';
import { mixAndResample, mixToMono } from './whisperAudio';

describe('Whisper audio preparation', () => {
  it('mixes Float32 channels into mono audio', () => {
    const left = Float32Array.from([1, 2, 3]);
    const right = Float32Array.from([3, 2, 1]);
    expect(Array.from(mixToMono([left, right]))).toEqual([2, 2, 2]);
  });

  it('resamples mono audio to 16 kHz with linear interpolation', () => {
    const result = mixAndResample([Float32Array.from([0, 1, 2, 3])], 32_000, 16_000);
    expect(Array.from(result)).toEqual([0, 2]);
  });
});
