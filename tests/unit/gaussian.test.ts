import { describe, it, expect } from 'vitest';
import { reproProbability } from '../../src/core/repro/gaussian.js';
import { defaultEspece } from '../../src/core/catalog/defaultCatalog.js';

// Valeurs lues depuis les défauts (source unique) pour rester robustes aux changements de config.
const humain = defaultEspece(); // défauts config : début 18, pic 30, fin 50, pic 20 %, pente 6

describe('Gaussienne de reproduction §9.4 (T014)', () => {
  it('hors de [début, fin] ⇒ probabilité nulle', () => {
    expect(reproProbability(humain.reproStartAge - 1, humain)).toBe(0);
    expect(reproProbability(humain.reproEndAge + 1, humain)).toBe(0);
  });

  it('au pic ⇒ probabilité maximale = reproPeakPct', () => {
    expect(reproProbability(humain.reproPeakAge, humain)).toBeCloseTo(humain.reproPeakPct, 6);
  });

  it('décroît de part et d’autre du pic et est symétrique', () => {
    const below = reproProbability(humain.reproPeakAge - 5, humain);
    const above = reproProbability(humain.reproPeakAge + 5, humain);
    expect(below).toBeCloseTo(above, 6); // écarts symétriques autour du pic
    expect(below).toBeLessThan(humain.reproPeakPct);
    expect(below).toBeGreaterThan(0);
  });

  it('aux bornes incluses, la probabilité est > 0', () => {
    expect(reproProbability(humain.reproStartAge, humain)).toBeGreaterThan(0);
    expect(reproProbability(humain.reproEndAge, humain)).toBeGreaterThan(0);
  });
});
