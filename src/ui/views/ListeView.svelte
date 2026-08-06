<script lang="ts">
  import {
    population,
    currentYear,
    genesisYear,
    catalog,
    selectPerson,
  } from '../stores/appState.js';
  import { criteria, generationTouched } from '../stores/filters.js';
  import { buildListRow } from '../lib/ficheViewModel.js';
  import { paginate } from '../lib/pagination.js';
  import {
    listePage,
    listePageSize,
    setListePageSize,
    listeSort,
    cycleSort,
    isMobile,
    type PageSize,
    type ListSort,
  } from '../stores/ui.js';
  import {
    filterPopulation,
    lastGeneration,
    sortPopulation,
    type SortKey,
  } from '../../core/index.js';

  // Indicateur/état de tri d'un en-tête (reçoit $listeSort en argument ⇒ réactif au changement).
  function ariaSortOf(s: ListSort, key: SortKey): 'ascending' | 'descending' | 'none' {
    return s.key !== key ? 'none' : s.dir === 'asc' ? 'ascending' : 'descending';
  }
  function sortIndic(s: ListSort, key: SortKey): string {
    return s.key !== key ? '' : s.dir === 'asc' ? ' ▲' : ' ▼';
  }
  import TimeBar from '../components/TimeBar.svelte';
  import FilterBar from '../components/FilterBar.svelte';
  import Paginator from '../components/Paginator.svelte';

  // Défaut dynamique : tant que le filtre génération n'a pas été touché, on affiche la dernière
  // génération recalculée à chaque avancée du temps (FR-011a / INV-G5).
  $: derniere = lastGeneration($population, $genesisYear);
  $: effectiveGenerations =
    $generationTouched || derniere === null ? $criteria.generations : new Set<number>([derniere]);
  $: effectiveCriteria = { ...$criteria, generations: effectiveGenerations };
  // Année courante issue de la simulation (Feature 3) ; l'âge en découle.
  $: filtered = filterPopulation($population, effectiveCriteria, {
    currentYear: $currentYear,
    genesisYear: $genesisYear,
  });
  // Tri appliqué à l'ENSEMBLE filtré, avant pagination (FR-011). key=null ⇒ ordre par défaut.
  $: sorted = sortPopulation(filtered, $listeSort.key, $listeSort.dir, {
    currentYear: $currentYear,
    genesisYear: $genesisYear,
  });
  $: rows = sorted.map((p) => buildListRow(p, $catalog, $currentYear, $genesisYear));

  // Pagination présentationnelle sur la liste filtrée (FR-016 ; INV-UI4).
  $: pageInfo = paginate(rows, $listePage, $listePageSize);
  // Garde-fou : si la page courante dépasse (filtre réduit la liste), on la réaligne.
  $: if (pageInfo.page !== $listePage) listePage.set(pageInfo.page);

  function onSize(e: CustomEvent<PageSize>) {
    setListePageSize(e.detail);
  }
  function onPage(e: CustomEvent<number>) {
    listePage.set(e.detail);
  }
</script>

<section>
  {#if $population.length === 0}
    <h2>Population</h2>
    <p class="empty">Aucune population générée. Rendez-vous dans les paramètres pour générer.</p>
  {:else}
    <TimeBar />
    <FilterBar list="population" />

    {#if !$isMobile}
      <div class="results-head">
        <h2>Population</h2>
        <span class="count">{rows.length} / {$population.length} individu(s)</span>
      </div>
    {/if}

    {#if rows.length === 0}
      <p class="empty">Aucun individu ne correspond aux filtres.</p>
    {:else if $isMobile}
      <!-- ===== Population mobile : lignes flex (Feature 013) ===== -->
      <div class="mresults">
        <span>{rows.length} / {$population.length} individus</span>
        <span>{pageInfo.from}–{pageInfo.to} · page {pageInfo.page}/{pageInfo.nbPages}</span>
      </div>
      <ul class="mlist">
        {#each pageInfo.pageItems as row (row.id)}
          <li>
            <button type="button" class="mrow" on:click={() => selectPerson(row.id)}>
              <span class="mcol">
                <span class="mname">
                  {row.nom}{#if !row.vivant}<span class="dead" title="décédé">†</span>{/if}
                </span>
                <span class="mmeta"
                  >{row.dateNaissance} · {row.age} ans · {row.especeId} · g{row.generation}</span
                >
                <span class="mpowers">
                  {#if row.pouvoirs.length === 0}
                    <span class="muted">aucun pouvoir</span>
                  {:else}
                    {#each row.pouvoirs as pouvoir}
                      <span class="chip"
                        >{pouvoir.label}
                        <span class="pm">{pouvoir.puissance}/{pouvoir.maitrise}</span></span
                      >
                    {/each}
                  {/if}
                </span>
              </span>
              <span class="chev" aria-hidden="true">›</span>
            </button>
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
            on:click={() => listePage.set(pageInfo.page - 1)}>‹</button
          >
          <button
            type="button"
            class="arrow"
            disabled={pageInfo.page >= pageInfo.nbPages}
            aria-label="Page suivante"
            on:click={() => listePage.set(pageInfo.page + 1)}>›</button
          >
        </div>
      {/if}
    {:else}
      <Paginator
        pageSize={$listePageSize}
        page={pageInfo.page}
        nbPages={pageInfo.nbPages}
        from={pageInfo.from}
        to={pageInfo.to}
        total={pageInfo.total}
        on:sizechange={onSize}
        on:pagechange={onPage}
      />

      <div class="table" role="table" aria-label="Population">
        <div class="thead" role="row">
          <span role="columnheader" aria-sort={ariaSortOf($listeSort, 'nom')}>
            <button type="button" class="colhdr" on:click={() => cycleSort('population', 'nom')}
              >Nom{sortIndic($listeSort, 'nom')}</button
            >
          </span>
          <span role="columnheader" aria-sort={ariaSortOf($listeSort, 'naissance')}>
            <button
              type="button"
              class="colhdr"
              on:click={() => cycleSort('population', 'naissance')}
              >Date de naissance{sortIndic($listeSort, 'naissance')}</button
            >
          </span>
          <span role="columnheader" aria-sort={ariaSortOf($listeSort, 'age')}>
            <button type="button" class="colhdr" on:click={() => cycleSort('population', 'age')}
              >Âge{sortIndic($listeSort, 'age')}</button
            >
          </span>
          <span role="columnheader">Pouvoir(s)</span>
        </div>
        {#each pageInfo.pageItems as row (row.id)}
          <div
            class="trow"
            role="button"
            tabindex="0"
            on:click={() => selectPerson(row.id)}
            on:keydown={(e) => (e.key === 'Enter' || e.key === ' ') && selectPerson(row.id)}
          >
            <span class="name-cell">
              <span class="name">
                {row.nom}
                {#if !row.vivant}<span class="dead" title="décédé">†</span>{/if}
              </span>
              <span class="sub">{row.especeId} · génération {row.generation}</span>
            </span>
            <span class="mono">{row.dateNaissance}</span>
            <span>{row.age}</span>
            <span class="powers">
              {#if row.pouvoirs.length === 0}
                <span class="muted">—</span>
              {:else}
                {#each row.pouvoirs as pouvoir}
                  <span class="chip"
                    >{pouvoir.label}
                    <span class="pm">P {pouvoir.puissance}</span>
                    <span class="pm">M {pouvoir.maitrise}</span></span
                  >
                {/each}
              {/if}
            </span>
          </div>
        {/each}
      </div>
    {/if}
  {/if}
</section>

<style>
  .results-head {
    display: flex;
    align-items: baseline;
    gap: 0.6rem;
    margin: 0.5rem 0 0.75rem;
  }
  .results-head h2 {
    margin: 0;
    font-size: 17px;
  }
  .count {
    font-family: var(--mono);
    font-size: 12px;
    color: var(--fg-faint);
  }

  .table {
    display: flex;
    flex-direction: column;
  }
  .thead,
  .trow {
    display: grid;
    grid-template-columns: 1.6fr 1fr 0.5fr 2fr;
    gap: 0.6rem;
    align-items: center;
    padding: 0.55rem 0.6rem;
  }
  .thead {
    font-family: var(--mono);
    font-size: 11px;
    text-transform: var(--label-transform);
    color: var(--fg-faint);
    border-bottom: 1px solid var(--border);
  }
  /* En-tête triable : bouton nu, aligné à gauche, même typo que .thead. */
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
  /* Mentions puissance/maîtrise dans une étiquette de pouvoir. */
  .pm {
    font-family: var(--mono);
    font-size: 11px;
    opacity: 0.85;
    margin-left: 2px;
  }
  .trow {
    border-bottom: 1px solid var(--row-border);
    cursor: pointer;
    text-align: left;
    width: 100%;
  }
  .trow:hover,
  .trow:focus-visible {
    background: var(--hover-bg);
  }
  .name-cell {
    display: flex;
    flex-direction: column;
    gap: 1px;
  }
  .name {
    font-weight: 600;
  }
  .dead {
    color: var(--danger);
    margin-left: 4px;
  }
  .sub {
    font-family: var(--mono);
    font-size: 11px;
    color: var(--fg-faint);
  }
  .mono {
    font-family: var(--mono);
    font-size: 13px;
  }
  .powers {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
  }
  .muted {
    color: var(--fg-muted);
  }
  .empty {
    color: var(--fg-muted);
  }

  /* ===== Population mobile (Feature 013, seuil 760) ===== */
  .mresults {
    display: flex;
    justify-content: space-between;
    gap: 0.6rem;
    padding: 9px 12px 6px;
    font-family: var(--mono);
    font-size: 11px;
    color: var(--fg-faint);
  }
  .mlist {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
  }
  .mrow {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px 12px;
    border: none;
    border-bottom: 1px solid var(--row-border);
    border-radius: 0;
    background: transparent;
    cursor: pointer;
    width: 100%;
    text-align: left;
  }
  .mrow:hover,
  .mrow:focus-visible {
    background: var(--hover-bg);
  }
  .mcol {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 3px;
  }
  .mname {
    font-size: 15px;
    font-weight: 600;
  }
  .mmeta {
    font-family: var(--mono);
    font-size: 11px;
    color: var(--fg-faint);
  }
  .mpowers {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
    margin-top: 2px;
  }
  .chev {
    flex: none;
    font-size: 16px;
    color: var(--fg-faint);
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
</style>
