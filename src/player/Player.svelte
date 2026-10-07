<script lang="ts">
  import { onMount } from 'svelte';
  import { get, save } from '../services/progress';
  import { href } from '../app/router';
  import type { Title } from '../types';
  import { toEmbedUrl } from './host.ts';

  export let title: Title;
  export let video: string;
  export let season = 1;
  export let episode = 1;
  export let next: { s: number; ep: number } | undefined;
  export let backHref = '#/';

  let activeSeason = season;
  let activeEpisode = episode;
  let activeVideo = video;
  let iframeKey = 0;

  function persist() {
    const existing = get(title.id);
    save(title.id, {
      s: activeSeason,
      ep: activeEpisode,
      t: existing?.t ?? 0,
      d: existing?.d ?? 0,
      u: Date.now(),
      watched: existing?.watched ?? [],
    });
  }

  function startNext() {
    if (title.kind !== 'series' || !next) {
      window.location.hash = backHref;
      return;
    }

    const nextEpisode = title.seasons
      .find(item => item.number === next.s)
      ?.episodes.find(item => item.number === next.ep);

    if (!nextEpisode) return;

    persist();
    activeSeason = next.s;
    activeEpisode = next.ep;
    activeVideo = nextEpisode.video;
    iframeKey += 1;
    history.replaceState(
      null,
      '',
      href({ name: 'watch-series', id: title.id, season: activeSeason, episode: activeEpisode }),
    );
  }

  function markCurrentWatched() {
    const existing = get(title.id);
    save(title.id, {
      s: activeSeason,
      ep: activeEpisode,
      t: existing?.t ?? 0,
      d: existing?.d ?? 0,
      u: Date.now(),
      watched: Array.from(new Set([...(existing?.watched ?? []), activeSeason + ':' + activeEpisode])),
    });
  }

  onMount(() => {
    persist();
    return () => persist();
  });
</script>

<svelte:window on:keydown={(event) => {
  if (event.key === 'Escape') window.location.hash = backHref;
}} />

<div class="player">
  {#key iframeKey}
    <iframe
      src={toEmbedUrl(activeVideo)}
      title={title.displayTitle}
      allow="autoplay; fullscreen; picture-in-picture"
      allowfullscreen
      frameborder="0"
      referrerpolicy="no-referrer"
    ></iframe>
  {/key}

  <header class="top">
    <a href={backHref} aria-label="Volver">←</a>
    <strong>{title.displayTitle}{title.kind === 'series' ? ' · T' + activeSeason + ' E' + activeEpisode : ''}</strong>
  </header>

  <div class="bottom">
    {#if title.kind === 'series' && next}
      <button on:click={startNext}>Siguiente episodio →</button>
    {/if}
    <button class="watched" on:click={markCurrentWatched}>Marcar como visto</button>
  </div>
</div>

<style>
  .player { position: relative; width: 100%; height: 100dvh; background: #000; overflow: hidden; }
  iframe { display: block; width: 100%; height: 100%; border: 0; background: #000; }
  .top, .bottom { position: absolute; left: 0; right: 0; z-index: 2; display: flex; align-items: center; gap: 12px; pointer-events: none; }
  .top { top: 0; padding: max(12px, env(safe-area-inset-top)) 14px 18px; background: linear-gradient(#000b, transparent); }
  .bottom { bottom: 0; justify-content: flex-end; padding: 18px 14px max(14px, env(safe-area-inset-bottom)); background: linear-gradient(transparent, #000b); }
  .top a, .bottom button { pointer-events: auto; }
  .top a { display: grid; place-items: center; width: 44px; height: 44px; text-decoration: none; font-size: 1.5rem; }
  .top strong { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .bottom button { min-height: 44px; border: 0; border-radius: var(--radius); padding: 10px 14px; background: var(--accent); color: #16110b; font-weight: 800; }
  .bottom .watched { background: var(--surface); color: var(--text); }
</style>
