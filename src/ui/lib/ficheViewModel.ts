// Modèle de vue PUR (aucune dépendance Svelte/DOM) : transforme une Personne + le catalogue
// en données d'affichage. Testable en isolation (tests/unit/fiche-vm.test.ts).
import {
  computeGeneration,
  powerLabel,
  traitTypeOf,
  yearOf,
  type Catalog,
  type Personne,
  type PowerKind,
  type TraitType,
} from '../../core/index.js';

// Réexport pour compatibilité (yearOf vit désormais dans le cœur, réutilisé par la généalogie).
export { yearOf, traitTypeOf };

export interface TraitView {
  traitId: string;
  label: string;
  resilience: number;
  /** Type du trait (Remplacement | PartieCorps | Etat | Element | Ajout | Action) — FR-015. */
  type: TraitType | undefined;
}

export interface PouvoirView {
  label: string;
  template: PowerKind;
  puissance: number;
  maitrise: number;
  traits: TraitView[];
}

export interface FicheView {
  id: string;
  nom: string;
  especeId: string;
  genreId: string;
  dateNaissance: string;
  age: number;
  generation: number;
  vivant: boolean;
  raisonDeces: string | null;
  immortel: boolean; // Feature 015 : état d'immortalité (case en fiche)
  pouvoirs: PouvoirView[];
  traitsActifs: TraitView[];
  traitsInactifs: TraitView[];
  /** Enfants de l'individu (id → nom résolu dans la population), cliquables vers leur fiche (FR-015). */
  enfants: { id: string; nom: string }[];
}

function labelIndex(catalog: Catalog): Map<string, string> {
  const idx = new Map<string, string>();
  for (const list of Object.values(catalog.byType)) {
    for (const t of list) idx.set(t.id, t.label);
  }
  return idx;
}

/**
 * Libellé de repli pour un trait **supprimé du catalogue** (FR / SC-006) : libellé connu si présent,
 * sinon le **slug** lisible extrait de l'id (`Element:feu-0` → « feu »). Garantit qu'aucun individu
 * existant n'est cassé par une suppression de catalogue (effet futur seulement).
 */
export function traitLabelOf(idx: Map<string, string>, traitId: string): string {
  const known = idx.get(traitId);
  if (known !== undefined) return known;
  const slugPart = traitId.includes(':') ? traitId.slice(traitId.indexOf(':') + 1) : traitId;
  const human = slugPart.replace(/-\d+$/, '').replace(/-/g, ' ').trim();
  return human.length > 0 ? human : traitId;
}

/** Résumé pour une ligne de liste : nom, espèce/génération, date, âge, statut, pouvoir(s) avec P/M. */
export function buildListRow(
  person: Personne,
  catalog: Catalog,
  _currentYear: number, // conservé pour la stabilité de signature ; l'âge vient de person.age (Feature 015)
  genesisYear: number,
) {
  return {
    id: person.id,
    nom: person.nom,
    especeId: person.especeId,
    generation: computeGeneration(yearOf(person.dateNaissance), genesisYear),
    dateNaissance: person.dateNaissance,
    age: person.age, // âge suivi (Feature 015)
    vivant: person.vivant,
    // Étiquettes enrichies (Feature 010) : libellé + puissance + maîtrise (valeurs de la fiche).
    pouvoirs: person.pouvoirs.map((p) => ({
      label: powerLabel(p, catalog),
      puissance: p.puissance,
      maitrise: p.maitrise,
    })),
  };
}

/**
 * Vue détaillée d'un individu (US2). `population` (optionnelle) sert à résoudre les **noms** des
 * enfants (FR-015) ; sans elle, les noms retombent sur l'id.
 */
export function buildFicheView(
  person: Personne,
  catalog: Catalog,
  _currentYear: number, // conservé pour la stabilité de signature ; l'âge vient de person.age (Feature 015)
  genesisYear: number,
  population: readonly Personne[] = [],
): FicheView {
  const idx = labelIndex(catalog);
  const resilById = new Map(person.adn.traits.map((t) => [t.traitId, t.resilience]));
  const nameById = new Map(population.map((p) => [p.id, p.nom]));

  const toView = (t: { traitId: string; resilience: number }): TraitView => ({
    traitId: t.traitId,
    label: traitLabelOf(idx, t.traitId),
    resilience: t.resilience,
    type: traitTypeOf(t.traitId),
  });

  // ADN complet (US3) : traits actifs et inactifs, chacun avec sa résilience.
  const traitsActifs: TraitView[] = person.adn.traits.filter((t) => t.active).map(toView);
  const traitsInactifs: TraitView[] = person.adn.traits.filter((t) => !t.active).map(toView);

  const pouvoirs: PouvoirView[] = person.pouvoirs.map((p) => ({
    label: powerLabel(p, catalog),
    template: p.template,
    puissance: p.puissance,
    maitrise: p.maitrise,
    traits: p.traitIds.map((id) => ({
      traitId: id,
      label: traitLabelOf(idx, id),
      resilience: resilById.get(id) ?? 0,
      type: traitTypeOf(id),
    })),
  }));

  const enfants = person.enfants.map((id) => ({ id, nom: nameById.get(id) ?? id }));

  return {
    id: person.id,
    nom: person.nom,
    especeId: person.especeId,
    genreId: person.genreId,
    dateNaissance: person.dateNaissance,
    age: person.age, // âge suivi (Feature 015)
    generation: computeGeneration(yearOf(person.dateNaissance), genesisYear),
    vivant: person.vivant,
    raisonDeces: person.raisonDeces,
    immortel: person.immortel,
    pouvoirs,
    traitsActifs,
    traitsInactifs,
    enfants,
  };
}
