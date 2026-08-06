import { describe, it, expect } from 'vitest';
import { createRng } from '../../src/core/rng/rng.js';
import { defaultCatalog } from '../../src/core/catalog/defaultCatalog.js';
import { defaultParameters } from '../../src/core/params/parameters.js';
import { generateInitialPopulation } from '../../src/core/genesis/genesis.js';
import { buildFicheView, buildListRow, yearOf } from '../../src/ui/lib/ficheViewModel.js';

const catalog = defaultCatalog();

function popWithPowers(seed: bigint, birthYear = 0) {
  const p = {
    ...defaultParameters(),
    seed: seed.toString(),
    batchSize: 30,
    powerChancePct: 100,
    birthYear,
  };
  return generateInitialPopulation(p, catalog, createRng(seed));
}

describe('Modèle de vue fiche (US2)', () => {
  it('yearOf extrait l’année (y compris négative)', () => {
    expect(yearOf('0000-04-12')).toBe(0);
    expect(yearOf('0042-01-01')).toBe(42);
    expect(yearOf('-0005-06-30')).toBe(-5);
  });

  it('génération = tranche de 20 ans de l’année de naissance', () => {
    const pop = popWithPowers(0x111n, 45);
    const view = buildFicheView(pop[0], catalog, 45, 0);
    expect(view.generation).toBe(2); // floor((45-0)/20)
    expect(view.age).toBe(0); // currentYear == birthYear
  });

  it('le pouvoir a un libellé non vide et expose puissance/maîtrise', () => {
    const pop = popWithPowers(0x222n);
    const withPower = pop.find((x) => x.pouvoirs.length === 1)!;
    const view = buildFicheView(withPower, catalog, 0, 0);
    expect(view.pouvoirs).toHaveLength(1);
    const pv = view.pouvoirs[0];
    expect(pv.label.length).toBeGreaterThan(0);
    expect(pv.puissance).toBeGreaterThanOrEqual(1);
    expect(pv.maitrise).toBeLessThanOrEqual(10);
    expect(pv.traits.length).toBe(2); // gabarit = 2 traits
  });

  it('liste les traits actifs avec leur libellé et résilience', () => {
    const pop = popWithPowers(0x333n);
    const withPower = pop.find((x) => x.pouvoirs.length === 1)!;
    const view = buildFicheView(withPower, catalog, 0, 0);
    expect(view.traitsActifs.length).toBe(2);
    for (const t of view.traitsActifs) {
      expect(t.label.length).toBeGreaterThan(0);
      expect(t.resilience).toBe(defaultParameters().initialResilience);
    }
  });

  it('un individu sans pouvoir a des vues vides', () => {
    const p = { ...defaultParameters(), seed: '7', batchSize: 5, powerChancePct: 0 };
    const pop = generateInitialPopulation(p, catalog, createRng(7n));
    const view = buildFicheView(pop[0], catalog, 0, 0);
    expect(view.pouvoirs).toEqual([]);
    expect(view.traitsActifs).toEqual([]);
  });

  it('expose l’ADN complet : traits actifs ET inactifs avec résilience (US3)', () => {
    const actionId = catalog.byType.Action[0].id;
    const elementId = catalog.byType.Element[0].id;
    const person = {
      id: 'p-1',
      nom: 'Test',
      especeId: 'esp',
      genreId: 'masculin',
      dateNaissance: '0000-01-01',
      age: 0,
      vivant: true,
      raisonDeces: null,
      immortel: false,
      parents: [],
      enfants: [],
      conjoints: [],
      adn: {
        traits: [
          { traitId: actionId, active: true, resilience: 55 },
          { traitId: elementId, active: false, resilience: 40 },
        ],
      },
      pouvoirs: [],
      notes: null,
    };
    const view = buildFicheView(person, catalog, 0, 0);
    expect(view.traitsActifs.map((t) => t.traitId)).toEqual([actionId]);
    expect(view.traitsInactifs.map((t) => t.traitId)).toEqual([elementId]);
    expect(view.traitsInactifs[0].resilience).toBe(40);
  });

  it('buildListRow renvoie nom, date, âge, espèce/génération, statut et libellés de pouvoir', () => {
    const pop = popWithPowers(0x444n);
    const row = buildListRow(pop[0], catalog, 0, 0);
    expect(row.nom.length).toBeGreaterThan(0);
    expect(row.dateNaissance).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(row.age).toBe(0);
    expect(row.pouvoirs.length).toBe(1);
    // Étiquette enrichie (Feature 010) : libellé + puissance + maîtrise (= valeurs de la fiche).
    const pw = row.pouvoirs[0];
    expect(pw.label.length).toBeGreaterThan(0);
    expect(pw.puissance).toBeGreaterThanOrEqual(1);
    expect(pw.puissance).toBeLessThanOrEqual(10);
    expect(pw.maitrise).toBeGreaterThanOrEqual(1);
    expect(pw.maitrise).toBeLessThanOrEqual(10);
    expect(typeof row.especeId).toBe('string');
    expect(row.generation).toBe(0);
    expect(row.vivant).toBe(true);
  });

  it('expose le TYPE de chaque trait (FR-015)', () => {
    const actionId = catalog.byType.Action[0].id;
    const elementId = catalog.byType.Element[0].id;
    const person = {
      id: 'p-type',
      nom: 'TypeTest',
      especeId: 'esp',
      genreId: 'masculin',
      dateNaissance: '0000-01-01',
      age: 0,
      vivant: true,
      raisonDeces: null,
      immortel: false,
      parents: [],
      enfants: [],
      conjoints: [],
      adn: {
        traits: [
          { traitId: actionId, active: true, resilience: 55 },
          { traitId: elementId, active: false, resilience: 40 },
        ],
      },
      pouvoirs: [],
      notes: null,
    };
    const view = buildFicheView(person, catalog, 0, 0);
    expect(view.traitsActifs[0].type).toBe('Action');
    expect(view.traitsInactifs[0].type).toBe('Element');
  });

  it('résout les NOMS des enfants depuis la population (FR-015)', () => {
    const enfantA = {
      id: 'c-1',
      nom: 'Alice',
      especeId: 'esp',
      genreId: 'feminin',
      dateNaissance: '0020-01-01',
      age: 0,
      vivant: true,
      raisonDeces: null,
      immortel: false,
      parents: ['p-parent'],
      enfants: [],
      conjoints: [],
      adn: { traits: [] },
      pouvoirs: [],
      notes: null,
    };
    const parent = {
      id: 'p-parent',
      nom: 'Bob',
      especeId: 'esp',
      genreId: 'masculin',
      dateNaissance: '0000-01-01',
      age: 0,
      vivant: true,
      raisonDeces: null,
      immortel: false,
      parents: [],
      enfants: ['c-1', 'c-inconnu'],
      conjoints: [],
      adn: { traits: [] },
      pouvoirs: [],
      notes: null,
    };
    const view = buildFicheView(parent, catalog, 30, 0, [parent, enfantA]);
    expect(view.enfants).toEqual([
      { id: 'c-1', nom: 'Alice' },
      { id: 'c-inconnu', nom: 'c-inconnu' }, // repli sur l'id si introuvable
    ]);
  });
});
