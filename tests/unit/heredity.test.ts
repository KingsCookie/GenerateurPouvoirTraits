import { describe, it, expect } from 'vitest';
import { createRng } from '../../src/core/rng/rng.js';
import { inheritADN } from '../../src/core/heredity/inherit.js';
import { defaultParameters, type Parameters } from '../../src/core/params/parameters.js';
import { setResiliencePatch } from '../../src/core/params/resolveResilience.js';
import type { Personne } from '../../src/core/model/personne.js';
import type { ResilientTrait } from '../../src/core/model/adn.js';
import { fakeRng } from './_fakeRng.js';

function parent(traits: ResilientTrait[]): Personne {
  return {
    id: 'x',
    nom: 'X',
    especeId: 'e',
    genreId: 'masculin',
    dateNaissance: '0000-01-01',
    age: 0,
    vivant: true,
    raisonDeces: null,
    immortel: false,
    parents: [],
    enfants: [],
    conjoints: [],
    adn: { traits },
    pouvoirs: [],
    notes: null,
  };
}

const P: Parameters = {
  ...defaultParameters(),
  bonusPoints: 5,
  malusPoints: 5,
  resilienceMax: 95,
  disappearThreshold: 2,
};

function only(traits: ResilientTrait[]) {
  return traits.find((t) => t.traitId === 't1');
}

describe('Hérédité §4 — Cas 1 (un seul porteur)', () => {
  it('tiré actif ⇒ actif, résilience initiale + bonus (additif)', () => {
    const adn = inheritADN(
      [parent([{ traitId: 't1', active: true, resilience: 50 }])],
      P,
      fakeRng({ chances: [true] }),
    );
    expect(only(adn.traits)).toEqual({ traitId: 't1', active: true, resilience: 55 });
  });

  it('tiré inactif ⇒ inactif, résilience initiale − malus', () => {
    const adn = inheritADN(
      [parent([{ traitId: 't1', active: true, resilience: 50 }])],
      P,
      fakeRng({ chances: [false] }),
    );
    expect(only(adn.traits)).toEqual({ traitId: 't1', active: false, resilience: 45 });
  });

  it('plafond resilienceMax : le bonus ne dépasse pas le plafond', () => {
    const adn = inheritADN(
      [parent([{ traitId: 't1', active: true, resilience: 94 }])],
      P,
      fakeRng({ chances: [true] }),
    );
    expect(only(adn.traits)?.resilience).toBe(95);
  });

  it('disparition : sous le seuil, le trait quitte l’ADN', () => {
    const adn = inheritADN(
      [parent([{ traitId: 't1', active: true, resilience: 3 }])],
      P,
      fakeRng({ chances: [false] }),
    );
    expect(adn.traits).toEqual([]); // 3 − 5 = −2 → clamp 0 < seuil 2 ⇒ retiré
  });

  it('transmission des traits inactifs (§4.3) : un trait inactif est quand même hérité', () => {
    const adn = inheritADN(
      [parent([{ traitId: 't1', active: false, resilience: 50 }])],
      P,
      fakeRng({ chances: [true] }),
    );
    expect(only(adn.traits)).toEqual({ traitId: 't1', active: true, resilience: 55 });
  });
});

describe('Hérédité §4.2 — Cas 2 (plusieurs porteurs)', () => {
  // Deux parents portent t1 (résiliences 50 puis 70). Tirages dans l'ordre des parents.
  function two(chances: boolean[]) {
    const parents = [
      parent([{ traitId: 't1', active: true, resilience: 50 }]),
      parent([{ traitId: 't1', active: true, resilience: 70 }]),
    ];
    return only(inheritADN(parents, P, fakeRng({ chances })).traits);
  }

  it('aucun tirage actif ⇒ inactif, résilience = max porteurs − malus', () => {
    expect(two([false, false])).toEqual({ traitId: 't1', active: false, resilience: 65 });
  });

  it('un seul tirage actif ⇒ actif, résilience = celle du tirage actif + bonus', () => {
    expect(two([false, true])).toEqual({ traitId: 't1', active: true, resilience: 75 });
  });

  it('plusieurs tirages actifs ⇒ actif, résilience = max + bonus × nbActifs', () => {
    expect(two([true, true])).toEqual({ traitId: 't1', active: true, resilience: 80 });
  });
});

describe('Hérédité §9.2 — surcharge de résilience (type / trait)', () => {
  const ID = 'Element:feu-0';
  function withTrait(res: number) {
    return parent([{ traitId: ID, active: true, resilience: res }]);
  }
  function effOnly(traits: ResilientTrait[]) {
    return traits.find((t) => t.traitId === ID);
  }

  it('plafond effectif par TYPE applique un max plus bas', () => {
    const p = setResiliencePatch(P, { level: 'type', type: 'Element' }, { max: 80 });
    // 94 + bonus 5 = 99, plafonné à 80 (et non 95 global).
    const adn = inheritADN([withTrait(94)], p, fakeRng({ chances: [true] }));
    expect(effOnly(adn.traits)?.resilience).toBe(80);
  });

  it('plafond effectif par TRAIT prime sur le type', () => {
    let p = setResiliencePatch(P, { level: 'type', type: 'Element' }, { max: 80 });
    p = setResiliencePatch(p, { level: 'trait', traitId: ID }, { max: 70 });
    const adn = inheritADN([withTrait(94)], p, fakeRng({ chances: [true] }));
    expect(effOnly(adn.traits)?.resilience).toBe(70);
  });

  it('seuil de disparition effectif abaissé conserve un trait sous le seuil global', () => {
    // 3 − malus 5 = −2 → clamp 0. Seuil global 2 ⇒ retiré ; seuil type 0 ⇒ conservé (res 0).
    const p = setResiliencePatch(P, { level: 'type', type: 'Element' }, { disappearThreshold: 0 });
    const adn = inheritADN([withTrait(3)], p, fakeRng({ chances: [false] }));
    expect(effOnly(adn.traits)).toEqual({ traitId: ID, active: false, resilience: 0 });
  });
});

describe('Hérédité — déterminisme (Principe I)', () => {
  it('même (seed, parents, params) ⇒ ADN identique', () => {
    const parents = [
      parent([
        { traitId: 't1', active: true, resilience: 60 },
        { traitId: 't2', active: false, resilience: 40 },
      ]),
      parent([{ traitId: 't1', active: true, resilience: 80 }]),
    ];
    const a = inheritADN(parents, P, createRng(0xfeed1234n));
    const b = inheritADN(parents, P, createRng(0xfeed1234n));
    expect(a).toEqual(b);
  });
});
