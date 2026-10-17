import { useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { Link } from 'react-router-dom';
import type { PatientLanguage } from '../../state/DemoStore';
import { companionDestination, companionReply } from '../../lib/companion';
import { AppCard, PageHeading } from '../components';
import { useLanguage } from '../useLanguage';
import { SpeakButton, VoiceInputButton, useSpeech } from '../useSpeech';

type ChatMessage = { id: string; role: 'user' | 'assistant'; text: string; route?: string; language: PatientLanguage };

export default function AskScreen() {
  const { language, messages } = useLanguage();
  const { speak } = useSpeech();
  const [chat, setChat] = useState<ChatMessage[]>(() => [{ id: 'welcome', role: 'assistant', text: messages.defaultAssistant, language }]);
  const [draft, setDraft] = useState('');
  const [autoRead, setAutoRead] = useState(() => localStorage.getItem('ellie-app-auto-read') === 'true');
  const greeting = useMemo(() => messages.defaultAssistant, [messages.defaultAssistant]);
  const send = (event: FormEvent) => {
    event.preventDefault();
    const text = draft.trim();
    if (!text) return;
    const answer = companionReply(text, language);
    const response: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'assistant',
      text: answer,
      route: companionDestination(text, language),
      language,
    };
    setChat((previous) => [...previous, { id: crypto.randomUUID(), role: 'user', text, language }, response]);
    setDraft('');
    if (autoRead) window.setTimeout(() => speak(response.id, answer, language), 0);
  };
  const setReadReplies = (enabled: boolean) => {
    setAutoRead(enabled);
    localStorage.setItem('ellie-app-auto-read', String(enabled));
  };
  const routeLabel = (route?: string) => route?.startsWith('/app/diagnosis') ? messages.diagnosisTab : messages.helpTab;

  return <div className="patient-app-screen">
    <PageHeading title={messages.askHeading} subtitle={messages.askSub} language={language} />
    <AppCard title={messages.assistantLabel} text={messages.assistantLabel} language={language} className="patient-app-assistant-label">
      <p>{messages.assistantLabel}</p>
      <label className="patient-app-auto-read"><input type="checkbox" checked={autoRead} onChange={(event) => setReadReplies(event.target.checked)} />{messages.autoRead}</label>
    </AppCard>
    <section className="patient-app-chat" aria-label={messages.askHeading} aria-live="polite">
      {chat.map((message) => <div className={`patient-app-message-row ${message.role}`} key={message.id}>
        {message.role === 'assistant' && <div className="patient-app-message-actions"><SpeakButton text={message.text || greeting} language={message.language} /><div className="patient-app-message assistant" data-speech-text={message.text}>{message.text}</div></div>}
        {message.role === 'user' && <div className="patient-app-message-actions"><div className="patient-app-message user" data-speech-text={message.text}>{message.text}</div><SpeakButton text={message.text} language={message.language} /></div>}
        {message.route && <Link className="patient-app-chat-link" to={message.route}>{routeLabel(message.route)} →</Link>}
      </div>)}
    </section>
    <form className="patient-app-chat-form" onSubmit={send}>
      <label className="sr-only" htmlFor="patient-app-chat-input">{messages.messagePlaceholder}</label>
      <input id="patient-app-chat-input" value={draft} onChange={(event) => setDraft(event.target.value)} placeholder={messages.messagePlaceholder} />
      <VoiceInputButton language={language as PatientLanguage} onTranscript={(transcript) => setDraft((previous) => previous ? `${previous} ${transcript}` : transcript)} />
      <button type="submit" className="patient-app-primary" disabled={!draft.trim()}>{messages.send}</button>
    </form>
  </div>;
}
