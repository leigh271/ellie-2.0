import { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { Bar, BarChart, CartesianGrid, Cell, ErrorBar, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useDemoStore } from '../state/DemoStore';
import { useRemote } from '../lib/useRemote';
import { getApi, postApi } from '../lib/api';
import { COACH_FAMILY, scoreCoaching } from '../lib/miScore';
import { BentoGrid, EmptyState, ErrorState, LoadingTile, Pill, SourceBadge, Stat, Tile, TrendChart } from '../components/UI';

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
type DemoCall = { call_id: string; language: string; goal_topic: string; demo_tag: string; duration_min: number; lines: CoachLine[] };
type Calls = { about: string; calls: DemoCall[] };
type TaggedLine = CoachLine & { tag: string | null; gold: string | null; confidence?: number; flag?: string | null; reason?: string };

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
  const [selected, setSelected] = useState('c4-N0072');
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

export function C5Page() {
  const callsRemote = useRemote<Calls>('/api/c5/demo-calls');
  const { state, update, createTask } = useDemoStore();
  const calls = callsRemote.data?.calls ?? [];
  const [callId, setCallId] = useState('');
  const [live, setLive] = useState(false);
  const [showGold, setShowGold] = useState(true);
  const [lines, setLines] = useState<TaggedLine[]>([]);
  const [working, setWorking] = useState(false);
  const [liveError, setLiveError] = useState('');
  const [cues, setCues] = useState<Array<{ trigger: string; cue?: string; say?: string }>>([]);
  const selected = calls.find((call) => call.call_id === callId) ?? calls[0];
  const review = state.reviews[selected?.call_id ?? ''] ?? { status: 'Pending' as const, note: '', acknowledged: [] };
  const score = scoreCoaching(lines.map((line) => ({ speaker: line.speaker, tag: line.tag })));
  const flaggedLines = lines.filter((line) => line.flag);
  const expertTriggers = useMemo(() => {
    if (live) return [];
    let lastCueAt = -99;
    const found: Array<{ trigger: string }> = [];
    lines.forEach((_, index) => {
      const result = triggerFor(lines, index, lastCueAt);
      lastCueAt = result.lastCueAt;
      if (result.trigger) found.unshift({ trigger: result.trigger });
    });
    return found.slice(0, 4);
  }, [lines, live]);
  const recommendations: Array<{ trigger: string; cue?: string; say?: string }> = live ? cues : expertTriggers;
  useEffect(() => { if (calls.length && !callId) setCallId(calls[0].call_id); }, [calls, callId]);
  useEffect(() => {
    if (selected) { setLines(selected.lines.map(expertLine)); setCues([]); setLiveError(''); setLive(false); }
  }, [selected?.call_id]);
  const supervisorUpdate = (patch: Partial<typeof review>) => update((previous) => ({
    ...previous,
    reviews: { ...previous.reviews, [selected.call_id]: { ...review, ...patch } },
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
  const createFollowup = () => createTask({ patientId: 'unassigned', title: `Supervisor follow-up · ${selected.call_id}`, source: `C5 · ${selected.call_id}`, assignee: 'Survivorship coordinator', dueDate: '', status: 'Open', outcome: '', shareWithPatient: false, patientMessage: '' });
  return <>
    <Heading eyebrow="Challenge 05 · separate synthetic call cohort" title="Coach’s Co-pilot" subtitle="Review line-by-line expert labels, live classifications, coaching fidelity and human-review flags." action={callsRemote.data && <SourceBadge source={callsRemote.source} />} />
    {callsRemote.error && <ErrorState message={callsRemote.error} retry={callsRemote.reload} />}
    {callsRemote.loading && <LoadingTile title="Demo calls" />}
    {selected && <>
      <div className="c5-controls">
        <label className="small" htmlFor="call-picker">Demo call</label>
        <select id="call-picker" value={selected.call_id} onChange={(event) => { setCallId(event.target.value); setLiveError(''); }} className="switch">
          {calls.map((call) => <option key={call.call_id} value={call.call_id}>{call.demo_tag === 'safety' ? '⚠ ' : call.demo_tag === 'rough coach' ? '△ ' : ''}{call.call_id} · {call.language} · {call.goal_topic} · {call.demo_tag}</option>)}
        </select>
        <div className="mode-switch"><button className={!live ? 'active' : ''} onClick={showExpert}>Expert labels</button><button className={live ? 'active' : ''} onClick={runLive} disabled={working}>{working ? 'Classifying…' : 'Live classify (Clef via proxy)'}</button></div>
        <label className="small check-label"><input type="checkbox" checked={showGold} onChange={(event) => setShowGold(event.target.checked)} /> Show expert agreement</label>
      </div>
      {liveError && <div className="callout warning-note top-gap" role="alert">{liveError}</div>}
      <BentoGrid className="top-gap">
        <Tile span={8} title="Transcript" badge={<Pill tone="pink">{selected.language} · {selected.duration_min} min</Pill>}>
          <div className="transcript" aria-live="polite">{lines.map((line) => <div className={`transcript-line ${line.speaker} ${line.flag ? 'flagged' : ''}`} key={`${selected.call_id}-${line.line_number}`}><div className="line-who">{line.speaker === 'coach' ? 'Coach' : 'Participant'}<span>{line.time_in_call}</span></div><div className="line-content"><p>{line.text}</p><div className="tag-row"><span className={`coach-tag ${line.speaker === 'coach' ? COACH_FAMILY[line.tag ?? 'other'] ?? 'o' : line.tag === 'change' ? 'change' : line.tag === 'sustain' ? 'sustain' : 'neutral'}`}>{line.tag ?? 'tagging…'}</span>{line.confidence !== undefined && <span className="tiny muted">{Math.round(line.confidence * 100)}% confidence</span>}{line.flag && <Pill tone={FLAG_TEXT[line.flag]?.level === 'danger' ? 'danger' : 'warn'}>{line.flag === 'needs_human' ? 'needs human review' : line.flag.replace('_', ' ')}</Pill>}{line.needs_human === 'yes' && !line.flag && <Pill tone="danger">Needs human review</Pill>}{showGold && live && line.gold && line.tag !== line.gold && <span className="gold-label">Expert: {line.gold}</span>}{showGold && live && line.gold && line.tag === line.gold && <span className="gold-label">✓ Expert agreement</span>}{line.reason && <span className="tiny muted">{line.reason}</span>}</div></div></div>)}</div>
        </Tile>
        <Tile span={4} title="MI fidelity score" badge={<Pill tone={score.score === null ? 'neutral' : score.score >= 70 ? 'good' : score.score >= 50 ? 'warn' : 'danger'}>{score.score === null ? 'Need 4 tagged coach lines' : score.score >= 70 ? 'Good' : score.score >= 50 ? 'Review' : 'Low'}</Pill>}>
          <div className="score-number">{score.score ?? '–'}{score.score !== null && <small>/100</small>}</div>
          <div className="progress score-track"><span className={score.score !== null && score.score < 50 ? 'bad' : score.score !== null && score.score < 70 ? 'warn' : ''} style={{ width: `${score.score ?? 0}%` }} /></div>
          <div className="metric-grid">{[
            ['Open-question %', score.metrics.openQuestionPercent], ['Reflections / question', score.metrics.reflectionsPerQuestion],
            ['Complex reflections', score.metrics.complexReflectionPercent], ['MI-consistent count', score.metrics.miConsistent],
            ['Persuade / confront', score.metrics.persuadeConfront], ['Change-talk %', score.metrics.changeTalkPercent],
          ].map(([label, value]) => <div className="metric-card" key={label}><span>{label}</span><b>{value}</b></div>)}</div>
          <p className="tiny muted top-gap">Exact reference scoring: 30 reflection/question · 20 complex · 20 open question · 30 MI-consistent behavior.</p>
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
  </>;
}

export const c5FlagText = FLAG_TEXT;
