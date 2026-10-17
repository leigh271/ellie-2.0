import { useEffect, useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { elliePatients } from '../data/ellieDemo';
import { useDemoStore } from '../state/DemoStore';
import type { PatientLanguage } from '../state/DemoStore';
import { diagnoses } from './content/diagnoses';
import type { DiagnosisKey } from './content/diagnoses';
import { Icon } from './components';
import { getMessages } from './i18n';
import { useLanguage } from './useLanguage';
import { hasBeenWelcomed, markWelcomed, usePreferredName } from './usePreferredName';
import { SpeakButton, SpeechProvider, useSpeech } from './useSpeech';
import type { SpeechRate } from './useSpeech';

const NATIVE_LANGUAGE_NAMES: Record<PatientLanguage, string> = { en: 'English', es: 'Español', ht: 'Kreyòl ayisyen' };
const diagnosisByPatient: Record<string, DiagnosisKey> = {
  maria: 'cervical',
  jasmine: 'breast',
  ana: 'lymphoma',
  david: 'colorectal',
  priya: 'ovarian',
  robert: 'prostate',
};

export default function PatientAppLayout({ children }: { children: ReactNode }) {
  return <SpeechProvider><PatientAppFrame>{children}</PatientAppFrame></SpeechProvider>;
}

function PatientAppFrame({ children }: { children: ReactNode }) {
  const { state, setRole } = useDemoStore();
  const { language, messages, setLanguage } = useLanguage();
  const { rate, setRate, notice, stop, speakingId, paused, togglePause } = useSpeech();
  const navigate = useNavigate();
  const location = useLocation();
  const patient = elliePatients.find((item) => item.id === state.patientId) ?? elliePatients[0];
  const [preferredName, setPreferredName] = usePreferredName(patient.id);
  const [onboardingStep, setOnboardingStep] = useState<0 | 1 | 2>(() => hasBeenWelcomed() ? 0 : 1);
  const [menuOpen, setMenuOpen] = useState(false);
  const [nameDraft, setNameDraft] = useState(preferredName);
  const diagnosisKey = diagnosisByPatient[patient.id];
  const diagnosisName = diagnosisKey ? diagnoses[diagnosisKey].name[language] : patient.diagnosis;
  const unreadCount = state.tasks.filter((task) => task.patientId === patient.id && task.shareWithPatient && task.patientMessage.trim() && !state.patientReplies[task.id]).length;
  const onHome = location.pathname === '/app';

  useEffect(() => setNameDraft(preferredName), [preferredName]);
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
      {onboardingStep > 0 ? <Onboarding
        step={onboardingStep === 1 ? 1 : 2}
        diagnosis={diagnosisName}
        initialName={preferredName}
        onStart={() => setOnboardingStep(2)}
        onContinue={finishWelcome}
        onSkip={() => finishWelcome()}
      /> : <div className="patient-app">
        <header className="patient-app-header">
          {onHome ? <div className="patient-app-home-header">
            <button type="button" className="ellie-logo" onClick={() => navigate('/app')} aria-label="Ellie home">Ellie<span>.</span></button>
            <div className="patient-app-header-actions">
              <Link className="patient-app-icon-button updates-button" to="/app/updates" aria-label={messages.updatesUnread.replace('{count}', String(unreadCount))}>
                <Icon name="bell" size={21} />{unreadCount > 0 && <span className="patient-app-unread-badge">{unreadCount}</span>}
              </Link>
              <button type="button" className="patient-app-icon-button" onClick={() => setMenuOpen(true)} aria-label={messages.profileSettings}><Icon name="user" size={21} /></button>
            </div>
          </div> : <div className="patient-app-sub-header">
            <button type="button" className="patient-app-icon-button" onClick={() => navigate('/app')} aria-label={messages.backHome}><Icon name="arrowLeft" size={21} /></button>
            <button type="button" className="ellie-logo" onClick={() => navigate('/app')}>Ellie<span>.</span></button>
            <button type="button" className="patient-app-icon-button patient-app-menu-button" onClick={() => setMenuOpen(true)} aria-label={messages.profileSettings}>⋯</button>
          </div>}
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
          <p>{messages.patientAppDisclaimer}</p>
          <p>{messages.translationDisclaimer}</p>
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
        setNameDraft={setNameDraft}
        saveName={() => { setPreferredName(nameDraft); setMenuOpen(false); }}
        forgetName={() => { setPreferredName(''); setNameDraft(''); }}
        onClose={() => setMenuOpen(false)}
        onProvider={switchToProvider}
      />}
    </div>
  );
}

function Onboarding({ step, diagnosis, initialName, onStart, onContinue, onSkip }: {
  step: 1 | 2;
  diagnosis: string;
  initialName: string;
  onStart: () => void;
  onContinue: (name: string) => void;
  onSkip: () => void;
}) {
  const { language, messages, setLanguage } = useLanguage();
  const [draft, setDraft] = useState(initialName);
  const submit = (event: FormEvent) => {
    event.preventDefault();
    onContinue(draft);
  };
  return <main className={`patient-app-onboarding onboarding-step-${step}`} aria-label={messages.onboardingStep.replace('{step}', String(step))}>
    <div className="patient-app-onboarding-content">
      <div className="ellie-orb ellie-orb-onboarding" aria-hidden="true"><span /></div>
      <h1 className="onboarding-wordmark">Ellie<span>.</span></h1>
      {step === 1 ? <>
        <p className="onboarding-support">{messages.onboardingSupport.replace('{diagnosis}', diagnosis.toLocaleLowerCase(language === 'ht' ? 'fr' : language))}</p>
        <ul className="onboarding-benefits">
          <li><Icon name="sparkles" size={21} /><span>{messages.onboardingAnswers}</span></li>
          <li><Icon name="book" size={21} /><span>{messages.onboardingResources}</span></li>
          <li><Icon name="heart" size={21} /><span>{messages.onboardingNextStep}</span></li>
        </ul>
        <button type="button" className="patient-app-primary onboarding-start" onClick={onStart}>{messages.onboardingGetStarted}</button>
        <p className="onboarding-footer">{messages.homeDisclaimer}</p>
        <div className="onboarding-dots" aria-hidden="true"><span className="active" /><span /><span /></div>
      </> : <form className="welcome-card onboarding-preferences" onSubmit={submit}>
        <h2>{messages.welcomeTitle}</h2>
        <p>{messages.welcomeBody}</p>
        <div className="welcome-languages" role="group" aria-label={messages.language}>
          {(['en', 'es', 'ht'] as const).map((option) => <button type="button" key={option} className={language === option ? 'selected' : ''} aria-pressed={language === option} onClick={() => setLanguage(option)}>{NATIVE_LANGUAGE_NAMES[option]}</button>)}
        </div>
        <label className="sr-only" htmlFor="patient-welcome-name">{messages.welcomeName}</label>
        <input id="patient-welcome-name" aria-label={messages.welcomeName} placeholder={messages.welcomeName} maxLength={40} value={draft} onChange={(event) => setDraft(event.target.value)} />
        <button type="submit" className="patient-app-primary">{messages.welcomeContinue}</button>
        <button type="button" className="welcome-skip" onClick={onSkip}>{messages.welcomeLater}</button>
        <div className="onboarding-dots" aria-hidden="true"><span /><span className="active" /><span /></div>
      </form>}
    </div>
  </main>;
}

function ProfileSheet({ language, messages, setLanguage, rate, setRate, preferredName, nameDraft, setNameDraft, saveName, forgetName, onClose, onProvider }: {
  language: PatientLanguage;
  messages: ReturnType<typeof getMessages>;
  setLanguage: (language: PatientLanguage) => void;
  rate: SpeechRate;
  setRate: (rate: SpeechRate) => void;
  preferredName: string;
  nameDraft: string;
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
      <Link className="patient-app-sheet-link" to="/app/updates" onClick={onClose}><Icon name="bell" size={19} />{messages.updatesTab}<Icon name="chevronRight" size={18} /></Link>
      <button type="button" className="patient-app-secondary patient-app-provider-link" onClick={onProvider}>{messages.switchToProvider}</button>
    </section>
  </div>;
}
