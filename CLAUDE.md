<!-- SPECKIT START -->
## Feature active : 013-refonte-ui-mobile

- **Plan** : `specs/013-refonte-ui-mobile/plan.md` (contexte technique, Constitution Check, structure)
- **Spec** : `specs/013-refonte-ui-mobile/spec.md` (6 user stories, clarifications 2026-07-30)
- **Recherche / décisions** : `specs/013-refonte-ui-mobile/research.md` (R1→R12 : seuil 760, feuilles, filtres, barres)
- **Modèle de données** : `specs/013-refonte-ui-mobile/data-model.md` (états UI locaux non persistés ; aucune entité)
- **Contrats** : `specs/013-refonte-ui-mobile/contracts/ui-contract.md` (contrat par écran, invariants INV-M1→14)
- **Handoff** : `design_handoff_refonte_mobile_1a/README.md` (maquette hifi, direction **1a** validée ; 1b archivée)
- **Périmètre** : refonte UI **mobile uniquement**, **cible v0.13.0**. Tout sous `@media (max-width: 760px)`
  (seuil unique retenu en clarification, override du handoff qui disait 640 ; harmonise app.css 640, ListeView 640,
  FicheView 720, StateIO 40rem → 760). Recrée les 5 écrans du handoff : chrome 2 rangées (icônes export/import +
  toggle thème), Population en **lignes** (≥ 8 visibles, **pas de « ⋯ »**, tap = fiche), panneau **Filtres & tri**
  plein écran (Pop.+Sandbox, `.filters` non rendu <760), Fiche **identité d'abord** (arbre = entrée, barres de
  mesure P/M avec cas **hors-barème >10**), Paramètres en **cartes à lignes** (sous-page Apparence, éditeurs plein
  écran), Sandbox en **lignes** (plus de table, lentille curseur, actions via « ⋯ »). Feuilles = patron
  `SandboxPersonForm`. **CONTRAINTES ABSOLUES : desktop ≥760 inchangé (FR-002/SC-004) ; thèmes préservés, tokens
  seule source, aucune valeur en dur (FR-003/FR-004/SC-005) ; `src/core` intact (FR-005).**
- **Actions Constitution** : Principe IX → **aucune** maj doc (agencement responsive non prescrit). Principe IV →
  **zéro modif `src/core`**. Principe VI → états UI locaux **non persistés**, aucun format touché. **Aucune
  dépendance ajoutée** ; déterminisme préservé ; validation par **checklist manuelle** responsive (`npm run test`
  + `npm run lint` restent verts).
- Features livrées : 12 (`specs/012-reorganisation-parametres-ui/`) refonte page Paramètres : 2 onglets
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
