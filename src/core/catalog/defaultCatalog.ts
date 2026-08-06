import type { Catalog, Trait } from '../model/trait.js';
import type { TraitType } from '../model/traitType.js';
import { TRAIT_TYPES } from '../model/traitType.js';
import type { Espece } from '../model/espece.js';
import { GENRE_TOUT } from '../model/espece.js';

// Listes de traits par défaut, embarquées comme données du cœur (D9). Source de référence :
// rsrc/ExempleTraits/*.txt (copie intégrée au bundle ; aucune I/O réseau au runtime).
const RAW: Record<TraitType, string[]> = {
  Remplacement: [
    'Pinces de crabe',
    'Mandibule',
    'Tentacules',
    'Main',
    'Structure osseuse',
    'Halo divin',
    'Moteur',
    'Ronce',
    'Fleur',
    'Miroir',
    'Aiguillon',
    'Ombre démoniaque',
  ],
  PartieCorps: [
    'Indexs',
    'Doigts',
    'Mains',
    'Pieds',
    'Bras',
    'Jambes',
    'Bas du dos',
    'Colonne vertébrale',
    'Omoplates',
    'Cou',
    'Épaule',
    'Yeux',
    'Nez',
    'Langue',
    'Bouche',
    'Front',
    'Corps entier',
    'Peau',
    'Canine',
    'Dent',
    'Cheveux',
    'Coté gauche',
    'Coté droit',
  ],
  Etat: [
    'Lumineux',
    'Visqueux',
    'Rocailleux',
    'Invisible',
    'Gazeux',
    'Froid',
    'Chaud',
    'Mous',
    'Vibrant',
    'Musical',
    'Plus grand',
    'Plus petit',
    'Plasmique',
    'gelatineux',
    'détachable',
  ],
  Element: [
    'sois-même',
    'tissu',
    'mana',
    'pouvoir',
    'chat',
    'cuir',
    'esprit',
    'or',
    'metaux',
    'oiseaux',
    'eau',
    'feu',
    'caillou',
    'air',
    'papier',
    'lumière',
    'diamant',
    'verre',
    'Lézard',
    'Serpent',
    'encre',
    'fleur',
    'sang',
    'nuage',
    'bois',
    'lait',
    'électricité',
    'plume',
    'ombre',
    'livres',
    'céramique',
    'uranium',
    'cochon',
    'os',
    'chaire',
    'humain',
    'plastique',
    'rongeur',
    'insecte',
  ],
  Ajout: [
    'Fourrure',
    'Plume',
    'Tentacules',
    'Pic osseux',
    'Carapace',
    'Cristaux',
    'Bras',
    'Jambes',
    'Cerveau',
    'Oeil',
    'Yeux',
    'Mâchoire',
    'Paillettes',
    'Tache sombre',
    'Tache de couleur',
    'Branchies',
    'Nageoires',
    'Écailles',
    'Muscle supplémentaire',
    'Halo divin',
    'Écorce',
    'Ronce',
    'Liane',
    'Fleur',
    'Aiguillon',
    'Ombre démoniaque',
  ],
  Action: [
    'soigne avec',
    'contrôle',
    'créé',
    'fait exploser',
    'Invulnérable au',
    'Communique avec',
    'attire/repousse',
    'traverse',
    'se transforme en',
    'Restaure',
    'Absorbe/se nourrit de',
    'liquéfie',
    'pétrifie',
    'anime',
    'brule',
    'efface',
    'rends invisible',
    'alourdis / allège',
    'anticipe',
    'plante',
    'possède',
    'gélifie',
    'électrifie',
    'Vaporise',
    'Créer des lames en',
    'Créer des boucliers en',
    'Créer des masses en',
    'Créer des armures en',
    'Agrandi/rétréci',
    'Teleporte',
    'Ameliore/renforce',
  ],
};

// Slug stable et déterministe pour l'id de trait (sans dépendre de la casse/accents
// pour l'unicité fonctionnelle, mais en conservant un identifiant lisible).
export function slug(label: string): string {
  return label
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Catalogue par défaut : 6 types, ids stables `type:slug-i`. Les traits ne portent **aucune
 * surcharge de poids** (`weight = null`) ⇒ ils héritent du poids de leur type
 * (`traitTypeWeights`, défaut 1 — Feature 5). Régler le poids d'un type biaise donc bien tous
 * ses traits non surchargés.
 */
export function defaultCatalog(): Catalog {
  const byType = {} as Record<TraitType, Trait[]>;
  for (const type of TRAIT_TYPES) {
    byType[type] = RAW[type].map((label, i) => ({
      id: `${type}:${slug(label)}-${i}`,
      type,
      label,
      weight: null,
    }));
  }
  return { byType };
}

/** Espèce par défaut « humain » avec le genre spécial « tout » (FR-007, FR-011). */
export function defaultEspece(): Espece {
  return {
    id: 'humain',
    label: 'Humain',
    genres: [
      { id: GENRE_TOUT, label: 'Tout' },
      { id: 'feminin', label: 'Féminin' },
      { id: 'masculin', label: 'Masculin' },
    ],
    // Défauts humain (clarification + plan §Décisions de paramètres par défaut).
    reproStartAge: 18,
    reproPeakAge: 25,
    reproEndAge: 50,
    reproPeakPct: 40,
    reproSlope: 8,
    groupSize: 2,
    litterMin: 1,
    litterMax: 4,
    litterExtraPct: 15,
    divorcePct: 0,
    // Mort naturelle (Feature 015, §9.4) : défauts humain.
    esperanceVie: 60,
    mortNaturellePct: 10,
  };
}

/** Toutes les espèces par défaut (Feature 1 : uniquement « humain »). */
export function defaultEspeces(): Espece[] {
  return [defaultEspece()];
}
