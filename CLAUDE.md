<!-- SPECKIT START -->
## Feature active : 014-corrections-jauges-listes

- **Plan** : `specs/014-corrections-jauges-listes/plan.md` (contexte technique, Constitution Check, structure)
- **Spec** : `specs/014-corrections-jauges-listes/spec.md` (4 user stories P1→P4, clarification 2026-08-06)
- **Recherche / décisions** : `specs/014-corrections-jauges-listes/research.md` (R1→R6 : composant Gauge, mapping tokens, animations bornées, dates, bulle extensible)
- **Modèle de données** : `specs/014-corrections-jauges-listes/data-model.md` (état de présentation `GaugeState` dérivé, non persisté ; aucune entité)
- **Contrats** : `specs/014-corrections-jauges-listes/contracts/ui-contract.md` (invariants INV-J1→19)
- **Référence design** : `rsrc/jauges-etats-extremes.md` (règles d'état rompu/normal/surchargé, CSS repère à remapper)
- **Périmètre** : lot de **corrections UI**, **cible v0.13.2** (seul le dernier chiffre change). UI uniquement
  (`src/ui`). (1) **Composant `Gauge.svelte` partagé** + fonction pure `gaugeState()` dans `src/ui/lib` (testée
  Vitest, bornes -1/0/10/11) : 3 états `rompu`(v<0)/`normal`(0≤v≤10)/`surchargé`(v>10), couleurs **remappées sur
  tokens** (dégradé accent→accent-text, halo `--year-shadow`, danger). (2) **Fiche mobile ET desktop** utilise
  `<Gauge>` (remplace barres mobiles + texte P/M desktop). (3) **Population mobile** : date de naissance
  **complète** (`row.dateNaissance`, pas `yearOf`). (4) **Sandbox mobile** : ligne alignée sur Population + puces
  P/M + bouton « ⋯ » ; **tap corps = aucune navigation** (clarif. option A). (5) **Bulle « Avancer »** extensible
  (largeur = f(longueur), max borné pour garder la barre sur une ligne). **CONTRAINTES : `src/core` intact ;
  tokens seule source, aucune valeur en dur ; desktop ≥760 inchangé SAUF ajout volontaire des jauges dans la
  fiche (FR-009/SC-008) ; animations coupées par `prefers-reduced-motion` ; état `surchargé` ne déborde jamais du
  rail.**
- **Actions Constitution** : Principe IV → fonction d'état en `src/ui/lib` (présentation), **zéro modif `src/core`**.
  Principe IX → §7.2 (P/M) **inchangé**, seul l'affichage change ; `rsrc/DescriptionProjet.md` non modifié.
  Principe VI → aucun format/persistance touché. **Aucune dépendance ajoutée** ; déterminisme préservé ;
  validation par **checklist manuelle** (`npm run test` + `npm run lint` verts, + test unitaire `gauge`).
- Features livrées : 13 (`specs/013-refonte-ui-mobile/`) refonte UI mobile (direction 1a) sous `@media (max-width:760px)` :
  chrome 2 rangées, Population/Sandbox en **lignes**, panneau Filtres plein écran, Fiche **identité d'abord** +
  barres P/M hors-barème, Paramètres **cartes à lignes**, `MobileSheet` réutilisable, seuil unique 760 ; + fix
  BUG-001 (débordement section Résilience en mobile) — v0.13.1 ;
  12 (`specs/012-reorganisation-parametres-ui/`) refonte page Paramètres : 2 onglets
  Principaux/Avancés (store `paramsTab` persisté), éditeurs catalogues/espèces en modales, sélecteurs de type
  (défaut Action, alphabétique) et d'espèce (défaut humain), section éditeurs en Avancés (BUG-001) — v0.12.1 ;
  11 (`specs/011-corrections-bugs-ui/`) lot de 10 corrections (consanguinité lignée directe,
  date partagée de portée, génération 0 relative à la genèse + `genesisYear` + `FORMAT_VERSION` 3→4, étiquettes
  P/M sans « : », filtres à la ligne, export `PowerGenerator_`, aperçu pouvoir temps réel, duplication
  `min(100, résilience·D)` D défaut 0.25, bouton « Régénérer » sandbox, P/M non bornées en saisie) + fix
  libellé « Ajout seul » → « {aj} sur {Kp} » (v0.11.1) ;
  10 (`specs/010-tri-filtres-etiquettes/`) filtres de présence de trait (4 options
  mono-sélection) + tri par clic sur en-tête (Nom/Date/Âge) + étiquettes P/M enrichies ;
  9 (`specs/009-ajout-4-styles/`) +4 styles (Éditorial/Terminal/Néo-brutaliste/Organique)
  + 3 palettes (ambre/rose/bleu), 72 combinaisons, 6 polices OFL précachées ;
  8 (`specs/008-refonte-ui/`) refonte UI 5 vues + chrome, système de thème 3 axes
  (`data-mode`/`data-palette`/`data-style` en `localStorage`), polices auto-hébergées woff2 précachées,
  pied de page version, bouton remonter, pagination (défaut 50), onglets sandbox, lentille, Fiche enrichie
  (enfants + type de trait), correctif BUG-001 (état actif visible en style A) ;
  7 (`specs/007-sandbox-make-it-real/`) sandbox isolée & make it real (transfert RNG),
  reproduction manuelle déplacée en sandbox, création/clonage/édition directe + cycle de vie conjugal,
  suppression avec propagation, reconstruction historique via journal d'événements daté (`FORMAT_VERSION` 3) ;
  6 (`specs/006-persistance-compl-partage/`) persistance 3 types (config/data/full),
  détection auto à l'import, fusion pure non destructive, versionnage + rétro-compat ;
  1 (`specs/001-fondations-genese/`) seed/RNG, modèle, genèse, liste/fiche, export/import ;
  2 (`specs/002-reproduction-heredite/`) moteur génétique (hérédité §4, traits→pouvoirs §6.4, P/M §7.2, reproduction) ;
  3 (`specs/003-avancement-temps-population/`) tick annuel §6.6, vieillissement, mort, conjoints, état RNG sérialisé ;
  4 (`specs/004-genealogie-exploration/`) arbre généalogique (fiche prof. 2 + page dédiée N réglable), filtres/recherche,
  3 modes d'affichage des traits, rendu SVG des liens (BUG-001→007) ;
  5 (`specs/005-parametrage-catalogues/`) catalogues éditables, reproduction/courbe SVG, pondérations (héritage
  type→trait), résilience 3 niveaux (global→type→trait), tirage tolérant `pickWeightedOrNull` (type à 0 ⇒ pouvoir null).
  Défauts humain : gaussienne 18/25/50 pic 40 %, groupe 2, portée M1/N4/X15 %, consanguinité interdite.

### Stack
TypeScript 5.x · Vite · Svelte · Vitest · vite-plugin-pwa. App **100 % statique** (PWA), déployée sur
**GitHub Pages**. Aucun backend.

### Règles non négociables (constitution `.specify/memory/constitution.md`)
- Déterminisme : **une seule seed** ; aucun `Math.random`/horloge/UUID aléatoire dans `src/core`.
- Cœur **pur** `src/core` (sans Svelte/DOM/navigateur) ↔ UI `src/ui` ; l'UI consomme le cœur.
- Tests **Vitest à seed fixe** sur le cœur.
- Persistance **uniquement** par export/import de fichier (pas d'auto-save).
- **Anonymat** : identité `KingsCookie`, aucun nom/email perso dans le code, `package.json` ou les commits.

### Commandes
`npm run dev` · `npm run test` · `npm run build` · `npm run preview`
<!-- SPECKIT END -->
