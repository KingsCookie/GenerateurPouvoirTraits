<script lang="ts">
  import { population, genesisYear, currentYear, getCatalog } from '../stores/appState.js';
  import {
    criteria,
    generationTouched,
    setNameQuery,
    toggleInSet,
    setTraitScope,
    setPowerPresence,
    setTraitPresence,
    resetFilters,
  } from '../stores/filters.js';
  import {
    resetSort,
    cycleSort,
    listeSort,
    sbSort,
    listePageSize,
    sbPageSize,
    setListePageSize,
    setSbPageSize,
    isMobile,
    type ListName,
    type PageSize,
  } from '../stores/ui.js';
  import MobileSheet from './MobileSheet.svelte';
  import {
    computeGeneration,
    yearOf,
    lastGeneration,
    filterPopulation,
    TRAIT_TYPES,
    type PowerPresence,
    type TraitScope,
    type TraitPresence,
    type SortKey,
  } from '../../core/index.js';

  // Liste hôte : détermine quel état de tri « Réinitialiser » remet à zéro (FR-018).
  export let list: ListName = 'population';

  const catalog = getCatalog();

  // ===== Mobile (Feature 013) : barre compacte + panneau plein écran =====
  let filterSheetOpen = false;
  const SORT_LABELS: Record<Exclude<SortKey, null>, string> = {
    nom: 'nom',
    naissance: 'naissance',
    age: 'âge',
  };
  const SORT_KEYS: Exclude<SortKey, null>[] = ['nom', 'naissance', 'age'];
  const PAGE_SIZES: { value: PageSize; label: string }[] = [
    { value: 50, label: '50' },
    { value: 100, label: '100' },
    { value: 250, label: '250' },
    { value: 1000, label: '1000' },
    { value: 'all', label: 'Tous' },
  ];
  $: sort = list === 'population' ? $listeSort : $sbSort;
  $: pageSize = list === 'population' ? $listePageSize : $sbPageSize;
  function setSize(v: PageSize): void {
    if (list === 'population') setListePageSize(v);
    else setSbPageSize(v);
  }
  function sortLabel(key: SortKey): string {
    return key ? SORT_LABELS[key] : 'défaut';
  }
  // Compte de filtres actifs (pastille du bouton ⚙ Filtrer).
  $: activeCount =
    ($criteria.nameQuery ? 1 : 0) +
    $criteria.generations.size +
    $criteria.especeIds.size +
    $criteria.statuses.size +
    ($criteria.powerPresence ? 1 : 0) +
    ($criteria.traitPresence ? 1 : 0) +
    ($criteria.traitIds.size ? 1 : 0);
  // Compte de résultats en direct (bouton bas « Voir les N individus » — FR-017).
  $: effGenerations =
    $generationTouched || derniere === null ? $criteria.generations : new Set<number>([derniere]);
  $: matchCount = filterPopulation(
    $population,
    { ...$criteria, generations: effGenerations },
    { currentYear: $currentYear, genesisYear: $genesisYear },
  ).length;
  function powerLabelOf(v: PowerPresence): string {
    return POWER_OPTIONS.find((o) => o.value === v)?.label ?? '';
  }
  function presenceLabelOf(v: TraitPresence): string {
    return PRESENCE_OPTIONS.find((o) => o.value === v)?.label ?? '';
  }

  // Générations présentes dans la population (triées).
  $: generations = [
    ...new Set($population.map((p) => computeGeneration(yearOf(p.dateNaissance), $genesisYear))),
  ].sort((a, b) => a - b);
  // Espèces présentes (triées).
  $: especes = [...new Set($population.map((p) => p.especeId))].sort();
  // Dernière génération (pour l'indication du défaut dynamique).
  $: derniere = lastGeneration($population, $genesisYear);

  // Catalogue de traits (ordre canonique des types) : {id, label}.
  const traits: { id: string; label: string }[] = TRAIT_TYPES.flatMap((t) =>
    catalog.byType[t].map((tr) => ({ id: tr.id, label: tr.label })),
  );

  const POWER_OPTIONS: { value: Exclude<PowerPresence, null>; label: string }[] = [
    { value: 'any', label: 'A un pouvoir' },
    { value: 'none', label: 'Aucun pouvoir' },
  ];
  const SCOPES: { value: TraitScope; label: string }[] = [
    { value: 'actifs', label: 'actifs' },
    { value: 'inactifs', label: 'inactifs' },
    { value: 'tous', label: 'tous' },
  ];

  // Présence de trait (mono-sélection ; re-clic ⇒ null) — Feature 010.
  const PRESENCE_OPTIONS: { value: Exclude<TraitPresence, null>; label: string }[] = [
    { value: 'none-active', label: 'aucun trait actif' },
    { value: 'some-active', label: 'au moins un trait actif' },
    { value: 'some-inactive', label: 'au moins un trait inactif' },
    { value: 'some-any', label: 'au moins un trait' },
  ];

  function onPower(v: Exclude<PowerPresence, null>) {
    setPowerPresence($criteria.powerPresence === v ? null : v);
  }
  function onPresence(v: Exclude<TraitPresence, null>) {
    setTraitPresence($criteria.traitPresence === v ? null : v);
  }
  function onReset() {
    resetFilters();
    resetSort(list); // « Réinitialiser » remet aussi le tri de la liste concernée (FR-018).
  }
</script>

{#if $isMobile}
  <!-- ===== Barre de filtres mobile (Feature 013) ===== -->
  <div class="mfilter-bar">
    <button
      type="button"
      class="filter-btn nav-item"
      class:is-active={activeCount > 0}
      on:click={() => (filterSheetOpen = true)}
    >
      ⚙ Filtrer
      {#if activeCount > 0}<span class="badge">{activeCount}</span>{/if}
    </button>
    <div class="active-chips">
      {#if $criteria.nameQuery}
        <button type="button" class="fchip" on:click={() => setNameQuery('')}
          >« {$criteria.nameQuery} » <span class="x" aria-hidden="true">✕</span></button
        >
      {/if}
      {#each [...$criteria.generations] as g (g)}
        <button type="button" class="fchip" on:click={() => toggleInSet('generations', g)}
          >génération {g} <span class="x" aria-hidden="true">✕</span></button
        >
      {/each}
      {#each [...$criteria.especeIds] as e (e)}
        <button type="button" class="fchip" on:click={() => toggleInSet('especeIds', e)}
          >{e} <span class="x" aria-hidden="true">✕</span></button
        >
      {/each}
      {#each [...$criteria.statuses] as s (s)}
        <button type="button" class="fchip" on:click={() => toggleInSet('statuses', s)}
          >{s} <span class="x" aria-hidden="true">✕</span></button
        >
      {/each}
      {#if $criteria.powerPresence}
        <button type="button" class="fchip" on:click={() => setPowerPresence(null)}
          >{powerLabelOf($criteria.powerPresence)}
          <span class="x" aria-hidden="true">✕</span></button
        >
      {/if}
      {#if $criteria.traitPresence}
        <button type="button" class="fchip" on:click={() => setTraitPresence(null)}
          >{presenceLabelOf($criteria.traitPresence)}
          <span class="x" aria-hidden="true">✕</span></button
        >
      {/if}
      {#if $criteria.traitIds.size}
        <button type="button" class="fchip" on:click={() => (filterSheetOpen = true)}
          >{$criteria.traitIds.size} trait(s)</button
        >
      {/if}
      <button type="button" class="fchip neutral" on:click={() => (filterSheetOpen = true)}>
        tri : {sortLabel(sort.key)}{sort.key ? (sort.dir === 'asc' ? ' ▲' : ' ▼') : ''}
      </button>
    </div>
  </div>

  {#if filterSheetOpen}
    <MobileSheet title="Filtres & tri" onClose={() => (filterSheetOpen = false)}>
      <button slot="head-actions" type="button" class="reset" on:click={onReset}
        >Réinitialiser</button
      >

      <label class="m-field">
        <span class="m-label">Recherche par nom</span>
        <input
          type="text"
          value={$criteria.nameQuery}
          placeholder="nom (casse/accents ignorés)"
          on:input={(e) => setNameQuery((e.target as HTMLInputElement).value)}
        />
      </label>

      <div class="m-field">
        <span class="m-label">Trier par</span>
        <div class="m-segments">
          {#each SORT_KEYS as key (key)}
            <button
              type="button"
              class="seg nav-item"
              class:is-active={sort.key === key}
              on:click={() => cycleSort(list, key)}
            >
              {SORT_LABELS[key]}{sort.key === key ? (sort.dir === 'asc' ? ' ▲' : ' ▼') : ''}
            </button>
          {/each}
        </div>
      </div>

      <div class="m-field">
        <span class="m-label">Génération</span>
        {#if !$generationTouched && derniere !== null}
          <span class="m-hint">défaut : dernière ({derniere})</span>
        {/if}
        <div class="m-chips">
          {#each generations as g (g)}
            <label class="chip"
              ><input
                type="checkbox"
                checked={$criteria.generations.has(g)}
                on:change={() => toggleInSet('generations', g)}
              />{g}</label
            >
          {/each}
        </div>
      </div>

      <div class="m-field">
        <span class="m-label">Espèce</span>
        <div class="m-chips">
          {#each especes as e (e)}
            <label class="chip"
              ><input
                type="checkbox"
                checked={$criteria.especeIds.has(e)}
                on:change={() => toggleInSet('especeIds', e)}
              />{e}</label
            >
          {/each}
        </div>
      </div>

      <div class="m-field">
        <span class="m-label">Statut</span>
        <div class="m-chips">
          <label class="chip"
            ><input
              type="checkbox"
              checked={$criteria.statuses.has('vivant')}
              on:change={() => toggleInSet('statuses', 'vivant')}
            />vivant</label
          >
          <label class="chip"
            ><input
              type="checkbox"
              checked={$criteria.statuses.has('décédé')}
              on:change={() => toggleInSet('statuses', 'décédé')}
            />décédé</label
          >
        </div>
      </div>

      <div class="m-field">
        <span class="m-label">Pouvoir</span>
        <div class="m-chips">
          {#each POWER_OPTIONS as o (o.value)}
            <label class="chip"
              ><input
                type="checkbox"
                checked={$criteria.powerPresence === o.value}
                on:change={() => onPower(o.value)}
              />{o.label}</label
            >
          {/each}
        </div>
      </div>

      <div class="m-field m-traits">
        <span class="m-label">Traits</span>
        <div class="m-chips">
          {#each PRESENCE_OPTIONS as o (o.value)}
            <label class="chip"
              ><input
                type="checkbox"
                checked={$criteria.traitPresence === o.value}
                on:change={() => onPresence(o.value)}
              />{o.label}</label
            >
          {/each}
        </div>
        <div class="scope">
          <span>Portée :</span>
          {#each SCOPES as s (s.value)}
            <label class="radio"
              ><input
                type="radio"
                name="traitScopeM"
                checked={$criteria.traitScope === s.value}
                on:change={() => setTraitScope(s.value)}
              />{s.label}</label
            >
          {/each}
        </div>
        <details>
          <summary>Traits sélectionnés ({$criteria.traitIds.size} / {traits.length})</summary>
          <div class="m-chips scroll">
            {#each traits as t (t.id)}
              <label class="chip"
                ><input
                  type="checkbox"
                  checked={$criteria.traitIds.has(t.id)}
                  on:change={() => toggleInSet('traitIds', t.id)}
                />{t.label}</label
              >
            {/each}
          </div>
        </details>
      </div>

      <div class="m-field">
        <span class="m-label">Lignes par page</span>
        <div class="m-segments">
          {#each PAGE_SIZES as s (s.value)}
            <button
              type="button"
              class="seg nav-item"
              class:is-active={pageSize === s.value}
              on:click={() => setSize(s.value)}>{s.label}</button
            >
          {/each}
        </div>
      </div>

      <button
        slot="footer"
        type="button"
        class="primary see-all"
        on:click={() => (filterSheetOpen = false)}
      >
        Voir les {matchCount} individu{matchCount > 1 ? 's' : ''}
      </button>
    </MobileSheet>
  {/if}
{:else}
  <div class="filters">
    <div class="row">
      <label class="search">
        <span>Recherche par nom</span>
        <input
          type="text"
          value={$criteria.nameQuery}
          placeholder="nom (casse/accents ignorés)"
          on:input={(e) => setNameQuery((e.target as HTMLInputElement).value)}
        />
      </label>
      <button type="button" class="reset" on:click={onReset}>Réinitialiser</button>
    </div>

    <div class="dims">
      <fieldset>
        <legend>Génération</legend>
        {#if !$generationTouched && derniere !== null}
          <p class="hint">Défaut : dernière génération ({derniere})</p>
        {/if}
        <div class="chips">
          {#each generations as g (g)}
            <label class="chip">
              <input
                type="checkbox"
                checked={$criteria.generations.has(g)}
                on:change={() => toggleInSet('generations', g)}
              />
              {g}
            </label>
          {/each}
        </div>
      </fieldset>

      <fieldset>
        <legend>Espèce</legend>
        <div class="chips">
          {#each especes as e (e)}
            <label class="chip">
              <input
                type="checkbox"
                checked={$criteria.especeIds.has(e)}
                on:change={() => toggleInSet('especeIds', e)}
              />
              {e}
            </label>
          {/each}
        </div>
      </fieldset>

      <fieldset>
        <legend>Statut</legend>
        <div class="chips">
          <label class="chip">
            <input
              type="checkbox"
              checked={$criteria.statuses.has('vivant')}
              on:change={() => toggleInSet('statuses', 'vivant')}
            />
            vivant
          </label>
          <label class="chip">
            <input
              type="checkbox"
              checked={$criteria.statuses.has('décédé')}
              on:change={() => toggleInSet('statuses', 'décédé')}
            />
            décédé
          </label>
        </div>
      </fieldset>

      <fieldset>
        <legend>Pouvoir</legend>
        <div class="chips">
          {#each POWER_OPTIONS as o (o.value)}
            <label class="chip">
              <input
                type="checkbox"
                checked={$criteria.powerPresence === o.value}
                on:change={() => onPower(o.value)}
              />
              {o.label}
            </label>
          {/each}
        </div>
      </fieldset>

      <fieldset class="trait-fs">
        <legend>Trait</legend>
        <div class="presence">
          {#each PRESENCE_OPTIONS as o (o.value)}
            <label class="chip">
              <input
                type="checkbox"
                checked={$criteria.traitPresence === o.value}
                on:change={() => onPresence(o.value)}
              />
              {o.label}
            </label>
          {/each}
        </div>
        <div class="scope">
          <span>Portée :</span>
          {#each SCOPES as s (s.value)}
            <label class="radio">
              <input
                type="radio"
                name="traitScope"
                checked={$criteria.traitScope === s.value}
                on:change={() => setTraitScope(s.value)}
              />
              {s.label}
            </label>
          {/each}
        </div>
        <details>
          <summary>{$criteria.traitIds.size} trait(s) sélectionné(s)</summary>
          <div class="chips scroll">
            {#each traits as t (t.id)}
              <label class="chip">
                <input
                  type="checkbox"
                  checked={$criteria.traitIds.has(t.id)}
                  on:change={() => toggleInSet('traitIds', t.id)}
                />
                {t.label}
              </label>
            {/each}
          </div>
        </details>
      </fieldset>
    </div>
  </div>
{/if}

<style>
  .filters {
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 18px 20px;
    margin-bottom: 1rem;
    background: var(--bg-elev);
  }
  .row {
    display: flex;
    align-items: flex-end;
    gap: 1rem;
    margin-bottom: 0.75rem;
  }
  .search {
    display: flex;
    flex-direction: column;
    gap: 0.2rem;
    flex: 1;
    max-width: 22rem;
  }
  .search span {
    font-family: var(--mono);
    font-size: 11px;
    text-transform: var(--label-transform);
    color: var(--fg-faint);
  }
  .dims {
    display: flex;
    flex-wrap: wrap;
    gap: 0.75rem;
  }
  fieldset {
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    padding: 0.5rem 0.7rem;
    min-width: 8rem;
  }
  legend {
    font-family: var(--mono);
    font-size: 11px;
    text-transform: var(--label-transform);
    color: var(--fg-faint);
    padding: 0 0.3rem;
  }
  .chips {
    display: flex;
    flex-wrap: wrap;
    gap: 0.3rem 0.6rem;
  }
  .chips.scroll {
    max-height: 12rem;
    overflow-y: auto;
    margin-top: 0.3rem;
  }
  .chip,
  .radio {
    display: inline-flex;
    align-items: center;
    gap: 0.3rem;
    font-size: 0.82rem;
    cursor: pointer;
    padding: 2px 8px;
    border-radius: var(--chip-radius);
    border: 1px solid transparent;
  }
  /* Chip filtre sélectionné : teinte d'accent NETTE (BUG-001) — bordure d'accent + fond marqué,
     visible aussi en style A (Atelier). */
  .chip:has(input:checked) {
    background: color-mix(in srgb, var(--accent) 28%, var(--bg-elev));
    border-color: var(--accent);
    color: var(--accent-text);
    font-weight: 600;
  }
  .presence {
    display: flex;
    flex-wrap: wrap;
    gap: 0.3rem 0.6rem;
    margin-bottom: 0.45rem;
  }
  .scope {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.8rem;
    margin-bottom: 0.3rem;
  }
  .hint {
    margin: 0 0 0.3rem;
    font-size: 0.74rem;
    color: var(--fg-muted);
  }
  /* US5 : la section des filtres de trait occupe sa **propre ligne** (saut de ligne dans le flex). */
  .trait-fs {
    flex: 1 0 100%;
    min-width: 14rem;
  }
  summary {
    cursor: pointer;
    font-size: 0.82rem;
  }

  /* ===== Barre de filtres mobile + panneau (Feature 013) ===== */
  .mfilter-bar {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 8px 12px;
    border-bottom: 1px solid var(--border);
    background: var(--bg);
  }
  .filter-btn {
    flex: none;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    min-height: 36px;
    padding: 6px 12px;
    border: 1px solid var(--border);
    border-radius: var(--chip-radius);
    background: transparent;
    color: var(--fg-muted);
    font-size: 13px;
  }
  .filter-btn .badge {
    background: var(--accent);
    color: var(--accent-fg);
    font-family: var(--mono);
    font-size: 11px;
    border-radius: var(--chip-radius);
    padding: 0 6px;
  }
  .active-chips {
    display: flex;
    gap: 6px;
    overflow-x: auto;
    scrollbar-width: none;
    -webkit-mask-image: linear-gradient(90deg, #000 82%, transparent);
    mask-image: linear-gradient(90deg, #000 82%, transparent);
  }
  .active-chips::-webkit-scrollbar {
    display: none;
  }
  .fchip {
    flex: none;
    display: inline-flex;
    align-items: center;
    gap: 4px;
    white-space: nowrap;
    padding: 4px 10px;
    font-size: 12px;
    font-weight: 600;
    border-radius: var(--chip-radius);
    background: color-mix(in srgb, var(--accent) 28%, var(--bg-elev));
    border: 1px solid var(--accent);
    color: var(--accent-text);
  }
  .fchip.neutral {
    background: transparent;
    border-color: var(--border);
    color: var(--fg-muted);
    font-weight: 400;
  }
  .fchip .x {
    color: var(--fg-muted);
    font-size: 10px;
  }
  .m-field {
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
  }
  .m-label {
    font-family: var(--mono);
    font-size: 11px;
    text-transform: var(--label-transform);
    color: var(--fg-faint);
  }
  .m-field input[type='text'] {
    min-height: 44px;
  }
  .m-hint {
    font-size: 0.74rem;
    color: var(--fg-muted);
  }
  .m-segments {
    display: flex;
    gap: 6px;
  }
  .m-segments .seg {
    flex: 1;
    min-height: 40px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border: 1px solid var(--border);
    background: transparent;
    color: var(--fg-muted);
    border-radius: var(--chip-radius);
    font-size: 13px;
  }
  .m-chips {
    display: flex;
    flex-wrap: wrap;
    gap: 0.3rem 0.6rem;
  }
  .m-chips.scroll {
    max-height: 40vh;
    overflow-y: auto;
    margin-top: 0.4rem;
  }
  .m-traits {
    border-top: 1px solid var(--border);
    padding-top: 12px;
  }
  .m-chips .chip {
    min-height: 40px;
    padding: 0 14px;
  }
  .see-all {
    width: 100%;
    min-height: 48px;
    font-size: 15px;
    font-weight: 600;
  }
</style>
