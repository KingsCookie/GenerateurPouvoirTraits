# Modèle de données — Feature 015

Extension **minimale** des entités existantes. Aucune nouvelle entité persistée majeure ; deux
champs par espèce, deux champs par personne, et un état de présentation (tri/filtre) non persisté.

## Entités persistées (cœur)

### Espèce (`src/core/model/espece.ts`) — 2 champs ajoutés

| Champ | Type | Contraintes | Défaut humain |
|-------|------|-------------|---------------|
| `esperanceVie` | `number` | Entier ≥ 0 (âge en années à partir duquel la mort naturelle est possible) | **60** |
| `mortNaturellePct` | `number` | Pourcentage [0..100] (testé chaque année au-delà de l'espérance) | **10** |

- Validation : `validateEspece()` — `esperanceVie` forcé entier ≥ 0 ; `mortNaturellePct` clampé
  [0..100].
- Défauts : `defaultEspece()` (humain **60 / 10**) et `defaultReproParams()` (nouvelle espèce :
  **60 / 10** également, aligné sur l'humain).

### Personne (`src/core/model/personne.ts`) — 2 champs ajoutés

| Champ | Type | Contraintes | Défaut |
|-------|------|-------------|--------|
| `age` | `number` | Entier ≥ 0. **Compteur suivi** : +1/an tant que vivant, **gelé** à la mort, repris tel quel à la résurrection. | `0` à la naissance ; import : `computeAge(yearOf(dateNaissance), currentYear)` |
| `immortel` | `boolean` | `true` ⇒ insensible à la mort naturelle (tuable manuellement). | `false` |

- La **tranche de génération** reste **dérivée** de l'année de naissance
  (`computeGeneration(yearOf(dateNaissance), genesisYear)`), donc invariante par mort/résurrection.
- `dateNaissance` reste **immuable** (jamais modifiée par mort/résurrection).
- `vivant` / `raisonDeces` : inchangés en type ; `raisonDeces = "mort naturelle"` pour la mort au
  tick ; remis à `null` par résurrection.

## État de présentation (UI, non persisté)

### Tri de liste (`ListSort`, `genealogy/filter.ts` + `stores/ui.ts`)

- `SortKey` étendu : `'nom' | 'naissance' | 'age' | 'puissance' | 'maitrise'`.
- Cycle inchangé : `null (défaut) → 'asc' → 'desc' → null`. Un seul tri actif à la fois.

### Critères de filtre (`FilterCriteria`, `genealogy/filter.ts` + `stores/filters.ts`)

- Champs ajoutés : `bornNafter: number | null`, `bornBefore: number | null` (années, bornes
  **inclusives**). `null` ⇒ inactif.
- Exclusivité : si `bornNafter !== null || bornBefore !== null`, le critère `generations` est
  **ignoré** (et son contrôle désactivé côté UI).

### État de chargement (`advancing`, `stores/*`)

- `advancing: boolean` (writable) : `true` du clic « avancer » jusqu'à l'affichage de la nouvelle
  population. Pilote l'affichage du `Spinner`. Non persisté.

## Transitions d'état — cycle de vie d'une personne

```text
                 tick: age≥espérance & !immortel & chance(mortNaturellePct)
   ┌───────────┐  ─────────────────────────────────────────────────────────▶ ┌───────────┐
   │  VIVANT   │                                                              │  DÉCÉDÉ    │
   │ age +1/an │  ◀─────────────────────────────────────────────────────────  │ age gelé  │
   └───────────┘        resurrect() : vivant=true, raisonDeces=null,          └───────────┘
        │                            age inchangé (repris à +1/an)                  ▲
        │  kill(cause) : vivant=false, raisonDeces=cause, age gelé                  │
        └───────────────────────────────────────────────────────────────────────-─┘

   immortel = true  ⇒  la transition « mort naturelle » est désactivée (kill manuel reste possible).
```

- **Invariant** : un individu DÉCÉDÉ n'incrémente jamais `age` (gel) et n'apparaît jamais comme
  candidat à la reproduction (déjà garanti par `selectCandidates`, non régressé).
- **Invariant** : `computeGeneration` ne dépend que de `dateNaissance` ⇒ constante sur tout le cycle
  vivant/mort/ressuscité.

## Fonctions cœur ajoutées / modifiées

| Fonction | Fichier | Rôle |
|----------|---------|------|
| `tick` (mod.) | `time/tick.ts` | +étape vieillissement (age+1 vivants) ; +étape mort naturelle (dernière) |
| `resurrect(state, id)` | `life/death.ts` | vivant=true, raisonDeces=null, age inchangé ; renvoie `KillResult`-like |
| `setImmortal(state, id, bool)` | `life/death.ts` | bascule `immortel` |
| `sortPopulation` (mod.) | `genealogy/filter.ts` | +clés puissance/maîtrise (pouvoir extrême, sans-pouvoir en fin) |
| `filterPopulation` (mod.) | `genealogy/filter.ts` | +bornes année inclusives, exclusivité génération |
| `SortKey` (mod.) | `genealogy/filter.ts` | +`'puissance'`,`'maitrise'` |
| `FilterCriteria` (mod.) | `genealogy/filter.ts` | +`bornNafter`,`bornBefore` |

Toutes reçoivent leurs entrées explicitement (RNG en paramètre pour `tick`) — cœur pur, Principe IV.
