import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { PatientLanguage } from '../../state/DemoStore';
import { useDemoStore } from '../../state/DemoStore';
import { AppCard, PageHeading } from '../components';
import { getMessages, type Messages } from '../i18n';
import { useLanguage } from '../useLanguage';

type NeedKey = 'rides' | 'costs' | 'food' | 'emotional' | 'caregiver' | 'medications' | 'symptoms';

const needDetails: Record<NeedKey, { icon: string; label: keyof Messages; assignee: string; task: string }> = {
  rides: { icon: '↔', label: 'helpRides', assignee: 'Navigator', task: 'Rides to appointments' },
  costs: { icon: '¤', label: 'helpCosts', assignee: 'Navigator', task: 'Help with bills or costs' },
  food: { icon: '♧', label: 'helpFood', assignee: 'Navigator', task: 'Food support' },
  emotional: { icon: '☁', label: 'helpEmotional', assignee: 'Survivorship coordinator', task: 'Emotional support' },
  caregiver: { icon: '⌂', label: 'helpCaregiver', assignee: 'Navigator', task: 'Caregiver or home help' },
  medications: { icon: '✚', label: 'helpMedication', assignee: 'RN', task: 'Medication or side-effect support' },
  symptoms: { icon: '!', label: 'helpSymptoms', assignee: 'RN', task: 'Symptom support' },
};

const needGuidance: Record<NeedKey, Record<PatientLanguage, string[]>> = {
  rides: {
    en: ['Tell your care team when and where your visit is.', 'Ask whether your hospital or community has transportation help.', 'If you call Road To Recovery, ask about eligibility and timing.'],
    es: ['Dile a tu equipo cuándo y dónde es tu cita.', 'Pregunta si el hospital o la comunidad ofrecen transporte.', 'Si llamas a Road To Recovery, pregunta por los requisitos y los horarios.'],
    ht: ['Di ekip swen ou ki lè ak kote randevou a ye.', 'Mande si lopital la oswa kominote a gen èd pou transpò.', 'Si w rele Road To Recovery, mande sou kondisyon ak lè yo.'],
  },
  costs: {
    en: ['Ask the hospital financial navigator about bills and payment options.', 'Ask your care team whether a social worker can help you find support.', 'Keep bills or notices together so you can ask about them.'],
    es: ['Pregunta al navegador financiero del hospital sobre facturas y opciones de pago.', 'Pregunta a tu equipo si un trabajador social puede ayudarte a encontrar apoyo.', 'Guarda juntas las facturas o avisos para poder preguntar sobre ellos.'],
    ht: ['Mande konseye finansye lopital la sou bòdwo ak opsyon peman.', 'Mande ekip swen ou si yon travayè sosyal ka ede w jwenn sipò.', 'Kenbe bòdwo ak avi yo ansanm pou w ka poze kesyon sou yo.'],
  },
  food: {
    en: ['Call 211 to ask about local food support.', 'Tell your care team if getting food or preparing meals is difficult.', 'Ask whether a dietitian or community program can help.'],
    es: ['Llama al 211 para preguntar por ayuda local con alimentos.', 'Dile a tu equipo si conseguir comida o preparar comidas es difícil.', 'Pregunta si un dietista o programa comunitario puede ayudarte.'],
    ht: ['Rele 211 pou mande sou èd manje nan zòn ou.', 'Di ekip swen ou si jwenn manje oswa prepare manje difisil.', 'Mande si yon nitrisyonis oswa pwogram kominotè ka ede w.'],
  },
  emotional: {
    en: ['Tell someone you trust or your care team how you have been feeling.', 'Ask your care team about counseling or peer support.', 'If you may hurt yourself, call or text 988; call 911 for immediate danger.'],
    es: ['Cuéntale a alguien de confianza o a tu equipo cómo te has sentido.', 'Pregunta a tu equipo por consejería o apoyo de otras personas.', 'Si podrías hacerte daño, llama o envía un mensaje al 988; llama al 911 si hay peligro inmediato.'],
    ht: ['Di yon moun ou fè konfyans oswa ekip swen ou kijan ou santi w.', 'Mande ekip la sou konsèy oswa sipò lòt moun.', 'Si ou ka fè tèt ou mal, rele oswa voye mesaj bay 988; rele 911 si gen danje imedya.'],
  },
  caregiver: {
    en: ['Tell your care team what help at home would make a difference.', 'Ask whether a social worker or navigator can discuss local services.', 'Write down times or tasks when you need extra support.'],
    es: ['Dile a tu equipo qué ayuda en casa sería útil.', 'Pregunta si un trabajador social o navegador puede hablarte de servicios locales.', 'Anota los horarios o tareas en que necesitas más apoyo.'],
    ht: ['Di ekip swen ou ki èd lakay ki ta itil.', 'Mande si yon travayè sosyal oswa konseye ka pale avè w sou sèvis lokal yo.', 'Ekri lè oswa travay kote ou bezwen plis sipò.'],
  },
  medications: {
    en: ['Write down the medicine name and what you noticed.', 'Contact your care team or nurse about new or troubling side effects.', 'Do not change or stop a medicine without discussing it with your clinician.'],
    es: ['Anota el nombre del medicamento y lo que notaste.', 'Contacta a tu equipo o enfermero por efectos nuevos o preocupantes.', 'No cambies ni suspendas un medicamento sin hablarlo con tu profesional de salud.'],
    ht: ['Ekri non medikaman an ak sa ou remake.', 'Kontakte ekip swen ou oswa enfimyè a pou nouvo efè ki enkyete w.', 'Pa chanje oswa sispann medikaman san ou pa pale ak pwofesyonèl swen ou.'],
  },
  symptoms: {
    en: ['For a new or worsening symptom, contact your care team for guidance.', 'Describe when it started and what makes it better or worse.', 'Do not wait for an app reply if you feel unsafe or very unwell.'],
    es: ['Por un síntoma nuevo o que empeora, contacta a tu equipo para recibir orientación.', 'Describe cuándo empezó y qué lo mejora o empeora.', 'No esperes una respuesta de la aplicación si no te sientes a salvo o muy mal.'],
    ht: ['Pou yon nouvo sentòm oswa yon sentòm ki vin pi mal, kontakte ekip swen ou pou konsèy.', 'Di kilè li te kòmanse ak sa ki fè l vin pi bon oswa pi mal.', 'Pa tann repons aplikasyon an si ou pa an sekirite oswa ou santi w malad anpil.'],
  },
};

function resourcesFor(need: NeedKey, messages: Messages) {
  if (need === 'rides') return [messages.resourceRides, messages.resourceCareTeam];
  if (need === 'costs') return [messages.resourceFinancial, messages.resourceLocalHelp, messages.resourceCareTeam];
  if (need === 'food' || need === 'caregiver') return [messages.resourceLocalHelp, messages.resourceCareTeam];
  if (need === 'emotional') return [messages.resourceCrisis, messages.resourceCareTeam];
  return [messages.resourceCareTeam];
}

function SupportDetails({ need, language, messages }: { need: NeedKey; language: PatientLanguage; messages: Messages }) {
  const [english, setEnglish] = useState(false);
  const displayLanguage = english ? 'en' : language;
  const displayMessages = getMessages(displayLanguage);
  const steps = needGuidance[need][displayLanguage];
  const resources = resourcesFor(need, displayMessages);
  return <>
    {need === 'symptoms' && <AppCard title={displayMessages.urgentTitle} text={`${displayMessages.urgentText} ${displayMessages.emergencyHelp}`} language={displayLanguage} className="patient-app-urgent">
      <p>{displayMessages.urgentText}</p><a className="patient-app-inline-link" href="tel:911">{displayMessages.emergencyHelp}</a>
      <p className="patient-app-caption">{displayMessages.crisisLine}</p>
    </AppCard>}
    {need === 'emotional' && <AppCard title={displayMessages.crisisLine} text={displayMessages.crisisLine} language={displayLanguage} className="patient-app-urgent"><p>{displayMessages.crisisLine}</p><a className="patient-app-inline-link" href="tel:988">{displayMessages.resourceCrisis}</a></AppCard>}
    <AppCard title={displayMessages.needNextSteps} text={steps.join(' ')} language={displayLanguage}>
      <ol className="patient-app-step-list">{steps.map((step) => <li key={step}>{step}</li>)}</ol>
      {language !== 'en' && <button className="patient-app-text-button" type="button" onClick={() => setEnglish((value) => !value)}>{english ? messages.showMyLanguage : messages.showEnglish}</button>}
    </AppCard>
    <AppCard title={displayMessages.needResources} text={resources.join('. ')} language={displayLanguage}>
      <ul className="patient-app-resource-list">{resources.map((resource) => <li key={resource}>{resource}</li>)}</ul>
    </AppCard>
  </>;
}

export default function HelpScreen() {
  const { state, createTask } = useDemoStore();
  const { language, messages } = useLanguage();
  const [searchParams, setSearchParams] = useSearchParams();
  const rawNeed = searchParams.get('need') as NeedKey | null;
  const selected = rawNeed && rawNeed in needDetails ? rawNeed : null;
  const [note, setNote] = useState('');
  const [sent, setSent] = useState(false);
  const choices = Object.entries(needDetails) as [NeedKey, typeof needDetails[NeedKey]][];
  const selectNeed = (need: NeedKey | null) => {
    setSent(false);
    setNote('');
    setSearchParams(need ? { need } : {});
  };
  const sendRequest = () => {
    if (!selected) return;
    const choice = needDetails[selected];
    const title = `Patient needs help: ${choice.task}`;
    createTask({
      patientId: state.patientId,
      title,
      source: `Patient app · need: ${selected}`,
      assignee: choice.assignee,
      dueDate: new Date(Date.now() + 86400000).toISOString().slice(0, 10),
      status: 'Open',
      outcome: '',
      shareWithPatient: false,
      patientMessage: '',
      details: note.trim() || undefined,
    });
    setNote('');
    setSent(true);
  };
  const selectedLabel = selected ? messages[needDetails[selected].label] : '';

  return <div className="patient-app-screen">
    <PageHeading title={messages.helpHeading} subtitle={messages.helpSub} language={language} />
    <AppCard title={selected ? selectedLabel : messages.chooseNeed} text={selected ? selectedLabel : `${messages.chooseNeed}: ${choices.map(([, detail]) => messages[detail.label]).join('. ')}`} language={language}>
      {selected && <button type="button" className="patient-app-text-button" onClick={() => selectNeed(null)}>← {messages.chooseNeed}</button>}
      <div className="patient-app-need-grid">{choices.map(([need, detail]) => <button type="button" key={need} className="patient-app-need-choice" aria-pressed={selected === need} onClick={() => selectNeed(need)}>
        <span aria-hidden="true">{detail.icon}</span><span>{messages[detail.label]}</span><span aria-hidden="true">→</span>
      </button>)}</div>
    </AppCard>
    {selected && <>
      <SupportDetails need={selected} language={language} messages={messages} />
      <AppCard title={messages.askTeam} text={`${messages.askTeam}. ${messages.requestNote}.`} language={language}>
        <label className="patient-app-field">{messages.requestNote}<textarea rows={3} value={note} onChange={(event) => setNote(event.target.value)} placeholder={messages.requestPlaceholder} /></label>
        <button type="button" className="patient-app-primary" onClick={sendRequest}>{messages.askTeam}</button>
        {sent && <p className="patient-app-success" role="status" aria-live="polite">{messages.requestSent}</p>}
      </AppCard>
    </>}
  </div>;
}
