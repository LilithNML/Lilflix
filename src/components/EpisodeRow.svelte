<script lang="ts">
  import type { Episode } from '../types';
  import { href } from '../app/router';

  export let episode: Episode;
  export let season: number;
  export let titleId: number;
  export let watched = false;

  $: videoHref = href({ name: 'watch-series', id: titleId, season, episode: episode.number });
</script>

<a class:watched class="episode" href={videoHref}>
  <div class="thumb">
    {#if episode.thumb}<img src={episode.thumb} alt="" loading="lazy" width="240" height="135" />{:else}<span>{episode.number}</span>{/if}
  </div>
  <div class="copy">
    <strong>EP {episode.number}{episode.title ? ` · ${episode.title}` : ''}</strong>
    {#if episode.durationMin}<small>{episode.durationMin} min</small>{/if}
    {#if watched}<span class="seen">Visto</span>{/if}
  </div>
</a>

<style>
  .episode { display: grid; grid-template-columns: 140px 1fr; gap: 14px; padding: 10px 0; color: inherit; text-decoration: none; border-top: 1px solid #27231f; min-height: 96px; }
  .thumb { aspect-ratio: 16 / 9; background: var(--surface); border-radius: var(--radius); overflow: hidden; display: grid; place-items: center; color: var(--muted); font-weight: 800; }
  .thumb img { width: 100%; height: 100%; object-fit: cover; }
  .copy { display: flex; flex-direction: column; justify-content: center; gap: 5px; }
  small, .seen { color: var(--muted); }
  .seen { font-size: .8rem; color: var(--accent); }
  .watched { opacity: .72; }
  @media (max-width: 520px) { .episode { grid-template-columns: 110px 1fr; } }
</style>
