import { describe, it, expect } from 'vitest';
import { createRng } from '../../src/core/rng/rng.js';
import { defaultCatalog, defaultEspeces } from '../../src/core/catalog/defaultCatalog.js';
import { defaultParameters } from '../../src/core/params/parameters.js';
import { generateInitialPopulation } from '../../src/core/genesis/genesis.js';
import { createRngFromState } from '../../src/core/rng/rng.js';
import {
  serializeState,
  serializeFull,
  serializeConfig,
  serializeData,
  deserializeState,
  parseImport,
  extractConfig,
  extractData,
  mergeConfig,
  mergeData,
  createInitialState,
  FORMAT_VERSION,
  type AppState,
  type ConfigState,
  type DataState,
} from '../../src/core/state/serialize.js';

function sampleState(seed: bigint): AppState {
  const parameters = {
    ...defaultParameters(),
    seed: seed.toString(),
    batchSize: 25,
    powerChancePct: 50,
  };
  const catalog = defaultCatalog();
  const population = generateInitialPopulation(parameters, catalog, createRng(seed));
  return {
    formatVersion: FORMAT_VERSION,
    kind: 'full',
    parameters,
    catalog,
    especes: defaultEspeces(),
    population,
    currentYear: parameters.birthYear,
    genesisYear: parameters.birthYear,
    couples: [],
    rngState: createRng(seed).getState(),
    history: [],
  };
}

describe('Sérialisation de l’état (US3)', () => {
  it('INV-6 : round-trip serialize → deserialize redonne un état égal', () => {
    const state = sampleState(0xabcdefn);
    const json = serializeState(state);
    const res = deserializeState(json);
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.value).toEqual(state);
  });

  it('deux états égaux ⇒ fichier identique (ordre de clés déterministe)', () => {
    const a = serializeState(sampleState(0x1234n));
    const b = serializeState(sampleState(0x1234n));
    expect(a).toBe(b);
  });

  it('la sérialisation est insensible à l’ordre d’insertion des clés', () => {
    const state = createInitialState({ seed: '42' });
    const reordered = {
      rngState: state.rngState,
      population: state.population,
      couples: state.couples,
      especes: state.especes,
      catalog: state.catalog,
      kind: state.kind,
      currentYear: state.currentYear,
      genesisYear: state.genesisYear,
      parameters: state.parameters,
      formatVersion: state.formatVersion,
      history: state.history,
    } as AppState;
    expect(serializeState(reordered)).toBe(serializeState(state));
  });

  it('la seed est toujours incluse dans le fichier', () => {
    const json = serializeState(sampleState(0x999n));
    expect(json).toContain('"seed"');
    expect(JSON.parse(json).parameters.seed).toBe(0x999n.toString());
  });

  it('rejette un JSON invalide sans exception', () => {
    const res = deserializeState('{ ceci nest pas du json');
    expect(res.ok).toBe(false);
  });

  it('rejette un kind inconnu', () => {
    const res = deserializeState(JSON.stringify({ kind: 'config', formatVersion: 1 }));
    expect(res.ok).toBe(false);
  });

  it('rejette une version de format trop récente', () => {
    const state = sampleState(0x1n);
    const json = JSON.stringify({ ...state, formatVersion: FORMAT_VERSION + 1 });
    const res = deserializeState(json);
    expect(res.ok).toBe(false);
  });

  it('rejette une structure incomplète', () => {
    const res = deserializeState(JSON.stringify({ kind: 'full', formatVersion: 1 }));
    expect(res.ok).toBe(false);
  });

  it('M1 : import d’un fichier antérieur à la Feature 5 défaute resilienceOverrides', () => {
    const parameters = { ...defaultParameters(), seed: '7', batchSize: 3 };
    // Simule un fichier antérieur : pas de resilienceOverrides dans parameters.
    delete (parameters as Partial<typeof parameters>).resilienceOverrides;
    const catalog = defaultCatalog();
    const population = generateInitialPopulation(
      { ...defaultParameters(), seed: '7', batchSize: 3 },
      catalog,
      createRng(7n),
    );
    const json = JSON.stringify({
      formatVersion: 2,
      kind: 'full',
      parameters,
      catalog,
      population,
    });
    const res = deserializeState(json);
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.value.parameters.resilienceOverrides).toEqual({ byType: {}, byTrait: {} });
    }
  });

  it('M1 : tolère un Trait.weight absent dans le catalogue importé (⇒ null = hérite du type)', () => {
    const parameters = { ...defaultParameters(), seed: '7', batchSize: 0 };
    // Catalogue dont un trait n’a pas de champ weight (fichier antérieur).
    const catalog = {
      byType: {
        Remplacement: [],
        PartieCorps: [],
        Etat: [],
        Element: [{ id: 'Element:feu-0', type: 'Element', label: 'feu' }],
        Ajout: [],
        Action: [],
      },
    };
    const json = JSON.stringify({
      formatVersion: 2,
      kind: 'full',
      parameters,
      catalog,
      population: [],
    });
    const res = deserializeState(json);
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.value.catalog.byType.Element[0].weight).toBeNull();
  });

  it('INV-11 : importe un fichier v1 (sans currentYear/couples/rngState) avec défauts sûrs', () => {
    const parameters = { ...defaultParameters(), seed: '7', batchSize: 5, birthYear: 1990 };
    const catalog = defaultCatalog();
    const population = generateInitialPopulation(parameters, catalog, createRng(7n));
    // Fichier « Feature 1/2 » : formatVersion 1, sans les champs de la Feature 3.
    const v1 = JSON.stringify({ formatVersion: 1, kind: 'full', parameters, catalog, population });
    const res = deserializeState(v1);
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.value.currentYear).toBe(1990); // = birthYear
      expect(res.value.couples).toEqual([]);
      expect(res.value.rngState).toEqual(createRng(7n).getState());
    }
  });
});

// --- Feature 6 : persistance complète & partage (config / data / full). ---

describe('US1 — Configuration seule (Feature 6)', () => {
  it('serializeConfig produit kind:"config" + JSON canonique (clés triées), sans population', () => {
    const json = serializeConfig(sampleState(0xc0n));
    const parsed = JSON.parse(json);
    expect(parsed.kind).toBe('config');
    expect(parsed.formatVersion).toBe(FORMAT_VERSION);
    expect(parsed.parameters).toBeDefined();
    expect(parsed.catalog).toBeDefined();
    expect(parsed.especes).toBeDefined();
    expect(parsed.population).toBeUndefined();
    // Canonicité : un second export identique est octet pour octet identique.
    expect(serializeConfig(sampleState(0xc0n))).toBe(json);
  });

  it('parseImport détecte le kind "config" et round-trip sur parameters/catalog/especes', () => {
    const state = sampleState(0xc1n);
    const res = parseImport(serializeConfig(state));
    expect(res.ok).toBe(true);
    if (res.ok && res.value.kind === 'config') {
      expect(res.value.config.parameters).toEqual(state.parameters);
      expect(res.value.config.catalog).toEqual(state.catalog);
      expect(res.value.config.especes).toEqual(state.especes);
    } else {
      throw new Error('attendu kind config');
    }
  });

  it('rétro-compat : une config sans resilienceOverrides/Trait.weight est défautée', () => {
    const parameters = { ...defaultParameters(), seed: '7' };
    delete (parameters as Partial<typeof parameters>).resilienceOverrides;
    const catalog = {
      byType: {
        Remplacement: [],
        PartieCorps: [],
        Etat: [],
        Element: [{ id: 'Element:feu-0', type: 'Element', label: 'feu' }],
        Ajout: [],
        Action: [],
      },
    };
    const json = JSON.stringify({ formatVersion: 2, kind: 'config', parameters, catalog });
    const res = parseImport(json);
    expect(res.ok).toBe(true);
    if (res.ok && res.value.kind === 'config') {
      expect(res.value.config.parameters.resilienceOverrides).toEqual({ byType: {}, byTrait: {} });
      expect(res.value.config.catalog.byType.Element[0].weight).toBeNull();
      expect(res.value.config.especes.length).toBeGreaterThan(0); // défaut espèces
    }
  });

  it('INV-K7 : mergeConfig remplace la config et CONSERVE la population/couples/année/RNG', () => {
    const world = sampleState(0xaaa1n); // monde existant (population non vide)
    expect(world.population.length).toBeGreaterThan(0);
    const config: ConfigState = extractConfig(sampleState(0xbbb2n)); // config différente
    const merged = mergeConfig(world, config);
    // Config remplacée…
    expect(merged.parameters).toEqual(config.parameters);
    expect(merged.catalog).toEqual(config.catalog);
    expect(merged.especes).toEqual(config.especes);
    // …données strictement conservées (mêmes individus, mêmes ids).
    expect(merged.population).toBe(world.population);
    expect(merged.couples).toBe(world.couples);
    expect(merged.currentYear).toBe(world.currentYear);
    expect(merged.rngState).toBe(world.rngState);
    expect(merged.kind).toBe('full');
    // Pureté : l'entrée n'est pas mutée.
    expect(world.parameters).not.toEqual(config.parameters);
  });
});

describe('US2 — Données générées seules (Feature 6)', () => {
  it('serializeData produit kind:"data" avec rngState, sans parameters/catalog', () => {
    const json = serializeData(sampleState(0xd0n));
    const parsed = JSON.parse(json);
    expect(parsed.kind).toBe('data');
    expect(parsed.population).toBeDefined();
    expect(parsed.couples).toBeDefined();
    expect(parsed.currentYear).toBeDefined();
    expect(Array.isArray(parsed.rngState)).toBe(true);
    expect(parsed.rngState.length).toBe(4);
    expect(parsed.parameters).toBeUndefined();
    expect(parsed.catalog).toBeUndefined();
  });

  it('parseImport détecte le kind "data" et round-trip sur population/couples/année/rngState', () => {
    const state = sampleState(0xd1n);
    const res = parseImport(serializeData(state));
    expect(res.ok).toBe(true);
    if (res.ok && res.value.kind === 'data') {
      expect(res.value.data.population).toEqual(state.population);
      expect(res.value.data.couples).toEqual(state.couples);
      expect(res.value.data.currentYear).toEqual(state.currentYear);
      expect(res.value.data.rngState).toEqual(state.rngState);
    } else {
      throw new Error('attendu kind data');
    }
  });

  it('INV-K7 : mergeData remplace les données et CONSERVE la config courante', () => {
    const world = sampleState(0xaaa3n);
    const data: DataState = extractData(sampleState(0xbbb4n)); // données différentes
    const merged = mergeData(world, data);
    // Données remplacées…
    expect(merged.population).toBe(data.population);
    expect(merged.couples).toBe(data.couples);
    expect(merged.currentYear).toBe(data.currentYear);
    expect(merged.rngState).toBe(data.rngState);
    // …config strictement conservée.
    expect(merged.parameters).toBe(world.parameters);
    expect(merged.catalog).toBe(world.catalog);
    expect(merged.especes).toBe(world.especes);
    expect(merged.kind).toBe('full');
  });

  it('déterminisme de reprise : restaurer rngState via createRngFromState ⇒ même séquence', () => {
    const state = sampleState(0xd2n);
    // Avance le RNG pour obtenir une position non triviale, puis capture l'état.
    const live = createRngFromState(state.rngState);
    live.nextInt(1000);
    live.nextInt(1000);
    const captured = live.getState();
    const expected = [live.nextInt(1000), live.nextInt(1000), live.nextInt(1000)];

    // Round-trip via data : sérialiser l'état capturé, réimporter, reprendre.
    const dataState: AppState = { ...state, rngState: captured };
    const res = parseImport(serializeData(dataState));
    expect(res.ok).toBe(true);
    if (res.ok && res.value.kind === 'data') {
      const resumed = createRngFromState(res.value.data.rngState);
      const got = [resumed.nextInt(1000), resumed.nextInt(1000), resumed.nextInt(1000)];
      expect(got).toEqual(expected);
    }
  });

  it('rétro-compat : un data sans rngState laisse [] (reconstruit à la fusion via la seed)', () => {
    const json = JSON.stringify({ formatVersion: 2, kind: 'data', population: [], couples: [] });
    const res = parseImport(json);
    expect(res.ok).toBe(true);
    if (res.ok && res.value.kind === 'data') {
      expect(res.value.data.rngState).toEqual([]);
      // mergeData reconstruit depuis la seed de la config courante.
      const host = createInitialState({ seed: '42' });
      const merged = mergeData(host, res.value.data);
      expect(merged.rngState).toEqual(createRng(42n).getState());
    }
  });
});

describe('US3 — Complet, détection automatique & versionnage (Feature 6)', () => {
  it('serializeFull = serializeState ; parseImport détecte "full" et round-trip égal', () => {
    const state = sampleState(0xf0n);
    expect(serializeFull(state)).toBe(serializeState(state));
    const res = parseImport(serializeFull(state));
    expect(res.ok).toBe(true);
    if (res.ok && res.value.kind === 'full') {
      expect(res.value.state).toEqual(state);
    } else {
      throw new Error('attendu kind full');
    }
  });

  it('détection correcte des trois types via le même point d’entrée', () => {
    const state = sampleState(0xf1n);
    const c = parseImport(serializeConfig(state));
    const d = parseImport(serializeData(state));
    const f = parseImport(serializeFull(state));
    expect(c.ok && c.value.kind).toBe('config');
    expect(d.ok && d.value.kind).toBe('data');
    expect(f.ok && f.value.kind).toBe('full');
  });

  it('refuse une version de format supérieure (message clair, sans exception)', () => {
    const state = sampleState(0xf2n);
    const tooNew = JSON.stringify({ ...extractConfig(state), formatVersion: FORMAT_VERSION + 1 });
    const res = parseImport(tooNew);
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error).toMatch(/version/i);
  });

  it('refuse un kind absent/inconnu et un JSON invalide (messages FR)', () => {
    expect(parseImport('{ pas du json').ok).toBe(false);
    const noKind = parseImport(JSON.stringify({ formatVersion: 2, population: [] }));
    expect(noKind.ok).toBe(false);
    if (!noKind.ok) expect(noKind.error).toMatch(/non reconnu/i);
    const unknown = parseImport(JSON.stringify({ kind: 'bidule', formatVersion: 2 }));
    expect(unknown.ok).toBe(false);
  });

  it('rétro-compat : un full antérieur (sans resilienceOverrides) s’importe en défautant', () => {
    const parameters = { ...defaultParameters(), seed: '7', batchSize: 3 };
    delete (parameters as Partial<typeof parameters>).resilienceOverrides;
    const catalog = defaultCatalog();
    const population = generateInitialPopulation(
      { ...defaultParameters(), seed: '7', batchSize: 3 },
      catalog,
      createRng(7n),
    );
    const json = JSON.stringify({
      formatVersion: 2,
      kind: 'full',
      parameters,
      catalog,
      population,
    });
    const res = parseImport(json);
    expect(res.ok).toBe(true);
    if (res.ok && res.value.kind === 'full') {
      expect(res.value.state.parameters.resilienceOverrides).toEqual({ byType: {}, byTrait: {} });
    }
  });
});

// --- Feature 011 : année de la genèse (genesisYear), format v4 ---

describe('US3 — genesisYear & migration v3→v4 (Feature 011)', () => {
  it('round-trip v4 : genesisYear survit à serializeFull → parseImport', () => {
    const state: AppState = { ...sampleState(0x501n), genesisYear: 1900 };
    const res = parseImport(serializeFull(state));
    expect(res.ok).toBe(true);
    if (res.ok && res.value.kind === 'full') {
      expect(res.value.state.genesisYear).toBe(1900);
    }
  });

  it('round-trip v4 : genesisYear inclus dans serializeData', () => {
    const state: AppState = { ...sampleState(0x502n), genesisYear: 1900 };
    expect(JSON.parse(serializeData(state)).genesisYear).toBe(1900);
    const res = parseImport(serializeData(state));
    expect(res.ok).toBe(true);
    if (res.ok && res.value.kind === 'data') {
      expect(res.value.data.genesisYear).toBe(1900);
    }
  });

  it('import v3 (full sans genesisYear) ⇒ fallback = naissance la plus ancienne', () => {
    const parameters = { ...defaultParameters(), seed: '7', batchSize: 4, birthYear: 1850 };
    const catalog = defaultCatalog();
    const population = generateInitialPopulation(parameters, catalog, createRng(7n));
    // Un individu plus ancien (2 individus de naissances différentes).
    population[0] = { ...population[0], dateNaissance: '1830-01-01' };
    const json = JSON.stringify({
      formatVersion: 3,
      kind: 'full',
      parameters,
      catalog,
      population,
      currentYear: 1850,
      couples: [],
      rngState: createRng(7n).getState(),
      history: [],
    });
    const res = deserializeState(json);
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.value.genesisYear).toBe(1830); // plus ancienne naissance
  });

  it('import v3 (data sans genesisYear) ⇒ fallback naissance la plus ancienne à la fusion', () => {
    const parameters = { ...defaultParameters(), seed: '7', batchSize: 3, birthYear: 1900 };
    const catalog = defaultCatalog();
    const population = generateInitialPopulation(parameters, catalog, createRng(7n));
    population[0] = { ...population[0], dateNaissance: '1888-06-01' };
    const json = JSON.stringify({
      formatVersion: 3,
      kind: 'data',
      population,
      currentYear: 1900,
      couples: [],
      rngState: createRng(7n).getState(),
      history: [],
    });
    const res = parseImport(json);
    expect(res.ok).toBe(true);
    if (res.ok && res.value.kind === 'data') {
      expect(res.value.data.genesisYear).toBe(1888);
    }
  });
});

// --- Feature 7 : journal d'événements daté (history) ---

describe('Journal d’événements (Feature 7)', () => {
  it('FORMAT_VERSION vaut 5', () => {
    expect(FORMAT_VERSION).toBe(5);
  });

  it('history survit au round-trip serializeFull → parseImport', () => {
    const state = sampleState(0x111n);
    const withHistory: AppState = {
      ...state,
      history: [
        { kind: 'birth', year: 0, personId: 'p-000001' },
        { kind: 'couple', year: 2, coupleId: 'c-000001', memberIds: ['p-000001', 'p-000002'] },
        { kind: 'death', year: 5, personId: 'p-000002' },
      ],
    };
    const res = parseImport(serializeFull(withHistory));
    expect(res.ok).toBe(true);
    if (res.ok && res.value.kind === 'full') {
      expect(res.value.state.history).toEqual(withHistory.history);
    }
  });

  it('history survit au round-trip serializeData → parseImport (extractData inclut history)', () => {
    const state = sampleState(0x222n);
    const withHistory: AppState = {
      ...state,
      history: [{ kind: 'birth', year: 0, personId: 'p-000001' }],
    };
    const res = parseImport(serializeData(withHistory));
    expect(res.ok).toBe(true);
    if (res.ok && res.value.kind === 'data') {
      expect(res.value.data.history).toEqual(withHistory.history);
      // mergeData restaure history sur un état hôte.
      const host = createInitialState({ seed: '1' });
      expect(mergeData(host, res.value.data).history).toEqual(withHistory.history);
    }
  });

  it('migration v4→v5 (Feature 015) : immortel=faux, âge recomposé, espèce 60/10', () => {
    // Part d'un état v5 puis **retire** les champs Feature 015 pour simuler un fichier v4.
    const base = sampleState(0x515n);
    const raw = JSON.parse(serializeFull({ ...base, currentYear: 50 })) as Record<string, unknown>;
    raw.formatVersion = 4;
    for (const p of raw.population as Record<string, unknown>[]) {
      delete p.age;
      delete p.immortel;
    }
    for (const e of raw.especes as Record<string, unknown>[]) {
      delete e.esperanceVie;
      delete e.mortNaturellePct;
    }
    const res = parseImport(JSON.stringify(raw));
    expect(res.ok).toBe(true);
    if (!res.ok || res.value.kind !== 'full') return;
    const st = res.value.state;
    for (const p of st.population) {
      expect(p.immortel).toBe(false);
      // Genèse à l'année 0 (birthYear 0) ⇒ âge recomposé = currentYear − 0 = 50.
      expect(p.age).toBe(50);
    }
    for (const e of st.especes) {
      expect(e.esperanceVie).toBe(60);
      expect(e.mortNaturellePct).toBe(10);
    }
  });

  it('rétro-compat : un fichier sans history ⇒ history = []', () => {
    const parameters = { ...defaultParameters(), seed: '7', batchSize: 2 };
    const catalog = defaultCatalog();
    const population = generateInitialPopulation(parameters, catalog, createRng(7n));
    const json = JSON.stringify({
      formatVersion: 2,
      kind: 'full',
      parameters,
      catalog,
      population,
    });
    const res = parseImport(json);
    expect(res.ok).toBe(true);
    if (res.ok && res.value.kind === 'full') expect(res.value.state.history).toEqual([]);
  });
});
