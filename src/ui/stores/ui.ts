// État d'INTERFACE — NON exporté dans l'état applicatif ni l'export/import (Principe VI).
// Couvre : préférences d'apparence (persistées localStorage) + états de session
// (pagination, onglet sandbox, vue d'arbre, scroll). Aucune logique métier ici.
import { writable, type Writable } from 'svelte/store';
// Types de tri définis dans le CŒUR (source unique) — on les IMPORTE, on ne les redéfinit pas (M1).
import type { SortKey, SortDir } from '../../core/index.js';

// ---------------------------------------------------------------------------
// Accès sûrs (l'app doit fonctionner sans localStorage ; les tests purs aussi).
// ---------------------------------------------------------------------------
const hasDOM = typeof document !== 'undefined';
const hasLS = (() => {
  try {
    return typeof localStorage !== 'undefined';
  } catch {
    return false;
  }
})();

function lsGet(key: string): string | null {
  if (!hasLS) return null;
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}
function lsSet(key: string, value: string): void {
  if (!hasLS) return;
  try {
    localStorage.setItem(key, value);
  } catch {
    /* quota / mode privé : on ignore, l'app reste fonctionnelle (défauts). */
  }
}

/** Lit une préférence bornée à un ensemble de valeurs autorisées (sinon défaut). Pure (hors I/O LS). */
export function readChoice<T extends string>(key: string, allowed: readonly T[], fallback: T): T {
  const raw = lsGet(key);
  return raw !== null && (allowed as readonly string[]).includes(raw) ? (raw as T) : fallback;
}

/** Pose un attribut sur <html> (no-op hors DOM). */
function setHtmlAttr(name: string, value: string): void {
  if (hasDOM) document.documentElement.setAttribute(name, value);
}

// ===========================================================================
// Apparence (persistée localStorage) — 3 axes indépendants (FR-001..005).
// ===========================================================================
export type Mode = 'dark' | 'light';
// Palette/Style étendus en Feature 009 (+3 palettes, +4 styles). Les valeurs inconnues
// (anciens exports, valeurs retirées) repliront sur le défaut de l'axe via readChoice().
export type Palette = 'violet' | 'cyan' | 'vert' | 'ambre' | 'rose' | 'bleu';
export type Style = 'a' | 'b' | 'c' | 'd' | 'e' | 'f';

// Valeurs autorisées par axe (source unique : store + repli ; consommées aussi par les tests).
export const MODES: readonly Mode[] = ['dark', 'light'];
export const PALETTES: readonly Palette[] = ['violet', 'cyan', 'vert', 'ambre', 'rose', 'bleu'];
export const STYLES: readonly Style[] = ['a', 'b', 'c', 'd', 'e', 'f'];

const LS_MODE = 'ui.mode';
const LS_PALETTE = 'ui.palette';
const LS_STYLE = 'ui.style';
const LS_TRAITMODE = 'ui.traitMode';
const LS_PARAMSTAB = 'ui.paramsTab';

export const mode: Writable<Mode> = writable(readChoice<Mode>(LS_MODE, MODES, 'dark'));
export const palette: Writable<Palette> = writable(
  readChoice<Palette>(LS_PALETTE, PALETTES, 'violet'),
);
export const style: Writable<Style> = writable(readChoice<Style>(LS_STYLE, STYLES, 'a'));

// Application immédiate + persistance à chaque changement (SC-002/003/004).
// (Le script anti-FOUC d'index.html a déjà posé les attributs avant ce 1er abonnement.)
mode.subscribe((m) => {
  setHtmlAttr('data-mode', m);
  lsSet(LS_MODE, m);
});
palette.subscribe((p) => {
  setHtmlAttr('data-palette', p);
  lsSet(LS_PALETTE, p);
});
style.subscribe((s) => {
  setHtmlAttr('data-style', s);
  lsSet(LS_STYLE, s);
});

export function setMode(m: Mode): void {
  mode.set(m);
}
export function toggleMode(): void {
  mode.update((m) => (m === 'dark' ? 'light' : 'dark'));
}
export function setPalette(p: Palette): void {
  palette.set(p);
}
export function setStyle(s: Style): void {
  style.set(s);
}

// ===========================================================================
// Détection mobile (session, non persistée) — Feature 013.
//   Vrai sous le seuil unique 760 px. Pilote les VARIANTES DE RENDU conditionnées
//   par la largeur (feuilles plein écran, non-montage de l'arbre en fiche, etc.).
//   Purement présentationnel ; hors export/import.
// ===========================================================================
export const MOBILE_QUERY = '(max-width: 760px)';
export const isMobile: Writable<boolean> = writable(
  hasDOM ? window.matchMedia(MOBILE_QUERY).matches : false,
);
if (hasDOM) {
  const mq = window.matchMedia(MOBILE_QUERY);
  const sync = (): void => isMobile.set(mq.matches);
  mq.addEventListener('change', sync);
}

// ===========================================================================
// Onglet de la page Paramètres (persisté localStorage) — Feature 012.
//   'principaux' = essentiel (apparence, seed, effectif, année, chance de pouvoir) ;
//   'avances'    = calibration fine (hérédité, D/K, pondérations, résilience overrides).
//   Défaut 'principaux' ; valeur absente/invalide ⇒ repli défaut (readChoice). État
//   d'INTERFACE : jamais inclus dans l'export/import (Principe VI).
// ===========================================================================
export type ParamsTab = 'principaux' | 'avances';
export const PARAMS_TABS: readonly ParamsTab[] = ['principaux', 'avances'];
export const paramsTab: Writable<ParamsTab> = writable(
  readChoice<ParamsTab>(LS_PARAMSTAB, PARAMS_TABS, 'principaux'),
);
paramsTab.subscribe((t) => lsSet(LS_PARAMSTAB, t));
export function setParamsTab(t: ParamsTab): void {
  paramsTab.set(t);
}

// ===========================================================================
// Mode d'affichage des traits (existant, persisté) — défaut 3 (FR-013).
//   1 = pouvoirs seuls ; 2 = + traits actifs ; 3 = + traits inactifs + résilience.
// ===========================================================================
export type TraitMode = 1 | 2 | 3;
export const traitMode: Writable<TraitMode> = writable(
  ((): TraitMode => {
    const raw = lsGet(LS_TRAITMODE);
    return raw === '1' || raw === '2' ? (Number(raw) as TraitMode) : 3;
  })(),
);
traitMode.subscribe((m) => lsSet(LS_TRAITMODE, String(m)));
export function setTraitMode(m: TraitMode): void {
  traitMode.set(m);
}

// ===========================================================================
// Pagination (session, non persistée) — Liste & Sandbox (FR-016 ; INV-UI4).
// ===========================================================================
export type PageSize = 50 | 100 | 250 | 1000 | 'all';
export const DEFAULT_PAGE_SIZE: PageSize = 50;

export const listePageSize: Writable<PageSize> = writable(DEFAULT_PAGE_SIZE);
export const listePage: Writable<number> = writable(1);
export const sbPageSize: Writable<PageSize> = writable(DEFAULT_PAGE_SIZE);
export const sbPage: Writable<number> = writable(1);

/** Change la taille de page Liste et **revient à la page 1** (INV-UI4). */
export function setListePageSize(n: PageSize): void {
  listePageSize.set(n);
  listePage.set(1);
}
/** Change la taille de page Sandbox et **revient à la page 1** (INV-UI4). */
export function setSbPageSize(n: PageSize): void {
  sbPageSize.set(n);
  sbPage.set(1);
}

// ===========================================================================
// Sandbox — onglet interne (session) (FR-017).
// ===========================================================================
export type SandboxTab = 'population' | 'couples';
export const sbTab: Writable<SandboxTab> = writable('population');

// ===========================================================================
// Vue d'arbre (session) — zoom/pan/profondeur/racine (FR-012, US2).
// ===========================================================================
export const arbreScale: Writable<number> = writable(1);
export const arbreTx: Writable<number> = writable(0);
export const arbreTy: Writable<number> = writable(0);
export const arbreRootId: Writable<string | null> = writable(null);
export const arbreDepth: Writable<number> = writable(3);

// ===========================================================================
// Chrome (session) — bouton « remonter en haut » (FR-010).
// ===========================================================================
export const showScrollTop: Writable<boolean> = writable(false);

// ===========================================================================
// Tri des listes (session, non persisté, PAR liste) — Feature 010.
//   key: null ⇒ tri par défaut (ordre naturel de filterPopulation).
//   Cycle au clic sur un en-tête : défaut → asc → desc → défaut.
// ===========================================================================
export type ListName = 'population' | 'sandbox';
export interface ListSort {
  key: SortKey | null;
  dir: SortDir;
}

const defaultSort = (): ListSort => ({ key: null, dir: 'asc' });

export const listeSort: Writable<ListSort> = writable(defaultSort()); // vue Population
export const sbSort: Writable<ListSort> = writable(defaultSort()); // vue Sandbox

function sortStore(list: ListName): Writable<ListSort> {
  return list === 'population' ? listeSort : sbSort;
}

/** Fait tourner l'état de tri d'une liste au clic sur une colonne : défaut → asc → desc → défaut. */
export function cycleSort(list: ListName, key: SortKey): void {
  sortStore(list).update((s) => {
    if (s.key !== key) return { key, dir: 'asc' }; // autre colonne ⇒ repart en croissant
    if (s.dir === 'asc') return { key, dir: 'desc' };
    return defaultSort(); // était desc ⇒ retour au tri par défaut
  });
}

/** Réinitialise le tri d'une liste (utilisé par « Réinitialiser » — FR-018). */
export function resetSort(list: ListName): void {
  sortStore(list).set(defaultSort());
}
