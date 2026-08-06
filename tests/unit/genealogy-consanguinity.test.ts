import { describe, it, expect } from 'vitest';
import { formCouples, isDirectLineage } from '../../src/core/repro/pairing.js';
import { defaultEspece } from '../../src/core/catalog/defaultCatalog.js';
import { defaultParameters, type Parameters } from '../../src/core/params/parameters.js';
import type { Personne } from '../../src/core/model/personne.js';
import type { Espece } from '../../src/core/model/espece.js';
import { fakeRng } from './_fakeRng.js';

// US1 — anti-consanguinité en **lignée directe** (parent↔enfant, grand-parent↔petit-enfant),
// 2 niveaux (§6.6.1). Complète pairing.test.ts (fratrie/cousins).

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
const allow: Parameters = { ...defaultParameters(), consanguinityAllowed: true };

function idCounter() {
  let n = 0;
  return () => `c-${String(++n).padStart(6, '0')}`;
}

describe('US1 — consanguinité lignée directe (§6.6.1)', () => {
  it('isDirectLineage : parent↔enfant et grand-parent↔petit-enfant, symétrique', () => {
    const byId = new Map(
      [
        person('gp'),
        person('p', { parents: ['gp'] }),
        person('c', { parents: ['p'] }),
        person('x'),
      ].map((pp) => [pp.id, pp]),
    );
    expect(isDirectLineage('p', 'c', byId)).toBe(true); // parent↔enfant
    expect(isDirectLineage('c', 'p', byId)).toBe(true); // symétrie
    expect(isDirectLineage('gp', 'c', byId)).toBe(true); // grand-parent↔petit-enfant
    expect(isDirectLineage('c', 'gp', byId)).toBe(true);
    expect(isDirectLineage('p', 'x', byId)).toBe(false); // sans lien
  });

  it('parent↔enfant : pas d’appariement si interdit', () => {
    const pop = [person('p'), person('c', { parents: ['p'] })];
    const res = formCouples(['p', 'c'], pop, noConsang, especeById, fakeRng(), idCounter());
    expect(res.couples).toHaveLength(0);
  });

  it('grand-parent↔petit-enfant : pas d’appariement si interdit', () => {
    const pop = [person('gp'), person('p', { parents: ['gp'] }), person('c', { parents: ['p'] })];
    const res = formCouples(['gp', 'c'], pop, noConsang, especeById, fakeRng(), idCounter());
    expect(res.couples).toHaveLength(0);
  });

  it('lignée directe autorisée si consanguinité permise', () => {
    const pop = [person('p'), person('c', { parents: ['p'] })];
    const res = formCouples(['p', 'c'], pop, allow, especeById, fakeRng(), idCounter());
    expect(res.couples).toHaveLength(1);
  });

  it('groupe > 2 : la garde s’applique à chaque paire du groupe', () => {
    // Espèce à groupSize 3 : p (parent) ne doit se retrouver avec aucun de ses enfants.
    const espece3: Espece = { ...humain, groupSize: 3 };
    const especes3 = new Map<string, Espece>([['humain', espece3]]);
    const pop = [
      person('p'),
      person('c1', { parents: ['p'] }),
      person('c2', { parents: ['p'] }),
      person('x'), // sans lien : appariable
    ];
    const res = formCouples(
      ['p', 'c1', 'c2', 'x'],
      pop,
      noConsang,
      especes3,
      fakeRng(),
      idCounter(),
    );
    // Aucun couple ne peut réunir p avec c1/c2 (lignée directe) ni c1/c2 ensemble (fratrie).
    for (const couple of res.couples) {
      const members = new Set(couple.memberIds);
      if (members.has('p')) {
        expect(members.has('c1')).toBe(false);
        expect(members.has('c2')).toBe(false);
      }
      expect(members.has('c1') && members.has('c2')).toBe(false);
    }
  });
});
