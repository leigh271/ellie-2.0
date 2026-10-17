import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { buildPatientContext as buildServerPatientContext } from '../../server/patientContext.mjs';
import { buildPatientContext as buildClientPatientContext } from './patientLinks.ts';

const links = JSON.parse(
  readFileSync(new URL('../../public/data/patient_links.json', import.meta.url), 'utf8'),
);
const maria = links.patients.maria;

describe('linked patient context', () => {
  it('summarizes Maria’s activity, sleep, exam, and coaching records', () => {
    const context = buildClientPatientContext(maria);
    expect(context.wearable).toMatchObject({
      source: 'fatigue-study wearable record',
      participant_id: 'FS086',
      recent14: {
        mean_steps: 2424.7,
        mean_sleep_hours: 5.3,
        bad_days: 3,
        completeness_pct: 100,
      },
      prior14: { mean_steps: 3203.8, mean_sleep_hours: 5.9 },
    });
    expect(context.nhanes).toMatchObject({
      source: 'NHANES exam record',
      respondent_id: 63530,
      survey_years: '2011-2012',
      hba1c_pct: 5.8,
      fasting_glucose_mg_dl: null,
      bmi: 31,
    });
    expect(context.coaching).toMatchObject({
      source: 'synthetic coaching record',
      participant_id: 'P0002',
      latest_weekly_goals: [
        { week: 9, goal_met: 'no' },
        { week: 10, goal_met: 'no' },
        { week: 11, goal_met: 'partly' },
        { week: 12, goal_met: 'no' },
      ],
    });
  });

  it('produces the same compact values for the server and client', () => {
    expect(buildClientPatientContext(maria)).toEqual(buildServerPatientContext(maria));
  });
});
