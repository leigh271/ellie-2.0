import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import type { PatientLanguage } from '../../state/DemoStore';
import { companionDestination, companionReply, isEmergencyMessage } from '../../lib/companion';
import { AppCard, Composer, PageHeading } from '../components';
import { useLanguage } from '../useLanguage';
import { SpeakButton, useSpeech } from '../useSpeech';

type ChatMessage = { id: string; role: 'user' | 'assistant'; text: string; route?: string; language: PatientLanguage };

export default function AskScreen() {
  const { language, messages } = useLanguage();
  const { speak } = useSpeech();
  const [chat, setChat] = useState<ChatMessage[]>(() => [{ id: 'welcome', role: 'assistant', text: messages.defaultAssistant, language }]);
  const [draft, setDraft] = useState('');
  const [aiEnabled, setAiEnabled] = useState(false);
  const [replying, setReplying] = useState(false);
  const [autoRead, setAutoRead] = useState(() => localStorage.getItem('ellie-app-auto-read') === 'true');
  const [searchParams, setSearchParams] = useSearchParams();
  const handledQuery = useRef<string | null>(null);
  useEffect(() => {
    let active = true;
    fetch('/api/ai/status')
      .then((response) => response.ok ? response.json() as Promise<{ enabled: boolean }> : Promise.reject(new Error('status unavailable')))
      .then((status) => { if (active) setAiEnabled(status.enabled); })
      .catch(() => { if (active) setAiEnabled(false); });
    return () => { active = false; };
  }, []);
  const respond = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    const userMessage: ChatMessage = { id: crypto.randomUUID(), role: 'user', text: trimmed, language };
    setChat((previous) => [...previous, userMessage]);
    setDraft('');
    const addReply = (answer: string) => {
      const response: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        text: answer,
        route: companionDestination(trimmed, language),
        language,
      };
      setChat((previous) => [...previous, response]);
      if (autoRead) window.setTimeout(() => speak(response.id, answer, language), 0);
    };
    if (isEmergencyMessage(trimmed, language) || !aiEnabled) {
      addReply(companionReply(trimmed, language));
      return;
    }
    setReplying(true);
    const messagesToSend = [...chat, userMessage]
      .slice(-12)
      .map(({ role, text: messageText }) => ({ role, text: messageText }));
    try {
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ language, messages: messagesToSend }),
      });
      if (!response.ok) throw new Error('AI unavailable');
      const body = await response.json() as { reply?: string };
      addReply(body.reply || companionReply(trimmed, language));
    } catch {
      addReply(companionReply(trimmed, language));
    } finally {
      setReplying(false);
    }
  };
  useEffect(() => {
    const query = searchParams.get('q')?.trim();
    if (!query || handledQuery.current === query) return;
    handledQuery.current = query;
    respond(query);
    setSearchParams({}, { replace: true });
  }, [searchParams]);
  const setReadReplies = (enabled: boolean) => {
    setAutoRead(enabled);
    localStorage.setItem('ellie-app-auto-read', String(enabled));
  };
  const routeLabel = (route?: string) => route?.startsWith('/app/diagnosis') ? messages.diagnosisTab : messages.helpTab;

  return <div className="patient-app-screen">
    <PageHeading title={messages.askHeading} subtitle={messages.askSub} language={language} />
    <AppCard title={aiEnabled ? messages.aiAssistantLabel : messages.assistantLabel} language={language} className="patient-app-assistant-label">
      <label className="patient-app-auto-read"><input type="checkbox" checked={autoRead} onChange={(event) => setReadReplies(event.target.checked)} />{messages.autoRead}</label>
    </AppCard>
    <section className="patient-app-chat" aria-label={messages.askHeading} aria-live="polite">
      {chat.map((message) => <div className={`patient-app-message-row ${message.role}`} key={message.id}>
        {message.role === 'assistant' && <div className="patient-app-message-actions"><SpeakButton text={message.text} language={message.language} /><div className="patient-app-message assistant" data-speech-text={message.text}><strong className="bubble-name">Ellie ✿</strong>{message.text}</div></div>}
        {message.role === 'user' && <div className="patient-app-message-actions"><div className="patient-app-message user" data-speech-text={message.text}>{message.text}</div><SpeakButton text={message.text} language={message.language} /></div>}
        {message.route && <Link className="patient-app-chat-link" to={message.route}>{routeLabel(message.route)} →</Link>}
      </div>)}
      {replying && <div className="patient-app-typing" role="status" aria-live="polite">{messages.aiTyping}</div>}
    </section>
    <Composer value={draft} onChange={setDraft} onSubmit={respond} language={language} placeholder={messages.messagePlaceholder} inputId="patient-app-chat-input" />
  </div>;
}
