import { useCallback, useMemo, useState } from 'react';
import { elliePatients } from '../../data/ellieDemo';
import type { PatientLanguage } from '../../state/DemoStore';
import type { DiagnosisKey, LocalizedVariants, PhaseKey, SectionKey } from '../content/diagnoses';
import { diagnoses, localizedDiagnosisKey, phaseContent, phaseKey, sectionContent } from '../content/diagnoses';
import type { GlossaryTerm } from '../content/glossary';
import { AppCard, GlossarySheet, GlossaryText, PageHeading } from '../components';
import { useDemoStore } from '../../state/DemoStore';
import type { Messages } from '../i18n';
import { useLanguage } from '../useLanguage';

const sectionKeys: SectionKey[] = ['what', 'phase', 'common', 'care', 'call', 'questions'];

function DiagnosisSection({ section, title, variants, language, messages, savedQuestions, onSave, onGlossary }: {
  section: SectionKey;
  title: string;
  variants: LocalizedVariants;
  language: PatientLanguage;
  messages: Messages;
  savedQuestions: string[];
  onSave: (question: string) => void;
  onGlossary: (term: GlossaryTerm) => void;
}) {
  const [simple, setSimple] = useState(false);
  const [english, setEnglish] = useState(false);
  const displayLanguage = english ? 'en' : language;
  const lines = variants[displayLanguage][simple ? 'simple' : 'full'];
  const speakText = `${title}. ${lines.join(' ')}`;
  return <AppCard title={title} text={speakText} language={displayLanguage} className={`diagnosis-section diagnosis-section-${section}`}>
    <ul className="patient-app-education-list">
      {lines.map((line) => <li key={line}>
        <span><GlossaryText text={line} language={displayLanguage} onTerm={onGlossary} /></span>
        {section === 'questions' && <button className="patient-app-save-question" type="button" onClick={() => onSave(line)} disabled={savedQuestions.includes(line)}>{savedQuestions.includes(line) ? `✓ ${messages.saved}` : messages.saveToQuestions}</button>}
      </li>)}
    </ul>
    <div className="patient-app-card-controls">
      <button type="button" className="patient-app-text-button" onClick={() => setSimple((value) => !value)}>{simple ? '↗ ' : '↓ '}{simple ? messages.showFuller : messages.explainSimpler}</button>
      {language !== 'en' && <button type="button" className="patient-app-text-button" onClick={() => setEnglish((value) => !value)}>{english ? messages.showMyLanguage : messages.showEnglish}</button>}
    </div>
  </AppCard>;
}

export default function DiagnosisScreen() {
  const { state, update, log } = useDemoStore();
  const { language, messages } = useLanguage();
  const patient = elliePatients.find((item) => item.id === state.patientId) ?? elliePatients[0];
  const diagnosisKey: DiagnosisKey = localizedDiagnosisKey(patient.diagnosis);
  const diagnosis = diagnoses[diagnosisKey];
  const patientPhase: PhaseKey = phaseKey(patient.phase);
  const phaseLabel = patientPhase === 'Recovery' ? messages.phaseRecovery : patientPhase === 'Long-term care' ? messages.phaseLongTerm : messages.phaseSurvivorship;
  const savedQuestions = state.patientQuestions[patient.id] ?? [];
  const [activeTerm, setActiveTerm] = useState<GlossaryTerm | null>(null);
  const [notice, setNotice] = useState('');
  const closeGlossary = useCallback(() => setActiveTerm(null), []);
  const sections = useMemo<Record<SectionKey, LocalizedVariants>>(() => ({
    what: diagnosis.what,
    phase: phaseContent[patientPhase],
    common: sectionContent.common,
    care: sectionContent.care,
    call: sectionContent.call,
    questions: sectionContent.questions,
  }), [diagnosis, patientPhase]);
  const labels: Record<SectionKey, string> = {
    what: messages.whatItIs,
    phase: messages.phaseMeans,
    common: messages.commonChanges,
    care: messages.careForYourself,
    call: messages.whenCall,
    questions: messages.questionsToAsk,
  };
  const saveQuestion = (question: string) => {
    if (savedQuestions.includes(question)) return;
    update((previous) => ({
      ...previous,
      patientQuestions: { ...previous.patientQuestions, [patient.id]: [...(previous.patientQuestions[patient.id] ?? []), question] },
    }));
    log('Patient question saved', patient.id, 'A question was saved from the patient app.');
    setNotice(messages.questionSaved);
    window.setTimeout(() => setNotice(''), 3000);
  };
  const phaseText = `${messages.phase}: ${phaseLabel}`;

  return <div className="patient-app-screen">
    <PageHeading title={messages.diagnosisHeading} subtitle={messages.diagnosisSub} language={language} />
    <AppCard title={messages.diagnosis} text={`${messages.diagnosis}: ${diagnosis.name[language]}. ${phaseText}.`} language={language} className="patient-app-diagnosis-summary">
      <p className="patient-app-diagnosis-name">{diagnosis.name[language]}</p>
      <p className="patient-app-caption">{phaseText}</p>
      <p className="patient-app-glossary-hint">{messages.glossaryHow}</p>
    </AppCard>
    {sectionKeys.map((section) => <DiagnosisSection
      key={section}
      section={section}
      title={labels[section]}
      variants={sections[section]}
      language={language}
      messages={messages}
      savedQuestions={savedQuestions}
      onSave={saveQuestion}
      onGlossary={setActiveTerm}
    />)}
    <AppCard title={messages.educationDisclaimer} text={messages.educationDisclaimer} language={language} className="patient-app-safety-note">
      <p>{messages.educationDisclaimer}</p>
    </AppCard>
    {notice && <div className="patient-app-toast inline-toast" role="status" aria-live="polite">{notice}</div>}
    <GlossarySheet term={activeTerm} onClose={closeGlossary} />
  </div>;
}
