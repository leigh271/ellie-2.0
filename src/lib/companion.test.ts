import { describe, expect, it } from 'vitest';
import { companionDestination, companionReply } from './companion';
import { getMessages } from '../patientApp/i18n';

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

  it.each(['en', 'es', 'ht'] as const)('uses the localized default reply for unknown %s text', (language) => {
    expect(companionReply('blue window', language)).toBe(getMessages(language).defaultAssistant);
  });
});
