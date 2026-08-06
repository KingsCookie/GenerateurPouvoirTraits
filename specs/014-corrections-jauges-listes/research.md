# Research & Décisions — Feature 014 (corrections UI)

Aucune inconnue « NEEDS CLARIFICATION » à l'issue de `/speckit-clarify`. Décisions de conception :

## R1 — Composant de jauge partagé + fonction d'état pure

- **Décision** : créer `src/ui/components/Gauge.svelte` (props `label`, `value`, `max = 10`) et une
  fonction pure `gaugeState(value, max): 'broken' | 'normal' | 'overloaded'` dans
  `src/ui/lib/gauge.ts`. Le composant applique une **classe** (`gauge--broken` / `gauge--overloaded`)
  selon l'état, jamais du style inline conditionnel (testabilité — FR-005).
- **Rationale** : un seul rendu partagé mobile+desktop (le document de référence §9 précise que le
  desktop hérite du même composant, sans variante). La fonction pure permet le test unitaire exigé
  (FR-008) sans DOM.
- **Placement `src/ui/lib` et non `src/core`** : c'est une règle de **présentation** (dérivée de la
  valeur affichée), pas du domaine. `src/core` reste intact (Principe IV). Le squelette Svelte du
  document de référence (§7) sert de base.
- **Alternatives écartées** : (a) garder deux implémentations séparées mobile/desktop → duplication,
  risque de dérive ; (b) mettre la fonction dans `src/core` → violerait l'isolation (aucune raison
  métier).

## R2 — Mapping des couleurs sur les tokens existants (aucun token global nouveau)

- **Décision** : remapper les repères du document de référence sur les tokens de `src/app.css` :
  | Repère (référence) | Token projet |
  |---|---|
  | rail `--gauge-track` | `color-mix(in srgb, var(--fg) 8%, var(--bg-elev))` (piste discrète, déjà le style des barres actuelles) |
  | remplissage `fill-from → fill-to` | dégradé `var(--accent)` → `var(--accent-text)` |
  | bandes `--gauge-band` | `color-mix(in srgb, #fff 30%, transparent)` (calque lumineux neutre) |
  | onde | `color-mix(in srgb, #fff 55%, transparent)` |
  | halo surcharge | `var(--year-shadow)` (déjà l'effet de halo accent du projet) |
  | valeur `broken` | `var(--danger)` |
  | valeur `overloaded` | `var(--accent-text)` |
  | tronçons `broken` (fond/bordure) | `var(--bg)` / `var(--border)` |
- **Rationale** : le dégradé basé sur `--accent`/`--accent-text` **suit automatiquement les 6
  palettes × 2 modes** (FR-020) ; les repères ambre du document sont propres à sa maquette, on ne les
  reprend pas en dur. Les blancs translucides des bandes/onde sont neutres et lisibles sur toutes les
  palettes.
- **Variables de vitesse** (`--gauge-band-speed 0.44s`, `--gauge-wave-speed 3.4s`) : définies
  **locales au composant** (valeurs de timing, pas des couleurs), autorisé car ce ne sont pas des
  tokens de thème.
- **Alternatives écartées** : introduire de nouveaux tokens globaux `--gauge-*` dans `app.css` →
  refusé (le document §9 dit « aucun nouveau token de couleur global » ; YAGNI).

## R3 — État `broken` statique, hauteur de ligne stable

- **Décision** : `broken` = rail masqué + 2 tronçons en position absolue dans un conteneur de hauteur
  **fixe** (≈ 30 px = 22 px rail + 8 px débattement), **sans animation**. Le conteneur de la jauge
  réserve toujours la même hauteur quels que soient les 3 états (FR-006/SC-003).
- **Rationale** : lisibilité en liste longue, coût CPU nul, pas de saut de mise en page. Conforme au
  document §4.
- **Alternatives écartées** : animer la cassure → inutile, coûteux, distrayant.

## R4 — Confinement de l'animation `overloaded` (rien ne sort du rail)

- **Décision** : rail en `overflow: hidden` ; calque de bandes élargi (`left:-40px; right:-40px`) +
  `mask-image` qui efface les bandes sur les 20 % finaux ; onde traversante bornée. Deux effets du
  document **explicitement écartés** (glitch/aberration chromatique et flash de l'extrémité droite)
  → non implémentés (extrémité droite d'un seul tenant).
- **Rationale** : garantit SC-002 (aucune bande au-delà du bord droit à aucune frame) et le critère
  « extrémité continue » (§8 point 7 bis). `prefers-reduced-motion` coupe les 2 animations (FR-007).
- **Alternatives écartées** : largeur de remplissage proportionnelle au dépassement → interdit
  (FR-003, toujours 100 %).

## R5 — Dates de liste : réutiliser le champ existant

- **Décision** : Population mobile affiche `row.dateNaissance` (déjà la **date complète**, tel
  qu'utilisé dans la table desktop et la fiche) au lieu de `yearOf(row.dateNaissance)`. Aucun nouveau
  format, aucune fonction de formatage ajoutée.
- **Rationale** : le view-model `buildListRow` fournit déjà `dateNaissance` complet ; la table
  desktop l'affiche déjà ainsi → cohérence garantie (SC-005) au moindre coût.
- **Sandbox** : réutiliser le **même view-model / format de ligne** que Population (nom, date
  complète, âge, espèce, génération, puces `P/M`) et n'ajouter que le bouton « ⋯ ». Le tap sur le
  corps ne navigue pas (clarification 2026-08-06, option A) : contrairement à Population, la ligne
  Sandbox n'est **pas** un bouton d'ouverture de fiche ; seul « ⋯ » agit. Le mode reproduction garde
  cases à cocher + marquage `INV-M13`.
- **Alternatives écartées** : créer une fiche lecture seule pour la Sandbox (option C de la
  clarification) → hors périmètre, plus de travail, non demandé.

## R6 — Bulle de saisie extensible sans casse de mise en page

- **Décision** : la largeur du champ « Avancer » (mobile) est fonction de la **longueur de la
  valeur** — `width: clamp(<min ~2 ch>, calc(<n chiffres>ch + padding), <max>)`, réalisée par liaison
  réactive sur `String(years).length` (borne basse 2, borne haute calculée pour que « an XXX », `−`,
  champ, `+`, « Avancer » tiennent sur une ligne). La barre reste en `flex-wrap: nowrap` ; au-delà du
  max le champ cesse de grandir (FR-016/FR-017).
- **Rationale** : approche CSS/réactif simple, sans mesure DOM impérative ; respecte
  `flex-wrap: nowrap` déjà en place sur `.time-bar.mobile` et évite tout débordement horizontal.
- **Champs concernés** : la bulle « Avancer » est le cas explicite ; tout champ numérique compact
  mobile présentant la même troncature (~2 caractères) peut adopter la même règle, sans changer la
  mise en page. Desktop inchangé (FR-018).
- **Alternatives écartées** : mesurer la largeur du texte en JS (canvas/mesure) → complexité inutile
  (YAGNI) ; laisser le champ fixe et rogner → c'est précisément le bug à corriger.
