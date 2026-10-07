<script lang="ts">
  import { getById } from '../services/content';
  import { href } from '../app/router';
  import { get, nextToWatch } from '../services/progress';
  import type { Movie } from '../types';

  export let id: number;
  const title = getById(id) as Movie | undefined;
  $: progress = title ? get(title.id) : undefined;
  $: continuation = title ? nextToWatch(title, progress) : undefined;

  function formatDuration(minutes: number | null): string {
    if (!minutes) return 'Duración desconocida';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours ? `${hours} h ${mins} min` : `${mins} min`;
  }
</script>

{#if !title}
  <section class="not-found"><h1>No encontrado</h1><a href="#/">Volver al inicio</a></section>
{:else}
  <main class="detail">
    <header class="banner" style={title.meta.banner ? `background-image: linear-gradient(0deg, rgba(12,11,10,1), rgba(12,11,10,.08)), url("${title.meta.banner}")` : undefined}>
      <a class="back" href="#/">← Inicio</a>
      <div class="banner-copy"><p class="eyebrow">PELÍCULA</p><h1>{title.displayTitle}</h1><p>{title.meta.year ?? 'Año desconocido'} · {formatDuration(title.durationMin ?? title.meta.durationMin)}{title.meta.score ? ` · ★ ${title.meta.score}` : ''}</p></div>
    </header>
    <section class="info">
      <p class="description">{title.meta.description || 'Sin sinopsis disponible.'}</p>
      {#if title.meta.genres.length}<div class="chips">{#each title.meta.genres as genre}<span>{genre}</span>{/each}</div>{/if}
      <a class="primary" href={href({ name: 'watch-movie', id: title.id })}>{continuation ? 'Continuar' : 'Reproducir'}</a>
    </section>
  </main>
{/if}

<style>
  .detail { min-height: 100dvh; padding-bottom: 56px; }
  .banner { min-height: min(62dvh, 600px); margin: -24px -20px 0; padding: 24px max(20px, env(safe-area-inset-right)) 34px max(20px, env(safe-area-inset-left)); display: flex; flex-direction: column; justify-content: space-between; background-color: var(--surface); background-size: cover; background-position: center; }
  .back { align-self: flex-start; padding: 10px 14px; background: rgba(12,11,10,.7); border-radius: var(--radius); text-decoration: none; }
  .banner-copy { max-width: 850px; }
  .banner-copy h1 { margin: 0; }
  .eyebrow { color: var(--accent); font-weight: 800; letter-spacing: .16em; }
  .info { max-width: 850px; margin: -1px auto 0; }
  .description { color: var(--muted); white-space: pre-line; }
  .chips { display: flex; gap: 8px; flex-wrap: wrap; margin: 16px 0; }
  .chips span { padding: 5px 9px; border: 1px solid #3a352f; border-radius: 999px; color: var(--muted); font-size: .85rem; }
  .primary { display: inline-flex; min-height: 46px; align-items: center; padding: 0 20px; background: var(--accent); color: #16110b; border-radius: var(--radius); text-decoration: none; font-weight: 800; }
  .not-found { min-height: 70dvh; display: grid; place-content: center; text-align: center; }
</style>
