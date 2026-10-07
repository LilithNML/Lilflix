<script lang="ts">
  import { getById } from '../services/content';
  import { href } from '../app/router';
  import type { Movie, Series } from '../types';

  export let id: number;
  export let season: number | undefined = undefined;
  export let episode: number | undefined = undefined;

  $: title = getById(id);
  $: media = title?.kind === 'series'
    ? (title as Series).seasons.find(item => item.number === season)?.episodes.find(item => item.number === episode)
    : undefined;
  $: video = title?.kind === 'movie' ? (title as Movie).video : media?.video;
  $: backHref = title?.kind === 'series' ? href({ name: 'series', id }) : href({ name: 'movie', id });
</script>

<main class="watch-shell">
  <header>
    <a href={backHref} aria-label="Volver">←</a>
    <strong>{title?.displayTitle ?? 'Reproductor'}</strong>
  </header>

  <section class="placeholder">
    {#if !title || !video}
      <h1>No encontrado</h1>
      <p>El título o episodio solicitado no existe.</p>
    {:else}
      <h1>{title.displayTitle}</h1>
      <p>El reproductor se implementará en el TICKET-5.</p>
      {#if title.kind === 'series'}<p>Temporada {season} · Episodio {episode}</p>{/if}
    {/if}
  </section>
</main>

<style>
  .watch-shell { min-height: 100dvh; background: #000; color: var(--text); }
  header { position: fixed; inset: 0 0 auto; z-index: 2; display: flex; align-items: center; gap: 14px; padding: max(12px, env(safe-area-inset-top)) max(16px, env(safe-area-inset-right)) 12px max(16px, env(safe-area-inset-left)); background: linear-gradient(#000, transparent); }
  header a { width: 44px; height: 44px; display: grid; place-items: center; text-decoration: none; font-size: 1.5rem; }
  .placeholder { min-height: 100dvh; display: grid; place-content: center; justify-items: center; text-align: center; padding: 80px 24px; }
  .placeholder p { color: var(--muted); }
</style>
