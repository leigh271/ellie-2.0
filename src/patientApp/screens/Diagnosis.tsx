import { useCallback, useEffect, useMemo, useState } from 'react';
import { elliePatients } from '../../data/ellieDemo';
import { formatDatasetNumber, useDataset } from '../../data/datasets';
import type { PatientLinksDataset } from '../../data/patientLinks';
import type { PatientLanguage } from '../../state/DemoStore';
import type { DiagnosisKey, LocalizedVariants, PhaseKey, SectionKey } from '../content/diagnoses';
import { diagnoses, localizedDiagnosisKey, phaseContent, phaseKey, sectionContent } from '../content/diagnoses';
import type { GlossaryTerm } from '../content/glossary';
import { AppCard, GlossarySheet, GlossaryText, PageHeading } from '../components';
import { useDemoStore } from '../../state/DemoStore';
import type { Messages } from '../i18n';
import { useLanguage } from '../useLanguage';

const sectionKeys: SectionKey[] = ['what', 'phase', 'common', 'care', 'call', 'questions'];

function DiagnosisSection({ section, title, variants, language, messages, savedQuestions, aiEnabled, aiLoading, aiExplanation, onExplain, onSave, onGlossary }: {
  section: SectionKey;
  title: string;
  variants: LocalizedVariants;
  language: PatientLanguage;
  messages: Messages;
  savedQuestions: string[];
  aiEnabled: boolean;
  aiLoading: boolean;
  aiExplanation: string;
  onExplain: (mode: 'simple' | 'full') => void;
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
      <button type="button" className="patient-app-text-button" disabled={!aiEnabled || aiLoading} onClick={() => onExplain(simple ? 'simple' : 'full')}>{aiLoading ? messages.aiTyping : messages.explainWithAI}</button>
    </div>
    {!aiEnabled && section === 'what' && <p className="patient-app-caption">{messages.aiNotConfigured}</p>}
    {aiExplanation && <div className="patient-app-ai-explanation"><b>{messages.aiGeneratedReview}</b><p>{aiExplanation}</p></div>}
  </AppCard>;
}

export default function DiagnosisScreen() {
  const { state, update, log } = useDemoStore();
  const { language, messages } = useLanguage();
  const patient = elliePatients.find((item) => item.id === state.patientId) ?? elliePatients[0];
  const linkedData = useDataset<PatientLinksDataset>('patient_links.json');
  const linked = linkedData.data?.patients[patient.id];
  const diagnosisKey: DiagnosisKey = localizedDiagnosisKey(patient.diagnosis);
  const diagnosis = diagnoses[diagnosisKey];
  const patientPhase: PhaseKey = phaseKey(patient.phase);
  const phaseLabel = patientPhase === 'Recovery' ? messages.phaseRecovery : patientPhase === 'Long-term care' ? messages.phaseLongTerm : messages.phaseSurvivorship;
  const savedQuestions = state.patientQuestions[patient.id] ?? [];
  const [activeTerm, setActiveTerm] = useState<GlossaryTerm | null>(null);
  const [notice, setNotice] = useState('');
  const [aiEnabled, setAiEnabled] = useState(false);
  const [aiLoadingSection, setAiLoadingSection] = useState<SectionKey | null>(null);
  const [aiExplanations, setAiExplanations] = useState<Partial<Record<SectionKey, string>>>({});
  useEffect(() => {
    let active = true;
    fetch('/api/ai/status')
      .then((response) => response.ok ? response.json() as Promise<{ enabled: boolean }> : Promise.reject(new Error('status unavailable')))
      .then((status) => { if (active) setAiEnabled(status.enabled); })
      .catch(() => { if (active) setAiEnabled(false); });
    return () => { active = false; };
  }, []);
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
  const explainWithAI = async (section: SectionKey, mode: 'simple' | 'full') => {
    if (!aiEnabled) return;
    setAiLoadingSection(section);
    try {
      const response = await fetch('/api/ai/explain', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          language,
          diagnosis: diagnosis.name[language],
          phase: phaseLabel,
          mode,
        }),
      });
      if (!response.ok) return;
      const body = await response.json() as { text?: string };
      if (body.text) setAiExplanations((previous) => ({ ...previous, [section]: body.text }));
    } catch {
      setAiExplanations((previous) => ({ ...previous, [section]: '' }));
    } finally {
      setAiLoadingSection(null);
    }
  };
  const phaseText = `${messages.phase}: ${phaseLabel}`;
  const healthNumbers = linked ? [
    { label: messages.healthHbA1c, value: linked.nhanes.hba1c_pct, unit: '%', meaning: messages.meaningHbA1c, digits: 2 },
    { label: messages.healthBmi, value: linked.nhanes.bmi, unit: 'kg/m²', meaning: messages.meaningBmi, digits: 1 },
    { label: messages.healthSensorSleep, value: linked.nhanes.sensor_sleep_hours_per_day, unit: 'hours/day', meaning: messages.meaningSensorSleep, digits: 1 },
    { label: messages.healthMovement, value: linked.nhanes.movement_per_day_mims, unit: 'MIMS/day', meaning: messages.meaningMovement, digits: 0 },
  ] : [];
  const nhanesSource = linked
    ? messages.linkedNhanesSource
      .replace('{years}', String(linked.nhanes.survey_years ?? ''))
      .replace('{id}', String(linked.nhanes.person_id))
    : '';
  const healthNumbersText = healthNumbers.map((item) => `${item.label}: ${item.value === null ? '—' : formatDatasetNumber(item.value, item.digits)} ${item.unit}. ${item.meaning}`).join(' ');

  return <div className="patient-app-screen">
    <PageHeading title={messages.diagnosisHeading} subtitle={messages.diagnosisSub} language={language} />
    <AppCard title={messages.diagnosis} text={`${messages.diagnosis}: ${diagnosis.name[language]}. ${phaseText}.`} language={language} className="patient-app-diagnosis-summary">
      <p className="patient-app-diagnosis-name">{diagnosis.name[language]}</p>
      <p className="patient-app-caption">{phaseText}</p>
      <p className="patient-app-glossary-hint">{messages.glossaryHow}</p>
    </AppCard>
    {linked && <AppCard title={messages.healthNumbersHeading} text={`${healthNumbersText} ${messages.askCareTeamNumbers} ${nhanesSource} ${messages.linkedRecordCaveat}`} language={language} className="patient-app-health-numbers">
      <div className="patient-app-health-numbers-grid">
        {healthNumbers.map((item) => <section className="patient-app-health-number" key={item.label}>
          <span className="patient-app-caption">{item.label}</span>
          <b>{item.value === null ? '—' : formatDatasetNumber(item.value, item.digits)} <span>{item.unit}</span></b>
          <p>{item.meaning}</p>
        </section>)}
      </div>
      <p className="patient-app-prompt">{messages.askCareTeamNumbers}</p>
      <p className="patient-app-caption">{nhanesSource}</p>
      <p className="patient-app-caption">{messages.linkedRecordCaveat}</p>
    </AppCard>}
    {sectionKeys.map((section) => <DiagnosisSection
      key={section}
      section={section}
      title={labels[section]}
      variants={sections[section]}
      language={language}
      messages={messages}
      savedQuestions={savedQuestions}
      aiEnabled={aiEnabled}
      aiLoading={aiLoadingSection === section}
      aiExplanation={aiExplanations[section] ?? ''}
      onExplain={(mode) => { void explainWithAI(section, mode); }}
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
