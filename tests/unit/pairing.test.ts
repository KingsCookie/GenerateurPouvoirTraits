import { describe, it, expect } from 'vitest';
import { createRng } from '../../src/core/rng/rng.js';
import { formCouples } from '../../src/core/repro/pairing.js';
import { defaultEspece } from '../../src/core/catalog/defaultCatalog.js';
import { defaultParameters, type Parameters } from '../../src/core/params/parameters.js';
import type { Personne } from '../../src/core/model/personne.js';
import type { Espece } from '../../src/core/model/espece.js';
import { fakeRng } from './_fakeRng.js';

function person(id: string, opts: { espece?: string; parents?: string[] } = {}): Personne {
  return {
    id,
    nom: id,
    especeId: opts.espece ?? 'humain',
    genreId: 'masculin',
    dateNaissance: '1990-01-01',
    age: 30,
    vivant: true,
    raisonDeces: null,
    immortel: false,
    parents: opts.parents ?? [],
    enfants: [],
    conjoints: [],
    adn: { traits: [] },
    pouvoirs: [],
    notes: null,
  };
}

const humain = defaultEspece(); // groupSize 2
const especeById = new Map<string, Espece>([['humain', humain]]);
const noConsang: Parameters = { ...defaultParameters(), consanguinityAllowed: false };

function idCounter() {
  let n = 0;
  return () => `c-${String(++n).padStart(6, '0')}`;
}

describe('Appariement §6.6 (T017)', () => {
  it('forme des couples de la taille de l’espèce (groupSize 2)', () => {
    const pop = [person('a'), person('b')];
    const res = formCouples(['a', 'b'], pop, noConsang, especeById, fakeRng(), idCounter());
    expect(res.couples).toHaveLength(1);
    expect(new Set(res.couples[0].memberIds)).toEqual(new Set(['a', 'b']));
    expect(res.unpaired).toEqual([]);
  });

  it('INV-5 : pas d’inter-espèces', () => {
    const especes = new Map<string, Espece>([
      ['humain', humain],
      ['elfe', { ...humain, id: 'elfe' }],
    ]);
    const pop = [person('a', { espece: 'humain' }), person('b', { espece: 'elfe' })];
    const res = formCouples(['a', 'b'], pop, noConsang, especes, fakeRng(), idCounter());
    expect(res.couples).toHaveLength(0);
    expect(res.unpaired.sort()).toEqual(['a', 'b']);
  });

  it('INV-4 : anti-consanguinité — fratrie (mêmes parents) non appariée si interdit', () => {
    const pop = [
      person('pa'),
      person('pb'),
      person('s1', { parents: ['pa', 'pb'] }),
      person('s2', { parents: ['pa', 'pb'] }),
    ];
    const res = formCouples(['s1', 's2'], pop, noConsang, especeById, fakeRng(), idCounter());
    expect(res.couples).toHaveLength(0);
  });

  it('INV-4 : cousins (mêmes grands-parents) non appariés si interdit', () => {
    const pop = [
      person('gpa'),
      person('gpb'),
      person('pa', { parents: ['gpa', 'gpb'] }),
      person('pb', { parents: ['gpa', 'gpb'] }),
      person('c1', { parents: ['pa'] }),
      person('c2', { parents: ['pb'] }),
    ];
    const res = formCouples(['c1', 'c2'], pop, noConsang, especeById, fakeRng(), idCounter());
    expect(res.couples).toHaveLength(0); // partagent gpa & gpb
  });

  it('consanguinité autorisée ⇒ la fratrie peut s’apparier', () => {
    const allow: Parameters = { ...defaultParameters(), consanguinityAllowed: true };
    const pop = [
      person('pa'),
      person('pb'),
      person('s1', { parents: ['pa', 'pb'] }),
      person('s2', { parents: ['pa', 'pb'] }),
    ];
    const res = formCouples(['s1', 's2'], pop, allow, especeById, fakeRng(), idCounter());
    expect(res.couples).toHaveLength(1);
  });

  it('candidat seul (taille de groupe non atteinte) ⇒ reporté', () => {
    const pop = [person('a')];
    const res = formCouples(['a'], pop, noConsang, especeById, fakeRng(), idCounter());
    expect(res.couples).toHaveLength(0);
    expect(res.unpaired).toEqual(['a']);
  });

  it('déterminisme : même seed ⇒ mêmes couples', () => {
    const pop = ['a', 'b', 'c', 'd'].map((id) => person(id));
    const ids = ['a', 'b', 'c', 'd'];
    const a = formCouples(ids, pop, noConsang, especeById, createRng(0x1234n), idCounter());
    const b = formCouples(ids, pop, noConsang, especeById, createRng(0x1234n), idCounter());
    expect(a.couples.map((c) => c.memberIds)).toEqual(b.couples.map((c) => c.memberIds));
  });
});
