import type { ElliePatient } from './ellieDemo';

export type PatientLinkedWearable = {
  person_id: string | number;
  health_group: string | number | null;
  baseline: {
    steps: number | null;
    sleep_minutes: number | null;
    resting_heart_rate: number | null;
  };
  series: Array<{
    day: number;
    steps: number | null;
    sleep_minutes: number | null;
    resting_heart_rate: number | null;
    day_rating: string | number | null;
    bad_day: number | null;
    tired_0_to_4: number | null;
  }>;
};

export type PatientLinkedNHANES = {
  person_id: string | number;
  survey_years: string | null;
  age: number | null;
  cancer_types: string | null;
  years_since_first_cancer_diagnosis: number | null;
  bmi: number | null;
  waist_cm: number | null;
  hba1c_pct: number | null;
  fasting_glucose_mg_dl: number | null;
  movement_per_day_mims: number | null;
  sensor_sleep_hours_per_day: number | null;
  sleep_hours_self_report: number | null;
  overnight_fast_hours_avg: number | null;
  last_eating_hour_avg: number | null;
  fiber_g: number | null;
  calories_per_day: number | null;
  self_rated_health: string | number | null;
};

export type PatientLinkedCoaching = {
  participant_id: string;
  cancer_type: string | number | null;
  program_focus: string | number | null;
  coach_name: string | number | null;
  calls: Array<{
    call_id: string;
    call_number: number | null;
    program_week: number | null;
    date: string | null;
    goal_topic: string | number | null;
    duration_min: number | null;
    supervisor_overall: number | null;
  }>;
  weekly_goals: Array<{
    week: number | null;
    goal: string | number | null;
    topic: string | number | null;
    goal_met: string | number | null;
  }>;
  goal_met_rate: number | null;
};

export type PatientLinkedRecords = {
  wearable: PatientLinkedWearable;
  nhanes: PatientLinkedNHANES;
  coaching: PatientLinkedCoaching;
};

export type PatientLinksDataset = {
  about: {
    caveat: string;
    male_wearable_rule_relaxations: string[];
  };
  patients: Record<string, PatientLinkedRecords>;
};

let patientLinksRequest: Promise<PatientLinksDataset> | null = null;

export function loadPatientLinks(): Promise<PatientLinksDataset> {
  if (patientLinksRequest) return patientLinksRequest;
  const request = fetch('/data/patient_links.json').then((response) => {
    if (!response.ok) throw new Error(`Unable to load linked patient records (${response.status}).`);
    return response.json() as Promise<PatientLinksDataset>;
  });
  patientLinksRequest = request;
  request.catch(() => {
    if (patientLinksRequest === request) patientLinksRequest = null;
  });
  return request;
}

export type PatientContext = {
  wearable: {
    source: string;
    participant_id: string | number;
    recent14: {
      mean_steps: number | null;
      mean_sleep_hours: number | null;
      bad_days: number;
      completeness_pct: number;
    };
    prior14: {
      mean_steps: number | null;
      mean_sleep_hours: number | null;
    };
  };
  nhanes: {
    source: string;
    respondent_id: string | number;
    survey_years: string | null;
    hba1c_pct: number | null;
    fasting_glucose_mg_dl: number | null;
    bmi: number | null;
    sensor_sleep_hours_per_day: number | null;
    movement_per_day_mims: number | null;
    overnight_fast_hours_avg: number | null;
  };
  coaching: {
    source: string;
    participant_id: string;
    latest_weekly_goals: Array<{
      week: number | null;
      goal: string | number | null;
      topic: string | number | null;
      goal_met: string | number | null;
    }>;
    goal_met_rate: number | null;
  };
};

function roundOne(value: number): number {
  return Math.round(value * 10) / 10;
}

function mean(
  rows: PatientLinkedWearable['series'],
  key: 'steps' | 'sleep_minutes',
  convert: (value: number) => number = (value) => value,
): number | null {
  const values = rows
    .map((row) => row[key])
    .filter((value): value is number => typeof value === 'number' && Number.isFinite(value))
    .map(convert);
  return values.length ? roundOne(values.reduce((total, value) => total + value, 0) / values.length) : null;
}

export function buildPatientContext(linkedRecord: PatientLinkedRecords): PatientContext {
  const series = linkedRecord.wearable.series;
  const prior = series.slice(0, 14);
  const recent = series.slice(14, 28);
  const recentStepsAvailable = recent.filter((row) => typeof row.steps === 'number' && Number.isFinite(row.steps)).length;
  const goals = [...linkedRecord.coaching.weekly_goals]
    .sort((left, right) => (left.week ?? -Infinity) - (right.week ?? -Infinity))
    .slice(-4)
    .map(({ week, goal, topic, goal_met }) => ({ week, goal, topic, goal_met }));

  return {
    wearable: {
      source: 'fatigue-study wearable record',
      participant_id: linkedRecord.wearable.person_id,
      recent14: {
        mean_steps: mean(recent, 'steps'),
        mean_sleep_hours: mean(recent, 'sleep_minutes', (minutes) => minutes / 60),
        bad_days: recent.filter((row) => row.bad_day === 1).length,
        completeness_pct: roundOne((recentStepsAvailable / 14) * 100),
      },
      prior14: {
        mean_steps: mean(prior, 'steps'),
        mean_sleep_hours: mean(prior, 'sleep_minutes', (minutes) => minutes / 60),
      },
    },
    nhanes: {
      source: 'NHANES exam record',
      respondent_id: linkedRecord.nhanes.person_id,
      survey_years: linkedRecord.nhanes.survey_years,
      hba1c_pct: linkedRecord.nhanes.hba1c_pct,
      fasting_glucose_mg_dl: linkedRecord.nhanes.fasting_glucose_mg_dl,
      bmi: linkedRecord.nhanes.bmi,
      sensor_sleep_hours_per_day: linkedRecord.nhanes.sensor_sleep_hours_per_day,
      movement_per_day_mims: linkedRecord.nhanes.movement_per_day_mims,
      overnight_fast_hours_avg: linkedRecord.nhanes.overnight_fast_hours_avg,
    },
    coaching: {
      source: 'synthetic coaching record',
      participant_id: linkedRecord.coaching.participant_id,
      latest_weekly_goals: goals,
      goal_met_rate: linkedRecord.coaching.goal_met_rate,
    },
  };
}

export function withLinkedWearable(
  patient: ElliePatient,
  linked?: PatientLinkedRecords,
): ElliePatient {
  if (!linked) return patient;
  return {
    ...patient,
    wearable: linked.wearable.series.map((row) => ({
      day: row.day,
      date: `Day ${row.day}`,
      steps: row.steps,
      sleepHours: row.sleep_minutes === null ? null : row.sleep_minutes / 60,
      restingHR: row.resting_heart_rate,
      hrv: null,
    })),
  };
}
