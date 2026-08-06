import { describe, it, expect } from 'vitest';
import { createRng } from '../../src/core/rng/rng.js';
import { defaultCatalog, defaultEspeces } from '../../src/core/catalog/defaultCatalog.js';
import { defaultParameters } from '../../src/core/params/parameters.js';
import { generateInitialPopulation } from '../../src/core/genesis/genesis.js';
import { FORMAT_VERSION, type AppState } from '../../src/core/state/serialize.js';
import type { Personne } from '../../src/core/model/personne.js';
import type { Couple } from '../../src/core/model/couple.js';
import {
  manualReproduce,
  createPerson,
  clonePerson,
  editPerson,
  deletePerson,
  formCouple,
  divorceCouple,
  dissolveConjugalLink,
  type PersonDraft,
} from '../../src/core/sandbox/sandbox.js';
import { reconstructAtYear } from '../../src/core/sandbox/reconstruct.js';

function baseState(seed: bigint, batchSize = 6): AppState {
  const parameters = {
    ...defaultParameters(),
    seed: seed.toString(),
    batchSize,
    powerChancePct: 50,
  };
  const catalog = defaultCatalog();
  const population = generateInitialPopulation(parameters, catalog, createRng(seed));
  return {
    formatVersion: FORMAT_VERSION,
    kind: 'full',
    parameters,
    catalog,
    especes: defaultEspeces(),
    population,
    currentYear: parameters.birthYear,
    genesisYear: parameters.birthYear,
    couples: [],
    rngState: createRng(seed).getState(),
    history: [],
  };
}

const draft = (over: Partial<PersonDraft> = {}): PersonDraft => ({
  nom: 'Test',
  especeId: 'humain',
  genreId: 'homme',
  dateNaissance: '0000-01-01',
  vivant: true,
  raisonDeces: null,
  adn: { traits: [] },
  pouvoirs: [],
  notes: null,
  ...over,
});

describe('Sandbox — reproduction manuelle (US1)', () => {
  it('INV-S4 : produit exactement `count` enfants depuis les parents + événements birth', () => {
    const state = baseState(0xa1n);
    const [p1, p2] = state.population;
    const before = state.population.length;
    const next = manualReproduce(state, [p1.id, p2.id], 3, 10, createRng(0x99n));
    expect(next.population.length).toBe(before + 3);
    const children = next.population.slice(before);
    for (const c of children) {
      expect(c.parents.sort()).toEqual([p1.id, p2.id].sort());
      expect(c.dateNaissance.startsWith('0010-')).toBe(true); // né dans l'année 10
    }
    // Parents reçoivent les enfants.
    const np1 = next.population.find((p) => p.id === p1.id)!;
    expect(np1.enfants.length).toBe(3);
    // 3 événements birth à l'année 10.
    const births = next.history.filter((e) => e.kind === 'birth');
    expect(births).toHaveLength(3);
    expect(births.every((e) => e.year === 10)).toBe(true);
  });

  it('INV-S1 : ne mute pas l’état d’entrée', () => {
    const state = baseState(0xa2n);
    const snapshotLen = state.population.length;
    manualReproduce(state, [state.population[0].id], 1, 0, createRng(1n));
    expect(state.population.length).toBe(snapshotLen);
    expect(state.history).toHaveLength(0);
  });

  it('no-op si count < 1 ou aucun parent', () => {
    const state = baseState(0xa3n);
    expect(manualReproduce(state, [state.population[0].id], 0, 0, createRng(1n))).toBe(state);
    expect(manualReproduce(state, [], 2, 0, createRng(1n))).toBe(state);
    expect(manualReproduce(state, ['inconnu'], 2, 0, createRng(1n))).toBe(state);
  });

  it('INV-S10 : déterministe à seed fixe', () => {
    const state = baseState(0xa4n);
    const ids = [state.population[0].id, state.population[1].id];
    const a = manualReproduce(state, ids, 2, 5, createRng(0x7n));
    const b = manualReproduce(state, ids, 2, 5, createRng(0x7n));
    expect(a.population).toEqual(b.population);
  });
});

describe('Sandbox — création / clonage / édition (US2)', () => {
  it('INV-S5 : createPerson crée un individu autonome', () => {
    const state = baseState(0xb1n);
    const next = createPerson(state, draft({ nom: 'Neo' }), 'p-900001');
    const created = next.population.find((p) => p.id === 'p-900001')!;
    expect(created.nom).toBe('Neo');
    expect(created.parents).toEqual([]);
    expect(created.enfants).toEqual([]);
    expect(created.conjoints).toEqual([]);
  });

  it('INV-S5 : clonePerson reprend les attributs sans liens de parenté', () => {
    const state = baseState(0xb2n);
    const src: Personne = {
      ...state.population[0],
      parents: ['x'],
      enfants: ['y'],
      conjoints: [{ id: 'z', statut: 'actuel' }],
    };
    const withSrc = { ...state, population: [src, ...state.population.slice(1)] };
    const next = clonePerson(withSrc, src.id, 'p-900002');
    const copy = next.population.find((p) => p.id === 'p-900002')!;
    expect(copy.nom).toBe(src.nom);
    expect(copy.adn).toEqual(src.adn);
    expect(copy.parents).toEqual([]);
    expect(copy.enfants).toEqual([]);
    expect(copy.conjoints).toEqual([]);
  });

  it('editPerson modifie des attributs sans toucher la parenté', () => {
    const state = baseState(0xb3n);
    const target: Personne = { ...state.population[0], parents: ['par'], enfants: ['enf'] };
    const withTarget = { ...state, population: [target, ...state.population.slice(1)] };
    const next = editPerson(withTarget, target.id, { notes: 'modifié', genreId: 'femme' });
    const edited = next.population.find((p) => p.id === target.id)!;
    expect(edited.notes).toBe('modifié');
    expect(edited.genreId).toBe('femme');
    expect(edited.parents).toEqual(['par']); // inchangé
    expect(edited.enfants).toEqual(['enf']); // inchangé
  });
});

describe('Sandbox — suppression (US2)', () => {
  function makeFamilyState(): AppState {
    // p-a et p-b en couple ; p-c enfant de a&b ; p-d célibataire sans enfant.
    const pers = (id: string, over: Partial<Personne> = {}): Personne => ({
      id,
      nom: id,
      especeId: 'humain',
      genreId: 'homme',
      dateNaissance: '0000-01-01',
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
    });
    const a = pers('p-a', { enfants: ['p-c'], conjoints: [{ id: 'p-b', statut: 'actuel' }] });
    const b = pers('p-b', { enfants: ['p-c'], conjoints: [{ id: 'p-a', statut: 'actuel' }] });
    const c = pers('p-c', { parents: ['p-a', 'p-b'] });
    const d = pers('p-d');
    const couples: Couple[] = [{ id: 'c-1', memberIds: ['p-a', 'p-b'], reproPct: null }];
    return {
      formatVersion: FORMAT_VERSION,
      kind: 'full',
      parameters: { ...defaultParameters() },
      catalog: defaultCatalog(),
      especes: defaultEspeces(),
      population: [a, b, c, d],
      currentYear: 0,
      genesisYear: 0,
      couples,
      rngState: createRng(1n).getState(),
      history: [
        { kind: 'birth', year: 0, personId: 'p-a' },
        { kind: 'death', year: 3, personId: 'p-d' },
      ],
    };
  }

  it('INV-S6 : refuse la suppression d’un individu avec descendants', () => {
    const state = makeFamilyState();
    const res = deletePerson(state, 'p-a'); // a un enfant p-c
    expect(res.ok).toBe(false);
  });

  it('INV-S6/S7 : supprime un individu sans descendant et nettoie partout', () => {
    const state = makeFamilyState();
    const res = deletePerson(state, 'p-c'); // p-c n'a pas d'enfant
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    const pop = res.value.population;
    expect(pop.find((p) => p.id === 'p-c')).toBeUndefined();
    // Parents p-a/p-b ne listent plus p-c.
    expect(pop.find((p) => p.id === 'p-a')!.enfants).not.toContain('p-c');
    expect(pop.find((p) => p.id === 'p-b')!.enfants).not.toContain('p-c');
  });

  it('INV-S7 : la suppression d’un conjoint fait revenir le partenaire à l’état antérieur', () => {
    // Rendre p-a supprimable : retirer son enfant.
    const base = makeFamilyState();
    const a = { ...base.population[0], enfants: [] as string[] };
    const state = { ...base, population: [a, ...base.population.slice(1)] };
    const res = deletePerson(state, 'p-a');
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    const b = res.value.population.find((p) => p.id === 'p-b')!;
    expect(b.conjoints.some((c) => c.id === 'p-a')).toBe(false); // lien retiré
    expect(res.value.couples.find((c) => c.id === 'c-1')).toBeUndefined(); // couple dissous (<2)
    // Événements birth/death de p-a purgés (ici birth de p-a).
    expect(res.value.history.some((e) => 'personId' in e && e.personId === 'p-a')).toBe(false);
  });

  it('refuse un individu introuvable', () => {
    expect(deletePerson(makeFamilyState(), 'inconnu').ok).toBe(false);
  });
});

describe('Sandbox — édition du cycle de vie conjugal (US2, BUG-001 volet B)', () => {
  const pers = (id: string, over: Partial<Personne> = {}): Personne => ({
    id,
    nom: id,
    especeId: 'humain',
    genreId: 'homme',
    dateNaissance: '0000-06-15',
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
  });

  function singlesState(): AppState {
    return {
      formatVersion: FORMAT_VERSION,
      kind: 'full',
      parameters: { ...defaultParameters(), birthYear: 0 },
      catalog: defaultCatalog(),
      especes: defaultEspeces(),
      population: [pers('p-x'), pers('p-y'), pers('p-z')],
      currentYear: 6,
      genesisYear: 0,
      couples: [],
      rngState: createRng(1n).getState(),
      history: [
        { kind: 'birth', year: 0, personId: 'p-x' },
        { kind: 'birth', year: 0, personId: 'p-y' },
        { kind: 'birth', year: 0, personId: 'p-z' },
      ],
    };
  }

  it('INV-S12 : formCouple pose des conjoints « actuel » symétriques + couple + événement', () => {
    const res = formCouple(singlesState(), 'p-x', 'p-y', 3);
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    const a = res.value.population.find((p) => p.id === 'p-x')!;
    const b = res.value.population.find((p) => p.id === 'p-y')!;
    expect(a.conjoints).toEqual([{ id: 'p-y', statut: 'actuel' }]);
    expect(b.conjoints).toEqual([{ id: 'p-x', statut: 'actuel' }]);
    expect(res.value.couples).toHaveLength(1);
    expect(res.value.couples[0].memberIds.slice().sort()).toEqual(['p-x', 'p-y']);
    const ce = res.value.history.filter((e) => e.kind === 'couple');
    expect(ce).toHaveLength(1);
    expect(ce[0]).toMatchObject({ year: 3 });
  });

  it('formCouple : Err si même id / introuvable / déjà en couple', () => {
    const s = singlesState();
    expect(formCouple(s, 'p-x', 'p-x', 1).ok).toBe(false);
    expect(formCouple(s, 'p-x', 'inconnu', 1).ok).toBe(false);
    const r1 = formCouple(s, 'p-x', 'p-y', 1);
    expect(r1.ok).toBe(true);
    if (!r1.ok) return;
    expect(formCouple(r1.value, 'p-x', 'p-y', 2).ok).toBe(false);
  });

  it('INV-S1 : formCouple ne mute pas l’entrée', () => {
    const s = singlesState();
    formCouple(s, 'p-x', 'p-y', 3);
    expect(s.population.find((p) => p.id === 'p-x')!.conjoints).toEqual([]);
    expect(s.couples).toHaveLength(0);
  });

  it('divorceCouple : conjoints « ex », couple retiré, événement divorce daté', () => {
    const formed = formCouple(singlesState(), 'p-x', 'p-y', 2);
    expect(formed.ok).toBe(true);
    if (!formed.ok) return;
    const coupleId = formed.value.couples[0].id;
    const res = divorceCouple(formed.value, coupleId, 4);
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.value.population.find((p) => p.id === 'p-x')!.conjoints).toEqual([
      { id: 'p-y', statut: 'ex' },
    ]);
    expect(res.value.couples.find((c) => c.id === coupleId)).toBeUndefined();
    expect(
      res.value.history.some(
        (e) => e.kind === 'divorce' && e.coupleId === coupleId && e.year === 4,
      ),
    ).toBe(true);
  });

  it('divorceCouple : Err si couple introuvable', () => {
    expect(divorceCouple(singlesState(), 'c-999999', 1).ok).toBe(false);
  });

  it('INV-S12 : dissolveConjugalLink retire le lien (retour célibataire) + purge les événements', () => {
    const formed = formCouple(singlesState(), 'p-x', 'p-y', 2);
    expect(formed.ok).toBe(true);
    if (!formed.ok) return;
    const coupleId = formed.value.couples[0].id;
    const res = dissolveConjugalLink(formed.value, coupleId);
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.value.population.find((p) => p.id === 'p-x')!.conjoints).toEqual([]);
    expect(res.value.population.find((p) => p.id === 'p-y')!.conjoints).toEqual([]);
    expect(res.value.couples.find((c) => c.id === coupleId)).toBeUndefined();
    expect(
      res.value.history.some(
        (e) => (e.kind === 'couple' || e.kind === 'divorce') && e.coupleId === coupleId,
      ),
    ).toBe(false);
  });

  it('dissolveConjugalLink : fonctionne sur un couple divorcé (« ex ») via le journal', () => {
    const formed = formCouple(singlesState(), 'p-x', 'p-y', 2);
    if (!formed.ok) throw new Error('formCouple');
    const coupleId = formed.value.couples[0].id;
    const divorced = divorceCouple(formed.value, coupleId, 4);
    if (!divorced.ok) throw new Error('divorceCouple');
    const res = dissolveConjugalLink(divorced.value, coupleId);
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.value.population.find((p) => p.id === 'p-x')!.conjoints).toEqual([]);
    expect(
      res.value.history.some(
        (e) => (e.kind === 'couple' || e.kind === 'divorce') && e.coupleId === coupleId,
      ),
    ).toBe(false);
  });

  it('INV-S12 : les opérations conjugales ne touchent jamais parents/enfants', () => {
    const base = singlesState();
    const x = { ...base.population[0], parents: ['par'], enfants: ['enf'] };
    const s = { ...base, population: [x, base.population[1], base.population[2]] };
    const res = formCouple(s, 'p-x', 'p-y', 3);
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    const a = res.value.population.find((p) => p.id === 'p-x')!;
    expect(a.parents).toEqual(['par']);
    expect(a.enfants).toEqual(['enf']);
  });

  it('cohérence reconstructAtYear : « actuel » à la formation, « ex » après divorce', () => {
    const formed = formCouple(singlesState(), 'p-x', 'p-y', 2);
    if (!formed.ok) throw new Error('formCouple');
    const coupleId = formed.value.couples[0].id;
    const divorced = divorceCouple(formed.value, coupleId, 4);
    if (!divorced.ok) throw new Error('divorceCouple');
    expect(
      reconstructAtYear(divorced.value, 3).population.find((p) => p.id === 'p-x')!.conjoints,
    ).toEqual([{ id: 'p-y', statut: 'actuel' }]);
    expect(
      reconstructAtYear(divorced.value, 5).population.find((p) => p.id === 'p-x')!.conjoints,
    ).toEqual([{ id: 'p-y', statut: 'ex' }]);
  });
});
