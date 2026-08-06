import { describe, it, expect } from 'vitest';
import { createRng } from '../../src/core/rng/rng.js';
import { reproduce } from '../../src/core/birth/reproduce.js';
import { defaultCatalog, defaultEspeces } from '../../src/core/catalog/defaultCatalog.js';
import { defaultParameters, type Parameters } from '../../src/core/params/parameters.js';
import {
  serializeState,
  deserializeState,
  FORMAT_VERSION,
  type AppState,
} from '../../src/core/state/serialize.js';
import type { Personne } from '../../src/core/model/personne.js';
import type { Pouvoir } from '../../src/core/model/pouvoir.js';

const catalog = defaultCatalog();
const ACTION = catalog.byType.Action[0].id;
const ELEMENT = catalog.byType.Element[0].id;

// Taux à 0 ⇒ naissance toujours normale (cf. plan).
const P: Parameters = { ...defaultParameters(), birthYear: 2000 };

function derivedPower(puissance: number, maitrise: number): Pouvoir {
  return {
    id: 'pp',
    label: 'l',
    template: 'DERIVE',
    traitIds: [ACTION, ELEMENT],
    puissance,
    maitrise,
  };
}

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
    pouvoirs: [derivedPower(6, 4)],
    notes: null,
  };
}

const parents = () => [makeParent('p-000001'), makeParent('p-000002')];

describe('reproduce — chemin normal (US1)', () => {
  it('INV-1 : même (seed, parents, params, catalog) ⇒ enfant identique', () => {
    const a = reproduce(parents(), P, catalog, createRng(0xc0ffeen), {
      childId: 'p-000003',
      birthYear: 2000,
    });
    const b = reproduce(parents(), P, catalog, createRng(0xc0ffeen), {
      childId: 'p-000003',
      birthYear: 2000,
    });
    expect(a).toEqual(b);
  });

  it('seeds différentes ⇒ enfants (en général) différents', () => {
    const a = reproduce(parents(), P, catalog, createRng(1n), { childId: 'c', birthYear: 2000 });
    const b = reproduce(parents(), P, catalog, createRng(2n), { childId: 'c', birthYear: 2000 });
    expect(a).not.toEqual(b);
  });

  it('INV-2 : héritage total — tout trait parental est présent (sauf disparition)', () => {
    const child = reproduce(parents(), P, catalog, createRng(0x1234n), {
      childId: 'c',
      birthYear: 2000,
    });
    const childIds = new Set(child.adn.traits.map((t) => t.traitId));
    expect(childIds.has(ACTION)).toBe(true);
    expect(childIds.has(ELEMENT)).toBe(true);
  });

  it('INV-9 : parenté — enfant.parents contient les deux parents sélectionnés', () => {
    const child = reproduce(parents(), P, catalog, createRng(9n), {
      childId: 'c',
      birthYear: 2000,
    });
    expect(child.parents).toEqual(['p-000001', 'p-000002']);
  });

  it('enfant : âge 0 (année courante) et id fourni', () => {
    const child = reproduce(parents(), P, catalog, createRng(9n), {
      childId: 'p-000003',
      birthYear: 2000,
    });
    expect(child.id).toBe('p-000003');
    expect(child.dateNaissance.startsWith('2000-')).toBe(true);
    expect(child.vivant).toBe(true);
  });
});

describe('reproduce — round-trip export/import (INV-10 / SC-007 / T025)', () => {
  it('état avec enfants + parenté restauré à l’identique', () => {
    const ps = parents();
    const child = reproduce(ps, P, catalog, createRng(0x5eedn), {
      childId: 'p-000003',
      birthYear: 2000,
    });
    // Parenté symétrique posée côté appelant (comme le store, INV-9).
    ps[0].enfants.push(child.id);
    ps[1].enfants.push(child.id);

    const state: AppState = {
      formatVersion: FORMAT_VERSION,
      kind: 'full',
      parameters: P,
      catalog,
      especes: defaultEspeces(),
      population: [...ps, child],
      currentYear: P.birthYear,
      genesisYear: P.birthYear,
      couples: [],
      rngState: createRng(0x5eedn).getState(),
      history: [],
    };
    const json = serializeState(state);
    const res = deserializeState(json);
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.value.population).toEqual([...ps, child]);
      expect(serializeState(res.value)).toBe(json);
    }
  });
});
