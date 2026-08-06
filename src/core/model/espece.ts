// Genre spécial toujours présent dans une espèce (data-model.md, FR-011).
export const GENRE_TOUT = 'tout';

export interface Genre {
  id: string;
  label: string;
}

export interface Espece {
  id: string;
  label: string;
  genres: Genre[]; // contient toujours le genre spécial « tout »

  // --- Paramètres de reproduction (Feature 3, §9.4). Cf. data-model.md. ---
  reproStartAge: number; // âge de début de reproduction
  reproPeakAge: number; // âge du pic de probabilité
  reproEndAge: number; // âge de fin/maximal ; au-delà, probabilité nulle
  reproPeakPct: number; // probabilité (%) au pic [0..100]
  reproSlope: number; // pente = écart-type (années, > 0) de la cloche
  groupSize: number; // taille du groupe de reproduction (≥ 1)
  litterMin: number; // M — enfants garantis (≥ 0)
  litterMax: number; // N — plafond (≥ M)
  litterExtraPct: number; // X — chance (%) d'un enfant supplémentaire [0..100]
  divorcePct: number; // chance (%) de divorce par an et par couple [0..100]

  // --- Mort naturelle (Feature 015, §6.7 / §9.4). ---
  esperanceVie: number; // âge (entier ≥ 0) à partir duquel la mort naturelle devient possible
  mortNaturellePct: number; // chance (%) de mort naturelle par an au-delà de l'espérance [0..100]
}
