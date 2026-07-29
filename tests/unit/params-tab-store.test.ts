import { describe, it, expect, beforeAll, beforeEach } from 'vitest';

// Feature 012 — vérifie la lecture bornée de l'onglet de la page Paramètres (`paramsTab`).
// `readChoice` dépend d'un `localStorage` capturé à l'import du module `ui.ts` ; on installe donc
// un stub AVANT l'import dynamique (les imports statiques ESM seraient hoistés avant ce code).
const store: Record<string, string> = {};
// Stub minimal suffisant pour lsGet/lsSet (getItem/setItem/removeItem).
// @ts-expect-error — stub partiel de l'API Storage pour l'environnement de test.
globalThis.localStorage = {
  getItem: (k: string) => (k in store ? store[k] : null),
  setItem: (k: string, v: string) => {
    store[k] = String(v);
  },
  removeItem: (k: string) => {
    delete store[k];
  },
  clear: () => {
    for (const k of Object.keys(store)) delete store[k];
  },
};

let readChoice: <T extends string>(key: string, allowed: readonly T[], fallback: T) => T;
let PARAMS_TABS: readonly ('principaux' | 'avances')[];

beforeAll(async () => {
  const m = await import('../../src/ui/stores/ui.js');
  readChoice = m.readChoice;
  PARAMS_TABS = m.PARAMS_TABS;
});

describe('paramsTab — lecture bornée du choix d’onglet (T012)', () => {
  beforeEach(() => {
    delete store['ui.paramsTab'];
  });

  it('renvoie le défaut « principaux » quand la clé est absente', () => {
    expect(readChoice('ui.paramsTab', PARAMS_TABS, 'principaux')).toBe('principaux');
  });

  it('replie sur « principaux » quand la valeur stockée est invalide', () => {
    store['ui.paramsTab'] = 'bogus';
    expect(readChoice('ui.paramsTab', PARAMS_TABS, 'principaux')).toBe('principaux');
  });

  it('restaure la valeur mémorisée « avances » quand elle est valide', () => {
    store['ui.paramsTab'] = 'avances';
    expect(readChoice('ui.paramsTab', PARAMS_TABS, 'principaux')).toBe('avances');
  });

  it('expose exactement les deux onglets autorisés', () => {
    expect([...PARAMS_TABS].sort()).toEqual(['avances', 'principaux']);
  });
});
