import { describe, it, expect } from 'vitest';
import { createRng } from '../../src/core/rng/rng.js';
import { defaultCatalog, defaultEspeces } from '../../src/core/catalog/defaultCatalog.js';
import { defaultParameters } from '../../src/core/params/parameters.js';
import { FORMAT_VERSION, type AppState } from '../../src/core/state/serialize.js';
import type { Personne } from '../../src/core/model/personne.js';
import type { PopulationEvent } from '../../src/core/model/event.js';
import { reconstructAtYear } from '../../src/core/sandbox/reconstruct.js';

function person(id: string, birthYear: number, over: Partial<Personne> = {}): Personne {
  const yyyy = String(Math.abs(birthYear)).padStart(4, '0');
  return {
    id,
    nom: id,
    especeId: 'humain',
    genreId: 'homme',
    dateNaissance: `${yyyy}-06-15`,
    age: 0,
    vivant: true,
    raisonDeces: null,
    immortel: false,
    parents: [],
    enfants: [],
    conjoints: [],
    adn: { traits: [] },
    pouvoirs: [],
    notes: null,
    ...over,
  };
}

function stateWith(
  population: Personne[],
  history: PopulationEvent[],
  currentYear: number,
): AppState {
  return {
    formatVersion: FORMAT_VERSION,
    kind: 'full',
    parameters: { ...defaultParameters(), birthYear: 0 },
    catalog: defaultCatalog(),
    especes: defaultEspeces(),
    population,
    currentYear,
    genesisYear: 0,
    couples: [{ id: 'c-1', memberIds: ['p-a', 'p-b'], reproPct: null }],
    rngState: createRng(1n).getState(),
    history,
  };
}

describe('reconstructAtYear (Feature 7, US3)', () => {
  // p-a, p-b mariés en l'an 2 ; enfant p-c né en l'an 4 ; p-b meurt en l'an 6.
  const population = [
    person('p-a', 0, { enfants: ['p-c'], conjoints: [{ id: 'p-b', statut: 'actuel' }] }),
    person('p-b', 0, {
      enfants: ['p-c'],
      conjoints: [{ id: 'p-a', statut: 'actuel' }],
      vivant: false,
      raisonDeces: 'duel',
    }),
    person('p-c', 4, { parents: ['p-a', 'p-b'] }),
  ];
  const history: PopulationEvent[] = [
    { kind: 'birth', year: 0, personId: 'p-a' },
    { kind: 'birth', year: 0, personId: 'p-b' },
    { kind: 'couple', year: 2, coupleId: 'c-1', memberIds: ['p-a', 'p-b'] },
    { kind: 'birth', year: 4, personId: 'p-c' },
    { kind: 'death', year: 6, personId: 'p-b' },
  ];
  const state = stateWith(population, history, 10);

  it('n’affiche que les individus nés ≤ année', () => {
    expect(
      reconstructAtYear(state, 0)
        .population.map((p) => p.id)
        .sort(),
    ).toEqual(['p-a', 'p-b']);
    expect(
      reconstructAtYear(state, 4)
        .population.map((p) => p.id)
        .sort(),
    ).toEqual(['p-a', 'p-b', 'p-c']);
  });

  it('un individu mort en D est vivant pour Y < D, décédé pour Y ≥ D', () => {
    expect(reconstructAtYear(state, 5).population.find((p) => p.id === 'p-b')!.vivant).toBe(true);
    expect(reconstructAtYear(state, 6).population.find((p) => p.id === 'p-b')!.vivant).toBe(false);
  });

  it('couple : absent avant formation, actif après', () => {
    expect(reconstructAtYear(state, 1).couples).toHaveLength(0);
    const at3 = reconstructAtYear(state, 3);
    expect(at3.couples).toHaveLength(1);
    expect(at3.population.find((p) => p.id === 'p-a')!.conjoints).toEqual([
      { id: 'p-b', statut: 'actuel' },
    ]);
  });

  it('C1 : un décès dissout le couple (conjoints « ex », couple inactif) pour Y ≥ D', () => {
    const at7 = reconstructAtYear(state, 7);
    expect(at7.couples).toHaveLength(0); // dissous par le décès de p-b
    const a = at7.population.find((p) => p.id === 'p-a')!;
    expect(a.conjoints).toEqual([{ id: 'p-b', statut: 'ex' }]);
  });

  it('les enfants ne sont visibles dans `enfants` que s’ils sont nés ≤ année', () => {
    expect(reconstructAtYear(state, 2).population.find((p) => p.id === 'p-a')!.enfants).toEqual([]);
    expect(reconstructAtYear(state, 4).population.find((p) => p.id === 'p-a')!.enfants).toEqual([
      'p-c',
    ]);
  });

  it('INV-S8 : repli sans journal (présence via dateNaissance)', () => {
    const noJournal = stateWith(population, [], 10);
    // Sans events, p-c (né 4) visible à 4, pas à 3.
    expect(
      reconstructAtYear(noJournal, 3)
        .population.map((p) => p.id)
        .sort(),
    ).toEqual(['p-a', 'p-b']);
  });

  it('INV-S9 : pure (ne mute pas l’entrée)', () => {
    const before = JSON.stringify(state);
    reconstructAtYear(state, 5);
    expect(JSON.stringify(state)).toBe(before);
  });
});
