import { useEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { elliePatients } from '../../data/ellieDemo';
import { useDemoStore } from '../../state/DemoStore';
import { Composer, Icon } from '../components';
import type { IconName } from '../components';
import { useLanguage } from '../useLanguage';
import { usePreferredName } from '../usePreferredName';
import { useVoiceInput } from '../useSpeech';

export default function PatientAppHome() {
  const { state } = useDemoStore();
  const { language, messages } = useLanguage();
  const [searchParams] = useSearchParams();
  const demoVoice = import.meta.env.DEV && searchParams.get('demoVoice') === '1';
  const demoTranscript = 'I have a question about my recent health numbers.';
  const patient = elliePatients.find((item) => item.id === state.patientId) ?? elliePatients[0];
  const [preferredName] = usePreferredName(patient.id);
  const [draft, setDraft] = useState('');
  const [voiceActive, setVoiceActive] = useState(demoVoice);
  const [voiceProcessing, setVoiceProcessing] = useState(false);
  const voiceSubmitted = useRef(false);
  const navigate = useNavigate();
  const ask = (text: string) => navigate(`/app/ask?q=${encodeURIComponent(text)}`);
  const finishVoice = (transcript: string) => {
    if (!transcript.trim() || voiceSubmitted.current) return;
    voiceSubmitted.current = true;
    setVoiceProcessing(true);
    window.setTimeout(() => {
      setVoiceActive(false);
      setVoiceProcessing(false);
      ask(transcript.trim());
    }, 700);
  };
  const voice = useVoiceInput(language, finishVoice);
  useEffect(() => {
    setVoiceActive(demoVoice);
    if (!demoVoice) setVoiceProcessing(false);
  }, [demoVoice]);
  const displayedTranscript = voice.transcript || (demoVoice ? demoTranscript : '');
  const stopVoice = () => {
    if (voice.listening) voice.toggle();
    if (!displayedTranscript.trim()) {
      voice.clearTranscript();
      setVoiceActive(false);
    }
  };
  const toggleVoice = () => {
    if (!voice.supported) return;
    if (voice.listening) {
      stopVoice();
      return;
    }
    voiceSubmitted.current = false;
    voice.clearTranscript();
    setVoiceActive(true);
    setVoiceProcessing(false);
    voice.toggle();
  };
  const sendVoice = () => {
    const transcript = displayedTranscript.trim();
    if (!transcript) return;
    if (voice.listening) voice.toggle();
    finishVoice(transcript);
  };
  const topics: { to: string; icon: IconName; title: string }[] = [
    { to: '/app/diagnosis', icon: 'book', title: messages.homeTopicDiagnosis },
    { to: '/app/resources?category=transportation', icon: 'bus', title: messages.homeTopicResources },
    { to: '/app/ask?q=Show%20my%20recent%20activity%20and%20health%20numbers', icon: 'heart', title: messages.homeTopicHealth },
    { to: '/app/resources?category=emotional', icon: 'lifebuoy', title: messages.homeTopicWorried },
  ];
  const voiceStyle = { '--voice-level': demoVoice ? 0.5 : voice.level } as CSSProperties;

  return <div className="patient-app-screen patient-app-home-screen">
    <p className="patient-app-home-eyebrow">{messages.homeEyebrow}</p>
    <section className="patient-app-home-intro">
      <h1>{messages.homeHiPrefix} <span>Ellie.</span></h1>
      <p>{messages.homeSupportQuestion.replace('{name}', preferredName ? `, ${preferredName}` : '')}</p>
    </section>
    <button
      type="button"
      className={`patient-app-home-voice ${voiceActive ? 'is-listening' : ''} ${voiceProcessing ? 'is-processing' : ''}`}
      style={voiceStyle}
      onClick={toggleVoice}
      disabled={!voice.supported}
      aria-label={voice.listening ? messages.voiceStop : messages.homeVoiceIdle}
      aria-pressed={voice.listening}
    >
      <span className="patient-app-home-voice-core"><Icon name="mic" size={32} /></span>
    </button>
    <p className="patient-app-home-voice-label" role={voiceActive ? 'status' : undefined}>
      {voiceProcessing ? messages.voiceProcessing : voice.listening || demoVoice && voiceActive ? messages.homeVoiceListening : messages.homeVoiceIdle}
    </p>
    {voiceActive && <p className="patient-app-home-transcript" aria-live="polite">{displayedTranscript || messages.voiceTranscriptWaiting}</p>}
    {!voiceActive && <p className="patient-app-home-voice-hint">{messages.homeVoiceHint}</p>}
    {!voice.supported && <p className="patient-app-home-voice-hint">{messages.voiceUnavailable}</p>}
    {voiceActive && !voiceProcessing && <div className="patient-app-home-voice-actions">
      <button type="button" className="patient-app-text-button" onClick={stopVoice}>{messages.voiceStopShort}</button>
      {displayedTranscript.trim() && <button type="button" className="patient-app-primary" onClick={sendVoice}>{messages.voiceSendTranscript}</button>}
    </div>}
    <div className="patient-app-home-composer">
      <Composer value={draft} onChange={setDraft} onSubmit={ask} language={language} placeholder={messages.homeAskQuestion} inputId="patient-app-home-input" />
    </div>
    <p className="patient-app-home-explore">{messages.homeExploreTopic}</p>
    <nav className="patient-app-home-topics" aria-label={messages.quickActions}>
      {topics.map((topic) => <Link key={topic.to} to={topic.to} className="patient-app-home-topic">
        <Icon name={topic.icon} size={20} />
        <span>{topic.title}</span>
      </Link>)}
    </nav>
  </div>;
}
