<script lang="ts">
  import { getById } from '../services/content';
  import { href } from '../app/router';
  import type { Series } from '../types';
  import EpisodeRow from '../components/EpisodeRow.svelte';
  import { get, nextToWatch } from '../services/progress';

  export let id: number;
  const title = getById(id) as Series | undefined;
  let selectedSeason = title?.seasons[0]?.number ?? 1;
  $: season = title?.seasons.find(item => item.number === selectedSeason);
  $: progress = title ? get(title.id) : undefined;
  $: continuation = title ? nextToWatch(title, progress) : undefined;
</script>

{#if !title}
  <section class="not-found"><h1>No encontrado</h1><a href="#/">Volver al inicio</a></section>
{:else}
  <main class="detail">
    <header class="banner" style={title.meta.banner ? `background-image: linear-gradient(0deg, rgba(12,11,10,1), rgba(12,11,10,.08)), url("${title.meta.banner}")` : undefined}>
      <a class="back" href="#/">← Inicio</a>
      <div class="banner-copy"><p class="eyebrow">SERIE</p><h1>{title.displayTitle}</h1><p>{title.meta.year ?? 'Año desconocido'} · {title.meta.format ?? 'Serie'} · {title.meta.episodes ?? totalEpisodes(title)} episodios{title.meta.score ? ` · ★ ${title.meta.score}` : ''}</p></div>
    </header>

    <section class="info">
      <p class="description">{title.meta.description || 'Sin sinopsis disponible.'}</p>
      {#if title.meta.genres.length}<div class="chips">{#each title.meta.genres as genre}<span>{genre}</span>{/each}</div>{/if}
      <a class="primary" href={continuation ? href({ name: 'watch-series', id: title.id, season: continuation.s, episode: continuation.ep }) : '#'}>{continuation ? 'Continuar' : 'Reproducir'}</a>
    </section>

    {#if title.seasons.length > 1}
      <label class="season-select">Temporada
        <select bind:value={selectedSeason}>{#each title.seasons as item}<option value={item.number}>Temporada {item.number}</option>{/each}</select>
      </label>
    {/if}

    {#if season}
      <section class="episodes" aria-label={`Temporada ${season.number}`}>
        <h2>Temporada {season.number}</h2>
        {#each season.episodes as episode (episode.number)}
          <EpisodeRow {episode} season={season.number} titleId={title.id} watched={progress?.watched.includes(`${season.number}:${episode.number}`) ?? false} />
        {/each}
      </section>
    {/if}
  </main>
{/if}

<script lang="ts">
  function totalEpisodes(value: Series): number {
    return value.seasons.reduce((sum, item) => sum + item.episodes.length, 0);
  }
</script>

<style>
  .detail { min-height: 100dvh; padding-bottom: 56px; }
  .banner { min-height: min(58dvh, 560px); margin: -24px -20px 0; padding: 24px max(20px, env(safe-area-inset-right)) 34px max(20px, env(safe-area-inset-left)); display: flex; flex-direction: column; justify-content: space-between; background-color: var(--surface); background-size: cover; background-position: center; }
  .back { align-self: flex-start; padding: 10px 14px; background: rgba(12,11,10,.7); border-radius: var(--radius); text-decoration: none; }
  .banner-copy { max-width: 850px; }
  .banner-copy h1 { margin: 0; }
  .eyebrow { color: var(--accent); font-weight: 800; letter-spacing: .16em; }
  .info { max-width: 850px; margin: -1px auto 0; }
  .description { color: var(--muted); white-space: pre-line; display: -webkit-box; -webkit-line-clamp: 4; -webkit-box-orient: vertical; overflow: hidden; }
  .chips { display: flex; gap: 8px; flex-wrap: wrap; margin: 16px 0; }
  .chips span { padding: 5px 9px; border: 1px solid #3a352f; border-radius: 999px; color: var(--muted); font-size: .85rem; }
  .primary { display: inline-flex; min-height: 46px; align-items: center; padding: 0 20px; background: var(--accent); color: #16110b; border-radius: var(--radius); text-decoration: none; font-weight: 800; }
  .season-select { display: flex; gap: 10px; align-items: center; margin: 30px 0 14px; color: var(--muted); }
  select { background: var(--surface); color: var(--text); border: 1px solid #3a352f; border-radius: var(--radius); min-height: 44px; padding: 0 10px; }
  .episodes { max-width: 850px; }
  .episodes h2 { font-size: 1.15rem; }
  .not-found { min-height: 70dvh; display: grid; place-content: center; text-align: center; }
</style>
