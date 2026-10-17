import { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { Bar, BarChart, CartesianGrid, Cell, ErrorBar, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useDemoStore } from '../state/DemoStore';
import { useRemote } from '../lib/useRemote';
import { getApi, postApi } from '../lib/api';
import { COACH_FAMILY, scoreCoaching } from '../lib/miScore';
import { BentoGrid, DatasetCard, EmptyState, ErrorState, LoadingTile, Pill, SourceBadge, SourceNote, Stat, Tile, TrendChart } from '../components/UI';
import { useDataset } from '../data/datasets';
import type { CoachingSummary as C5CoachingDataset, FatigueDataset, LifeSnapsDataset, NhanesDataset, ProgramCallsDataset } from '../data/datasets';

type C3Patient = { survivorId: string; displayName: string; status: string; headline: string; urgent?: boolean; updatedAt?: string };
type C3Detail = C3Patient & {
  summary: string; risk: number; urgentRisk: number; scheduleRisk: number; thresholds: { alert: number; watch: number; urgent: number };
  profile: Record<string, string | number | boolean>;
  evidence: Array<{ signal: string; label: string; riskShare?: number; value?: number; unit?: string; baseline?: number; text: string }>;
  recommendations: Array<{ action: string; why: string; urgency: string }>;
  charts: Record<string, Array<string | number | null>>;
};
type C4Patient = { survivorId: string; displayName: string; status: string; headline: string; tags?: Array<{ label: string; tone: string }> };
type C4Detail = C4Patient & {
  summary: string;
  evidence: Array<{ id: string; label: string; value: number | string; unit: string; ci?: number[]; n?: number; scope?: string; method?: string; caveat?: string }>;
  recommendations: Array<{ id: string; title: string; text: string; basis: string; evidenceIds: string[]; realDataCheck?: { label?: string } }>;
  charts: Record<string, any>;
};
type CoachLine = {
  line_number: number;
  time_in_call: string;
  speaker: 'coach' | 'participant';
  text: string;
  coach_move?: string | null;
  participant_talk?: string | null;
  needs_human?: 'yes' | 'no' | null;
  flag?: string | null;
};
type DemoCall = { call_id: string; language: string; goal_topic: string; demo_tag?: string; duration_min: number; labelled?: 'yes' | 'no'; lines: CoachLine[] };
type Calls = { about: string; calls: DemoCall[] };
type TaggedLine = CoachLine & { tag: string | null; gold: string | null; confidence?: number; flag?: string | null; reason?: string };
const EMPTY_CALLS: DemoCall[] = [];

function Heading({ eyebrow, title, subtitle, action }: { eyebrow: string; title: string; subtitle: string; action?: ReactNode }) {
  return <div className="heading"><div><div className="eyebrow">{eyebrow}</div><h1>{title}</h1><p className="muted">{subtitle}</p></div>{action}</div>;
}
function sourceStatus(status: string) {
  return status === 'alert' || status === 'urgent' ? 'danger' : status === 'watch' ? 'warn' : 'good';
}
function percent(value?: number) { return value === undefined ? '—' : `${Math.round(value * 100)}%`; }

export function C3Page() {
  const list = useRemote<C3Patient[]>('/api/c3/survivors');
  const metrics = useRemote<Record<string, any>>('/api/c3/metrics');
  const fatigue = useDataset<FatigueDataset>('c1_fatigue_study.json');
  const lifeSnaps = useDataset<LifeSnapsDataset>('c1_lifesnaps.json');
  const [selected, setSelected] = useState('c3-P02185');
  useEffect(() => { if (list.data?.length && !list.data.some((item) => item.survivorId === selected)) setSelected(list.data[0].survivorId); }, [list.data, selected]);
  const detail = useRemote<C3Detail>(`/api/c3/survivors/${encodeURIComponent(selected)}`);
  const { createTask } = useDemoStore();
  const patients = [...(list.data ?? [])].sort((a, b) => Number(Boolean(b.urgent)) - Number(Boolean(a.urgent)) || Number(b.status === 'alert') - Number(a.status === 'alert'));
  const data = useMemo(() => {
    if (!detail.data?.charts) return [];
    const { dates, risk, urgentRisk, steps, sleepHours, restingHeartRate, hrv, doseDays, watchWornHours } = detail.data.charts;
    return dates.map((date, index) => ({ date: String(date), risk: risk[index] as number | null, urgentRisk: urgentRisk[index] as number | null, steps: steps[index] as number | null, sleepHours: sleepHours[index] as number | null, restingHeartRate: restingHeartRate[index] as number | null, hrv: hrv[index] as number | null, doseDay: doseDays[index], watchWornHours: watchWornHours[index] as number | null }));
  }, [detail.data]);
  const createC3Task = (title: string) => createTask({ patientId: 'unassigned', title, source: `C3 · ${selected}`, assignee: 'RN', dueDate: '', status: 'Open', outcome: '', shareWithPatient: false, patientMessage: '' });
  return <>
    <Heading eyebrow="Challenge 03 · separate synthetic cohort" title="Rough Patch Radar" subtitle="Potential changes in rough-patch risk and wearables. Informational signals; review context and data quality." action={list.data && <SourceBadge source={list.source} />} />
    <BentoGrid>
      <Tile span={4} className="survivor-picker" title="Survivor picker" badge={list.data && <SourceBadge source={list.source} />}>
        {list.loading ? <LoadingTile title="C3 survivors" /> : list.error ? <ErrorState message={list.error} retry={list.reload} /> : patients.map((person) => <button className={`picker-row ${selected === person.survivorId ? 'selected' : ''}`} key={person.survivorId} onClick={() => setSelected(person.survivorId)}><span className={`pill ${sourceStatus(person.status)}`}>{person.urgent ? 'Urgent' : person.status}</span><span><b>{person.displayName}</b><small>{person.headline}</small></span></button>)}
      </Tile>
      {detail.loading && <LoadingTile title="C3 survivor detail" />}
      {detail.error && <Tile span={8}><ErrorState message={detail.error} retry={detail.reload} /></Tile>}
      {detail.data && <>
        <Tile span={8} hero title={`${detail.data.displayName} · risk overview`} badge={<SourceBadge source={detail.source} />}>
          <p className="small">{detail.data.summary}</p>
          <div className="stats-row top-gap"><Stat value={percent(detail.data.risk)} label="Rough-patch risk · next 7 days" /><Stat value={percent(detail.data.urgentRisk)} label="Urgent risk · next 7 days" /><Stat value={percent(detail.data.scheduleRisk)} label="Treatment schedule alone" /></div>
          <div className="threshold-row"><Pill tone="warn">Watch {percent(detail.data.thresholds.watch)}</Pill><Pill tone="danger">Alert {percent(detail.data.thresholds.alert)}</Pill><Pill>Urgent {percent(detail.data.thresholds.urgent)}</Pill></div>
          <TrendChart data={data} lines={[{ key: 'risk', label: 'Rough patch risk', color: '#f65398' }, { key: 'urgentRisk', label: 'Urgent risk', color: '#e28a42' }]} height={230} />
        </Tile>
        <Tile span={6} title="Wearable signals · 42 days" badge={<Pill tone="pink">Dose days marked below</Pill>}><TrendChart data={data} lines={[{ key: 'steps', label: 'Steps', color: '#f65398' }]} height={220} /><p className="tiny muted">Dose days: {data.filter((day) => day.doseDay).map((day) => day.date).join(', ') || 'None marked in this series'}</p></Tile>
        <Tile span={6} title="Sleep · resting heart rate · HRV"><TrendChart data={data} lines={[{ key: 'sleepHours', label: 'Sleep · hours', color: '#82559a' }]} height={165} /><TrendChart data={data} lines={[{ key: 'restingHeartRate', label: 'Resting HR · bpm', color: '#e28a42' }, { key: 'hrv', label: 'HRV', color: '#42a694' }]} height={165} /></Tile>
        <Tile span={4} title="Missing data & device wear"><div className="stat">{Math.round(data.filter((day) => day.watchWornHours !== null).length / Math.max(data.length, 1) * 100)}%</div><p className="small muted">Days with watch-worn data. Missing observations are not zero-valued.</p><div className="divider" />{data.slice(-7).map((day) => <span className="wear-dot" title={`${day.date}: ${day.watchWornHours ?? 'missing'} h`} key={day.date}>{day.watchWornHours === null ? '·' : '●'}</span>)}</Tile>
        <Tile span={4} title="Evidence signals">{detail.data.evidence.map((item) => <div className="evidence-row" key={item.signal}><div className="row between"><b>{item.label}</b><span className="small">{percent(item.riskShare)}</span></div><div className="progress"><span style={{ width: `${Math.min(100, (item.riskShare ?? 0) * 100)}%` }} /></div><p className="tiny muted">{item.text}</p></div>)}</Tile>
        <Tile span={4} title="Recommended care-team review"><p className="small muted">Separate C3 cohort record. Do not link it to an Ellie patient.</p>{detail.data.recommendations.map((item) => <div className="recommendation" key={item.action}><b>{item.action}</b><p className="tiny muted">{item.why} · {item.urgency}</p><button className="linkbtn" onClick={() => createC3Task(item.action)}>Create care-team task</button></div>)}</Tile>
        <Tile span={12} title="Model validation" badge={metrics.data && <SourceBadge source={metrics.source} />}>
          {metrics.loading ? <LoadingTile title="C3 validation metrics" /> : metrics.error ? <ErrorState message={metrics.error} retry={metrics.reload} /> : <div className="validation-grid"><Stat value={metrics.data?.counts?.patients?.toLocaleString() ?? '—'} label="Patients in model dataset" /><Stat value={metrics.data?.calibration?.model?.brier ?? '—'} label="Model Brier score" /><Stat value={metrics.data?.label_v2?.nowcast_auc_train_checkin_days ?? '—'} label="Nowcast AUC · validation" /><p className="small muted">{metrics.data?.definition?.label_version} · {metrics.data?.definition?.rough_day}</p></div>}
          <p className="tiny muted top-gap">Published validation summaries are not a guarantee of performance for any individual and are not clinical validation of this demo.</p>
        </Tile>
      </>}
    </BentoGrid>
    <Heading eyebrow="Independent research cohorts" title="Real-world reference data" subtitle="Population context only. These research participants are not Ellie patients." />
    <BentoGrid className="top-gap">
      {fatigue.loading && <LoadingTile title="Rao fatigue study" />}
      {fatigue.error && <Tile span={12}><ErrorState message={fatigue.error} retry={fatigue.reload} /></Tile>}
      {fatigue.data && <DatasetCard span={12} title="Rao et al. · self-rated fatigue and daily steps" kind={fatigue.data.kind} citation={fatigue.data.source} population={fatigue.data.population} caveat={fatigue.data.caveat}>
        <div className="dataset-inner-grid">
          <section>
            <h3>Steps by self-rated day</h3>
            <div className="chart dataset-chart"><ResponsiveContainer width="100%" height="100%"><BarChart data={fatigue.data.by_day_rating} margin={{ top: 8, right: 16, bottom: 4, left: 0 }}><CartesianGrid stroke="#f3e8ed" vertical={false} /><XAxis dataKey="rating" tick={{ fontSize: 11 }} /><YAxis width={58} tick={{ fontSize: 10 }} /><Tooltip /><Bar dataKey="steps" name="Steps" fill="#f65398" radius={[6, 6, 0, 0]} /></BarChart></ResponsiveContainer></div>
            {(() => {
              const steps = fatigue.data.within_person.find((row) => row.metric === 'steps');
              return steps && <p className="callout">On self-rated bad days, steps averaged {steps.bad_day_pct_vs_own_average}% vs each person's own average ({steps.people} people).</p>;
            })()}
            <p className="tiny muted">Comparing different people mixes in who they are; the within-person rows are the fairer comparison.</p>
          </section>
          <section>
            <h3>Within the same person</h3>
            <div className="table-scroll"><table className="data-table">
              <thead><tr><th>Metric</th><th>People</th><th>Bad day vs own average</th><th>Good day vs own average</th></tr></thead>
              <tbody>{fatigue.data.within_person.map((row) => <tr key={row.metric}><th>{row.metric.replaceAll('_', ' ')}</th><td>{row.people}</td><td>{row.bad_day_pct_vs_own_average}%</td><td>{row.good_day_pct_vs_own_average}%</td></tr>)}</tbody>
            </table></div>
          </section>
          <section>
            <h3>Bad-day rate by health group</h3>
            <div className="table-scroll"><table className="data-table">
              <thead><tr><th>Health group</th><th>People</th><th>Rated days</th><th>Bad-day rate</th></tr></thead>
              <tbody>{fatigue.data.by_health_group.map((row) => <tr key={row.group}><th>{row.group}</th><td>{row.people}</td><td>{row.rated_days.toLocaleString()}</td><td>{row.bad_day_pct}%</td></tr>)}</tbody>
            </table></div>
          </section>
          <section>
            <h3>Missing observations</h3>
            <div className="dataset-stats"><Stat value={`${fatigue.data.days_without_rating_pct}%`} label="Days without a fatigue rating" /><Stat value={`${fatigue.data.wearer_days_without_steps_pct}%`} label="Wearer-days without step data" /></div>
          </section>
        </div>
      </DatasetCard>}
      {lifeSnaps.loading && <LoadingTile title="LifeSnaps" />}
      {lifeSnaps.error && <Tile span={12}><ErrorState message={lifeSnaps.error} retry={lifeSnaps.reload} /></Tile>}
      {lifeSnaps.data && <DatasetCard span={12} title="LifeSnaps · hourly activity and personal variation" kind={lifeSnaps.data.kind} citation={lifeSnaps.data.source} population={lifeSnaps.data.population} caveat={lifeSnaps.data.caveat}>
        <div className="dataset-inner-grid">
          <section>
            <h3>Hourly profile · steps</h3>
            <TrendChart data={lifeSnaps.data.hourly_profile.map((row) => ({ hour: `${row.hour}:00`, steps: row.steps }))} lines={[{ key: 'steps', label: 'Average steps', color: '#f65398' }]} height={240} xKey="hour" />
          </section>
          <section>
            <h3>Day-to-day variation</h3>
            <div className="table-scroll"><table className="data-table">
              <thead><tr><th>Metric</th><th>People</th><th>Personal average</th><th>Typical day-to-day SD</th><th>CV%</th></tr></thead>
              <tbody>{lifeSnaps.data.day_to_day_variation.map((row) => <tr key={row.metric}><th>{row.metric.replaceAll('_', ' ')}</th><td>{row.people}</td><td>{row.typical_personal_average}</td><td>{row.typical_day_to_day_sd}</td><td>{row.typical_cv_pct}%</td></tr>)}</tbody>
            </table></div>
            <p className="tiny muted">Why the Radar compares to each person's own baseline.</p>
          </section>
          <section className="dataset-wide">
            <h3>Missing sensor days are normal.</h3>
            <div className="chart dataset-chart"><ResponsiveContainer width="100%" height="100%"><BarChart data={lifeSnaps.data.sensor_completeness} layout="vertical" margin={{ top: 4, right: 20, bottom: 4, left: 12 }}><CartesianGrid stroke="#f3e8ed" horizontal={false} /><XAxis type="number" domain={[0, 100]} tickFormatter={(value: number) => `${value}%`} tick={{ fontSize: 10 }} /><YAxis type="category" dataKey="field" width={150} tick={{ fontSize: 10 }} /><Tooltip formatter={(value) => [`${value}%`, 'Days present']} /><Bar dataKey="days_present_pct" name="Days present" fill="#82559a" radius={[0, 6, 6, 0]} /></BarChart></ResponsiveContainer></div>
          </section>
        </div>
      </DatasetCard>}
    </BentoGrid>
  </>;
}

function extractSeries(profile: any) {
  if (!profile?.hours || !profile?.series) return [];
  return profile.hours.map((hour: number, index: number) => {
    const row: Record<string, string | number | null> = {
      hour: `${hour}:00`,
      targetLow: profile.targetRange?.[0] ?? null,
      targetHigh: profile.targetRange?.[1] ?? null,
    };
    profile.series.forEach((series: any) => { row[series.label] = series.values[index]; });
    return row;
  });
}

export function C4Page() {
  const list = useRemote<C4Patient[]>('/api/c4/survivors');
  const cohort = useRemote<Record<string, any>>('/api/c4/cohort');
  const nhanes = useDataset<NhanesDataset>('c2_nhanes.json');
  const [selected, setSelected] = useState('c4-N0072');
  const [nhanesAge, setNhanesAge] = useState<'all_ages' | 'age_60_plus'>('all_ages');
  const [advice, setAdvice] = useState<any>(null);
  const [adviceError, setAdviceError] = useState('');
  const [adviceLoading, setAdviceLoading] = useState(false);
  useEffect(() => { if (list.data?.length && !list.data.some((item) => item.survivorId === selected)) setSelected(list.data[0].survivorId); }, [list.data, selected]);
  const detail = useRemote<C4Detail>(`/api/c4/survivors/${encodeURIComponent(selected)}`);
  const { createTask } = useDemoStore();
  const patientList = [...(list.data ?? [])].sort((a, b) => Number(b.status === 'alert') - Number(a.status === 'alert') || Number(b.status === 'watch') - Number(a.status === 'watch'));
  const profileData = extractSeries(detail.data?.charts?.dailyProfile);
  const responseData = useMemo(() => {
    const chart = detail.data?.charts?.dinnerResponse;
    if (!chart) return [];
    return chart.minutes.map((minute: number, index: number) => ({
      minute,
      'Your early dinner': chart.you?.early?.[index],
      'Your later dinner': chart.you?.late?.[index],
      'Cohort early dinner': chart.cohort?.early?.[index],
      'Cohort later dinner': chart.cohort?.late?.[index],
    }));
  }, [detail.data]);
  const walkData = useMemo(() => {
    const chart = detail.data?.charts?.walkResponse;
    if (!chart) return [];
    return chart.minutes.map((minute: number, index: number) => ({
      minute, 'No walk · you': chart.you?.noWalk?.[index], 'Walk · you': chart.you?.walk?.[index],
      'Cohort no walk': chart.cohort?.noWalk?.[index], 'Cohort walk': chart.cohort?.walk?.[index],
    }));
  }, [detail.data]);
  const doseData = detail.data?.charts?.walkDose?.bins?.map((bin: string, index: number) => {
    const est = detail.data?.charts?.walkDose?.est?.[index] ?? 0;
    const lo = detail.data?.charts?.walkDose?.lo?.[index] ?? est;
    const hi = detail.data?.charts?.walkDose?.hi?.[index] ?? est;
    return { bin, estimate: est, range: [Math.abs(est - lo), Math.abs(hi - est)], meals: detail.data?.charts?.walkDose?.nMeals?.[index] };
  }) ?? [];
  const nhanesRows = nhanes.data?.[nhanesAge] ?? [];
  const hba1cData = nhanes.data?.survivors_hba1c_by_movement.map((row) => ({
    group: row.group,
    survivors: row.hba1c_pct,
    allAdults: nhanes.data?.all_hba1c_by_movement.find((item) => item.group === row.group)?.hba1c_pct,
  })) ?? [];
  const fetchAdvice = async () => {
    setAdviceLoading(true); setAdviceError('');
    try { setAdvice((await getApi<any>(`/api/c4/survivors/${encodeURIComponent(selected)}/advice`)).data); }
    catch (error) { setAdviceError(error instanceof Error ? error.message : 'AI wording is not available right now.'); }
    finally { setAdviceLoading(false); }
  };
  const makeTask = (title: string) => createTask({ patientId: 'unassigned', title, source: `C4 · ${selected} · separate cohort`, assignee: 'Health coach', dueDate: '', status: 'Open', outcome: '', shareWithPatient: false, patientMessage: '' });
  return <>
    <Heading eyebrow="Challenge 04 · separate synthetic cohort" title="Glucose Guide" subtitle="Explore individual and cohort glucose patterns. Observational patterns — not causal." action={list.data && <SourceBadge source={list.source} />} />
    <div className="callout warning-note"><b>Observational patterns — not causal.</b> These synthetic comparisons do not establish that meals or movement caused a glucose change and are not attached to Ellie patient records.</div>
    <BentoGrid className="top-gap">
      <Tile span={4} className="survivor-picker" title="Survivor picker" badge={list.data && <SourceBadge source={list.source} />}>
        {list.loading ? <LoadingTile title="C4 survivors" /> : list.error ? <ErrorState message={list.error} retry={list.reload} /> : patientList.map((person) => <button className={`picker-row ${selected === person.survivorId ? 'selected' : ''}`} key={person.survivorId} onClick={() => { setSelected(person.survivorId); setAdvice(null); }}><span className={`pill ${sourceStatus(person.status)}`}>{person.status}</span><span><b>{person.displayName}</b><small>{person.headline}</small></span></button>)}
      </Tile>
      {detail.loading && <LoadingTile title="C4 survivor detail" />}
      {detail.error && <Tile span={8}><ErrorState message={detail.error} retry={detail.reload} /></Tile>}
      {detail.data && <>
        <Tile span={8} hero title={detail.data.displayName} badge={<SourceBadge source={detail.source} />}><p className="small">{detail.data.summary}</p><div className="tag-row">{detail.data.tags?.map((tag) => <Pill key={tag.label} tone={tag.tone === 'risk' || tag.tone === 'warn' ? 'warn' : 'neutral'}>{tag.label}</Pill>)}</div><p className="tiny muted top-gap">Separate C4 demo cohort · {detail.data.survivorId}</p></Tile>
        <Tile span={6} title="Daily glucose profile" badge={<Pill>{detail.data.charts.dailyProfile?.unit}</Pill>}>
          {profileData.length ? <TrendChart data={profileData} lines={[...detail.data.charts.dailyProfile.series.map((series: any, index: number) => ({ key: series.label, label: series.label, color: index ? '#82559a' : '#f65398' })), { key: 'targetLow', label: 'Target low', color: '#7a9b84', dashed: true }, { key: 'targetHigh', label: 'Target high', color: '#7a9b84', dashed: true }]} height={260} xKey="hour" /> : <EmptyState>Daily profile readings are not available for this record.</EmptyState>}
          <p className="tiny muted">Target range {detail.data.charts.dailyProfile?.targetRange?.join('–')} {detail.data.charts.dailyProfile?.unit}</p>
        </Tile>
        <Tile span={6} title="Dinner response · vs cohort"><TrendChart data={responseData} lines={[{ key: 'Your early dinner', label: 'Your early', color: '#f65398' }, { key: 'Your later dinner', label: 'Your later', color: '#ca5a85' }, { key: 'Cohort early dinner', label: 'Cohort early', color: '#6d9a8d', dashed: true }, { key: 'Cohort later dinner', label: 'Cohort later', color: '#3e7a70', dashed: true }]} height={250} xKey="minute" /><button className="btn" onClick={() => makeTask(`Review meal timing patterns with ${selected}`)}>Create care-team task</button></Tile>
        <Tile span={6} title="Walk response · vs cohort"><TrendChart data={walkData} lines={[{ key: 'No walk · you', label: 'No walk · you', color: '#e28a42' }, { key: 'Walk · you', label: 'Walk · you', color: '#f65398' }, { key: 'Cohort no walk', label: 'Cohort · no walk', color: '#9e806a', dashed: true }, { key: 'Cohort walk', label: 'Cohort · walk', color: '#708f79', dashed: true }]} height={240} xKey="minute" /></Tile>
        <Tile span={6} title="Walk duration pattern · cohort" badge={<Pill>95% CI</Pill>}>
          <div className="chart" style={{ height: 255 }}><ResponsiveContainer width="100%" height="100%"><BarChart data={doseData} margin={{ left: -10, right: 10, bottom: 15 }}><CartesianGrid stroke="#f3e8ed" vertical={false} /><XAxis dataKey="bin" tick={{ fontSize: 10 }} /><YAxis tick={{ fontSize: 10 }} width={48} /><Tooltip /><Bar dataKey="estimate" fill="#f65398" radius={[6, 6, 0, 0]}><ErrorBar dataKey="range" width={6} stroke="#4a2034" direction="y" /><Cell fill="#f65398" /></Bar></BarChart></ResponsiveContainer></div><p className="tiny muted">Estimates vs no walk · sample meal counts shown in source data. Observational only.</p>
        </Tile>
        <Tile span={6} title="Overnight fast & follow-up measures">
          {detail.data.charts.overnightFast?.hours?.length ? <TrendChart data={detail.data.charts.overnightFast.hours.map((hour: number, index: number) => ({ hour, glucose: detail.data?.charts.overnightFast.morningGlucose[index] }))} lines={[{ key: 'glucose', label: 'Morning glucose', color: '#82559a' }]} height={175} xKey="hour" /> : <EmptyState>Overnight fasting data is not available for this participant.</EmptyState>}
          <div className="metric-grid top-gap">{detail.data.charts.checkups?.metrics?.map((metric: string, index: number) => <div className="metric-card" key={metric}><span>{metric.replaceAll('_', ' ')}</span><b>{detail.data?.charts.checkups.week0[index] ?? '—'} → {detail.data?.charts.checkups.week12[index] ?? '—'}</b></div>)}</div>
        </Tile>
        <Tile span={7} title="Cohort effects · confidence intervals" badge={cohort.data && <SourceBadge source={cohort.source} />}>
          {cohort.loading ? <LoadingTile title="C4 cohort estimates" /> : cohort.error ? <ErrorState message={cohort.error} retry={cohort.reload} /> : <div className="effect-grid">{Object.entries(cohort.data?.effects ?? {}).slice(0, 6).map(([key, value]: [string, any]) => <div className="effect-card" key={key}><b>{key.replace(/[A-Z]/g, (letter) => ` ${letter.toLowerCase()}`)}</b><div className="stat">{value.est} <span className="tiny">{value.unit ?? 'mg/dL'}</span></div><p className="tiny muted">95% CI {value.lo} to {value.hi} · {value.people} people</p></div>)}</div>}
        </Tile>
        <Tile span={5} title="Evidence & recommendations">
          {detail.data.evidence.slice(0, 3).map((item) => <div className="evidence-row" key={item.id}><b>{item.label}</b><p className="small muted">{item.value} {item.unit} {item.ci && `· CI ${item.ci.join('–')}`}</p><p className="tiny muted">{item.method} · {item.scope}</p></div>)}
          {detail.data.recommendations.map((item) => <div className="recommendation" key={item.id}><b>{item.title}</b><p className="small muted">{item.text}</p><p className="tiny muted">{item.basis} · {item.realDataCheck?.label}</p><button className="linkbtn" onClick={() => makeTask(item.title)}>Create task</button></div>)}
        </Tile>
        <Tile span={12} title="Draft AI wording" badge={<Pill tone="pink">Workers AI · on demand</Pill>}>
          <p className="small muted">Suggested patient-facing phrasing is a draft only; a care-team member must review it. The request uses the selected separate C4 cohort record.</p>
          <button className="btn primary top-gap" onClick={fetchAdvice} disabled={adviceLoading}>{adviceLoading ? 'Drafting…' : 'Draft AI wording (Workers AI)'}</button>
          {adviceError && <p className="error-text top-gap">{adviceError}</p>}
          {advice && <div className="advice-list top-gap"><p className="tiny muted">{advice.model} · human review required</p>{advice.items?.map((item: any) => <div className="callout" key={item.id}><b>{item.title}</b><p>{item.text}</p><small>{item.source} · {item.evidenceIds?.join(', ')}</small></div>)}</div>}
        </Tile>
      </>}
    </BentoGrid>
    <Heading eyebrow="Population context · NHANES 2011–2014" title="Population context · NHANES 2011–2014" subtitle="Survey-weighted population summaries, separate from the synthetic C4 survivor records." />
    <BentoGrid className="top-gap">
      {nhanes.loading && <LoadingTile title="NHANES 2011–2014" />}
      {nhanes.error && <Tile span={12}><ErrorState message={nhanes.error} retry={nhanes.reload} /></Tile>}
      {nhanes.data && <DatasetCard span={12} title="US adults with and without a cancer history" kind={nhanes.data.kind} citation={nhanes.data.source} population={`${nhanes.data.survivors} cancer survivors among ${nhanes.data.people.toLocaleString()} survey participants.`} caveat={nhanes.data.caveat}>
        <div className="page-tools">
          <span className="small muted">Summary table age group</span>
          <div className="mode-switch" role="group" aria-label="NHANES age group">
            <button type="button" className={nhanesAge === 'all_ages' ? 'active' : ''} aria-pressed={nhanesAge === 'all_ages'} onClick={() => setNhanesAge('all_ages')}>All ages</button>
            <button type="button" className={nhanesAge === 'age_60_plus' ? 'active' : ''} aria-pressed={nhanesAge === 'age_60_plus'} onClick={() => setNhanesAge('age_60_plus')}>Age 60+</button>
          </div>
        </div>
        <div className="dataset-inner-grid">
          <section className="dataset-wide">
            <h3>{nhanesAge === 'all_ages' ? 'All ages' : 'Age 60+'} summary</h3>
            <div className="table-scroll"><table className="data-table">
              <thead><tr><th>Measure</th><th>Unit</th><th>Cancer survivors</th><th>n</th><th>No cancer</th><th>n</th></tr></thead>
              <tbody>{nhanesRows.map((row) => <tr key={row.metric}><th>{row.label}</th><td>{row.unit}</td><td>{row.unit === '%' ? `${row.survivors}%` : row.survivors}</td><td>{row.survivors_n.toLocaleString()}</td><td>{row.unit === '%' ? `${row.no_cancer}%` : row.no_cancer}</td><td>{row.no_cancer_n.toLocaleString()}</td></tr>)}</tbody>
            </table></div>
          </section>
          <section>
            <h3>HbA1c by movement third</h3>
            <p className="tiny muted">Survey-weighted HbA1c (%) by movement group; patterns are associations, not effects.</p>
            <div className="chart dataset-chart"><ResponsiveContainer width="100%" height="100%"><BarChart data={hba1cData} margin={{ top: 8, right: 12, bottom: 4, left: 0 }}><CartesianGrid stroke="#f3e8ed" vertical={false} /><XAxis dataKey="group" tick={{ fontSize: 10 }} /><YAxis width={48} tick={{ fontSize: 10 }} /><Tooltip /><Bar dataKey="survivors" name="Cancer survivors" fill="#f65398" radius={[5, 5, 0, 0]} /><Bar dataKey="allAdults" name="All adults" fill="#82559a" radius={[5, 5, 0, 0]} /></BarChart></ResponsiveContainer></div>
          </section>
          <section>
            <h3>Survivor cancer types</h3>
            <div className="table-scroll"><table className="data-table">
              <thead><tr><th>Cancer type</th><th>People</th></tr></thead>
              <tbody>{nhanes.data.survivor_cancer_types.map((row) => <tr key={row.type}><th>{row.type}</th><td>{row.people}</td></tr>)}</tbody>
            </table></div>
          </section>
          <section className="dataset-wide">
            <div className="dataset-stats">
              <Stat value={nhanes.data.survivor_median_age} label="Survivor median age" />
              <Stat value={nhanes.data.no_cancer_median_age} label="No-cancer median age" />
            </div>
            <p className="small muted top-gap">{nhanes.data.weighting}</p>
            <p className="tiny muted">{nhanes.data.caveat}</p>
          </section>
        </div>
      </DatasetCard>}
    </BentoGrid>
  </>;
}

const FLAG_TEXT: Record<string, { level: string; text: string }> = {
  medical: { level: 'danger', text: 'Medical concern: tell the care team today' },
  distress: { level: 'danger', text: 'Emotional distress: check in and connect to support today' },
  social: { level: 'danger', text: 'Unmet basic need: connect to a navigator today' },
  dropout: { level: 'warn', text: 'Dropout risk: participant may leave the program' },
  missed_concern: { level: 'warn', text: 'Coach did not route a concern the participant raised' },
  medical_advice: { level: 'warn', text: 'Coach gave medical advice outside their role' },
  needs_human: { level: 'danger', text: 'Flagged for human review by expert labels' },
};

const expertLine = (line: CoachLine): TaggedLine => ({
  ...line,
  gold: line.speaker === 'coach' ? line.coach_move ?? null : line.participant_talk ?? null,
  tag: line.speaker === 'coach' ? line.coach_move ?? null : line.participant_talk ?? null,
  flag: line.needs_human === 'yes' ? 'needs_human' : line.flag ?? null,
});

function triggerFor(lines: TaggedLine[], index: number, lastCueAt: number): { trigger: string | null; lastCueAt: number } {
  const line = lines[index];
  let trigger: string | null = null;
  if (line.flag === 'missed_concern') trigger = 'The participant raised a concern and the coach moved on without routing it. Help the coach go back to it now.';
  else if (line.flag === 'medical_advice') trigger = 'The coach just gave medical advice outside their role. Help the coach walk it back and refer to the care team.';
  else if (line.flag === 'dropout') trigger = 'The participant is talking about leaving the program. Help the coach explore it without pressure.';
  else if (line.flag === 'needs_human') trigger = 'Participant said something the expert labels flagged for human review. Help the coach respond with care and route it to the right person today.';
  else if (line.flag) trigger = `Participant raised a ${line.flag} concern. Help the coach respond with care and connect them to the right person today.`;
  else if (line.speaker === 'coach') {
    const coach = lines.slice(0, index + 1).filter((item) => item.speaker === 'coach' && item.tag);
    const last = coach.slice(-4).map((item) => item.tag as string);
    const before = lines[index - 1];
    if (line.tag === 'confront') trigger = 'The coach just confronted the participant.';
    else if (line.tag === 'persuade' && !coach.slice(-3, -1).some((item) => item.tag === 'ask permission')) trigger = 'The coach just told the participant what to do without asking permission.';
    else if (before?.speaker === 'participant' && before.tag === 'change' && COACH_FAMILY[line.tag ?? ''] !== 'r' && line.tag !== 'affirm') trigger = 'The participant voiced change talk and the coach did not reflect or affirm it.';
    else if (last.length === 4 && last.every((tag) => COACH_FAMILY[tag] === 'q')) trigger = 'The coach has asked four questions in a row without a reflection.';
    else if (last.length >= 3 && last.slice(-3).every((tag) => tag === 'closed question')) trigger = 'Three closed questions in a row.';
    const count = lines.slice(0, index + 1).filter((item) => item.speaker === 'coach').length;
    if (trigger && count - lastCueAt < 3) trigger = null;
    if (trigger) lastCueAt = count;
  }
  return { trigger, lastCueAt };
}

function C5ReferencePanels({ data, loading, error, reload }: {
  data: C5CoachingDataset | null;
  loading: boolean;
  error: string | null;
  reload: () => void;
}) {
  if (loading) return <LoadingTile title="Coaching reference datasets" />;
  if (error) return <Tile span={12}><ErrorState message={error} retry={reload} /></Tile>;
  if (!data) return null;
  const program = data.program;
  const scorecard = [...program.coach_scorecard].sort((a, b) => b.mi_score - a.mi_score);
  const annomiMetrics: Array<{ label: string; key: keyof typeof data.annomi.high_quality; suffix: string }> = [
    { label: 'Reflections per question (R/Q)', key: 'reflections_per_question', suffix: '' },
    { label: 'Open questions', key: 'open_question_pct', suffix: '%' },
    { label: 'Complex reflections', key: 'complex_reflection_pct', suffix: '%' },
    { label: 'Information / advice of counsellor lines', key: 'info_or_advice_pct_of_counsellor_lines', suffix: '%' },
    { label: 'Change talk', key: 'change_talk_pct', suffix: '%' },
  ];
  return <>
    <Heading eyebrow="Synthetic source · made-up people" title="Program analytics (synthetic)" subtitle="Aggregate program summaries from the supplied synthetic coaching dataset." />
    <BentoGrid className="top-gap">
      <DatasetCard span={12} title="Synthetic coaching program" kind={program.kind} citation={data.sources.synthetic} population={`${program.coaches} coaches · ${program.participants.toLocaleString()} participants · ${program.calls.toLocaleString()} calls`} caveat={program.caveat}>
        <div className="dataset-inner-grid">
          <section className="dataset-wide">
            <h3>Coach scorecard · sorted by Ellie MI score</h3>
            <div className="table-scroll"><table className="data-table">
              <thead><tr><th>Coach</th><th>Role</th><th>Languages</th><th>Labelled calls</th><th>Ellie MI score</th><th>Supervisor overall</th></tr></thead>
              <tbody>{scorecard.map((coach) => <tr key={coach.coach_id}><th>{coach.first_name}</th><td>{coach.role}</td><td>{coach.languages}</td><td>{coach.labelled_calls}</td><td>{coach.mi_score}</td><td>{coach.supervisor_overall}</td></tr>)}</tbody>
            </table></div>
          </section>
          <section>
            <h3>Ellie score vs supervisor overall</h3>
            <Stat value={`Spearman ρ ${program.mi_score_vs_supervisor.spearman}`} label={`Across ${program.mi_score_vs_supervisor.calls} calls`} />
          </section>
          <section>
            <h3>Supervisor agreement</h3>
            <div className="dataset-stats">
              <Stat value={`${program.supervisor_agreement.exact_overall_pct}%`} label="Exact overall agreement" />
              <Stat value={`${program.supervisor_agreement.within_one_point_pct}%`} label="Within one point" />
            </div>
          </section>
          <section>
            <h3>Checklist completion</h3>
            {program.checklist_done_pct.map((item) => <div className="dataset-progress-row" key={item.item}><span>{item.item.replaceAll('_', ' ')}</span><b>{item.pct}%</b><div className="progress"><span style={{ width: `${item.pct}%` }} /></div></div>)}
          </section>
          <section>
            <h3>Safety review counts</h3>
            <div className="dataset-stats">
              <Stat value={program.safety.labelled_calls_with_needs_human} label="Labelled calls with needs-human flags" />
              <Stat value={program.safety.needs_human_lines} label="Needs-human lines" />
              <Stat value={program.safety.labelled_texts} label="Labelled texts" />
              <Stat value={program.safety.texts_needs_human} label="Texts flagged needs-human" />
            </div>
          </section>
          <section className="dataset-wide">
            <h3>Goal-met percentage by topic</h3>
            <div className="chart dataset-chart"><ResponsiveContainer width="100%" height="100%"><BarChart data={program.goal_met_by_topic} layout="vertical" margin={{ top: 4, right: 20, bottom: 4, left: 16 }}><CartesianGrid stroke="#f3e8ed" horizontal={false} /><XAxis type="number" domain={[0, 100]} tickFormatter={(value: number) => `${value}%`} tick={{ fontSize: 10 }} /><YAxis type="category" dataKey="topic" width={140} tick={{ fontSize: 10 }} /><Tooltip formatter={(value) => [`${value}%`, 'Weeks']} /><Bar dataKey="met_pct" name="Met" fill="#f65398" radius={[0, 6, 6, 0]} /><Bar dataKey="partly_pct" name="Partly met" fill="#82559a" radius={[0, 6, 6, 0]} /></BarChart></ResponsiveContainer></div>
          </section>
        </div>
      </DatasetCard>
    </BentoGrid>
    <Heading eyebrow="Real coaching references" title="Real reference data" subtitle="Independent research sources, not Ellie patients." />
    <BentoGrid className="top-gap">
      <DatasetCard span={6} title="AnnoMI · expert-labelled counselling dialogues" kind={data.annomi.kind} citation={data.sources.annomi} population={`${data.annomi.high_quality.sessions} high-quality and ${data.annomi.low_quality.sessions} low-quality sessions.`} caveat={`Benchmark: ${data.annomi.benchmark_lines} ten-expert lines; experts agree ${data.annomi.benchmark_expert_agreement_pct}%.`}>
        <div className="table-scroll"><table className="data-table">
          <thead><tr><th>Measure</th><th>High quality</th><th>Low quality</th></tr></thead>
          <tbody>{annomiMetrics.map(({ label, key, suffix }) => <tr key={key}><th>{label}</th><td>{data.annomi.high_quality[key]}{suffix}</td><td>{data.annomi.low_quality[key]}{suffix}</td></tr>)}</tbody>
        </table></div>
      </DatasetCard>
      <DatasetCard span={6} title="UIC · health coaching text corpus" kind={data.text_coaching.kind} citation={data.sources.text_coaching} population={`${data.text_coaching.patients} patients · ${data.text_coaching.messages.toLocaleString()} messages.`} caveat={data.text_coaching.caveat}>
        <div className="dataset-stats">{Object.entries(data.text_coaching.by_sender).map(([sender, messages]) => <Stat key={sender} value={messages.toLocaleString()} label={`${sender} messages`} />)}</div>
        <h3 className="top-gap">Messages by week</h3>
        <div className="chart dataset-chart compact-chart"><ResponsiveContainer width="100%" height="100%"><BarChart data={data.text_coaching.by_week} margin={{ top: 4, right: 12, bottom: 4, left: 0 }}><CartesianGrid stroke="#f3e8ed" vertical={false} /><XAxis dataKey="week" tick={{ fontSize: 10 }} /><YAxis width={48} tick={{ fontSize: 10 }} /><Tooltip /><Bar dataKey="messages" name="Messages" fill="#82559a" radius={[5, 5, 0, 0]} /></BarChart></ResponsiveContainer></div>
      </DatasetCard>
    </BentoGrid>
  </>;
}

export function C5Page() {
  const callsRemote = useRemote<Calls>('/api/c5/demo-calls');
  const programCallsRemote = useDataset<ProgramCallsDataset>('c5_program_300_calls.json');
  const coachingRemote = useDataset<C5CoachingDataset>('c5_coaching.json');
  const { state, update, createTask } = useDemoStore();
  const [callSource, setCallSource] = useState<'challenge' | 'program'>('challenge');
  const calls = callSource === 'challenge' ? callsRemote.data?.calls ?? EMPTY_CALLS : programCallsRemote.data?.calls ?? EMPTY_CALLS;
  const callLoading = callSource === 'challenge' ? callsRemote.loading : programCallsRemote.loading;
  const callError = callSource === 'challenge' ? callsRemote.error : programCallsRemote.error;
  const reloadCalls = callSource === 'challenge' ? callsRemote.reload : programCallsRemote.reload;
  const [callId, setCallId] = useState('');
  const [live, setLive] = useState(false);
  const [showGold, setShowGold] = useState(true);
  const [lines, setLines] = useState<TaggedLine[]>([]);
  const [working, setWorking] = useState(false);
  const [liveError, setLiveError] = useState('');
  const [cues, setCues] = useState<Array<{ trigger: string; cue?: string; say?: string }>>([]);
  const selected = calls.find((call) => call.call_id === callId) ?? calls[0];
  const reviewKey = selected ? `${callSource === 'program' ? 'program:' : ''}${selected.call_id}` : '';
  const review = state.reviews[reviewKey] ?? { status: 'Pending' as const, note: '', acknowledged: [] };
  const score = scoreCoaching(lines.map((line) => ({ speaker: line.speaker, tag: line.tag })));
  const flaggedLines = lines.filter((line) => line.flag);
  const expertTriggers = useMemo(() => {
    if (live || selected?.labelled === 'no') return [];
    let lastCueAt = -99;
    const found: Array<{ trigger: string }> = [];
    lines.forEach((_, index) => {
      const result = triggerFor(lines, index, lastCueAt);
      lastCueAt = result.lastCueAt;
      if (result.trigger) found.unshift({ trigger: result.trigger });
    });
    return found.slice(0, 4);
  }, [lines, live, selected?.labelled]);
  const recommendations: Array<{ trigger: string; cue?: string; say?: string }> = live ? cues : expertTriggers;
  useEffect(() => { if (calls.length && !calls.some((call) => call.call_id === callId)) setCallId(calls[0].call_id); }, [calls, callId]);
  useEffect(() => {
    if (selected) { setLines(selected.lines.map(expertLine)); setCues([]); setLiveError(''); setLive(false); }
  }, [callSource, selected?.call_id]);
  const supervisorUpdate = (patch: Partial<typeof review>) => update((previous) => ({
    ...previous,
    reviews: { ...previous.reviews, [reviewKey]: { ...review, ...patch } },
    activity: patch.status && patch.status !== review.status
      ? [{ id: crypto.randomUUID(), at: new Date().toISOString(), type: 'Supervisor review', patientId: 'unassigned', message: `${selected.call_id} · ${patch.status}` }, ...previous.activity]
      : previous.activity,
  }));

  const runLive = async () => {
    if (!selected) return;
    const tagged: TaggedLine[] = selected.lines.map((line) => ({ ...line, tag: null, gold: expertLine(line).gold, flag: null }));
    setLive(true); setWorking(true); setLiveError(''); setCues([]); setLines([...tagged]);
    let lastCueAt = -99;
    try {
      for (let index = 0; index < tagged.length; index += 1) {
        const sourceLine = tagged[index];
        const previous = tagged.slice(Math.max(0, index - 2), index).map((line) => ({ speaker: line.speaker, text: line.text, flag: line.flag || undefined }));
        const response = await postApi<any>('/api/c5/turn', { line: { speaker: sourceLine.speaker, text: sourceLine.text }, previous });
        let tag = response.tag as string;
        const updated = { ...sourceLine, tag, confidence: response.confidence as number | undefined, flag: response.flag === 'none' ? null : response.flag as string | null };
        if (response.confidence != null && response.confidence < 0.3) {
          try {
            const reviewed = await postApi<any>('/api/c5/review', { line: { speaker: sourceLine.speaker, text: sourceLine.text }, previous, probabilities: response.probabilities });
            if (reviewed.label) { tag = reviewed.label; updated.tag = tag; updated.reason = reviewed.reason; }
          } catch { /* The live turn still remains visible when the optional review service is unavailable. */ }
        }
        tagged[index] = updated;
        const progress = [...tagged];
        setLines(progress);
        const triggerResult = triggerFor(progress, index, lastCueAt);
        lastCueAt = triggerResult.lastCueAt;
        if (triggerResult.trigger) {
          const recent = progress.slice(Math.max(0, index - 7), index + 1).map(({ speaker, text, tag: lineTag }) => ({ speaker, text, tag: lineTag }));
          try {
            const cue = await postApi<any>('/api/c5/cue', { trigger: triggerResult.trigger, recent });
            setCues((previousCues) => [{ trigger: triggerResult.trigger as string, cue: cue.cue, say: cue.say }, ...previousCues].slice(0, 4));
          } catch { setCues((previousCues) => [{ trigger: triggerResult.trigger as string }, ...previousCues].slice(0, 4)); }
        }
      }
    } catch (error) {
      setLive(false);
      setLiveError(`Live classification failed; showing expert labels instead. ${error instanceof Error ? error.message : ''}`);
      setLines(selected.lines.map(expertLine));
    } finally { setWorking(false); }
  };
  const showExpert = () => { if (selected) { setLive(false); setLines(selected.lines.map(expertLine)); setLiveError(''); setCues([]); } };
  const createFollowup = () => createTask({ patientId: 'unassigned', title: `Supervisor follow-up · ${selected.call_id}`, source: `C5 · ${callSource === 'program' ? 'synthetic program · ' : ''}${selected.call_id}`, assignee: 'Survivorship coordinator', dueDate: '', status: 'Open', outcome: '', shareWithPatient: false, patientMessage: '' });
  return <>
    <Heading eyebrow="Challenge 05 · separate call cohorts" title="Coach’s Co-pilot" subtitle="Review line-by-line expert labels, live classifications, coaching fidelity and human-review flags." action={callSource === 'challenge' && callsRemote.data ? <SourceBadge source={callsRemote.source} /> : callSource === 'program' && programCallsRemote.data ? <Pill tone="pink">Synthetic</Pill> : undefined} />
    <div className="c5-source-controls">
      <label className="small" htmlFor="call-source">Call source</label>
      <select id="call-source" value={callSource} onChange={(event) => { setCallSource(event.target.value as 'challenge' | 'program'); setCallId(''); setLines([]); setLive(false); setCues([]); setLiveError(''); }} className="switch">
        <option value="challenge">Challenge demo calls{callsRemote.data ? ` (${callsRemote.data.calls.length})` : ''}</option>
        <option value="program">Program dataset · {programCallsRemote.data?.calls.length ?? 'loading…'} synthetic calls</option>
      </select>
    </div>
    {callLoading && <LoadingTile title={callSource === 'challenge' ? 'Challenge demo calls' : 'Synthetic program calls'} />}
    {callError && <ErrorState message={callError} retry={reloadCalls} />}
    {callSource === 'program' && programCallsRemote.data && <SourceNote kind="synthetic" citation={programCallsRemote.data.about} population={`${programCallsRemote.data.calls.length} calls in the supplied sample.`} caveat="Synthetic demo conversations; no real people." />}
    {selected && <>
      <div className="c5-controls">
        <label className="small" htmlFor="call-picker">Call · {selected.language} · {selected.goal_topic} · labelled {selected.labelled ?? 'yes'}</label>
        <select id="call-picker" value={selected.call_id} onChange={(event) => { setCallId(event.target.value); setLiveError(''); }} className="switch">
          {calls.map((call) => {
            const demoTag = 'demo_tag' in call ? call.demo_tag : undefined;
            return <option key={call.call_id} value={call.call_id}>{demoTag === 'safety' ? '⚠ ' : demoTag === 'rough coach' ? '△ ' : ''}{call.call_id} · {call.language} · {call.goal_topic} · labelled {call.labelled ?? 'yes'}{demoTag ? ` · ${demoTag}` : ''}</option>;
          })}
        </select>
        <div className="mode-switch"><button className={!live ? 'active' : ''} onClick={showExpert}>Expert labels</button><button className={live ? 'active' : ''} onClick={runLive} disabled={working}>{working ? 'Classifying…' : 'Live classify (Clef via proxy)'}</button></div>
        <label className="small check-label"><input type="checkbox" checked={showGold} onChange={(event) => setShowGold(event.target.checked)} /> Show expert agreement</label>
      </div>
      {liveError && <div className="callout warning-note top-gap" role="alert">{liveError}</div>}
      <BentoGrid className="top-gap">
        <Tile span={8} title="Transcript" badge={<Pill tone="pink">{selected.language} · {selected.duration_min} min</Pill>}>
          <div className="transcript" aria-live="polite">{lines.map((line) => <div className={`transcript-line ${line.speaker} ${line.flag ? 'flagged' : ''}`} key={`${selected.call_id}-${line.line_number}`}><div className="line-who">{line.speaker === 'coach' ? 'Coach' : 'Participant'}<span>{line.time_in_call}</span></div><div className="line-content"><p>{line.text}</p><div className="tag-row"><span className={`coach-tag ${line.speaker === 'coach' ? COACH_FAMILY[line.tag ?? 'other'] ?? 'o' : line.tag === 'change' ? 'change' : line.tag === 'sustain' ? 'sustain' : 'neutral'}`}>{line.tag ?? (!live && selected.labelled === 'no' ? 'no expert label' : 'tagging…')}</span>{line.confidence !== undefined && <span className="tiny muted">{Math.round(line.confidence * 100)}% confidence</span>}{line.flag && <Pill tone={FLAG_TEXT[line.flag]?.level === 'danger' ? 'danger' : 'warn'}>{line.flag === 'needs_human' ? 'needs human review' : line.flag.replace('_', ' ')}</Pill>}{line.needs_human === 'yes' && !line.flag && <Pill tone="danger">Needs human review</Pill>}{showGold && live && line.gold && line.tag !== line.gold && <span className="gold-label">Expert: {line.gold}</span>}{showGold && live && line.gold && line.tag === line.gold && <span className="gold-label">✓ Expert agreement</span>}{line.reason && <span className="tiny muted">{line.reason}</span>}</div></div></div>)}</div>
        </Tile>
        <Tile span={4} title="MI fidelity score" badge={<Pill tone={!live && selected.labelled === 'no' ? 'neutral' : score.score === null ? 'neutral' : score.score >= 70 ? 'good' : score.score >= 50 ? 'warn' : 'danger'}>{!live && selected.labelled === 'no' ? 'No expert labels' : score.score === null ? 'Need 4 tagged coach lines' : score.score >= 70 ? 'Good' : score.score >= 50 ? 'Review' : 'Low'}</Pill>}>
          {!live && selected.labelled === 'no' ? <div className="empty-state"><p>No expert labels for this call — use live classification.</p><button className="btn primary" onClick={runLive} disabled={working}>Live classify</button></div> : <>
            <div className="score-number">{score.score ?? '–'}{score.score !== null && <small>/100</small>}</div>
            <div className="progress score-track"><span className={score.score !== null && score.score < 50 ? 'bad' : score.score !== null && score.score < 70 ? 'warn' : ''} style={{ width: `${score.score ?? 0}%` }} /></div>
            <div className="metric-grid">{[
              ['Open-question %', score.metrics.openQuestionPercent], ['Reflections / question', score.metrics.reflectionsPerQuestion],
              ['Complex reflections', score.metrics.complexReflectionPercent], ['MI-consistent count', score.metrics.miConsistent],
              ['Persuade / confront', score.metrics.persuadeConfront], ['Change-talk %', score.metrics.changeTalkPercent],
            ].map(([label, value]) => <div className="metric-card" key={label}><span>{label}</span><b>{value}</b></div>)}</div>
            <p className="tiny muted top-gap">Exact reference scoring: 30 reflection/question · 20 complex · 20 open question · 30 MI-consistent behavior.</p>
          </>}
        </Tile>
        <Tile span={5} title="Coaching recommendations" badge={<Pill tone="pink">{live ? 'Live cue service' : 'Expert trigger rules'}</Pill>}>
          {recommendations.length ? recommendations.map((cue, index) => <div className="recommendation" key={`${cue.trigger}-${index}`}><p className="tiny muted">{cue.trigger}</p>{cue.cue && <b>{cue.cue}</b>}{cue.say && <p className="small">“{cue.say}”</p>}</div>) : <EmptyState>Quiet. Coaching prompts appear when a reference trigger fires.</EmptyState>}
        </Tile>
        <Tile span={7} title="Supervisor review" badge={<Pill tone={review.status === 'Approved' ? 'good' : review.status === 'Escalated' ? 'danger' : 'warn'}>{review.status}</Pill>}>
          <div className="page-tools"><button className="btn" onClick={() => supervisorUpdate({ status: 'In review' })}>Start review</button><button className="btn" onClick={() => supervisorUpdate({ status: 'Approved' })}>Approve</button><button className="btn" onClick={() => supervisorUpdate({ status: 'Escalated' })}>Escalate</button></div>
          <label className="field-label" htmlFor="supervisor-note">Reviewer note</label><textarea id="supervisor-note" rows={3} value={review.note} onChange={(event) => supervisorUpdate({ note: event.target.value })} placeholder="Document review context…" />
          <p className="small muted top-gap">Flagged lines · acknowledge after human review</p>
          {flaggedLines.length ? flaggedLines.map((line) => <label className="ack-row" key={line.line_number}><input type="checkbox" checked={review.acknowledged.includes(String(line.line_number))} onChange={(event) => supervisorUpdate({ acknowledged: event.target.checked ? [...review.acknowledged, String(line.line_number)] : review.acknowledged.filter((id) => id !== String(line.line_number)) })} /><span><b>Line {line.line_number} · {line.flag === 'needs_human' ? 'needs human review' : line.flag ?? 'needs review'}</b><small>{line.text}</small></span></label>) : <EmptyState>No flagged lines in this call.</EmptyState>}
          <button className="btn primary top-gap" onClick={createFollowup}>Create follow-up task</button>
        </Tile>
      </BentoGrid>
    </>}
    <C5ReferencePanels data={coachingRemote.data} loading={coachingRemote.loading} error={coachingRemote.error} reload={coachingRemote.reload} />
  </>;
}

export const c5FlagText = FLAG_TEXT;
