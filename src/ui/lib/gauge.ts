// Dérivation d'état d'une jauge de mesure (Puissance / Maîtrise), Feature 014.
// PURE et sans dépendance DOM/Svelte : testable en isolation (voir tests/unit/gauge.test.ts).
// Règles (rsrc/jauges-etats-extremes.md §2) : v < 0 → rompu ; 0 ≤ v ≤ max → normal ; v > max → surchargé.
// La valeur n'est jamais bornée ici : seul l'état visuel est dérivé (P/M non plafonnées, cf. §7.2).

export type GaugeState = 'broken' | 'normal' | 'overloaded';

/** État visuel d'une jauge pour une valeur donnée (défaut max = 10, borne haute du barème). */
export function gaugeState(value: number, max = 10): GaugeState {
  if (value < 0) return 'broken';
  if (value > max) return 'overloaded';
  return 'normal';
}
