import type { Rng } from '../rng/rng.js';
import type { AppState } from '../state/serialize.js';
import type { Personne } from '../model/personne.js';
import type { Espece } from '../model/espece.js';
import type { Couple } from '../model/couple.js';
import type { PopulationEvent } from '../model/event.js';
import { birthEvent, coupleEvent, divorceEvent, deathEvent } from '../model/event.js';
import { reproduce } from '../birth/reproduce.js';
import { reproProbability } from '../repro/gaussian.js';
import { litterSize } from '../repro/litter.js';
import { selectCandidates } from '../repro/candidates.js';
import { formCouples } from '../repro/pairing.js';

// Copie de travail d'une personne (tableaux clonés pour mutation locale sûre).
function clonePerson(p: Personne): Personne {
  return { ...p, conjoints: p.conjoints.map((c) => ({ ...c })), enfants: [...p.enfants] };
}

function maxSeq(ids: Iterable<string>, prefix: string): number {
  let max = 0;
  const re = new RegExp(`^${prefix}-(\\d+)$`);
  for (const id of ids) {
    const m = re.exec(id);
    if (m) max = Math.max(max, Number(m[1]));
  }
  return max;
}

/**
 * Applique **un** tick annuel déterministe (§6.6) à l'état et renvoie le **nouvel** état (immuable).
 * Ordre fixe (Feature 015) : **vieillissement** (age +1 des vivants) → divorces → candidats & volonté
 * (gaussienne) → appariement → reproduction des nouveaux couples puis des couples existants → **mort
 * naturelle** (dernière étape, §6.6 pt 3) → `currentYear += 1`.
 */
export function tick(state: AppState, rng: Rng): AppState {
  const { parameters, catalog, especes, currentYear } = state;
  const especeById = new Map(especes.map((e) => [e.id, e]));

  // Copies de travail.
  const byId = new Map<string, Personne>();
  for (const p of state.population) byId.set(p.id, clonePerson(p));

  let childCounter = maxSeq(byId.keys(), 'p');
  let coupleCounter = maxSeq(
    state.couples.map((c) => c.id),
    'c',
  );
  const nextChildId = (): string => `p-${String(++childCounter).padStart(6, '0')}`;
  const nextCoupleId = (): string => `c-${String(++coupleCounter).padStart(6, '0')}`;

  // Journal d'événements daté (Feature 7) : naissances/couples/divorces/décès de l'année courante.
  const events: PopulationEvent[] = [];

  const especeOfCouple = (couple: Couple): Espece | undefined =>
    especeById.get(byId.get(couple.memberIds[0])?.especeId ?? '');

  // 0. Vieillissement (Feature 015, §6.5) : l'avancée de la date fait vieillir les **vivants** de
  // +1 an. Les morts ne vieillissent pas (âge figé). Les nouveau-nés de l'année (ajoutés plus bas)
  // restent à 0 an.
  for (const p of byId.values()) {
    if (p.vivant) p.age += 1;
  }

  // 1. Divorces potentiels (couples dans l'ordre stable).
  const survivingCouples: Couple[] = [];
  for (const couple of state.couples) {
    const espece = especeOfCouple(couple);
    const divorces = espece ? rng.chance(espece.divorcePct) : false;
    if (divorces) {
      // Les conjoints actuels mutuels deviennent « ex ».
      for (const memberId of couple.memberIds) {
        const m = byId.get(memberId);
        if (!m) continue;
        for (const c of m.conjoints) {
          if (c.statut === 'actuel' && couple.memberIds.includes(c.id)) c.statut = 'ex';
        }
      }
      events.push(divorceEvent(couple.id, currentYear));
    } else {
      survivingCouples.push(couple);
    }
  }

  // 2. Candidats (vivants, célibataires/divorcés, âge ≤ max) + volonté (gaussienne).
  const population = [...byId.values()];
  const candidateIds = selectCandidates(population, currentYear, especeById, rng);

  // 3. Appariement (même espèce, anti-consanguinité ; genre ignoré en F3).
  const { couples: newCouples } = formCouples(
    candidateIds,
    population,
    parameters,
    especeById,
    rng,
    nextCoupleId,
  );

  // Poser les conjoints « actuel » mutuels des nouveaux couples.
  for (const couple of newCouples) {
    for (const memberId of couple.memberIds) {
      const m = byId.get(memberId);
      if (!m) continue;
      for (const otherId of couple.memberIds) {
        if (otherId !== memberId) m.conjoints.push({ id: otherId, statut: 'actuel' });
      }
    }
    events.push(coupleEvent(couple.id, couple.memberIds, currentYear));
  }

  // 4. Reproduction. Helper : produit une portée pour un couple donné.
  const newChildren: Personne[] = [];
  const reproduceCouple = (couple: Couple, espece: Espece): void => {
    const parents = couple.memberIds.map((id) => byId.get(id)).filter((p): p is Personne => !!p);
    if (parents.length === 0) return;
    const n = litterSize(espece, rng);
    // US2 : jour de naissance tiré **une seule fois** par portée, partagé par toute la fratrie.
    const birthDayOfYear = rng.nextInt(365);
    for (let i = 0; i < n; i++) {
      const childId = nextChildId();
      const child = reproduce(parents, parameters, catalog, rng, {
        childId,
        birthYear: currentYear,
        birthDayOfYear,
      });
      for (const parent of parents) parent.enfants.push(childId);
      byId.set(childId, child);
      newChildren.push(child);
      events.push(birthEvent(childId, currentYear));
    }
  };

  // 4a. Nouveaux couples (reproduisent dès l'année de formation).
  for (const couple of newCouples) {
    const espece = especeOfCouple(couple);
    if (espece) reproduceCouple(couple, espece);
  }

  // 4b. Couples existants (survivants au divorce) : % issu de la gaussienne, éditable par couple.
  for (const couple of survivingCouples) {
    const espece = especeOfCouple(couple);
    if (!espece) continue;
    const members = couple.memberIds.map((id) => byId.get(id)).filter((p): p is Personne => !!p);
    if (members.length === 0) continue;
    const avgAge = members.reduce((s, m) => s + m.age, 0) / members.length;
    const pct = couple.reproPct ?? reproProbability(avgAge, espece);
    if (rng.chance(pct)) reproduceCouple(couple, espece);
  }

  // 5. Mort naturelle (Feature 015, §6.6 pt 3) — **dernière** étape, sur la population dans l'ordre
  // stable. Testée uniquement pour les individus **vivants, non immortels, d'âge ≥ espérance de vie**
  // de leur espèce ; seul ce sous-ensemble consomme un tirage `rng.chance` (déterminisme, §R4).
  let finalCouples: Couple[] = [...survivingCouples, ...newCouples];
  for (const person of byId.values()) {
    if (!person.vivant || person.immortel) continue;
    const espece = especeById.get(person.especeId);
    if (!espece || person.age < espece.esperanceVie) continue;
    if (!rng.chance(espece.mortNaturellePct)) continue;
    // Décès naturel : cause fixe + dissolution du couple éventuel (conjoints actuels → « ex »).
    person.vivant = false;
    person.raisonDeces = 'mort naturelle';
    const couple = finalCouples.find((c) => c.memberIds.includes(person.id));
    if (couple) {
      const memberSet = new Set(couple.memberIds);
      for (const memberId of couple.memberIds) {
        const m = byId.get(memberId);
        if (!m) continue;
        for (const c of m.conjoints) {
          if (c.statut === 'actuel' && memberSet.has(c.id)) c.statut = 'ex';
        }
      }
      finalCouples = finalCouples.filter((c) => c.id !== couple.id);
    }
    events.push(deathEvent(person.id, currentYear));
  }

  // 6. Avance de l'année.
  return {
    ...state,
    population: [...byId.values()],
    couples: finalCouples,
    currentYear: currentYear + 1,
    rngState: rng.getState(),
    history: [...state.history, ...events],
  };
}

/**
 * Avance la simulation de `years` années (≥ 1) en appliquant le tick année par année.
 * L'état renvoyé porte le `rngState` final (continuation déterministe, FR-021).
 */
export function advanceYears(state: AppState, years: number, rng: Rng): AppState {
  let current = state;
  const n = Math.max(1, Math.floor(years));
  for (let i = 0; i < n; i++) current = tick(current, rng);
  return current;
}
