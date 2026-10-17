import type { PatientLanguage } from '../state/DemoStore';
import { getMessages } from '../patientApp/i18n';
import { findGlossaryTerm } from '../patientApp/content/glossary';

type Need = 'rides' | 'costs' | 'food' | 'emotional' | 'caregiver' | 'medications' | 'symptoms';

function normalized(message: string, language: PatientLanguage) {
  return message.toLocaleLowerCase(language === 'ht' ? 'fr' : language);
}

function detectNeed(message: string, language: PatientLanguage): Need | undefined {
  const text = normalized(message, language);
  if (/(ride|transport|transporte|transpò|bus|car|taxi)/.test(text)) return 'rides';
  if (/(money|cost|bill|dinero|costo|gasto|lajan|depans|bòdwo)/.test(text)) return 'costs';
  if (/(food|hungry|comida|alimento|manje|grangou)/.test(text)) return 'food';
  if (/(sad|worried|lonely|triste|preocup|sol|tris|enky|kè sere)/.test(text)) return 'emotional';
  if (/(medicine|medication|side effect|medicamento|efecto secundario|medikaman|efè segondè)/.test(text)) return 'medications';
  if (/(caregiver|home help|cuidador|ayuda en casa|moun k ap ede|èd lakay)/.test(text)) return 'caregiver';
  if (/(symptom|something feels wrong|síntoma|me siento mal|sentòm|pa santi nòmal)/.test(text)) return 'symptoms';
  return undefined;
}

function isEmergency(message: string, language: PatientLanguage) {
  const text = normalized(message, language);
  const words: Record<PatientLanguage, string[]> = {
    en: ['chest pain', 'fever', 'bleeding', "can't breathe", 'cannot breathe', 'trouble breathing', 'suicidal', 'hurt myself'],
    es: ['dolor de pecho', 'fiebre', 'sangrado', 'no puedo respirar', 'dificultad para respirar', 'suicid', 'hacerme daño'],
    ht: ['doulè nan pwatrin', 'lafyèv', 'senyen', 'mwen pa ka respire', 'difikilte pou respire', 'swisid', 'fè tèt mwen mal'],
  };
  return words[language].some((word) => text.includes(word));
}

export function companionDestination(message: string, language: PatientLanguage = 'en'): string | undefined {
  if (isEmergency(message, language)) return undefined;
  const term = findGlossaryTerm(message, language);
  if (term) return `/app/diagnosis?term=${encodeURIComponent(term.id)}`;
  const text = normalized(message, language);
  if (/(diagnos|cancer|cáncer|kansè|eksplike|explain)/.test(text)) return '/app/diagnosis';
  const need = detectNeed(message, language);
  return need ? `/app/help?need=${need}` : undefined;
}

export function companionReply(message: string, language: PatientLanguage = 'en'): string {
  const messages = getMessages(language);
  if (isEmergency(message, language)) return messages.companionEmergency;
  const term = findGlossaryTerm(message, language);
  if (term) return messages.companionGlossary
    .replace('{term}', term.name[language])
    .replace('{definition}', term.definition[language]);
  const text = normalized(message, language);
  if (/(diagnos|cancer|cáncer|kansè|eksplike|explain)/.test(text)) return messages.companionDiagnosis;
  if (detectNeed(message, language)) return messages.companionHelp;
  if (/(symptom|pain|medicine|medication|treatment|dose|diagnos|síntoma|dolor|tratamiento|medikaman|tretman|doulè)/.test(text)) return messages.companionClinical;
  if (/(trend|steps|sleep|activity|wearable|tired|fatigue|energy|sueño|actividad|cansancio|fatiga|dòmi|aktivite|fatig|enèji)/.test(text)) return messages.companionTrends;
  return messages.defaultAssistant;
}
