import type { Rng } from '../rng/rng.js';
import type { Catalog, Trait } from '../model/trait.js';
import type { TraitType } from '../model/traitType.js';
import type { Parameters } from '../params/parameters.js';
import { resolveResilience } from '../params/resolveResilience.js';
import { resolveWeight } from '../params/resolveWeight.js';
import type { Pouvoir } from '../model/pouvoir.js';
import type { ADN, ResilientTrait } from '../model/adn.js';
import { powerLabelFromSublist, type SublistGroups } from './powerLabelTree.js';

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

  return { pouvoirs, adn: { traits: [...working.values()] } };
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

  const templates = powerLabelFromSublist(groups);
  if (templates.length === 0) return [];

  const baseTraitIds = sublist.map((t) => t.traitId);

  // Collecte des jetons `K` **distincts** dans l'ordre de première apparition (gabarit 1 puis 2).
  const distinctTokens: string[] = [];
  for (const tmpl of templates) {
    for (const token of tmpl.match(/\{(Ka|Ke|Kp|Kaj)\}/g) ?? []) {
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
  templates.forEach((tmpl, index) => {
    const tokens = tmpl.match(/\{(Ka|Ke|Kp|Kaj)\}/g) ?? [];
    if (tokens.some((token) => resolved.get(token) === null)) return; // échec K requis ⇒ pas de pouvoir

    let label = tmpl;
    const traitIds = [...baseTraitIds];
    for (const token of tokens) {
      const gen = resolved.get(token)!; // non-null ici (sinon écarté ci-dessus)
      label = label.split(token).join(gen.label);
      if (!traitIds.includes(gen.traitId)) traitIds.push(gen.traitId);
    }

    pouvoirs.push({
      // id unique **par personne** ; suffixe d'index pour départager les 2 pouvoirs d'une feuille.
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
