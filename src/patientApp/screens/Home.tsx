import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { elliePatients } from '../../data/ellieDemo';
import { useDemoStore } from '../../state/DemoStore';
import type { CheckIn } from '../../state/DemoStore';
import { AppCard, Composer, Icon } from '../components';
import type { IconName } from '../components';
import { useLanguage } from '../useLanguage';
import { usePreferredName } from '../usePreferredName';
import { useVoiceInput } from '../useSpeech';

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

  return <div className="patient-app-screen">
    <section className="ellie-hero" data-speech-text={`${messages.heroHi} Ellie. ${supportLine}`}>
      <p className="ellie-kicker">{messages.heroKicker}</p>
      <h1>{messages.heroHi} <span>Ellie.</span></h1>
      <p className="ellie-subtitle">{supportLine}</p>
      <button type="button" className={`voice-halo ${voice.listening ? 'is-listening' : ''}`} aria-pressed={voice.listening} aria-label={voice.listening ? messages.listeningTap : messages.tapToTalk} onClick={voice.supported ? voice.toggle : () => document.getElementById('patient-app-home-input')?.focus()}>
        <span className="voice-core"><Icon name={voice.listening ? 'stop' : 'mic'} size={42} /></span>
      </button>
      <div className="voice-status" aria-live="polite">{voice.listening ? <><span className="live-dot" />{messages.listeningTap}</> : voice.supported ? messages.tapToTalk : messages.voiceUnavailable}</div>
      {voice.listening && <div className="waveform" aria-hidden="true">{Array.from({ length: 11 }, (_, index) => <span key={index} />)}</div>}
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
