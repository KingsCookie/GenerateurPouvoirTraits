# Phase 0 — Recherche & décisions : Réorganisation de la page Paramètres

Aucune inconnue « NEEDS CLARIFICATION » ne subsiste (spec clarifiée). Cette phase consigne les
décisions techniques structurantes, toutes fondées sur des patrons **déjà présents** dans le code.

## R1 — Mécanisme d'onglets

- **Décision** : réutiliser le patron d'onglets de `SandboxView.svelte` (`role="tablist"` + boutons
  `role="tab"` avec `aria-selected`, un store qui pilote le panneau affiché via `{#if}`).
- **Rationale** : cohérence visuelle et d'accessibilité avec l'existant (onglets « Population » /
  « Couples & cycle de vie ») ; aucun composant tiers ; Principe VIII.
- **Alternatives rejetées** :
  - *Accordéon replié* (`<details>`) : recrée une page longue au dépliage ; motif absent ailleurs
    dans l'app.
  - *Sous-routes / pages distinctes* : surdimensionné pour deux groupes ; complexifie la navigation
    et le bouton « Générer » partagé.

## R2 — Persistance de l'onglet actif

- **Décision** : nouveau store `paramsTab: Writable<'principaux' | 'avances'>` dans `ui.ts`,
  initialisé via `readChoice(LS_PARAMSTAB, PARAMS_TABS, 'principaux')` et persisté par `subscribe`
  → `lsSet` (même mécanisme que `mode`/`palette`/`style`).
- **Rationale** : FR-014 exige la restauration au rechargement ; `readChoice` garantit le repli sur
  « principaux » si la valeur stockée est absente/invalide (edge case stockage vidé). C'est un état
  d'**interface**, donc `localStorage` et **jamais** l'export/import (Principe VI).
- **Note** : `sbTab` (Sandbox) est volontairement *non* persisté (session) ; ici la spec demande la
  persistance, d'où l'usage du patron « thème » plutôt que du patron `sbTab`.
- **Alternatives rejetées** : mettre `paramsTab` dans l'état applicatif exporté — violerait le
  Principe VI (l'UI ne fait pas partie de l'état partagé).

## R3 — Enveloppe modale des éditeurs

- **Décision** : deux fins composants `CatalogueModal.svelte` et `EspecesModal.svelte` reproduisant
  le patron de `SandboxPersonForm.svelte` : overlay `fixed` + backdrop cliquable, fermeture par
  `Escape` (handler `onKeydown`), bouton « Fermer », `prop onClose`. Chaque wrapper rend l'éditeur
  existant dans son corps.
- **Bugfix BUG-001 (2026-07-29)** : les éditeurs ne sont plus rendus strictement « inchangés » —
  `TraitCatalogEditor` reçoit un **sélecteur de type** (n'affiche qu'un type à la fois ; défaut
  **Action** ; options triées **alphabétiquement** par libellé) et `SpeciesEditor` sélectionne
  **« humain »** par défaut. Aucune fonction perdue (FR-010). L'ordre `TRAIT_TYPES`
  (`src/core/model/traitType.ts`) reste **inchangé** : le tri alphabétique est un simple ordre
  d'affichage dérivé dans l'UI, sans incidence sur la sérialisation déterministe.
- **Rationale** : FR-010/FR-011 exigent l'intégralité des fonctions et une fermeture cohérente avec
  l'édition de personne en sandbox ; envelopper (au lieu de réécrire) garantit « aucune fonction
  perdue » et un diff minimal.
- **Alternatives rejetées** :
  - Extraire un composant `Modal` générique réutilisé partout (y compris `SandboxPersonForm`) :
    refactor plus large que le périmètre ; YAGNI. Un `Modal` générique pourra être factorisé
    ultérieurement si un 4ᵉ usage apparaît.
  - `<dialog>` natif : support et stylage hétérogènes selon les thèmes ; le patron maison est déjà
    éprouvé dans l'app.

## R4 — État d'ouverture des modales

- **Décision** : état **local de session** dans `ParametresView` (deux booléens
  `showCatalogue` / `showEspeces`), non persisté.
- **Rationale** : une modale ré-ouverte doit repartir fermée ; aucune raison de mémoriser son
  ouverture entre visites (contrairement à l'onglet). Simplicité.

## R5 — Bouton « Générer la population » persistant

- **Décision** : conserver le bouton dans une zone **hors** des deux panneaux `{#if}` (barre
  d'action de la page), visible quel que soit l'onglet (FR-007b, US1 AS-5).
- **Rationale** : lancer une génération ne doit jamais exiger de revenir sur un onglet précis ;
  aujourd'hui le bouton vit dans la nav latérale — on le remonte en élément d'action de page.
- **Alternatives rejetées** : dupliquer le bouton dans chaque panneau (source d'incohérence
  visuelle et de code redondant).

## R6 — Migration de la case « Autoriser la consanguinité »

- **Décision** : déplacer la case dans `EspecesModal`, en tête de l'éditeur d'espèces (clarification).
- **Rationale** : réglage de reproduction, thématiquement lié aux espèces ; libère la page.
- **Impact** : `setParam('consanguinityAllowed', …)` reste identique ; seul l'emplacement de rendu
  change. Aucun changement de comportement.

## R7 — Répartition des paramètres entre onglets (clarifié)

- **Onglet « Principaux »** : paramètres graphiques (`ThemeControls`), graine (+ régénérer),
  nombre d'individus (`batchSize`), année de naissance (`birthYear`), chance de pouvoir
  (`powerChancePct`).
- **Onglet « Avancés »** : résilience initiale, constante `D` (`duplicationD`), constante `K`
  (`generationK`), tout le bloc « Hérédité & naissance » (résilience max, bonus, malus, seuil de
  disparition, taux mutation forte, taux sans pouvoir, mutation faible gain/perte, statB, statC,
  statA en lecture seule, case « malus génome »), pondérations de gabarits (AE/PE/PA/PR),
  `ResilienceOverrides` (global → type → trait).
- **Modales** *(accès dans l'onglet Avancés — Bugfix BUG-001)* : `TraitCatalogEditor` (catalogues +
  poids type/trait + résilience par trait, avec sélecteur de type) ; `SpeciesEditor` (défaut humain)
  + case consanguinité.
- **Rationale** : conforme à la clarification ; SC-002 (recensement exhaustif) couvert par le
  quickstart.

## R8 — Tests

- **Décision** : un test unitaire pur `tests/unit/params-tab-store.test.ts` vérifiant que la lecture
  du choix d'onglet renvoie le défaut « principaux » quand `localStorage` est vide et rejette une
  valeur invalide ; le reste de la validation est **manuel** (checklist quickstart), la feature étant
  de nature UI/présentation.
- **Rationale** : Principe V vise le **cœur** (inchangé ici) ; on ajoute néanmoins la seule unité
  pure testable introduite. Pas de dépendance de test DOM ajoutée (Principe VIII).

## R9 — Doc (Principe IX)

- **Décision** : **aucune** modification de `rsrc/DescriptionProjet.md`.
- **Rationale** : le document ne prescrit pas l'agencement visuel de la page Paramètres (§8.4 =
  « affiche notamment la seed… et les courbes » — toujours vrai ; §9 = liste des paramètres, non
  leur disposition). La refonte ne change aucun comportement fonctionnel ⇒ pas de divergence, donc
  pas d'autorisation auteur ni de régénération `.adoc`/`.pdf` requises.

## R10 — Version

- **Décision** : bump `package.json` 0.11.1 → **0.12.0** (feature mineure, sans rupture), puis
  **0.12.0 → 0.12.1** au correctif BUG-001 (patch UI).
- **Rationale** : nouvelle fonctionnalité UI additive ; cohérent avec le versionnage feature→mineure
  pré-1.0 du projet. `__APP_VERSION__` s'affiche au pied de page.
