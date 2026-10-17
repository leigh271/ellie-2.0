import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { elliePatients } from '../../data/ellieDemo';
import { formatDatasetNumber, useDataset } from '../../data/datasets';
import type { PatientLinksDataset } from '../../data/patientLinks';
import { useDemoStore } from '../../state/DemoStore';
import type { CheckIn } from '../../state/DemoStore';
import { AppCard, Composer, Icon } from '../components';
import type { IconName } from '../components';
import { useLanguage } from '../useLanguage';
import { usePreferredName } from '../usePreferredName';
import { useVoiceInput } from '../useSpeech';

function average(values: Array<number | null>): number | null {
  const present = values.filter((value): value is number => value !== null);
  return present.length ? present.reduce((sum, value) => sum + value, 0) / present.length : null;
}

function substitute(template: string, values: Record<string, string>): string {
  return Object.entries(values).reduce((text, [key, value]) => text.replaceAll(`{${key}}`, value), template);
}

function comparisonMessage(change: number, messages: ReturnType<typeof useLanguage>['messages']): string {
  if (Math.abs(change) <= 5) return messages.activityChangeSame;
  const template = change < 0 ? messages.activityChangeLower : messages.activityChangeHigher;
  return substitute(template, { change: formatDatasetNumber(Math.abs(change), 0) });
}

function patientGoalStatus(value: string | number | null, messages: ReturnType<typeof useLanguage>['messages']): string {
  const normalized = String(value ?? '').trim().toLowerCase();
  if (['yes', '1', 'true', 'met'].includes(normalized)) return messages.coachingGoalMet;
  if (['partial', 'partly', 'partially'].includes(normalized)) return messages.coachingGoalPartly;
  return messages.coachingGoalNotYet;
}

export default function PatientAppHome() {
  const { state, update, createTask, setPatientId } = useDemoStore();
  const { language, messages } = useLanguage();
  const patient = elliePatients.find((item) => item.id === state.patientId) ?? elliePatients[0];
  const linkedData = useDataset<PatientLinksDataset>('patient_links.json');
  const linked = linkedData.data?.patients[patient.id];
  const questions = state.patientQuestions[patient.id] ?? [];
  const checkIns = state.checkIns.filter((checkin) => checkin.patientId === patient.id || (patient.id === 'maria' && !checkin.patientId));
  const latest = checkIns[0];
  const [energy, setEnergy] = useState<CheckIn['energy'] | ''>('');
  const [note, setNote] = useState('');
  const [questionsShared, setQuestionsShared] = useState(false);
  const [draft, setDraft] = useState('');
  const navigate = useNavigate();
  const [preferredName] = usePreferredName(patient.id);
  const supportLine = messages.heroSupportName.replace('{name}', preferredName || patient.name.split(' ')[0]);
  const ask = (text: string) => navigate(`/app/ask?q=${encodeURIComponent(text)}`);
  const voice = useVoiceInput(language, ask);
  const energyLabels: Record<CheckIn['energy'], string> = {
    Good: messages.energyGood,
    Okay: messages.energyOkay,
    Low: messages.energyLow,
  };
  const recordCheckIn = () => {
    if (!energy) return;
    const at = new Date().toISOString();
    const checkin: CheckIn = { id: crypto.randomUUID(), patientId: patient.id, energy, note: note.trim(), at };
    update((previous) => {
      const loop = previous.careLoops[patient.id] ?? { detect: null, understand: null, review: null, act: null, followup: null };
      return {
        ...previous,
        checkIns: [checkin, ...previous.checkIns],
        careLoops: energy === 'Low' && !loop.detect ? { ...previous.careLoops, [patient.id]: { ...loop, detect: at } } : previous.careLoops,
        activity: [{ id: crypto.randomUUID(), at, type: 'Patient app check-in', patientId: patient.id, message: `${patient.name} shared a ${energy.toLowerCase()} energy check-in${note.trim() ? ' with a note' : ''}` }, ...previous.activity],
      };
    });
    setEnergy('');
    setNote('');
  };
  const removeQuestion = (index: number) => update((previous) => ({
    ...previous,
    patientQuestions: { ...previous.patientQuestions, [patient.id]: (previous.patientQuestions[patient.id] ?? []).filter((_, itemIndex) => itemIndex !== index) },
  }));
  const shareQuestions = () => {
    if (!questions.length) return;
    createTask({
      patientId: patient.id,
      title: 'Patient questions for next visit',
      source: 'Patient app',
      assignee: 'Navigator',
      dueDate: '',
      status: 'Open',
      outcome: '',
      shareWithPatient: false,
      patientMessage: '',
      details: questions.map((question) => `• ${question}`).join('\n'),
    });
    setQuestionsShared(true);
  };
  const topics: { to: string; icon: IconName; label: string }[] = [
    { to: '/app/diagnosis', icon: 'heart', label: messages.diagnosisTab },
    { to: '/app/help', icon: 'lifebuoy', label: messages.helpTab },
    { to: '/app/ask', icon: 'chat', label: messages.askTab },
    { to: '/app/updates', icon: 'bell', label: messages.updatesTab },
  ];
  const checkinText = `${messages.checkinQuestion} ${messages.energyGood}, ${messages.energyOkay}, ${messages.energyLow}.`;
  const series = linked?.wearable.series ?? [];
  const usualSteps = average(series.slice(0, 14).map((row) => row.steps));
  const recentSteps = average(series.slice(14).map((row) => row.steps));
  const usualSleep = average(series.slice(0, 14).map((row) => row.sleep_minutes === null ? null : row.sleep_minutes / 60));
  const recentSleep = average(series.slice(14).map((row) => row.sleep_minutes === null ? null : row.sleep_minutes / 60));
  const activityText = linked ? [
    substitute(messages.recentActivitySteps, {
      recent: recentSteps === null ? '—' : formatDatasetNumber(recentSteps, 0),
      usual: usualSteps === null ? '—' : formatDatasetNumber(usualSteps, 0),
    }),
    comparisonMessage(usualSteps && recentSteps !== null ? ((recentSteps - usualSteps) / usualSteps) * 100 : 0, messages),
    substitute(messages.recentActivitySleep, {
      recent: recentSleep === null ? '—' : formatDatasetNumber(recentSleep, 1),
      usual: usualSleep === null ? '—' : formatDatasetNumber(usualSleep, 1),
    }),
    comparisonMessage(usualSleep && recentSleep !== null ? ((recentSleep - usualSleep) / usualSleep) * 100 : 0, messages),
  ].join(' ') : '';
  const recentGoals = [...(linked?.coaching.weekly_goals ?? [])].sort((a, b) => Number(b.week) - Number(a.week)).slice(0, 4);
  const goalLabel = (goal?: string | number | null) => { const text = goal == null ? '' : String(goal); return text ? text.charAt(0).toUpperCase() + text.slice(1) : '—'; };
  const coachingText = recentGoals.map((goal) => `${goalLabel(goal.goal)}: ${patientGoalStatus(goal.goal_met, messages)}`).join('. ');
  const wearableSource = linked ? substitute(messages.linkedWearableSource, { id: String(linked.wearable.person_id) }) : '';
  const coachingSource = linked ? substitute(messages.linkedCoachingSource, { id: linked.coaching.participant_id }) : '';

  return <div className="patient-app-screen">
    <section className="ellie-hero" data-speech-text={`${messages.heroHi} Ellie. ${supportLine}`}>
      <p className="ellie-kicker">{messages.heroKicker}</p>
      <h1>{messages.heroHi} <span>Ellie.</span></h1>
      <p className="ellie-subtitle">{supportLine}</p>
      <button type="button" className={`voice-halo ${voice.listening ? 'is-listening' : ''}`} style={{ transform: voice.listening ? `scale(${1 + voice.level * 0.05})` : undefined }} aria-pressed={voice.listening} aria-label={voice.listening ? messages.listeningTap : messages.tapToTalk} onClick={voice.supported ? voice.toggle : () => document.getElementById('patient-app-home-input')?.focus()}>
        <span className="voice-core"><Icon name={voice.listening ? 'stop' : 'mic'} size={42} /></span>
      </button>
      <div className="voice-status" aria-live="polite">{voice.listening ? <><span className="live-dot" />{messages.listeningTap}</> : voice.supported ? messages.tapToTalk : messages.voiceUnavailable}</div>
      {voice.listening && <div className="waveform" aria-hidden="true">{Array.from({ length: 11 }, (_, index) => <span key={index} style={{ height: `${Math.max(4, Math.round(voice.level * (18 + 20 * Math.abs(Math.sin(index)) )))}px` }} />)}</div>}
      <p className="ellie-typing-hint">{messages.typeHint}</p>
      <Composer value={draft} onChange={setDraft} onSubmit={ask} language={language} placeholder={messages.askPlaceholder} inputId="patient-app-home-input" />
      <p className="explore-label">{messages.exploreTopic}</p>
      <div className="topic-grid">{topics.map((topic) => <Link key={topic.to} to={topic.to} className="topic-tile"><Icon name={topic.icon} size={18} />{topic.label}</Link>)}</div>
    </section>
    <AppCard title={messages.demoPatient} text={`${messages.demoPatient}: ${patient.name}. ${messages.diagnosis}: ${patient.diagnosis}. ${messages.phase}: ${patient.phase}.`} language={language} className="patient-app-welcome-card">
      <label className="patient-app-field">{messages.demoPatient}
        <select value={patient.id} onChange={(event) => setPatientId(event.target.value)} aria-label={messages.demoPatient}>
          {elliePatients.map((choice) => <option key={choice.id} value={choice.id}>{choice.name}</option>)}
        </select>
      </label>
      <p className="patient-app-info-line"><b>{messages.diagnosis}:</b> {patient.diagnosis}</p>
      <p className="patient-app-info-line"><b>{messages.phase}:</b> {patient.phase}</p>
      <p className="patient-app-info-line"><b>{messages.nextAppointment}:</b> {patient.appointment}</p>
      <p className="patient-app-caption">{messages.appointmentNote}</p>
    </AppCard>
    {linked && <AppCard title={messages.recentActivityHeading} text={`${activityText} ${wearableSource} ${messages.linkedRecordCaveat}`} language={language} className="patient-app-linked-activity">
      <p className="patient-app-caption">{messages.recentActivitySub}</p>
      <p className="patient-app-linked-metric">{substitute(messages.recentActivitySteps, {
        recent: recentSteps === null ? '—' : formatDatasetNumber(recentSteps, 0),
        usual: usualSteps === null ? '—' : formatDatasetNumber(usualSteps, 0),
      })}</p>
      <p className="patient-app-small-comparison">{comparisonMessage(usualSteps && recentSteps !== null ? ((recentSteps - usualSteps) / usualSteps) * 100 : 0, messages)}</p>
      <p className="patient-app-linked-metric">{substitute(messages.recentActivitySleep, {
        recent: recentSleep === null ? '—' : formatDatasetNumber(recentSleep, 1),
        usual: usualSleep === null ? '—' : formatDatasetNumber(usualSleep, 1),
      })}</p>
      <p className="patient-app-small-comparison">{comparisonMessage(usualSleep && recentSleep !== null ? ((recentSleep - usualSleep) / usualSleep) * 100 : 0, messages)}</p>
      <p className="patient-app-caption">{wearableSource}</p>
      <p className="patient-app-caption">{messages.linkedRecordCaveat}</p>
    </AppCard>}
    {linked && <AppCard title={messages.coachingGoalsHeading} text={`${coachingText} ${coachingSource} ${messages.linkedRecordCaveat}`} language={language} className="patient-app-coaching-goals">
      {recentGoals.map((goal, index) => <div className="patient-app-goal-row" key={`${goal.week}-${goal.topic}-${index}`}>
        <span>{goalLabel(goal.goal)}</span><span className="patient-app-status">{patientGoalStatus(goal.goal_met, messages)}</span>
      </div>)}
      <p className="patient-app-caption">{coachingSource}</p>
      <p className="patient-app-caption">{messages.linkedRecordCaveat}</p>
    </AppCard>}
    <AppCard title={messages.wellnessCheckin} text={checkinText} language={language}>
      <p className="patient-app-prompt">{messages.checkinQuestion}</p>
      <div className="patient-app-energy-options" role="group" aria-label={messages.checkinQuestion}>
        {(['Good', 'Okay', 'Low'] as const).map((option) => <button type="button" key={option} className={`patient-app-choice ${energy === option ? 'selected' : ''}`} aria-pressed={energy === option} onClick={() => setEnergy(option)}>{energyLabels[option]}</button>)}
      </div>
      <label className="patient-app-field">{messages.optionalNote}
        <textarea rows={2} value={note} onChange={(event) => setNote(event.target.value)} placeholder={messages.checkinPlaceholder} />
      </label>
      <button type="button" className="patient-app-primary" disabled={!energy} onClick={recordCheckIn}>{messages.shareCheckin}</button>
      {latest && <p className="patient-app-caption">{messages.lastCheckin}: {energyLabels[latest.energy]} · {new Date(latest.at).toLocaleDateString(language === 'en' ? 'en-US' : language === 'es' ? 'es-US' : 'fr')}</p>}
    </AppCard>
    <AppCard title={messages.questionsTitle} text={`${messages.questionsTitle}. ${questions.join('. ')}`} language={language}>
      {questions.length ? <ul className="patient-app-question-list">{questions.map((question, index) => <li key={`${question}-${index}`}><span>{question}</span><button type="button" className="patient-app-text-button" aria-label={`${messages.questionRemoved}: ${question}`} onClick={() => removeQuestion(index)}>×</button></li>)}</ul> : <p className="patient-app-empty">{messages.noQuestions}</p>}
      {questions.length > 0 && <button type="button" className="patient-app-secondary" onClick={shareQuestions} disabled={questionsShared}>{messages.shareQuestions}</button>}
      {questionsShared && <p className="patient-app-success" role="status" aria-live="polite">{messages.questionsShared}</p>}
    </AppCard>
  </div>;
}
