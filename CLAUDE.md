<!-- SPECKIT START -->
## Feature active : 015-esperance-vie-tris-filtres

- **Plan** : `specs/015-esperance-vie-tris-filtres/plan.md` (contexte technique, Constitution Check 10/10 PASS, structure)
- **Spec** : `specs/015-esperance-vie-tris-filtres/spec.md` (5 user stories P1→P5, 5 clarifications 2026-08-06)
- **Recherche / décisions** : `specs/015-esperance-vie-tris-filtres/research.md` (R1→R9 : âge stocké, params espèce, ordre du tick, déterminisme mort, migration v5, tris P/M, filtres année, yield spinner, composant Spinner)
- **Modèle de données** : `specs/015-esperance-vie-tris-filtres/data-model.md` (Espèce +`esperanceVie`/`mortNaturellePct` ; Personne +`age` suivi/+`immortel` ; SortKey/FilterCriteria étendus ; `advancing`)
- **Contrats** : `specs/015-esperance-vie-tris-filtres/contracts/ui-contract.md` (invariants INV-D/A/R/S/F/L/P/PE)
- **Quickstart** : `specs/015-esperance-vie-tris-filtres/quickstart.md` (tests + checklist manuelle mobile+desktop)
- **Périmètre** : nouvelle capacité, **cible v0.14.0**. **Cœur + UI**. (1) **Mort naturelle par espèce** :
  `esperanceVie`+`mortNaturellePct` (défauts humain **60/10**) ; nouvelle étape de `tick` (vieillissement explicite
  puis mort naturelle **en dernier**, tirage seedé pour les seuls éligibles vivant/non-immortel/âge≥espérance ;
  cause « mort naturelle »). (2) **Âge = compteur stocké** (`Personne.age`) +1/an, **gelé à la mort**, repris tel
  quel à la résurrection ; **génération dérivée de la date de naissance (invariante)**. (3) **Fiche** : `immortel`
  (défaut faux) + fonctions cœur `resurrect`/`setImmortal` ; boutons **Ressusciter** + case **Immortel** (mobile ET
  desktop). (4) **Tris puissance & maîtrise** (`SortKey`+`sortPopulation` : pouvoir le plus extrême, **sans-pouvoir
  en fin**). (5) **Filtres né après X / né avant Y** (bornes **inclusives**, **désactivent** le filtre génération).
  (6) **Spinner** « avancer » (flèche circulaire, l'UI **cède une frame** avant le calcul synchrone).
  **CONTRAINTES : logique domaine en `src/core` pur (RNG en paramètre) ; UI = présentation seule ; `FORMAT_VERSION`
  4→5 + migrations (immortel=faux, age recomposé, champs espèce par défaut) ; tokens seule source ; parité
  mobile/desktop (seuil 760) ; `prefers-reduced-motion` coupe la rotation du spinner ; déterminisme préservé.**
- **Actions Constitution** : Principe IX → `rsrc/DescriptionProjet.md`/`.adoc` **déjà mis à jour avec autorisation
  de l'auteur** (§3.3, §6.5–6.7, §8.1–8.4, §9.4). Principe IV → mort/âge/résurrection/immortalité/tris/filtres en
  `src/core` (purs). Principe V → tests Vitest seed-fixe (tick, death, sort, filter, state). Principe VI →
  versionnage + migrations. **Aucune dépendance ajoutée**.
- Features livrées : 14 (`specs/014-corrections-jauges-listes/`) lot corrections UI : composant `Gauge.svelte`
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
