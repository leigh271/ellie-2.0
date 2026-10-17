import { useState } from 'react';
import { Link } from 'react-router-dom';
import { elliePatients } from '../../data/ellieDemo';
import { useDemoStore } from '../../state/DemoStore';
import type { CheckIn } from '../../state/DemoStore';
import { AppCard, PageHeading } from '../components';
import { useLanguage } from '../useLanguage';

export default function PatientAppHome() {
  const { state, update, createTask, setPatientId } = useDemoStore();
  const { language, messages } = useLanguage();
  const patient = elliePatients.find((item) => item.id === state.patientId) ?? elliePatients[0];
  const questions = state.patientQuestions[patient.id] ?? [];
  const checkIns = state.checkIns.filter((checkin) => checkin.patientId === patient.id || (patient.id === 'maria' && !checkin.patientId));
  const latest = checkIns[0];
  const [energy, setEnergy] = useState<CheckIn['energy'] | ''>('');
  const [note, setNote] = useState('');
  const [questionsShared, setQuestionsShared] = useState(false);
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
  const quickActions = [
    { to: '/app/diagnosis', icon: '♡', label: messages.diagnosisTab },
    { to: '/app/help', icon: '✚', label: messages.helpTab },
    { to: '/app/ask', icon: '✦', label: messages.askTab },
    { to: '/app/updates', icon: '▤', label: messages.updatesTab },
  ];
  const checkinText = `${messages.checkinQuestion} ${messages.energyGood}, ${messages.energyOkay}, ${messages.energyLow}.`;

  return <div className="patient-app-screen">
    <PageHeading title={`${messages.homeWelcome}, ${patient.name.split(' ')[0]}.`} subtitle={messages.homeSubtitle} language={language} />
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
    <AppCard title={messages.quickActions} text={messages.quickActions} language={language}>
      <div className="patient-app-quick-actions">{quickActions.map((action) => <Link to={action.to} key={action.to} className="patient-app-quick-link"><span aria-hidden="true">{action.icon}</span>{action.label}<span aria-hidden="true">→</span></Link>)}</div>
    </AppCard>
    <AppCard title={messages.questionsTitle} text={`${messages.questionsTitle}. ${questions.join('. ')}`} language={language}>
      {questions.length ? <ul className="patient-app-question-list">{questions.map((question, index) => <li key={`${question}-${index}`}><span>{question}</span><button type="button" className="patient-app-text-button" aria-label={`${messages.questionRemoved}: ${question}`} onClick={() => removeQuestion(index)}>×</button></li>)}</ul> : <p className="patient-app-empty">{messages.noQuestions}</p>}
      {questions.length > 0 && <button type="button" className="patient-app-secondary" onClick={shareQuestions} disabled={questionsShared}>{messages.shareQuestions}</button>}
      {questionsShared && <p className="patient-app-success" role="status" aria-live="polite">{messages.questionsShared}</p>}
    </AppCard>
  </div>;
}
