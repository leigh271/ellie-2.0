import { describe, expect, it } from 'vitest';
import { scoreCoaching } from './miScore';

describe('scoreCoaching', () => {
  it('does not return a fidelity score before four tagged coach lines', () => {
    const result = scoreCoaching([
      { speaker: 'coach', tag: 'open question' },
      { speaker: 'coach', tag: 'simple reflection' },
      { speaker: 'coach', tag: 'affirm' },
    ]);
    expect(result.score).toBeNull();
  });

  it('matches a hand-computed score and exposes the coaching metrics', () => {
    const result = scoreCoaching([
      { speaker: 'coach', tag: 'open question' },
      { speaker: 'coach', tag: 'open question' },
      { speaker: 'coach', tag: 'complex reflection' },
      { speaker: 'coach', tag: 'complex reflection' },
      { speaker: 'coach', tag: 'complex reflection' },
      { speaker: 'coach', tag: 'complex reflection' },
      { speaker: 'coach', tag: 'affirm' },
      { speaker: 'participant', tag: 'change' },
      { speaker: 'participant', tag: 'sustain' },
    ]);
    expect(result.score).toBe(100);
    expect(result.metrics).toEqual({
      openQuestionPercent: '100%',
      reflectionsPerQuestion: '2.0',
      complexReflectionPercent: '100%',
      miConsistent: 1,
      persuadeConfront: 0,
      changeTalkPercent: '50%',
    });
  });

  it('awards the full MI-consistent component when there are no adherence tags', () => {
    expect(scoreCoaching([
      { speaker: 'coach', tag: 'other' },
      { speaker: 'coach', tag: 'other' },
      { speaker: 'coach', tag: 'other' },
      { speaker: 'coach', tag: 'other' },
    ]).score).toBe(30);
  });
});
