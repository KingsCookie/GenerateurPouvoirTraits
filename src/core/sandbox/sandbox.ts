import type { Rng } from '../rng/rng.js';
import type { AppState, Result } from '../state/serialize.js';
import type { Personne, Conjoint } from '../model/personne.js';
import { birthEvent, coupleEvent, divorceEvent } from '../model/event.js';
import { reproduce } from '../birth/reproduce.js';

// Sous-ensemble ÉDITABLE des attributs d'une Personne (jamais parents/enfants/conjoints) — Feature 7.
export type PersonDraft = Pick<
  Personne,
  | 'nom'
  | 'especeId'
  | 'genreId'
  | 'dateNaissance'
  | 'vivant'
  | 'raisonDeces'
  | 'adn'
  | 'pouvoirs'
  | 'notes'
>;
export type PersonPatch = Partial<PersonDraft>;

/** Plus grand suffixe séquentiel `prefix-NNN` parmi des ids (0 si aucun). */
function maxSeq(ids: Iterable<string>, prefix: string): number {
  let max = 0;
  const re = new RegExp(`^${prefix}-(\\d+)$`);
  for (const id of ids) {
    const m = re.exec(id);
    if (m) max = Math.max(max, Number(m[1]));
  }
  return max;
}

function yearOfIso(dateIso: string): number {
  const m = /^(-?\d+)-/.exec(dateIso);
  return m ? Number(m[1]) : 0;
}

/**
 * Reproduction manuelle (sandbox) : produit **`count` ≥ 1** enfants depuis `parentIds` (≥ 1) via le
 * moteur génétique (Feature 2), chacun né un jour aléatoire de `birthYear` (le `reproduce` tire le
 * jour via `rng`). Pose la parenté et émet les événements `birth`. **Pur** (RNG en paramètre) ;
 * ne mute pas `state`. `count < 1` ou `parentIds` vide / introuvables ⇒ état inchangé (no-op).
 */
export function manualReproduce(
  state: AppState,
  parentIds: string[],
  count: number,
  birthYear: number,
  rng: Rng,
): AppState {
  if (count < 1 || parentIds.length === 0) return state;
  const parentSet = new Set(parentIds);
  const parents = state.population.filter((p) => parentSet.has(p.id));
  if (parents.length === 0) return state;

  let counter = maxSeq(
    state.population.map((p) => p.id),
    'p',
  );
  const children: Personne[] = [];
  for (let i = 0; i < count; i++) {
    const childId = `p-${String(++counter).padStart(6, '0')}`;
    children.push(reproduce(parents, state.parameters, state.catalog, rng, { childId, birthYear }));
  }
  const childIds = children.map((c) => c.id);
  const population = state.population.map((p) =>
    parentSet.has(p.id) ? { ...p, enfants: [...p.enfants, ...childIds] } : p,
  );
  const events = childIds.map((id) => birthEvent(id, birthYear));
  return {
    ...state,
    population: [...population, ...children],
    history: [...state.history, ...events],
  };
}

/**
 * Crée un individu **autonome** (sans liens de parenté) à partir d'un brouillon d'attributs.
 * Émet un événement `birth` à l'année de sa date de naissance. Pur ; ne mute pas `state`.
 */
export function createPerson(state: AppState, draft: PersonDraft, newId: string): AppState {
  // Âge suivi (Feature 015) : dérivé de la date de naissance à la création (borné ≥ 0) ;
  // immortel par défaut faux (non éditable via le brouillon sandbox).
  const age = Math.max(0, state.currentYear - yearOfIso(draft.dateNaissance));
  const person: Personne = {
    id: newId,
    ...draft,
    age,
    immortel: false,
    parents: [],
    enfants: [],
    conjoints: [],
  };
  return {
    ...state,
    population: [...state.population, person],
    history: [...state.history, birthEvent(newId, yearOfIso(draft.dateNaissance))],
  };
}

/**
 * Clone les **attributs** d'un individu existant en une copie **autonome** (sans liens de parenté).
 * Émet un `birth`. Pur ; `sourceId` introuvable ⇒ état inchangé.
 */
export function clonePerson(state: AppState, sourceId: string, newId: string): AppState {
  const src = state.population.find((p) => p.id === sourceId);
  if (!src) return state;
  const copy: Personne = {
    id: newId,
    nom: src.nom,
    especeId: src.especeId,
    genreId: src.genreId,
    dateNaissance: src.dateNaissance,
    age: src.age, // clone : recopie l'âge suivi
    vivant: src.vivant,
    raisonDeces: src.raisonDeces,
    immortel: src.immortel,
    adn: { traits: src.adn.traits.map((t) => ({ ...t })) },
    pouvoirs: src.pouvoirs.map((pw) => ({ ...pw })),
    notes: src.notes,
    parents: [],
    enfants: [],
    conjoints: [],
  };
  return {
    ...state,
    population: [...state.population, copy],
    history: [...state.history, birthEvent(newId, yearOfIso(src.dateNaissance))],
  };
}

/**
 * Édite les **attributs** d'un individu (jamais parents/enfants/conjoints — réservés à la
 * reproduction/suppression). Pur ; `id` introuvable ⇒ état inchangé.
 */
export function editPerson(state: AppState, id: string, patch: PersonPatch): AppState {
  return {
    ...state,
    population: state.population.map((p) => (p.id === id ? { ...p, ...patch } : p)),
  };
}

/**
 * Supprime un individu **sans descendant** ; le retire **partout** (population, enfants des parents,
 * conjoints des partenaires — qui reviennent à leur état antérieur, couples) et purge ses événements
 * `birth`/`death` du journal. Pur ; `Err` si l'individu a des enfants ou est introuvable.
 */
export function deletePerson(state: AppState, id: string): Result<AppState> {
  const target = state.population.find((p) => p.id === id);
  if (!target) return { ok: false, error: `Individu introuvable : ${id}.` };
  if (target.enfants.length > 0) {
    return { ok: false, error: 'Suppression impossible : cet individu a des descendants.' };
  }

  const population = state.population
    .filter((p) => p.id !== id)
    .map((p) => {
      let next = p;
      if (next.parents.includes(id)) {
        next = { ...next, parents: next.parents.filter((x) => x !== id) };
      }
      if (next.enfants.includes(id)) {
        next = { ...next, enfants: next.enfants.filter((x) => x !== id) };
      }
      if (next.conjoints.some((c) => c.id === id)) {
        next = { ...next, conjoints: next.conjoints.filter((c) => c.id !== id) };
      }
      return next;
    });

  const couples = state.couples
    .map((c) =>
      c.memberIds.includes(id) ? { ...c, memberIds: c.memberIds.filter((m) => m !== id) } : c,
    )
    .filter((c) => c.memberIds.length >= 2);

  const history = state.history.filter(
    (e) => !((e.kind === 'birth' || e.kind === 'death') && e.personId === id),
  );

  return { ok: true, value: { ...state, population, couples, history } };
}

// --- Édition directe du cycle de vie conjugal (BUG-001 volet B) — purs, sans RNG ---
// La reconstruction historique (`reconstructAtYear`) projette couples/conjoints **à partir du journal
// d'événements** : ces fonctions émettent (`formCouple`→`couple`, `divorceCouple`→`divorce`) ou **purgent**
// (`dissolveConjugalLink`) les événements correspondants, tout en gardant les tableaux vivants
// (`conjoints`/`couples`) cohérents pour le « make it real ». Elles ne touchent **jamais** la parenté
// (`parents`/`enfants`, réservée à la reproduction — FR-011b) ni n'emploient d'aléatoire (INV-S12).

/**
 * Forme un couple **« actuel »** entre deux individus distincts (conjoints **symétriques**), crée le
 * `Couple` et émet un événement `couple` daté `year`. `Err` si individus identiques, introuvables, ou
 * **déjà en couple** ensemble. Pur ; ne mute pas `state`.
 */
export function formCouple(
  state: AppState,
  aId: string,
  bId: string,
  year: number,
): Result<AppState> {
  if (aId === bId) {
    return { ok: false, error: 'Un individu ne peut pas former un couple avec lui-même.' };
  }
  const a = state.population.find((p) => p.id === aId);
  const b = state.population.find((p) => p.id === bId);
  if (!a || !b) return { ok: false, error: `Individu introuvable : ${!a ? aId : bId}.` };
  if (a.conjoints.some((c) => c.id === bId && c.statut === 'actuel')) {
    return { ok: false, error: 'Ces deux individus forment déjà un couple.' };
  }

  const coupleId = `c-${String(
    maxSeq(
      state.couples.map((c) => c.id),
      'c',
    ) + 1,
  ).padStart(6, '0')}`;
  const setActuel = (p: Personne, otherId: string): Personne => {
    const conjoints: Conjoint[] = p.conjoints.some((c) => c.id === otherId)
      ? p.conjoints.map((c) => (c.id === otherId ? { ...c, statut: 'actuel' } : c))
      : [...p.conjoints, { id: otherId, statut: 'actuel' }];
    return { ...p, conjoints };
  };
  const population = state.population.map((p) =>
    p.id === aId ? setActuel(p, bId) : p.id === bId ? setActuel(p, aId) : p,
  );
  return {
    ok: true,
    value: {
      ...state,
      population,
      couples: [...state.couples, { id: coupleId, memberIds: [aId, bId], reproPct: null }],
      history: [...state.history, coupleEvent(coupleId, [aId, bId], year)],
    },
  };
}

/**
 * Divorce/sépare un couple **actif** : ses conjoints mutuels passent en **« ex »**, le `Couple` est
 * retiré de `couples`, et un événement `divorce` daté `year` est émis. `Err` si le couple est introuvable.
 * Pur ; ne mute pas `state`.
 */
export function divorceCouple(state: AppState, coupleId: string, year: number): Result<AppState> {
  const couple = state.couples.find((c) => c.id === coupleId);
  if (!couple) return { ok: false, error: `Couple introuvable : ${coupleId}.` };
  const members = new Set(couple.memberIds);
  const population = state.population.map((p) => {
    if (!members.has(p.id)) return p;
    return {
      ...p,
      conjoints: p.conjoints.map((c) =>
        members.has(c.id) && c.id !== p.id && c.statut === 'actuel'
          ? { ...c, statut: 'ex' as const }
          : c,
      ),
    };
  });
  return {
    ok: true,
    value: {
      ...state,
      population,
      couples: state.couples.filter((c) => c.id !== coupleId),
      history: [...state.history, divorceEvent(coupleId, year)],
    },
  };
}

/**
 * Dissout **totalement** un lien conjugal (retour **célibataire**) : retrait **symétrique** du lien chez
 * les membres + **purge** des événements `couple`/`divorce` du couple (il n'a jamais existé pour la
 * reconstruction). Fonctionne pour un couple actif (via `couples`) **ou** divorcé (via le journal). `Err`
 * si le couple est introuvable. Pur ; ne mute pas `state`.
 */
export function dissolveConjugalLink(state: AppState, coupleId: string): Result<AppState> {
  let memberIds = state.couples.find((c) => c.id === coupleId)?.memberIds;
  if (!memberIds) {
    for (const e of state.history) {
      if (e.kind === 'couple' && e.coupleId === coupleId) memberIds = e.memberIds;
    }
  }
  if (!memberIds) return { ok: false, error: `Couple introuvable : ${coupleId}.` };
  const members = new Set(memberIds);
  const population = state.population.map((p) => {
    if (!members.has(p.id)) return p;
    return { ...p, conjoints: p.conjoints.filter((c) => !(members.has(c.id) && c.id !== p.id)) };
  });
  return {
    ok: true,
    value: {
      ...state,
      population,
      couples: state.couples.filter((c) => c.id !== coupleId),
      history: state.history.filter(
        (e) => !((e.kind === 'couple' || e.kind === 'divorce') && e.coupleId === coupleId),
      ),
    },
  };
}
