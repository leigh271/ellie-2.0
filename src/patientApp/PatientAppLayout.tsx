import { useEffect, useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { elliePatients } from '../data/ellieDemo';
import { useDemoStore } from '../state/DemoStore';
import type { PatientLanguage } from '../state/DemoStore';
import { Icon } from './components';
import type { IconName } from './components';
import type { MessageKey } from './i18n';
import { useLanguage } from './useLanguage';
import { hasBeenWelcomed, markWelcomed, usePreferredName } from './usePreferredName';
import { SpeakButton, SpeechProvider, useSpeech } from './useSpeech';
import type { SpeechRate } from './useSpeech';

const tabs: { to: string; key: MessageKey; icon: IconName }[] = [
  { to: '/app', key: 'homeTab', icon: 'home' },
  { to: '/app/diagnosis', key: 'diagnosisTab', icon: 'heart' },
  { to: '/app/help', key: 'helpTab', icon: 'lifebuoy' },
  { to: '/app/ask', key: 'askTab', icon: 'chat' },
  { to: '/app/updates', key: 'updatesTab', icon: 'bell' },
];

const NATIVE_LANGUAGE_NAMES: Record<PatientLanguage, string> = { en: 'English', es: 'Español', ht: 'Kreyòl ayisyen' };
const SPLASH_MS = 1150;

export default function PatientAppLayout({ children }: { children: ReactNode }) {
  return <SpeechProvider><PatientAppFrame>{children}</PatientAppFrame></SpeechProvider>;
}

function PatientAppFrame({ children }: { children: ReactNode }) {
  const { state, setRole } = useDemoStore();
  const { language, messages, setLanguage } = useLanguage();
  const { rate, setRate, notice, stop, speakingId, paused, togglePause } = useSpeech();
  const navigate = useNavigate();
  const patient = elliePatients.find((item) => item.id === state.patientId) ?? elliePatients[0];
  const [preferredName, setPreferredName] = usePreferredName(patient.id);
  const [splash, setSplash] = useState(true);
  const [welcomeOpen, setWelcomeOpen] = useState(() => !hasBeenWelcomed());

  useEffect(() => {
    const timer = window.setTimeout(() => setSplash(false), SPLASH_MS);
    return () => window.clearTimeout(timer);
  }, []);

  const finishWelcome = (name?: string) => {
    if (name !== undefined) setPreferredName(name);
    markWelcomed();
    setWelcomeOpen(false);
  };
  const forgetName = () => {
    setPreferredName('');
    setWelcomeOpen(true);
  };

  return (
    <div className="patient-app-root">
      {splash && <div className="ellie-splash" aria-hidden="true"><div className="ellie-splash-name">Ellie<span>.</span></div></div>}
      <div className="patient-app">
        <header className="patient-app-header">
          <div className="patient-app-brand">
            <button type="button" className="ellie-logo" onClick={() => navigate('/app')}>Ellie<span>.</span></button>
            <span className="ellie-header-note"><Icon name="sparkles" size={14} />{messages.headerNote}</span>
          </div>
          <div className="patient-app-toolbar">
            <label className="sr-only" htmlFor="patient-app-language">{messages.language}</label>
            <select id="patient-app-language" value={language} onChange={(event) => setLanguage(event.target.value as PatientLanguage)} aria-label={messages.language}>
              <option value="en">{messages.english}</option>
              <option value="es">{messages.spanish}</option>
              <option value="ht">{messages.creole}</option>
            </select>
            <label className="sr-only" htmlFor="patient-app-speed">{messages.speed}</label>
            <select id="patient-app-speed" value={rate} onChange={(event) => setRate(Number(event.target.value) as SpeechRate)} aria-label={messages.speed}>
              <option value="0.8">0.8×</option>
              <option value="1">1.0×</option>
              <option value="1.2">1.2×</option>
            </select>
            <button className="patient-app-provider-link" type="button" onClick={() => { stop(); setRole('provider'); navigate('/'); }}>{messages.switchToProvider}</button>
          </div>
        </header>
        {notice && <div className="patient-app-toast" role="status" aria-live="polite">{notice}<SpeakButton text={notice} language={language} /></div>}
        <main className="patient-app-main">{children}</main>
        <footer className="patient-app-footer">
          <p>{preferredName && <><button type="button" className="forget-name" onClick={forgetName}>{messages.forgetName}</button><span aria-hidden="true"> · </span></>}{messages.patientAppDisclaimer}</p>
          <p>{messages.translationDisclaimer}</p>
        </footer>
        {speakingId && <div className="patient-app-now-reading" role="status" aria-live="polite">
          <strong>{messages.nowReading}</strong>
          <div className="patient-app-now-reading-wave" aria-hidden="true">{Array.from({ length: 7 }, (_, index) => <span key={index} />)}</div>
          <button type="button" onClick={togglePause}>{paused ? messages.resumeReading : messages.pauseReading}</button>
          <button type="button" onClick={stop}>{messages.stopReading}</button>
        </div>}
        <nav className="patient-app-tabs" aria-label={messages.patientRole}>
          {tabs.map((tab) => <NavLink end={tab.to === '/app'} key={tab.to} to={tab.to} className={({ isActive }) => `patient-app-tab ${isActive ? 'active' : ''}`}>
            <Icon name={tab.icon} size={21} /><span>{messages[tab.key]}</span>
          </NavLink>)}
        </nav>
      </div>
      {welcomeOpen && !splash && <WelcomeCard initialName={preferredName} onContinue={finishWelcome} onSkip={() => finishWelcome()} />}
    </div>
  );
}

function WelcomeCard({ initialName, onContinue, onSkip }: { initialName: string; onContinue: (name: string) => void; onSkip: () => void }) {
  const { language, messages, setLanguage } = useLanguage();
  const [draft, setDraft] = useState(initialName);
  const submit = (event: FormEvent) => {
    event.preventDefault();
    onContinue(draft);
  };
  return <div className="welcome-overlay" role="dialog" aria-modal="true" aria-labelledby="welcome-title">
    <form className="welcome-card" onSubmit={submit}>
      <span className="welcome-spark"><Icon name="sparkles" size={24} /></span>
      <h2 id="welcome-title">{messages.welcomeTitle}</h2>
      <p>{messages.welcomeBody}</p>
      <div className="welcome-languages" role="group" aria-label={messages.language}>
        {(Object.keys(NATIVE_LANGUAGE_NAMES) as PatientLanguage[]).map((code) => <button type="button" key={code} lang={code} aria-pressed={language === code} className={language === code ? 'selected' : ''} onClick={() => setLanguage(code)}>{NATIVE_LANGUAGE_NAMES[code]}</button>)}
      </div>
      <input aria-label={messages.welcomeName} placeholder={messages.welcomeName} maxLength={40} value={draft} onChange={(event) => setDraft(event.target.value)} />
      <button type="submit" className="patient-app-primary">{messages.welcomeContinue}</button>
      <button type="button" className="welcome-skip" onClick={onSkip}>{messages.welcomeLater}</button>
    </form>
  </div>;
}
