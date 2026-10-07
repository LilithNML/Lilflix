<script lang="ts">
  import { onMount } from 'svelte';
  import { getById } from '../services/content';
  import { href } from '../app/router';
  import { nextToWatch } from '../services/progress';
  import type { Movie, Series } from '../types';

  export let id: number;
  export let season: number | undefined = undefined;
  export let episode: number | undefined = undefined;

  let Player: any = null;
  let title = getById(id);
  let video: string | undefined;
  let next: { s: number; ep: number } | undefined;

  $: {
    title = getById(id);
    if (title?.kind === 'movie') {
      video = (title as Movie).video;
      next = undefined;
    } else if (title?.kind === 'series') {
      const series = title as Series;
      const s = season ?? series.seasons[0]?.number ?? 1;
      const ep = episode ?? series.seasons.find(item => item.number === s)?.episodes[0]?.number ?? 1;
      video = series.seasons.find(item => item.number === s)?.episodes.find(item => item.number === ep)?.video;
      const all = series.seasons.flatMap(item => item.episodes.map(e => ({ s: item.number, ep: e.number })));
      const index = all.findIndex(item => item.s === s && item.ep === ep);
      next = all[index + 1];
    } else {
      video = undefined;
      next = undefined;
    }
  }

  $: backHref = title?.kind === 'series'
    ? href({ name: 'series', id })
    : title?.kind === 'movie'
      ? href({ name: 'movie', id })
      : '#/';

  onMount(async () => {
    if (title && video) {
      const module = await import('../player/Player.svelte');
      Player = module.default;
    }
  });
</script>

{#if !title || !video}
  <main class="not-found"><h1>No encontrado</h1><p>El título o episodio solicitado no existe.</p><a href={backHref}>Volver</a></main>
{:else if Player}
  <svelte:component
    this={Player}
    {title}
    {video}
    season={season ?? 1}
    episode={episode ?? 1}
    {next}
    {backHref}
  />
{:else}
  <main class="loading" aria-live="polite">Cargando reproductor…</main>
{/if}

<style>
  .not-found, .loading { min-height: 100dvh; display: grid; place-content: center; justify-items: center; text-align: center; padding: 24px; background: #000; }
  .not-found p { color: var(--muted); }
  .not-found a { padding: 10px 16px; background: var(--surface); border-radius: var(--radius); text-decoration: none; }
</style>
