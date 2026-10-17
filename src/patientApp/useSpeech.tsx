import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import type { PatientLanguage } from '../state/DemoStore';
import { getMessages } from './i18n';
import { useLanguage } from './useLanguage';

type SpeechRate = 0.8 | 1 | 1.2;
type SpeechContextValue = {
  speakingId: string | null;
  rate: SpeechRate;
  notice: string;
  setRate: (rate: SpeechRate) => void;
  speak: (id: string, text: string, language: PatientLanguage) => void;
  stop: () => void;
};

const RATE_KEY = 'ellie-app-speech-rate';
const SpeechContext = createContext<SpeechContextValue | null>(null);

function readRate(): SpeechRate {
  const value = Number(localStorage.getItem(RATE_KEY));
  return value === 0.8 || value === 1.2 ? value : 1;
}

function findVoice(voices: SpeechSynthesisVoice[], language: PatientLanguage) {
  const prefix = language === 'en' ? 'en' : language === 'es' ? 'es' : 'ht';
  const exact = language === 'en' ? 'en-US' : language === 'es' ? 'es-US' : 'ht-HT';
  const matching = voices.find((voice) => voice.lang.toLowerCase() === exact.toLowerCase())
    ?? voices.find((voice) => voice.lang.toLowerCase().startsWith(`${prefix}-`));
  if (language !== 'ht') return { voice: matching ?? voices.find((voice) => voice.default) ?? voices[0], usedFrench: false };
  if (matching) return { voice: matching, usedFrench: false };
  const french = voices.find((voice) => voice.lang.toLowerCase() === 'fr-fr')
    ?? voices.find((voice) => voice.lang.toLowerCase().startsWith('fr-'));
  return { voice: french, usedFrench: Boolean(french) };
}

export function SpeechProvider({ children }: { children: ReactNode }) {
  const location = useLocation();
  const [speakingId, setSpeakingId] = useState<string | null>(null);
  const [rate, setRateValue] = useState<SpeechRate>(readRate);
  const [notice, setNotice] = useState('');
  const noticeTimer = useRef<number | undefined>(undefined);
  const setRate = useCallback((next: SpeechRate) => {
    setRateValue(next);
    localStorage.setItem(RATE_KEY, String(next));
  }, []);
  const showNotice = useCallback((text: string) => {
    window.clearTimeout(noticeTimer.current);
    setNotice(text);
    noticeTimer.current = window.setTimeout(() => setNotice(''), 6000);
  }, []);
  const stop = useCallback(() => {
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    setSpeakingId(null);
  }, []);
  const speak = useCallback((id: string, text: string, language: PatientLanguage) => {
    const messages = getMessages(language);
    if (speakingId === id) {
      stop();
      return;
    }
    if (!('speechSynthesis' in window) || typeof SpeechSynthesisUtterance === 'undefined') {
      showNotice(messages.speechUnsupported);
      return;
    }
    const voices = window.speechSynthesis.getVoices();
    if (!voices.length) {
      showNotice(messages.speechUnsupported);
      return;
    }
    const { voice, usedFrench } = findVoice(voices, language);
    if (language === 'ht' && !voice) {
      showNotice(messages.speechUnsupported);
      return;
    }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = language === 'en' ? 'en-US' : language === 'es' ? 'es-US' : usedFrench ? 'fr-FR' : 'ht-HT';
    if (voice) utterance.voice = voice;
    utterance.rate = rate;
    utterance.onend = () => setSpeakingId(null);
    utterance.onerror = () => setSpeakingId(null);
    window.speechSynthesis.speak(utterance);
    setSpeakingId(id);
    if (usedFrench) showNotice(messages.creoleVoiceNote);
    else setNotice('');
  }, [rate, showNotice, speakingId, stop]);

  useEffect(() => {
    stop();
  }, [location.pathname, stop]);
  useEffect(() => () => {
    window.clearTimeout(noticeTimer.current);
    stop();
  }, [stop]);

  const value = useMemo(() => ({ speakingId, rate, notice, setRate, speak, stop }), [speakingId, rate, notice, setRate, speak, stop]);
  return <SpeechContext.Provider value={value}>{children}</SpeechContext.Provider>;
}

export function useSpeech() {
  const value = useContext(SpeechContext);
  if (!value) throw new Error('useSpeech must be used inside SpeechProvider');
  return value;
}

export function SpeakButton({ text, language, className = '' }: { text: string; language: PatientLanguage; className?: string }) {
  const { speakingId, speak } = useSpeech();
  const { messages } = useLanguage();
  const id = useRef(`speech-${Math.random().toString(36).slice(2)}`).current;
  const active = speakingId === id;
  return (
    <button type="button" className={`speak-button ${className}`} aria-label={active ? messages.stopReading : messages.readAloud} title={active ? messages.stopReading : messages.readAloud} onClick={() => speak(id, text, language)}>
      {active
        ? <svg aria-hidden="true" viewBox="0 0 24 24"><rect x="6" y="6" width="12" height="12" rx="2" /></svg>
        : <svg aria-hidden="true" viewBox="0 0 24 24"><path d="M4 9v6h4l5 4V5L8 9H4Z" /><path d="M16 9a5 5 0 0 1 0 6M18.5 6.5a9 9 0 0 1 0 11" /></svg>}
    </button>
  );
}

type RecognitionResult = { results: ArrayLike<ArrayLike<{ transcript: string }>> };
type RecognitionLike = {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  onresult: ((event: RecognitionResult) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};
type SpeechWindow = Window & {
  SpeechRecognition?: new () => RecognitionLike;
  webkitSpeechRecognition?: new () => RecognitionLike;
};

export function VoiceInputButton({ language, onTranscript }: { language: PatientLanguage; onTranscript: (text: string) => void }) {
  const [listening, setListening] = useState(false);
  const recognition = useRef<RecognitionLike | null>(null);
  const location = useLocation();
  const { messages } = useLanguage();
  const { speechUnsupported } = messages;
  const recognitionWindow = typeof window === 'undefined' ? undefined : window as SpeechWindow;
  const Recognition = recognitionWindow?.SpeechRecognition ?? recognitionWindow?.webkitSpeechRecognition;

  useEffect(() => {
    recognition.current?.stop();
    setListening(false);
    return () => recognition.current?.stop();
  }, [location.pathname]);

  if (!Recognition) return null;
  const toggle = () => {
    if (listening) {
      recognition.current?.stop();
      setListening(false);
      return;
    }
    const input = new Recognition();
    input.lang = language === 'en' ? 'en-US' : language === 'es' ? 'es-US' : 'ht-HT';
    input.interimResults = false;
    input.maxAlternatives = 1;
    input.onresult = (event) => {
      const transcript = event.results[0]?.[0]?.transcript;
      if (transcript) onTranscript(transcript);
      setListening(false);
    };
    input.onerror = () => setListening(false);
    input.onend = () => setListening(false);
    recognition.current = input;
    input.start();
    setListening(true);
  };
  return <button type="button" className={`btn voice-button ${listening ? 'listening' : ''}`} aria-label={messages.speakQuestion} title={speechUnsupported} onClick={toggle}>{listening ? '◉' : '🎙'}</button>;
}

export type { SpeechRate };
