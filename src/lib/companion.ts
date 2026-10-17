import type { PatientLanguage } from '../state/DemoStore';
import { getMessages } from '../patientApp/i18n';
import { findGlossaryTerm } from '../patientApp/content/glossary';
import type { ResourceCategory } from '../patientApp/content/resources';

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
  if (has('ride', 'rides', 'transport', 'transportation', 'transporte', 'transpo', 'bus', 'car', 'taxi', 'uber', 'lyft')) return 'rides';
  if (has('money', 'cost', 'costs', 'bill', 'bills', 'housing', 'rent', 'local', 'dinero', 'costo', 'gasto', 'vivienda', 'lajan', 'depans', 'bodwo', 'lojman')) return 'costs';
  if (has('food', 'hungry', 'comida', 'alimento', 'manje', 'grangou')) return 'food';
  if (has('sad', 'worried', 'worry', 'lonely', 'down', 'anxious', 'anxiety', 'counsel', 'counseling', 'counselling', 'triste', 'tristeza', 'ansioso', 'ansiosa', 'ansiedad', 'consejeria', 'preocupado', 'preocupada', 'preocupacion', 'tris', 'enkyete', 'konsey', 'ke sere', 'pou kont mwen', 'siento sola', 'siento solo')) return 'emotional';
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

export function companionResourceCategory(message: string, language: PatientLanguage = 'en'): ResourceCategory | undefined {
  if (isEmergency(message, language)) return undefined;
  const need = detectNeed(message, language);
  if (need === 'rides') return 'transportation';
  if (need === 'emotional') return 'emotional';
  if (need === 'food' || need === 'costs') return 'local';
  const text = normalized(message, language).normalize('NFD').replace(/\p{Diacritic}/gu, '');
  const words = new Set(text.match(/\p{L}+/gu) ?? []);
  if (['food', 'bill', 'bills', 'housing', 'rent', 'local', 'community', 'comida', 'alimento', 'alimentos', 'vivienda', 'lajan', 'lojman', 'bodwo'].some((word) => words.has(word))) return 'local';
  if (['sad', 'anxious', 'anxiety', 'lonely', 'counsel', 'counseling', 'counselling', 'triste', 'ansioso', 'ansiosa', 'konsey', 'enkyete'].some((word) => words.has(word))) return 'emotional';
  if (['ride', 'rides', 'transport', 'transportation', 'bus', 'taxi', 'transporte', 'transpo'].some((word) => words.has(word))) return 'transportation';
  return undefined;
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
  const category = companionResourceCategory(message, language);
  if (category === 'transportation') return messages.companionTransportation;
  if (category === 'emotional') return messages.companionEmotional;
  if (category === 'local') return messages.companionLocal;
  if (detectNeed(message, language)) return messages.companionHelp;
  if (/(symptom|pain|medicine|medication|treatment|dose|diagnos|síntoma|dolor|tratamiento|medikaman|tretman|doulè)/.test(text)) return messages.companionClinical;
  if (/(trend|steps|sleep|activity|wearable|tired|fatigue|energy|sueño|actividad|cansancio|fatiga|dòmi|aktivite|fatig|enèji)/.test(text)) return messages.companionTrends;
  return messages.defaultAssistant;
}
