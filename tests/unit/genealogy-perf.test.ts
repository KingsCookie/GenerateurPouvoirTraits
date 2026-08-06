import { describe, it, expect } from 'vitest';
import { filterPopulation, type FilterCriteria } from '../../src/core/genealogy/filter.js';
import type { Personne } from '../../src/core/model/personne.js';

/** Population synthétique déterministe de `n` individus (sans RNG). */
function makePopulation(n: number): Personne[] {
  const pop: Personne[] = [];
  for (let i = 0; i < n; i++) {
    const year = i % 200; // ~10 générations
    pop.push({
      id: `p-${i}`,
      nom: `Individu ${i}`,
      especeId: i % 3 === 0 ? 'elfe' : 'humain',
      genreId: 'g-1',
      dateNaissance: `${String(year).padStart(4, '0')}-01-01`,
      age: year,
      vivant: i % 2 === 0,
      raisonDeces: i % 2 === 0 ? null : 'âge',
      immortel: false,
      parents: [],
      enfants: [],
      conjoints: [],
      adn: {
        traits: [
          { traitId: i % 5 === 0 ? 'tr-feu' : 'tr-glace', active: i % 4 === 0, resilience: 50 },
        ],
      },
      pouvoirs: [],
      notes: null,
    });
  }
  return pop;
}

describe('Performance du filtrage (SC-002)', () => {
  it('filtre 1 000 individus en moins d’une seconde', () => {
    const pop = makePopulation(1000);
    const criteria: FilterCriteria = {
      nameQuery: 'individu',
      generations: new Set([0, 1, 2]),
      especeIds: new Set(['humain']),
      traitIds: new Set(['tr-feu']),
      traitScope: 'tous',
      traitPresence: null,
      powerPresence: 'none',
      statuses: new Set(['vivant']),
      bornNafter: null,
      bornBefore: null,
    };
    const start = performance.now();
    let total = 0;
    // Plusieurs passes pour une mesure stable ; chacune doit rester très en deçà du budget.
    for (let k = 0; k < 50; k++) {
      total += filterPopulation(pop, criteria, { currentYear: 200, genesisYear: 0 }).length;
    }
    const elapsedPerCall = (performance.now() - start) / 50;
    expect(total).toBeGreaterThan(0);
    expect(elapsedPerCall).toBeLessThan(1000);
  });
});
