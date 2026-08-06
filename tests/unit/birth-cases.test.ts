import { describe, it, expect } from 'vitest';
import { createRng } from '../../src/core/rng/rng.js';
import { reproduce } from '../../src/core/birth/reproduce.js';
import { defaultCatalog } from '../../src/core/catalog/defaultCatalog.js';
import { defaultParameters, type Parameters } from '../../src/core/params/parameters.js';
import type { Personne } from '../../src/core/model/personne.js';

const catalog = defaultCatalog();
const ACTION = catalog.byType.Action[0].id;
const ELEMENT = catalog.byType.Element[0].id;

function makeParent(id: string): Personne {
  return {
    id,
    nom: id,
    especeId: 'esp',
    genreId: 'masculin',
    dateNaissance: '1980-01-01',
    age: 30,
    vivant: true,
    raisonDeces: null,
    immortel: false,
    parents: [],
    enfants: [],
    conjoints: [],
    adn: {
      traits: [
        { traitId: ACTION, active: true, resilience: 60 },
        { traitId: ELEMENT, active: true, resilience: 60 },
      ],
    },
    pouvoirs: [
      {
        id: 'pp',
        label: 'l',
        template: 'DERIVE',
        traitIds: [ACTION, ELEMENT],
        puissance: 6,
        maitrise: 4,
      },
    ],
    notes: null,
  };
}

const parents = () => [makeParent('p-000001'), makeParent('p-000002')];

describe('Cas spéciaux §6.1 (US2)', () => {
  it('mutation forte 100 % ⇒ 1 pouvoir gabarit, P/M ∈ [1,10], traits parentaux inactifs (INV-3/INV-4)', () => {
    const P: Parameters = { ...defaultParameters(), strongMutationRatePct: 100 };
    const child = reproduce(parents(), P, catalog, createRng(0xa11n), {
      childId: 'c',
      birthYear: 2000,
    });
    expect(child.pouvoirs).toHaveLength(1);
    const pw = child.pouvoirs[0];
    expect(pw.template).not.toBe('DERIVE'); // gabarit AE/PE/PA/PR
    expect(pw.puissance).toBeGreaterThanOrEqual(1);
    expect(pw.puissance).toBeLessThanOrEqual(10);
    expect(pw.maitrise).toBeGreaterThanOrEqual(1);
    expect(pw.maitrise).toBeLessThanOrEqual(10);
    // Les traits parentaux (hors traits du pouvoir gabarit) sont inactifs.
    const powTraits = new Set(pw.traitIds);
    for (const t of child.adn.traits) {
      if (!powTraits.has(t.traitId)) expect(t.active).toBe(false);
    }
  });

  it('sans pouvoir 100 % ⇒ 0 pouvoir, tous les traits parentaux inactifs (INV-3)', () => {
    const P: Parameters = { ...defaultParameters(), noPowerRatePct: 100 };
    const child = reproduce(parents(), P, catalog, createRng(0xb22n), {
      childId: 'c',
      birthYear: 2000,
    });
    expect(child.pouvoirs).toEqual([]);
    expect(child.adn.traits.length).toBeGreaterThan(0);
    expect(child.adn.traits.every((t) => !t.active)).toBe(true);
  });

  it('SC-005 : proportion du cas forte ≈ taux paramétré (±5 pts sur 2000 naissances)', () => {
    const P: Parameters = { ...defaultParameters(), strongMutationRatePct: 30 };
    const N = 2000;
    let forte = 0;
    for (let i = 0; i < N; i++) {
      const child = reproduce(parents(), P, catalog, createRng(BigInt(i) * 2654435761n + 1n), {
        childId: 'c',
        birthYear: 2000,
      });
      // forte ⇒ exactement 1 pouvoir de gabarit (non dérivé).
      if (child.pouvoirs.length === 1 && child.pouvoirs[0].template !== 'DERIVE') forte++;
    }
    const pct = (forte / N) * 100;
    expect(Math.abs(pct - 30)).toBeLessThanOrEqual(5);
  });
});

describe('Mutation faible §6.3 (US2)', () => {
  it('perte 100 % ⇒ l’enfant perd un trait par rapport à l’hérédité simple', () => {
    const withLoss: Parameters = {
      ...defaultParameters(),
      weakMutationLossPct: 100,
      generationK: 0,
    };
    const noLoss: Parameters = { ...defaultParameters(), weakMutationLossPct: 0, generationK: 0 };
    const seed = 0xcafe1n;
    const a = reproduce(parents(), withLoss, catalog, createRng(seed), {
      childId: 'c',
      birthYear: 2000,
    });
    const b = reproduce(parents(), noLoss, catalog, createRng(seed), {
      childId: 'c',
      birthYear: 2000,
    });
    // La perte retire un trait avant dérivation : moins de traits qu'en l'absence de perte.
    expect(a.adn.traits.length).toBeLessThan(b.adn.traits.length);
  });

  it('gain 100 % : un trait gagné est actif dans l’ADN', () => {
    const gain: Parameters = { ...defaultParameters(), weakMutationGainPct: 100, generationK: 0 };
    const child = reproduce(parents(), gain, catalog, createRng(0xd00dn), {
      childId: 'c',
      birthYear: 2000,
    });
    // Au moins un trait actif (le gain garantit une activation).
    expect(child.adn.traits.some((t) => t.active)).toBe(true);
  });
});
