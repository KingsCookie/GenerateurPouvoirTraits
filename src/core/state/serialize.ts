import type { Catalog } from '../model/trait.js';
import { TRAIT_TYPES } from '../model/traitType.js';
import type { Personne } from '../model/personne.js';
import type { Couple } from '../model/couple.js';
import type { Espece } from '../model/espece.js';
import type { PopulationEvent } from '../model/event.js';
import type { Parameters, ResilienceOverrides } from '../params/parameters.js';
import { defaultParameters } from '../params/parameters.js';
import { defaultCatalog, defaultEspeces } from '../catalog/defaultCatalog.js';
import { createRng } from '../rng/rng.js';
import { yearOf, computeAge } from '../genesis/derived.js';

// v1 (Features 1-2) → v2 (Feature 3 : currentYear, couples, état du RNG) → v3 (Feature 7 : journal
// d'événements daté `history`) → v4 (Feature 011 : `genesisYear`, année de la genèse, origine du
// calcul de génération) → v5 (Feature 015 : `Personne.age`/`Personne.immortel`, `Espece.esperanceVie`/
// `Espece.mortNaturellePct`). Compatibilité ascendante. Constante UNIQUE partagée par les trois types
// de fichiers (config/data/full) — Feature 6.
export const FORMAT_VERSION = 5;

export interface AppState {
  formatVersion: number;
  kind: 'full';
  parameters: Parameters;
  catalog: Catalog;
  especes: Espece[]; // catalogue d'espèces (paramètres de reproduction, Feature 3 / §9.4)
  population: Personne[];
  currentYear: number; // année courante (1ᵉʳ janvier), progresse au tick (Feature 3)
  genesisYear: number; // année de la genèse (§6.2) : origine du calcul de génération (Feature 011)
  couples: Couple[]; // couples actuels
  rngState: string[]; // état sérialisé du RNG (continuation déterministe, FR-021)
  history: PopulationEvent[]; // journal d'événements daté (Feature 7 : reconstruction historique)
}

// --- Sous-états typés (Feature 6) : config (réglages) / data (monde généré). ---

/** Configuration seule : ce qui définit *comment* la simulation se comporte (seed incluse). */
export interface ConfigState {
  formatVersion: number;
  kind: 'config';
  parameters: Parameters;
  catalog: Catalog;
  especes: Espece[];
}

/** Données générées seules : ce qui a été *produit* (avec la position exacte du RNG). */
export interface DataState {
  formatVersion: number;
  kind: 'data';
  population: Personne[];
  currentYear: number;
  genesisYear: number; // année de la genèse (Feature 011) : donnée du monde généré
  couples: Couple[];
  rngState: string[]; // position exacte du RNG (reprise au tirage près)
  history: PopulationEvent[]; // journal d'événements daté (Feature 7)
}

// `full` reste AppState (kind:'full').

/** Union étiquetée renvoyée par la détection automatique à l'import (Feature 6). */
export type ParsedImport =
  | { kind: 'config'; config: ConfigState }
  | { kind: 'data'; data: DataState }
  | { kind: 'full'; state: AppState };

export type Result<T> = { ok: true; value: T } | { ok: false; error: string };

/** État initial vide (population non générée). */
export function createInitialState(params?: Partial<Parameters>): AppState {
  const parameters = { ...defaultParameters(), ...params };
  return {
    formatVersion: FORMAT_VERSION,
    kind: 'full',
    parameters,
    catalog: defaultCatalog(),
    especes: defaultEspeces(),
    population: [],
    currentYear: parameters.birthYear,
    genesisYear: parameters.birthYear, // origine du calcul de génération (§6.2)
    couples: [],
    rngState: createRng(BigInt(parameters.seed)).getState(),
    history: [],
  };
}

// Sérialisation canonique : clés d'objet triées récursivement (ordre stable), ordre des
// tableaux préservé. Deux états égaux ⇒ fichier identique (support de SC-001/INV-1).
function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const key of Object.keys(value as Record<string, unknown>).sort()) {
      out[key] = canonicalize((value as Record<string, unknown>)[key]);
    }
    return out;
  }
  return value;
}

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

// --- Extraction pure des sous-états (Feature 6, INV-K4 : ne mutent pas `state`). ---

/** Sélectionne la configuration depuis un état complet (seed + catalogues + espèces). */
export function extractConfig(state: AppState): ConfigState {
  return {
    formatVersion: FORMAT_VERSION,
    kind: 'config',
    parameters: state.parameters,
    catalog: state.catalog,
    especes: state.especes,
  };
}

/** Sélectionne les données générées depuis un état complet (avec la position exacte du RNG). */
export function extractData(state: AppState): DataState {
  return {
    formatVersion: FORMAT_VERSION,
    kind: 'data',
    population: state.population,
    currentYear: state.currentYear,
    genesisYear: state.genesisYear,
    couples: state.couples,
    rngState: state.rngState,
    history: state.history,
  };
}

// --- Fusion pure & non destructive (Feature 6, INV-K7 : porte la sémantique des clarifications). ---

/**
 * Fusionne une CONFIG dans un état : remplace parameters/catalog/especes et **conserve** les
 * données (population/currentYear/couples/rngState). Renvoie un NOUVEL AppState, ne mute pas
 * l'entrée (Clarification 2026-06-17 : un import de config conserve la population).
 */
export function mergeConfig(state: AppState, config: ConfigState): AppState {
  return {
    ...state,
    parameters: config.parameters,
    catalog: config.catalog,
    especes: config.especes,
  };
}

/**
 * Fusionne des DONNÉES dans un état : remplace population/currentYear/couples/rngState et
 * **conserve** la config (parameters/catalog/especes). Renvoie un NOUVEL AppState, ne mute pas
 * l'entrée. Si `data.rngState` est absent/invalide (fichier antérieur), reconstruit l'état RNG
 * à partir de la **seed de la config courante** (rétro-compatibilité, INV-K5).
 */
export function mergeData(state: AppState, data: DataState): AppState {
  const rngState =
    Array.isArray(data.rngState) && data.rngState.length === 4
      ? data.rngState
      : createRng(BigInt(state.parameters.seed)).getState();
  return {
    ...state,
    population: data.population,
    currentYear: data.currentYear,
    // Feature 011 : `genesisYear` du fichier ; absent (fichier < v4) ⇒ fallback naissance la plus
    // ancienne (sinon année de naissance de la config courante).
    genesisYear:
      typeof data.genesisYear === 'number'
        ? data.genesisYear
        : fallbackGenesisYear(data.population, state.parameters),
    couples: data.couples,
    rngState,
    history: Array.isArray(data.history) ? data.history : [],
  };
}

// --- Sérialisation par type (Feature 6) — réutilise la canonicalisation partagée. ---

/** Sérialise la CONFIG seule en JSON canonique (kind:"config"). */
export function serializeConfig(state: AppState): string {
  return JSON.stringify(canonicalize(extractConfig(state)), null, 2);
}

/** Sérialise les DONNÉES seules en JSON canonique (kind:"data", inclut rngState). */
export function serializeData(state: AppState): string {
  return JSON.stringify(canonicalize(extractData(state)), null, 2);
}

/** Sérialise l'état complet en JSON déterministe (kind:"full", formatVersion). */
export function serializeState(state: AppState): string {
  return JSON.stringify(canonicalize(state), null, 2);
}

/** Alias explicite du type `full` (= serializeState, conservé pour la symétrie de l'API). */
export const serializeFull = serializeState;

// --- Défauts de rétro-compatibilité (INV-K5) — mutent l'objet fourni (déjà cloné par JSON.parse). ---

/** Défaut `resilienceOverrides` (Feature 5) : un fichier antérieur ne le contient pas. */
function defaultResilience(parameters: Parameters): void {
  const params = parameters as Parameters & { resilienceOverrides?: ResilienceOverrides };
  if (!isObject(params.resilienceOverrides)) {
    params.resilienceOverrides = { byType: {}, byTrait: {} };
  } else {
    if (!isObject(params.resilienceOverrides.byType)) params.resilienceOverrides.byType = {};
    if (!isObject(params.resilienceOverrides.byTrait)) params.resilienceOverrides.byTrait = {};
  }
}

/**
 * Fallback de l'année de genèse (Feature 011, migration v3→v4) : **naissance la plus ancienne** de
 * la population ; à défaut de population, `parameters.birthYear` ; à défaut, 0.
 */
export function fallbackGenesisYear(population: Personne[], parameters?: Parameters): number {
  let min: number | null = null;
  for (const p of population) {
    const y = yearOf(p.dateNaissance);
    if (min === null || y < min) min = y;
  }
  return min ?? parameters?.birthYear ?? 0;
}

/**
 * Défauts Feature 015 sur les espèces (fichier < v5) : `esperanceVie` (60) et `mortNaturellePct`
 * (10) absents ⇒ valeurs par défaut « humain ». Mute la liste d'espèces fournie.
 */
function defaultEspeceLifeFields(especes: unknown): void {
  if (!Array.isArray(especes)) return;
  for (const e of especes) {
    if (!isObject(e)) continue;
    if (typeof e.esperanceVie !== 'number') e.esperanceVie = 60;
    if (typeof e.mortNaturellePct !== 'number') e.mortNaturellePct = 10;
  }
}

/**
 * Défauts Feature 015 sur les personnes (fichier < v5) : `immortel` (faux) et `age` (recomposé par
 * `computeAge(annéeDeNaissance, currentYear)`) absents ⇒ valeurs par défaut. Mute la population.
 */
function defaultPersonLifeFields(population: unknown, currentYear: number): void {
  if (!Array.isArray(population)) return;
  for (const p of population) {
    if (!isObject(p)) continue;
    if (typeof p.immortel !== 'boolean') p.immortel = false;
    if (typeof p.age !== 'number') {
      p.age = computeAge(yearOf(String(p.dateNaissance ?? '0-01-01')), currentYear);
    }
  }
}

/** Tolère un `Trait.weight` absent/undefined (⇒ `null` = hérite du poids du type, §9.1). */
function defaultTraitWeights(catalog: Catalog): void {
  for (const type of TRAIT_TYPES) {
    const list = catalog.byType?.[type];
    if (Array.isArray(list)) {
      for (const t of list) if (t.weight === undefined) t.weight = null;
    }
  }
}

// --- Validation par type, mutualisée par deserializeState (full) et parseImport (3 types). ---

/** Valide + défaute la partie CONFIG (parameters/catalog/especes). Renvoie un message ou null. */
function validateConfigInto(parsed: Record<string, unknown>): string | null {
  if (!isObject(parsed.parameters) || !isObject(parsed.catalog)) {
    return 'Structure de la configuration incomplète (parameters/catalog).';
  }
  defaultResilience(parsed.parameters as unknown as Parameters);
  defaultTraitWeights(parsed.catalog as unknown as Catalog);
  if (!Array.isArray(parsed.especes) || parsed.especes.length === 0) {
    parsed.especes = defaultEspeces();
  } else {
    defaultEspeceLifeFields(parsed.especes); // Feature 015 : espérance de vie / % mort naturelle
  }
  return null;
}

/** Valide + défaute la partie DATA (population/currentYear/couples/rngState). Renvoie un message ou null. */
function validateDataInto(parsed: Record<string, unknown>, seedFallback: string): string | null {
  if (!Array.isArray(parsed.population)) {
    return 'Structure des données incomplète (population).';
  }
  if (typeof parsed.currentYear !== 'number') parsed.currentYear = 0;
  if (!Array.isArray(parsed.couples)) parsed.couples = [];
  if (!Array.isArray(parsed.rngState) || parsed.rngState.length !== 4) {
    parsed.rngState = createRng(BigInt(seedFallback)).getState();
  }
  if (!Array.isArray(parsed.history)) parsed.history = []; // Feature 7 : rétro-compat (INV-S8).
  defaultPersonLifeFields(parsed.population, parsed.currentYear as number); // Feature 015 (v5)
  return null;
}

/** Désérialise et valide un fichier `full` ; sinon Err sans altérer l'état courant. */
export function deserializeState(json: string): Result<AppState> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    return { ok: false, error: 'Fichier illisible : JSON invalide.' };
  }

  if (!isObject(parsed)) {
    return { ok: false, error: 'Format inattendu : objet d’état attendu.' };
  }
  if (parsed.kind !== 'full') {
    return {
      ok: false,
      error: `Type de fichier non reconnu (kind="${String(parsed.kind)}"). Attendu : "full".`,
    };
  }
  if (typeof parsed.formatVersion !== 'number' || parsed.formatVersion > FORMAT_VERSION) {
    return {
      ok: false,
      error: `Version de format non prise en charge (${String(parsed.formatVersion)} ; max ${FORMAT_VERSION}).`,
    };
  }
  const configErr = validateConfigInto(parsed);
  if (configErr) return { ok: false, error: configErr };

  const seed = String((parsed.parameters as Parameters).seed ?? '0');
  // Compatibilité ascendante (INV-11) : un fichier v1 (sans currentYear/couples/rngState) est
  // accepté en complétant des valeurs par défaut sûres.
  if (typeof parsed.currentYear !== 'number') {
    parsed.currentYear = (parsed.parameters as Parameters).birthYear ?? 0;
  }
  // Feature 011 (v3→v4) : `genesisYear` absent ⇒ fallback naissance la plus ancienne.
  if (typeof parsed.genesisYear !== 'number') {
    parsed.genesisYear = fallbackGenesisYear(
      (parsed.population as Personne[]) ?? [],
      parsed.parameters as Parameters,
    );
  }
  const dataErr = validateDataInto(parsed, seed);
  if (dataErr) return { ok: false, error: dataErr };

  return { ok: true, value: parsed as unknown as AppState };
}

/**
 * Détecte automatiquement le type d'un fichier importé (`config` | `data` | `full`), valide la
 * structure du type et la version, défaute les champs récents absents (rétro-compat), et renvoie
 * l'union étiquetée correspondante. Pure ; n'altère jamais l'état appelant (INV-K9).
 */
export function parseImport(json: string): Result<ParsedImport> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    return { ok: false, error: 'Fichier illisible : JSON invalide.' };
  }

  if (!isObject(parsed)) {
    return { ok: false, error: 'Format inattendu : objet attendu.' };
  }
  const kind = parsed.kind;
  if (kind !== 'config' && kind !== 'data' && kind !== 'full') {
    return {
      ok: false,
      error: `Type de fichier non reconnu (kind="${String(kind)}"). Attendu : "config", "data" ou "full".`,
    };
  }
  if (typeof parsed.formatVersion !== 'number' || parsed.formatVersion > FORMAT_VERSION) {
    return {
      ok: false,
      error: `Version de format non prise en charge (${String(parsed.formatVersion)} ; max ${FORMAT_VERSION}).`,
    };
  }

  if (kind === 'full') {
    const res = deserializeState(json);
    return res.ok ? { ok: true, value: { kind: 'full', state: res.value } } : res;
  }

  if (kind === 'config') {
    const err = validateConfigInto(parsed);
    if (err) return { ok: false, error: err };
    return { ok: true, value: { kind: 'config', config: parsed as unknown as ConfigState } };
  }

  // kind === 'data' : aucune seed dans le fichier ⇒ un rngState absent sera reconstruit à la
  // fusion (mergeData) depuis la seed de la config courante ; ici on défaute à [] si invalide.
  const data = parsed as Record<string, unknown>;
  if (!Array.isArray(data.population)) {
    return { ok: false, error: 'Structure des données incomplète (population).' };
  }
  if (typeof data.currentYear !== 'number') data.currentYear = 0;
  // Feature 011 : `genesisYear` absent (fichier < v4) ⇒ fallback naissance la plus ancienne
  // (aucun `parameters` dans un fichier `data` ⇒ min birthYear sinon 0).
  if (typeof data.genesisYear !== 'number') {
    data.genesisYear = fallbackGenesisYear(data.population as Personne[]);
  }
  if (!Array.isArray(data.couples)) data.couples = [];
  if (!Array.isArray(data.rngState) || data.rngState.length !== 4) data.rngState = [];
  if (!Array.isArray(data.history)) data.history = []; // Feature 7 : rétro-compat (INV-S8).
  defaultPersonLifeFields(data.population, data.currentYear as number); // Feature 015 (v5)
  return { ok: true, value: { kind: 'data', data: parsed as unknown as DataState } };
}
