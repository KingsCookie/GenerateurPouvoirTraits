<script lang="ts">
  import { parameters, regenerateSeed, setParam, generate } from '../stores/appState.js';
  import { statA, POWER_TEMPLATES, type Parameters, type PowerTemplate } from '../../core/index.js';
  import { paramsTab, setParamsTab } from '../stores/ui.js';
  import ThemeControls from '../components/ThemeControls.svelte';
  import ResilienceOverrides from '../components/ResilienceOverrides.svelte';
  import CatalogueModal from '../components/CatalogueModal.svelte';
  import EspecesModal from '../components/EspecesModal.svelte';

  // Onglets « Principaux » / « Avancés » (Feature 012) : un seul panneau visible à la fois,
  // onglet actif mémorisé (store `paramsTab`, localStorage). Remplace l'ancien sommaire latéral.
  // Ouverture des éditeurs volumineux en modales (état de session local, non persisté).
  let showCatalogue = false;
  let showEspeces = false;

  // Clés numériques éditables des paramètres (toutes sauf A, calculée).
  type NumKey = {
    [K in keyof Parameters]: Parameters[K] extends number ? K : never;
  }[keyof Parameters];

  function onSeed(e: Event) {
    setParam('seed', (e.target as HTMLInputElement).value.trim());
  }
  function onNumber(key: NumKey, e: Event) {
    const v = Number((e.target as HTMLInputElement).value);
    setParam(key, Number.isFinite(v) ? v : 0);
  }
  function onBool(key: 'genomeMalusEnabled', e: Event) {
    setParam(key, (e.target as HTMLInputElement).checked);
  }

  // Libellés des gabarits de pouvoir (§6.1) pour les pondérations.
  const TEMPLATE_LABELS: Record<PowerTemplate, string> = {
    AE: 'AE — Action + Élément',
    PE: 'PE — Partie + État',
    PA: 'PA — Partie + Ajout',
    PR: 'PR — Partie + Remplacement',
  };
  function onTemplateWeight(t: PowerTemplate, e: Event) {
    const v = Number((e.target as HTMLInputElement).value);
    setParam('templateWeights', {
      ...$parameters.templateWeights,
      [t]: Number.isFinite(v) ? Math.max(0, v) : 0,
    });
  }

  // A = 100 − 2·B − C (FR-030) : affichée en lecture seule.
  $: statAValue = statA($parameters);
</script>

<div class="params-page">
  <!-- Barre d'action persistante : onglets + bouton Générer (visible quel que soit l'onglet, FR-007b) -->
  <div class="params-bar">
    <div class="tabs" role="tablist" aria-label="Sections des paramètres">
      <button
        type="button"
        role="tab"
        class="tab"
        class:active={$paramsTab === 'principaux'}
        aria-selected={$paramsTab === 'principaux'}
        on:click={() => setParamsTab('principaux')}
      >
        Principaux
      </button>
      <button
        type="button"
        role="tab"
        class="tab"
        class:active={$paramsTab === 'avances'}
        aria-selected={$paramsTab === 'avances'}
        on:click={() => setParamsTab('avances')}
      >
        Avancés
      </button>
    </div>
    <button class="primary generate" type="button" on:click={generate}>
      Générer la population
    </button>
  </div>

  <section class="params-main" aria-label="Réglages">
    {#if $paramsTab === 'principaux'}
      <!-- ================= ONGLET PRINCIPAUX ================= -->

      <!-- Paramètres graphiques (FR-004) — 3 axes d'apparence -->
      <fieldset>
        <legend>Paramètres graphiques</legend>
        <p class="desc">
          Apparence de l'interface : style graphique, palette d'accent et mode clair/sombre. Vos
          choix sont mémorisés localement et restaurés au rechargement.
        </p>
        <ThemeControls variant="full" />
      </fieldset>

      <!-- Graine + population essentielle -->
      <fieldset>
        <legend>Génération de la population</legend>

        <div class="field">
          <label for="seed">Graine (seed) — entier 64 bits</label>
          <p class="desc">
            Source unique de l'aléatoire : même graine et mêmes actions ⇒ résultats strictement
            identiques.
          </p>
          <div class="seed-row">
            <input
              id="seed"
              type="text"
              value={$parameters.seed}
              on:input={onSeed}
              spellcheck="false"
            />
            <button type="button" on:click={regenerateSeed} title="Tirer une nouvelle seed">
              ⟳ Régénérer
            </button>
          </div>
        </div>

        <div class="grid">
          <div class="field">
            <label for="batchSize">Nombre d'individus</label>
            <p class="desc">Effectif du batch initial généré à partir de la graine.</p>
            <input
              id="batchSize"
              type="number"
              min="0"
              value={$parameters.batchSize}
              on:input={(e) => onNumber('batchSize', e)}
            />
          </div>
          <div class="field">
            <label for="birthYear">Année de naissance</label>
            <p class="desc">
              Année de naissance du batch initial (an 0 par défaut ; pas d'avancement du temps en
              Feature 2).
            </p>
            <input
              id="birthYear"
              type="number"
              value={$parameters.birthYear}
              on:input={(e) => onNumber('birthYear', e)}
            />
          </div>
          <div class="field">
            <label for="powerChancePct">Chance de pouvoir (%)</label>
            <p class="desc">Probabilité qu'un individu du batch initial naisse avec un pouvoir.</p>
            <input
              id="powerChancePct"
              type="number"
              min="0"
              max="100"
              value={$parameters.powerChancePct}
              on:input={(e) => onNumber('powerChancePct', e)}
            />
          </div>
        </div>
      </fieldset>
    {:else}
      <!-- ================= ONGLET AVANCÉS ================= -->

      <!-- §9.1 — Génération de pouvoir (réglages fins) -->
      <fieldset>
        <legend>Génération de pouvoir</legend>
        <div class="grid">
          <div class="field">
            <label for="initialResilience">Résilience initiale (%)</label>
            <p class="desc">
              Résilience de départ d'un trait nouvellement créé (pouvoir tiré, trait généré ou
              gagné).
            </p>
            <input
              id="initialResilience"
              type="number"
              min="0"
              max="100"
              value={$parameters.initialResilience}
              on:input={(e) => onNumber('initialResilience', e)}
            />
          </div>
          <div class="field">
            <label for="duplicationD">Constante de duplication D</label>
            <p class="desc">
              Un trait secondaire a (résilience ÷ D) % de chance d'être copié dans une autre
              sous-liste.
            </p>
            <input
              id="duplicationD"
              type="number"
              min="1"
              value={$parameters.duplicationD}
              on:input={(e) => onNumber('duplicationD', e)}
            />
          </div>
          <div class="field">
            <label for="generationK">Constante de génération K (%)</label>
            <p class="desc">
              Probabilité de générer un nouveau trait (Ka, Ke…) en construisant un pouvoir.
            </p>
            <input
              id="generationK"
              type="number"
              min="0"
              max="100"
              value={$parameters.generationK}
              on:input={(e) => onNumber('generationK', e)}
            />
          </div>
        </div>
      </fieldset>

      <!-- §9.2 — Hérédité & naissance -->
      <fieldset>
        <legend>Hérédité &amp; naissance</legend>

        <div class="grid">
          <div class="field">
            <label for="resilienceMax">Résilience maximale (%)</label>
            <p class="desc">
              Plafond de résilience : le bonus ne fait jamais monter un trait au-dessus.
            </p>
            <input
              id="resilienceMax"
              type="number"
              min="0"
              max="100"
              value={$parameters.resilienceMax}
              on:input={(e) => onNumber('resilienceMax', e)}
            />
          </div>
          <div class="field">
            <label for="bonusPoints">Bonus de résilience (points)</label>
            <p class="desc">
              Points ajoutés à la résilience quand un trait est transmis actif à l'enfant.
            </p>
            <input
              id="bonusPoints"
              type="number"
              min="0"
              value={$parameters.bonusPoints}
              on:input={(e) => onNumber('bonusPoints', e)}
            />
          </div>
          <div class="field">
            <label for="malusPoints">Malus de résilience (points)</label>
            <p class="desc">Points retirés à la résilience quand un trait est transmis inactif.</p>
            <input
              id="malusPoints"
              type="number"
              min="0"
              value={$parameters.malusPoints}
              on:input={(e) => onNumber('malusPoints', e)}
            />
          </div>
          <div class="field">
            <label for="disappearThreshold">Seuil de disparition (%)</label>
            <p class="desc">
              Sous ce seuil de résilience, le trait disparaît définitivement de l'ADN de la lignée.
            </p>
            <input
              id="disappearThreshold"
              type="number"
              min="0"
              max="100"
              value={$parameters.disappearThreshold}
              on:input={(e) => onNumber('disappearThreshold', e)}
            />
          </div>
          <div class="field">
            <label for="strongMutationRatePct">Taux de mutation forte (%)</label>
            <p class="desc">
              Chance par naissance d'un pouvoir gabarit unique (les traits parentaux deviennent
              inactifs).
            </p>
            <input
              id="strongMutationRatePct"
              type="number"
              min="0"
              max="100"
              value={$parameters.strongMutationRatePct}
              on:input={(e) => onNumber('strongMutationRatePct', e)}
            />
          </div>
          <div class="field">
            <label for="noPowerRatePct">Taux de naissance sans pouvoir (%)</label>
            <p class="desc">
              Chance par naissance d'un enfant sans pouvoir (les traits parentaux deviennent
              inactifs).
            </p>
            <input
              id="noPowerRatePct"
              type="number"
              min="0"
              max="100"
              value={$parameters.noPowerRatePct}
              on:input={(e) => onNumber('noPowerRatePct', e)}
            />
          </div>
          <div class="field">
            <label for="weakMutationGainPct">Mutation faible — gain (%)</label>
            <p class="desc">
              Chance, en naissance normale, de gagner un trait aléatoire supplémentaire (rendu
              actif).
            </p>
            <input
              id="weakMutationGainPct"
              type="number"
              min="0"
              max="100"
              value={$parameters.weakMutationGainPct}
              on:input={(e) => onNumber('weakMutationGainPct', e)}
            />
          </div>
          <div class="field">
            <label for="weakMutationLossPct">Mutation faible — perte (%)</label>
            <p class="desc">
              Chance, en naissance normale, de perdre un de ses traits (actif ou inactif).
            </p>
            <input
              id="weakMutationLossPct"
              type="number"
              min="0"
              max="100"
              value={$parameters.weakMutationLossPct}
              on:input={(e) => onNumber('weakMutationLossPct', e)}
            />
          </div>
          <div class="field">
            <label for="statB">B — moyenne ∓ 1 (%)</label>
            <p class="desc">
              Probabilité d'attribuer « moyenne −1 » (et autant pour « moyenne +1 ») à la
              puissance/maîtrise héritée.
            </p>
            <input
              id="statB"
              type="number"
              min="0"
              max="100"
              value={$parameters.statB}
              on:input={(e) => onNumber('statB', e)}
            />
          </div>
          <div class="field">
            <label for="statC">C — moyenne (%)</label>
            <p class="desc">
              Probabilité d'attribuer exactement la moyenne des parents à la puissance/maîtrise.
            </p>
            <input
              id="statC"
              type="number"
              min="0"
              max="100"
              value={$parameters.statC}
              on:input={(e) => onNumber('statC', e)}
            />
          </div>
          <div class="field">
            <label for="statA">A — nouvelle valeur (%) <span class="ro">calculé</span></label>
            <p class="desc">
              Probabilité d'une nouvelle valeur aléatoire 1-10. Calculé : A = 100 − 2·B − C.
            </p>
            <input
              id="statA"
              type="number"
              value={statAValue}
              readonly
              disabled
              title="A = 100 − 2·B − C (lecture seule)"
            />
          </div>
        </div>

        <label class="check">
          <input
            type="checkbox"
            checked={$parameters.genomeMalusEnabled}
            on:change={(e) => onBool('genomeMalusEnabled', e)}
          />
          <span>
            Malus sur le génome lors des cas spéciaux
            <span class="desc inline">
              (mutation forte / sans pouvoir : applique un malus aux traits hérités inactifs ;
              désactivé par défaut)
            </span>
          </span>
        </label>
      </fieldset>

      <!-- §9.1 — Pondérations des gabarits de pouvoir -->
      <fieldset>
        <legend>Pondérations des gabarits</legend>
        <p class="desc">
          Poids relatif de chaque gabarit lors d'une mutation forte / d'un pouvoir de genèse (les
          poids par type et par trait s'éditent dans « Catalogues de traits »).
        </p>
        <div class="grid">
          {#each POWER_TEMPLATES as t (t)}
            <div class="field">
              <label for={`tw-${t}`}>{TEMPLATE_LABELS[t]}</label>
              <input
                id={`tw-${t}`}
                type="number"
                min="0"
                step="0.1"
                value={$parameters.templateWeights[t]}
                on:input={(e) => onTemplateWeight(t, e)}
              />
            </div>
          {/each}
        </div>
      </fieldset>

      <!-- §9.2 — Résilience déclinée global → type → trait -->
      <fieldset>
        <legend>Résilience (global → type → trait)</legend>
        <ResilienceOverrides />
      </fieldset>

      <!-- Accès aux éditeurs volumineux en modale (BUG-001 : déplacé de Principaux vers Avancés) -->
      <fieldset>
        <legend>Catalogues &amp; espèces</legend>
        <p class="desc">
          Édition des traits (types, pondérations, résilience) et des espèces (genres, reproduction,
          portée, consanguinité) dans des fenêtres dédiées.
        </p>
        <div class="editor-actions">
          <button type="button" on:click={() => (showCatalogue = true)}>
            Modifier les catalogues de traits…
          </button>
          <button type="button" on:click={() => (showEspeces = true)}>
            Gérer les espèces &amp; la reproduction…
          </button>
        </div>
      </fieldset>
    {/if}
  </section>
</div>

{#if showCatalogue}
  <CatalogueModal onClose={() => (showCatalogue = false)} />
{/if}
{#if showEspeces}
  <EspecesModal onClose={() => (showEspeces = false)} />
{/if}

<style>
  .params-page {
    display: flex;
    flex-direction: column;
    gap: 18px;
    min-width: 0;
  }
  .params-bar {
    position: sticky;
    top: 76px;
    z-index: 5;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    flex-wrap: wrap;
    padding: 8px 0;
    background: var(--bg);
  }
  .tabs {
    display: flex;
    gap: 6px;
  }
  .tab {
    background: transparent;
    border: 1px solid var(--border);
    color: var(--fg-muted);
    border-radius: var(--chip-radius);
    padding: 8px 18px;
    font-size: 14px;
    font-weight: 600;
  }
  .tab.active {
    background: var(--accent);
    color: var(--accent-fg, #fff);
    border-color: var(--accent);
  }
  .params-main {
    display: flex;
    flex-direction: column;
    gap: 18px;
    min-width: 0;
  }
  fieldset {
    background: var(--bg-elev);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 22px 24px;
    margin: 0;
  }
  legend {
    padding: 0;
    margin-bottom: 6px;
    font-weight: 700;
    font-size: 15px;
    color: var(--fg);
    display: flex;
    align-items: center;
    gap: 8px;
  }
  legend::before {
    content: '';
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: var(--accent);
  }
  .grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(15rem, 1fr));
    gap: 1rem 1.2rem;
  }
  .field {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }
  label {
    color: var(--fg);
    font-size: 0.9rem;
    font-weight: 600;
  }
  .desc {
    margin: 0;
    color: var(--fg-muted);
    font-size: 0.78rem;
    line-height: 1.3;
  }
  .desc.inline {
    display: block;
    font-weight: 400;
  }
  .ro {
    font-size: 0.7rem;
    color: var(--accent);
    border: 1px solid var(--accent);
    border-radius: 999px;
    padding: 0 0.4rem;
    font-weight: 400;
  }
  .seed-row {
    display: flex;
    gap: 0.5rem;
  }
  .seed-row input {
    flex: 1;
    font-family: ui-monospace, monospace;
  }
  .editor-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 0.6rem;
  }
  .check {
    display: flex;
    align-items: flex-start;
    gap: 0.5rem;
    margin-top: 1rem;
    color: var(--fg);
    font-size: 0.9rem;
    font-weight: 600;
  }
  .check input {
    margin-top: 0.15rem;
  }
  input[readonly] {
    opacity: 0.7;
  }
  @media (max-width: 760px) {
    .params-bar {
      position: static;
    }
  }
</style>
