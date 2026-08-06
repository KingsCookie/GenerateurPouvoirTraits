// Construction d'arbre généalogique — cœur PUR, déterministe, LECTURE SEULE (Principes I/IV).
// Borné par la profondeur ; un individu atteint par plusieurs chemins est reconstruit à chaque
// emplacement (pas de déduplication — INV-G1). Aucune mutation des entrées (INV-G6).
import type { Personne } from '../model/personne.js';
import type { Catalog } from '../model/trait.js';
import { powerLabel, yearOf } from '../genesis/derived.js';

/** Contexte de calcul des nœuds (âge + libellés de pouvoir). Données pures passées en entrée. */
export interface TreeContext {
  currentYear: number;
  catalog: Catalog;
}

/** Données d'affichage minimales d'un individu (sans dépliage de parenté). */
export interface TreeNodeLite {
  id: string;
  nom: string;
  age: number;
  vivant: boolean;
  pouvoirs: string[];
}

/** Union (par conjoint) rattachée à un nœud : conjoint + enfants communs uniquement (INV-G2). */
export interface Union {
  conjointId: string;
  statut: 'actuel' | 'ex';
  conjoint: TreeNodeLite;
  enfantsCommuns: string[];
}

/** Nœud d'arbre : individu + ancêtres (via `parents`) + descendants (via `enfants`) + unions. */
export interface TreeNode extends TreeNodeLite {
  ancestors: TreeNode[];
  descendants: TreeNode[];
  unions: Union[];
}

/** Partie « mois-jour » d'une date ISO (après l'année signée), pour un tri déterministe. */
function monthDay(dateIso: string): string {
  return dateIso.replace(/^-?\d+-/, '');
}

/** Comparateur déterministe : date de naissance puis id (INV-G3). */
function byBirthThenId(a: Personne, b: Personne): number {
  const ya = yearOf(a.dateNaissance);
  const yb = yearOf(b.dateNaissance);
  if (ya !== yb) return ya - yb;
  const md = monthDay(a.dateNaissance).localeCompare(monthDay(b.dateNaissance));
  if (md !== 0) return md;
  return a.id.localeCompare(b.id);
}

/** Résout des ids → personnes (ignore les absents), triées date puis id. */
function resolveSorted(ids: string[], byId: Map<string, Personne>): Personne[] {
  const out: Personne[] = [];
  for (const id of ids) {
    const p = byId.get(id);
    if (p) out.push(p);
  }
  return out.sort(byBirthThenId);
}

function nodeLite(p: Personne, ctx: TreeContext): TreeNodeLite {
  return {
    id: p.id,
    nom: p.nom,
    age: p.age, // âge suivi (Feature 015)
    vivant: p.vivant,
    pouvoirs: p.pouvoirs.map((pw) => powerLabel(pw, ctx.catalog)),
  };
}

/** Unions du nœud : pour chaque conjoint (actuel/ex), les enfants communs uniquement (INV-G2). */
function buildUnions(p: Personne, byId: Map<string, Personne>, ctx: TreeContext): Union[] {
  const unions: Union[] = [];
  for (const conj of p.conjoints) {
    const cperson = byId.get(conj.id);
    if (!cperson) continue;
    // Enfants dont la parenté contient à la fois le nœud ET ce conjoint (pas d'enfants tiers).
    const communs = p.enfants.filter((eid) => {
      const e = byId.get(eid);
      return e != null && e.parents.includes(p.id) && e.parents.includes(conj.id);
    });
    unions.push({
      conjointId: conj.id,
      statut: conj.statut,
      conjoint: nodeLite(cperson, ctx),
      enfantsCommuns: resolveSorted(communs, byId).map((e) => e.id),
    });
  }
  // Tri déterministe des unions par date de naissance du conjoint puis id.
  unions.sort((u1, u2) => {
    const c1 = byId.get(u1.conjointId);
    const c2 = byId.get(u2.conjointId);
    if (c1 && c2) return byBirthThenId(c1, c2);
    return u1.conjointId.localeCompare(u2.conjointId);
  });
  return unions;
}

/** Déplie les ancêtres uniquement (remonte via `parents`), borné par `depth`. */
function buildAncestorNode(
  p: Personne,
  byId: Map<string, Personne>,
  depth: number,
  ctx: TreeContext,
): TreeNode {
  const ancestors =
    depth >= 1
      ? resolveSorted(p.parents, byId).map((par) => buildAncestorNode(par, byId, depth - 1, ctx))
      : [];
  return { ...nodeLite(p, ctx), ancestors, descendants: [], unions: buildUnions(p, byId, ctx) };
}

/** Déplie les descendants uniquement (descend via `enfants`), borné par `depth`. */
function buildDescendantNode(
  p: Personne,
  byId: Map<string, Personne>,
  depth: number,
  ctx: TreeContext,
): TreeNode {
  const descendants =
    depth >= 1
      ? resolveSorted(p.enfants, byId).map((ch) => buildDescendantNode(ch, byId, depth - 1, ctx))
      : [];
  return { ...nodeLite(p, ctx), ancestors: [], descendants, unions: buildUnions(p, byId, ctx) };
}

/**
 * Construit l'arbre centré sur `rootId` : `depth` niveaux d'ancêtres (via `parents`) et de
 * descendants (via `enfants`), avec les unions du nœud. Borné et terminant même en présence de
 * consanguinité (répétition assumée, pas de déduplication — INV-G1). N'altère pas `byId` (INV-G6).
 *
 * `rootId` absent de `byId` ⇒ renvoie un nœud minimal vide (id repris, sans parenté).
 */
export function buildGenealogyTree(
  rootId: string,
  byId: Map<string, Personne>,
  depth: number,
  ctx: TreeContext,
): TreeNode {
  const root = byId.get(rootId);
  if (!root) {
    return {
      id: rootId,
      nom: '',
      age: 0,
      vivant: false,
      pouvoirs: [],
      ancestors: [],
      descendants: [],
      unions: [],
    };
  }
  const d = Math.max(1, Math.floor(depth));
  const ancestors = resolveSorted(root.parents, byId).map((par) =>
    buildAncestorNode(par, byId, d - 1, ctx),
  );
  const descendants = resolveSorted(root.enfants, byId).map((ch) =>
    buildDescendantNode(ch, byId, d - 1, ctx),
  );
  return { ...nodeLite(root, ctx), ancestors, descendants, unions: buildUnions(root, byId, ctx) };
}
