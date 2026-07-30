<script lang="ts">
  import {
    TRAIT_TYPES,
    traitTypeOf,
    validateResiliencePatch,
    type TraitType,
    type ResiliencePatch,
  } from '../../core/index.js';
  import {
    parameters,
    catalog,
    setParam,
    setResiliencePatch,
    clearResiliencePatch,
    propagateResilienceType,
  } from '../stores/appState.js';

  const TYPE_LABELS: Record<TraitType, string> = {
    Remplacement: 'Remplacement',
    PartieCorps: 'Partie du corps',
    Etat: 'État',
    Element: 'Élément',
    Ajout: 'Ajout',
    Action: 'Action',
  };

  const FIELDS: { key: keyof ResiliencePatch; label: string }[] = [
    { key: 'initial', label: 'Initiale' },
    { key: 'max', label: 'Maximale' },
    { key: 'disappearThreshold', label: 'Seuil' },
  ];

  let error: string | null = null;

  function clampNum(raw: string): number {
    const v = Number(raw);
    return Number.isFinite(v) ? Math.min(100, Math.max(0, v)) : 0;
  }

  // Niveau global : écrit la base (initialResilience / resilienceMax / disappearThreshold).
  const GLOBAL_PARAM: Record<
    keyof ResiliencePatch,
    'initialResilience' | 'resilienceMax' | 'disappearThreshold'
  > = {
    initial: 'initialResilience',
    max: 'resilienceMax',
    disappearThreshold: 'disappearThreshold',
  };
  function onGlobal(field: keyof ResiliencePatch, e: Event) {
    setParam(GLOBAL_PARAM[field], clampNum((e.target as HTMLInputElement).value));
  }
  $: globalVal = (field: keyof ResiliencePatch): number => $parameters[GLOBAL_PARAM[field]];

  // Niveau type : surcharge par champ ; vide ⇒ réhérite du global.
  function onType(type: TraitType, field: keyof ResiliencePatch, e: Event) {
    const raw = (e.target as HTMLInputElement).value;
    const cur: ResiliencePatch = { ...($parameters.resilienceOverrides.byType[type] ?? {}) };
    if (raw.trim() === '') delete cur[field];
    else cur[field] = clampNum(raw);
    const v = validateResiliencePatch(cur);
    if (!v.ok) {
      error = v.error ?? 'Valeur invalide.';
      return;
    }
    error = null;
    setResiliencePatch({ level: 'type', type }, cur);
  }

  // Niveau trait : sélection d'un trait + surcharge par champ.
  let selectedTraitId = '';
  function onTrait(field: keyof ResiliencePatch, e: Event) {
    if (!selectedTraitId) return;
    const raw = (e.target as HTMLInputElement).value;
    const cur: ResiliencePatch = {
      ...($parameters.resilienceOverrides.byTrait[selectedTraitId] ?? {}),
    };
    if (raw.trim() === '') delete cur[field];
    else cur[field] = clampNum(raw);
    const v = validateResiliencePatch(cur);
    if (!v.ok) {
      error = v.error ?? 'Valeur invalide.';
      return;
    }
    error = null;
    setResiliencePatch({ level: 'trait', traitId: selectedTraitId }, cur);
  }

  // Libellé d'un trait depuis son id (repli sur l'id si introuvable).
  function traitLabel(traitId: string): string {
    for (const type of TRAIT_TYPES) {
      const t = $catalog.byType[type].find((x) => x.id === traitId);
      if (t) return `${TYPE_LABELS[type]} · ${t.label}`;
    }
    return traitId;
  }

  $: typeOverrides = $parameters.resilienceOverrides.byType;
  $: traitOverrides = Object.keys($parameters.resilienceOverrides.byTrait);
  $: selectedPatch = selectedTraitId
    ? ($parameters.resilienceOverrides.byTrait[selectedTraitId] ?? {})
    : {};
  // Valeur héritée affichée en placeholder pour un trait : type sinon global.
  function inheritedForTrait(field: keyof ResiliencePatch): number {
    const type = selectedTraitId ? traitTypeOf(selectedTraitId) : undefined;
    return (type && typeOverrides[type]?.[field]) ?? globalVal(field);
  }
</script>

<div class="resilience">
  <p class="hint">
    Résilience déclinée sur 3 niveaux : <strong>global → type → trait</strong>. Chaque champ est
    indépendant ; laissez vide pour <strong>hériter</strong> du niveau supérieur. «&nbsp;Propager&nbsp;»
    efface les surcharges de trait d'un type.
  </p>

  {#if error}<p class="error">{error}</p>{/if}

  <!-- Global -->
  <fieldset class="lvl">
    <legend>Global (base)</legend>
    <div class="row">
      {#each FIELDS as f (f.key)}
        <label class="field">
          <span>{f.label} (%)</span>
          <input
            type="number"
            min="0"
            max="100"
            value={globalVal(f.key)}
            on:input={(e) => onGlobal(f.key, e)}
          />
        </label>
      {/each}
    </div>
  </fieldset>

  <!-- Par type -->
  <fieldset class="lvl">
    <legend>Par type de trait</legend>
    <table>
      <thead>
        <tr>
          <th>Type</th>
          {#each FIELDS as f (f.key)}<th>{f.label}</th>{/each}
          <th></th>
        </tr>
      </thead>
      <tbody>
        {#each TRAIT_TYPES as type (type)}
          <tr>
            <td class="type-name" data-label="Type">{TYPE_LABELS[type]}</td>
            {#each FIELDS as f (f.key)}
              <td data-label={`${f.label} (%)`}>
                <input
                  type="number"
                  min="0"
                  max="100"
                  placeholder={`${globalVal(f.key)}`}
                  value={typeOverrides[type]?.[f.key] ?? ''}
                  on:input={(e) => onType(type, f.key, e)}
                />
              </td>
            {/each}
            <td class="propagate-cell">
              <button
                type="button"
                class="propagate"
                title="Effacer les surcharges de trait de ce type"
                on:click={() => propagateResilienceType(type)}>Propager</button
              >
            </td>
          </tr>
        {/each}
      </tbody>
    </table>
  </fieldset>

  <!-- Par trait -->
  <fieldset class="lvl">
    <legend>Par trait</legend>
    <label class="field select">
      <span>Trait</span>
      <select bind:value={selectedTraitId}>
        <option value="">— choisir un trait —</option>
        {#each TRAIT_TYPES as type (type)}
          <optgroup label={TYPE_LABELS[type]}>
            {#each $catalog.byType[type] as t (t.id)}
              <option value={t.id}>{t.label}</option>
            {/each}
          </optgroup>
        {/each}
      </select>
    </label>

    {#if selectedTraitId}
      <div class="row">
        {#each FIELDS as f (f.key)}
          <label class="field">
            <span>{f.label} (%)</span>
            <input
              type="number"
              min="0"
              max="100"
              placeholder={`${inheritedForTrait(f.key)}`}
              value={selectedPatch[f.key] ?? ''}
              on:input={(e) => onTrait(f.key, e)}
            />
          </label>
        {/each}
        <button
          type="button"
          class="del"
          on:click={() => clearResiliencePatch({ level: 'trait', traitId: selectedTraitId })}
          >Réinitialiser ce trait</button
        >
      </div>
    {/if}

    {#if traitOverrides.length > 0}
      <ul class="overridden">
        {#each traitOverrides as id (id)}
          <li>
            <button type="button" class="link" on:click={() => (selectedTraitId = id)}
              >{traitLabel(id)}</button
            >
            <button
              type="button"
              class="del"
              title="Réinitialiser"
              on:click={() => clearResiliencePatch({ level: 'trait', traitId: id })}>✕</button
            >
          </li>
        {/each}
      </ul>
    {/if}
  </fieldset>
</div>

<style>
  .resilience {
    display: flex;
    flex-direction: column;
    gap: 0.7rem;
  }
  .hint {
    margin: 0;
    color: var(--fg-muted);
    font-size: 0.8rem;
    line-height: 1.4;
  }
  .lvl {
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 0.5rem 0.7rem 0.7rem;
  }
  legend {
    font-size: 0.8rem;
    font-weight: 700;
    color: var(--accent);
    padding: 0 0.4rem;
  }
  .row {
    display: flex;
    flex-wrap: wrap;
    gap: 0.6rem;
    align-items: end;
  }
  .field {
    display: flex;
    flex-direction: column;
    gap: 0.2rem;
    font-size: 0.78rem;
    color: var(--fg-muted);
  }
  .field input {
    width: 6rem;
  }
  .field.select select {
    min-width: 14rem;
  }
  table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.8rem;
  }
  th {
    text-align: left;
    color: var(--fg-muted);
    font-weight: 600;
    padding: 0.2rem 0.3rem;
  }
  td {
    padding: 0.15rem 0.3rem;
  }
  td input {
    width: 4.5rem;
  }
  .type-name {
    white-space: nowrap;
  }
  .propagate {
    font-size: 0.75rem;
  }
  .overridden {
    list-style: none;
    margin: 0.5rem 0 0;
    padding: 0;
    display: flex;
    flex-wrap: wrap;
    gap: 0.4rem;
  }
  .overridden li {
    display: flex;
    align-items: center;
    gap: 0.2rem;
    border: 1px solid var(--border);
    border-radius: 999px;
    padding: 0.1rem 0.2rem 0.1rem 0.5rem;
    font-size: 0.75rem;
  }
  .link {
    background: none;
    border: none;
    color: var(--accent);
    cursor: pointer;
    padding: 0;
    font-size: 0.75rem;
  }
  .del {
    color: var(--danger, #c0392b);
  }
  .error {
    color: var(--danger, #c0392b);
    font-size: 0.8rem;
    margin: 0;
  }

  /* ===== Mobile (Feature 013, BUG-001) : la table « Par type » ne doit pas déborder =====
     Sous 760 px, la table passe en cartes empilées (une carte par type) ; le sélecteur et les
     champs prennent la largeur disponible. Aucune valeur en dur : tokens uniquement. */
  @media (max-width: 760px) {
    /* Sélecteur « Par trait » : ne plus imposer 14rem (débordement sur petit écran). */
    .field.select select {
      min-width: 0;
      width: 100%;
    }
    .field input {
      width: 100%;
    }

    /* Table « Par type de trait » → cartes à lignes. */
    table,
    thead,
    tbody,
    tr,
    td {
      display: block;
      width: 100%;
    }
    thead {
      /* en-têtes de colonnes remplacés par les libellés en ligne (data-label) */
      position: absolute;
      width: 1px;
      height: 1px;
      overflow: hidden;
      clip: rect(0 0 0 0);
      white-space: nowrap;
    }
    tbody tr {
      border: 1px solid var(--border);
      border-radius: var(--radius);
      padding: 0.4rem 0.6rem;
      margin-bottom: 0.5rem;
    }
    td {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.6rem;
      padding: 0.25rem 0;
    }
    td::before {
      content: attr(data-label);
      color: var(--fg-muted);
      font-size: 0.78rem;
    }
    td.type-name {
      font-weight: 700;
      color: var(--accent);
      border-bottom: 1px solid var(--border);
      padding-bottom: 0.35rem;
      margin-bottom: 0.25rem;
    }
    td input {
      width: 5rem;
      text-align: right;
    }
    td.propagate-cell {
      justify-content: flex-end;
    }
    td.propagate-cell::before {
      content: none;
    }
  }
</style>
