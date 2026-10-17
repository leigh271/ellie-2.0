import { useEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import type { PatientLanguage } from '../state/DemoStore';
import type { GlossaryTerm } from './content/glossary';
import { glossary } from './content/glossary';
import { useLanguage } from './useLanguage';
import { SpeakButton } from './useSpeech';

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
