<script lang="ts">
  import {
    sandboxState,
    sandboxView,
    sandboxYear,
    setSandboxYear,
    reproMode,
    reproSelected,
    reproChildCount,
    setReproChildCount,
    startManualRepro,
    toggleReproSelect,
    validateRepro,
    cancelRepro,
    reselectLastParents,
    makeItReal,
    resetSandbox,
    exitSandbox,
    sandboxError,
    sbClonePerson,
    sbDeletePerson,
    sbRegeneratePowers,
    sbFormCouple,
    sbDivorceCouple,
    sbDissolveConjugalLink,
  } from '../stores/sandboxStore.js';
  import { catalog } from '../stores/appState.js';
  import { criteria, generationTouched } from '../stores/filters.js';
  import {
    filterPopulation,
    lastGeneration,
    sortPopulation,
    type Personne,
  } from '../../core/index.js';

  // Indicateur/état de tri d'un en-tête (reçoit $sbSort ⇒ réactif).
  function ariaSortOf(s: ListSort, key: SortKey): 'ascending' | 'descending' | 'none' {
    return s.key !== key ? 'none' : s.dir === 'asc' ? 'ascending' : 'descending';
  }
  function sortIndic(s: ListSort, key: SortKey): string {
    return s.key !== key ? '' : s.dir === 'asc' ? ' ▲' : ' ▼';
  }
  import { buildListRow } from '../lib/ficheViewModel.js';
  import { paginate } from '../lib/pagination.js';
  import {
    sbTab,
    sbPage,
    sbPageSize,
    setSbPageSize,
    sbSort,
    cycleSort,
    isMobile,
    type PageSize,
    type ListSort,
  } from '../stores/ui.js';
  import { yearOf, type SortKey } from '../../core/index.js';
  import FilterBar from '../components/FilterBar.svelte';
  import Paginator from '../components/Paginator.svelte';
  import SandboxPersonForm from '../components/SandboxPersonForm.svelte';
  import MobileSheet from '../components/MobileSheet.svelte';

  // Feuille d'actions d'une ligne (mobile, Feature 013) : Éditer / Cloner / Régénérer / Supprimer.
  let actionRowId: string | null = null;
  $: actionRowName = actionRowId ? (nameById.get(actionRowId) ?? actionRowId) : '';

  $: view = $sandboxView;
  // Année de la genèse de la sandbox (§6.2, Feature 011) : origine du calcul de génération.
  $: gy = view?.genesisYear ?? 0;
  // Filtrage (BUG-002) : mêmes filtres que la liste principale, appliqués à l'état RECONSTRUIT à l'année.
  $: derniere = view ? lastGeneration(view.population, gy) : null;
  $: effectiveGenerations =
    $generationTouched || derniere === null ? $criteria.generations : new Set<number>([derniere]);
  $: effectiveCriteria = { ...$criteria, generations: effectiveGenerations };
  $: filtered = view
    ? filterPopulation(view.population, effectiveCriteria, {
        currentYear: $sandboxYear,
        genesisYear: gy,
      })
    : [];
  // Tri de l'ensemble filtré (avant pagination) ; key=null ⇒ ordre par défaut (FR-011).
  $: sorted = sortPopulation(filtered, $sbSort.key, $sbSort.dir, {
    currentYear: $sandboxYear,
    genesisYear: gy,
  });
  $: rows = sorted.map((p) => buildListRow(p, $catalog, $sandboxYear, gy));
  $: minYear = $sandboxState ? $sandboxState.parameters.birthYear : 0;
  $: maxYear = $sandboxState ? $sandboxState.currentYear : 0;
  $: selectedCount = $reproSelected.size;

  // Pagination de l'onglet Population (FR-016). La SÉLECTION de parents (Set) reste indépendante
  // des lignes visibles (INV-UI5) : un parent hors page/filtre demeure sélectionné.
  $: pageInfo = paginate(rows, $sbPage, $sbPageSize);
  $: if (pageInfo.page !== $sbPage) sbPage.set(pageInfo.page);
  function onSize(e: CustomEvent<PageSize>) {
    setSbPageSize(e.detail);
  }
  function onPage(e: CustomEvent<number>) {
    sbPage.set(e.detail);
  }

  // Lentille temporelle : champ numérique + curseur SYNCHRONISÉS (FR-018), bornés [minYear, maxYear].
  function setYearClamped(v: number) {
    if (!Number.isFinite(v)) return;
    setSandboxYear(Math.min(maxYear, Math.max(minYear, Math.round(v))));
  }

  // --- Formulaire de création / édition (BUG-001 volet A) ---
  let formOpen = false;
  let formMode: 'create' | 'edit' = 'create';
  let editingPerson: Personne | null = null;

  function openCreate() {
    formMode = 'create';
    editingPerson = null;
    formOpen = true;
  }
  function openEdit(id: string) {
    const p = $sandboxState?.population.find((x) => x.id === id) ?? null;
    if (!p) return;
    formMode = 'edit';
    editingPerson = p;
    formOpen = true;
  }

  // --- Édition des couples (BUG-001 volet B) ---
  let coupleA = '';
  let coupleB = '';
  $: nameById = new Map(($sandboxState?.population ?? []).map((p) => [p.id, p.nom]));
  $: activeCoupleIds = new Set(($sandboxState?.couples ?? []).map((c) => c.id));
  // Couples connus (depuis le journal) : actifs ou divorcés (« ex »). Purgés à la dissolution.
  $: coupleList = (() => {
    const seen = new Map<string, { id: string; memberIds: string[]; active: boolean }>();
    for (const e of $sandboxState?.history ?? []) {
      if (e.kind === 'couple') {
        seen.set(e.coupleId, {
          id: e.coupleId,
          memberIds: e.memberIds,
          active: activeCoupleIds.has(e.coupleId),
        });
      }
    }
    return [...seen.values()];
  })();

  function formCoupleNow() {
    if (!coupleA || !coupleB) return;
    sbFormCouple(coupleA, coupleB);
  }
  function nom(id: string): string {
    return nameById.get(id) ?? id;
  }
  // Exécute une action de ligne (feuille mobile) puis referme la feuille.
  function rowAction(fn: (id: string) => void): void {
    if (actionRowId) fn(actionRowId);
    actionRowId = null;
  }
</script>

{#if !$sandboxState}
  <p class="empty">La sandbox n'est pas ouverte.</p>
{:else}
  <section>
    <!-- Barre d'actions commune -->
    {#if $isMobile}
      <div class="bar mbar">
        <span class="badge-accent">Bac à sable</span>
        <div class="mbar-actions">
          <button type="button" class="m-icon" on:click={resetSandbox} aria-label="Réinitialiser"
            >↺</button
          >
          <button type="button" class="m-icon" on:click={exitSandbox} aria-label="Quitter">✕</button
          >
          <button type="button" class="primary make-real" on:click={makeItReal}
            >✔ Make it real</button
          >
        </div>
      </div>
    {:else}
      <div class="bar">
        <div class="bar-left">
          <span class="badge-accent">Bac à sable · copie isolée</span>
        </div>
        <div class="actions">
          <button type="button" class="primary" on:click={makeItReal}>✔ Make it real</button>
          <button type="button" class="contour" on:click={resetSandbox}>↺ Reset</button>
          <button type="button" class="contour" on:click={exitSandbox}>✕ Quitter</button>
        </div>
      </div>
    {/if}

    <!-- Lentille temporelle commune : champ + curseur synchronisés (FR-018) -->
    <div class="lens">
      <label class="field-label" for="sb-year-num">An</label>
      <input
        id="sb-year-num"
        class="year-num"
        type="number"
        min={minYear}
        max={maxYear}
        value={$sandboxYear}
        on:input={(e) => setYearClamped(Number((e.target as HTMLInputElement).value))}
      />
      <input
        class="year-range"
        type="range"
        min={minYear}
        max={maxYear}
        value={$sandboxYear}
        on:input={(e) => setYearClamped(Number((e.target as HTMLInputElement).value))}
        aria-label="Année observée"
      />
      <span class="muted">[{minYear} … {maxYear}]</span>
    </div>

    {#if $sandboxError}
      <p class="error-msg" role="alert">{$sandboxError}</p>
    {/if}

    <!-- Onglets internes -->
    <div class="tabs" role="tablist">
      <button
        type="button"
        role="tab"
        class="tab"
        class:active={$sbTab === 'population'}
        aria-selected={$sbTab === 'population'}
        on:click={() => sbTab.set('population')}
      >
        Population
      </button>
      <button
        type="button"
        role="tab"
        class="tab"
        class:active={$sbTab === 'couples'}
        aria-selected={$sbTab === 'couples'}
        on:click={() => sbTab.set('couples')}
      >
        Couples & cycle de vie conjugal
      </button>
    </div>

    {#if $sbTab === 'population'}
      <!-- Barre d'outils repro / création -->
      {#if !$reproMode}
        <div class="repro">
          <button type="button" class="contour" on:click={startManualRepro}
            >⚭ Reproduction manuelle</button
          >
          <button type="button" class="contour" on:click={openCreate}>＋ Créer un individu</button>
          <button type="button" class="contour" on:click={reselectLastParents}
            >↩ Re-sélectionner les derniers parents</button
          >
        </div>
      {:else}
        <div class="repro mode" role="region" aria-label="Reproduction manuelle">
          <span>{selectedCount} parent(s) sélectionné(s)</span>
          <label>
            Nombre d'enfants
            <input
              type="number"
              min="1"
              value={$reproChildCount}
              on:input={(e) => setReproChildCount(Number((e.target as HTMLInputElement).value))}
            />
          </label>
          <button
            type="button"
            class="primary"
            on:click={validateRepro}
            disabled={selectedCount === 0}
          >
            Valider
          </button>
          <button type="button" class="contour" on:click={cancelRepro}>Annuler</button>
        </div>
      {/if}

      <!-- Filtres (parité avec la liste principale, BUG-002) -->
      <FilterBar list="sandbox" />

      {#if rows.length === 0}
        <p class="empty">Aucun individu ne correspond aux filtres.</p>
      {:else if $isMobile}
        <!-- ===== Sandbox mobile : lignes (plus de table, Feature 013) ===== -->
        <ul class="sb-mlist">
          {#each pageInfo.pageItems as row (row.id)}
            <li class="sb-mrow" class:selected={$reproSelected.has(row.id)}>
              {#if $reproMode}
                <input
                  type="checkbox"
                  class="sb-check"
                  checked={$reproSelected.has(row.id)}
                  on:change={() => toggleReproSelect(row.id)}
                  aria-label={`Sélectionner ${row.nom}`}
                />
              {/if}
              <div class="sb-mtext">
                <span class="sb-mname"
                  >{row.nom}{#if !row.vivant}<span class="dead" title="décédé"> †</span>{/if}</span
                >
                <span class="sb-mmeta" class:sel={$reproMode && $reproSelected.has(row.id)}>
                  {#if $reproMode && $reproSelected.has(row.id)}sélectionné ·
                  {/if}an {yearOf(row.dateNaissance)} · {row.age} ans
                </span>
              </div>
              {#if !$reproMode}
                <button
                  type="button"
                  class="m-dots"
                  on:click={() => (actionRowId = row.id)}
                  aria-label={`Actions pour ${row.nom}`}>⋯</button
                >
              {/if}
            </li>
          {/each}
        </ul>
        {#if pageInfo.nbPages > 1}
          <div class="marrows">
            <button
              type="button"
              class="arrow"
              disabled={pageInfo.page <= 1}
              aria-label="Page précédente"
              on:click={() => sbPage.set(pageInfo.page - 1)}>‹</button
            >
            <button
              type="button"
              class="arrow"
              disabled={pageInfo.page >= pageInfo.nbPages}
              aria-label="Page suivante"
              on:click={() => sbPage.set(pageInfo.page + 1)}>›</button
            >
          </div>
        {/if}
      {:else}
        <Paginator
          pageSize={$sbPageSize}
          page={pageInfo.page}
          nbPages={pageInfo.nbPages}
          from={pageInfo.from}
          to={pageInfo.to}
          total={pageInfo.total}
          on:sizechange={onSize}
          on:pagechange={onPage}
        />

        <table>
          <thead>
            <tr>
              {#if $reproMode}<th class="sel"></th>{/if}
              <th aria-sort={ariaSortOf($sbSort, 'nom')}>
                <button type="button" class="colhdr" on:click={() => cycleSort('sandbox', 'nom')}
                  >Nom{sortIndic($sbSort, 'nom')}</button
                >
              </th>
              <th aria-sort={ariaSortOf($sbSort, 'naissance')}>
                <button
                  type="button"
                  class="colhdr"
                  on:click={() => cycleSort('sandbox', 'naissance')}
                  >Naissance{sortIndic($sbSort, 'naissance')}</button
                >
              </th>
              <th aria-sort={ariaSortOf($sbSort, 'age')}>
                <button type="button" class="colhdr" on:click={() => cycleSort('sandbox', 'age')}
                  >Âge{sortIndic($sbSort, 'age')}</button
                >
              </th>
              <th>Pouvoir(s)</th>
              {#if !$reproMode}<th>Actions</th>{/if}
            </tr>
          </thead>
          <tbody>
            {#each pageInfo.pageItems as row (row.id)}
              <tr
                class:selected={$reproSelected.has(row.id)}
                on:click={() => $reproMode && toggleReproSelect(row.id)}
              >
                {#if $reproMode}
                  <td class="sel">
                    <input
                      type="checkbox"
                      checked={$reproSelected.has(row.id)}
                      on:change|stopPropagation={() => toggleReproSelect(row.id)}
                      aria-label={`Sélectionner ${row.nom}`}
                    />
                  </td>
                {/if}
                <td>
                  {row.nom}{#if !row.vivant}<span class="dead" title="décédé"> †</span>{/if}
                </td>
                <td class="mono">{row.dateNaissance}</td>
                <td>{row.age}</td>
                <td class="powers">
                  {#if row.pouvoirs.length === 0}<span class="muted">—</span
                    >{:else}{#each row.pouvoirs as pw}<span class="chip"
                        >{pw.label} <span class="pm">P {pw.puissance}</span>
                        <span class="pm">M {pw.maitrise}</span></span
                      >{/each}{/if}
                </td>
                {#if !$reproMode}
                  <td class="row-actions">
                    <button type="button" on:click|stopPropagation={() => openEdit(row.id)}
                      >Éditer</button
                    >
                    <button type="button" on:click|stopPropagation={() => sbClonePerson(row.id)}
                      >Cloner</button
                    >
                    <button
                      type="button"
                      on:click|stopPropagation={() => sbRegeneratePowers(row.id)}
                      title="Régénérer les pouvoirs depuis les traits actifs">Régénérer</button
                    >
                    <button
                      type="button"
                      class="danger"
                      on:click|stopPropagation={() => sbDeletePerson(row.id)}>Supprimer</button
                    >
                  </td>
                {/if}
              </tr>
            {/each}
          </tbody>
        </table>
      {/if}
    {:else}
      <!-- Onglet Couples & cycle de vie conjugal -->
      <div class="card couples-panel">
        <div class="form-couple">
          <label class="field-label">
            A
            <select bind:value={coupleA}>
              <option value="" disabled>— choisir —</option>
              {#each $sandboxState.population as p (p.id)}<option value={p.id}>{p.nom}</option
                >{/each}
            </select>
          </label>
          <label class="field-label">
            B
            <select bind:value={coupleB}>
              <option value="" disabled>— choisir —</option>
              {#each $sandboxState.population as p (p.id)}<option value={p.id}>{p.nom}</option
                >{/each}
            </select>
          </label>
          <button
            type="button"
            class="primary"
            on:click={formCoupleNow}
            disabled={!coupleA || !coupleB || coupleA === coupleB}
            >Former le couple (année {$sandboxYear})</button
          >
        </div>
        {#if coupleList.length === 0}
          <p class="muted">Aucun couple.</p>
        {:else}
          <ul class="couple-list">
            {#each coupleList as c (c.id)}
              <li>
                <span class="members">{c.memberIds.map(nom).join(c.active ? ' ⚭ ' : ' ⚮ ')}</span>
                <span class="badge-statut" class:ex={!c.active}>{c.active ? 'actuel' : 'ex'}</span>
                {#if c.active}
                  <button type="button" class="contour" on:click={() => sbDivorceCouple(c.id)}
                    >Divorcer</button
                  >
                {/if}
                <button type="button" class="danger" on:click={() => sbDissolveConjugalLink(c.id)}
                  >Dissoudre</button
                >
              </li>
            {/each}
          </ul>
        {/if}
      </div>
    {/if}
  </section>

  {#if formOpen}
    <SandboxPersonForm
      mode={formMode}
      person={editingPerson}
      year={$sandboxYear}
      onClose={() => (formOpen = false)}
    />
  {/if}

  {#if actionRowId}
    <MobileSheet title={actionRowName} onClose={() => (actionRowId = null)}>
      <button type="button" class="sheet-row contour" on:click={() => rowAction(openEdit)}
        >Éditer</button
      >
      <button type="button" class="sheet-row contour" on:click={() => rowAction(sbClonePerson)}
        >Cloner</button
      >
      <button type="button" class="sheet-row contour" on:click={() => rowAction(sbRegeneratePowers)}
        >Régénérer les pouvoirs</button
      >
      <button type="button" class="sheet-row danger" on:click={() => rowAction(sbDeletePerson)}
        >Supprimer</button
      >
    </MobileSheet>
  {/if}
{/if}

<style>
  .bar {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: 0.5rem;
    margin-bottom: 0.8rem;
  }
  .actions,
  .repro {
    display: flex;
    gap: 0.5rem;
    flex-wrap: wrap;
  }
  .repro {
    margin: 0.8rem 0;
    align-items: center;
  }
  .repro.mode {
    padding: 0.6rem 0.8rem;
    background: var(--bg-elev);
    border: 1px solid var(--border);
    border-radius: var(--radius);
  }

  .lens {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    flex-wrap: wrap;
    margin: 0.4rem 0 0.8rem;
    padding: 12px 16px;
    background: var(--bg-elev);
    border: 1px solid var(--border);
    border-radius: var(--radius);
  }
  .year-num {
    width: 6rem;
    font-family: var(--mono);
    color: var(--accent-text);
    font-size: 16px;
  }
  .year-range {
    flex: 1 1 12rem;
    accent-color: var(--accent);
  }

  .tabs {
    display: flex;
    gap: 1.2rem;
    border-bottom: 1px solid var(--border);
    margin-bottom: 0.8rem;
  }
  .tab {
    background: transparent;
    border: none;
    border-bottom: 2px solid transparent;
    border-radius: 0;
    color: var(--fg-muted);
    padding: 8px 2px;
    font-size: 14px;
  }
  .tab.active {
    color: var(--accent-text);
    border-bottom-color: var(--accent);
  }

  .couples-panel {
    display: flex;
    flex-direction: column;
    gap: 0.8rem;
  }
  .form-couple {
    display: flex;
    gap: 0.6rem;
    align-items: flex-end;
    flex-wrap: wrap;
  }
  .form-couple label {
    display: flex;
    flex-direction: column;
    gap: 0.2rem;
  }
  .couple-list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
  }
  .couple-list li {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    flex-wrap: wrap;
  }
  .members {
    font-weight: 600;
  }
  .badge-statut {
    font-size: 0.72rem;
    padding: 1px 0.5rem;
    border-radius: var(--chip-radius);
    background: var(--chip-bg);
    border: 1px solid var(--chip-border);
    color: var(--chip-text);
  }
  .badge-statut.ex {
    background: transparent;
    border-color: var(--border);
    color: var(--fg-muted);
  }

  table {
    width: 100%;
    border-collapse: collapse;
  }
  th,
  td {
    text-align: left;
    padding: 0.45rem 0.6rem;
    border-bottom: 1px solid var(--row-border);
  }
  th {
    font-family: var(--mono);
    font-size: 11px;
    text-transform: var(--label-transform);
    color: var(--fg-faint);
    font-weight: 400;
  }
  /* En-tête triable : bouton nu héritant du style du th. */
  .colhdr {
    font: inherit;
    text-transform: inherit;
    letter-spacing: inherit;
    color: inherit;
    background: transparent;
    border: none;
    padding: 0;
    text-align: left;
    cursor: pointer;
  }
  .colhdr:hover {
    color: var(--accent-text);
  }
  .pm {
    font-family: var(--mono);
    font-size: 11px;
    opacity: 0.85;
    margin-left: 2px;
  }
  tbody tr {
    cursor: default;
  }
  /* Parent sélectionné (repro) NETTEMENT visible (BUG-001) — fond accent marqué + liseré gauche. */
  tbody tr.selected {
    background: color-mix(in srgb, var(--accent) 24%, var(--bg-elev));
    box-shadow: inset 3px 0 0 0 var(--accent);
  }
  .sel {
    width: 2.2rem;
    text-align: center;
  }
  .powers {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
  }
  .row-actions {
    display: flex;
    gap: 0.3rem;
    flex-wrap: wrap;
  }
  .dead {
    color: var(--danger);
  }
  .mono {
    font-family: var(--mono);
    font-size: 13px;
  }
  .muted {
    color: var(--fg-muted);
  }
  .danger {
    background: transparent;
    border: 1px solid var(--danger);
    color: var(--danger);
  }
  .empty {
    color: var(--fg-muted);
  }

  /* ===== Sandbox mobile (Feature 013) ===== */
  .mbar {
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    margin: 0;
    padding: 10px 12px;
    background: var(--tint-bg);
    border-bottom: 1px solid var(--border);
  }
  .mbar-actions {
    display: flex;
    align-items: center;
    gap: 6px;
  }
  .mbar .m-icon {
    width: 36px;
    height: 36px;
    padding: 0;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border: 1px solid var(--border);
    border-radius: var(--radius);
    background: var(--bg-elev);
    color: var(--accent-text);
    font-size: 15px;
  }
  .make-real {
    min-height: 36px;
    padding: 0 12px;
    font-size: 13px;
  }
  .sb-mlist {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
  }
  .sb-mrow {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px 12px;
    border-bottom: 1px solid var(--row-border);
  }
  .sb-mrow.selected {
    background: color-mix(in srgb, var(--accent) 24%, var(--bg-elev));
    box-shadow: inset 3px 0 0 0 var(--accent);
  }
  .sb-check {
    width: 20px;
    height: 20px;
    flex: none;
    accent-color: var(--accent);
  }
  .sb-mtext {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }
  .sb-mname {
    font-size: 15px;
    font-weight: 600;
  }
  .sb-mmeta {
    font-family: var(--mono);
    font-size: 11px;
    color: var(--fg-faint);
  }
  .sb-mmeta.sel {
    color: var(--accent-text);
  }
  .m-dots {
    width: 32px;
    height: 32px;
    flex: none;
    padding: 0;
    border: 1px solid var(--border);
    border-radius: var(--radius);
    background: transparent;
    color: var(--fg-muted);
    font-size: 16px;
  }
  .marrows {
    display: flex;
    justify-content: center;
    gap: 12px;
    padding: 12px;
  }
  .marrows .arrow {
    width: 44px;
    height: 44px;
    padding: 0;
    border-radius: var(--radius);
    font-size: 20px;
    line-height: 1;
  }
  .marrows .arrow:disabled {
    opacity: 0.35;
  }
  .sheet-row {
    width: 100%;
    justify-content: flex-start;
    min-height: 48px;
    font-size: 15px;
  }
  @media (max-width: 760px) {
    .lens {
      flex-wrap: wrap;
      margin: 0;
      padding: 10px 12px;
      border: none;
      border-bottom: 1px solid var(--border);
      border-radius: 0;
      background: var(--tint-bg);
    }
    .year-range {
      flex: 1 1 100%;
      order: 3;
    }
    .tabs {
      gap: 6px;
      border-bottom: 1px solid var(--border);
      padding: 8px 12px 0;
    }
    .tab {
      flex: 1;
      min-height: 38px;
      padding: 8px;
      text-align: center;
      border: 1px solid var(--border);
      border-radius: var(--chip-radius);
    }
    .tab.active {
      background: color-mix(in srgb, var(--accent) 30%, var(--bg-elev));
      border-color: var(--accent);
      color: var(--accent-text);
    }
    .repro {
      flex-direction: column;
      align-items: stretch;
      margin: 12px;
    }
    .repro .primary,
    .repro .contour {
      width: 100%;
      min-height: 44px;
    }
    .repro.mode label {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .form-couple {
      flex-direction: column;
      align-items: stretch;
      padding: 12px;
    }
    .form-couple label {
      width: 100%;
    }
    .form-couple select {
      width: 100%;
      min-height: 44px;
    }
    .couple-list {
      padding: 0 12px 12px;
    }
    .couple-list li {
      flex-direction: column;
      align-items: stretch;
      border: 1px solid var(--border);
      border-radius: var(--radius);
      padding: 10px;
    }
  }
</style>
