// Façade publique du cœur métier pur (Principe IV). L'UI importe UNIQUEMENT depuis ici.
export * from './model/index.js';
export { createRng, createRngFromState, createSeed } from './rng/index.js';
export type { Rng } from './rng/index.js';
export { defaultCatalog, defaultEspece, defaultEspeces, slug } from './catalog/defaultCatalog.js';
export {
  addTrait,
  renameTrait,
  removeTrait,
  setTraitWeight,
  propagateTypeWeight,
} from './catalog/editCatalog.js';
export {
  addEspece,
  renameEspece,
  removeEspece,
  setEspeceParam,
  addGenre,
  renameGenre,
  removeGenre,
  validateEspece,
} from './species/editEspeces.js';
export { defaultParameters, statA } from './params/parameters.js';
export type { Parameters, ResiliencePatch, ResilienceOverrides } from './params/parameters.js';
export {
  resolveResilience,
  setResiliencePatch,
  clearResiliencePatch,
  propagateResilienceType,
  validateResiliencePatch,
  clampPct,
} from './params/resolveResilience.js';
export type { EffectiveResilience, ResilienceScope } from './params/resolveResilience.js';
export { resolveWeight } from './params/resolveWeight.js';
export { generateInitialPopulation } from './genesis/genesis.js';
export { generateName, NAME_LIST_SIZES } from './genesis/names.js';
export {
  computeAge,
  computeGeneration,
  powerLabel,
  formatPowerLabel,
  yearOf,
} from './genesis/derived.js';
export { generateStrongMutationPower } from './powers/strongMutation.js';

// Moteur génétique (Feature 2 : hérédité, traits→pouvoirs, puissance/maîtrise, reproduction).
export { inheritADN } from './heredity/inherit.js';
export { derivePowersFromTraits } from './powers/traitsToPowers.js';
export type { DerivePowersResult } from './powers/traitsToPowers.js';
export { powerLabelFromSublist } from './powers/powerLabelTree.js';
export type { SublistGroups } from './powers/powerLabelTree.js';
export { inheritStats } from './powers/inheritStats.js';
export { regeneratePowers } from './powers/regenerate.js';
export { reproduce } from './birth/reproduce.js';
export type { BirthCase, ReproduceOptions } from './birth/reproduce.js';

// Simulation temporelle (Feature 3 : gaussienne, portée, candidats, appariement, tick, mort).
export { reproProbability } from './repro/gaussian.js';
export { litterSize } from './repro/litter.js';
export { selectCandidates, hasCurrentSpouse } from './repro/candidates.js';
export { formCouples, areConsanguine, isDirectLineage } from './repro/pairing.js';
export type { PairingResult } from './repro/pairing.js';
export { tick, advanceYears } from './time/tick.js';
export { kill, resurrect, setImmortal } from './life/death.js';
export type { KillResult } from './life/death.js';

// Sandbox & « make it real » (Feature 7 : reproduction manuelle, création/clonage/édition/suppression,
// reconstruction historique à partir du journal d'événements daté).
export {
  manualReproduce,
  createPerson,
  clonePerson,
  editPerson,
  deletePerson,
  formCouple,
  divorceCouple,
  dissolveConjugalLink,
} from './sandbox/sandbox.js';
export type { PersonDraft, PersonPatch } from './sandbox/sandbox.js';
export { reconstructAtYear } from './sandbox/reconstruct.js';
export {
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
} from './state/serialize.js';
export type { AppState, ConfigState, DataState, ParsedImport, Result } from './state/serialize.js';

// Généalogie & exploration (Feature 4 : arbre généalogique, filtres, dernière génération).
export {
  buildGenealogyTree,
  filterPopulation,
  lastGeneration,
  sortPopulation,
} from './genealogy/index.js';
export type {
  TreeNode,
  TreeNodeLite,
  Union,
  TreeContext,
  FilterCriteria,
  FilterContext,
  TraitScope,
  TraitPresence,
  PowerPresence,
  Statut,
  SortKey,
  SortDir,
} from './genealogy/index.js';
