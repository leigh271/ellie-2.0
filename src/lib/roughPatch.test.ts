import { describe, expect, it } from 'vitest';
import { elliePatients } from '../data/ellieDemo';
import { readFileSync } from 'node:fs';
import { withLinkedWearable, type PatientLinksDataset } from '../data/patientLinks';
import { analyzeRoughPatch } from './roughPatch';

const links = JSON.parse(
  readFileSync(new URL('../../public/data/patient_links.json', import.meta.url), 'utf8'),
) as PatientLinksDataset;

describe('analyzeRoughPatch', () => {
  it('identifies Maria’s linked recent change and reports data completeness', () => {
    const patient = withLinkedWearable(elliePatients[0], links.patients.maria);
    const result = analyzeRoughPatch(patient);
    expect(result.active).toBe(true);
    expect(result.rules).toContain('Steps are down at least 15% from baseline');
    expect(result.completeness).toBeGreaterThan(60);
  });

  it('does not raise an alert for a stable synthetic patient', () => {
    const result = analyzeRoughPatch(elliePatients[2]);
    expect(result.active).toBe(false);
  });
});
