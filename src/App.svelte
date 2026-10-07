<script lang="ts">
  import { onMount } from 'svelte';
  import { parseRoute } from './app/router';
  import Home from './pages/Home.svelte';

  let route = parseRoute();
  let Page: any = Home;
  let pageProps: Record<string, unknown> = {};

  async function loadRoute() {
    route = parseRoute();
    pageProps = {};

    switch (route.name) {
      case 'home':
        Page = Home;
        break;
      case 'series': {
        const module = await import('./pages/SeriesPage.svelte');
        Page = module.default;
        pageProps = { id: route.id };
        break;
      }
      case 'movie': {
        const module = await import('./pages/MoviePage.svelte');
        Page = module.default;
        pageProps = { id: route.id };
        break;
      }
      case 'watch-series':
      case 'watch-movie': {
        const module = await import('./pages/Watch.svelte');
        Page = module.default;
        pageProps = route.name === 'watch-series'
          ? { id: route.id, season: route.season, episode: route.episode }
          : { id: route.id };
        break;
      }
      case 'not-found': {
        const module = await import('./pages/NotFound.svelte');
        Page = module.default;
        break;
      }
    }
  }

  onMount(() => {
    const handleHashChange = () => { void loadRoute(); };
    window.addEventListener('hashchange', handleHashChange);
    void loadRoute();
    return () => window.removeEventListener('hashchange', handleHashChange);
  });
</script>

<svelte:component this={Page} {...pageProps} />
