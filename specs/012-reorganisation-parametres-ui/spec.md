# Feature Specification: Réorganisation de la page Paramètres (onglets Principaux / Avancés + éditeurs en modale)

**Feature Branch**: `012-reorganisation-parametres-ui`

**Created**: 2026-07-29

**Status**: Draft

**Input**: User description: "Refonte UI de la page Paramètres : réorganiser les réglages existants en « paramètres principaux » (visibles d'emblée) et « paramètres avancés » (repliés), et déplacer les éditeurs de catalogues de traits et d'espèces dans des fenêtres popup/modales (comme l'édition de personne en sandbox). IMPÉRATIF : AUCUN paramètre existant ne doit être supprimé — tous restent accessibles, on ne fait que les réorganiser et les regrouper visuellement."

## Contexte

La page Paramètres présente aujourd'hui **8 sections** et une trentaine de contrôles affichés simultanément :

1. **Paramètres graphiques** — style, palette, mode clair/sombre (thème)
2. **Génération de pouvoir** — graine (seed), résilience initiale, constante de duplication D, constante de génération K
3. **Hérédité & naissance** — résilience max, bonus, malus, seuil de disparition, taux de mutation forte, taux sans pouvoir, mutation faible gain, mutation faible perte, statB, statC, statA (lecture seule), case « malus génome »
4. **Population** — nombre d'individus, année de naissance, chance de pouvoir
5. **Espèces & reproduction** — case « autoriser la consanguinité » + éditeur d'espèces (liste CRUD, genres, courbe de reproduction)
6. **Catalogues de traits** — éditeur de traits (liste CRUD, types, pondérations par type/trait, résilience par trait)
7. **Pondérations des gabarits** — poids AE / PE / PA / PR
8. **Résilience (global → type → trait)** — overrides déclinés

Cette densité nuit à la lisibilité pour un utilisateur occasionnel. L'objectif est de **hiérarchiser visuellement** ces réglages sans en retirer aucun.

## Clarifications

### Session 2026-07-29

- Q: Découpage exact des réglages « principaux » (visibles d'emblée) vs « avancés » (repliés) ? → A: Principaux = paramètres graphiques (thème) + graine (avec régénération) + nombre d'individus + année de naissance + chance de pouvoir ; tous les autres réglages (résilience initiale, constante D, constante K, hérédité & naissance complète, pondérations de gabarits, overrides de résilience) vont en avancés.
- Q: Emplacement de la case « Autoriser la consanguinité » ? → A: Dans la modale « Espèces & reproduction », en tête de l'éditeur.
- Q: Version cible de la feature ? → A: v0.12.0 (bump à l'implémentation).
- Q: Mécanisme d'affichage des groupes principaux / avancés ? → A: Un système d'**onglets dans la page** (« Principaux » / « Avancés »), sur le modèle des onglets de la Sandbox (« Population » / « Couples & cycle de vie ») ; un seul panneau visible à la fois, onglet « Principaux » actif par défaut. Le bouton « Générer la population » reste persistant hors des panneaux d'onglets.

**Bugfix**: 2026-07-29 — BUG-001 : section « Catalogues & espèces » déplacée vers l'onglet **Avancés** (FR-004, FR-008/FR-009) ; éditeur de catalogues doté d'un **sélecteur de type** (défaut **Action**, options alphabétiques, un seul type affiché — FR-008b) ; éditeur d'espèces avec espèce par défaut **« humain »** (FR-009b). Cible **v0.12.1**.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Voir d'abord l'essentiel, réglage fin dans un onglet séparé (Priority: P1)

En tant qu'utilisateur qui veut simplement lancer une simulation, j'arrive sur la page Paramètres et je ne vois d'emblée que les quelques réglages nécessaires pour générer une population (apparence, graine, effectif, année, chance de pouvoir), plus le bouton « Générer ». Les réglages de calibration génétique fine sont regroupés dans un **onglet « Paramètres avancés »** distinct de l'onglet « Principaux » (sur le modèle des onglets de la Sandbox), l'onglet « Principaux » étant actif par défaut.

**Why this priority**: C'est le cœur de la demande et la source principale de la surcharge visuelle. À lui seul, ce regroupement rend la page « user friendly » et constitue un MVP livrable.

**Independent Test**: Ouvrir la page Paramètres après un chargement propre : vérifier que l'onglet « Principaux » est actif et n'affiche que les réglages principaux (+ apparence + accès aux éditeurs), que le bouton « Générer » est présent, et qu'un clic sur l'onglet « Avancés » révèle l'intégralité des réglages fins — tous fonctionnels.

**Acceptance Scenarios**:

1. **Given** un premier affichage de la page Paramètres, **When** la page se charge, **Then** l'onglet « Principaux » est actif et aucun contrôle de l'onglet « Avancés » n'est visible tant que cet onglet n'est pas sélectionné.
2. **Given** l'onglet « Principaux » actif, **When** l'utilisateur sélectionne l'onglet « Avancés », **Then** le panneau bascule et affiche l'ensemble des réglages d'hérédité, de génération avancée, de pondérations de gabarits et de résilience, tous pleinement éditables.
3. **Given** un réglage avancé modifié puis retour à l'onglet « Principaux », **When** l'utilisateur génère une population, **Then** la valeur modifiée est bien prise en compte (le changement d'onglet est purement visuel, il ne réinitialise rien).
4. **Given** l'onglet « Principaux » actif, **When** l'utilisateur consulte le panneau, **Then** il y trouve au minimum : les paramètres graphiques, la graine (+ régénérer), le nombre d'individus, l'année de naissance, la chance de pouvoir, et le bouton « Générer la population ».
5. **Given** n'importe quel onglet actif, **When** l'utilisateur regarde la page, **Then** le bouton « Générer la population » reste visible et accessible (il est hors des panneaux d'onglets).

---

### User Story 2 - Éditer les catalogues et les espèces dans une fenêtre dédiée (Priority: P2)

En tant qu'utilisateur, j'accède aux éditeurs volumineux (catalogues de traits, espèces & reproduction) via des boutons qui ouvrent une **fenêtre modale** plein cadre — comme l'édition d'une personne en sandbox — au lieu de les avoir empilés dans la page. Je peux y faire toutes mes modifications puis fermer la fenêtre pour revenir à la page allégée.

**Why this priority**: Ces deux éditeurs sont les blocs les plus imposants et de nature différente (CRUD sur des listes) ; les sortir en modale allège fortement la page. Dépend visuellement de US1 mais reste testable seul.

**Independent Test**: Cliquer sur « Modifier les catalogues de traits… » : une modale s'ouvre avec l'éditeur complet ; effectuer une modification, fermer, rouvrir : la modification est conservée. Idem pour « Gérer les espèces… ».

**Acceptance Scenarios**:

1. **Given** la page Paramètres, **When** l'utilisateur clique sur le bouton d'accès aux catalogues de traits, **Then** une fenêtre modale s'ouvre contenant l'éditeur de catalogues complet (toutes ses fonctions : ajout/suppression/édition de traits, types, pondérations par type et par trait, résilience par trait).
2. **Given** la page Paramètres, **When** l'utilisateur clique sur le bouton d'accès aux espèces, **Then** une fenêtre modale s'ouvre contenant l'éditeur d'espèces complet (ajout/édition/suppression d'espèces, genres, paramètres de reproduction, courbe).
3. **Given** une modale d'éditeur ouverte, **When** l'utilisateur appuie sur Échap ou clique hors de la fenêtre ou sur « Fermer », **Then** la modale se ferme et les modifications faites sont conservées dans les paramètres.
4. **Given** une modification effectuée dans une modale d'éditeur puis la modale fermée, **When** l'utilisateur génère une population, **Then** la simulation utilise les catalogues / espèces modifiés.

---

### User Story 3 - Repères de navigation cohérents avec la nouvelle structure (Priority: P3)

En tant qu'utilisateur, les repères de navigation de la page reflètent la nouvelle organisation (deux onglets au lieu de huit sections détaillées) et l'onglet actif est mémorisé d'une visite à l'autre.

**Why this priority**: Amélioration de confort qui parachève la refonte sans être bloquante pour la valeur principale.

**Independent Test**: Sélectionner l'onglet « Avancés », recharger la page : l'onglet « Avancés » est retrouvé actif. La barre d'onglets remplace l'ancien sommaire à huit entrées.

**Acceptance Scenarios**:

1. **Given** les repères de navigation de la page, **When** la page est réorganisée, **Then** ils se réduisent à la barre d'onglets « Principaux » / « Avancés » (l'ancien sommaire latéral à huit entrées détaillées n'est plus nécessaire).
2. **Given** l'onglet « Avancés » actif, **When** l'utilisateur recharge la page, **Then** l'onglet « Avancés » est restauré comme onglet actif, l'état étant mémorisé localement.

---

### Edge Cases

- **Réglage avancé recherché depuis l'onglet Principaux** : tous les réglages avancés restent atteignables en sélectionnant l'onglet « Avancés » (aucun réglage ne doit rester inatteignable, quel que soit l'onglet actif).
- **Fenêtre modale et bouton « Générer »** : le bouton « Générer la population » doit rester accessible depuis n'importe quel onglet ; ouvrir une modale d'éditeur ne doit pas déclencher de génération.
- **Écran étroit (mobile)** : la mise en page à une colonne reste valide ; la barre d'onglets, les panneaux et les modales doivent fonctionner sans débordement horizontal.
- **Persistance de l'onglet actif vidée** (premier usage / stockage local effacé) : la page revient à son défaut (onglet « Principaux » actif) sans erreur.
- **Cohérence déterminisme** : la réorganisation est purement visuelle ; à graine et actions identiques, la population générée reste strictement identique à avant la refonte.

## Requirements *(mandatory)*

### Functional Requirements

**Préservation (impératif absolu)**

- **FR-001**: Le système DOIT conserver, accessibles et éditables, **tous** les paramètres existants de la page sans exception : graine, résilience initiale, constante de duplication D, constante de génération K, résilience maximale, bonus de résilience, malus de résilience, seuil de disparition, taux de mutation forte, taux de naissance sans pouvoir, mutation faible (gain), mutation faible (perte), statB, statC, statA (lecture seule), case « malus génome », nombre d'individus, année de naissance, chance de pouvoir, case « autoriser la consanguinité », pondérations de gabarits (AE, PE, PA, PR), éditeur de catalogues de traits (avec pondérations par type et par trait et résilience par trait), éditeur d'espèces & reproduction, et overrides de résilience (global → type → trait), ainsi que les paramètres graphiques (style, palette, mode).
- **FR-002**: Le système NE DOIT retirer, désactiver ni rendre inaccessible aucun réglage ni aucune fonction d'édition existants ; la refonte est strictement une réorganisation visuelle.
- **FR-003**: Le système DOIT préserver le comportement fonctionnel de chaque contrôle (même effet sur les paramètres et sur la génération qu'avant la refonte), y compris le champ statA en lecture seule calculé.

**Regroupement principaux / avancés (onglets)**

- **FR-004**: Le système DOIT présenter la page Paramètres sous forme de deux onglets — « Principaux » et « Avancés » — avec l'onglet « Principaux » actif par défaut. L'onglet « Principaux » DOIT contenir : les paramètres graphiques (style, palette, mode), la graine (avec régénération), le nombre d'individus, l'année de naissance et la chance de pouvoir. L'onglet « Avancés » DOIT contenir tous les autres réglages (résilience initiale, constante de duplication D, constante de génération K, l'ensemble « Hérédité & naissance », pondérations de gabarits, overrides de résilience) **ainsi que la section « Catalogues & espèces »** (boutons d'ouverture des modales — *Bugfix BUG-001*, initialement placée dans « Principaux »).
- **FR-005**: Le système DOIT n'afficher qu'un seul panneau d'onglet à la fois ; les contrôles de l'onglet inactif ne sont pas visibles tant que cet onglet n'est pas sélectionné.
- **FR-006**: Les utilisateurs DOIVENT pouvoir basculer librement entre les onglets « Principaux » et « Avancés » ; sélectionner un onglet révèle l'intégralité des réglages qu'il contient, tous éditables.
- **FR-007**: Le changement d'onglet NE DOIT modifier aucune valeur de paramètre (action purement d'affichage).
- **FR-007b**: Le bouton « Générer la population » DOIT rester visible et actif quel que soit l'onglet sélectionné (placé hors des panneaux d'onglets).

**Éditeurs en modale**

- **FR-008**: Le système DOIT fournir un point d'accès (bouton) ouvrant l'éditeur de catalogues de traits dans une fenêtre modale. Ce point d'accès DOIT se trouver dans l'onglet **« Avancés »** (section « Catalogues & espèces »).
- **FR-008b** *(Bugfix BUG-001)*: Dans l'éditeur de catalogues de traits, le système DOIT proposer un **sélecteur de type de trait** et n'afficher que les traits **du type sélectionné** (au lieu d'afficher tous les types simultanément). Le type affiché **par défaut** DOIT être **« Action »** ; les options du sélecteur DOIVENT être présentées en **ordre alphabétique** (par libellé). L'édition de chaque type (traits, poids de type/trait, propagation, résilience) reste intégralement disponible en sélectionnant le type concerné.
- **FR-009**: Le système DOIT fournir un point d'accès (bouton) ouvrant l'éditeur d'espèces & reproduction dans une fenêtre modale ; la case « Autoriser la consanguinité » DOIT figurer en tête de cet éditeur, à l'intérieur de la modale. Ce point d'accès DOIT se trouver dans l'onglet **« Avancés »** (section « Catalogues & espèces »).
- **FR-009b** *(Bugfix BUG-001)*: Dans l'éditeur d'espèces, l'espèce **sélectionnée par défaut** à l'ouverture DOIT être **« humain »** (si elle existe dans le catalogue d'espèces).
- **FR-010**: Les fenêtres modales d'édition DOIVENT offrir l'intégralité des fonctions des éditeurs correspondants (aucune fonction perdue par rapport à l'affichage en page).
- **FR-011**: Les fenêtres modales DOIVENT pouvoir se fermer par les moyens habituels de l'application (touche Échap, clic sur l'arrière-plan, bouton de fermeture), de façon cohérente avec l'édition de personne en sandbox.
- **FR-012**: Les modifications effectuées dans une fenêtre modale DOIVENT être conservées dans les paramètres après fermeture et prises en compte à la génération suivante.

**Navigation & mémorisation**

- **FR-013**: La navigation de la page DOIT refléter la nouvelle structure via la barre d'onglets « Principaux » / « Avancés » ; tout réglage reste atteignable en sélectionnant l'onglet correspondant (aucun réglage inatteignable). L'ancien sommaire latéral à huit entrées détaillées n'est plus requis.
- **FR-014**: Le système DOIT mémoriser localement l'onglet actif (« Principaux » ou « Avancés ») et le restaurer au rechargement de la page ; en l'absence d'état mémorisé, l'onglet « Principaux » est actif par défaut.

### Key Entities

*(Aucune nouvelle entité de données. La feature ne modifie ni le modèle de paramètres, ni le format de persistance, ni le cœur de simulation ; elle ne touche qu'à la présentation de réglages déjà existants.)*

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Au premier affichage de la page Paramètres (onglet « Principaux » actif), le nombre de contrôles visibles d'emblée est réduit d'au moins 60 % par rapport à la version actuelle (l'onglet « Avancés » et les deux éditeurs volumineux n'étant plus affichés simultanément).
- **SC-002**: 100 % des paramètres existants restent atteignables et éditables en au plus deux interactions (sélectionner un onglet ou ouvrir une modale) — vérifiable par recensement exhaustif de la liste de FR-001.
- **SC-003**: Un utilisateur peut lancer une génération de population sans jamais quitter l'onglet « Principaux » ni ouvrir de modale (les réglages principaux suffisent).
- **SC-004**: À graine et suite d'actions identiques, la population générée après la refonte est strictement identique à celle générée avant (aucune régression de déterminisme).
- **SC-005**: L'onglet actif est correctement restauré au rechargement dans 100 % des cas testés.

## Assumptions

- **Découpage principaux / avancés** *(résolu en clarification)* : les réglages « principaux » sont paramètres graphiques (thème), graine, nombre d'individus, année de naissance et chance de pouvoir ; tous les autres réglages numériques et cases (hérédité & naissance, D, K, résilience initiale, pondérations de gabarits, overrides de résilience) vont en « avancés ».
- **Apparence (thème)** *(résolu)* : la section « Paramètres graphiques » fait partie des réglages principaux, affichée dans l'onglet « Principaux » (actif par défaut).
- **Mécanisme d'affichage** *(résolu en clarification)* : deux onglets « Principaux » / « Avancés » dans la page, sur le modèle des onglets de la Sandbox ; un seul panneau visible à la fois. Le bouton « Générer la population » est persistant, hors des panneaux d'onglets.
- **Consanguinité** *(résolu en clarification)* : la case « autoriser la consanguinité » figure en tête de l'éditeur d'espèces, à l'intérieur de la modale « Espèces & reproduction ».
- **Patron de modale** : les fenêtres modales réutilisent le comportement déjà en place pour l'édition de personne en sandbox (fermeture Échap / arrière-plan / bouton), pour rester cohérentes.
- **Pas d'impact simulation** : aucun changement du cœur déterministe, du modèle de paramètres, ni du format de persistance ; la feature est confinée à la couche présentation.
- **Anonymat & déterminisme** : la refonte respecte la constitution (identité KingsCookie, seed unique, cœur pur) ; aucun paramètre ni aucune graine n'est introduit du côté aléatoire.
- **Version** : cette feature portera l'application en **v0.12.0** (bump `package.json` effectué à l'implémentation, feature mineure sans casse).
