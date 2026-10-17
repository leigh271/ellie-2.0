import type { FormEvent, ReactNode } from 'react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { elliePatients, maria } from '../data/ellieDemo';
import { companionReply } from '../lib/companion';
import { useDemoStore } from '../state/DemoStore';
import type { CareTask } from '../state/DemoStore';
import { BentoGrid, EmptyState, Pill, Stat, Tile, TrendChart } from '../components/UI';

function PageHeading({ eyebrow, title, subtitle, action }: { eyebrow: string; title: string; subtitle: string; action?: ReactNode }) {
  return <div className="heading"><div><div className="eyebrow">{eyebrow}</div><h1>{title}</h1><p className="muted">{subtitle}</p></div>{action}</div>;
}

const staff = ['Navigator', 'Health coach', 'RN', 'Survivorship coordinator'];
const sources = ['All sources', 'Care plan', 'Patient request', 'Patient app', 'Simulated Ellie', 'C3', 'C4', 'C5'];
const today = new Date().toISOString().slice(0, 10);

export function TasksPage() {
  const { state, createTask, setTaskStatus } = useDemoStore();
  const [patientFilter, setPatientFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sourceFilter, setSourceFilter] = useState('All sources');
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [patientId, setPatientId] = useState('maria');
  const [assignee, setAssignee] = useState('Navigator');
  const [dueDate, setDueDate] = useState('');
  const [share, setShare] = useState(false);
  const [message, setMessage] = useState('');
  const [outcomes, setOutcomes] = useState<Record<string, string>>({});
  const filtered = state.tasks.filter((task) => (patientFilter === 'all' || task.patientId === patientFilter)
    && (statusFilter === 'all' || task.status === statusFilter)
    && (sourceFilter === 'All sources' || task.source.toLowerCase().includes(sourceFilter.toLowerCase())));
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!title.trim()) return;
    createTask({ patientId, title: title.trim(), source: 'Care coordination', assignee, dueDate, status: 'Open', outcome: '', shareWithPatient: share && patientId !== 'unassigned', patientMessage: share && patientId !== 'unassigned' ? message : '' });
    setTitle(''); setShowForm(false); setShare(false); setMessage('');
  };
  const changeStatus = (task: CareTask, next: CareTask['status']) => {
    if (next === 'Done') {
      const outcome = outcomes[task.id]?.trim();
      if (!outcome) return;
      setTaskStatus(task.id, 'Done', outcome);
    } else setTaskStatus(task.id, next);
  };
  return <>
    <PageHeading eyebrow="Care coordination" title="Close the care loop." subtitle="A local worklist for the demo. No real messages, referrals or EHR updates are sent." action={<button className="btn primary" onClick={() => setShowForm((visible) => !visible)}>{showForm ? 'Cancel' : '＋ New task'}</button>} />
    {showForm && <Tile span={12} hero title="Create a follow-up task">
      <form className="task-form" onSubmit={submit}>
        <label>Task title<input required value={title} onChange={(event) => setTitle(event.target.value)} placeholder="What needs a follow-up?" /></label>
        <label>Patient / cohort<select value={patientId} onChange={(event) => setPatientId(event.target.value)}>{elliePatients.map((patient) => <option key={patient.id} value={patient.id}>{patient.name}</option>)}<option value="unassigned">Separate synthetic cohort / unassigned</option></select></label>
        <label>Assignee<select value={assignee} onChange={(event) => setAssignee(event.target.value)}>{staff.map((person) => <option key={person}>{person}</option>)}</select></label>
        <label>Due date<input type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} /></label>
        <label className="check-label"><input type="checkbox" checked={share} disabled={patientId === 'unassigned'} onChange={(event) => setShare(event.target.checked)} /> Share an update with patient</label>
        {share && <label className="wide-field">Patient-safe message<textarea value={message} onChange={(event) => setMessage(event.target.value)} placeholder="Write a clear, supportive update…" /></label>}
        <button className="btn primary" type="submit">Create task</button>
      </form>
    </Tile>}
    <div className="filter-row top-gap">
      <label>Patient<select value={patientFilter} onChange={(event) => setPatientFilter(event.target.value)}><option value="all">All patients</option>{elliePatients.map((patient) => <option key={patient.id} value={patient.id}>{patient.name}</option>)}<option value="unassigned">Separate cohort / unassigned</option></select></label>
      <label>Status<select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}><option value="all">All statuses</option><option>Open</option><option>In progress</option><option>Done</option></select></label>
      <label>Source<select value={sourceFilter} onChange={(event) => setSourceFilter(event.target.value)}>{sources.map((item) => <option key={item}>{item}</option>)}</select></label>
      <Pill tone="pink">{filtered.filter((task) => task.status !== 'Done').length} open tasks</Pill>
    </div>
    <BentoGrid className="top-gap">
      <Tile span={8} title="Follow-up worklist" badge={<Pill tone="pink">Persisted in this browser</Pill>}>
        {filtered.length ? filtered.map((task) => {
          const patient = elliePatients.find((item) => item.id === task.patientId);
          return <div className="task-card" key={task.id}>
            <div className="row between"><div className="grow"><b>{task.title}</b><p className="small muted">{patient?.name ?? 'Separate synthetic cohort / unassigned'}</p><Pill tone="pink">{task.source.startsWith('Patient app') ? 'Patient app' : task.source}</Pill></div><Pill tone={task.status === 'Done' ? 'good' : task.status === 'In progress' ? 'warn' : 'pink'}>{task.status}</Pill></div>
            {task.details && <p className="small"><b>Patient note:</b> {task.details}</p>}
            <div className="task-meta"><span>Assignee: <b>{task.assignee}</b></span><span>Due: <b>{task.dueDate || 'Not set'}</b></span>{task.shareWithPatient && <Pill tone="pink">Patient update shared</Pill>}</div>
            {task.shareWithPatient && <p className="tiny muted">“{task.patientMessage}”</p>}
            {task.status !== 'Done' && <div className="task-actions">
              {task.status === 'Open' && <button className="btn" onClick={() => changeStatus(task, 'In progress')}>Start work</button>}
              <label className="outcome-field">Document outcome to close<textarea rows={2} value={outcomes[task.id] ?? task.outcome} onChange={(event) => setOutcomes((previous) => ({ ...previous, [task.id]: event.target.value }))} placeholder="What happened and what is next?" /></label>
              <button className="btn primary" disabled={!(outcomes[task.id] ?? task.outcome).trim()} onClick={() => changeStatus(task, 'Done')}>Close task</button>
            </div>}
            {task.status === 'Done' && <p className="small outcome-note"><b>Outcome documented:</b> {task.outcome}</p>}
          </div>;
        }) : <EmptyState>No tasks match these filters. Create a follow-up to start the worklist.</EmptyState>}
      </Tile>
      <Tile span={4} hero title="Human-led care"><p className="small muted">Ellie organizes observations and proposed next steps. Authorized staff decide how to respond and document an outcome before closing a task.</p><div className="divider" /><p className="small">Shared patient updates are demo-only. A patient check-in is visible to the care team in this local workspace.</p><p className="tiny muted top-gap">Today: {today}</p></Tile>
    </BentoGrid>
  </>;
}

type Resource = { id: string; category: string; title: string; description: string; audience: string };
const resources: Resource[] = [
  { id: 'transport', category: 'Transportation', title: 'Ride planning checklist', description: 'Questions to ask about local non-emergency rides and appointment planning.', audience: 'Navigator' },
  { id: 'financial', category: 'Financial navigation', title: 'Financial support conversation guide', description: 'A gentle prompt list for discussing costs and finding a financial navigator.', audience: 'Care team' },
  { id: 'peer', category: 'Emotional & peer support', title: 'Peer support options', description: 'Explore one-to-one peer programs and group support preferences.', audience: 'Patient' },
  { id: 'nutrition', category: 'Nutrition', title: 'Survivorship nutrition basics', description: 'A plain-language education handout to review with a registered dietitian.', audience: 'Patient' },
  { id: 'exercise', category: 'Exercise oncology', title: 'Movement conversation starter', description: 'Questions for a care team about safe, personalized movement support.', audience: 'Care team' },
  { id: 'education', category: 'Survivorship education', title: 'Preparing for survivorship visits', description: 'A checklist for questions, goals and follow-up planning.', audience: 'Patient' },
];

export function ResourcesPage() {
  const { state, update, log } = useDemoStore();
  const [query, setQuery] = useState('');
  const visible = resources.filter((item) => `${item.title} ${item.category} ${item.description}`.toLowerCase().includes(query.toLowerCase()));
  const shared = state.sharedResources.maria ?? [];
  const share = (resource: Resource) => {
    if (shared.includes(resource.id)) return;
    update((previous) => ({ ...previous, sharedResources: { ...previous.sharedResources, maria: [...(previous.sharedResources.maria ?? []), resource.id] } }));
    log('Resource shared', 'maria', `${resource.title} shared with Maria`);
  };
  return <>
    <PageHeading eyebrow="Resource navigation" title="Connect support to the plan." subtitle="Curated fictional demo resources for navigation and survivorship conversations." />
    <div className="page-tools"><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search resources" aria-label="Search resources" /></div>
    <BentoGrid className="top-gap">
      {visible.map((resource) => <Tile span={4} key={resource.id} title={resource.title} badge={<Pill tone="pink">{resource.category}</Pill>}>
        <p className="small muted">{resource.description}</p><div className="row between top-gap"><span className="tiny muted">Audience: {resource.audience}</span><button className="btn primary" onClick={() => share(resource)} disabled={shared.includes(resource.id)}>{shared.includes(resource.id) ? 'Shared with Maria' : 'Share with patient'}</button></div>
      </Tile>)}
      {!visible.length && <Tile span={12}><EmptyState>No resources match that search.</EmptyState></Tile>}
      <Tile span={12} title="Patient support list" badge={<Pill tone="pink">Maria</Pill>}>{shared.length ? shared.map((id) => <p className="patient-row" key={id}>{resources.find((resource) => resource.id === id)?.title}</p>) : <EmptyState>No resources have been shared yet.</EmptyState>}</Tile>
    </BentoGrid>
  </>;
}

export function ActivityPage() {
  const { state } = useDemoStore();
  const [typeFilter, setTypeFilter] = useState('all');
  const types = [...new Set(state.activity.map((item) => item.type))];
  const activity = state.activity.filter((item) => typeFilter === 'all' || item.type === typeFilter).sort((a, b) => b.at.localeCompare(a.at));
  const stats = {
    created: state.activity.filter((item) => item.type === 'Task created').length,
    closed: state.activity.filter((item) => item.type === 'Task closed').length,
    outcomes: state.tasks.filter((task) => task.status === 'Done' && Boolean(task.outcome)).length,
    loops: Object.values(state.careLoops).filter((loop) => Boolean(loop.followup)).length,
    reviews: state.activity.filter((item) => item.type === 'Supervisor review' && /Approved|Escalated/.test(item.message)).length,
  };
  const exportCsv = () => {
    const esc = (value: string) => `"${value.replaceAll('"', '""')}"`;
    const csv = ['timestamp,type,patient,message', ...activity.map((item) => [item.at, item.type, item.patientId, item.message].map(esc).join(','))].join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a'); link.href = url; link.download = 'ellie-activity.csv'; link.click(); URL.revokeObjectURL(url);
  };
  return <>
    <PageHeading eyebrow="Activity & reports" title="A clear record of demo actions." subtitle="Chronological local activity log. Export contains only this fictional browser demo." action={<button className="btn primary" onClick={exportCsv}>Export CSV</button>} />
    <BentoGrid>
      {[
        ['Tasks created', stats.created], ['Tasks closed', stats.closed], ['Outcomes documented', stats.outcomes], ['Loop completions', stats.loops], ['Supervisor reviews', stats.reviews],
      ].map(([label, value]) => <Tile span={Math.floor(12 / 5)} key={label as string}><Stat label={label as string} value={value} /></Tile>)}
      <Tile span={12} title="Activity log" actions={<label className="small">Filter <select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)}><option value="all">All activity</option>{types.map((type) => <option key={type}>{type}</option>)}</select></label>}>
        {activity.length ? activity.map((item) => <div className="patient-row" key={item.id}><span className="activity-mark">✦</span><div className="grow"><b>{item.message}</b><p className="small muted">{item.type} · {item.patientId === 'unassigned' ? 'Separate synthetic cohort' : elliePatients.find((patient) => patient.id === item.patientId)?.name ?? item.patientId}</p></div><time className="tiny muted">{new Date(item.at).toLocaleString()}</time></div>) : <EmptyState>No activity has been logged yet.</EmptyState>}
      </Tile>
    </BentoGrid>
  </>;
}

type ChatMessage = { role: 'user' | 'assistant'; text: string };
export function PatientView() {
  const { state, update } = useDemoStore();
  const [note, setNote] = useState('');
  const [energy, setEnergy] = useState<'Good' | 'Okay' | 'Low' | ''>('');
  const [messages, setMessages] = useState<ChatMessage[]>([{ role: 'assistant', text: 'Hi Maria, I’m here to help you prepare questions for your care team and explore support options. What would feel helpful today?' }]);
  const [chatText, setChatText] = useState('');
  const recent = maria.wearable.slice(-14);
  const activity = recent.map((day) => ({ ...day, baseline: null }));
  const sharedMessages = state.tasks.filter((task) => task.patientId === 'maria' && task.shareWithPatient && task.patientMessage);
  const sharedResources = (state.sharedResources.maria ?? []).map((id) => id);
  const checkIn = () => {
    if (!energy) return;
    const record = { id: crypto.randomUUID(), patientId: 'maria', energy, note: note.trim(), at: new Date().toISOString() };
    update((previous) => {
      const existing = previous.careLoops.maria ?? { detect: null, understand: null, review: null, act: null, followup: null };
      return {
        ...previous,
        checkIns: [record, ...previous.checkIns],
        careLoops: energy === 'Low' ? { ...previous.careLoops, maria: { ...existing, detect: existing.detect ?? record.at } } : previous.careLoops,
        activity: [{ id: crypto.randomUUID(), at: record.at, type: 'Patient check-in', patientId: 'maria', message: `Maria shared a ${energy.toLowerCase()} energy check-in${note.trim() ? ' with a note' : ''}` }, ...previous.activity],
      };
    });
    setEnergy(''); setNote('');
  };
  const send = (event: FormEvent) => {
    event.preventDefault();
    const text = chatText.trim();
    if (!text) return;
    setMessages((previous) => [...previous, { role: 'user', text }, { role: 'assistant', text: companionReply(text) }]);
    setChatText('');
  };
  const acknowledge = (taskId: string) => update((previous) => ({ ...previous, patientReplies: { ...previous.patientReplies, [taskId]: 'Maria acknowledged this care-team update.' } }));
  const latest = state.checkIns.find((checkin) => checkin.patientId === 'maria' || !checkin.patientId);
  return <>
    <div className="heading"><div><div className="eyebrow">My wellness journey</div><h1>Welcome back, Maria.</h1><p className="muted">Support for your recovery, one step at a time.</p></div><Pill tone="pink">Survivorship</Pill></div>
    <BentoGrid className="patient-surface">
      <Tile span={12} hero title="Open the Ellie patient app"><p className="small">Read or listen to plain-language diagnosis information, explore support, and send questions to your care team.</p><Link className="btn primary top-gap" to="/app">Open the Ellie patient app →</Link></Tile>
      <Tile span={8} hero title="Your care journey" badge={<Pill tone="pink">Recovery & survivorship</Pill>}><p className="small">You are in the recovery and survivorship phase of this fictional care journey. Ellie can help you stay connected to your care team.</p><div className="progress"><span style={{ width: '74%' }} /></div><p className="tiny muted top-gap">Screening → Diagnosis → Treatment → You are here → Long-term care</p></Tile>
      <Tile span={4} title="Next appointment"><div className="stat">{maria.appointment}</div><p className="small muted">Illustrative oncology follow-up</p></Tile>
      <Tile span={6} title="My wellness check-in" badge={<Pill tone="pink">Shared with your care team</Pill>}>
        <p className="small muted">How has your energy been today?</p><div className="page-tools top-gap">{(['Good', 'Okay', 'Low'] as const).map((option) => <button key={option} className={`btn ${energy === option ? 'selected-button' : ''}`} onClick={() => setEnergy(option)}>{option}</button>)}</div>
        <label className="field-label" htmlFor="checkin-note">Optional symptoms or note</label><textarea id="checkin-note" rows={2} value={note} onChange={(event) => setNote(event.target.value)} placeholder="Anything you would like the team to know?" />
        <button className="btn primary top-gap" onClick={checkIn} disabled={!energy}>Share check-in</button>
        <p className="tiny muted top-gap">{latest ? `Last check-in: ${latest.energy} · ${new Date(latest.at).toLocaleString()}` : 'No check-in recorded yet.'}</p>
      </Tile>
      <Tile span={6} hero title="Ellie AI companion" badge={<Pill tone="warn">Demo assistant · not medical advice</Pill>}>
        <div className="chat-box" aria-live="polite">{messages.map((message, index) => <div key={`${message.role}-${index}`} className={`chat-bubble ${message.role}`}>{message.text}</div>)}</div>
        <form className="chat-compose" onSubmit={send}><input value={chatText} onChange={(event) => setChatText(event.target.value)} placeholder="Ask about preparing questions or support…" aria-label="Message Ellie" /><button className="btn primary">Send</button></form>
        <p className="tiny muted top-gap">For urgent symptoms such as chest pain, fever, bleeding, trouble breathing or suicidal thoughts, contact your care team or call 911 now.</p>
      </Tile>
      <Tile span={6} title="My activity & sleep" badge={<Pill tone="pink">Simulated trends · no risk scores</Pill>}><p className="small muted">Daily steps</p><TrendChart data={activity} lines={[{ key: 'steps', label: 'Steps' }]} height={200} /><p className="small muted">Sleep (hours)</p><TrendChart data={activity} lines={[{ key: 'sleepHours', label: 'Sleep · hours', color: '#82559a' }]} height={180} /><p className="tiny muted">These are illustrative personal patterns and are not medical advice.</p></Tile>
      <Tile span={6} title="Food, movement & goals"><p className="small muted">Gentle ideas to discuss with your care team. These are not promises about glucose or health outcomes.</p>{maria.glucoseNotes.slice(0, 2).map((item) => <p className="patient-row small" key={item}>♡ &nbsp;{item}</p>)}<div className="divider" />{maria.goals.map((goal) => <p className="patient-row small" key={goal}>☑ &nbsp;{goal}</p>)}</Tile>
      <Tile span={6} title="Updates from your care team" badge={<Pill tone="pink">Only updates shared with you</Pill>}>
        {sharedMessages.length ? sharedMessages.map((task) => <div className="update-card" key={task.id}><p>{task.patientMessage}</p>{state.patientReplies[task.id] ? <Pill tone="good">You replied</Pill> : <button className="btn" onClick={() => acknowledge(task.id)}>I received this</button>}</div>) : <EmptyState>No updates have been shared with you yet.</EmptyState>}
      </Tile>
      <Tile span={6} title="Support resources shared with you">{sharedResources.length ? sharedResources.map((id) => <p className="patient-row" key={id}>{supportName(id)}</p>) : <EmptyState>Your care team has not shared resources yet.</EmptyState>}</Tile>
    </BentoGrid>
  </>;
}

function supportName(id: string) {
  const names: Record<string, string> = { transport: 'Ride planning checklist', financial: 'Financial support conversation guide', peer: 'Peer support options', nutrition: 'Survivorship nutrition basics', exercise: 'Movement conversation starter', education: 'Preparing for survivorship visits' };
  return names[id] ?? id;
}
