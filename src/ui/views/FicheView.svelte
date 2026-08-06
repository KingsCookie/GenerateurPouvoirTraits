<script lang="ts">
  import {
    selectedPerson,
    currentYear,
    genesisYear,
    population,
    couples,
    catalog,
    backToList,
    killPerson,
    setCoupleReproPct,
    selectPerson,
    goToArbre,
  } from '../stores/appState.js';
  import { buildFicheView } from '../lib/ficheViewModel.js';
  import { buildGenealogyTree, yearOf } from '../../core/index.js';
  import { traitMode, isMobile } from '../stores/ui.js';
  import GenealogyTree from '../components/GenealogyTree.svelte';
  import TraitModeSelector from '../components/TraitModeSelector.svelte';
  import TreeLegend from '../components/TreeLegend.svelte';
  import MobileSheet from '../components/MobileSheet.svelte';
  import Gauge from '../components/Gauge.svelte';

  // Feuille de confirmation « Tuer… » (mobile).
  let killSheetOpen = false;

  // Réactif au catalogue éditable (Feature 5) : un trait renommé/supprimé se reflète aussitôt.
  // `population` résout les noms des enfants (FR-015).
  $: fiche = $selectedPerson
    ? buildFicheView($selectedPerson, $catalog, $currentYear, $genesisYear, $population)
    : null;

  // Arbre de la fiche : profondeur FIXE 2 (FR-002a), cases nom + pouvoirs (showAge masqué, FR-003b).
  $: byId = new Map($population.map((p) => [p.id, p]));
  $: tree = $selectedPerson
    ? buildGenealogyTree($selectedPerson.id, byId, 2, {
        currentYear: $currentYear,
        catalog: $catalog,
      })
    : null;

  // Couple actuel de l'individu (réactif sur la liste des couples).
  $: couple =
    $selectedPerson != null
      ? ($couples.find((c) => c.memberIds.includes($selectedPerson.id)) ?? null)
      : null;

  // Libellés de noms pour afficher les conjoints.
  $: nameById = new Map($population.map((p) => [p.id, p.nom]));

  // Mort manuelle (cause obligatoire).
  let cause = '';
  let killError: string | null = null;
  function onKill() {
    if (!$selectedPerson) return;
    const err = killPerson($selectedPerson.id, cause);
    killError = err;
    if (!err) {
      cause = '';
      killSheetOpen = false;
    }
  }

  // Édition du % de reproduction du couple (vide ⇒ hérité de la gaussienne).
  function onReproPct(e: Event) {
    if (!couple) return;
    const raw = (e.target as HTMLInputElement).value.trim();
    setCoupleReproPct(couple.id, raw === '' ? null : Number(raw));
  }
</script>

<section class:mobile={$isMobile}>
  {#if !fiche}
    <button type="button" class="back contour" on:click={backToList}>← Retour à la liste</button>
    <p class="muted">Aucun individu sélectionné.</p>
  {:else if $isMobile}
    <!-- ===== Fiche mobile (Feature 013) : identité d'abord, arbre en entrée ===== -->
    <div class="m-titlebar">
      <button type="button" class="m-icon" on:click={backToList} aria-label="Retour à la liste"
        >←</button
      >
      <h2 class="m-name">{fiche.nom}</h2>
    </div>

    <div class="m-body">
      <div class="m-status">
        <span class="chip statut" class:dead={!fiche.vivant}>
          {fiche.vivant ? 'Vivant' : 'Décédé'}
        </span>
        <span class="sub"
          >{fiche.especeId} · {fiche.genreId} · g{fiche.generation} · an {yearOf(
            fiche.dateNaissance,
          )} · {fiche.age} ans</span
        >
      </div>

      <div class="m-tiles">
        <div class="tile">
          <span class="tlabel">pouvoirs</span><span class="tval">{fiche.pouvoirs.length}</span>
        </div>
        <div class="tile">
          <span class="tlabel">traits actifs</span><span class="tval"
            >{fiche.traitsActifs.length}</span
          >
        </div>
      </div>

      {#if fiche.pouvoirs.length === 0}
        <p class="muted">Aucun pouvoir.</p>
      {:else}
        {#each fiche.pouvoirs as pv (pv.label)}
          <div class="card pouvoir">
            <div class="pouvoir-head">
              <strong>{pv.label}</strong>
              <span class="badge-accent">{pv.template}</span>
            </div>
            <Gauge label="puissance" value={pv.puissance} />
            <Gauge label="maîtrise" value={pv.maitrise} />
          </div>
        {/each}
      {/if}

      <button
        type="button"
        class="m-arbre"
        on:click={() => $selectedPerson && goToArbre($selectedPerson.id)}
      >
        <span class="m-arbre-txt">
          <span class="m-arbre-title">Arbre généalogique</span>
          <span class="m-arbre-sub">{fiche.enfants.length} enfant(s) · profondeur 2</span>
        </span>
        <span class="m-vignette" aria-hidden="true"><i></i><i class="mid"></i><i></i></span>
        <span class="chev" aria-hidden="true">›</span>
      </button>

      <div class="traits-head">
        <span class="field-label">Traits &amp; ADN</span>
        <TraitModeSelector />
      </div>
      {#if $traitMode >= 2}
        <h4>Traits actifs</h4>
        {#if fiche.traitsActifs.length === 0}
          <p class="muted">Aucun trait actif.</p>
        {:else}
          <ul class="traits">
            {#each fiche.traitsActifs as t (t.traitId)}
              <li>
                {t.label}
                {#if t.type}<span class="type-tag">{t.type}</span>{/if}
                {#if $traitMode >= 3}<span class="muted"> — résilience {t.resilience} %</span>{/if}
              </li>
            {/each}
          </ul>
        {/if}
      {/if}
      {#if $traitMode >= 3}
        <h4>Traits inactifs</h4>
        {#if fiche.traitsInactifs.length === 0}
          <p class="muted">Aucun trait inactif.</p>
        {:else}
          <ul class="traits inactifs">
            {#each fiche.traitsInactifs as t (t.traitId)}
              <li>
                {t.label}
                {#if t.type}<span class="type-tag">{t.type}</span>{/if}
                <span class="muted"> — résilience {t.resilience} %</span>
              </li>
            {/each}
          </ul>
        {/if}
      {/if}

      <div class="m-infos">
        <div class="irow">
          <span class="ilabel">identifiant</span><span class="ival mono">{fiche.id}</span>
        </div>
        {#if $selectedPerson && $selectedPerson.conjoints.length > 0}
          {#each $selectedPerson.conjoints as c (c.id + c.statut)}
            <div class="irow">
              <span class="ilabel">conjoint</span>
              <span class="ival"
                >{nameById.get(c.id) ?? c.id}
                <span class="badge-statut {c.statut}"
                  >{c.statut === 'actuel' ? 'actuel' : 'ex'}</span
                ></span
              >
            </div>
          {/each}
        {/if}
        {#if fiche.enfants.length > 0}
          <div class="irow">
            <span class="ilabel">enfants</span>
            <span class="ival enfants">
              {#each fiche.enfants as enfant (enfant.id)}
                <button type="button" class="child-link" on:click={() => selectPerson(enfant.id)}
                  >{enfant.nom}</button
                >
              {/each}
            </span>
          </div>
        {/if}
        {#if couple}
          <div class="irow">
            <span class="ilabel">% reproduction du couple</span>
            <input
              class="ival repro"
              type="number"
              min="0"
              max="100"
              placeholder="auto"
              value={couple.reproPct ?? ''}
              on:change={onReproPct}
            />
          </div>
        {/if}
      </div>
    </div>

    <div class="m-actionbar">
      <button
        type="button"
        class="contour explore"
        on:click={() => $selectedPerson && goToArbre($selectedPerson.id)}>Explorer l'arbre</button
      >
      {#if fiche.vivant}
        <button type="button" class="danger" on:click={() => (killSheetOpen = true)}>Tuer…</button>
      {/if}
    </div>

    {#if killSheetOpen}
      <MobileSheet title="Confirmer le décès" onClose={() => (killSheetOpen = false)}>
        <label class="m-field">
          <span class="m-label">Cause du décès</span>
          <input type="text" bind:value={cause} placeholder="cause obligatoire" />
        </label>
        {#if killError}<p class="error-msg" role="alert">{killError}</p>{/if}
        <button slot="footer" type="button" class="danger confirm-kill" on:click={onKill}>
          Confirmer le décès
        </button>
      </MobileSheet>
    {/if}
  {:else}
    <button type="button" class="back contour" on:click={backToList}>← Retour à la liste</button>

    <!-- Arbre généalogique en haut, pleine largeur (FR-002c). Clic = ouvrir la fiche cliquée. -->
    {#if tree}
      <div class="card arbre-zone">
        <div class="arbre-head">
          <h3>Arbre généalogique</h3>
          <button
            type="button"
            class="explorer contour"
            on:click={() => $selectedPerson && goToArbre($selectedPerson.id)}
          >
            Explorer l'arbre →
          </button>
        </div>
        {#key $selectedPerson?.id}
          <GenealogyTree node={tree} showAge={false} onSelect={selectPerson} />
        {/key}
        <TreeLegend />
      </div>
    {/if}

    <header class="fiche-head">
      <h2>{fiche.nom}</h2>
      <span class="chip statut" class:dead={!fiche.vivant}>
        {fiche.vivant ? 'Vivant' : 'Décédé'}
      </span>
      <span class="sub">{fiche.especeId} · {fiche.genreId} · génération {fiche.generation}</span>
    </header>

    <div class="cols">
      <!-- Colonne 1 : Informations -->
      <div class="card">
        <h3>Informations</h3>
        <dl class="infos">
          <div>
            <dt>Identifiant</dt>
            <dd class="mono">{fiche.id}</dd>
          </div>
          <div>
            <dt>Date de naissance</dt>
            <dd class="mono">{fiche.dateNaissance}</dd>
          </div>
          <div>
            <dt>Âge</dt>
            <dd>{fiche.age}</dd>
          </div>
          <div>
            <dt>Génération</dt>
            <dd>{fiche.generation}</dd>
          </div>
          <div>
            <dt>Espèce</dt>
            <dd>{fiche.especeId}</dd>
          </div>
          <div>
            <dt>Genre</dt>
            <dd>{fiche.genreId}</dd>
          </div>
          <div>
            <dt>Statut</dt>
            <dd>
              {fiche.vivant
                ? 'Vivant'
                : `Décédé${fiche.raisonDeces ? ` (${fiche.raisonDeces})` : ''}`}
            </dd>
          </div>
        </dl>
      </div>

      <!-- Colonne 2 : Cycle de vie -->
      <div class="card">
        <h3>Cycle de vie</h3>
        <div class="vie">
          {#if $selectedPerson && $selectedPerson.conjoints.length > 0}
            <div class="conjoints">
              <span class="field-label">Conjoints</span>
              <ul>
                {#each $selectedPerson.conjoints as c (c.id + c.statut)}
                  <li>
                    {nameById.get(c.id) ?? c.id}
                    <span class="badge-statut {c.statut}">
                      {c.statut === 'actuel' ? 'actuel' : 'ex'}
                    </span>
                  </li>
                {/each}
              </ul>
            </div>
          {:else}
            <p class="muted">Aucun conjoint.</p>
          {/if}

          {#if couple}
            <div class="couple">
              <label class="field-label" for="reproPct">% de reproduction du couple</label>
              <input
                id="reproPct"
                type="number"
                min="0"
                max="100"
                placeholder="auto (gaussienne)"
                value={couple.reproPct ?? ''}
                on:change={onReproPct}
              />
              <span class="muted">Laisser vide ⇒ dérivé de la gaussienne d'espèce.</span>
            </div>
          {/if}

          {#if fiche.vivant}
            <div class="kill">
              <label class="field-label" for="cause">Cause du décès</label>
              <div class="kill-row">
                <input id="cause" type="text" bind:value={cause} placeholder="cause obligatoire" />
                <button type="button" class="danger" on:click={onKill}>Tuer cet individu</button>
              </div>
              {#if killError}<p class="error-msg" role="alert">{killError}</p>{/if}
            </div>
          {/if}
        </div>
      </div>
    </div>

    <div class="traits-head">
      <h3>Traits &amp; pouvoirs</h3>
      <TraitModeSelector />
    </div>

    <!-- Mode 1 = pouvoirs seuls ; Mode 2 = + traits actifs ; Mode 3 = + inactifs + résilience. -->
    <h4>Pouvoir(s)</h4>
    {#if fiche.pouvoirs.length === 0}
      <p class="muted">Cet individu ne possède aucun pouvoir.</p>
    {:else}
      <div class="pouvoirs">
        {#each fiche.pouvoirs as pv (pv.label)}
          <div class="card pouvoir">
            <div class="pouvoir-head">
              <strong>{pv.label}</strong>
              <span class="badge-accent">{pv.template}</span>
            </div>
            <div class="stats">
              <Gauge label="Puissance" value={pv.puissance} />
              <Gauge label="Maîtrise" value={pv.maitrise} />
            </div>
          </div>
        {/each}
      </div>
    {/if}

    {#if $traitMode >= 2}
      <h4>ADN — traits actifs</h4>
      {#if fiche.traitsActifs.length === 0}
        <p class="muted">Aucun trait actif.</p>
      {:else}
        <ul class="traits">
          {#each fiche.traitsActifs as t (t.traitId)}
            <li>
              {t.label}
              {#if t.type}<span class="type-tag">{t.type}</span>{/if}
              {#if $traitMode >= 3}<span class="muted"> — résilience {t.resilience} %</span>{/if}
            </li>
          {/each}
        </ul>
      {/if}
    {/if}

    {#if $traitMode >= 3}
      <h4>ADN — traits inactifs</h4>
      {#if fiche.traitsInactifs.length === 0}
        <p class="muted">Aucun trait inactif.</p>
      {:else}
        <ul class="traits inactifs">
          {#each fiche.traitsInactifs as t (t.traitId)}
            <li>
              {t.label}
              {#if t.type}<span class="type-tag">{t.type}</span>{/if}
              <span class="muted"> — résilience {t.resilience} %</span>
            </li>
          {/each}
        </ul>
      {/if}
    {/if}

    <!-- Liste des enfants (FR-015) — chips cliquables vers leur fiche. -->
    <h4>Enfants</h4>
    {#if fiche.enfants.length === 0}
      <p class="muted">Aucun enfant.</p>
    {:else}
      <div class="enfants">
        {#each fiche.enfants as enfant (enfant.id)}
          <button type="button" class="chip" on:click={() => selectPerson(enfant.id)}>
            {enfant.nom}
          </button>
        {/each}
      </div>
    {/if}
  {/if}
</section>

<style>
  .back {
    margin-bottom: 1rem;
  }
  .arbre-zone {
    width: 100%;
    margin-bottom: 1.25rem;
  }
  .arbre-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.5rem;
    margin-bottom: 0.6rem;
  }
  .arbre-head h3 {
    margin: 0;
  }

  .fiche-head {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 0.6rem;
    margin: 0 0 1rem;
  }
  .fiche-head h2 {
    margin: 0;
    font-size: 26px;
  }
  .statut.dead {
    background: color-mix(in srgb, var(--danger) 18%, var(--bg-elev));
    border-color: color-mix(in srgb, var(--danger) 45%, var(--bg));
    color: var(--danger);
  }
  .sub {
    font-family: var(--mono);
    font-size: 12px;
    color: var(--fg-faint);
  }

  .cols {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 18px;
    margin-bottom: 1.25rem;
  }
  .card h3 {
    margin: 0 0 0.8rem;
    font-size: 15px;
  }
  .traits-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.5rem;
    flex-wrap: wrap;
    margin-top: 1rem;
  }
  .traits-head h3 {
    margin: 0;
  }
  h4 {
    margin: 0.9rem 0 0.4rem;
    font-size: 14px;
  }
  .infos {
    display: grid;
    grid-template-columns: 1fr;
    gap: 0.5rem 1.5rem;
    margin: 0;
  }
  .infos div {
    border-bottom: 1px solid var(--row-border);
    padding-bottom: 0.3rem;
  }
  dt {
    color: var(--fg-faint);
    font-size: 0.8rem;
  }
  dd {
    margin: 0;
  }
  .pouvoirs {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(15rem, 1fr));
    gap: 0.6rem;
  }
  .pouvoir-head {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    justify-content: space-between;
  }
  .stats {
    display: flex;
    flex-direction: column;
    margin-top: 0.4rem;
  }
  .traits {
    margin: 0;
    padding-left: 1.2rem;
  }
  .traits.inactifs {
    opacity: 0.75;
  }
  .type-tag {
    font-family: var(--mono);
    font-size: 10px;
    text-transform: var(--label-transform);
    color: var(--accent-text);
    border: 1px solid var(--chip-border);
    border-radius: var(--chip-radius);
    padding: 0 6px;
    margin-left: 4px;
  }
  .vie {
    display: flex;
    flex-direction: column;
    gap: 0.8rem;
  }
  .conjoints ul {
    margin: 0.2rem 0 0;
    padding-left: 1.2rem;
  }
  .badge-statut {
    font-size: 0.7rem;
    border-radius: var(--chip-radius);
    padding: 0 0.4rem;
    border: 1px solid var(--border);
    color: var(--fg-muted);
  }
  .badge-statut.actuel {
    color: var(--accent-text);
    border-color: var(--chip-border);
    background: var(--chip-bg);
  }
  .couple,
  .kill {
    display: flex;
    flex-direction: column;
    gap: 0.3rem;
  }
  .kill-row {
    display: flex;
    gap: 0.5rem;
  }
  .kill-row input {
    flex: 1;
  }
  .danger {
    background: transparent;
    border: 1px solid var(--danger);
    color: var(--danger);
    border-radius: var(--radius);
    padding: 0 0.8rem;
    white-space: nowrap;
  }
  .enfants {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }
  .enfants .chip {
    cursor: pointer;
  }
  .mono {
    font-family: var(--mono);
  }
  .muted {
    color: var(--fg-muted);
  }
  @media (max-width: 760px) {
    .cols {
      grid-template-columns: 1fr;
    }
  }

  /* ===== Fiche mobile (Feature 013) ===== */
  .m-titlebar {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 12px;
    border-bottom: 1px solid var(--border);
  }
  .m-icon {
    width: 36px;
    height: 36px;
    flex: none;
    padding: 0;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border: 1px solid var(--border);
    border-radius: var(--radius);
    background: var(--bg-elev);
    color: var(--accent-text);
    font-size: 16px;
  }
  .m-name {
    flex: 1;
    min-width: 0;
    margin: 0;
    font-size: 16px;
    font-weight: 600;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .m-body {
    display: flex;
    flex-direction: column;
    gap: 12px;
    padding: 12px;
  }
  .m-status {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 8px;
  }
  .m-tiles {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
  }
  .m-tiles .tile {
    background: var(--bg-elev);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 10px 12px;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }
  .tlabel {
    font-family: var(--mono);
    font-size: 10px;
    color: var(--fg-faint);
  }
  .tval {
    font-family: var(--mono);
    font-size: 20px;
    font-weight: 600;
    color: var(--accent-text);
  }
  .m-arbre {
    display: flex;
    align-items: center;
    gap: 10px;
    width: 100%;
    text-align: left;
    background: var(--bg-elev);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 12px;
    min-height: 48px;
  }
  .m-arbre-txt {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }
  .m-arbre-title {
    font-size: 15px;
    font-weight: 600;
  }
  .m-arbre-sub {
    font-family: var(--mono);
    font-size: 11px;
    color: var(--fg-muted);
  }
  .m-vignette {
    display: inline-flex;
    align-items: center;
    gap: 3px;
  }
  .m-vignette i {
    display: block;
    width: 12px;
    height: 14px;
    background: var(--row-border);
    border-radius: 2px;
  }
  .m-vignette i.mid {
    height: 20px;
    border: 1px solid var(--accent);
    background: var(--chip-bg);
  }
  .m-infos {
    background: var(--bg-elev);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    overflow: hidden;
  }
  .irow {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    padding: 10px 12px;
    border-bottom: 1px solid var(--row-border);
  }
  .irow:last-child {
    border-bottom: none;
  }
  .ilabel {
    font-family: var(--mono);
    font-size: 12px;
    text-transform: var(--label-transform);
    color: var(--fg-faint);
  }
  .ival {
    font-size: 13px;
    text-align: right;
  }
  .ival.enfants {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    justify-content: flex-end;
  }
  .child-link {
    background: transparent;
    border: none;
    padding: 0;
    color: var(--accent-text);
    cursor: pointer;
    font-size: 13px;
  }
  .ival.repro {
    width: 96px;
  }
  .m-actionbar {
    display: flex;
    gap: 8px;
    padding: 10px 12px;
    border-top: 1px solid var(--border);
  }
  .m-actionbar .explore {
    flex: 1;
    min-height: 44px;
  }
  .m-actionbar .danger {
    min-height: 44px;
  }
  .confirm-kill {
    width: 100%;
    min-height: 48px;
  }
</style>
