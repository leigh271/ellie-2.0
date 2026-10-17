import { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { Link, useParams } from 'react-router-dom';
import { elliePatients } from '../data/ellieDemo';
import { analyzeRoughPatch } from '../lib/roughPatch';
import { scoreCoaching } from '../lib/miScore';
import { useRemote } from '../lib/useRemote';
import { useDemoStore } from '../state/DemoStore';
import { BentoGrid, EmptyState, ErrorState, LoadingTile, Pill, SourceBadge, Stat, Tile, TrendChart } from '../components/UI';
import { datasetFieldLabel, formatDatasetNumber, useDataset } from '../data/datasets';
import type { CoachingSummary, FatigueDataset, LifeSnapsDataset, NhanesDataset } from '../data/datasets';
import { withLinkedWearable } from '../data/patientLinks';
import type { PatientLinksDataset } from '../data/patientLinks';

type ChallengeSurvivor = { survivorId: string; displayName: string; status: string; headline: string; urgent?: boolean };
type CallLine = { speaker: 'coach' | 'participant'; coach_move?: string | null; participant_talk?: string | null };
type DemoCall = { call_id: string; lines: CallLine[] };
type Calls = { calls: DemoCall[] };

function Header({ eyebrow, title, subtitle, action }: { eyebrow: string; title: string; subtitle?: string; action?: ReactNode }) {
  return <div className="heading"><div><div className="eyebrow">{eyebrow}</div><h1>{title}</h1>{subtitle && <p className="muted">{subtitle}</p>}</div>{action}</div>;
}

function linkedNumber(value: number | null | undefined, fractionDigits = 1): string {
  return value === null || value === undefined ? '—' : formatDatasetNumber(value, fractionDigits);
}

function goalStatus(value: string | number | null): string {
  const normalized = String(value ?? '').trim().toLowerCase();
  if (['yes', '1', 'true', 'met'].includes(normalized)) return 'Met';
  if (['partial', 'partly', 'partially'].includes(normalized)) return 'Partly met';
  return 'Not yet';
}

export function CommandCenter() {
  const { state } = useDemoStore();
  const c3 = useRemote<ChallengeSurvivor[]>('/api/c3/survivors');
  const c4 = useRemote<ChallengeSurvivor[]>('/api/c4/survivors');
  const calls = useRemote<Calls>('/api/c5/demo-calls');
  const fatigue = useDataset<FatigueDataset>('c1_fatigue_study.json');
  const lifeSnaps = useDataset<LifeSnapsDataset>('c1_lifesnaps.json');
  const nhanes = useDataset<NhanesDataset>('c2_nhanes.json');
  const coaching = useDataset<CoachingSummary>('c5_coaching.json');
  const patientLinks = useDataset<PatientLinksDataset>('patient_links.json');
  const openTasks = state.tasks.filter((task) => task.status !== 'Done').length;
  const c3Alerts = c3.data?.filter((item) => item.status === 'alert' || item.urgent).length ?? 0;
  const c4Alerts = c4.data?.filter((item) => item.status === 'alert').length ?? 0;
  const coachingScores = useMemo(() => {
    if (!calls.data?.calls.length) return [];
    return calls.data.calls.map((call) => scoreCoaching(call.lines.map((line) => ({
      speaker: line.speaker,
      tag: line.speaker === 'coach' ? line.coach_move : line.participant_talk,
    })).filter((line) => line.tag)).score).filter((score): score is number => score !== null);
  }, [calls.data]);
  const fidelity = coachingScores.length ? Math.round(coachingScores.reduce((sum, score) => sum + score, 0) / coachingScores.length) : null;
  const priority = useMemo(() => {
    const notes = elliePatients.map((patient) => ({
      patient,
      result: analyzeRoughPatch(withLinkedWearable(patient, patientLinks.data?.patients[patient.id])),
    }))
      .filter(({ patient, result }) => result.active || state.checkIns.some((checkin) => checkin.energy === 'Low' && patient.id === 'maria'))
      .sort((a, b) => Number(b.result.active) - Number(a.result.active) || b.result.rules.length - a.result.rules.length);
    return notes;
  }, [state.checkIns, patientLinks.data]);
  const moduleAlerts = [
    ...(c3.data ?? []).filter((item) => item.status === 'alert' || item.urgent).slice(0, 2).map((item) => ({ ...item, module: 'C3', path: '/modules/c3' })),
    ...(c4.data ?? []).filter((item) => item.status === 'alert').slice(0, 2).map((item) => ({ ...item, module: 'C4', path: '/modules/c4' })),
  ];
  const loop = state.careLoops.maria;
  const stages = ['detect', 'understand', 'review', 'act', 'followup'] as const;
  const stageLabels = ['Detect', 'Understand', 'Review', 'Act', 'Follow up'];
  const sourceRows = [
    { name: 'Rao fatigue study', kind: 'real', size: fatigue.data ? `${fatigue.data.people} people` : 'Loading…', href: '/modules/c3', module: 'C3', source: 'dataset' },
    { name: 'LifeSnaps', kind: 'real', size: lifeSnaps.data ? `${lifeSnaps.data.people} people` : 'Loading…', href: '/modules/c3', module: 'C3', source: 'dataset' },
    { name: 'NHANES 2011–2014', kind: 'real', size: nhanes.data ? `${nhanes.data.people.toLocaleString()} people · ${nhanes.data.survivors} survivors` : 'Loading…', href: '/modules/c4', module: 'C4', source: 'dataset' },
    { name: 'AnnoMI', kind: 'real', size: coaching.data ? `${(coaching.data.annomi.high_quality.lines + coaching.data.annomi.low_quality.lines).toLocaleString()} labelled lines` : 'Loading…', href: '/modules/c5', module: 'C5', source: 'dataset' },
    { name: 'UIC text coaching', kind: 'real', size: coaching.data ? `${coaching.data.text_coaching.messages.toLocaleString()} messages` : 'Loading…', href: '/modules/c5', module: 'C5', source: 'dataset' },
    { name: 'Coaching program', kind: 'synthetic', size: coaching.data ? `${coaching.data.program.calls.toLocaleString()} calls` : 'Loading…', href: '/modules/c5', module: 'C5', source: 'dataset' },
    { name: 'Live C3 API', kind: c3.data ? c3.source : 'live', size: c3.data ? `${c3.data.length} survivor records` : 'Loading…', href: '/modules/c3', module: 'C3', source: 'api' },
    { name: 'Live C4 API', kind: c4.data ? c4.source : 'live', size: c4.data ? `${c4.data.length} survivor records` : 'Loading…', href: '/modules/c4', module: 'C4', source: 'api' },
    { name: 'C5 calls API', kind: calls.data ? calls.source : 'live', size: calls.data ? `${calls.data.calls.length} calls` : 'Loading…', href: '/modules/c5', module: 'C5', source: 'api' },
  ];
  return <>
    <Header eyebrow="Hospital command center" title="Good morning, care team." subtitle="Your patients, priorities, and lifestyle medicine insights in one place." action={<Link className="btn primary" to="/patients/maria">Open Maria’s Patient 360 →</Link>} />
    <BentoGrid>
      <Tile span={3} hero><Stat value={elliePatients.length} label="Assigned Ellie patients" note="Fictional survivorship roster" /></Tile>
      <Tile span={3}><Stat value={openTasks} label="Open care tasks" note="Across the demo workspace" /></Tile>
      <Tile span={3}><div className="head"><span className="small muted">C3 module alerts</span>{c3.data && <SourceBadge source={c3.source} />}</div>{c3.loading ? <div className="stat">…</div> : c3.error ? <div className="tiny muted">{c3.error}</div> : <Stat value={c3Alerts} label="Synthetic cohort · Rough Patch Radar" note="Not attached to Ellie patients" />}</Tile>
      <Tile span={3}><div className="head"><span className="small muted">C4 module alerts</span>{c4.data && <SourceBadge source={c4.source} />}</div>{c4.loading ? <div className="stat">…</div> : c4.error ? <div className="tiny muted">{c4.error}</div> : <Stat value={c4Alerts} label="Synthetic cohort · Glucose Guide" note="Not attached to Ellie patients" />}</Tile>
      <Tile span={4} title="Patient attention queue" badge={<Pill tone="pink">Explainable demo signals</Pill>}>
        {priority.length ? priority.slice(0, 4).map(({ patient, result }) => {
          const lowCheckin = state.checkIns.some((checkin) => checkin.energy === 'Low' && (checkin.patientId ?? 'maria') === patient.id);
          return <div className="patient-row" key={patient.id}><span className="avatar">{patient.initials}</span><div className="grow"><b>{patient.name}</b><p className="small muted">{lowCheckin ? 'Low-energy check-in to review' : result.rules[0]}</p></div><Link className="btn" to={`/patients/${patient.id}`}>Open 360</Link></div>;
        }) : <EmptyState>No current demo attention items.</EmptyState>}
        <p className="tiny muted">Source-labeled linked records appear in Patient 360; the C3/C4 module cohorts remain separate.</p>
      </Tile>
      <Tile span={4} hero title="Ellie Care Loop" badge={<Pill tone="pink">Maria · active</Pill>}>
        <div className="loop-stages">{stages.map((stage, index) => <div className={`loop-stage ${loop?.[stage] ? 'done' : index === stages.findIndex((item) => !loop?.[item]) ? 'current' : ''}`} key={stage}><span>{loop?.[stage] ? '✓' : index + 1}</span><b>{stageLabels[index]}</b></div>)}</div>
        <p className="small muted">Detect → understand → review → act → document the follow-up outcome.</p>
        <Link className="btn primary" to="/patients/maria">Continue Maria’s loop</Link>
      </Tile>
      <Tile span={4} title="Coaching quality" badge={calls.data && <SourceBadge source={calls.source} />}>
        {calls.loading ? <LoadingTile title="Coach calls" /> : calls.error ? <ErrorState message={calls.error} retry={calls.reload} /> : <><div className="stat">{fidelity ?? '–'}<span className="small"> / 100</span></div><p className="small muted">Average expert-label MI fidelity across labelled calls.</p><TrendChart data={coachingScores.slice(0, 8).map((score, index) => ({ call: `Call ${index + 1}`, score }))} lines={[{ key: 'score', label: 'MI fidelity', color: '#f65398' }]} height={100} /><Link className="linkbtn" to="/modules/c5">Review calls & flags →</Link></>}
      </Tile>
      <Tile span={6} title="Module alerts · separate synthetic cohorts" actions={<span className="small muted">C3 & C4 · not Ellie patients</span>}>
        {c3.loading || c4.loading ? <div className="skeleton" /> : c3.error || c4.error ? <ErrorState message={c3.error ?? c4.error ?? 'Could not load alerts'} retry={() => { c3.reload(); c4.reload(); }} /> : moduleAlerts.length ? moduleAlerts.map((item) => <div className="patient-row" key={`${item.module}-${item.survivorId}`}><span className={`pill ${item.module === 'C3' ? 'pink' : 'warn'}`}>{item.module}</span><div className="grow"><b>{item.displayName}</b><p className="small muted">{item.headline}</p></div><Link className="btn" to={item.path}>Open module</Link></div>) : <EmptyState>No module alerts returned.</EmptyState>}
      </Tile>
      <Tile span={6} title="Recent activity" actions={<Link className="linkbtn" to="/activity">View all →</Link>}>
        {state.activity.slice(0, 4).map((item) => <div className="patient-row" key={item.id}><span className="activity-mark">✦</span><div className="grow"><b>{item.message}</b><p className="tiny muted">{item.type} · {new Date(item.at).toLocaleString()}</p></div></div>)}
      </Tile>
      <Tile span={12} title="Data sources" badge={<Pill tone="pink">Provider reference only</Pill>}>
        <div className="data-source-list">{sourceRows.map((item) => {
          const isDataset = item.source === 'dataset';
          const label = item.kind === 'real' ? 'Real research data' : item.kind === 'synthetic' ? 'Synthetic' : item.kind === 'live' ? 'Live API' : item.kind === 'snapshot' ? 'Snapshot' : String(item.kind);
          const tone = item.kind === 'real' || item.kind === 'live' ? 'good' : item.kind === 'snapshot' ? 'warn' : 'pink';
          return <div className="data-source-row" key={item.name}><div className="grow"><b>{item.name}</b><small>{item.size}{isDataset && item.kind === 'real' ? ' · not Ellie patients' : ''}</small></div><Pill tone={tone}>{label}</Pill><Link className="btn" to={item.href}>{item.module}</Link></div>;
        })}</div>
      </Tile>
    </BentoGrid>
  </>;
}

export function PatientList() {
  const [query, setQuery] = useState('');
  const filtered = elliePatients.filter((patient) => `${patient.name} ${patient.diagnosis} ${patient.phase}`.toLowerCase().includes(query.toLowerCase()));
  return <>
    <Header eyebrow="Patient 360" title="Ellie patient roster" subtitle="Six fictional patients with separate, simulated demo records." />
    <div className="page-tools"><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search name, diagnosis, phase" aria-label="Search Ellie patients" /></div>
    <BentoGrid className="top-gap">{filtered.map((patient) => {
      const result = analyzeRoughPatch(patient);
      return <Tile key={patient.id} span={4} title={patient.name} badge={<Pill tone={result.active ? 'warn' : 'good'}>{result.active ? 'Review trend' : 'Routine'}</Pill>}>
        <p className="small muted">{patient.diagnosis} · {patient.phase} · {patient.language}</p>
        <p className="small patient-summary">{result.active ? result.rules.join(' · ') : patient.goals[0]}</p>
        <Link className="btn primary" to={`/patients/${patient.id}`}>Open Patient 360 →</Link>
      </Tile>;
    })}{filtered.length === 0 && <Tile span={12}><EmptyState>No patients match that search.</EmptyState></Tile>}</BentoGrid>
  </>;
}

type PatientTab = 'Overview' | 'Wearables' | 'Lifestyle' | 'Coaching' | 'Care plan & tasks' | 'Notes (internal)';

export function Patient360() {
  const { id = 'maria' } = useParams();
  const patient = elliePatients.find((item) => item.id === id) ?? elliePatients[0];
  const [tab, setTab] = useState<PatientTab>('Overview');
  const [reviewNote, setReviewNote] = useState('');
  const { state, log, markLoop, createTask } = useDemoStore();
  const linkedData = useDataset<PatientLinksDataset>('patient_links.json');
  const nhanesData = useDataset<NhanesDataset>('c2_nhanes.json');
  const linked = linkedData.data?.patients[patient.id];
  const linkedPatient = withLinkedWearable(patient, linked);
  const result = analyzeRoughPatch(linkedPatient);
  const [aiStatus, setAiStatus] = useState<{ enabled: boolean; model: string } | null>(null);
  const [aiSummary, setAiSummary] = useState('');
  const [aiSummaryError, setAiSummaryError] = useState('');
  const [aiSummaryLoading, setAiSummaryLoading] = useState(false);
  useEffect(() => {
    let active = true;
    fetch('/api/ai/status')
      .then((response) => {
        if (!response.ok) throw new Error('AI status unavailable');
        return response.json() as Promise<{ enabled: boolean; model: string }>;
      })
      .then((status) => { if (active) setAiStatus(status); })
      .catch(() => { if (active) setAiStatus({ enabled: false, model: 'gpt-4o-mini' }); });
    return () => { active = false; };
  }, []);
  const generateAiSummary = async () => {
    setAiSummaryLoading(true);
    setAiSummaryError('');
    try {
      const response = await fetch('/api/ai/summary', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          patient: {
            name: patient.name,
            diagnosis: patient.diagnosis,
            phase: patient.phase,
            goals: patient.goals,
            needs: patient.needs,
          },
          patientId: patient.id,
        }),
      });
      if (!response.ok) throw new Error('AI summary unavailable right now.');
      const body = await response.json() as { summary?: string };
      setAiSummary(body.summary ?? '');
    } catch {
      setAiSummaryError('AI summary unavailable right now.');
    } finally {
      setAiSummaryLoading(false);
    }
  };
  const patientTasks = state.tasks.filter((task) => task.patientId === patient.id);
  const sharedQuestionTasks = patientTasks.filter((task) => task.title === 'Patient questions for next visit' && task.details);
  const patientQuestions = [...new Set([
    ...(state.patientQuestions[patient.id] ?? []),
    ...sharedQuestionTasks.flatMap((task) => (task.details ?? '').split('\n').map((question) => question.replace(/^•\s*/, '').trim()).filter(Boolean)),
  ])];
  const appLanguage = ({ en: 'English', es: 'Spanish', ht: 'Haitian Creole' } as const)[state.patientLanguage[patient.id] ?? 'en'];
  const loop = state.careLoops[patient.id];
  const tabs: PatientTab[] = ['Overview', 'Wearables', 'Lifestyle', 'Coaching', 'Care plan & tasks', 'Notes (internal)'];
  const openTab = (next: PatientTab) => {
    setTab(next);
    if (next === 'Wearables' && patient.id === 'maria' && !loop?.understand) markLoop(patient.id, 'understand');
  };
  const days = linkedPatient.wearable.map((day, index) => ({
    ...day,
    date: `Day ${index + 1}`,
    badDaySteps: linked?.wearable.series[index]?.bad_day === 1 ? day.steps : null,
    baselineSteps: result.baseline.steps,
    baselineSleep: result.baseline.sleepHours,
    baselineRestingHR: result.baseline.restingHR,
  }));
  const review = () => {
    markLoop(patient.id, 'review');
    log('Provider review', patient.id, `Reviewed simulated Ellie wellness insight${reviewNote ? ` · ${reviewNote}` : ''}`);
    setReviewNote('');
  };
  const makeFollowup = () => createTask({
    patientId: patient.id,
    title: `Check in with ${patient.name.split(' ')[0]} about fatigue & sleep`,
    source: 'Simulated Ellie · rough-patch rule',
    assignee: 'Health coach',
    dueDate: new Date(Date.now() + 86400000).toISOString().slice(0, 10),
    status: 'Open',
    outcome: '',
    shareWithPatient: true,
    patientMessage: 'Your care team noticed a recent change in activity and sleep patterns and will reach out to check in.',
  });
  const nhanesComparisons = linked ? [
    { label: 'HbA1c', value: linked.nhanes.hba1c_pct, metric: 'hba1c_pct', digits: 2 },
    { label: 'BMI', value: linked.nhanes.bmi, metric: 'bmi', digits: 1 },
    { label: 'Movement', value: linked.nhanes.movement_per_day_mims, metric: 'movement_per_day_mims', digits: 0 },
    { label: 'Sensor sleep', value: linked.nhanes.sensor_sleep_hours_per_day, metric: 'sensor_sleep_hours_per_day', digits: 1 },
  ] : [];
  return <>
    <Header eyebrow="Patient 360 · fictional record" title={patient.name} subtitle={`${patient.diagnosis} · ${patient.phase} · ${patient.language}`} action={<Link className="btn" to="/patients">← All patients</Link>} />
    <div className="tabrow" role="tablist" aria-label="Patient 360 sections">
      {tabs.map((item) => <button type="button" role="tab" aria-selected={tab === item} className={tab === item ? 'active' : ''} key={item} onClick={() => openTab(item)}>{item}</button>)}
    </div>
    {tab === 'Overview' && <BentoGrid>
      <Tile span={8} hero title="Care journey" badge={<Pill tone="pink">{patient.phase}</Pill>}><p className="small">Screening → Diagnosis → Treatment → <b>{patient.phase}</b> → Long-term care</p><div className="progress"><span style={{ width: patient.id === 'maria' ? '74%' : '62%' }} /></div><p className="small muted top-gap">Current demo focus: navigation, wellness support and follow-up coordination.</p></Tile>
      <Tile span={4} title="Next follow-up"><div className="stat">{patient.appointment}</div><p className="small muted">Illustrative oncology visit · not linked to scheduling</p></Tile>
      <Tile span={4} title="Patient app"><p className="small muted">Preferred app language</p><b>{appLanguage}</b><div className="divider" /><p className="small muted">Saved or shared questions</p>{patientQuestions.length ? <ul className="compact-list">{patientQuestions.map((question, index) => <li key={`${question}-${index}`}>{question}</li>)}</ul> : <p className="small muted">No questions saved yet.</p>}</Tile>
      <Tile span={7} title="Needs & care gaps">{patient.needs.map((need) => <div className="patient-row" key={need}><span className="avatar">♡</span><div className="grow"><b>{need}</b><p className="small muted">Confirm preferences and next steps with the patient.</p></div><button className="btn" onClick={() => createTask({ patientId: patient.id, title: `Discuss ${need.toLowerCase()}`, source: 'Care plan', assignee: 'Navigator', dueDate: '', status: 'Open', outcome: '', shareWithPatient: false, patientMessage: '' })}>Create task</button></div>)}</Tile>
      <Tile span={5} hero title="Linked wearable signal" badge={<Pill tone="warn">Requires human review</Pill>}>
        <p className="small">Explainable rule based on the linked fatigue-study wearable record; not the C3 model.</p>
        {result.active ? <ul className="compact-list">{result.rules.map((rule) => <li key={rule}>{rule}</li>)}</ul> : <p className="small muted">No recent rule threshold crossed in this illustrative series.</p>}
        <p className="tiny muted">Recent data completeness: {result.completeness}% of steps, sleep and resting-heart-rate observations.</p>
        {linked && <p className="tiny muted">{linkedData.data?.about.caveat}</p>}
        <div className="page-tools top-gap"><button className="btn" onClick={() => openTab('Wearables')}>Understand trend</button><button className="btn primary" onClick={makeFollowup}>Create follow-up task</button></div>
        <div className="review-controls"><label className="small" htmlFor="review-note">Optional review note</label><input id="review-note" value={reviewNote} onChange={(event) => setReviewNote(event.target.value)} placeholder="What did the team review?" /><button className="btn" onClick={review}>Mark reviewed</button></div>
      </Tile>
      <Tile span={7} title="AI pre-visit summary" badge={<Pill tone={aiStatus?.enabled ? 'good' : 'neutral'}>{aiStatus?.enabled ? 'AI enabled' : 'AI not configured'}</Pill>}>
        <p className="small muted">Uses the source-labeled linked records and the fictional care context. Review before use.</p>
        <button className="btn primary" type="button" disabled={!aiStatus?.enabled || aiSummaryLoading} onClick={generateAiSummary}>
          {aiSummaryLoading ? 'Generating summary…' : 'Generate AI summary'}
        </button>
        {!aiStatus?.enabled && <p className="tiny muted">AI not configured</p>}
        {aiSummaryError && <p className="small error-text" role="alert">{aiSummaryError}</p>}
        {aiSummary && <pre className="ai-summary" aria-live="polite">{aiSummary}</pre>}
      </Tile>
      <Tile span={6} title="Coaching goals">{patient.goals.map((goal) => <p className="patient-row small" key={goal}>✓ &nbsp;{goal}</p>)}</Tile>
      <Tile span={6} title="Care tasks">{patientTasks.length ? patientTasks.slice(0, 3).map((task) => <div className="patient-row small" key={task.id}><span>{task.title}</span><Pill tone="pink">{task.source.startsWith('Patient app') ? 'Patient app' : task.source}</Pill><Pill tone={task.status === 'Done' ? 'good' : 'warn'}>{task.status}</Pill></div>) : <EmptyState>No patient-specific tasks yet.</EmptyState>}</Tile>
    </BentoGrid>}
    {tab === 'Wearables' && <BentoGrid>
      {linkedData.loading && <LoadingTile title="Linked fatigue-study record" />}
      {linkedData.error && <ErrorState message={linkedData.error} />}
      {linked && <Tile span={12} hero title="Linked study records · 28-day wearable activity & recovery" badge={<Pill tone="good">Real study record · Rao et al. 2023 · participant {linked.wearable.person_id}</Pill>}>
        <p className="small muted">Rao et al. 2023 studied people with lupus and Sjögren's syndrome, not a cancer cohort. These are observed patterns, not evidence of cause.</p>
        <div className="linked-wearable-grid">
          <section><h3>Daily steps</h3><p className="tiny muted">First 14 days' mean: {linkedNumber(result.baseline.steps, 0)} steps. Bad days are marked.</p><TrendChart data={days} lines={[{ key: 'steps', label: 'Steps' }, { key: 'badDaySteps', label: 'Bad day', color: '#c43c79', markersOnly: true }]} baseline={result.baseline.steps ?? undefined} formatValue={(value) => linkedNumber(value, 0)} /></section>
          <section><h3>Sleep</h3><p className="tiny muted">First 14 days' mean: {linkedNumber(result.baseline.sleepHours, 1)} hours.</p><TrendChart data={days} lines={[{ key: 'sleepHours', label: 'Sleep (hours)', color: '#7a4f9a' }]} baseline={result.baseline.sleepHours ?? undefined} formatValue={(value) => linkedNumber(value, 1)} /></section>
          <section><h3>Resting heart rate</h3><p className="tiny muted">First 14 days' mean: {linkedNumber(result.baseline.restingHR, 0)} bpm.</p>{days.some((day) => day.restingHR !== null) ? <TrendChart data={days} lines={[{ key: 'restingHR', label: 'Resting heart rate', color: '#e68b4b' }]} baseline={result.baseline.restingHR ?? undefined} formatValue={(value) => linkedNumber(value, 0)} /> : <p className="tiny muted">No resting-heart-rate readings were recorded in this 28-day study record.</p>}</section>
        </div>
        <div className="linked-signal"><b>Explainable trend review</b>{result.active ? <ul className="compact-list">{result.rules.map((rule) => <li key={rule}>{rule}</li>)}</ul> : <p className="small muted">No current demo rule threshold crossed.</p>}<p className="tiny muted">Data completeness (recent 14 days): {result.completeness}% · Requires human review.</p></div>
        <p className="tiny muted linked-caveat">{linkedData.data?.about.caveat}</p>
        <div className="page-tools top-gap"><button className="btn" onClick={review}>Mark reviewed</button><button className="btn primary" onClick={makeFollowup}>Create care-team task</button></div>
      </Tile>}
    </BentoGrid>}
    {tab === 'Lifestyle' && <BentoGrid>
      {linkedData.loading && <LoadingTile title="Linked NHANES exam record" />}
      {linkedData.error && <ErrorState message={linkedData.error} />}
      {linked && <Tile span={12} title="Labs & lifestyle · linked NHANES exam record" badge={<Pill tone="good">Real · NHANES {linked.nhanes.survey_years} · respondent {linked.nhanes.person_id}</Pill>}>
        {nhanesData.loading && <p className="small muted">Loading weighted survivor averages…</p>}
        {nhanesData.error && <p className="small error-text" role="alert">{nhanesData.error}</p>}
        <p className="small muted">Study observations shown beside the survey-weighted average among NHANES cancer survivors. These comparisons are descriptive, not causal or a personal target.</p>
        <div className="table-scroll"><table className="data-table"><thead><tr><th>Measure</th><th>Linked record</th><th>Weighted survivor average</th><th>Unit</th></tr></thead><tbody>
          {nhanesComparisons.map((row) => {
            const population = nhanesData.data?.all_ages.find((metric) => metric.metric === row.metric);
            return <tr key={row.metric}><td>{row.label}</td><td>{linkedNumber(row.value, row.digits)}</td><td>{linkedNumber(population?.survivors, row.digits)}</td><td>{population?.unit ?? ''}</td></tr>;
          })}
        </tbody></table></div>
        <p className="tiny muted">The NHANES figures are survey-weighted population estimates; individual records are not weighted averages.</p>
        <p className="tiny muted linked-caveat">{linkedData.data?.about.caveat}</p>
      </Tile>}
      <Tile span={7} title="Fictional demo context" badge={<Pill tone="pink">Illustrative notes</Pill>}>{patient.glucoseNotes.map((note) => <p className="patient-row" key={note}>{note}</p>)}</Tile>
      <Tile span={5} title="Lifestyle goals"><p className="small muted">These notes are illustrative personal context.</p>{patient.goals.map((goal) => <p className="patient-row" key={goal}>♡ &nbsp;{goal}</p>)}</Tile>
    </BentoGrid>}
    {tab === 'Coaching' && <BentoGrid>
      {linkedData.loading && <LoadingTile title="Linked synthetic coaching record" />}
      {linkedData.error && <ErrorState message={linkedData.error} />}
      {linked && <Tile span={12} title="Linked coaching program record" badge={<Pill tone="pink">Synthetic · Crane Lab coaching program · participant {linked.coaching.participant_id}</Pill>}>
        <div className="coaching-record-summary"><div><span className="tiny muted">Coach</span><b>{linked.coaching.coach_name ?? '—'}</b></div><div><span className="tiny muted">Program focus</span><b>{linked.coaching.program_focus ?? '—'}</b></div><div><span className="tiny muted">Goal completion</span><b>{linked.coaching.goal_met_rate === null ? '—' : `${Math.round(linked.coaching.goal_met_rate * 100)}%`}</b></div></div>
        <h3>Calls and supervisor ratings</h3>
        <div className="table-scroll"><table className="data-table"><thead><tr><th>Call</th><th>Week</th><th>Date</th><th>Goal topic</th><th>Minutes</th><th>Supervisor overall (mean)</th></tr></thead><tbody>
          {linked.coaching.calls.map((call) => <tr key={call.call_id}><td>{call.call_id} · #{call.call_number ?? '—'}</td><td>{call.program_week ?? '—'}</td><td>{call.date ?? '—'}</td><td>{call.goal_topic ? datasetFieldLabel(String(call.goal_topic)) : '—'}</td><td>{call.duration_min ?? '—'}</td><td>{linkedNumber(call.supervisor_overall, 1)}</td></tr>)}
        </tbody></table></div>
        <h3>Weekly goals</h3>
        <div className="table-scroll"><table className="data-table"><thead><tr><th>Week</th><th>Goal</th><th>Topic</th><th>Status</th></tr></thead><tbody>
          {linked.coaching.weekly_goals.map((goal, index) => <tr key={`${goal.week}-${goal.topic}-${index}`}><td>{goal.week ?? '—'}</td><td>{goal.goal ?? '—'}</td><td>{goal.topic ? datasetFieldLabel(String(goal.topic)) : '—'}</td><td>{goalStatus(goal.goal_met)}</td></tr>)}
        </tbody></table></div>
        <p className="tiny muted linked-caveat">{linkedData.data?.about.caveat}</p>
      </Tile>}
    </BentoGrid>}
    {tab === 'Care plan & tasks' && <BentoGrid><Tile span={8} title="Care plan & tasks">{patient.needs.map((need) => <p className="patient-row" key={need}>{need}</p>)}{patientTasks.map((task) => <p className="patient-row" key={task.id}>{task.title} · {task.status}</p>)}</Tile><Tile span={4} title="Ellie Care Loop">{(['detect', 'understand', 'review', 'act', 'followup'] as const).map((stage) => <p className="patient-row small" key={stage}><Pill tone={loop?.[stage] ? 'good' : 'neutral'}>{loop?.[stage] ? 'Done' : 'Next'}</Pill> &nbsp; {stage}</p>)}</Tile></BentoGrid>}
    {tab === 'Notes (internal)' && <BentoGrid><Tile span={12} title="Provider notes · internal only" badge={<Pill tone="warn">Not visible in patient view</Pill>}>{patient.notes.map((note) => <p className="patient-row" key={note}>{note}</p>)}</Tile></BentoGrid>}
  </>;
}
