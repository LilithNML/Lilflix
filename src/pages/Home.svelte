<script lang="ts">
  import Hero from '../components/Hero.svelte';
  import Row from '../components/Row.svelte';
  import { getFeatured, getMovies, getSeries } from '../services/content';

  const series = getSeries();
  const movies = getMovies();
  const featured = getFeatured();
</script>

<main class="home">
  {#if featured}
    <Hero title={featured} />
  {/if}
  <div class="content">
    {#if !featured && !series.length && !movies.length}
      <section class="empty"><p class="eyebrow">LILFLIX</p><h1>Tu catálogo está vacío.</h1><p>Añade títulos en <code>src/content/catalog.ts</code> y ejecuta <code>npm run sync</code>.</p></section>
    {:else}
      <Row title="Series" items={series} />
      <Row title="Películas" items={movies} />
    {/if}
  </div>
</main>

<style>
  .home { min-height: 100dvh; }
  .content { max-width: 1440px; margin: auto; padding-bottom: 48px; }
  .empty { min-height: 60dvh; display: grid; place-content: center; max-width: 650px; margin: auto; }
  code { color: var(--text); }
</style>
