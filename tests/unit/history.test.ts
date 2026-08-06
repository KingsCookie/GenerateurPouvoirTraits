import { describe, it, expect } from 'vitest';
import { createRng } from '../../src/core/rng/rng.js';
import { defaultCatalog, defaultEspeces } from '../../src/core/catalog/defaultCatalog.js';
import { defaultParameters } from '../../src/core/params/parameters.js';
import { generateInitialPopulation } from '../../src/core/genesis/genesis.js';
import { advanceYears } from '../../src/core/time/tick.js';
import { kill } from '../../src/core/life/death.js';
import { FORMAT_VERSION, type AppState } from '../../src/core/state/serialize.js';

function adultsState(seed: bigint): AppState {
  const parameters = { ...defaultParameters(), seed: seed.toString(), batchSize: 30, birthYear: 0 };
  const catalog = defaultCatalog();
  const population = generateInitialPopulation(parameters, catalog, createRng(seed))
    // Âge suivi (Feature 015) aligné sur currentYear=25 (comportement historique de l'âge dérivé) :
    // ces individus sont des adultes de 25 ans, en âge de se reproduire.
    .map((p) => ({ ...p, age: 25 }));
  return {
    formatVersion: FORMAT_VERSION,
    kind: 'full',
    parameters,
    catalog,
    especes: defaultEspeces(),
    population,
    currentYear: 25, // adultes en âge de se reproduire (gaussienne 18-50)
    genesisYear: 0,
    couples: [],
    rngState: createRng(seed).getState(),
    history: [],
  };
}

describe('Journal d’événements émis (Feature 7, US3)', () => {
  it('kill émet un événement death à l’année courante', () => {
    const state = adultsState(0x1n);
    const victim = state.population[0].id;
    const res = kill(state, victim, 'cause test');
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    const deaths = res.state.history.filter((e) => e.kind === 'death');
    expect(deaths).toHaveLength(1);
    expect(deaths[0]).toMatchObject({ kind: 'death', year: 25, personId: victim });
  });

  it('tick émet un birth par naissance (nb = croissance de population)', () => {
    const state = adultsState(0x2bn);
    const next = advanceYears(state, 5, createRng(0x2bn));
    const births = next.history.filter((e) => e.kind === 'birth');
    expect(births.length).toBe(next.population.length - state.population.length);
    // Toutes les naissances sont datées dans [25, 29].
    expect(births.every((e) => e.year >= 25 && e.year <= 29)).toBe(true);
  });

  it('tick émet des événements couple lorsque des couples se forment', () => {
    const state = adultsState(0x2bn);
    const next = advanceYears(state, 5, createRng(0x2bn));
    expect(next.history.some((e) => e.kind === 'couple')).toBe(true);
  });
});
