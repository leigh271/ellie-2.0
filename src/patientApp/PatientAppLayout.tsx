import type { ReactNode } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { elliePatients } from '../data/ellieDemo';
import { useDemoStore } from '../state/DemoStore';
import { Orb } from '../components/UI';
import type { PatientLanguage } from '../state/DemoStore';
import { getMessages } from './i18n';
import { useLanguage } from './useLanguage';
import { SpeakButton, SpeechProvider, useSpeech } from './useSpeech';
import type { SpeechRate } from './useSpeech';

const tabs = [
  { to: '/app', key: 'homeTab' as const, icon: '⌂' },
  { to: '/app/diagnosis', key: 'diagnosisTab' as const, icon: '♡' },
  { to: '/app/help', key: 'helpTab' as const, icon: '✚' },
  { to: '/app/ask', key: 'askTab' as const, icon: '✦' },
  { to: '/app/updates', key: 'updatesTab' as const, icon: '▤' },
];

export default function PatientAppLayout({ children }: { children: ReactNode }) {
  return <SpeechProvider><PatientAppFrame>{children}</PatientAppFrame></SpeechProvider>;
}

function PatientAppFrame({ children }: { children: ReactNode }) {
  const { state, setRole } = useDemoStore();
  const { language, messages, setLanguage } = useLanguage();
  const { rate, setRate, speak, notice, stop } = useSpeech();
  const navigate = useNavigate();
  const patient = elliePatients.find((item) => item.id === state.patientId) ?? elliePatients[0];
  const patientAppMessages = getMessages(language);
  const readPage = () => {
    const text = [...document.querySelectorAll<HTMLElement>('.patient-app-main [data-speech-text]')]
      .map((element) => element.dataset.speechText?.trim() ?? '')
      .filter(Boolean)
      .join(' ');
    if (text) speak('patient-app-page', text, language);
  };
  const changeLanguage = (value: PatientLanguage) => setLanguage(value);

  return (
    <div className="patient-app-root">
      <div className="patient-app">
        <header className="patient-app-header">
          <div className="patient-app-brand">
            <div className="patient-app-brand-name"><Orb /><b>ellie<span className="brand-dot">.</span></b></div>
            <span className="patient-app-patient-name">{patient.name.split(' ')[0]}</span>
          </div>
          <div className="patient-app-settings">
            <label className="sr-only" htmlFor="patient-app-language">{messages.language}</label>
            <select id="patient-app-language" value={language} onChange={(event) => changeLanguage(event.target.value as PatientLanguage)} aria-label={messages.language}>
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
          </div>
          <div className="patient-app-header-actions">
            <button className="patient-app-read-page" type="button" onClick={readPage}><svg aria-hidden="true" viewBox="0 0 24 24"><path d="M4 9v6h4l5 4V5L8 9H4Z" /><path d="M16 9a5 5 0 0 1 0 6M18.5 6.5a9 9 0 0 1 0 11" /></svg>{messages.readPage}</button>
            <button className="patient-app-provider-link" type="button" onClick={() => { stop(); setRole('provider'); navigate('/'); }}>{messages.switchToProvider}</button>
          </div>
        </header>
        <p className="patient-app-translation-note">{patientAppMessages.translationDisclaimer}</p>
        {notice && <div className="patient-app-toast" role="status" aria-live="polite">{notice}<SpeakButton text={notice} language={language} /></div>}
        <main className="patient-app-main">{children}</main>
        <p className="patient-app-disclaimer">{messages.patientAppDisclaimer}</p>
        <nav className="patient-app-tabs" aria-label={messages.patientRole}>
          {tabs.map((tab) => <NavLink end={tab.to === '/app'} key={tab.to} to={tab.to} className={({ isActive }) => `patient-app-tab ${isActive ? 'active' : ''}`}>
            <span aria-hidden="true">{tab.icon}</span><span>{messages[tab.key]}</span>
          </NavLink>)}
        </nav>
      </div>
    </div>
  );
}
