import { describe, it, expect } from 'vitest';
import { gaugeState } from '../../src/ui/lib/gauge.js';

// Feature 014 — la fonction de dérivation d'état est pure et couverte aux bornes (rsrc/jauges-etats-extremes.md §8.8).
describe('gaugeState (états extrêmes des jauges P/M)', () => {
  it('v < 0 ⇒ broken (borne -1)', () => {
    expect(gaugeState(-1)).toBe('broken');
    expect(gaugeState(-3)).toBe('broken');
  });

  it('v = 0 ⇒ normal (jamais broken)', () => {
    expect(gaugeState(0)).toBe('normal');
  });

  it('0 < v < max ⇒ normal (valeur intermédiaire 5)', () => {
    expect(gaugeState(5)).toBe('normal');
  });

  it('v = max (10) ⇒ normal (jamais overloaded)', () => {
    expect(gaugeState(10)).toBe('normal');
  });

  it('v > max ⇒ overloaded (bornes 11 et 17)', () => {
    expect(gaugeState(11)).toBe('overloaded');
    expect(gaugeState(17)).toBe('overloaded');
  });

  it('respecte un max personnalisé', () => {
    expect(gaugeState(10, 20)).toBe('normal');
    expect(gaugeState(21, 20)).toBe('overloaded');
    expect(gaugeState(-0.5, 20)).toBe('broken');
  });
});
