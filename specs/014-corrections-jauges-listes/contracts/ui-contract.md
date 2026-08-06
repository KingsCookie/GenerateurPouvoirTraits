# Contrat UI — Feature 014 (corrections UI)

Contrat par composant/écran et invariants vérifiables. Seuil mobile = **760 px** (feature 013).

## Invariants transverses

- **INV-J1** — `src/core`, le modèle et les formats d'export/import sont **intacts** ; aucune source
  d'aléatoire/horloge ajoutée (FR-019).
- **INV-J2** — Couleurs/polices/rayons/graisses **uniquement** via tokens `src/app.css` ; aucune
  valeur en dur ; rendu correct pour les 6 styles × 6 palettes × 2 modes (FR-020).
- **INV-J3** — Desktop ≥ 760 px **inchangé**, à l'unique exception **voulue** des jauges P/M dans les
  cartes de pouvoir de la fiche (FR-009/SC-008).
- **INV-J4** — Version applicative **v0.13.2** après build (FR-021/SC-009).

## 1. Composant `Gauge.svelte` (nouveau) + `src/ui/lib/gauge.ts`

- Props : `label: string`, `value: number`, `max = 10`. Rendu = en-tête (label + valeur) puis rail.
- **INV-J5** — l'état vient de `gaugeState(value, max)` (pur) et est porté par une **classe**
  (`gauge--broken` / `gauge--overloaded` / [normal implicite]) ; **pas** de style inline conditionnel
  (FR-005). Fonction pure testée aux bornes `-1, 0, 10, 11` (FR-008).
- **INV-J6** — `normal` (`0≤v≤10`) : rendu actuel (remplissage `v/max`), **aucune** animation ajoutée.
- **INV-J7** — `overloaded` (`v>10`) : remplissage **100 %** + bandes animées + onde ; rail
  `overflow:hidden`, calque de bandes masqué sur les 20 % finaux → **aucune bande hors du rail à
  aucune frame** (SC-002) ; extrémité droite **continue** (pas de segment terminal, pas de flash) ;
  effets glitch/aberration **non implémentés**.
- **INV-J8** — `broken` (`v<0`) : rail rompu en 2 tronçons, **aucun** remplissage, **aucune**
  animation.
- **INV-J9** — la **valeur numérique réelle** est toujours affichée sans clamp (`17`, `-3`) ; couleur
  `var(--danger)` en `broken`, `var(--accent-text)` en `overloaded` ; `role="meter"` avec
  `aria-valuenow` réel + `aria-valuemin`/`aria-valuemax` + `aria-label` explicite (FR-004/FR-005).
- **INV-J10** — hauteur du composant **identique** dans les 3 états (SC-003) ; sous
  `prefers-reduced-motion: reduce`, **aucune** animation (FR-007/SC-004).

## 2. Fiche (`FicheView.svelte`) — mobile ET desktop

- **INV-J11** — les cartes de pouvoir utilisent `<Gauge>` pour Puissance et Maîtrise, **à
  l'identique** sur mobile et desktop : la version desktop **remplace** le texte
  « Puissance : X / 10 / Maîtrise : X / 10 » par les jauges (FR-001/FR-009).
- **INV-J12** — l'ancien rendu de barre mobile ad hoc (`.meter-row` / `.fill.over` / `.cap`) est
  remplacé par `<Gauge>` (source unique).

## 3. Liste Population (`ListeView.svelte`) — mobile

- **INV-J13** — sous 760 px, la méta de ligne affiche la **date de naissance complète**
  (`row.dateNaissance`), plus l'année seule ; format identique à la fiche (FR-010/SC-005).
- **INV-J14** — desktop (≥ 760 px) **inchangé** (la table affiche déjà la date complète) (FR-011).

## 4. Liste Sandbox (`SandboxView.svelte`) — mobile

- **INV-J15** — sous 760 px, la ligne (hors reproduction) présente **les mêmes champs et la même
  disposition** que Population (nom + `†`, date complète, âge, espèce, génération, puces `P/M`)
  **plus** un bouton « ⋯ » ouvrant la feuille d'actions existante (Éditer/Cloner/Régénérer/Supprimer)
  (FR-012/FR-013).
- **INV-J16** — tap sur le **corps** de la ligne (hors « ⋯ ») = **aucune navigation** ; seul « ⋯ »
  agit (clarif. 2026-08-06, option A ; FR-014).
- **INV-J17** — le **mode reproduction manuelle** conserve cases à cocher + marquage de sélection
  (mix accent 24 % + liseré) inchangés ; desktop Sandbox **inchangé** (FR-014/FR-015).

## 5. Barre de temps (`TimeBar.svelte`) — mobile

- **INV-J18** — sous 760 px, le champ « Avancer » **grandit** avec la longueur de la valeur, borne
  basse ≥ 2 caractères, borne haute telle que « an XXX », `−`, champ, `+`, « Avancer » restent **sur
  une seule ligne** (`flex-wrap: nowrap`) ; au-delà, le champ cesse de grandir, **aucun** débordement
  horizontal (FR-016/FR-017/SC-007).
- **INV-J19** — desktop (≥ 760 px) **inchangé** (FR-018).
