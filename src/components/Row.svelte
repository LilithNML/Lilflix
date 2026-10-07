<script lang="ts">
  import PosterCard from './PosterCard.svelte';
  import type { Title } from '../types';

  export let title: string;
  export let items: Title[] = [];
</script>

<section class="row" aria-labelledby={title.replace(/\\s+/g, '-').toLowerCase()}>
  <div class="heading">
    <h2 id={title.replace(/\\s+/g, '-').toLowerCase()}>{title}</h2>
  </div>
  {#if items.length}
    <div class="rail">
      {#each items as item (item.id)}
        <PosterCard title={item} />
      {/each}
    </div>
  {:else}
    <p class="muted">Aún no hay títulos en esta categoría.</p>
  {/if}
</section>

<style>
  .row { margin-top: 30px; }
  h2 { margin: 0; font-size: clamp(1.2rem, 3vw, 1.7rem); }
  .rail { display: flex; gap: 12px; overflow-x: auto; padding: 14px 2px 12px; scroll-snap-type: x mandatory; scrollbar-width: thin; }
  .rail::-webkit-scrollbar { height: 6px; }
  .muted { color: var(--muted); }
</style>
