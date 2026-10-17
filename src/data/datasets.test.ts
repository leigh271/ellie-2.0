import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { scoreCoaching } from '../lib/miScore';

function loadDataset<T>(file: string): T {
  return JSON.parse(readFileSync(new URL(`../../public/data/${file}`, import.meta.url), 'utf8')) as T;
}

describe('source-labelled datasets', () => {
  const fatigue = loadDataset<Record<string, any>>('c1_fatigue_study.json');
  const lifeSnaps = loadDataset<Record<string, any>>('c1_lifesnaps.json');
  const nhanes = loadDataset<Record<string, any>>('c2_nhanes.json');
  const coaching = loadDataset<Record<string, any>>('c5_coaching.json');
  const programCalls = loadDataset<{ about: string; calls: Array<Record<string, any>> }>('c5_program_300_calls.json');

  it('contains the expected real C1 and C2 summaries', () => {
    expect(fatigue).toMatchObject({ kind: 'real' });
    expect(fatigue).toHaveProperty('source');
    expect(fatigue).toHaveProperty('population');
    expect(fatigue).toHaveProperty('by_day_rating');
    expect(fatigue).toHaveProperty('within_person');
    expect(fatigue).toHaveProperty('by_health_group');

    expect(lifeSnaps).toMatchObject({ kind: 'real' });
    expect(lifeSnaps).toHaveProperty('source');
    expect(lifeSnaps).toHaveProperty('population');
    expect(lifeSnaps).toHaveProperty('hourly_profile');
    expect(lifeSnaps).toHaveProperty('day_to_day_variation');
    expect(lifeSnaps).toHaveProperty('sensor_completeness');

    expect(nhanes).toMatchObject({ kind: 'real' });
    expect(nhanes).toHaveProperty('source');
    expect(nhanes).toHaveProperty('all_ages');
    expect(nhanes).toHaveProperty('age_60_plus');
    expect(nhanes).toHaveProperty('survivors_hba1c_by_movement');
    expect(nhanes).toHaveProperty('survivor_cancer_types');
  });

  it('labels real references and the synthetic coaching program correctly', () => {
    expect(coaching.sources).toHaveProperty('annomi');
    expect(coaching.sources).toHaveProperty('text_coaching');
    expect(coaching.sources).toHaveProperty('synthetic');
    expect(coaching.annomi).toMatchObject({ kind: 'real' });
    expect(coaching.annomi).toHaveProperty('high_quality');
    expect(coaching.annomi).toHaveProperty('low_quality');
    expect(coaching.text_coaching).toMatchObject({ kind: 'real' });
    expect(coaching.text_coaching).toHaveProperty('patients');
    expect(coaching.text_coaching).toHaveProperty('messages');
    expect(coaching.text_coaching).toHaveProperty('by_week');
    expect(coaching.program).toMatchObject({ kind: 'synthetic' });
    expect(coaching.program).toHaveProperty('coach_scorecard');
    expect(coaching.program).toHaveProperty('supervisor_agreement');
    expect(coaching.program).toHaveProperty('goal_met_by_topic');
  });

  it('scores expert labels from at least one labelled synthetic program call', () => {
    expect(programCalls.about).toContain('MADE-UP DATA');
    expect(programCalls.about).toContain('Synthetic');
    expect(programCalls.calls.length).toBeGreaterThan(0);
    const scored = programCalls.calls
      .filter((call) => call.labelled === 'yes')
      .map((call) => scoreCoaching(call.lines.map((line: Record<string, any>) => ({
        speaker: line.speaker,
        tag: line.speaker === 'coach' ? line.coach_move : line.participant_talk,
      }))).score)
      .find((score) => score !== null);
    expect(scored).toBeTypeOf('number');
  });
});
