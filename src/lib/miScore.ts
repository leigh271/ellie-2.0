export type CoachingLine = {
  speaker: 'coach' | 'participant';
  tag?: string | null;
};

export type ScoreMetrics = {
  openQuestionPercent: string;
  reflectionsPerQuestion: string;
  complexReflectionPercent: string;
  miConsistent: number;
  persuadeConfront: number;
  changeTalkPercent: string;
};

export const COACH_FAMILY: Record<string, string> = {
  'open question': 'q',
  'closed question': 'q',
  'simple reflection': 'r',
  'complex reflection': 'r',
  affirm: 's',
  'seek collaboration': 's',
  'emphasize autonomy': 's',
  'ask permission': 's',
  'give information': 'i',
  persuade: 'x',
  confront: 'x',
  other: 'o',
};

export function scoreCoaching(lines: CoachingLine[]): { score: number | null; metrics: ScoreMetrics } {
  const coach = lines.filter((line) => line.speaker === 'coach' && line.tag).map((line) => line.tag as string);
  const participant = lines.filter((line) => line.speaker === 'participant' && line.tag).map((line) => line.tag as string);
  const count = (tag: string) => coach.filter((item) => item === tag).length;
  const open = count('open question');
  const closed = count('closed question');
  const simple = count('simple reflection');
  const complex = count('complex reflection');
  const affirm = count('affirm') + count('seek collaboration') + count('emphasize autonomy') + count('ask permission');
  const nonAdherent = count('persuade') + count('confront');
  const questions = open + closed;
  const reflections = simple + complex;
  const change = participant.filter((tag) => tag === 'change').length;
  const sustain = participant.filter((tag) => tag === 'sustain').length;
  const percent = (numerator: number, denominator: number) => denominator ? `${Math.round((numerator / denominator) * 100)}%` : '–';
  const metrics: ScoreMetrics = {
    openQuestionPercent: percent(open, questions),
    reflectionsPerQuestion: questions ? (reflections / questions).toFixed(1) : '–',
    complexReflectionPercent: percent(complex, reflections),
    miConsistent: affirm,
    persuadeConfront: nonAdherent,
    changeTalkPercent: percent(change, change + sustain),
  };
  if (coach.length < 4) return { score: null, metrics };
  const score = 30 * Math.min((questions ? reflections / questions : reflections ? 2 : 0) / 2, 1)
    + 20 * Math.min((reflections ? complex / reflections : 0) / 0.4, 1)
    + 20 * Math.min((questions ? open / questions : 0) / 0.5, 1)
    + 30 * (affirm + nonAdherent ? affirm / (affirm + nonAdherent) : 1);
  return { score: Math.round(score), metrics };
}
