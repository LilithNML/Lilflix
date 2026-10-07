<script lang="ts">
  import type { Title } from '../types';
  import { href } from '../app/router';

  export let title: Title;
  let imageFailed = false;
</script>

<a class="card" href={href(title.kind === 'series' ? { name: 'series', id: title.id } : { name: 'movie', id: title.id })} aria-label={title.displayTitle}>
  <div class="poster" style={title.meta.color && !imageFailed ? `background-color: ${title.meta.color}` : undefined}>
    {#if title.meta.cover && !imageFailed}
      <img src={title.meta.cover} alt="" loading="lazy" width="300" height="450" on:error={() => imageFailed = true} />
    {:else}
      <span>{title.displayTitle.charAt(0).toUpperCase()}</span>
    {/if}
  </div>
  <strong>{title.displayTitle}</strong>
  <small>{title.kind === 'series' ? 'Serie' : 'Película'}</small>
</a>

<style>
  .card { display: block; min-width: 142px; width: clamp(142px, 18vw, 210px); text-decoration: none; scroll-snap-align: start; }
  .poster { aspect-ratio: 2 / 3; border-radius: var(--radius); overflow: hidden; display: grid; place-items: center; background: var(--surface); margin-bottom: 10px; }
  img { width: 100%; height: 100%; object-fit: cover; transition: transform 160ms ease, opacity 160ms ease; }
  .card:hover img { transform: scale(1.025); }
  .poster span { font-size: 2.5rem; font-weight: 800; color: var(--muted); }
  strong { display: block; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  small { color: var(--muted); }
  @media (max-width: 500px) { .card { min-width: 42vw; } }
</style>
