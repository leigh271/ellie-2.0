import { describe, expect, it } from 'vitest';
import { elliePatients } from '../data/ellieDemo';
import { analyzeRoughPatch } from './roughPatch';

describe('analyzeRoughPatch', () => {
  it('identifies Maria’s recent change and reports recent data completeness', () => {
    const result = analyzeRoughPatch(elliePatients[0]);
    expect(result.active).toBe(true);
    expect(result.rules).toHaveLength(3);
    expect(result.completeness).toBeGreaterThan(70);
  });

  it('does not raise an alert for a stable synthetic patient', () => {
    const result = analyzeRoughPatch(elliePatients[2]);
    expect(result.active).toBe(false);
  });
});
