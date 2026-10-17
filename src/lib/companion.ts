import type { PatientLanguage } from '../state/DemoStore';
import { getMessages } from '../patientApp/i18n';
import { findGlossaryTerm } from '../patientApp/content/glossary';

type Need = 'rides' | 'costs' | 'food' | 'emotional' | 'caregiver' | 'medications' | 'symptoms';

function normalized(message: string, language: PatientLanguage) {
  return message.toLocaleLowerCase(language === 'ht' ? 'fr' : language);
}

function detectNeed(message: string, language: PatientLanguage): Need | undefined {
  const text = normalized(message, language).normalize('NFD').replace(/\p{Diacritic}/gu, '');
  const words = new Set(text.match(/\p{L}+/gu) ?? []);
  const has = (...tokens: string[]) => tokens.some((token) => token.includes(' ')
    ? token.split(' ').every((word) => words.has(word))
    : words.has(token));
  if (has('ride', 'rides', 'transport', 'transporte', 'transpo', 'bus', 'car', 'taxi', 'uber', 'lyft')) return 'rides';
  if (has('money', 'cost', 'costs', 'bill', 'bills', 'dinero', 'costo', 'gasto', 'lajan', 'depans', 'bodwo')) return 'costs';
  if (has('food', 'hungry', 'comida', 'alimento', 'manje', 'grangou')) return 'food';
  if (has('sad', 'worried', 'worry', 'lonely', 'down', 'triste', 'tristeza', 'preocupado', 'preocupada', 'preocupacion', 'tris', 'enkyete', 'ke sere', 'pou kont mwen', 'siento sola', 'siento solo')) return 'emotional';
  if (has('medicine', 'medication', 'medications', 'side effect', 'medicamento', 'medicamentos', 'efecto secundario', 'medikaman', 'efe segonde')) return 'medications';
  if (has('caregiver', 'home help', 'cuidador', 'cuidadora', 'ayuda en casa', 'moun k ap ede', 'ed lakay')) return 'caregiver';
  if (has('symptom', 'symptoms', 'something feels wrong', 'sintoma', 'sintomas', 'me siento mal', 'sentom', 'pa santi nomal')) return 'symptoms';
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

export function isEmergencyMessage(message: string, language: PatientLanguage = 'en') {
  return isEmergency(message, language);
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
