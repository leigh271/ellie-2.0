import { describe, expect, it } from 'vitest';
import { diagnoses, phaseContent, sectionContent } from './content/diagnoses';
import { glossary } from './content/glossary';
import { en, translations } from './i18n';

const languages = ['en', 'es', 'ht'] as const;

function strings(value: unknown): string[] {
  if (typeof value === 'string') return [value];
  if (Array.isArray(value)) return value.flatMap(strings);
  if (value && typeof value === 'object') return Object.values(value).flatMap(strings);
  return [];
}

function expectCompleteTranslations(value: Record<string, unknown>) {
  for (const language of languages) {
    expect(strings(value[language] ?? value).every((text) => text.trim().length > 0), `${language} translation`).toBe(true);
  }
}

describe('patient app translations', () => {
  it('has every English interface key in Spanish and Haitian Creole', () => {
    for (const language of ['es', 'ht'] as const) {
      expect(Object.keys(translations[language]).sort()).toEqual(Object.keys(en).sort());
      for (const key of Object.keys(en) as Array<keyof typeof en>) {
        expect(translations[language][key].trim(), `${language}.${key}`).not.toBe('');
      }
    }
  });

  it('has complete diagnosis, phase, and patient education content in every language', () => {
    for (const diagnosis of Object.values(diagnoses)) {
      expectCompleteTranslations(diagnosis.name);
      expectCompleteTranslations(diagnosis.what);
    }
    for (const phase of Object.values(phaseContent)) expectCompleteTranslations(phase);
    for (const section of Object.values(sectionContent)) expectCompleteTranslations(section);
  });

  it('has a name and definition for every glossary term in every language', () => {
    for (const term of glossary) {
      expectCompleteTranslations(term.name);
      expectCompleteTranslations(term.definition);
    }
  });
});
