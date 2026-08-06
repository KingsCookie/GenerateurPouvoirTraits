import { describe, it, expect } from 'vitest';
import { inheritStats } from '../../src/core/powers/inheritStats.js';
import { defaultParameters, type Parameters } from '../../src/core/params/parameters.js';
import type { Personne } from '../../src/core/model/personne.js';
import type { Pouvoir } from '../../src/core/model/pouvoir.js';
import { fakeRng } from './_fakeRng.js';

function pow(puissance: number, maitrise: number): Pouvoir {
  return { id: 'p', label: 'l', template: 'DERIVE', traitIds: [], puissance, maitrise };
}

function parent(pouvoirs: Pouvoir[]): Personne {
  return {
    id: 'x',
    nom: 'X',
    especeId: 'e',
    genreId: 'masculin',
    dateNaissance: '0000-01-01',
    vivant: true,
    raisonDeces: null,
    parents: [],
    enfants: [],
    conjoints: [],
    adn: { traits: [] },
    pouvoirs,
    notes: null,
  };
}

// C = 100 ⇒ on retombe toujours sur « moyenne » (un seul nextFloat par valeur).
const MEAN: Parameters = { ...defaultParameters(), statB: 0, statC: 100 };
const meanRng = () => fakeRng({ floats: [0.5, 0.5] });

describe('§7.2 — héritage P/M : mapping i mod n', () => {
  it('Exemple 1 : enfant 3 pouvoirs, parents 2 et 3 pouvoirs', () => {
    const a = parent([pow(4, 2), pow(8, 4)]);
    const b = parent([pow(6, 4), pow(2, 6), pow(10, 8)]);
    expect(inheritStats(0, [a, b], MEAN, meanRng())).toEqual({ puissance: 5, maitrise: 3 });
    expect(inheritStats(1, [a, b], MEAN, meanRng())).toEqual({ puissance: 5, maitrise: 5 });
    // pe3 : parent A → 2 mod 2 = 0 (pa1) ; parent B → pb3.
    expect(inheritStats(2, [a, b], MEAN, meanRng())).toEqual({ puissance: 7, maitrise: 5 });
  });

  it('Exemple 2 : enfant 2 pouvoirs, parents 4 et 3 pouvoirs (surplus ignoré)', () => {
    const a = parent([pow(4, 1), pow(6, 1), pow(8, 1), pow(10, 1)]);
    const b = parent([pow(6, 1), pow(4, 1), pow(2, 1)]);
    expect(inheritStats(0, [a, b], MEAN, meanRng())).toEqual({ puissance: 5, maitrise: 1 });
    expect(inheritStats(1, [a, b], MEAN, meanRng())).toEqual({ puissance: 5, maitrise: 1 });
  });
});

describe('§7.2 — arrondi « demi vers le pair » (bancaire)', () => {
  it('moyenne 4,5 ⇒ 4 (pair le plus proche)', () => {
    const a = parent([pow(4, 4)]);
    const b = parent([pow(5, 5)]);
    expect(inheritStats(0, [a, b], MEAN, meanRng())).toEqual({ puissance: 4, maitrise: 4 }); // 4,5→4
  });

  it('moyenne 5,5 ⇒ 6 (pair le plus proche)', () => {
    const a = parent([pow(5, 5)]);
    const b = parent([pow(6, 6)]);
    expect(inheritStats(0, [a, b], MEAN, meanRng())).toEqual({ puissance: 6, maitrise: 6 }); // 5,5→6
  });

  it('moyenne 4,33 ⇒ 4', () => {
    const a = parent([pow(4, 4)]);
    const b = parent([pow(4, 4)]);
    const c = parent([pow(5, 5)]);
    expect(inheritStats(0, [a, b, c], MEAN, meanRng())).toEqual({ puissance: 4, maitrise: 4 });
  });
});

describe('§7.2 — tirage A/B/C et bornage (INV-4)', () => {
  it('cas A : nouvelle valeur bornée [1,10] même si la moyenne est énorme', () => {
    const onlyA: Parameters = { ...defaultParameters(), statB: 0, statC: 0 }; // A = 100
    const a = parent([pow(100, 100)]);
    const b = parent([pow(100, 100)]);
    // roll < A pour les deux valeurs ; valeur = nextInt(10)+1 (6→7, 2→3).
    const res = inheritStats(0, [a, b], onlyA, fakeRng({ floats: [0, 0], ints: [6, 2] }));
    expect(res).toEqual({ puissance: 7, maitrise: 3 });
  });

  it('cas « moyenne+1 » non borné : peut dépasser 10', () => {
    const plus: Parameters = { ...defaultParameters(), statB: 50, statC: 0 }; // A=0 ; roll≥50 ⇒ moy+1
    const a = parent([pow(10, 10)]);
    const b = parent([pow(10, 10)]);
    const res = inheritStats(0, [a, b], plus, fakeRng({ floats: [0.6, 0.6] }));
    expect(res).toEqual({ puissance: 11, maitrise: 11 });
  });

  it('aucun parent source ⇒ cas A (aléatoire 1-10)', () => {
    const a = parent([]);
    const b = parent([]);
    const res = inheritStats(0, [a, b], MEAN, fakeRng({ ints: [4, 8] }));
    expect(res).toEqual({ puissance: 5, maitrise: 9 }); // nextInt+1 : 4→5, 8→9
  });

  it('US10 : cas « moyenne » (C) non borné — moyenne parentale > 10 conservée', () => {
    // statC = 100 ⇒ toujours cas C = moyenne ; aucune borne ⇒ P/M peuvent dépasser 10.
    const a = parent([pow(5000, 5000)]);
    const b = parent([pow(5000, 5000)]);
    const res = inheritStats(0, [a, b], MEAN, meanRng());
    expect(res).toEqual({ puissance: 5000, maitrise: 5000 });
  });
});
