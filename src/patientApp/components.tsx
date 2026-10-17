import { useEffect, useRef, useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { PatientLanguage } from '../state/DemoStore';
import type { GlossaryTerm } from './content/glossary';
import { glossary } from './content/glossary';
import { useLanguage } from './useLanguage';
import { formatDictationTime, useDictation } from './useDictation';
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
  user: <><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></>,
  settings: <><circle cx="12" cy="12" r="3" /><path d="m19.4 15 .1.1a1.7 1.7 0 0 1-2.4 2.4l-.1-.1a1.7 1.7 0 0 0-2.9 1.2v.2a1.7 1.7 0 0 1-3.4 0v-.2a1.7 1.7 0 0 0-2.9-1.2l-.1.1a1.7 1.7 0 0 1-2.4-2.4l.1-.1a1.7 1.7 0 0 0-1.2-2.9H4a1.7 1.7 0 0 1 0-3.4h.2a1.7 1.7 0 0 0 1.2-2.9l-.1-.1a1.7 1.7 0 0 1 2.4-2.4l.1.1a1.7 1.7 0 0 0 2.9-1.2V2a1.7 1.7 0 0 1 3.4 0v.2a1.7 1.7 0 0 0 2.9 1.2l.1-.1a1.7 1.7 0 0 1 2.4 2.4l-.1.1a1.7 1.7 0 0 0 1.2 2.9h.2a1.7 1.7 0 0 1 0 3.4h-.2a1.7 1.7 0 0 0-1.2 2.9Z" /></>,
  arrowLeft: <><path d="m15 18-6-6 6-6" /><path d="M9 12h12" /></>,
  chevronRight: <path d="m9 18 6-6-6-6" />,
  bus: <><path d="M5 17h14a2 2 0 0 0 2-2V6a3 3 0 0 0-3-3H6a3 3 0 0 0-3 3v9a2 2 0 0 0 2 2Z" /><path d="M3 9h18M7 21l2-4m8 4-2-4" /><circle cx="7.5" cy="13" r="1" /><circle cx="16.5" cy="13" r="1" /></>,
  book: <><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v16H6.5A2.5 2.5 0 0 0 4 21.5Z" /><path d="M4 5.5v16M8 7h8m-8 4h7" /></>,
  mapPin: <><path d="M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0Z" /><circle cx="12" cy="10" r="2.5" /></>,
  bookmark: <path d="M6 4.5A1.5 1.5 0 0 1 7.5 3h9A1.5 1.5 0 0 1 18 4.5V21l-6-4-6 4Z" />,
  share: <><path d="M12 16V3m0 0L7 8m5-5 5 5" /><path d="M5 12v8h14v-8" /></>,
  external: <><path d="M14 4h6v6m0-6-9 9" /><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /></>,
  phone: <><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.8 19.8 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.12 4.2 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72l.38 2.72a2 2 0 0 1-.57 1.68L7.1 9.94a16 16 0 0 0 6 6l1.82-1.82a2 2 0 0 1 1.68-.57l2.72.38a2 2 0 0 1 1.68 1.99Z" /></>,
};

export type IconName = keyof typeof ICONS;

export function Icon({ name, size = 20 }: { name: IconName; size?: number }) {
  return <svg className="ellie-icon" aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round">{ICONS[name]}</svg>;
}

export function DictationWaveform({ levels }: { levels: number[] }) {
  return <div className="dictation-waveform" aria-hidden="true">{levels.map((level, index) => <span key={index} style={{ height: `${Math.max(4, Math.round(level * 27))}px` }} />)}</div>;
}

export function Composer({ value, onChange, onSubmit, language, placeholder, inputId, className = '' }: {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (text: string) => void;
  language: PatientLanguage;
  placeholder: string;
  inputId: string;
  className?: string;
}) {
  const { messages } = useLanguage();
  const [searchParams] = useSearchParams();
  const [processing, setProcessing] = useState(false);
  const [showUnavailable, setShowUnavailable] = useState(false);
  const liveTranscriptRef = useRef<HTMLDivElement | null>(null);
  const demoMode = import.meta.env.DEV ? searchParams.get('demoDictation') : null;
  const demoWhisper = import.meta.env.DEV ? searchParams.get('demoWhisper') : null;
  const demoLevels = Array.from({ length: 40 }, (_, index) => 0.16 + Math.abs(Math.sin(index * 0.71)) * 0.6);
  const demoRecording = demoMode === 'recording';
  const demoTranscribing = demoMode === 'transcribing';
  const demoInserted = demoMode === 'inserted';
  const finishVoice = (transcript: string) => {
    if (!transcript.trim()) return;
    setProcessing(true);
    window.setTimeout(() => {
      setProcessing(false);
      onSubmit([value.trim(), transcript.trim()].filter(Boolean).join(' '));
    }, 700);
  };
  const voice = useVoiceInput(language, finishVoice);
  const startSpeechFallback = () => {
    if (!voice.supported) {
      setShowUnavailable(true);
      return;
    }
    setShowUnavailable(false);
    voice.clearTranscript();
    voice.toggle();
  };
  const addDictatedText = (transcript: string) => {
    onChange([value.trim(), transcript.trim()].filter(Boolean).join(' '));
    window.requestAnimationFrame(() => document.getElementById(inputId)?.focus());
  };
  const dictation = useDictation(language, addDictatedText, startSpeechFallback, voice.supported);
  useEffect(() => {
    if (!value.trim() && !voice.listening && !processing && voice.transcript.trim()) voice.clearTranscript();
  }, [value, voice.listening, voice.transcript, voice.clearTranscript, processing]);
  useEffect(() => {
    if (demoInserted && !value) onChange('How did I sleep this week?');
  }, [demoInserted, onChange, value]);
  const startRecording = async () => {
    setShowUnavailable(false);
    voice.clearTranscript();
    const result = await dictation.start();
    if (result === 'fallback') startSpeechFallback();
  };
  const submit = (event: FormEvent) => {
    event.preventDefault();
    const transcript = voice.transcript.trim();
    if (voice.listening) voice.toggle();
    if (transcript) {
      finishVoice(transcript);
      return;
    }
    if (value.trim()) onSubmit(value.trim());
  };
  const nativeRecording = dictation.state === 'recording' || demoRecording;
  const transcribing = dictation.state === 'transcribing' || demoTranscribing;
  useEffect(() => {
    const transcript = liveTranscriptRef.current;
    if (transcript) transcript.scrollTop = transcript.scrollHeight;
  }, [dictation.liveTranscript, nativeRecording]);
  const shownValue = voice.transcript || (demoInserted && !value ? 'How did I sleep this week?' : value);
  const demoWhisperLoading = demoWhisper === 'loading';
  const demoWhisperUsed = demoWhisper === 'recording' || demoWhisper === 'inserted';
  const whisperProgress = demoWhisperLoading
    ? messages.voiceGettingReady.replace('{percent}', '38')
    : dictation.whisperLoading
      ? messages.voiceGettingReady.replace('{percent}', String(Math.round(dictation.whisperStatus.progress)))
      : null;
  const showOnDevice = demoWhisperUsed || dictation.onDeviceReady || dictation.usedWhisper;
  return (
    <>
      <form className={`ellie-composer ${className} ${nativeRecording || transcribing ? 'is-dictating' : ''}`} onSubmit={submit}>
        <label className="sr-only" htmlFor={inputId}>{placeholder}</label>
        {nativeRecording
          ? <>
            <div ref={liveTranscriptRef} className="dictation-live-transcript" role="status" aria-live="polite" aria-atomic="false">
              {demoRecording
                ? <><span>How did I sleep</span><span className="dictation-live-interim"> this week?</span></>
                : dictation.liveTranscript
                  ? <><span>{dictation.liveFinalTranscript}</span>{dictation.liveInterimTranscript && <span className="dictation-live-interim"> {dictation.liveInterimTranscript}</span>}</>
                  : <span className="dictation-live-placeholder">{messages.voiceLiveListening}</span>}
            </div>
            <button type="button" className="dictation-control dictation-cancel" onClick={() => dictation.cancel()} aria-label={messages.voiceCancelRecording}>×</button>
            <DictationWaveform levels={demoRecording ? demoLevels : dictation.levels} />
            <span className="dictation-timer">{demoRecording ? '00:07' : formatDictationTime(dictation.elapsedMs)}</span>
            <button type="button" className="dictation-control dictation-confirm" onClick={() => dictation.confirm()} aria-label={messages.voiceDone}>✓</button>
          </>
          : transcribing
            ? <div className="dictation-transcribing" role="status" aria-live="polite"><span className="dictation-spinner" />{messages.voiceTranscribing}</div>
            : <>
              <div className={`ellie-composer-input ${voice.listening ? 'is-listening' : ''}`}>
                {voice.listening && <div className="composer-waveform" aria-hidden="true">{Array.from({ length: 5 }, (_, index) => <span key={index} style={{ height: `${Math.max(4, Math.round(voice.level * (8 + 13 * Math.abs(Math.sin(index)) )))}px` }} />)}</div>}
                <input id={inputId} value={shownValue} onChange={(event) => { voice.clearTranscript(); onChange(event.target.value); }} placeholder={placeholder} autoComplete="off" />
              </div>
              {voice.listening
                ? <button type="button" className="composer-stop-button" onClick={() => voice.toggle()} aria-label={messages.voiceStop}>{messages.voiceStopShort}</button>
                : <button type="button" className="composer-mic" aria-label={messages.speakQuestion} aria-pressed={false} title={messages.speakQuestion} disabled={!voice.supported && !dictation.canRecord} onClick={() => void startRecording()}><Icon name="mic" size={19} /></button>}
              <button type="submit" className="composer-send" aria-label={messages.send} disabled={processing || (!value.trim() && !voice.transcript.trim() && !demoInserted)}><Icon name="arrowUp" size={19} /></button>
            </>}
        {(processing || dictation.state === 'recording' || transcribing) && <span className="sr-only" role="status" aria-live="polite">{transcribing ? messages.voiceTranscribing : dictation.state === 'recording' ? messages.voiceRecording : messages.voiceProcessing}</span>}
      </form>
      {(nativeRecording || transcribing) && (whisperProgress || showOnDevice) && <p className="dictation-attribution" role="status" aria-live="polite">{whisperProgress ?? messages.voiceOnDevice}</p>}
      {(dictation.usedWhisper || demoWhisperUsed) && !nativeRecording && !transcribing && <p className="dictation-attribution" role="status" aria-live="polite">{messages.voiceOnDevice}</p>}
      {dictation.error === 'permission' && <p className="composer-voice-unavailable" role="alert">{messages.voicePermissionDenied}</p>}
      {(showUnavailable || !voice.supported && !dictation.canRecord) && <p className="composer-voice-unavailable">{messages.voiceUnavailable}</p>}
    </>
  );
}
