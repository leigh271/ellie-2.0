import { useCallback, useEffect, useMemo, useState } from 'react';
import { elliePatients } from '../../data/ellieDemo';
import { formatDatasetNumber, useDataset } from '../../data/datasets';
import type { PatientLinksDataset } from '../../data/patientLinks';
import type { PatientLanguage } from '../../state/DemoStore';
import type { CheckIn } from '../../state/DemoStore';
import type { DiagnosisKey, LocalizedVariants, PhaseKey, SectionKey } from '../content/diagnoses';
import { diagnoses, localizedDiagnosisKey, phaseContent, phaseKey, sectionContent } from '../content/diagnoses';
import type { GlossaryTerm } from '../content/glossary';
import { AppCard, GlossarySheet, GlossaryText, PageHeading } from '../components';
import { useDemoStore } from '../../state/DemoStore';
import type { Messages } from '../i18n';
import { useLanguage } from '../useLanguage';

const sectionKeys: SectionKey[] = ['what', 'phase', 'common', 'care', 'call', 'questions'];

function average(values: Array<number | null>): number | null {
  const present = values.filter((value): value is number => value !== null);
  return present.length ? present.reduce((sum, value) => sum + value, 0) / present.length : null;
}

function substitute(template: string, values: Record<string, string>): string {
  return Object.entries(values).reduce((text, [key, value]) => text.replaceAll(`{${key}}`, value), template);
}

function comparisonMessage(change: number, messages: Messages): string {
  if (Math.abs(change) <= 5) return messages.activityChangeSame;
  const template = change < 0 ? messages.activityChangeLower : messages.activityChangeHigher;
  return substitute(template, { change: formatDatasetNumber(Math.abs(change), 0) });
}

function patientGoalStatus(value: string | number | null, messages: Messages): string {
  const normalized = String(value ?? '').trim().toLowerCase();
  if (['yes', '1', 'true', 'met'].includes(normalized)) return messages.coachingGoalMet;
  if (['partial', 'partly', 'partially'].includes(normalized)) return messages.coachingGoalPartly;
  return messages.coachingGoalNotYet;
}

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
  const { state, update, log, createTask } = useDemoStore();
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
  const [energy, setEnergy] = useState<CheckIn['energy'] | ''>('');
  const [note, setNote] = useState('');
  const [questionsShared, setQuestionsShared] = useState(false);
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
  const checkIns = state.checkIns.filter((checkin) => checkin.patientId === patient.id || (patient.id === 'maria' && !checkin.patientId));
  const latest = checkIns[0];
  const energyLabels: Record<CheckIn['energy'], string> = { Good: messages.energyGood, Okay: messages.energyOkay, Low: messages.energyLow };
  const wearableSeries = linked?.wearable.series ?? [];
  const usualSteps = average(wearableSeries.slice(0, 14).map((row) => row.steps));
  const recentSteps = average(wearableSeries.slice(14).map((row) => row.steps));
  const usualSleep = average(wearableSeries.slice(0, 14).map((row) => row.sleep_minutes === null ? null : row.sleep_minutes / 60));
  const recentSleep = average(wearableSeries.slice(14).map((row) => row.sleep_minutes === null ? null : row.sleep_minutes / 60));
  const wearableSource = linked ? substitute(messages.linkedWearableSource, { id: String(linked.wearable.person_id) }) : '';
  const activityText = linked ? [
    substitute(messages.recentActivitySteps, { recent: recentSteps === null ? '—' : formatDatasetNumber(recentSteps, 0), usual: usualSteps === null ? '—' : formatDatasetNumber(usualSteps, 0) }),
    comparisonMessage(usualSteps && recentSteps !== null ? ((recentSteps - usualSteps) / usualSteps) * 100 : 0, messages),
    substitute(messages.recentActivitySleep, { recent: recentSleep === null ? '—' : formatDatasetNumber(recentSleep, 1), usual: usualSleep === null ? '—' : formatDatasetNumber(usualSleep, 1) }),
    comparisonMessage(usualSleep && recentSleep !== null ? ((recentSleep - usualSleep) / usualSleep) * 100 : 0, messages),
  ].join(' ') : '';
  const recentGoals = [...(linked?.coaching.weekly_goals ?? [])].sort((a, b) => Number(b.week) - Number(a.week)).slice(0, 4);
  const goalLabel = (goal?: string | number | null) => {
    const text = goal == null ? '' : String(goal);
    return text ? text.charAt(0).toUpperCase() + text.slice(1) : '—';
  };
  const coachingText = recentGoals.map((goal) => `${goalLabel(goal.goal)}: ${patientGoalStatus(goal.goal_met, messages)}`).join('. ');
  const coachingSource = linked ? substitute(messages.linkedCoachingSource, { id: linked.coaching.participant_id }) : '';
  const checkinText = `${messages.checkinQuestion} ${messages.energyGood}, ${messages.energyOkay}, ${messages.energyLow}.`;
  const recordCheckIn = () => {
    if (!energy) return;
    const at = new Date().toISOString();
    const checkin: CheckIn = { id: crypto.randomUUID(), patientId: patient.id, energy, note: note.trim(), at };
    update((previous) => {
      const loop = previous.careLoops[patient.id] ?? { detect: null, understand: null, review: null, act: null, followup: null };
      return {
        ...previous,
        checkIns: [checkin, ...previous.checkIns],
        careLoops: energy === 'Low' && !loop.detect ? { ...previous.careLoops, [patient.id]: { ...loop, detect: at } } : previous.careLoops,
        activity: [{ id: crypto.randomUUID(), at, type: 'Patient app check-in', patientId: patient.id, message: `${patient.name} shared a ${energy.toLowerCase()} energy check-in${note.trim() ? ' with a note' : ''}` }, ...previous.activity],
      };
    });
    setEnergy('');
    setNote('');
  };
  const removeQuestion = (index: number) => update((previous) => ({
    ...previous,
    patientQuestions: { ...previous.patientQuestions, [patient.id]: (previous.patientQuestions[patient.id] ?? []).filter((_, itemIndex) => itemIndex !== index) },
  }));
  const shareQuestions = () => {
    if (!savedQuestions.length) return;
    createTask({
      patientId: patient.id,
      title: 'Patient questions for next visit',
      source: 'Patient app',
      assignee: 'Navigator',
      dueDate: '',
      status: 'Open',
      outcome: '',
      shareWithPatient: false,
      patientMessage: '',
      details: savedQuestions.map((question) => `• ${question}`).join('\n'),
    });
    setQuestionsShared(true);
  };

  return <div className="patient-app-screen">
    <PageHeading title={messages.diagnosisHeading} subtitle={messages.diagnosisSub} language={language} />
    <section className="patient-app-my-health">
      <h2 className="patient-app-section-heading">{messages.myHealth}</h2>
      {linked && <AppCard title={messages.recentActivityHeading} text={`${activityText} ${wearableSource} ${messages.linkedRecordCaveat}`} language={language} className="patient-app-linked-activity">
        <p className="patient-app-caption">{messages.recentActivitySub}</p>
        <p className="patient-app-linked-metric">{substitute(messages.recentActivitySteps, { recent: recentSteps === null ? '—' : formatDatasetNumber(recentSteps, 0), usual: usualSteps === null ? '—' : formatDatasetNumber(usualSteps, 0) })}</p>
        <p className="patient-app-small-comparison">{comparisonMessage(usualSteps && recentSteps !== null ? ((recentSteps - usualSteps) / usualSteps) * 100 : 0, messages)}</p>
        <p className="patient-app-linked-metric">{substitute(messages.recentActivitySleep, { recent: recentSleep === null ? '—' : formatDatasetNumber(recentSleep, 1), usual: usualSleep === null ? '—' : formatDatasetNumber(usualSleep, 1) })}</p>
        <p className="patient-app-small-comparison">{comparisonMessage(usualSleep && recentSleep !== null ? ((recentSleep - usualSleep) / usualSleep) * 100 : 0, messages)}</p>
        <p className="patient-app-caption">{wearableSource}</p>
        <p className="patient-app-caption">{messages.linkedRecordCaveat}</p>
      </AppCard>}
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
      {linked && <AppCard title={messages.coachingGoalsHeading} text={`${coachingText} ${coachingSource} ${messages.linkedRecordCaveat}`} language={language} className="patient-app-coaching-goals">
        {recentGoals.map((goal, index) => <div className="patient-app-goal-row" key={`${goal.week}-${goal.topic}-${index}`}>
          <span>{goalLabel(goal.goal)}</span><span className="patient-app-status">{patientGoalStatus(goal.goal_met, messages)}</span>
        </div>)}
        <p className="patient-app-caption">{coachingSource}</p>
        <p className="patient-app-caption">{messages.linkedRecordCaveat}</p>
      </AppCard>}
    </section>
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
    <AppCard title={messages.wellnessCheckin} text={checkinText} language={language}>
      <p className="patient-app-prompt">{messages.checkinQuestion}</p>
      <div className="patient-app-energy-options" role="group" aria-label={messages.checkinQuestion}>
        {(['Good', 'Okay', 'Low'] as const).map((option) => <button type="button" key={option} className={`patient-app-choice ${energy === option ? 'selected' : ''}`} aria-pressed={energy === option} onClick={() => setEnergy(option)}>{energyLabels[option]}</button>)}
      </div>
      <label className="patient-app-field">{messages.optionalNote}
        <textarea rows={2} value={note} onChange={(event) => setNote(event.target.value)} placeholder={messages.checkinPlaceholder} />
      </label>
      <button type="button" className="patient-app-primary" disabled={!energy} onClick={recordCheckIn}>{messages.shareCheckin}</button>
      {latest && <p className="patient-app-caption">{messages.lastCheckin}: {energyLabels[latest.energy]} · {new Date(latest.at).toLocaleDateString(language === 'en' ? 'en-US' : language === 'es' ? 'es-US' : 'fr')}</p>}
    </AppCard>
    <AppCard title={messages.questionsTitle} text={`${messages.questionsTitle}. ${savedQuestions.join('. ')}`} language={language}>
      {savedQuestions.length ? <ul className="patient-app-question-list">{savedQuestions.map((question, index) => <li key={`${question}-${index}`}><span>{question}</span><button type="button" className="patient-app-text-button" aria-label={`${messages.questionRemoved}: ${question}`} onClick={() => removeQuestion(index)}>×</button></li>)}</ul> : <p className="patient-app-empty">{messages.noQuestions}</p>}
      {savedQuestions.length > 0 && <button type="button" className="patient-app-secondary" onClick={shareQuestions} disabled={questionsShared}>{messages.shareQuestions}</button>}
      {questionsShared && <p className="patient-app-success" role="status" aria-live="polite">{messages.questionsShared}</p>}
    </AppCard>
    {notice && <div className="patient-app-toast inline-toast" role="status" aria-live="polite">{notice}</div>}
    <GlossarySheet term={activeTerm} onClose={closeGlossary} />
  </div>;
}
