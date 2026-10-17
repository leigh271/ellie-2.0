import { afterEach, describe, expect, it, vi } from 'vitest';
import { chooseFinalTranscript, createPartialScheduler } from './liveDictation';

describe('live dictation helpers', () => {
  it('prefers full-recording text and falls back to the live transcript', () => {
    expect(chooseFinalTranscript('  Final answer  ', 'live words')).toBe('Final answer');
    expect(chooseFinalTranscript('  ', '  live words  ')).toBe('live words');
    expect(chooseFinalTranscript('', '')).toBe('');
  });

  it('does not overlap partial jobs and resumes scheduling after the active job', async () => {
    vi.useFakeTimers();
    const completions: Array<() => void> = [];
    const run = vi.fn(() => new Promise<void>((resolve) => completions.push(resolve)));
    const scheduler = createPartialScheduler(run, 2500);
    scheduler.start();

    await vi.advanceTimersByTimeAsync(5000);
    expect(run).toHaveBeenCalledTimes(1);

    completions[0]();
    await vi.advanceTimersByTimeAsync(2500);
    expect(run).toHaveBeenCalledTimes(2);

    scheduler.stop();
  });
});

afterEach(() => {
  vi.useRealTimers();
});
