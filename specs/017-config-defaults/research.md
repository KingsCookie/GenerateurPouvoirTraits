# Research — 017-config-defaults

Décisions techniques résolvant les inconnues du plan. Aucune inconnue « NEEDS CLARIFICATION » ne subsiste.

## R1 — Forme de la source unique centralisée

- **Décision** : dossier `src/core/default/` avec **`defaultConfig.json`** (données) + **`defaultConfig.ts`** (typage + accès). `defaultConfig.json` contient **verbatim** les trois blocs du fichier de config : `catalog`, `especes`, `parameters`. `defaultConfig.ts` importe le JSON, l'expose typé (`DEFAULT_CATALOG: Catalog`, `DEFAULT_ESPECES: Espece[]`, `DEFAULT_PARAMETERS: Parameters`) et fournit des accès qui rendent des **copies profondes** (immutabilité).
- **Rationale** : une seule source lisible et diff-able (FR-006). Vite/TS importent le JSON nativement au build → aucune I/O runtime (Principe II/IV). Le JSON reflète exactement ce que l'utilisateur a fourni, sans réécriture manuelle sujette à erreur.
- **Alternatives rejetées** :
  - Tout en `.ts` (objets littéraux) : plus verbeux, risque de divergence à la recopie, moins lisible que le JSON source.
  - Lire `rsrc/…json` au runtime : viole Principe II (I/O) et FR-009 (pas de dépendance à `rsrc/`).

## R2 — Contenu embarqué verbatim (ids non régénérables)

- **Décision** : recopier les traits **tels quels** (id, label, type, weight), sans les reconstruire à partir d'une liste de libellés.
- **Rationale** : dans le fichier de config, les ids ne sont **pas** contigus par index (ex. `Ajout` saute `-7`/`-9` ; `Element` saute plusieurs indices) car l'utilisateur a supprimé des traits dans son éditeur. La fabrique actuelle génère `type:slug(label)-i` avec `i` = index de tableau contigu ; elle ne peut donc **pas** reproduire ces ids. Embarquer verbatim garantit l'égalité exacte (SC-001) et la stabilité des ids (surcharges de poids, références futures).
- **Alternatives rejetées** : régénérer via `slug()`+index → produirait des ids différents (échec SC-001) et casserait la correspondance des poids.

## R3 — Exclusion de la seed

- **Décision** : `DEFAULT_PARAMETERS.seed` vaut `'0'` (comme aujourd'hui, cœur pur sans entropie). La seed du fichier (`"4392551652664730716"`) n'est **pas** recopiée. Deux options d'implémentation équivalentes : (a) omettre `seed` du JSON et l'injecter à `'0'` dans le loader ; (b) forcer `seed: '0'` dans le loader même si le JSON en contient une. **Choix : (b)** — garder le JSON structurellement complet mais neutraliser la seed à `'0'` dans `defaultConfig.ts`, avec un test dédié.
- **Rationale** : l'UI écrase déjà la seed via `createSeed()` au démarrage ([appState.ts:63](../../src/ui/stores/appState.ts#L63)) → FR-005 structurellement garanti ; forcer `'0'` côté cœur évite toute fuite de la seed du fichier même hors UI (tests, sandbox).
- **Alternatives rejetées** : recopier la seed du fichier → viole FR-005.

## R4 — Immutabilité des valeurs retournées

- **Décision** : chaque appel de `defaultCatalog()`, `defaultEspeces()`, `defaultParameters()` retourne une **copie profonde** fraîche (via `structuredClone`).
- **Rationale** : les tests et l'app mutent parfois ces objets (ex. `addTrait` doit ne pas muter la base ; `edit-catalog.test.ts` vérifie l'immutabilité). Retourner la même référence partagée introduirait des effets de bord. `structuredClone` est pur, déterministe et disponible dans Node 18+ (Vitest) et les navigateurs cibles (Principe VIII, aucune dépendance).
- **Alternatives rejetées** : `JSON.parse(JSON.stringify())` (fonctionne mais moins clair) ; retour de la référence (bug d'aliasing).

## R5 — Périmètre exact des défauts (aucun tri)

- **Décision** : **tout** le contenu des blocs `catalog`/`especes`/`parameters` du fichier devient le défaut, y compris les valeurs identiques aux défauts actuels (ex. `initialResilience: 50`, `generationK: 10`, `resilienceMax: 95`, `esperanceVie: 60`, `groupSize: 2`). Aucune sélection « delta ».
- **Rationale** : consigne explicite de l'auteur : « même si des choses ne changent pas … je veux que **tout** ce qui est dans le fichier de config (sauf la seed) … vienne d'une seule source centralisée. » Cela garantit qu'il n'existe plus **aucune** valeur par défaut définie ailleurs qu'en `src/core/default/`.
- **Alternatives rejetées** : ne recopier que les valeurs modifiées → laisserait des défauts codés en dur ailleurs (viole FR-006 et l'intention).

## R6 — Réalignement des tests existants

- **Décision** : les tests qui affirment des valeurs par défaut aujourd'hui codées en dur (`gaussian.test.ts` pic 25 / 40 % ; `edit-especes.test.ts` `reproPeakPct` 40 ; `edit-catalog.test.ts` contenu/`allNull` ; `state.test.ts` éventuelles valeurs) sont **réalignés** sur les valeurs de la source unique — de préférence en lisant dynamiquement depuis les fabriques plutôt qu'en re-codant des littéraux, afin d'éviter de recréer une deuxième source de vérité.
- **Rationale** : Principe V ; éviter la duplication de la « vérité ». Les défauts changent (attendu, FR-008).
- **Point d'attention `edit-catalog.test.ts`** : l'assertion « tous les traits par défaut ont `weight === null` » devient **fausse** (le fichier contient des poids non nuls, ex. `Action:controle-1` weight 6, `Ajout:bras-6` weight 0.5). Elle sera remplacée par une assertion cohérente avec la nouvelle source (ex. « aucune surcharge sur un type sans poids fixé » n'est plus vraie → tester plutôt l'égalité avec `DEFAULT_CATALOG`).

## R7 — Documentation (Principe IX) & version

- **Décision** : avant d'écrire du code, mettre à jour `rsrc/DescriptionProjet.md` puis `.adoc` pour les valeurs par défaut modifiées (paramètres humain de reproduction/mortalité §repro & §9.4 gaussienne ; défauts moteur : batch, D, seuils, mutations, statB/C, pondérations ; catalogue par défaut), **sur autorisation de l'auteur** (qui pilote la feature), puis l'auteur recompile le `.pdf`. Le bump **v1.0.0** est effectué **après validation** de l'auteur (consigne), pas pendant l'implémentation.
- **Rationale** : Principe IX (NON NÉGOCIABLE) : la spéc fonctionnelle est la source de vérité et doit précéder le code. `FORMAT_VERSION` reste inchangé (FR-010) : seules des valeurs changent, pas la structure.
- **Alternatives rejetées** : coder avant de documenter (interdit par Principe IX).
