import { useEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { elliePatients } from '../../data/ellieDemo';
import { useDemoStore } from '../../state/DemoStore';
import { Composer, DictationWaveform, Icon } from '../components';
import type { IconName } from '../components';
import { useLanguage } from '../useLanguage';
import { usePreferredName } from '../usePreferredName';
import { formatDictationTime, useDictation } from '../useDictation';
import { useVoiceInput } from '../useSpeech';

export default function PatientAppHome() {
  const { state } = useDemoStore();
  const { language, messages } = useLanguage();
  const [searchParams] = useSearchParams();
  const demoVoice = import.meta.env.DEV && searchParams.get('demoVoice') === '1';
  const demoRecording = import.meta.env.DEV && searchParams.get('demoHomeDictation') === 'recording';
  const demoTranscript = 'I have a question about my recent health numbers.';
  const patient = elliePatients.find((item) => item.id === state.patientId) ?? elliePatients[0];
  const [preferredName] = usePreferredName(patient.id);
  const [draft, setDraft] = useState('');
  const [voiceActive, setVoiceActive] = useState(demoVoice);
  const [voiceProcessing, setVoiceProcessing] = useState(false);
  const [voiceUnavailable, setVoiceUnavailable] = useState(false);
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
  const startSpeechFallback = () => {
    if (!voice.supported) {
      setVoiceActive(false);
      setVoiceUnavailable(true);
      return;
    }
    setVoiceUnavailable(false);
    voice.clearTranscript();
    setVoiceActive(true);
    voice.toggle();
  };
  const dictation = useDictation(language, finishVoice, startSpeechFallback);
  useEffect(() => {
    setVoiceActive(demoVoice || demoRecording);
    if (!demoVoice && !demoRecording) setVoiceProcessing(false);
  }, [demoVoice, demoRecording]);
  const displayedTranscript = voice.transcript || (demoVoice || demoRecording ? demoTranscript : '');
  const nativeRecording = dictation.state === 'recording' || demoRecording;
  const transcribing = dictation.state === 'transcribing';
  const voiceActiveNow = voiceActive || nativeRecording || transcribing;
  const stopVoice = () => {
    if (dictation.state === 'recording') dictation.cancel();
    if (voice.listening) voice.toggle();
    if (!displayedTranscript.trim() || nativeRecording) {
      voice.clearTranscript();
      setVoiceActive(false);
    }
  };
  const toggleVoice = async () => {
    if (!voice.supported && !dictation.canRecord || dictation.state === 'recording' || transcribing) return;
    if (voice.listening) {
      stopVoice();
      return;
    }
    voiceSubmitted.current = false;
    voice.clearTranscript();
    setVoiceActive(true);
    setVoiceProcessing(false);
    setVoiceUnavailable(false);
    const result = await dictation.start();
    if (result === 'fallback') startSpeechFallback();
    if (result === 'permission') setVoiceActive(false);
  };
  const sendVoice = () => {
    if (dictation.state === 'recording') {
      dictation.confirm();
      return;
    }
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
  const voiceStyle = { '--voice-level': demoRecording ? 0.5 : nativeRecording ? dictation.level : demoVoice ? 0.5 : voice.level } as CSSProperties;
  const demoLevels = Array.from({ length: 40 }, (_, index) => 0.16 + Math.abs(Math.sin(index * 0.71)) * 0.6);

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
      disabled={!voice.supported && !dictation.canRecord}
      aria-label={voice.listening || nativeRecording ? messages.voiceStop : messages.homeVoiceIdle}
      aria-pressed={voice.listening || nativeRecording}
    >
      <span className="patient-app-home-voice-core"><Icon name="mic" size={32} /></span>
    </button>
    <p className="patient-app-home-voice-label" role={voiceActiveNow ? 'status' : undefined} aria-live="polite">
      {transcribing ? messages.voiceTranscribing : voiceProcessing ? messages.voiceProcessing : voice.listening || nativeRecording || demoVoice && voiceActive ? messages.voiceRecording : messages.homeVoiceIdle}
    </p>
    {voiceActiveNow && !nativeRecording && !transcribing && <p className="patient-app-home-transcript" aria-live="polite">{displayedTranscript || messages.voiceTranscriptWaiting}</p>}
    {!voiceActiveNow && <p className="patient-app-home-voice-hint">{messages.homeVoiceHint}</p>}
    {dictation.error === 'permission' && <p className="patient-app-home-voice-hint" role="alert">{messages.voicePermissionDenied}</p>}
    {voiceUnavailable || !voice.supported && !dictation.canRecord ? <p className="patient-app-home-voice-hint">{messages.voiceUnavailable}</p> : null}
    {nativeRecording && <div className="patient-app-home-recording" aria-live="polite">
      <DictationWaveform levels={demoRecording ? demoLevels : dictation.levels} />
      <span className="dictation-timer">{demoRecording ? '00:07' : formatDictationTime(dictation.elapsedMs)}</span>
    </div>}
    {voiceActiveNow && !voiceProcessing && !transcribing && <div className="patient-app-home-voice-actions">
      <button type="button" className="patient-app-text-button" onClick={stopVoice} aria-label={nativeRecording ? messages.voiceCancelRecording : messages.voiceStop}>{nativeRecording ? '×' : messages.voiceStopShort}</button>
      {(nativeRecording || displayedTranscript.trim()) && <button type="button" className="patient-app-primary" onClick={sendVoice}>{messages.voiceSendTranscript}</button>}
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
