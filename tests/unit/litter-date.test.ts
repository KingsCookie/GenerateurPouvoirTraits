import { describe, it, expect } from 'vitest';
import { reproduce } from '../../src/core/birth/reproduce.js';
import { tick } from '../../src/core/time/tick.js';
import { createRng } from '../../src/core/rng/rng.js';
import { defaultParameters } from '../../src/core/params/parameters.js';
import { defaultCatalog, defaultEspece } from '../../src/core/catalog/defaultCatalog.js';
import type { AppState } from '../../src/core/state/serialize.js';
import type { Personne } from '../../src/core/model/personne.js';
import type { Couple } from '../../src/core/model/couple.js';

// US2 — tous les enfants d'une **même portée** partagent la date de naissance (§6.6.2).

function adult(id: string): Personne {
  return {
    id,
    nom: id,
    especeId: 'humain',
    genreId: 'masculin',
    dateNaissance: '1970-01-01',
    age: 30,
    vivant: true,
    raisonDeces: null,
    immortel: false,
    parents: [],
    enfants: [],
    conjoints: [{ id: id === 'p1' ? 'p2' : 'p1', statut: 'actuel' }],
    adn: { traits: [] },
    pouvoirs: [],
    notes: null,
  };
}

describe('US2 — date partagée de portée', () => {
  it('reproduce : birthDayOfYear fourni ⇒ date déterminée, non tirée du rng', () => {
    const params = defaultParameters();
    const catalog = defaultCatalog();
    const parents: Personne[] = [adult('p1'), adult('p2')];
    const a = reproduce(parents, params, catalog, createRng(1n), {
      childId: 'c1',
      birthYear: 2000,
      birthDayOfYear: 42,
    });
    const b = reproduce(parents, params, catalog, createRng(999n), {
      childId: 'c2',
      birthYear: 2000,
      birthDayOfYear: 42,
    });
    // Même jour partagé ⇒ même date, quelle que soit la seed.
    expect(a.dateNaissance).toBe(b.dateNaissance);
    expect(a.dateNaissance.startsWith('2000-')).toBe(true);
  });

  it('tick : une portée ≥ 2 ⇒ enfants de même date de naissance', () => {
    const params = { ...defaultParameters(), consanguinityAllowed: true };
    // Espèce à portée fixe de 3 enfants, sans divorce.
    const espece = {
      ...defaultEspece(),
      litterMin: 3,
      litterMax: 3,
      litterExtraPct: 0,
      divorcePct: 0,
    };
    const couple: Couple = { id: 'c-000001', memberIds: ['p1', 'p2'], reproPct: 100 };
    const state: AppState = {
      formatVersion: 3,
      kind: 'full',
      parameters: params,
      catalog: defaultCatalog(),
      especes: [espece],
      population: [adult('p1'), adult('p2')],
      currentYear: 2000,
      genesisYear: 2000,
      couples: [couple],
      rngState: createRng(1234n).getState(),
      history: [],
    };

    const rng = createRng(1234n);
    const next = tick(state, rng);
    const newborns = next.population.filter((p) => p.parents.length > 0);
    expect(newborns.length).toBe(3);
    const dates = new Set(newborns.map((p) => p.dateNaissance));
    expect(dates.size).toBe(1); // toute la portée : une seule date
    expect([...dates][0].startsWith('2000-')).toBe(true);
  });
});
