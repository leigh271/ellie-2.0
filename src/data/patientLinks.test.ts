import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const linkedData = JSON.parse(
  readFileSync(new URL('../../public/data/patient_links.json', import.meta.url), 'utf8'),
) as {
  about: { caveat: string; male_wearable_rule_relaxations: string[] };
  patients: Record<string, {
    wearable: { person_id: number | string; series: Array<Record<string, unknown>> };
    nhanes: { person_id: number | string };
    coaching: { participant_id: string };
  }>;
};

const patientIds = ['maria', 'jasmine', 'ana', 'david', 'priya', 'robert'];
const forbiddenKeys = new Set([
  'cause_of_death',
  'died_by_end_of_2019',
  'first_name',
  'race_ethnicity',
  'phq9_depression_score_0_to_27',
]);

function collectKeys(value: unknown, found: string[] = []): string[] {
  if (Array.isArray(value)) {
    value.forEach((item) => collectKeys(item, found));
  } else if (value && typeof value === 'object') {
    Object.entries(value).forEach(([key, nested]) => {
      found.push(key);
      collectKeys(nested, found);
    });
  }
  return found;
}

describe('linked study records', () => {
  it('includes all patients and three distinct source records per profile', () => {
    expect(Object.keys(linkedData.patients).sort()).toEqual([...patientIds].sort());
    for (const patientId of patientIds) {
      const patient = linkedData.patients[patientId];
      expect(patient.wearable).toBeDefined();
      expect(patient.nhanes).toBeDefined();
      expect(patient.coaching).toBeDefined();
      expect(patient.wearable.series).toHaveLength(28);
    }
    expect(new Set(patientIds.map((id) => String(linkedData.patients[id].wearable.person_id))).size).toBe(6);
    expect(new Set(patientIds.map((id) => String(linkedData.patients[id].nhanes.person_id))).size).toBe(6);
    expect(new Set(patientIds.map((id) => linkedData.patients[id].coaching.participant_id)).size).toBe(6);
  });

  it('uses day labels without dates and excludes forbidden source fields', () => {
    for (const patientId of patientIds) {
      for (const [index, row] of linkedData.patients[patientId].wearable.series.entries()) {
        expect(row.day).toBe(index + 1);
        expect(row).not.toHaveProperty('date');
      }
    }
    expect(collectKeys(linkedData).some((key) => forbiddenKeys.has(key))).toBe(false);
    expect(linkedData.about.caveat).toBe(
      "Demo linkage: records from different study participants combined into one fictional profile — not one real person's chart.",
    );
  });
});
