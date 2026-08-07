<!-- SPECKIT START -->
## Feature active : 017-config-defaults

- **Plan** : `specs/017-config-defaults/plan.md` (contexte technique, Constitution Check 9/10 PASS + 1 action Principe IX, structure)
- **Spec** : `specs/017-config-defaults/spec.md` (3 user stories P1→P3, 10 FR, 0 clarification — ambiguïtés levées par la directive auteur)
- **Recherche / décisions** : `specs/017-config-defaults/research.md` (R1 source unique `src/core/default/` JSON+TS ; R2 catalogue **verbatim** — ids non régénérables ; R3 seed forcée `'0'` ; R4 clones `structuredClone` ; R5 **tout** le fichier, aucun tri ; R6 réalignement tests ; R7 doc §IX + bump v1 après validation)
- **Modèle de données** : `specs/017-config-defaults/data-model.md` (source `defaultConfig.json`+`.ts` ; `DEFAULT_CATALOG/ESPECES/PARAMETERS` clonés ; invariants INV-DM1→7)
- **Contrats** : `specs/017-config-defaults/contracts/core-contract.md` (invariants INV-C1→C9 ; API publique inchangée)
- **Quickstart** : `specs/017-config-defaults/quickstart.md` (test `default-config.test.ts` deep-equal config + réalignements gaussian/especes/catalog/state + checklist manuelle)
- **Périmètre** : **dernière feature v0**, **cible v1.0.0** (bump **après** validation auteur), **cœur seul** (API `src/core/index.ts` inchangée).
  Faire de **tout** le fichier `rsrc/PowerGenerator_config_20260807-153421.json` (blocs `catalog`/`especes`/`parameters`,
  y compris valeurs identiques aux défauts actuels) les **valeurs par défaut**, **seed exclue** (forcée `'0'` ; UI garde
  `createSeed()`), servies depuis une **source unique** `src/core/default/`. Catalogue embarqué **verbatim** (ids
  non contigus car traits supprimés par l'utilisateur). `defaultCatalog`/`defaultEspece(s)`/`defaultParameters`
  deviennent de minces adaptateurs ; anciens `RAW`/littéraux **supprimés**.
  **CONTRAINTES : cœur `src/core` pur (aucune I/O, aucune dépendance runtime à `rsrc/`) ; aucune dépendance ajoutée ;
  `FORMAT_VERSION` inchangé (pas de migration) ; import de fichiers existants inchangé ; déterminisme préservé
  (sorties seed-fixe **changent** vs v0.15.x, attendu).**
- **Actions Constitution** : Principe IX → `rsrc/DescriptionProjet.md`/`.adoc`/`.pdf` (valeurs par défaut : repro/mortalité
  humain, gaussienne §9.4, défauts moteur, catalogue) à mettre à jour **avec autorisation auteur** **avant** le code, puis
  recompilation `.pdf`. Principe IV → source pure en `src/core/default`. Principe V → `default-config.test.ts` (deep-equal)
  + tests réalignés. **Aucune dépendance ; aucune migration.**
- Features livrées : 16 (`specs/016-revision-algo-pouvoir/`) révision algo §6.4.2 : 2 pouvoirs par feuille (P/M
  indépendantes), jeton `Kx` partagé (échec ⇒ seuls les pouvoirs le référençant tombent), 24 feuilles révisées,
  id pouvoir suffixé `#index` ; puis dédup §6.4.3 BUG-001 (libellé identique) + BUG-002 (position + traits affichés) ;
  fix graphique jauge P/M (contraste + bandes surcharge/barres cassées) — v0.15.0→v0.15.3 ;
  15 (`specs/015-esperance-vie-tris-filtres/`) espérance de vie & mort naturelle par espèce
  (`esperanceVie`/`mortNaturellePct`, défauts humain 60/10), âge suivi (`Personne.age`, gelé à la mort/repris à la
  résurrection), `resurrect`/`setImmortal` + boutons Ressusciter/Immortel, tris puissance/maîtrise, filtres né
  après/avant, spinner « avancer », `FORMAT_VERSION` 4→5 — v0.14.1 ;
  14 (`specs/014-corrections-jauges-listes/`) lot corrections UI : composant `Gauge.svelte`
  partagé + `gaugeState()` (états rompu/normal/surchargé, tokens), jauges en fiche mobile+desktop, date complète
  Population mobile, ligne Sandbox alignée + « ⋯ », bulle « Avancer » extensible — v0.13.2 ; puis fix §7.2 arrondi
  P/M (départage .5 aléatoire seedé, équiprobabilité 0/11) — v0.13.3→v0.13.4 ;
  13 (`specs/013-refonte-ui-mobile/`) refonte UI mobile (direction 1a) sous `@media (max-width:760px)` :
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
