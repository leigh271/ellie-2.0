import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { buildPatientContext } from '../data/patientLinks';
import type { PatientLinkedRecords } from '../data/patientLinks';
import { companionDataIntent, companionDestination, companionReply, companionResourceCategory } from './companion';
import { getMessages } from '../patientApp/i18n';

const linkedPatients = JSON.parse(
  readFileSync(new URL('../../public/data/patient_links.json', import.meta.url), 'utf8'),
) as { patients: Record<string, PatientLinkedRecords> };
const mariaContext = buildPatientContext(linkedPatients.patients.maria);

describe('patient app companion', () => {
  it.each([
    ['en', 'I have chest pain', '911'],
    ['es', 'Tengo fiebre', '911'],
    ['ht', 'Mwen gen doulè nan pwatrin', '911'],
  ] as const)('gives urgent guidance in %s', (language, prompt, expected) => {
    expect(companionReply(prompt, language)).toContain(expected);
  });

  it('routes a Spanish transportation request to ride support', () => {
    expect(companionDestination('Necesito transporte para mi cita', 'es')).toBe('/app/help?need=rides');
  });

  it('does not route a care-team request to rides', () => {
    expect(companionDestination('I want to talk to my care team')).not.toBe('/app/help?need=rides');
  });

  it('routes an explicit ride request to ride support', () => {
    expect(companionDestination('I need a ride')).toBe('/app/help?need=rides');
  });

  it('suggests transportation resources for a ride request', () => {
    expect(companionResourceCategory('I need a ride to my appointment')).toBe('transportation');
  });

  it.each([
    ['I feel anxious and lonely', 'emotional'],
    ['I need help with food and bills', 'local'],
    ['Necesito ayuda con vivienda', 'local'],
  ] as const)('maps resource request %s to %s', (prompt, category) => {
    expect(companionResourceCategory(prompt, prompt.startsWith('Necesito') ? 'es' : 'en')).toBe(category);
  });

  it.each(['en', 'es', 'ht'] as const)('uses the localized default reply for unknown %s text', (language) => {
    expect(companionReply('blue window', language)).toBe(getMessages(language).defaultAssistant);
  });

  it.each([
    ['en', 'How many steps did I take?', 'activity', 'fatigue-study wearable record'],
    ['es', '¿Cuánta actividad tuve?', 'activity', 'fatigue-study wearable record'],
    ['ht', 'Ki kantite etap mwen te fè?', 'activity', 'fatigue-study wearable record'],
    ['en', 'How did I sleep this week?', 'sleep', 'fatigue-study wearable record'],
    ['es', '¿Cómo dormí esta semana?', 'sleep', 'fatigue-study wearable record'],
    ['ht', 'Ki jan mwen te dòmi semèn sa a?', 'sleep', 'fatigue-study wearable record'],
    ['en', 'What is my blood sugar?', 'labs', 'NHANES exam record'],
    ['es', '¿Cuál es mi glucosa en sangre?', 'labs', 'NHANES exam record'],
    ['ht', 'Ki rezilta HbA1c mwen?', 'labs', 'NHANES exam record'],
    ['en', 'What is my BMI?', 'labs', 'NHANES exam record'],
    ['es', '¿Cuáles son mis números?', 'labs', 'NHANES exam record'],
    ['ht', 'Ki nimewo mwen?', 'labs', 'NHANES exam record'],
    ['en', 'Show my coaching goals', 'coaching', 'synthetic coaching record'],
    ['es', 'Muéstrame mis metas de apoyo', 'coaching', 'synthetic coaching record'],
    ['ht', 'Montre m objektif antrenè mwen yo', 'coaching', 'synthetic coaching record'],
  ] as const)('answers the %s %s intent from linked records', (language, prompt, intent, source) => {
    expect(companionDataIntent(prompt, language)).toBe(intent);
    expect(companionReply(prompt, language, mariaContext)).toContain(source);
    const localizedAsk = language === 'en'
      ? 'Ask your care team what this means for you.'
      : language === 'es'
        ? 'Pregunta a tu equipo de atención qué significa esto para ti.'
        : 'Mande ekip swen ou sa sa vle di pou ou.';
    expect(companionReply(prompt, language, mariaContext)).toContain(localizedAsk);
  });

  it('handles emergency messages before linked-record data intents', () => {
    expect(companionReply('I have chest pain; what is my HbA1c?', 'en', mariaContext))
      .toBe(getMessages('en').companionEmergency);
  });
});
