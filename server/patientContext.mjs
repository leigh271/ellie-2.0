function roundOne(value) {
  return value === null ? null : Math.round(value * 10) / 10;
}

function mean(rows, key, convert = (value) => value) {
  const values = rows
    .map((row) => row[key])
    .filter((value) => typeof value === 'number' && Number.isFinite(value))
    .map(convert);
  return values.length ? roundOne(values.reduce((total, value) => total + value, 0) / values.length) : null;
}

export function buildPatientContext(linkedRecord) {
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
