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
