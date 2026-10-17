import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import type { PatientLanguage } from '../../state/DemoStore';
import { companionDestination, companionReply, companionResourceCategory, isEmergencyMessage } from '../../lib/companion';
import { Icon, Composer } from '../components';
import type { ResourceCategory } from '../content/resources';
import { resources } from '../content/resources';
import { useLanguage } from '../useLanguage';
import { SpeakButton, useSpeech } from '../useSpeech';

type ChatMessage = {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  route?: string;
  resourceCategory?: ResourceCategory;
  language: PatientLanguage;
  createdAt: string;
};

const categoryLabel = {
  transportation: 'resourceTransportation',
  emotional: 'resourceEmotional',
  local: 'resourceLocal',
} as const;

export default function AskScreen() {
  const { language, messages } = useLanguage();
  const { speak } = useSpeech();
  const [searchParams, setSearchParams] = useSearchParams();
  const [chat, setChat] = useState<ChatMessage[]>(() => [{
    id: 'welcome',
    role: 'assistant' as const,
    text: messages.defaultAssistant,
    language,
    createdAt: new Date().toISOString(),
  }].filter(() => !searchParams.get('q')?.trim()));
  const [draft, setDraft] = useState('');
  const [aiEnabled, setAiEnabled] = useState(false);
  const [replying, setReplying] = useState(false);
  const [autoRead, setAutoRead] = useState(() => localStorage.getItem('ellie-app-auto-read') === 'true');
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
    const userMessage: ChatMessage = { id: crypto.randomUUID(), role: 'user', text: trimmed, language, createdAt: new Date().toISOString() };
    setChat((previous) => [...previous, userMessage]);
    setDraft('');
    const resourceCategory = companionResourceCategory(trimmed, language);
    const addReply = (answer: string) => {
      const response: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        text: answer,
        route: companionDestination(trimmed, language),
        resourceCategory,
        language,
        createdAt: new Date().toISOString(),
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
    void respond(query);
    setSearchParams({}, { replace: true });
  }, [searchParams]);

  const setReadReplies = (enabled: boolean) => {
    setAutoRead(enabled);
    localStorage.setItem('ellie-app-auto-read', String(enabled));
  };
  const routeLabel = (route?: string) => route?.startsWith('/app/diagnosis') ? messages.diagnosisTab : messages.helpTab;
  const formatTime = (date: string, messageLanguage: PatientLanguage) => new Intl.DateTimeFormat(
    messageLanguage === 'en' ? 'en-US' : messageLanguage === 'es' ? 'es-US' : 'fr',
    { hour: 'numeric', minute: '2-digit' },
  ).format(new Date(date));

  return <div className="patient-app-screen patient-app-ask-screen">
    <div className="patient-app-chat-heading">
      <div><h1>{messages.askHeading}</h1><p>{aiEnabled ? messages.aiAssistantLabel : messages.assistantLabel}</p></div>
      <label className="patient-app-auto-read"><input type="checkbox" checked={autoRead} onChange={(event) => setReadReplies(event.target.checked)} />{messages.autoRead}</label>
    </div>
    <section className="patient-app-chat" aria-label={messages.askHeading} aria-live="polite">
      {chat.map((message) => <div className={`patient-app-message-row ${message.role}`} key={message.id}>
        {message.role === 'assistant' && <>
          <div className="patient-app-message assistant" data-speech-text={message.text}>
            <div className="patient-app-message-title"><Icon name="sparkles" size={18} /><strong>Ellie</strong><SpeakButton text={message.text} language={message.language} /></div>
            <p>{message.text}</p>
          </div>
          {message.resourceCategory && <div className="patient-app-chat-resources">
            <p className="patient-app-chat-resource-label">{messages[categoryLabel[message.resourceCategory]]}</p>
            {resources.filter((resource) => resource.categories.includes(message.resourceCategory!)).map((resource) => {
              const content = resource.content[message.language];
              return <Link className="patient-app-chat-resource" to={`/app/resources/${resource.id}`} key={resource.id}>
                <span className={`patient-app-resource-thumb icon-${resource.icon}`}><Icon name={resource.icon} size={22} /></span>
                <span className="patient-app-chat-resource-copy"><strong>{content.title}</strong><small>{content.description}</small></span>
                <Icon name="chevronRight" size={18} />
              </Link>;
            })}
          </div>}
          {message.route && !message.resourceCategory && <Link className="patient-app-chat-link" to={message.route}>{routeLabel(message.route)} →</Link>}
        </>}
        {message.role === 'user' && <div className="patient-app-user-message">
          <div className="patient-app-message user" data-speech-text={message.text}>{message.text}</div>
          <div className="patient-app-user-message-meta"><time dateTime={message.createdAt}>{formatTime(message.createdAt, message.language)}</time><SpeakButton text={message.text} language={message.language} /></div>
        </div>}
      </div>)}
      {replying && <div className="patient-app-typing" role="status" aria-live="polite"><span className="typing-spark">✦</span>{messages.aiTyping}<span className="typing-dots" aria-hidden="true"><i /><i /><i /></span></div>}
    </section>
    <div className="patient-app-chat-composer">
      <Composer value={draft} onChange={setDraft} onSubmit={respond} language={language} placeholder={messages.askFollowup} inputId="patient-app-chat-input" />
      <p>{messages.homeDisclaimer}</p>
    </div>
  </div>;
}
