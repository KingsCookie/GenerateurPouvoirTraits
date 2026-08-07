# Feature Specification: Paramètres par défaut issus du fichier de config

**Feature Branch**: `017-config-defaults`

**Created**: 2026-08-07

**Status**: Draft

**Input**: User description: "on va faire la dernière feature de la v0. tu peux donc bump en v1 quand j'aurais validé cette feature. L'idée est la suivante. j'ai ajouté un fichier de config qui me vient d'un de nos utilisateurs. c'est `rsrc/PowerGenerator_config_20260807-153421.json`. Ce que j'aimerais c'est que tous les paramètres de ce fichier **sauf la seed** soient les paramètres par défaut de l'application. Pour se faire, j'aimerais que tous les paramètres viennent d'un même endroit (pas dans rsrc mais PAR EXEMPLE dans un nouveau dossier du core « default »)."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Ouvrir l'application avec les nouveaux défauts (Priority: P1)

Un visiteur ouvre l'application pour la première fois (ou après avoir vidé son stockage local, sans importer aucun fichier). L'application démarre déjà configurée avec le catalogue de traits, l'espèce humaine et les paramètres numériques fournis par le fichier de config de l'utilisateur — à l'exception de la seed, qui reste tirée aléatoirement à chaque démarrage. Le visiteur peut lancer une génération immédiatement et obtenir une population cohérente avec ces réglages, sans avoir à importer quoi que ce soit.

**Why this priority**: C'est le cœur de la demande. Sans ce changement, l'utilisateur devrait importer manuellement le fichier de config à chaque fois. C'est la valeur livrée à elle seule et elle constitue le MVP.

**Independent Test**: Démarrer l'application avec un stockage vide, ne rien importer, ouvrir la page Paramètres et vérifier que le catalogue, l'espèce humaine et les valeurs numériques correspondent au fichier de config ; vérifier qu'une seed aléatoire (et non celle du fichier) est présente.

**Acceptance Scenarios**:

1. **Given** un stockage local vide et aucun import, **When** l'application démarre, **Then** les paramètres numériques (taille de batch, année de naissance, chances de pouvoir, duplication, seuils, mutations, statistiques P/M, pondérations de gabarits et de types de trait, options) correspondent exactement à ceux du fichier de config.
2. **Given** un stockage local vide, **When** l'application démarre, **Then** le catalogue de traits par défaut est celui du fichier de config (mêmes types, libellés, identifiants et surcharges de poids).
3. **Given** un stockage local vide, **When** l'application démarre, **Then** l'espèce humaine par défaut a les paramètres de reproduction, de mortalité et les genres définis dans le fichier de config.
4. **Given** deux démarrages successifs avec stockage vide, **When** on compare les seeds proposées, **Then** elles sont différentes l'une de l'autre et différentes de la seed du fichier de config (la seed reste aléatoire).

---

### User Story 2 - Réinitialiser aux valeurs par défaut (Priority: P2)

Un utilisateur qui a modifié ses paramètres (ou importé une ancienne config) souhaite revenir aux réglages par défaut de l'application. Toute fonction de réinitialisation existante doit restaurer les mêmes valeurs que celles décrites en User Story 1 (issues du fichier de config), et non les anciennes valeurs codées en dur.

**Why this priority**: Garantit la cohérence : « défaut » veut dire une seule et même chose partout dans l'application. Utile mais secondaire par rapport au démarrage initial.

**Independent Test**: Modifier plusieurs paramètres, déclencher la réinitialisation, vérifier que les valeurs reviennent à celles du fichier de config (seed exclue).

**Acceptance Scenarios**:

1. **Given** des paramètres modifiés par l'utilisateur, **When** il réinitialise aux valeurs par défaut, **Then** catalogue, espèces et paramètres numériques reviennent aux valeurs du fichier de config.
2. **Given** une réinitialisation, **When** elle s'applique, **Then** la seed courante n'est pas remplacée par celle du fichier de config (elle reste aléatoire / inchangée selon le comportement de réinitialisation existant).

---

### User Story 3 - Source unique pour les valeurs par défaut (Priority: P3)

Un mainteneur (développeur du projet) veut pouvoir consulter et faire évoluer l'ensemble des valeurs par défaut depuis un seul endroit, sans avoir à chercher dans plusieurs fichiers. Toutes les valeurs par défaut (catalogue, espèces, paramètres) proviennent d'une source unique et centralisée.

**Why this priority**: Qualité de maintenance demandée explicitement, mais invisible pour l'utilisateur final ; n'empêche pas la livraison de la valeur des US1/US2.

**Independent Test**: Modifier une valeur par défaut à un seul endroit et constater que le changement se répercute partout où un « défaut » est utilisé (démarrage, réinitialisation, catalogue, espèces).

**Acceptance Scenarios**:

1. **Given** la source unique des défauts, **When** on change une valeur, **Then** aucune autre définition concurrente des défauts n'a besoin d'être modifiée pour que le changement prenne effet.

---

### Edge Cases

- **Seed du fichier ignorée** : la seed présente dans le fichier de config (`"4392551652664730716"`) ne doit jamais devenir la seed par défaut ; l'application continue de tirer une seed aléatoire au démarrage comme aujourd'hui.
- **Fichiers importés existants** : l'import d'un fichier (config/data/full) reste prioritaire sur les défauts et n'est pas affecté par cette feature ; les données déjà présentes en stockage local d'un utilisateur ne sont pas écrasées par les nouveaux défauts.
- **Compatibilité de format** : le fichier de config est en `formatVersion` 5 (format courant) ; aucun changement de version de format ni migration n'est nécessaire.
- **Genres de l'espèce humaine** : les défauts passent de « tout » seul à trois genres (« Tout », « Féminin », « Masculin ») ; vérifier que le reste de l'application (reproduction, sélection de genre) reste cohérent avec ce nouveau défaut.
- **Traits référencés par l'algorithme** : le catalogue par défaut change entièrement de contenu ; vérifier que les sorties de génération restent valides (les identifiants de traits attendus par la logique §6.4 restent résolus par le nouveau catalogue).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Au démarrage sans données en stockage local et sans import, l'application MUST utiliser comme paramètres numériques par défaut ceux du fichier de config, à savoir : taille de batch 300, année de naissance 1880, chance de pouvoir 1 %, duplication D 1.5, seuil de disparition 20, K de génération 10, résilience max 95, résilience initiale 50, bonus 5, malus 5, taux sans pouvoir 10 %, mutation forte 10 %, gain de mutation faible 10 %, perte de mutation faible 10 %, malus génome activé, statB 25, statC 25, consanguinité interdite.
- **FR-002**: L'application MUST utiliser comme pondérations par défaut de gabarits `AE:4, PA:1, PE:1, PR:1` et comme pondérations par défaut de types de trait `Action:4, Element:2, Ajout:1, Etat:1, PartieCorps:1, Remplacement:1`.
- **FR-003**: L'application MUST utiliser comme catalogue de traits par défaut le catalogue du fichier de config (l'ensemble des types, libellés, identifiants et surcharges de poids y figurant), remplaçant intégralement l'ancien catalogue par défaut.
- **FR-004**: L'application MUST utiliser comme espèce(s) par défaut l'espèce humaine telle que définie dans le fichier de config (espérance de vie 60, mort naturelle 9 %, pic de repro à 30 ans à 20 %, pente 6, début 18, fin 50, taille de groupe 2, portée min 1 / max 4 / extra 5 %, divorce 2 %, genres « Tout » / « Féminin » / « Masculin »).
- **FR-005**: L'application MUST NOT utiliser la seed du fichier de config comme seed par défaut ; la seed MUST continuer d'être tirée aléatoirement à chaque démarrage, exactement comme dans le comportement actuel.
- **FR-006**: Toutes les valeurs par défaut (catalogue, espèces, paramètres numériques) MUST provenir d'une source unique et centralisée, de sorte qu'une modification de valeur par défaut se fasse à un seul endroit.
- **FR-007**: Toute fonction de réinitialisation « aux valeurs par défaut » existante MUST restaurer les valeurs de cette source unique (donc celles du fichier de config, seed exclue).
- **FR-008**: Le changement MUST préserver le déterminisme du cœur : à seed fixée, les sorties restent reproductibles ; il est attendu et acceptable que les sorties à seed fixe **changent** par rapport à la version précédente, puisque les valeurs par défaut changent.
- **FR-009**: Le fichier `rsrc/PowerGenerator_config_20260807-153421.json` NE DOIT PAS être lu à l'exécution ; il sert uniquement de source des valeurs à recopier dans la source centralisée du cœur (aucune dépendance runtime à `rsrc/`).
- **FR-010**: Aucun changement de version de format de persistance ni migration de données MUST être introduit par cette feature (les valeurs seules changent, pas la structure).

### Key Entities *(include if feature involves data)*

- **Catalogue par défaut** : ensemble des traits par type (Action, Ajout, Element, Etat, PartieCorps, Remplacement), chacun avec identifiant, libellé, type et surcharge de poids éventuelle. Provient du fichier de config.
- **Espèce par défaut (humain)** : paramètres de reproduction, de mortalité, d'espérance de vie et liste de genres. Provient du fichier de config.
- **Paramètres par défaut** : bloc de réglages numériques et booléens du moteur (batch, année, chances, seuils, mutations, statistiques P/M, pondérations, options), **sans** la seed. Provient du fichier de config.
- **Seed** : identifiant d'aléa 64 bits ; explicitement **exclue** des valeurs par défaut recopiées ; reste générée aléatoirement au démarrage.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Sur un démarrage à stockage vide, 100 % des paramètres numériques, des pondérations, du catalogue et de l'espèce humaine affichés dans Paramètres correspondent au fichier de config (aucun écart).
- **SC-002**: Sur 10 démarrages successifs à stockage vide, la seed proposée est différente à chaque fois et n'est jamais égale à la seed du fichier de config.
- **SC-003**: Une modification d'une valeur par défaut effectuée à un seul endroit de la source centralisée se reflète à la fois au démarrage initial et lors d'une réinitialisation, sans autre modification.
- **SC-004**: Aucun fichier existant importé par un utilisateur (config/data/full) n'est altéré par la feature : l'import produit le même résultat qu'avant.

## Assumptions

- « Tous les paramètres du fichier » désigne les trois blocs présents dans le fichier : `catalog`, `especes` et `parameters` (hors `seed`). Le champ `kind` et `formatVersion` du fichier ne sont pas des « paramètres » et ne changent rien aux défauts.
- Le catalogue par défaut est **entièrement remplacé** par celui du fichier de config (et non fusionné avec l'ancien).
- La liste d'espèces par défaut se limite à l'espèce humaine présente dans le fichier (une seule espèce).
- Le comportement d'import de fichiers et la fusion non destructive (Feature 6) restent inchangés ; cette feature ne touche qu'aux **valeurs par défaut** utilisées en l'absence de données.
- Le bump en v1.0.0 sera effectué **après validation** de l'utilisateur, conformément à sa consigne, et n'est pas requis pour considérer la feature fonctionnellement complète.
- La documentation projet (`rsrc/DescriptionProjet.md`/`.adoc`/`.pdf`) décrivant les valeurs par défaut sera mise à jour si nécessaire selon le processus habituel (Principe IX) avant écriture du code, mais la mise à jour documentaire n'est pas un livrable de code de cette feature.
