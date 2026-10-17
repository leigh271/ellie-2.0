import { useEffect, useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { elliePatients } from '../data/ellieDemo';
import { useDemoStore } from '../state/DemoStore';
import type { PatientLanguage } from '../state/DemoStore';
import { Icon } from './components';
import { getMessages } from './i18n';
import { useLanguage } from './useLanguage';
import { hasBeenWelcomed, markWelcomed, usePreferredName } from './usePreferredName';
import { SpeakButton, SpeechProvider, useSpeech } from './useSpeech';
import type { SpeechRate } from './useSpeech';

const NATIVE_LANGUAGE_NAMES: Record<PatientLanguage, string> = { en: 'English', es: 'Español', ht: 'Kreyòl ayisyen' };
export default function PatientAppLayout({ children }: { children: ReactNode }) {
  return <SpeechProvider><PatientAppFrame>{children}</PatientAppFrame></SpeechProvider>;
}

function PatientAppFrame({ children }: { children: ReactNode }) {
  const { state, setPatientId, setRole } = useDemoStore();
  const { language, messages, setLanguage } = useLanguage();
  const { rate, setRate, notice, stop, speakingId, paused, togglePause } = useSpeech();
  const navigate = useNavigate();
  const location = useLocation();
  const patient = elliePatients.find((item) => item.id === state.patientId) ?? elliePatients[0];
  const [preferredName, setPreferredName] = usePreferredName(patient.id);
  const [onboardingStep, setOnboardingStep] = useState<0 | 1 | 2>(() => hasBeenWelcomed() ? 0 : 1);
  const [menuOpen, setMenuOpen] = useState(false);
  const [nameDraft, setNameDraft] = useState(preferredName);
  const unreadCount = state.tasks.filter((task) => task.patientId === patient.id && task.shareWithPatient && task.patientMessage.trim() && !state.patientReplies[task.id]).length;
  const onHome = location.pathname === '/app';

  useEffect(() => setNameDraft(preferredName), [preferredName]);
  useEffect(() => {
    if (onboardingStep !== 1) return;
    const timer = window.setTimeout(() => setOnboardingStep(2), 900);
    return () => window.clearTimeout(timer);
  }, [onboardingStep]);
  useEffect(() => {
    if (!menuOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === 'Escape') setMenuOpen(false); };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [menuOpen]);

  const finishWelcome = (name?: string) => {
    if (name !== undefined) setPreferredName(name);
    markWelcomed();
    setOnboardingStep(0);
  };
  const switchToProvider = () => {
    stop();
    setMenuOpen(false);
    setRole('provider');
    navigate('/');
  };

  return (
    <div className="patient-app-root">
      {onboardingStep === 1 ? <div className="patient-app-splash" aria-label="Ellie">
        <span>Ellie<span>.</span></span>
      </div> : onboardingStep === 2 ? <Onboarding
        initialName={preferredName}
        onContinue={finishWelcome}
        onSkip={() => finishWelcome()}
      /> : <div className="patient-app">
        <header className="patient-app-header">
          <div className={`patient-app-header-row ${onHome ? '' : 'has-back'}`}>
            {!onHome && <button type="button" className="patient-app-back-button" onClick={() => navigate('/app')} aria-label={messages.backHome}>←</button>}
            <button type="button" className="ellie-logo" onClick={() => navigate('/app')} aria-label="Ellie home">Ellie<span>.</span></button>
            <div className="patient-app-header-note"><Icon name="sparkles" size={15} /><span>{messages.headerNextStep}</span></div>
            <button type="button" className="patient-app-settings-button" onClick={() => setMenuOpen(true)} aria-label={messages.profileSettings}><Icon name="settings" size={19} /></button>
          </div>
        </header>
        {notice && <div className="patient-app-toast" role="status" aria-live="polite">{notice}<SpeakButton text={notice} language={language} /></div>}
        <main className={`patient-app-main ${onHome ? 'patient-app-main-home' : ''}`}>{children}</main>
        {speakingId && <div className="patient-app-now-reading" role="status" aria-live="polite">
          <strong>{messages.nowReading}</strong>
          <div className="patient-app-now-reading-wave" aria-hidden="true">{Array.from({ length: 7 }, (_, index) => <span key={index} />)}</div>
          <button type="button" onClick={togglePause}>{paused ? messages.resumeReading : messages.pauseReading}</button>
          <button type="button" onClick={stop}>{messages.stopReading}</button>
        </div>}
        <footer className="patient-app-footer">
          <p>{messages.homeFooter}</p>
        </footer>
      </div>}
      {menuOpen && <ProfileSheet
        language={language}
        messages={messages}
        setLanguage={setLanguage}
        rate={rate}
        setRate={setRate}
        preferredName={preferredName}
        nameDraft={nameDraft}
        patientId={state.patientId}
        setPatientId={setPatientId}
        unreadCount={unreadCount}
        setNameDraft={setNameDraft}
        saveName={() => { setPreferredName(nameDraft); setMenuOpen(false); }}
        forgetName={() => { setPreferredName(''); setNameDraft(''); }}
        onClose={() => setMenuOpen(false)}
        onProvider={switchToProvider}
      />}
    </div>
  );
}

function Onboarding({ initialName, onContinue, onSkip }: {
  initialName: string;
  onContinue: (name: string) => void;
  onSkip: () => void;
}) {
  const { language, messages, setLanguage } = useLanguage();
  const [draft, setDraft] = useState(initialName);
  const submit = (event: FormEvent) => {
    event.preventDefault();
    onContinue(draft);
  };
  return <main className="patient-app-onboarding" aria-label={messages.welcomeTitle}>
    <div className="patient-app-onboarding-content">
      <form className="welcome-card onboarding-preferences" onSubmit={submit}>
        <span className="onboarding-sparkle" aria-hidden="true"><Icon name="sparkles" size={21} /></span>
        <h2>{messages.welcomeTitle}</h2>
        <p>{messages.welcomeBody}</p>
        <div className="welcome-languages" role="group" aria-label={messages.language}>
          {(['en', 'es', 'ht'] as const).map((option) => <button type="button" key={option} className={language === option ? 'selected' : ''} aria-pressed={language === option} onClick={() => setLanguage(option)}>{NATIVE_LANGUAGE_NAMES[option]}</button>)}
        </div>
        <label className="sr-only" htmlFor="patient-welcome-name">{messages.welcomeName}</label>
        <input id="patient-welcome-name" aria-label={messages.welcomeName} placeholder={messages.welcomeName} maxLength={40} value={draft} onChange={(event) => setDraft(event.target.value)} />
        <button type="submit" className="patient-app-primary">{messages.welcomeContinue}</button>
        <button type="button" className="welcome-skip" onClick={onSkip}>{messages.welcomeLater}</button>
      </form>
    </div>
  </main>;
}

function ProfileSheet({ language, messages, setLanguage, rate, setRate, preferredName, nameDraft, patientId, setPatientId, unreadCount, setNameDraft, saveName, forgetName, onClose, onProvider }: {
  language: PatientLanguage;
  messages: ReturnType<typeof getMessages>;
  setLanguage: (language: PatientLanguage) => void;
  rate: SpeechRate;
  setRate: (rate: SpeechRate) => void;
  preferredName: string;
  nameDraft: string;
  patientId: string;
  setPatientId: (patientId: string) => void;
  unreadCount: number;
  setNameDraft: (name: string) => void;
  saveName: () => void;
  forgetName: () => void;
  onClose: () => void;
  onProvider: () => void;
}) {
  const save = (event: FormEvent) => { event.preventDefault(); saveName(); };
  return <div className="patient-app-sheet-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <section className="patient-app-profile-sheet" role="dialog" aria-modal="true" aria-labelledby="profile-sheet-title">
      <div className="patient-app-sheet-handle" aria-hidden="true" />
      <div className="patient-app-card-header"><h2 id="profile-sheet-title">{messages.profileSettings}</h2><button type="button" className="patient-app-icon-button" onClick={onClose} aria-label={messages.close}>×</button></div>
      <label className="patient-app-field">{messages.demoPatient}
        <select value={patientId} onChange={(event) => setPatientId(event.target.value)}>
          {elliePatients.map((patient) => <option key={patient.id} value={patient.id}>{patient.name}</option>)}
        </select>
      </label>
      <form onSubmit={save}>
        <label className="patient-app-field">{messages.profileName}
          <input value={nameDraft} onChange={(event) => setNameDraft(event.target.value)} placeholder={messages.profileNamePlaceholder} maxLength={40} />
        </label>
        <div className="patient-app-profile-actions">
          <button type="submit" className="patient-app-primary">{messages.saveName}</button>
          {preferredName && <button type="button" className="patient-app-text-button" onClick={forgetName}>{messages.forgetName}</button>}
        </div>
      </form>
      <label className="patient-app-field">{messages.language}
        <select value={language} onChange={(event) => setLanguage(event.target.value as PatientLanguage)}>
          <option value="en">{messages.english}</option><option value="es">{messages.spanish}</option><option value="ht">{messages.creole}</option>
        </select>
      </label>
      <label className="patient-app-field">{messages.speed}
        <select value={rate} onChange={(event) => setRate(Number(event.target.value) as SpeechRate)}>
          <option value="0.8">0.8×</option><option value="1">1.0×</option><option value="1.2">1.2×</option>
        </select>
      </label>
      <Link className="patient-app-sheet-link" to="/app/updates" onClick={onClose}><Icon name="bell" size={19} />{messages.careTeamUpdates}{unreadCount > 0 && <span className="patient-app-sheet-unread-dot" aria-label={messages.updatesUnread.replace('{count}', String(unreadCount))} />}<Icon name="chevronRight" size={18} /></Link>
      <button type="button" className="patient-app-secondary patient-app-provider-link" onClick={onProvider}>{messages.switchToProvider}</button>
    </section>
  </div>;
}
