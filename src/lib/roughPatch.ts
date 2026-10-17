import type { ElliePatient } from '../data/ellieDemo';

export type RoughPatchResult = {
  baseline: { steps: number | null; sleepHours: number | null; restingHR: number | null };
  recent: { steps: number | null; sleepHours: number | null; restingHR: number | null };
  completeness: number;
  rules: string[];
  active: boolean;
};

function mean(values: Array<number | null>): number | null {
  const present = values.filter((value): value is number => value !== null);
  return present.length ? present.reduce((sum, value) => sum + value, 0) / present.length : null;
}

export function analyzeRoughPatch(patient: ElliePatient): RoughPatchResult {
  const window = patient.wearable.slice(-28);
  const baselineDays = window.slice(0, 14);
  const recentDays = window.slice(14);
  const baseline = {
    steps: mean(baselineDays.map((day) => day.steps)),
    sleepHours: mean(baselineDays.map((day) => day.sleepHours)),
    restingHR: mean(baselineDays.map((day) => day.restingHR)),
  };
  const recent = {
    steps: mean(recentDays.map((day) => day.steps)),
    sleepHours: mean(recentDays.map((day) => day.sleepHours)),
    restingHR: mean(recentDays.map((day) => day.restingHR)),
  };
  const rules: string[] = [];
  if (baseline.steps && recent.steps !== null && recent.steps <= baseline.steps * 0.85) rules.push('Steps are down at least 15% from baseline');
  if (baseline.sleepHours && recent.sleepHours !== null && recent.sleepHours <= baseline.sleepHours - 1) rules.push('Sleep is down at least 1 hour from baseline');
  if (baseline.restingHR && recent.restingHR !== null && recent.restingHR >= baseline.restingHR + 5) rules.push('Resting heart rate is up at least 5 bpm from baseline');
  const expected = 14 * 3;
  const present = recentDays.reduce((total, day) => total + [day.steps, day.sleepHours, day.restingHR].filter((value) => value !== null).length, 0);
  return {
    baseline,
    recent,
    completeness: expected ? Math.round((present / expected) * 100) : 0,
    rules,
    active: rules.length > 0,
  };
}
