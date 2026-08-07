import type { Rng } from '../rng/rng.js';
import type { Catalog, Trait } from '../model/trait.js';
import type { TraitType } from '../model/traitType.js';
import type { Parameters } from '../params/parameters.js';
import { resolveResilience } from '../params/resolveResilience.js';
import { resolveWeight } from '../params/resolveWeight.js';
import type { Pouvoir } from '../model/pouvoir.js';
import type { ADN, ResilientTrait } from '../model/adn.js';
import {
  powerTemplatesFromSublist,
  type SublistGroups,
  type ResolvedTemplate,
} from './powerLabelTree.js';

/** Résultat : pouvoirs dérivés + ADN éventuellement enrichi par la génération `K` (§6.4.2). */
export interface DerivePowersResult {
  pouvoirs: Pouvoir[];
  adn: ADN;
}

/** Trait actif tel qu'utilisé par l'algorithme (type/libellé résolus depuis le catalogue). */
interface TraitRef {
  traitId: string;
  type: TraitType;
  label: string;
  resilience: number;
}

// Correspondance type de trait → clé de l'arbre §6.4.2.
const TYPE_TO_KEY: Record<TraitType, keyof SublistGroups> = {
  Action: 'a',
  Element: 'e',
  PartieCorps: 'p',
  Ajout: 'aj',
  Remplacement: 'r',
  Etat: 'et',
};

// Jeton de génération `K…` → type de trait à générer (seuls ceux apparaissant dans l'arbre).
const K_TOKEN_TYPE: Record<string, TraitType> = {
  Ka: 'Action',
  Ke: 'Element',
  Kp: 'PartieCorps',
  Kaj: 'Ajout',
};

function buildTraitIndex(catalog: Catalog): Map<string, Trait> {
  const idx = new Map<string, Trait>();
  for (const list of Object.values(catalog.byType)) {
    for (const t of list) idx.set(t.id, t);
  }
  return idx;
}

/**
 * Construit les **sous-listes** de traits (§6.4.1) : principaux (Actions sinon Parties du corps
 * sinon liste unique), répartition cyclique des secondaires après mélange déterministe, avec
 * **duplication** (proba `min(100, résilience·D)` %, ≤ 1 occurrence par sous-liste, **sans modifier l'ADN**).
 *
 * Exporté pour les tests (T006) ; non ré-exposé par la façade.
 */
export function buildSublists(active: TraitRef[], params: Parameters, rng: Rng): TraitRef[][] {
  if (active.length === 0) return [];

  const actions = active.filter((t) => t.type === 'Action');
  const parties = active.filter((t) => t.type === 'PartieCorps');

  let principals: TraitRef[];
  if (actions.length > 0) principals = actions;
  else if (parties.length > 0) principals = parties;
  else return [active.slice()]; // ni Action ni Partie du corps ⇒ une seule sous-liste

  const principalIds = new Set(principals.map((t) => t.traitId));
  const secondaries = active.filter((t) => !principalIds.has(t.traitId));

  const shuffledPrincipals = rng.shuffle(principals);
  const shuffledSecondaries = rng.shuffle(secondaries);

  const sublists: TraitRef[][] = shuffledPrincipals.map((p) => [p]);
  const n = sublists.length;
  let counter = 0;

  const occurrences = (traitId: string): number =>
    sublists.reduce((acc, sl) => acc + (sl.some((t) => t.traitId === traitId) ? 1 : 0), 0);

  const place = (ref: TraitRef): void => {
    // Cherche une sous-liste qui ne contient pas déjà ce trait (≤ 1 occurrence par sous-liste).
    let attempts = 0;
    while (attempts < n && sublists[counter % n].some((t) => t.traitId === ref.traitId)) {
      counter++;
      attempts++;
    }
    if (attempts === n) return; // toutes les sous-listes le contiennent déjà
    sublists[counter % n].push(ref);
    counter++;
    // Duplication : proba min(100, résilience·D) % (§6.4.1), tant qu'il reste une sous-liste libre.
    const dupPct = Math.min(100, Math.max(0, ref.resilience * params.duplicationD));
    if (occurrences(ref.traitId) < n && rng.chance(dupPct)) {
      place(ref);
    }
  };

  for (const sec of shuffledSecondaries) place(sec);

  return sublists;
}

/**
 * Algorithme **traits → pouvoirs** (§6.4) sur les traits **actifs** de l'ADN.
 * - sous-listes + duplication (§6.4.1) ;
 * - libellé via l'arbre §6.4.2 (verbatim) ;
 * - génération `K…` (proba `generationK` %) : trait **inscrit actif** dans l'ADN (réactivé + bonus
 *   s'il existait) ; échec d'un `K` requis ⇒ la sous-liste **ne produit pas** de pouvoir.
 *
 * N'altère **pas** l'ADN d'entrée (travaille sur une copie qu'il renvoie).
 */
export function derivePowersFromTraits(
  adn: ADN,
  catalog: Catalog,
  params: Parameters,
  rng: Rng,
): DerivePowersResult {
  const traitIndex = buildTraitIndex(catalog);

  // Copie de travail de l'ADN (la génération K l'enrichit ; la duplication ne le touche pas).
  const working = new Map<string, ResilientTrait>();
  for (const t of adn.traits) working.set(t.traitId, { ...t });

  const active: TraitRef[] = [];
  for (const t of adn.traits) {
    if (!t.active) continue;
    const meta = traitIndex.get(t.traitId);
    if (!meta) continue; // trait inconnu du catalogue : ignoré (INV-8)
    active.push({
      traitId: t.traitId,
      type: meta.type,
      label: meta.label,
      resilience: t.resilience,
    });
  }

  // Aucun trait actif ⇒ sans pouvoir (§6.4).
  if (active.length === 0) return { pouvoirs: [], adn: { traits: [...working.values()] } };

  const sublists = buildSublists(active, params, rng);

  const pouvoirs: Pouvoir[] = [];
  for (const sublist of sublists) {
    pouvoirs.push(...transformSublist(sublist, working, catalog, params, rng));
  }

  return { pouvoirs: dedupePowers(pouvoirs), adn: { traits: [...working.values()] } };
}

/** Position d'un pouvoir dans sa feuille : 0 = primaire, 1 = secondaire (suffixe `#n` de l'id). */
function positionOf(pw: Pouvoir): number {
  const m = pw.id.match(/#(\d+)$/);
  return m ? Number(m[1]) : 0;
}

/**
 * Déduplication des pouvoirs **quasi identiques** d'une personne (§6.4.3, BUG-002). Exécutée **avant**
 * l'attribution des puissances/maîtrises (§7.2, déléguée aux appelants) : elle ne compare **aucune**
 * statistique, ne consomme **aucun** tirage RNG et ne modifie pas l'ADN.
 *
 * Deux passes :
 *  1. **Par position + sous-ensemble de traits affichés** : on ne compare que des pouvoirs de **même
 *     position** (primaires entre eux, secondaires entre eux) ; dans un groupe, tout pouvoir dont
 *     l'ensemble de `traitIds` (= traits **affichés**, cf. `transformSublist`) est **inclus** dans
 *     celui d'un autre est supprimé (le plus riche gagne ; à ensembles égaux, on garde le premier).
 *     Un primaire et un secondaire ne sont jamais comparés ⇒ les deux pouvoirs d'une feuille sont
 *     préservés. En pratique les primaires portent leur trait principal (unique par sous-liste) donc
 *     ne se recouvrent pas : ce sont les **secondaires** qui se dédupliquent.
 *  2. **Garde-fou libellé** : deux pouvoirs restants de libellé strictement identique ⇒ on ne garde
 *     que le premier (ne survient qu'avec des traits **homonymes** au catalogue).
 *
 * Exporté pour les tests.
 */
export function dedupePowers(pouvoirs: Pouvoir[]): Pouvoir[] {
  return guardIdenticalLabel(dedupeBySubsumption(pouvoirs));
}

function dedupeBySubsumption(pouvoirs: Pouvoir[]): Pouvoir[] {
  const sets = pouvoirs.map((p) => new Set(p.traitIds));
  const positions = pouvoirs.map(positionOf);
  const isSubset = (a: Set<string>, b: Set<string>): boolean => {
    if (a.size > b.size) return false;
    for (const x of a) if (!b.has(x)) return false;
    return true;
  };
  return pouvoirs.filter((_p, i) => {
    for (let j = 0; j < pouvoirs.length; j++) {
      if (j === i || positions[j] !== positions[i]) continue;
      if (!isSubset(sets[i], sets[j])) continue; // traits(i) ⊄ traits(j)
      if (sets[j].size > sets[i].size) return false; // i strictement inclus ⇒ supprimé
      if (sets[j].size === sets[i].size && j < i) return false; // égaux ⇒ garder le premier
    }
    return true;
  });
}

function guardIdenticalLabel(pouvoirs: Pouvoir[]): Pouvoir[] {
  const seen = new Set<string>();
  const kept: Pouvoir[] = [];
  for (const pw of pouvoirs) {
    if (seen.has(pw.label)) continue;
    seen.add(pw.label);
    kept.push(pw);
  }
  return kept;
}

// Regroupe les libellés d'un même type : « , … et » (états : « ou ») — purement pour l'affichage.
function joinGroup(labels: string[], isEtat: boolean): string {
  if (labels.length === 1) return labels[0];
  if (isEtat) return labels.join(' ou ');
  return `${labels.slice(0, -1).join(', ')} et ${labels[labels.length - 1]}`;
}

// Résultat de résolution d'un jeton `K` : trait généré (réutilisé), ou `null` = échec du tirage.
type KResolved = { label: string; traitId: string } | null;

// Transforme une sous-liste en **0, 1 ou 2** pouvoirs (§6.4.2, v0.15.0). Une feuille peut porter deux
// gabarits ; un même jeton `Kx` présent dans les deux est **tiré une seule fois** et réutilisé. Un
// gabarit référençant un jeton `K` en échec ne produit pas de pouvoir ; un gabarit sans jeton `K`
// échoué est quand même produit. Inscrit les traits générés K dans `working` (ADN), une seule fois.
function transformSublist(
  sublist: TraitRef[],
  working: Map<string, ResilientTrait>,
  catalog: Catalog,
  params: Parameters,
  rng: Rng,
): Pouvoir[] {
  // Regroupe par type (ordre stable des traits dans la sous-liste).
  const byType = new Map<TraitType, string[]>();
  for (const t of sublist) {
    const list = byType.get(t.type) ?? [];
    list.push(t.label);
    byType.set(t.type, list);
  }

  const groups: SublistGroups = {};
  for (const [type, labels] of byType) {
    groups[TYPE_TO_KEY[type]] = joinGroup(labels, type === 'Etat');
  }

  const templates = powerTemplatesFromSublist(groups);
  if (templates.length === 0) return [];

  // Collecte des jetons `K` **distincts** dans l'ordre de première apparition (gabarit 1 puis 2).
  const distinctTokens: string[] = [];
  for (const { label } of templates) {
    for (const token of label.match(/\{(Ka|Ke|Kp|Kaj)\}/g) ?? []) {
      if (!distinctTokens.includes(token)) distinctTokens.push(token);
    }
  }

  // Un seul tirage par jeton distinct (partagé par les deux gabarits) — proba generationK %.
  const resolved = new Map<string, KResolved>();
  for (const token of distinctTokens) {
    const type = K_TOKEN_TYPE[token.slice(1, -1)]; // retire { }
    if (!rng.chance(params.generationK)) {
      resolved.set(token, null);
      continue;
    }
    const pool = catalog.byType[type];
    if (pool.length === 0) {
      resolved.set(token, null); // type vide : génération impossible
      continue;
    }
    // Poids effectif (surcharge ?? poids du type) ; type à 0 ⇒ échec (FR-052b). Tolérant : jamais d'exception.
    const generated = rng.pickWeightedOrNull(pool, (t) =>
      resolveWeight(t.id, t.weight, params.traitTypeWeights),
    );
    if (generated === null) {
      resolved.set(token, null);
      continue;
    }
    inscribeGenerated(generated.id, working, params);
    resolved.set(token, { label: generated.label, traitId: generated.id });
  }

  // Construit un pouvoir par gabarit ; un gabarit référençant un jeton en échec est ignoré.
  const pouvoirs: Pouvoir[] = [];
  templates.forEach((tmpl: ResolvedTemplate, index) => {
    const tokens = tmpl.label.match(/\{(Ka|Ke|Kp|Kaj)\}/g) ?? [];
    if (tokens.some((token) => resolved.get(token) === null)) return; // échec K requis ⇒ pas de pouvoir

    // **Traits affichés** (§6.4.3) : uniquement les traits des types **mentionnés** dans ce gabarit,
    // dans l'ordre de la sous-liste, plus les traits générés `K` qui y figurent. Un type présent mais
    // non affiché (incohérences volontaires §6.4.2) n'est **pas** inclus.
    const shown = new Set(tmpl.shownTypeKeys);
    const traitIds = sublist.filter((t) => shown.has(TYPE_TO_KEY[t.type])).map((t) => t.traitId);

    let label = tmpl.label;
    for (const token of tokens) {
      const gen = resolved.get(token)!; // non-null ici (sinon écarté ci-dessus)
      label = label.split(token).join(gen.label);
      if (!traitIds.includes(gen.traitId)) traitIds.push(gen.traitId);
    }

    pouvoirs.push({
      // id = traits affichés + suffixe de **position** (#0 primaire / #1 secondaire) dans la feuille.
      id: `pw:DERIVE:${traitIds.join('+')}#${index}`,
      label,
      template: 'DERIVE',
      traitIds,
      puissance: 0, // attribués ensuite par inheritStats (§7.2)
      maitrise: 0,
    });
  });

  return pouvoirs;
}

// Inscrit un trait généré K dans l'ADN : actif ; s'il existait, on le réactive + bonus (clampé).
// Résilience initiale/plafond **effectifs** par trait (global → type → trait, §9.2).
function inscribeGenerated(
  traitId: string,
  working: Map<string, ResilientTrait>,
  params: Parameters,
): void {
  const eff = resolveResilience(params, traitId);
  const existing = working.get(traitId);
  if (existing) {
    existing.active = true;
    existing.resilience = Math.min(existing.resilience + params.bonusPoints, eff.max);
  } else {
    working.set(traitId, {
      traitId,
      active: true,
      resilience: Math.min(eff.initial, eff.max),
    });
  }
}
