import { useEffect, useRef } from 'react';
import type { FormEvent, ReactNode } from 'react';
import type { PatientLanguage } from '../state/DemoStore';
import type { GlossaryTerm } from './content/glossary';
import { glossary } from './content/glossary';
import { useLanguage } from './useLanguage';
import { SpeakButton, useVoiceInput } from './useSpeech';

export function AppCard({ title, text, language, children, className = '' }: {
  title: string;
  text?: string;
  language: PatientLanguage;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`patient-app-card ${className}`} data-speech-text={text}>
      <div className="patient-app-card-header"><h2>{title}</h2>{text && <SpeakButton text={text} language={language} />}</div>
      {children}
    </section>
  );
}

export function PageHeading({ title, subtitle, language }: { title: string; subtitle: string; language: PatientLanguage }) {
  return <div className="patient-app-page-heading" data-speech-text={`${title}. ${subtitle}`}>
    <div><p className="patient-app-eyebrow">ellie</p><h1>{title}</h1><p>{subtitle}</p></div>
    <SpeakButton text={`${title}. ${subtitle}`} language={language} />
  </div>;
}

export function GlossaryText({ text, language, onTerm }: {
  text: string;
  language: PatientLanguage;
  onTerm: (term: GlossaryTerm) => void;
}) {
  const terms = glossary.map((term) => ({ term, label: term.name[language] }))
    .sort((first, second) => second.label.length - first.label.length);
  const pattern = new RegExp(`(${terms.map(({ label }) => label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`, 'giu');
  const parts = text.split(pattern);
  return <>{parts.map((part, index) => {
    const match = terms.find(({ label }) => label.toLocaleLowerCase(language === 'ht' ? 'fr' : language) === part.toLocaleLowerCase(language === 'ht' ? 'fr' : language));
    return match ? <button type="button" className="glossary-link" key={`${part}-${index}`} onClick={() => onTerm(match.term)}>{part}</button> : <span key={`${part}-${index}`}>{part}</span>;
  })}</>;
}

export function GlossarySheet({ term, onClose }: { term: GlossaryTerm | null; onClose: () => void }) {
  const { language, messages } = useLanguage();
  const closeButton = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!term) return;
    const previousFocus = document.activeElement as HTMLElement | null;
    closeButton.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      previousFocus?.focus();
    };
  }, [term, onClose]);
  if (!term) return null;
  const speechText = `${term.name[language]}. ${term.definition[language]}`;
  return <div className="glossary-overlay" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <section className="glossary-sheet" role="dialog" aria-modal="true" aria-labelledby="glossary-heading">
      <div className="patient-app-card-header"><div><p className="patient-app-eyebrow">{messages.glossary}</p><h2 id="glossary-heading">{term.name[language]}</h2></div><button ref={closeButton} type="button" className="btn" onClick={onClose}>{messages.close}</button></div>
      <p className="glossary-definition" data-speech-text={speechText}>{term.definition[language]}</p>
      <SpeakButton text={speechText} language={language} />
    </section>
  </div>;
}

const ICONS = {
  mic: <><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" /><path d="M19 10v2a7 7 0 0 1-14 0v-2" /><path d="M12 19v3" /></>,
  stop: <rect x="6" y="6" width="12" height="12" rx="2" fill="currentColor" stroke="none" />,
  arrowUp: <><path d="m5 12 7-7 7 7" /><path d="M12 19V5" /></>,
  sparkles: <path d="M9.94 15.5a2 2 0 0 0-1.44-1.44l-6.13-1.58a.5.5 0 0 1 0-.96L8.5 9.94A2 2 0 0 0 9.94 8.5l1.58-6.13a.5.5 0 0 1 .96 0l1.58 6.13a2 2 0 0 0 1.44 1.44l6.13 1.58a.5.5 0 0 1 0 .96l-6.13 1.58a2 2 0 0 0-1.44 1.44l-1.58 6.13a.5.5 0 0 1-.96 0Z" />,
  home: <><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z" /><path d="M9 22V12h6v10" /></>,
  heart: <><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" /><path d="M3.22 12H9.5l.5-1 2 4.5 2-7 1.5 3.5h5.27" /></>,
  lifebuoy: <><circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="4" /><path d="m4.93 4.93 4.24 4.24M14.83 9.17l4.24-4.24M14.83 14.83l4.24 4.24M9.17 14.83l-4.24 4.24" /></>,
  chat: <path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z" />,
  bell: <><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" /><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" /></>,
};

export type IconName = keyof typeof ICONS;

export function Icon({ name, size = 20 }: { name: IconName; size?: number }) {
  return <svg className="ellie-icon" aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round">{ICONS[name]}</svg>;
}

export function Composer({ value, onChange, onSubmit, language, placeholder, inputId }: {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (text: string) => void;
  language: PatientLanguage;
  placeholder: string;
  inputId: string;
}) {
  const { messages } = useLanguage();
  const voice = useVoiceInput(language, (transcript) => onChange(value ? `${value} ${transcript}` : transcript));
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (value.trim()) onSubmit(value.trim());
  };
  return <form className="ellie-composer" onSubmit={submit}>
    <label className="sr-only" htmlFor={inputId}>{placeholder}</label>
    <input id={inputId} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} autoComplete="off" />
    {voice.supported && <button type="button" className={`composer-mic ${voice.listening ? 'active' : ''}`} aria-label={voice.listening ? messages.listeningTap : messages.speakQuestion} aria-pressed={voice.listening} onClick={voice.toggle}><Icon name={voice.listening ? 'stop' : 'mic'} size={19} /></button>}
    <button type="submit" className="composer-send" aria-label={messages.send} disabled={!value.trim()}><Icon name="arrowUp" size={19} /></button>
  </form>;
}
