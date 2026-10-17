import { useCallback, useEffect, useState } from 'react';

export type DatasetKind = 'real' | 'synthetic';

export const DATASET_FIELD_LABELS: Record<string, string> = {
  steps: 'Steps',
  sleep_minutes: 'Sleep (min)',
  resting_heart_rate: 'Resting heart rate',
  hrv_rmssd_ms: 'HRV (ms)',
  sleep_efficiency_pct: 'Sleep efficiency',
  minutes_brisk_activity: 'Brisk activity (min)',
  blood_oxygen_spo2_pct: 'Blood oxygen',
  fitbit_stress_score_0_to_100: 'Stress score',
  skin_temp_change_c: 'Skin temp change',
  any_mood_reported: 'Mood check-in',
  after_dinner: 'Walk after dinner',
  alcohol: 'Weekend drinks',
  cooking: 'Cooking at home',
  fasting: 'Overnight fast',
  sleep: 'Bedtime',
  soda: 'Soda to water',
  strength: 'Band exercises',
  veggies: 'Vegetables',
  walking: 'Walking',
  set_agenda: 'Set agenda',
  checked_feelings: 'Checked feelings',
  reviewed_last_goal: 'Reviewed last goal',
  set_new_goal: 'Set new goal',
  planned_for_barriers: 'Planned for barriers',
  summarized: 'Summarized',
  set_next_contact: 'Set next contact',
};

export function datasetFieldLabel(value: string): string {
  const label = DATASET_FIELD_LABELS[value];
  if (label) return label;
  const sentence = value.replaceAll('_', ' ');
  return sentence ? `${sentence[0].toLocaleUpperCase()}${sentence.slice(1)}` : sentence;
}

export function formatDatasetNumber(value: number, maximumFractionDigits = 1): string {
  const formatted = new Intl.NumberFormat('en-US', { maximumFractionDigits }).format(Math.abs(value));
  return value < 0 ? `−${formatted}` : formatted;
}

export type FatigueDay = {
  rating: 'good' | 'average' | 'bad';
  days: number;
  steps: number;
  sleep_minutes: number;
  resting_heart_rate: number;
  sleep_efficiency_pct: number;
  minutes_brisk_activity: number;
};

export type WithinPersonMetric = {
  metric: string;
  people: number;
  bad_day_vs_own_average: number;
  good_day_vs_own_average: number;
  bad_day_pct_vs_own_average: number;
  good_day_pct_vs_own_average: number;
};

export type FatigueDataset = {
  source: string;
  kind: DatasetKind;
  label: string;
  population: string;
  people: number;
  days: number;
  people_with_fitbit: number;
  days_without_rating_pct: number;
  wearer_days_without_steps_pct: number;
  day_ratings: Record<'good' | 'average' | 'bad', number>;
  by_day_rating: FatigueDay[];
  within_person: WithinPersonMetric[];
  by_health_group: Array<{ group: string; people: number; rated_days: number; bad_day_pct: number }>;
  caveat: string;
};

export type LifeSnapsDataset = {
  source: string;
  kind: DatasetKind;
  label: string;
  population: string;
  people: number;
  days: number;
  hourly_rows: number;
  day_to_day_variation: Array<{
    metric: string;
    people: number;
    typical_personal_average: number;
    typical_day_to_day_sd: number;
    typical_cv_pct: number;
  }>;
  sensor_completeness: Array<{ field: string; days_present_pct: number }>;
  hourly_profile: Array<{ hour: number; steps: number; avg_heart_rate: number }>;
  mood_checkin_days: Array<{ felt_tired: boolean; days: number; steps: number; sleep_minutes: number; resting_heart_rate: number }>;
  caveat: string;
};

export type NhanesMetric = {
  metric: string;
  label: string;
  unit: string;
  weight: string;
  survivors: number;
  survivors_n: number;
  no_cancer: number;
  no_cancer_n: number;
};

export type NhanesDataset = {
  source: string;
  kind: DatasetKind;
  label: string;
  people: number;
  survivors: number;
  survivor_median_age: number;
  no_cancer_median_age: number;
  weighting: string;
  all_ages: NhanesMetric[];
  age_60_plus: NhanesMetric[];
  survivor_cancer_types: Array<{ type: string; people: number }>;
  survivors_hba1c_by_movement: Array<{ group: string; n: number; range: number[]; hba1c_pct: number }>;
  all_hba1c_by_movement: Array<{ group: string; n: number; range: number[]; hba1c_pct: number }>;
  caveat: string;
};

export type CoachingSummary = {
  sources: { annomi: string; text_coaching: string; synthetic: string };
  annomi: {
    kind: DatasetKind;
    label: string;
    high_quality: Record<'sessions' | 'lines' | 'reflections_per_question' | 'open_question_pct' | 'complex_reflection_pct' | 'info_or_advice_pct_of_counsellor_lines' | 'change_talk_pct', number>;
    low_quality: Record<'sessions' | 'lines' | 'reflections_per_question' | 'open_question_pct' | 'complex_reflection_pct' | 'info_or_advice_pct_of_counsellor_lines' | 'change_talk_pct', number>;
    benchmark_lines: number;
    benchmark_expert_agreement_pct: number;
    topics: Array<{ topic: string; sessions: number }>;
  };
  text_coaching: {
    kind: DatasetKind;
    label: string;
    patients: number;
    messages: number;
    by_sender: Record<string, number>;
    by_week: Array<{ week: number; messages: number }>;
    caveat: string;
  };
  program: {
    kind: DatasetKind;
    label: string;
    coaches: number;
    participants: number;
    calls: number;
    labelled_calls: number;
    transcript_lines: number;
    texts: number;
    calls_by_language: Record<string, number>;
    participants_by_cancer_type: Array<{ type: string; people: number }>;
    coach_scorecard: Array<{
      coach_id: string;
      first_name: string;
      role: string;
      languages: string;
      years_experience: number;
      calls: number;
      labelled_calls: number;
      mi_score: number;
      rated_calls: number;
      supervisor_overall: number;
      supervisor_empathy: number;
    }>;
    mi_score_by_month: Array<{ month: string; mi_score: number; labelled_calls: number }>;
    supervisor_agreement: { calls_rated_by_both: number; exact_overall_pct: number; within_one_point_pct: number };
    mi_score_vs_supervisor: { calls: number; spearman: number };
    checklist_done_pct: Array<{ item: string; pct: number }>;
    safety: {
      labelled_calls_with_needs_human: number;
      needs_human_lines: number;
      labelled_texts: number;
      texts_needs_human: number;
      text_intents: Record<string, number>;
    };
    goal_met_by_topic: Array<{ topic: string; weeks: number; met_pct: number; partly_pct: number }>;
    goal_met_by_week: Array<{ week: number; met_pct: number }>;
    caveat: string;
  };
};

export type ProgramCallLine = {
  line_number: number;
  time_in_call: string;
  speaker: 'coach' | 'participant';
  text: string;
  coach_move: string | null;
  participant_talk: string | null;
  needs_human: 'yes' | 'no' | null;
};

export type ProgramCall = {
  call_id: string;
  participant_id: string;
  coach_id: string;
  call_number: number;
  program_week: number;
  date: string;
  start_time: string;
  language: string;
  goal_topic: string;
  duration_min: number;
  labelled: 'yes' | 'no';
  lines: ProgramCallLine[];
};

export type ProgramCallsDataset = { about: string; calls: ProgramCall[] };

const datasetPromises = new Map<string, Promise<unknown>>();

function loadDataset<T>(file: string): Promise<T> {
  const cached = datasetPromises.get(file);
  if (cached) return cached as Promise<T>;
  const request = fetch(`/data/${encodeURIComponent(file)}`).then((response) => {
    if (!response.ok) throw new Error(`Unable to load ${file} (${response.status}).`);
    return response.json() as Promise<T>;
  });
  datasetPromises.set(file, request);
  request.catch(() => {
    if (datasetPromises.get(file) === request) datasetPromises.delete(file);
  });
  return request;
}

export function useDataset<T>(file: string) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const load = useCallback(() => {
    let active = true;
    setLoading(true);
    setError(null);
    loadDataset<T>(file)
      .then((result) => { if (active) setData(result); })
      .catch((cause: unknown) => {
        if (active) setError(cause instanceof Error ? cause.message : `Unable to load ${file}.`);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [file]);
  const reload = useCallback(() => {
    datasetPromises.delete(file);
    return load();
  }, [file, load]);
  useEffect(() => load(), [load]);
  return { data, error, loading, reload };
}
