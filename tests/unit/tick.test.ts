import { describe, it, expect } from 'vitest';
import { createRng, createRngFromState } from '../../src/core/rng/rng.js';
import { tick, advanceYears } from '../../src/core/time/tick.js';
import { defaultCatalog, defaultEspece } from '../../src/core/catalog/defaultCatalog.js';
import { defaultParameters, type Parameters } from '../../src/core/params/parameters.js';
import {
  serializeState,
  deserializeState,
  FORMAT_VERSION,
  type AppState,
} from '../../src/core/state/serialize.js';
import type { Personne, Conjoint } from '../../src/core/model/personne.js';
import type { Espece } from '../../src/core/model/espece.js';
import type { Couple } from '../../src/core/model/couple.js';
import { computeGeneration } from '../../src/core/genesis/derived.js';

function espece(over: Partial<Espece> = {}): Espece {
  return { ...defaultEspece(), ...over };
}

function person(id: string, birthYear: number, conjoints: Conjoint[] = []): Personne {
  return {
    id,
    nom: id,
    especeId: 'humain',
    genreId: 'masculin',
    dateNaissance: `${String(birthYear).padStart(4, '0')}-06-15`,
    age: 0, // recalculé par makeState (= currentYear − birthYear)
    vivant: true,
    raisonDeces: null,
    immortel: false,
    parents: [],
    enfants: [],
    conjoints,
    adn: { traits: [] },
    pouvoirs: [],
    notes: null,
  };
}

function makeState(opts: {
  population: Personne[];
  currentYear: number;
  espece: Espece;
  params?: Partial<Parameters>;
  couples?: Couple[];
}): AppState {
  return {
    formatVersion: FORMAT_VERSION,
    kind: 'full',
    parameters: { ...defaultParameters(), ...opts.params },
    catalog: defaultCatalog(),
    especes: [opts.espece],
    // Âge suivi (Feature 015) initialisé à la valeur dérivée (= comportement historique au t0).
    population: opts.population.map((p) => ({
      ...p,
      age: opts.currentYear - Number(p.dateNaissance.split('-')[0]),
    })),
    currentYear: opts.currentYear,
    genesisYear: 0,
    couples: opts.couples ?? [],
    rngState: createRng(1n).getState(),
    history: [],
  };
}

// Espèce « test » : tout le monde veut se reproduire (pic 100 % sur [0,100]), portée fixe 2, pas de divorce.
const sureRepro = espece({
  reproStartAge: 0,
  reproEndAge: 100,
  reproPeakAge: 30,
  reproPeakPct: 100,
  reproSlope: 100,
  groupSize: 2,
  litterMin: 2,
  litterMax: 2,
  litterExtraPct: 0,
  divorcePct: 0,
});

describe('Tick annuel §6.6 — chemin normal (T013)', () => {
  it('INV-2 : vieillissement + année courante +1', () => {
    const noRepro = espece({ reproPeakPct: 0 });
    const s0 = makeState({ population: [person('a', 1975)], currentYear: 2000, espece: noRepro });
    const s1 = advanceYears(s0, 5, createRng(7n));
    expect(s1.currentYear).toBe(2005);
    // a né en 1975 ⇒ âge 30 en 2005.
    const a = s1.population.find((p) => p.id === 'a')!;
    expect(2005 - 1975).toBe(30);
    expect(a.vivant).toBe(true);
  });

  it('formation de couple + portée dès l’année (nouveau couple), parenté posée (INV-9)', () => {
    const s0 = makeState({
      population: [person('a', 1975), person('b', 1976)],
      currentYear: 2000,
      espece: sureRepro,
    });
    const s1 = tick(s0, createRng(0x1111n));
    // 2 parents + 2 enfants (portée fixe 2).
    expect(s1.population).toHaveLength(4);
    expect(s1.couples).toHaveLength(1);
    const children = s1.population.filter((p) => !['a', 'b'].includes(p.id));
    for (const child of children) {
      expect(new Set(child.parents)).toEqual(new Set(['a', 'b']));
      expect(child.dateNaissance.startsWith('2000-')).toBe(true);
    }
    // Les parents référencent les enfants.
    const a = s1.population.find((p) => p.id === 'a')!;
    expect(a.enfants).toHaveLength(2);
  });

  it('INV-1 : déterminisme — même état + même seed ⇒ population identique', () => {
    const base = () =>
      makeState({
        population: [person('a', 1975), person('b', 1976), person('c', 1977), person('d', 1978)],
        currentYear: 2000,
        espece: sureRepro,
      });
    const a = advanceYears(base(), 3, createRng(0xbeefn));
    const b = advanceYears(base(), 3, createRng(0xbeefn));
    expect(a).toEqual(b);
  });
});

describe('Tick annuel §6.6 — divorces & couples existants (T023 / US2)', () => {
  const couple = (a: string, b: string): Couple => ({
    id: 'c-000001',
    memberIds: [a, b],
    reproPct: null,
  });

  it('INV-7 : divorce 0 % ⇒ aucun divorce ; 100 % ⇒ tous dissous + ex-conjoints', () => {
    const mkCoupleState = (divorcePct: number) =>
      makeState({
        population: [
          person('a', 1975, [{ id: 'b', statut: 'actuel' }]),
          person('b', 1976, [{ id: 'a', statut: 'actuel' }]),
        ],
        currentYear: 2000,
        espece: espece({ reproPeakPct: 0, divorcePct }),
        couples: [couple('a', 'b')],
      });

    const kept = tick(mkCoupleState(0), createRng(1n));
    expect(kept.couples).toHaveLength(1);

    const split = tick(mkCoupleState(100), createRng(1n));
    expect(split.couples).toHaveLength(0);
    const a = split.population.find((p) => p.id === 'a')!;
    expect(a.conjoints.find((c) => c.id === 'b')?.statut).toBe('ex');
  });

  it('couple existant : reproPct=100 ⇒ produit une portée', () => {
    const s0 = makeState({
      population: [
        person('a', 1975, [{ id: 'b', statut: 'actuel' }]),
        person('b', 1976, [{ id: 'a', statut: 'actuel' }]),
      ],
      currentYear: 2000,
      espece: espece({
        reproPeakPct: 0,
        divorcePct: 0,
        litterMin: 1,
        litterMax: 1,
        litterExtraPct: 0,
      }),
      couples: [{ id: 'c-000001', memberIds: ['a', 'b'], reproPct: 100 }],
    });
    const s1 = tick(s0, createRng(0x2222n));
    expect(s1.population.length).toBe(3); // 2 + 1 enfant
  });
});

describe('Mort naturelle & âge suivi §6.6/§6.7 (Feature 015, US1)', () => {
  const noRepro = espece({ reproPeakPct: 0, divorcePct: 0 });

  it('INV-A1/A2 : vieillissement +1/an des vivants ; nouveau-né à 0 an', () => {
    const s0 = makeState({ population: [person('a', 1975)], currentYear: 2000, espece: noRepro });
    const s1 = advanceYears(s0, 5, createRng(7n));
    const a = s1.population.find((p) => p.id === 'a')!;
    expect(a.age).toBe(30); // 25 + 5 ticks
  });

  it('INV-D1/D6 : mortNaturellePct=0 ⇒ personne ne meurt, même au-delà de l’espérance', () => {
    const esp = espece({ reproPeakPct: 0, esperanceVie: 60, mortNaturellePct: 0 });
    // né en 1930 ⇒ 70 ans en 2000 (> espérance).
    const s0 = makeState({ population: [person('a', 1930)], currentYear: 2000, espece: esp });
    const s1 = advanceYears(s0, 3, createRng(9n));
    expect(s1.population.find((p) => p.id === 'a')!.vivant).toBe(true);
  });

  it('INV-D2/D4 : au-delà de l’espérance à 100 % ⇒ meurt « mort naturelle » ; âge figé (INV-A3)', () => {
    const esp = espece({ reproPeakPct: 0, esperanceVie: 60, mortNaturellePct: 100 });
    const s0 = makeState({ population: [person('a', 1930)], currentYear: 2000, espece: esp });
    const s1 = tick(s0, createRng(1n)); // aging 70→71, puis mort
    const a1 = s1.population.find((p) => p.id === 'a')!;
    expect(a1.vivant).toBe(false);
    expect(a1.raisonDeces).toBe('mort naturelle');
    const ageMort = a1.age;
    // Après d'autres ticks, l'âge reste figé (le mort ne vieillit plus).
    const s2 = advanceYears(s1, 4, createRng(2n));
    expect(s2.population.find((p) => p.id === 'a')!.age).toBe(ageMort);
  });

  it('INV-D1 : sous l’espérance ⇒ jamais de mort naturelle (même à 100 %)', () => {
    const esp = espece({ reproPeakPct: 0, esperanceVie: 60, mortNaturellePct: 100 });
    // né en 1980 ⇒ 20 ans ; +3 ⇒ 23, toujours < 60.
    const s0 = makeState({ population: [person('a', 1980)], currentYear: 2000, espece: esp });
    const s1 = advanceYears(s0, 3, createRng(1n));
    expect(s1.population.find((p) => p.id === 'a')!.vivant).toBe(true);
  });

  it('INV-D3 : un immortel ne meurt jamais de mort naturelle', () => {
    const esp = espece({ reproPeakPct: 0, esperanceVie: 60, mortNaturellePct: 100 });
    const base = makeState({ population: [person('a', 1930)], currentYear: 2000, espece: esp });
    const s0: AppState = {
      ...base,
      population: base.population.map((p) => ({ ...p, immortel: true })),
    };
    const s1 = advanceYears(s0, 3, createRng(1n));
    expect(s1.population.find((p) => p.id === 'a')!.vivant).toBe(true);
  });

  it('INV-A4 : la tranche de génération est invariante avant/après la mort', () => {
    const esp = espece({ reproPeakPct: 0, esperanceVie: 60, mortNaturellePct: 100 });
    const s0 = makeState({ population: [person('a', 1930)], currentYear: 2000, espece: esp });
    const before = computeGeneration(1930, s0.genesisYear);
    const s1 = tick(s0, createRng(1n));
    const a = s1.population.find((p) => p.id === 'a')!;
    expect(a.vivant).toBe(false);
    expect(computeGeneration(1930, s1.genesisYear)).toBe(before); // date de naissance immuable
  });

  it('INV-D5 : déterminisme — même seed ⇒ mêmes morts naturelles', () => {
    const esp = espece({ reproPeakPct: 0, esperanceVie: 60, mortNaturellePct: 40 });
    const mk = () =>
      makeState({
        population: [person('a', 1925), person('b', 1926), person('c', 1927), person('d', 1928)],
        currentYear: 2000,
        espece: esp,
      });
    const r1 = advanceYears(mk(), 3, createRng(0xabcn));
    const r2 = advanceYears(mk(), 3, createRng(0xabcn));
    expect(r1.population).toEqual(r2.population);
  });
});

describe('Continuation déterministe après export/import (INV-10 / FR-021 / T031)', () => {
  it('avancer après import = avancer en continu (état du RNG restitué)', () => {
    const base = makeState({
      population: [person('a', 1975), person('b', 1976), person('c', 1977), person('d', 1978)],
      currentYear: 2000,
      espece: sureRepro,
    });

    // Continu : 3 années d'affilée.
    const full = advanceYears(base, 3, createRngFromState(base.rngState));

    // Coupé : 1 an → export → import → 2 ans (RNG repris de l'état sérialisé).
    const s1 = advanceYears(base, 1, createRngFromState(base.rngState));
    const res = deserializeState(serializeState(s1));
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    const resumed = advanceYears(res.value, 2, createRngFromState(res.value.rngState));

    expect(resumed.currentYear).toBe(full.currentYear);
    expect(resumed.population).toEqual(full.population);
    expect(resumed.couples).toEqual(full.couples);
  });
});
