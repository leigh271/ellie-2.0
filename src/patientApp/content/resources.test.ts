import { describe, expect, it } from 'vitest';
import { HELP_NEED_KEYS } from './helpNeeds';
import { RESOURCE_CATEGORIES, resources } from './resources';

describe('patient resources', () => {
  it('has complete English, Spanish, and Haitian Creole content for each resource', () => {
    for (const resource of resources) {
      for (const language of ['en', 'es', 'ht'] as const) {
        const content = resource.content[language];
        expect(content.title.trim(), `${resource.id}.${language}.title`).not.toBe('');
        expect(content.description.trim(), `${resource.id}.${language}.description`).not.toBe('');
        expect(content.who.trim(), `${resource.id}.${language}.who`).not.toBe('');
        expect(content.services.length, `${resource.id}.${language}.services`).toBeGreaterThan(0);
        expect(content.services.every((service) => service.trim().length > 0)).toBe(true);
        expect(content.apply.trim(), `${resource.id}.${language}.apply`).not.toBe('');
      }
      expect(resource.categories.length).toBeGreaterThan(0);
      expect(resource.categories.every((category) => (RESOURCE_CATEGORIES as readonly string[]).includes(category))).toBe(true);
      if (resource.url) expect(resource.url).toMatch(/^https:\/\//);
      if (resource.helpNeed) expect(HELP_NEED_KEYS).toContain(resource.helpNeed);
    }
  });
});
