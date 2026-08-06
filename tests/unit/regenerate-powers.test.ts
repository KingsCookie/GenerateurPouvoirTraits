import { describe, it, expect } from 'vitest';
import { regeneratePowers } from '../../src/core/powers/regenerate.js';
import { createRng } from '../../src/core/rng/rng.js';
import { defaultCatalog } from '../../src/core/catalog/defaultCatalog.js';
import { defaultParameters, type Parameters } from '../../src/core/params/parameters.js';
import type { Personne } from '../../src/core/model/personne.js';
import type { ResilientTrait } from '../../src/core/model/adn.js';
import type { Pouvoir } from '../../src/core/model/pouvoir.js';

// US9 — régénération des pouvoirs (§6.4 seul + P/M §7.2/cas A), fonction cœur pure.

const catalog = defaultCatalog();
const actionId = catalog.byType.Action[0].id;
const elementId = catalog.byType.Element[0].id;

function person(
  traits: ResilientTrait[],
  parents: string[] = [],
  pouvoirs: Pouvoir[] = [],
): Personne {
  return {
    id: 'p-000001',
    nom: 'X',
    especeId: 'humain',
    genreId: 'masculin',
    dateNaissance: '2000-01-01',
    age: 0,
    vivant: true,
    raisonDeces: null,
    immortel: false,
    parents,
    enfants: [],
    conjoints: [],
    adn: { traits },
    pouvoirs,
    notes: null,
  };
}

function pow(puissance: number, maitrise: number): Pouvoir {
  return { id: 'pw', label: 'l', template: 'DERIVE', traitIds: [], puissance, maitrise };
}

// Action + Élément actifs ⇒ sous-liste AE ⇒ pouvoir « {action} {élément} » (aucun jeton K).
const activeAE: ResilientTrait[] = [
  { traitId: actionId, active: true, resilience: 50 },
  { traitId: elementId, active: true, resilience: 50 },
];

describe('US9 — regeneratePowers (cœur pur)', () => {
  it('dérive un pouvoir depuis les traits actifs (§6.4), sans cas « sans pouvoir »/« forte »', () => {
    const { pouvoirs } = regeneratePowers(
      person(activeAE),
      [],
      catalog,
      defaultParameters(),
      createRng(1n),
    );
    expect(pouvoirs.length).toBeGreaterThanOrEqual(1);
    expect(pouvoirs[0].template).toBe('DERIVE');
    expect(pouvoirs[0].label.length).toBeGreaterThan(0);
  });

  it('sans trait actif ⇒ aucun pouvoir, sans erreur', () => {
    const inactive: ResilientTrait[] = [{ traitId: actionId, active: false, resilience: 50 }];
    const { pouvoirs } = regeneratePowers(
      person(inactive),
      [],
      catalog,
      defaultParameters(),
      createRng(2n),
    );
    expect(pouvoirs).toEqual([]);
  });

  it('sans parents ⇒ P/M tirés dans [1, 10] (cas A)', () => {
    const { pouvoirs } = regeneratePowers(
      person(activeAE),
      [],
      catalog,
      defaultParameters(),
      createRng(3n),
    );
    for (const pw of pouvoirs) {
      expect(pw.puissance).toBeGreaterThanOrEqual(1);
      expect(pw.puissance).toBeLessThanOrEqual(10);
      expect(pw.maitrise).toBeGreaterThanOrEqual(1);
      expect(pw.maitrise).toBeLessThanOrEqual(10);
    }
  });

  it('avec parents ⇒ P/M suivent §7.2 (cas C = moyenne des parents)', () => {
    // statC = 100 ⇒ toujours le cas « moyenne » ⇒ P/M = moyenne parentale (déterministe).
    const meanParams: Parameters = { ...defaultParameters(), statB: 0, statC: 100 };
    const pa = person(activeAE, [], [pow(10, 4)]);
    const pb = person(activeAE, [], [pow(10, 6)]);
    const child = person(activeAE, ['pa', 'pb']);
    const parents = [
      { ...pa, id: 'pa' },
      { ...pb, id: 'pb' },
    ];
    const { pouvoirs } = regeneratePowers(child, parents, catalog, meanParams, createRng(4n));
    expect(pouvoirs.length).toBeGreaterThanOrEqual(1);
    // moyenne P = (10+10)/2 = 10 ; moyenne M = (4+6)/2 = 5.
    expect(pouvoirs[0].puissance).toBe(10);
    expect(pouvoirs[0].maitrise).toBe(5);
  });

  it('l’ADN retourné conserve/inscrit les traits actifs (enrichissement K possible)', () => {
    const { adn } = regeneratePowers(
      person(activeAE),
      [],
      catalog,
      defaultParameters(),
      createRng(5n),
    );
    expect(adn.traits.some((t) => t.traitId === actionId && t.active)).toBe(true);
    expect(adn.traits.some((t) => t.traitId === elementId && t.active)).toBe(true);
  });

  it('déterministe : même seed ⇒ même résultat', () => {
    const a = regeneratePowers(person(activeAE), [], catalog, defaultParameters(), createRng(42n));
    const b = regeneratePowers(person(activeAE), [], catalog, defaultParameters(), createRng(42n));
    expect(a).toEqual(b);
  });
});

// US1 (v0.15.0) — une feuille à deux pouvoirs attribue des P/M indépendantes par pouvoir (§7.2).
describe('US1 — P/M indépendantes des deux pouvoirs (T-PM-INDEP)', () => {
  const etatId = catalog.byType.Etat[0].id;
  // Action + Élément + État actifs ⇒ feuille a/e/et ⇒ deux pouvoirs (« {a} {e} {et} » ; « rends {e} {et} »).
  const activeAEET: ResilientTrait[] = [
    { traitId: actionId, active: true, resilience: 50 },
    { traitId: elementId, active: true, resilience: 50 },
    { traitId: etatId, active: true, resilience: 50 },
  ];

  it('sans parents ⇒ deux pouvoirs, chacun avec ses P/M ∈ [1,10]', () => {
    const { pouvoirs } = regeneratePowers(
      person(activeAEET),
      [],
      catalog,
      defaultParameters(),
      createRng(7n),
    );
    expect(pouvoirs).toHaveLength(2);
    // Libellés distincts (X ≠ Y) ⇒ pas de collision de clé d'affichage.
    expect(pouvoirs[0].label).not.toBe(pouvoirs[1].label);
    for (const pw of pouvoirs) {
      expect(pw.puissance).toBeGreaterThanOrEqual(1);
      expect(pw.puissance).toBeLessThanOrEqual(10);
      expect(pw.maitrise).toBeGreaterThanOrEqual(1);
      expect(pw.maitrise).toBeLessThanOrEqual(10);
    }
  });

  it('déterministe : même seed ⇒ mêmes P/M pour les deux pouvoirs', () => {
    const a = regeneratePowers(person(activeAEET), [], catalog, defaultParameters(), createRng(7n));
    const b = regeneratePowers(person(activeAEET), [], catalog, defaultParameters(), createRng(7n));
    expect(a.pouvoirs.map((p) => [p.puissance, p.maitrise])).toEqual(
      b.pouvoirs.map((p) => [p.puissance, p.maitrise]),
    );
  });
});
