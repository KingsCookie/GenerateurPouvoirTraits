import { writable, derived, get } from 'svelte/store';
import {
  createSeed,
  createRng,
  createRngFromState,
  defaultCatalog,
  defaultEspeces,
  defaultParameters,
  generateInitialPopulation,
  birthEvent,
  advanceYears as advanceYearsCore,
  kill as killCore,
  resurrect as resurrectCore,
  setImmortal as setImmortalCore,
  serializeConfig,
  serializeData,
  serializeFull,
  parseImport,
  mergeConfig,
  mergeData,
  FORMAT_VERSION,
  addTrait as addTraitCore,
  renameTrait as renameTraitCore,
  removeTrait as removeTraitCore,
  setTraitWeight as setTraitWeightCore,
  propagateTypeWeight as propagateTypeWeightCore,
  addEspece as addEspeceCore,
  renameEspece as renameEspeceCore,
  removeEspece as removeEspeceCore,
  setEspeceParam as setEspeceParamCore,
  addGenre as addGenreCore,
  renameGenre as renameGenreCore,
  removeGenre as removeGenreCore,
  setResiliencePatch as setResiliencePatchCore,
  clearResiliencePatch as clearResiliencePatchCore,
  propagateResilienceType as propagateResilienceTypeCore,
  type AppState,
  type Catalog,
  type ConfigState,
  type Couple,
  type DataState,
  type Espece,
  type Parameters,
  type Personne,
  type PopulationEvent,
  type Rng,
  type TraitType,
  type ResiliencePatch,
  type ResilienceScope,
} from '../../core/index.js';

export type View = 'parametres' | 'liste' | 'fiche' | 'arbre' | 'sandbox';

// Catalogue de traits — **store éditable** (Feature 5). Remplace la constante de module de la
// Feature 1. Défaut = `defaultCatalog()` (traits sans surcharge de poids ⇒ héritent du type).
export const catalog = writable<Catalog>(defaultCatalog());

// Catalogue d'espèces (paramètres de reproduction, genres) — **store éditable** (Feature 5).
export const especes = writable<Espece[]>(defaultEspeces());

// Seed initiale tirée via le SEUL point d'entropie (createSeed), côté UI (Principe I).
function initialParameters(): Parameters {
  return { ...defaultParameters(), seed: createSeed().toString() };
}

export const parameters = writable<Parameters>(initialParameters());
export const population = writable<Personne[]>([]);
export const currentView = writable<View>('parametres');
export const selectedPersonId = writable<string | null>(null);

// Page dédiée à l'arbre (Feature 4) : individu centre + profondeur réglable (≥ 1, défaut 2,
// sans plafond). État d'interface uniquement (non exporté — Principe VI).
export const treeRootId = writable<string | null>(null);
export const treeDepth = writable<number>(2);

// Simulation temporelle (Feature 3) : année courante + couples actuels.
export const currentYear = writable<number>(0);
export const couples = writable<Couple[]>([]);

// Année de la genèse (Feature 011, §6.2) : origine du calcul de génération. Fixée à la génération
// du batch initial (= birthYear) ; persistée/restaurée via export/import (data/full).
export const genesisYear = writable<number>(0);

// Journal d'événements daté (Feature 7) : alimente la reconstruction historique de la sandbox.
export const history = writable<PopulationEvent[]>([]);

// Sélection multiple pour la reproduction (US1). Set d'ids ; l'ordre de reproduction suit
// l'ordre de la population (déterminisme).
export const selectedIds = writable<Set<string>>(new Set());

// Générateur du moteur : on **continue le flux** de la genèse (déterminisme : seed + séquence
// d'actions ⇒ résultat reproductible, Principe I). (Re)créé à chaque génération/import.
let engineRng: Rng = createRng(0n);

// Individu actuellement sélectionné (US2), dérivé de la population et de l'id sélectionné.
export const selectedPerson = derived(
  [population, selectedPersonId],
  ([$population, $id]) => $population.find((p) => p.id === $id) ?? null,
);

export function getCatalog(): Catalog {
  return get(catalog);
}

/** Tire une nouvelle seed (entropie volontaire) ; la prochaine génération l'utilise. */
export function regenerateSeed(): void {
  parameters.update((p) => ({ ...p, seed: createSeed().toString() }));
}

/** Met à jour un paramètre nommé. */
export function setParam<K extends keyof Parameters>(key: K, value: Parameters[K]): void {
  parameters.update((p) => ({ ...p, [key]: value }));
}

// --- Édition du catalogue de traits (Feature 5, US1/US3) — mutations pures du cœur. ---

export function catAddTrait(type: TraitType, label: string): void {
  catalog.update((c) => addTraitCore(c, type, label));
}
export function catRenameTrait(traitId: string, label: string): void {
  catalog.update((c) => renameTraitCore(c, traitId, label));
}
export function catRemoveTrait(traitId: string): void {
  catalog.update((c) => removeTraitCore(c, traitId));
}
export function catSetTraitWeight(traitId: string, weight: number | null): void {
  catalog.update((c) => setTraitWeightCore(c, traitId, weight));
}
export function catPropagateTypeWeight(type: TraitType): void {
  catalog.update((c) => propagateTypeWeightCore(c, type));
}

// --- Édition du catalogue d'espèces & genres (Feature 5, US1/US2). ---

export function espAdd(label: string): void {
  especes.update((l) => addEspeceCore(l, label));
}
export function espRename(especeId: string, label: string): void {
  especes.update((l) => renameEspeceCore(l, especeId, label));
}
export function espRemove(especeId: string): void {
  especes.update((l) => removeEspeceCore(l, especeId));
}
export function espSetParam<K extends keyof Espece>(
  especeId: string,
  key: K,
  value: Espece[K],
): void {
  especes.update((l) => setEspeceParamCore(l, especeId, key, value));
}
export function espAddGenre(especeId: string, label: string): void {
  especes.update((l) => addGenreCore(l, especeId, label));
}
export function espRenameGenre(especeId: string, genreId: string, label: string): void {
  especes.update((l) => renameGenreCore(l, especeId, genreId, label));
}
export function espRemoveGenre(especeId: string, genreId: string): void {
  especes.update((l) => removeGenreCore(l, especeId, genreId));
}

// --- Surcharges de résilience (Feature 5, US3) — global → type → trait. ---

export function setResiliencePatch(scope: ResilienceScope, patch: ResiliencePatch): void {
  parameters.update((p) => setResiliencePatchCore(p, scope, patch));
}
export function clearResiliencePatch(scope: ResilienceScope): void {
  parameters.update((p) => clearResiliencePatchCore(p, scope));
}
export function propagateResilienceType(type: TraitType): void {
  parameters.update((p) => propagateResilienceTypeCore(p, type));
}

/** Génère la population déterministe à partir des paramètres courants, puis affiche la liste. */
export function generate(): void {
  const p = get(parameters);
  engineRng = createRng(BigInt(p.seed));
  // Le catalogue & les espèces (config éditable, Feature 5) sont **conservés** : générer une
  // population n'efface pas les réglages de l'utilisateur.
  const pop = generateInitialPopulation(p, get(catalog), engineRng);
  population.set(pop);
  currentYear.set(p.birthYear);
  genesisYear.set(p.birthYear); // origine du calcul de génération (§6.2)
  couples.set([]);
  // Journal d'événements (Feature 7) : une naissance datée par individu du batch initial.
  history.set(pop.map((person) => birthEvent(person.id, p.birthYear)));
  selectedIds.set(new Set());
  currentView.set('liste');
}

/** Assemble l'état applicatif courant (pour le cœur ou l'export). */
function snapshot(): AppState {
  return {
    formatVersion: FORMAT_VERSION,
    kind: 'full',
    parameters: get(parameters),
    catalog: get(catalog),
    especes: get(especes),
    population: get(population),
    currentYear: get(currentYear),
    genesisYear: get(genesisYear),
    couples: get(couples),
    rngState: engineRng.getState(),
    history: get(history),
  };
}

// Indicateur de chargement (Feature 015, US5) : vrai pendant le calcul d'« avancer ».
export const advancing = writable<boolean>(false);

/**
 * Attend qu'une frame ait été **effectivement peinte** avant de rendre la main (repli `setTimeout`
 * hors DOM). Un **double** `requestAnimationFrame` est nécessaire : le 1ᵉʳ rAF s'exécute *avant* la
 * peinture de la frame courante (DOM à jour mais spinner pas encore peint) ; le 2ᵉ ne se déclenche
 * qu'*après* cette peinture. Sans cela, le calcul synchrone bloquant démarrerait avant tout repaint
 * et le spinner ne s'afficherait jamais (§R8).
 */
function yieldFrame(): Promise<void> {
  return new Promise<void>((resolve) => {
    if (typeof requestAnimationFrame === 'function') {
      requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
    } else {
      setTimeout(resolve, 0);
    }
  });
}

// Seuil de charge (population × années) en dessous duquel le calcul d'« avancer » est considéré
// **quasi instantané** : on l'exécute alors directement, sans afficher le spinner (évite le
// clignotement). Au-dessus, on affiche l'indicateur. (Le calcul étant synchrone, sa durée ne peut
// pas être mesurée « pendant » qu'il tourne ⇒ heuristique a priori sur la charge.)
const SPINNER_MIN_WORK = 5000;

/** Applique le calcul synchrone du tick et publie le nouvel état. */
function applyAdvance(n: number): void {
  const result = advanceYearsCore(snapshot(), n, engineRng);
  population.set(result.population);
  couples.set(result.couples);
  currentYear.set(result.currentYear);
  history.set(result.history);
}

/**
 * Avance la simulation de `years` années (≥ 1) via le tick annuel déterministe (Feature 3).
 * Continue le flux `engineRng` ; met à jour population, couples et année courante.
 * Feature 015 (US5) : si la charge estimée dépasse `SPINNER_MIN_WORK`, monte l'indicateur
 * `advancing` puis **cède une frame** avant le calcul synchrone (spinner peint, §R8) et le retire à
 * la fin ; sinon exécute directement (calcul instantané, pas de spinner).
 */
export async function advanceYears(years: number): Promise<void> {
  if (!Number.isFinite(years) || years < 1) return;
  const n = Math.floor(years);
  if (get(population).length * n < SPINNER_MIN_WORK) {
    applyAdvance(n); // quasi instantané : pas de spinner
    return;
  }
  advancing.set(true);
  await yieldFrame();
  try {
    applyAdvance(n);
  } finally {
    advancing.set(false);
  }
}

/**
 * Tue manuellement un individu (cause obligatoire, §6.7). Renvoie un message d'erreur si refusé
 * (cause vide), sinon `null`.
 */
export function killPerson(personId: string, cause: string): string | null {
  const res = killCore(snapshot(), personId, cause);
  if (!res.ok) return res.error;
  population.set(res.state.population);
  couples.set(res.state.couples);
  history.set(res.state.history);
  return null;
}

/**
 * Ressuscite un individu décédé (Feature 015, §6.7) : redevient vivant à son âge figé, raison de
 * décès effacée. Renvoie un message d'erreur si refusé (introuvable ou déjà vivant), sinon `null`.
 */
export function resurrectPerson(personId: string): string | null {
  const res = resurrectCore(snapshot(), personId);
  if (!res.ok) return res.error;
  population.set(res.state.population);
  return null;
}

/**
 * Bascule l'immortalité d'un individu (Feature 015, §6.7). Renvoie un message d'erreur si refusé
 * (introuvable), sinon `null`.
 */
export function setImmortal(personId: string, value: boolean): string | null {
  const res = setImmortalCore(snapshot(), personId, value);
  if (!res.ok) return res.error;
  population.set(res.state.population);
  return null;
}

/** Bascule la sélection d'un individu (pour la reproduction). */
export function toggleSelect(id: string): void {
  selectedIds.update((set) => {
    const next = new Set(set);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    return next;
  });
}

// Reproduction manuelle : RETIRÉE de la page principale (Feature 7, FR-001). Elle vit désormais
// **exclusivement** dans la sandbox (`sandboxStore`), via le cœur `manualReproduce`.

/** Couple actuel contenant un individu, ou null. */
export function coupleOf(personId: string): Couple | null {
  return get(couples).find((c) => c.memberIds.includes(personId)) ?? null;
}

/** Édite le % de reproduction d'un couple (null ⇒ hérité de la gaussienne, FR-011). */
export function setCoupleReproPct(coupleId: string, pct: number | null): void {
  couples.update((list) => list.map((c) => (c.id === coupleId ? { ...c, reproPct: pct } : c)));
}

/** Ouvre la fiche d'un individu (US2). */
export function selectPerson(id: string): void {
  selectedPersonId.set(id);
  currentView.set('fiche');
}

/** Retour à la liste depuis la fiche (conserve la population). */
export function backToList(): void {
  selectedPersonId.set(null);
  currentView.set('liste');
}

/** Ouvre la page dédiée à l'arbre, centrée sur `rootId` (FR-002a/FR-005). */
export function goToArbre(rootId: string): void {
  treeRootId.set(rootId);
  currentView.set('arbre');
}

/** Recentre l'arbre de la page dédiée sur un autre individu (FR-004). */
export function recenterTree(id: string): void {
  treeRootId.set(id);
}

/** Règle la profondeur de la page dédiée (≥ 1, sans plafond). */
export function setTreeDepth(n: number): void {
  if (!Number.isFinite(n)) return;
  treeDepth.set(Math.max(1, Math.floor(n)));
}

/** Quitte la page dédiée vers la fiche de l'individu centré. */
export function arbreToFiche(): void {
  const id = get(treeRootId);
  if (id) selectedPersonId.set(id);
  currentView.set(id ? 'fiche' : 'liste');
}

/** Va à l'écran des paramètres. */
export function goToParametres(): void {
  currentView.set('parametres');
}

// --- Pont sandbox (Feature 7) : la sandbox lit un instantané du réel et n'écrit le réel qu'au make it real. ---

/** Instantané complet de l'état réel courant (pour entrer/réinitialiser la sandbox). */
export function snapshotState(): AppState {
  return snapshot();
}

/** Promeut un état dans la population réelle (« make it real ») : remplace tout + restaure le RNG. */
export function promoteState(state: AppState): void {
  applyFull(state);
  currentView.set('liste');
}

/** Ouvre l'écran sandbox. */
export function goToSandbox(): void {
  currentView.set('sandbox');
}

// --- Persistance par fichier (Feature 6) — 3 types + détection ; aucune sauvegarde auto (Principe VI). ---

export const importError = writable<string | null>(null);

/** JSON de la **configuration** seule (seed + paramètres + catalogues + espèces) — kind:"config". */
export function buildConfigJson(): string {
  return serializeConfig(snapshot());
}

/** JSON des **données** seules (population, généalogie, couples, année, état RNG) — kind:"data". */
export function buildDataJson(): string {
  return serializeData(snapshot());
}

/** JSON **complet** (config + data) — kind:"full". */
export function buildFullJson(): string {
  return serializeFull(snapshot());
}

/**
 * Applique une CONFIG importée : remplace paramètres/catalogue/espèces et **conserve** la
 * population (Clarification 2026-06-17). Délègue la fusion non destructive au cœur (mergeConfig).
 */
export function applyConfig(config: ConfigState): void {
  const merged = mergeConfig(snapshot(), config);
  parameters.set(merged.parameters);
  catalog.set(merged.catalog);
  especes.set(merged.especes);
}

/**
 * Applique des DONNÉES importées : remplace population/couples/année + **restaure l'état RNG**
 * (reprise au tirage près) et **conserve** la config. Délègue la fusion au cœur (mergeData) ;
 * `engineRng` est restauré depuis l'état fusionné (rngState reconstruit si le fichier en manquait).
 */
export function applyData(data: DataState): void {
  const merged = mergeData(snapshot(), data);
  population.set(merged.population);
  couples.set(merged.couples);
  currentYear.set(merged.currentYear);
  genesisYear.set(merged.genesisYear);
  history.set(merged.history);
  selectedPersonId.set(null);
  selectedIds.set(new Set());
  engineRng = createRngFromState(merged.rngState);
}

/** Applique un état COMPLET : remplace tout (config + data) et restaure l'état RNG exact. */
function applyFull(state: AppState): void {
  parameters.set(state.parameters);
  catalog.set(state.catalog);
  especes.set(state.especes);
  population.set(state.population);
  currentYear.set(state.currentYear);
  genesisYear.set(state.genesisYear);
  couples.set(state.couples);
  history.set(state.history);
  selectedPersonId.set(null);
  selectedIds.set(new Set());
  engineRng = createRngFromState(state.rngState);
}

/**
 * Importe un fichier en **détectant automatiquement** son type (config/data/full) et en appliquant
 * le traitement correspondant. En cas d'échec, renseigne `importError` et NE modifie PAS l'état
 * courant (rejet propre, INV-K9/FR-010). Retourne true si l'import a réussi.
 */
export function applyImport(json: string): boolean {
  const res = parseImport(json);
  if (!res.ok) {
    importError.set(res.error);
    return false;
  }
  importError.set(null);
  if (res.value.kind === 'config') {
    applyConfig(res.value.config);
    // L'import de config conserve la population : ne change pas de vue si aucune population.
    currentView.set(get(population).length > 0 ? 'liste' : 'parametres');
  } else if (res.value.kind === 'data') {
    applyData(res.value.data);
    currentView.set('liste');
  } else {
    applyFull(res.value.state);
    currentView.set('liste');
  }
  return true;
}
