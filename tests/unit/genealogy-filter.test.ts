import { describe, it, expect } from 'vitest';
import {
  filterPopulation,
  lastGeneration,
  type FilterCriteria,
  type FilterContext,
} from '../../src/core/genealogy/filter.js';
import { buildGenealogyFixture } from './_genealogyFixture.js';

const ctx: FilterContext = { currentYear: 100, genesisYear: 0 };

function emptyCriteria(over: Partial<FilterCriteria> = {}): FilterCriteria {
  return {
    nameQuery: '',
    generations: new Set(),
    especeIds: new Set(),
    traitIds: new Set(),
    traitScope: 'actifs',
    traitPresence: null,
    powerPresence: null,
    statuses: new Set(),
    bornNafter: null,
    bornBefore: null,
    ...over,
  };
}

const ids = (pop: { id: string }[]) => pop.map((p) => p.id);

describe('filterPopulation — recherche & filtres (US2)', () => {
  it('critères vides ⇒ toute la population, triée par date puis id', () => {
    const { population } = buildGenealogyFixture();
    const out = filterPopulation(population, emptyCriteria(), ctx);
    expect(out).toHaveLength(population.length);
    // Premier = a1 (0000), dernier = f1 (0062).
    expect(out[0].id).toBe('a1');
    expect(out[out.length - 1].id).toBe('f1');
  });

  it('nom : sous-chaîne normalisée (casse + accents)', () => {
    const { population } = buildGenealogyFixture();
    // « delphine » (sans accent, minuscule) doit retrouver « Délphine ».
    expect(
      ids(filterPopulation(population, emptyCriteria({ nameQuery: 'delphine' }), ctx)),
    ).toEqual(['d3']);
    expect(ids(filterPopulation(population, emptyCriteria({ nameQuery: 'BR' }), ctx))).toEqual([
      'b1',
    ]); // Bren
  });

  it('génération : OU intra-dimension', () => {
    const { population } = buildGenealogyFixture();
    // gen 0 = naissances 0..19 : a1 (0000), a2 (0002), xo (0019).
    expect(
      ids(filterPopulation(population, emptyCriteria({ generations: new Set([0]) }), ctx)),
    ).toEqual(['a1', 'a2', 'xo']);
    // gen 0 OU gen 3 : ajoute f1 (0062).
    const g03 = ids(
      filterPopulation(population, emptyCriteria({ generations: new Set([0, 3]) }), ctx),
    );
    expect(g03).toContain('f1');
    expect(g03).toHaveLength(4);
  });

  it('espèce', () => {
    const { population } = buildGenealogyFixture();
    expect(
      ids(filterPopulation(population, emptyCriteria({ especeIds: new Set(['elfe']) }), ctx)),
    ).toEqual(['d3']);
  });

  it('trait selon la portée actifs / inactifs / tous', () => {
    const { population } = buildGenealogyFixture();
    const tf = new Set(['tr-feu']);
    expect(
      ids(filterPopulation(population, emptyCriteria({ traitIds: tf, traitScope: 'actifs' }), ctx)),
    ).toEqual(['b1']);
    expect(
      ids(
        filterPopulation(population, emptyCriteria({ traitIds: tf, traitScope: 'inactifs' }), ctx),
      ),
    ).toEqual(['b2']);
    expect(
      ids(filterPopulation(population, emptyCriteria({ traitIds: tf, traitScope: 'tous' }), ctx)),
    ).toEqual(['b1', 'b2']);
  });

  it('pouvoir présence / absence', () => {
    const { population } = buildGenealogyFixture();
    expect(ids(filterPopulation(population, emptyCriteria({ powerPresence: 'any' }), ctx))).toEqual(
      ['d3'],
    );
    const none = filterPopulation(population, emptyCriteria({ powerPresence: 'none' }), ctx);
    expect(none).toHaveLength(population.length - 1);
    expect(ids(none)).not.toContain('d3');
  });

  it('statut vivant / décédé', () => {
    const { population } = buildGenealogyFixture();
    expect(
      ids(filterPopulation(population, emptyCriteria({ statuses: new Set(['décédé']) }), ctx)),
    ).toEqual(['d3']);
    const vivants = filterPopulation(
      population,
      emptyCriteria({ statuses: new Set(['vivant']) }),
      ctx,
    );
    expect(ids(vivants)).not.toContain('d3');
  });

  it('ET inter-dimensions', () => {
    const { population } = buildGenealogyFixture();
    // trait tr-feu actif ET espèce humain ⇒ b1 (b2 a le trait inactif, donc exclu).
    const out = filterPopulation(
      population,
      emptyCriteria({
        traitIds: new Set(['tr-feu']),
        traitScope: 'tous',
        especeIds: new Set(['humain']),
      }),
      ctx,
    );
    expect(ids(out)).toEqual(['b1', 'b2']);
    // En restreignant aux décédés, plus aucun (b1/b2 vivants).
    const out2 = filterPopulation(
      population,
      emptyCriteria({
        traitIds: new Set(['tr-feu']),
        traitScope: 'tous',
        statuses: new Set(['décédé']),
      }),
      ctx,
    );
    expect(out2).toHaveLength(0);
  });

  it('lecture seule : ne mute pas la population en entrée (INV-G6)', () => {
    const { population } = buildGenealogyFixture();
    const before = JSON.stringify(population);
    const order = ids(population).join(',');
    filterPopulation(population, emptyCriteria({ generations: new Set([1]) }), ctx);
    expect(JSON.stringify(population)).toBe(before);
    expect(ids(population).join(',')).toBe(order); // ordre d'origine préservé
  });
});

describe('filterPopulation — présence de trait (Feature 010)', () => {
  // Fixture : seuls b1 (tr-feu actif), b2 (tr-feu inactif) et d1 (tr-glace actif) ont des traits ;
  // tous les autres ont un ADN vide.
  it('some-active : ≥1 trait actif', () => {
    const { population } = buildGenealogyFixture();
    expect(
      ids(filterPopulation(population, emptyCriteria({ traitPresence: 'some-active' }), ctx)),
    ).toEqual(['b1', 'd1']);
  });

  it('some-inactive : ≥1 trait inactif', () => {
    const { population } = buildGenealogyFixture();
    expect(
      ids(filterPopulation(population, emptyCriteria({ traitPresence: 'some-inactive' }), ctx)),
    ).toEqual(['b2']);
  });

  it('some-any : ≥1 trait (actif ou inactif)', () => {
    const { population } = buildGenealogyFixture();
    expect(
      ids(filterPopulation(population, emptyCriteria({ traitPresence: 'some-any' }), ctx)),
    ).toEqual(['b1', 'b2', 'd1']);
  });

  it('none-active : aucun trait actif (inclut ADN vide et « tous inactifs »)', () => {
    const { population } = buildGenealogyFixture();
    const out = filterPopulation(population, emptyCriteria({ traitPresence: 'none-active' }), ctx);
    const outIds = ids(out);
    expect(out).toHaveLength(population.length - 2); // tous sauf b1 et d1 (traits actifs)
    expect(outIds).not.toContain('b1');
    expect(outIds).not.toContain('d1');
    expect(outIds).toContain('b2'); // trait inactif ⇒ 0 trait actif ⇒ inclus
  });

  it('null ⇒ dimension ignorée (toute la population)', () => {
    const { population } = buildGenealogyFixture();
    expect(filterPopulation(population, emptyCriteria({ traitPresence: null }), ctx)).toHaveLength(
      population.length,
    );
  });

  it('ET avec une autre dimension ; indépendant de traitIds/traitScope', () => {
    const { population } = buildGenealogyFixture();
    // some-active ET espèce humain ⇒ b1, d1 (tous deux humains). Aucun traitId précisé.
    expect(
      ids(
        filterPopulation(
          population,
          emptyCriteria({ traitPresence: 'some-active', especeIds: new Set(['humain']) }),
          ctx,
        ),
      ),
    ).toEqual(['b1', 'd1']);
  });
});

describe('filterPopulation — filtres par année de naissance (Feature 015, US4)', () => {
  it('« né après X » : bornes inclusives (année ≥ X)', () => {
    const { population } = buildGenealogyFixture();
    // f1 est né en 0062 (le plus tardif) ⇒ seul individu avec année ≥ 62.
    expect(ids(filterPopulation(population, emptyCriteria({ bornNafter: 62 }), ctx))).toEqual([
      'f1',
    ]);
  });

  it('« né avant Y » : bornes inclusives (année ≤ Y)', () => {
    const { population } = buildGenealogyFixture();
    // a1 (0000) et a2 (0002) sont les seuls nés en année ≤ 2.
    expect(ids(filterPopulation(population, emptyCriteria({ bornBefore: 2 }), ctx))).toEqual([
      'a1',
      'a2',
    ]);
  });

  it('intervalle [X, Y] inclusif', () => {
    const { population } = buildGenealogyFixture();
    // Nés dans [19, 21] : xo (0019), cx (0020), b1 (0021).
    expect(
      ids(filterPopulation(population, emptyCriteria({ bornNafter: 19, bornBefore: 21 }), ctx)),
    ).toEqual(['xo', 'cx', 'b1']);
  });

  it('exclusivité : une borne d’année active ⇒ le filtre génération est ignoré (INV-F2)', () => {
    const { population } = buildGenealogyFixture();
    // generations=[3] sélectionnerait f1 (0062) ; mais bornBefore=2 est actif ⇒ générations ignorées.
    expect(
      ids(
        filterPopulation(
          population,
          emptyCriteria({ generations: new Set([3]), bornBefore: 2 }),
          ctx,
        ),
      ),
    ).toEqual(['a1', 'a2']);
  });

  it('intervalle vide (X > Y) ⇒ aucun résultat, sans erreur (INV-F5)', () => {
    const { population } = buildGenealogyFixture();
    expect(
      filterPopulation(population, emptyCriteria({ bornNafter: 50, bornBefore: 10 }), ctx),
    ).toHaveLength(0);
  });
});

describe('lastGeneration', () => {
  it('renvoie la plus grande génération présente', () => {
    const { population } = buildGenealogyFixture();
    expect(lastGeneration(population, 0)).toBe(3); // f1 né en 0062 ⇒ floor(62/20)=3
  });

  it('population vide ⇒ null', () => {
    expect(lastGeneration([], 0)).toBeNull();
  });
});
