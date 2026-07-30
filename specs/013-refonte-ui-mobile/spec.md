# Feature Specification: Refonte de l'UI mobile (direction 1a « Dense & rangé »)

**Feature Branch**: `013-refonte-ui-mobile`

**Created**: 2026-07-30

**Status**: Draft

**Input**: User description: "on va faire une refonte de l'UI en version mobile. tout ce dont tu as besoin est dans design_handoff_refonte_mobile_1a. Je veux garder la possibilité de changer les styles comme sur la version ordinateur. Tu ne dois pas modifier le visuel de la version ordinateur. Tu dois passer en version v0.13.0"

## Contexte

Sur téléphone (< 760 px), l'interface actuelle est inutilisable de façon fluide :

- le bloc de filtres (`FilterBar`) pousse la liste hors écran — **aucune** ligne de population n'est visible au chargement ;
- la barre État (export/import) s'étale sur deux lignes ;
- l'en-tête passe à la ligne (`flex-wrap` subi) ;
- la Sandbox affiche un `<table>` à défilement horizontal (actions hors écran) ;
- la fiche individu ouvre sur l'arbre généalogique, reléguant le nom et l'identité sous la ligne de flottaison.

Le dossier `design_handoff_refonte_mobile_1a/` fournit une maquette **haute fidélité** (direction **1a — « Dense & rangé »**, validée ; la direction 1b est archivée et **ne doit pas** être implémentée) couvrant cinq écrans (Population, Filtres, Fiche, Paramètres, Sandbox) plus le chrome commun.

La refonte est **exclusivement mobile** : tout vit dans des blocs `@media (max-width: 760px)` (ou des variantes de rendu conditionnées par la largeur), jamais dans les règles de base. **Le desktop (≥ 760 px) reste strictement inchangé.** Les thèmes (3 axes : mode × palette × style) et tous les tokens de `src/app.css` demeurent l'unique source de vérité ; aucune couleur, police, rayon ni graisse nouvelle.

## Clarifications

### Session 2026-07-30

- Q: Que doit contenir le menu « ⋯ » d'une ligne Population (les actions d'édition n'existant qu'en Sandbox) ? → A: Aucun menu — le bouton « ⋯ » est **supprimé** des lignes Population ; un simple tap sur la ligne ouvre la fiche. (Le « ⋯ » reste uniquement en Sandbox où il porte de vraies actions.)
- Q: Seuil de bascule mobile/desktop (le handoff spécifiait 640 px) ? → A: **760 px** — tous les blocs mobiles utilisent `@media (max-width: 760px)` et les rares blocs 760 px existants sont harmonisés sur ce même seuil. Le mobile = « < 760 px », le desktop inchangé = « ≥ 760 px ». (Le cadre de maquette 390 × 844 px reste la référence de conception.)

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Voir et parcourir la population sur téléphone (Priority: P1)

En tant qu'utilisateur sur téléphone, j'ouvre la vue Population et je vois immédiatement plusieurs individus (au moins 8) sans défiler, car les filtres ne sont plus déroulés dans le flux mais accessibles via un bouton « ⚙ Filtrer ». Chaque individu est présenté en ligne lisible (nom, méta étiquetée, puces de pouvoirs) avec accès à sa fiche et à ses actions.

**Why this priority**: C'est le problème central du handoff (« 0 individu visible aujourd'hui »). Corriger la Population rend l'application utilisable sur mobile et constitue le MVP.

**Independent Test**: à 390 × 844 px, charger une population générée : au moins 8 lignes d'individus sont visibles sans défilement ; le bloc `.filters` n'est pas rendu ; « ⚙ Filtrer » est présent ; toucher une ligne ouvre la fiche.

**Acceptance Scenarios**:

1. **Given** une population générée affichée sur un écran 390 × 844 px, **When** la vue Population se charge, **Then** au moins 8 individus sont visibles sans défiler et le bloc de filtres complet n'est pas affiché.
2. **Given** la barre de filtres collante, **When** au moins un filtre est actif, **Then** le bouton « ⚙ Filtrer » adopte le rendu actif et affiche un compteur, et une puce par filtre actif (avec croix de retrait) apparaît dans une rangée défilante, plus une puce de tri courant.
3. **Given** une puce de filtre active, **When** l'utilisateur touche sa croix, **Then** ce seul critère est retiré et la liste se recalcule.
4. **Given** une ligne d'individu, **When** l'utilisateur touche la ligne, **Then** la fiche de l'individu s'ouvre (aucun bouton « ⋯ » sur les lignes Population).
5. **Given** plusieurs pages de résultats, **When** la liste est affichée, **Then** seules les flèches ‹ › (≥ 44 px) apparaissent en bas, le sélecteur de taille de page complet étant déplacé dans le panneau de filtres.

---

### User Story 2 - Éditer filtres et tri hors du flux de la liste (Priority: P1)

En tant qu'utilisateur mobile, j'ouvre un panneau plein écran « Filtres & tri » depuis « ⚙ Filtrer », où je règle recherche, tri, génération, espèce/statut, pouvoir et l'accès aux traits ; les changements s'appliquent en direct et un bouton bas « Voir les N individus » (compte à jour) referme le panneau. Ce panneau sert la Population **et** la Sandbox.

**Why this priority**: Sans ce panneau, les filtres restant inaccessibles rendraient US1 incomplète ; les deux forment le socle mobile.

**Independent Test**: depuis Population ou Sandbox, « ⚙ Filtrer » ouvre le panneau plein écran ; modifier un critère met à jour le compte du bouton bas en direct ; « Réinitialiser » remet filtres + tri à zéro ; le catalogue des 64 traits n'apparaît jamais en ligne (accès par sous-écrans).

**Acceptance Scenarios**:

1. **Given** la vue Population (ou Sandbox), **When** l'utilisateur touche « ⚙ Filtrer », **Then** un panneau plein écran « Filtres & tri » s'ouvre avec recherche, tri (3 segments Nom/Naissance/Âge avec direction), génération, espèce·statut, pouvoir et 3 lignes de navigation vers les sous-écrans de traits (Présence / Portée / Traits sélectionnés `n / 64`).
2. **Given** le panneau ouvert, **When** l'utilisateur modifie un filtre, **Then** le libellé du bouton bas « Voir les N individus » se met à jour en direct.
3. **Given** le panneau ouvert, **When** l'utilisateur touche « Réinitialiser », **Then** `resetFilters()` et `resetSort(list)` sont appliqués.
4. **Given** le panneau ouvert, **When** l'utilisateur touche « Voir les N individus », « ✕ », le fond ou « Échap », **Then** le panneau se ferme et le focus revient au déclencheur.
5. **Given** le défaut dynamique de génération (`generationTouched` faux), **When** le temps avance, **Then** la puce active reflète la dernière génération recalculée (comportement conservé).

---

### User Story 3 - Consulter une fiche individu lisible d'abord (Priority: P2)

En tant qu'utilisateur mobile, j'ouvre une fiche et je vois d'abord l'identité, le statut, les pouvoirs (avec barres de mesure) et l'ADN ; l'arbre généalogique n'occupe plus le haut de la fiche mais devient une **entrée** vers la page dédiée.

**Why this priority**: Améliore fortement la lisibilité mobile mais dépend de la navigation depuis la liste (US1).

**Independent Test**: ouvrir une fiche sur mobile : le nom et l'identité sont en haut, l'arbre (`GenealogyTree`/`TreeLegend`) n'est pas monté, une entrée « Arbre généalogique » mène à `ArbreView` ; une valeur puissance/maîtrise > 10 affiche la barre pleine hachurée + halo + butoir avec `/10` conservé.

**Acceptance Scenarios**:

1. **Given** une fiche ouverte sur mobile, **When** elle s'affiche, **Then** la barre de titre (retour ← / nom tronqué / ⋯), la ligne de statut, les deux tuiles (pouvoirs / traits actifs), les cartes pouvoir, l'entrée « Arbre généalogique », le sélecteur de mode ADN et la liste d'informations apparaissent dans cet ordre, et ni `GenealogyTree` ni `TreeLegend` ne sont montés.
2. **Given** un pouvoir dont la puissance ou la maîtrise est > 10, **When** la carte pouvoir s'affiche, **Then** la barre est pleine, hachurée d'accent, avec halo, liseré interne et butoir, la valeur en `var(--fg)` gras, le `/10` conservé — **et** la même valeur dans la liste Population reste une simple note mono (« 12/6 ») sans effet.
3. **Given** la fiche, **When** l'utilisateur touche « Explorer l'arbre » (ou l'entrée dédiée), **Then** `ArbreView` s'ouvre (page inchangée).
4. **Given** la fiche, **When** l'utilisateur touche « Tuer… », **Then** une feuille de confirmation s'ouvre avec le champ cause obligatoire et son `role="alert"` (règle métier inchangée).

---

### User Story 4 - Régler puis générer sur téléphone (Priority: P2)

En tant qu'utilisateur mobile, je règle les paramètres dans des cartes à lignes (une valeur par ligne), je bascule entre onglets Principaux / Avancés, j'accède à l'apparence et aux catalogues via des sous-pages plein écran, et je garde en bas un bouton persistant « Générer la population ».

**Why this priority**: Nécessaire pour paramétrer sur mobile, mais l'usage principal (parcourir) relève de US1/US2.

**Independent Test**: sur mobile, la page Paramètres affiche les onglets, les cartes à lignes, une ligne « Apparence » ouvrant une sous-page (`ThemeControls variant="full"`), une ligne « Catalogues & espèces » ouvrant les éditeurs en plein écran, et un bouton bas persistant « Générer la population » sur les deux onglets.

**Acceptance Scenarios**:

1. **Given** la page Paramètres sur mobile, **When** elle s'affiche, **Then** les onglets Principaux/Avancés sont présents (onglet actif mémorisé via `paramsTab`), les `fieldset` sont rendus en cartes à lignes (libellé à gauche, champ aligné à droite ~96 px), et le bouton « Générer la population » est visible en bas quel que soit l'onglet.
2. **Given** l'onglet Principaux, **When** l'utilisateur touche la ligne « Apparence », **Then** une sous-page plein écran s'ouvre avec `ThemeControls variant="full"` (une section par axe), sans aucun changement de logique de thème.
3. **Given** l'onglet Principaux, **When** l'utilisateur touche « Catalogues & espèces », **Then** les éditeurs (`CatalogueModal` / `EspecesModal`) s'ouvrent **en plein écran** (et non en modale centrée).
4. **Given** l'onglet Avancés, **When** il s'affiche, **Then** le champ « A » reste en lecture seule et toutes les valeurs (hérédité, mutations, résilience, pondérations) sont éditables une par ligne.

---

### User Story 5 - Manipuler la Sandbox sans tableau hors écran (Priority: P2)

En tant qu'utilisateur mobile en Sandbox, je vois une liste d'individus en lignes (plus de tableau à défilement horizontal), une lentille temporelle à curseur pleine largeur, des onglets Population/Couples, et une barre d'action basse contextuelle (mode reproduction inclus).

**Why this priority**: Rend la Sandbox utilisable sur mobile ; secondaire par rapport à la consultation de base.

**Independent Test**: sur mobile, la Sandbox n'affiche aucun `<table>` à défilement horizontal ; la lentille temporelle a un curseur pleine largeur borné `[minYear, maxYear]` ; les actions de ligne passent par « ⋯ » ; le mode reproduction affiche cases à cocher + barre d'action dédiée.

**Acceptance Scenarios**:

1. **Given** la Sandbox sur mobile, **When** elle s'affiche, **Then** le bandeau (badge « Bac à sable », ↺/✕ en icônes, « ✔ Make it real »), la lentille temporelle (curseur pleine largeur), les onglets internes Population/Couples et la barre de filtres (identique à Population) sont présents, sans tableau à défilement horizontal.
2. **Given** la liste Sandbox, **When** l'utilisateur touche « ⋯ » d'une ligne, **Then** les actions (Éditer / Cloner / Régénérer / Supprimer) s'ouvrent en feuille.
3. **Given** le mode reproduction manuelle actif, **When** il est affiché, **Then** des cases à cocher 20 × 20 px apparaissent, la méta indique le rôle (parent 1 / parent 2), et la barre basse devient « n parent(s) · m enfant » + champ enfants + « Valider ⚭ » + « Annuler ».
4. **Given** une ligne sélectionnée, **When** elle s'affiche, **Then** elle conserve exactement le rendu actuel (fond mix accent 24 % + liseré interne 3 px).
5. **Given** l'onglet Couples sur mobile, **When** il s'affiche, **Then** le formulaire A/B et la liste de couples passent en pile (selects pleine largeur, actions Divorcer/Dissoudre sur leur ligne).

---

### User Story 6 - Conserver le choix des styles et un desktop intact (Priority: P1 — contrainte transverse)

En tant qu'utilisateur, je peux toujours changer de thème (mode, palette, style A→F) sur mobile comme sur desktop, et l'affichage desktop est rigoureusement identique à avant la refonte.

**Why this priority**: Double exigence explicite du commanditaire, transverse à toutes les vues ; un manquement invaliderait la livraison.

**Independent Test**: comparer le rendu ≥ 760 px avant/après (identique) ; sur mobile, vérifier que les 6 styles × 6 palettes × 2 modes s'affichent correctement (contrôler A « chip doux » et E « bordures 2 px, coins droits », en clair et sombre) et que le changement de thème reste accessible.

**Acceptance Scenarios**:

1. **Given** un navigateur à largeur ≥ 760 px, **When** on compare l'app avant et après la refonte, **Then** le rendu est identique (mêmes composants, mêmes styles de base — y compris `.filters`, `Paginator` complet, arbre dans la fiche, tableaux).
2. **Given** un écran mobile, **When** l'utilisateur ouvre l'apparence et change mode/palette/style, **Then** le changement s'applique immédiatement et est mémorisé, sans logique de thème modifiée.
3. **Given** chaque combinaison de style × palette × mode, **When** on affiche les écrans mobiles, **Then** le rendu reste correct (états actifs, chips, bordures) car seules les variables CSS sont utilisées (aucune valeur codée en dur).

---

### Edge Cases

- **Liste vide** : sous la barre de filtres, message « Aucun individu ne correspond aux filtres. » + bouton secondaire « Réinitialiser les filtres ».
- **Puissance/maîtrise > 10** : barre pleine hachurée + halo + butoir en fiche ; **aucun** effet particulier dans la liste (note mono simple). Accessibilité `role="meter"` avec valeur réelle, ou texte « 13 sur 10 (hors barème) ».
- **Bascule autour de 760 px** : au redimensionnement, l'app passe proprement du rendu mobile au rendu desktop sans état incohérent (les feuilles/sous-pages mobiles n'ont pas d'effet visuel en desktop).
- **Avancement du temps < 1** : le stepper/`Avancer` reste borné `min=1` et désactivé sous 1 (comportement conservé).
- **Lentille Sandbox** : curseur et champ numérique synchronisés et bornés `[minYear, maxYear]`.
- **`prefers-reduced-motion`** : les feuilles n'ont aucune transition (règle globale existante).
- **Population vide** : les onglets restent désactivés tant que la population est vide (navigation inchangée).
- **Cible tactile** : toute action principale ≥ 44 px ; icônes secondaires denses 36–40 px ; jamais < 32 px.

## Requirements *(mandatory)*

### Functional Requirements

**Périmètre & non-régression (contraintes absolues)**

- **FR-001**: Toutes les modifications visuelles DOIVENT être confinées au mobile (< 760 px), via des blocs `@media (max-width: 760px)` ou des variantes de rendu conditionnées par la largeur ; les règles de base ne DOIVENT PAS être modifiées.
- **FR-002**: Le rendu desktop (≥ 760 px) DOIT rester strictement identique à l'actuel, y compris `.filters`, le `Paginator` complet, l'arbre dans la fiche et les tableaux.
- **FR-003**: Les 3 axes de thème existants (`data-mode` clair/sombre × `data-palette` 6 palettes × `data-style` 6 styles A→F) et l'ensemble des tokens de `src/app.css` DOIVENT rester l'unique source de vérité ; aucune couleur, police, rayon ni graisse nouvelle ne DOIT être introduite ; le mobile n'utilise que des variables CSS (aucune valeur codée en dur).
- **FR-004**: Le changement de thème (mode, palette, style) DOIT rester possible sur mobile, avec la même logique et la même persistance que sur desktop.
- **FR-005**: Le cœur métier (`src/core/**`) NE DOIT PAS être modifié ; aucune source d'aléatoire (Math.random, horloge, id aléatoire) ni sauvegarde automatique ne DOIT être ajoutée ; le déterminisme et l'unicité de la seed sont préservés.
- **FR-006**: La direction **1a** seule DOIT être implémentée ; la direction 1b (archive) NE DOIT PAS l'être.

**Chrome commun**

- **FR-007**: Sous 760 px, l'en-tête DOIT être réorganisé en deux rangées fixes (marque + actions d'état ; navigation), sans passage à la ligne : logo, titre tronqué à l'ellipse, et trois boutons icône carrés (Exporter, Importer, toggle clair/sombre `ThemeControls variant="toggle"`), chacun avec un `aria-label`.
- **FR-008**: Sous 760 px, `StateIO` DOIT perdre ses libellés texte et la barre `.io-bar` pleine largeur (bandeau teinté) DOIT disparaître ; l'export ouvre une feuille avec les 3 exports existants (Configuration / Données / Tout), l'import déclenche l'`<input type="file">` existant.
- **FR-009**: Sous 760 px, les 3 items de navigation (Paramètres / Population / Sandbox) DOIVENT passer en segments d'égale largeur (le séparateur supprimé), l'état actif conservant strictement le rendu `app.css` selon le style. L'en-tête reste `sticky; top:0` ; `AppFooter` et `ScrollToTop` restent inchangés.

**Population**

- **FR-010**: Sous 760 px, `TimeBar` DOIT être remplacé par une barre de temps compacte (année sur une ligne + stepper −/valeur/+ + bouton « Avancer »), le champ numérique restant accessible et borné `min=1`.
- **FR-011**: Sous 760 px, une barre de filtres collante DOIT présenter le bouton « ⚙ Filtrer » (rendu actif + compteur dès qu'un filtre est posé) et une rangée défilante de puces : une par filtre actif (avec croix de retrait) et une puce de tri courant.
- **FR-012**: Sous 760 px, le bloc `.filters` d'origine NE DOIT PAS être rendu ; tous ses critères DOIVENT rester atteignables via le panneau « Filtres & tri ».
- **FR-013**: Sous 760 px, chaque individu DOIT être rendu en ligne (nom + `†` si décédé, méta étiquetée par le format `an … · … ans · espèce · gN`, puces de pouvoirs au format `P/M`, chevron `›`) ; **aucun bouton « ⋯ »** n'est présent sur les lignes Population — un tap sur la ligne ouvre la fiche ; au moins 8 individus DOIVENT être visibles sans défiler à 390 × 844 px.
- **FR-014**: Sous 760 px, le `Paginator` complet DOIT être déplacé dans le panneau de filtres ; seules les flèches ‹ › (≥ 44 px) apparaissent en bas de liste quand il y a plus d'une page ; une ligne de résultats compacte (« n / N individus », « 1–n · page x/y ») est affichée.

**Panneau Filtres & tri**

- **FR-015**: Un panneau plein écran « Filtres & tri » (mobile seulement) DOIT être ouvrable par « ⚙ Filtrer », réutilisable par Population et Sandbox (via la prop `list: ListName` existante de `FilterBar`), et contenir : recherche par nom, tri (3 segments Nom/Naissance/Âge avec direction via `cycleSort`), génération, espèce·statut, pouvoir, et 3 lignes de navigation vers des sous-écrans de traits (Présence / Portée / Traits sélectionnés `n / 64`).
- **FR-016**: Le catalogue des traits NE DOIT jamais s'afficher en ligne sous 760 px ; il est atteint via les sous-écrans dédiés.
- **FR-017**: Les filtres DOIVENT s'appliquer en direct ; le bouton bas « Voir les N individus » DOIT refléter le compte à jour ; « Réinitialiser » DOIT appliquer `resetFilters()` + `resetSort(list)`.
- **FR-018**: Le défaut dynamique de génération (`generationTouched` faux ⇒ dernière génération recalculée) DOIT être strictement conservé.

**Fiche individu**

- **FR-019**: Sous 760 px, la fiche DOIT présenter d'abord l'identité (barre de titre retour/nom/⋯, ligne de statut, tuiles pouvoirs/traits actifs, cartes pouvoir, entrée « Arbre généalogique », sélecteur de mode ADN, liste d'informations) ; `GenealogyTree` et `TreeLegend` NE DOIVENT PAS être montés dans la fiche.
- **FR-020**: L'entrée « Arbre généalogique » DOIT mener à `ArbreView` (page inchangée) ; la remise à zéro du défilement à l'ouverture d'une fiche/arbre est conservée.
- **FR-021**: Les cartes pouvoir DOIVENT afficher des barres de mesure ; pour une valeur > 10 (puissance/maîtrise non plafonnées par le cœur), la barre DOIT être pleine, hachurée d'accent, avec halo, liseré interne et butoir, valeur en `var(--fg)` gras et `/10` conservé, sans jamais dépasser la piste ; un équivalent accessible (`role="meter"` avec valeur réelle, ou texte lisible) DOIT être fourni. Cet effet NE DOIT PAS apparaître dans la liste Population.
- **FR-022**: L'action « Tuer… » DOIT ouvrir une feuille de confirmation avec le champ cause obligatoire et son `role="alert"` (règle métier inchangée).

**Paramètres**

- **FR-023**: Sous 760 px, la page Paramètres DOIT conserver les onglets Principaux / Avancés (onglet actif mémorisé via `paramsTab`), rendre les `fieldset` en cartes à lignes (une valeur par ligne, libellé à gauche, champ aligné à droite ~96 px), et n'afficher les descriptions que là où elles portent une règle métier.
  - **Clarification** *(Bugfix 2026-07-30 — BUG-001)* : cette exigence s'applique **aussi aux sous-composants d'édition imbriqués** rendus dans les `fieldset` des Avancés (notamment `ResilienceOverrides`). Aucun `<table>` ni largeur fixe ne DOIT provoquer de débordement horizontal sous 760 px : les tableaux (ex. « Par type de trait ») DOIVENT être empilés en lignes/cartes **ou** confinés dans un conteneur `overflow-x: auto` afin que le corps de page ne défile jamais horizontalement (cohérent avec INV-M12 / SC-003).
- **FR-024**: Sous 760 px, les paramètres graphiques NE DOIVENT PAS s'afficher en puces en ligne : une ligne de navigation « Apparence » DOIT ouvrir une sous-page plein écran reprenant `ThemeControls variant="full"` (aucun changement de logique de thème).
- **FR-025**: Sous 760 px, la ligne « Catalogues & espèces » DOIT ouvrir les éditeurs existants (`CatalogueModal`, `EspecesModal`) **en plein écran** (et non en modale centrée) ; le champ « A » reste en lecture seule.
- **FR-026**: Le bouton « Générer la population » DOIT rester une barre d'action basse persistante, visible quel que soit l'onglet (cohérent avec FR-007b de la feature 012).

**Sandbox**

- **FR-027**: Sous 760 px, la Sandbox NE DOIT PAS afficher de `<table>` à défilement horizontal : les individus sont rendus en lignes ; les actions de ligne (Éditer / Cloner / Régénérer / Supprimer) passent par un bouton « ⋯ » ouvrant une feuille.
- **FR-028**: Sous 760 px, le bandeau Sandbox (badge « Bac à sable », ↺ Reset, ✕ Quitter en icônes, « ✔ Make it real ») et la lentille temporelle (curseur `range` pleine largeur synchronisé au champ, borné `[minYear, maxYear]`) DOIVENT être présents ; les deux actions destructrices restent confirmées.
- **FR-029**: Sous 760 px, les onglets internes Population/Couples passent en segments (rendu actif `.nav-item.is-active`) ; la barre de filtres est identique à la Population ; l'onglet Couples passe en pile (selects pleine largeur, actions sur leur ligne).
- **FR-030**: En mode reproduction manuelle sous 760 px, des cases à cocher 20 × 20 px DOIVENT apparaître, la méta indiquer le rôle (parent 1 / parent 2), et la barre basse devenir compte + champ enfants + « Valider ⚭ » + « Annuler » ; la ligne sélectionnée conserve exactement le rendu actuel (mix accent 24 % + liseré interne).

**Arbre & interactions transverses**

- **FR-031**: Sous 760 px, `ArbreView` reste la page dédiée ; seuls deux ajustements mobiles : contrôles (Profondeur, Zoom) en deux rangées de segments, viewport `height: clamp(20rem, 62vh, 34rem)` ; le pan/zoom tactile est conservé.
- **FR-032**: Les feuilles (bottom sheets / plein écran) DOIVENT s'ouvrir par translation verticale (~200 ms), sur fond de scène `rgba(0,0,0,.5)`, se fermer par ✕, appui sur le fond ou Échap, avec piégeage du focus et retour du focus au déclencheur ; `prefers-reduced-motion` supprime les transitions.
- **FR-033**: Les états d'interaction DOIVENT être conservés : `:hover` (`--hover-bg`), `:focus-visible` (outline accent), `disabled` (opacité réduite) ; les cibles tactiles principales ≥ 44 px, icônes secondaires 36–40 px, jamais < 32 px.
- **FR-034**: Les messages d'erreur `role="alert"` (import refusé, cause de décès manquante, erreurs sandbox) DOIVENT conserver leur style `.error-msg`.

**État & versionnage**

- **FR-035**: Aucun nouveau store métier ne DOIT être créé ; seuls des états d'interface locaux non persistés sont ajoutés (ex. ouverture de la feuille de filtres, feuille d'actions, sous-page apparence) ; les préférences déjà persistées (thème, taille de page, onglet paramètres, mode ADN) restent en `localStorage`.
- **FR-036**: La version de l'application DOIT passer à **v0.13.0**.

### Key Entities

*(Aucune nouvelle entité de données. La feature ne modifie ni le modèle, ni le format de persistance, ni le cœur ; elle n'introduit que des états d'interface locaux non persistés.)*

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: À 390 × 844 px, la vue Population affiche **au moins 8 individus** sans défilement (contre 0 aujourd'hui).
- **SC-002**: Sous 760 px, 100 % des critères de filtre et de tri restent atteignables depuis « ⚙ Filtrer » ; le bloc `.filters` n'est pas rendu.
- **SC-003**: Sous 760 px, aucune action n'est inaccessible : plus aucun tableau à défilement horizontal en Sandbox, plus aucun bouton hors écran (vérifiable écran par écran).
- **SC-004**: Au-dessus de 760 px, le rendu est **identique** à l'actuel (comparaison avant/après sur les 5 vues).
- **SC-005**: Les 6 styles × 6 palettes × 2 modes s'affichent correctement sur mobile (contrôle explicite de A et E, en clair et en sombre).
- **SC-006**: Une valeur puissance/maîtrise > 10 s'affiche en fiche avec barre pleine hachurée + halo + butoir et `/10` conservé, sans effet équivalent dans la liste Population.
- **SC-007**: Toutes les cibles tactiles principales mesurent ≥ 44 px ; `:focus-visible` est visible partout ; la navigation clavier et lecteur d'écran est préservée.
- **SC-008**: `npm run test` (tests déterministes du cœur) et `npm run lint` passent inchangés ; le pied de page affiche **v0.13.0**.

## Assumptions

- **Direction validée** : seule la direction **1a** est implémentée ; 1b reste une archive dans le fichier de maquette.
- **Seuil mobile** *(résolu en clarification)* : la bascule mobile/desktop s'opère à **760 px** (et non 640 px comme dans le handoff). Tous les nouveaux blocs mobiles utilisent `@media (max-width: 760px)` et les rares règles 760 px déjà présentes (page Paramètres) sont harmonisées sur ce seuil unique. Le cadre de maquette 390 × 844 px reste la référence de conception.
- **Fidélité par tokens** : les valeurs hexadécimales du handoff ne servent qu'à relire la maquette (style A / violet / sombre) ; le code n'emploie que les variables CSS de `src/app.css`.
- **Assets** : les polices `hanken-grotesk.woff2` / `jetbrains-mono.woff2` existent déjà (auto-hébergées, précachées) ; le dossier de handoff ne doit pas être réintégré. Les icônes sont des glyphes déjà utilisés (aucune fonte d'icône ni SVG nouveau).
- **Fichiers concernés (mobile uniquement)** : `App.svelte`, `StateIO`, `TimeBar`, `FilterBar`, `Paginator`, `ThemeControls`, `TraitModeSelector`, `ListeView`, `FicheView`, `ParametresView`, `SandboxView`, `ArbreView`, `CatalogueModal`, `EspecesModal`, et `src/app.css` (nouveaux blocs `@media` uniquement) ; `src/core/**` non touché.
- **Constitution** : refonte purement présentationnelle → aucune mise à jour de `rsrc/DescriptionProjet.md` requise (l'agencement mobile n'y est pas prescrit) ; identité `KingsCookie` sans email ; aucune dépendance ajoutée.
- **Version** : cette feature porte l'application en **v0.13.0** (bump `package.json` à l'implémentation, feature mineure).
