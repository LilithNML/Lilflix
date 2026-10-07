<script lang="ts">
  import type { Title } from '../types';
  import { href } from '../app/router';

  export let title: Title;
  $: watchHref = title.kind === 'series'
    ? href({ name: 'series', id: title.id })
    : href({ name: 'movie', id: title.id });
</script>

<section class="hero" style={title.meta.banner ? `background-image: linear-gradient(90deg, rgba(12,11,10,.96) 0%, rgba(12,11,10,.68) 45%, rgba(12,11,10,.08) 100%), url("${title.meta.banner}")` : undefined}>
  <div class="hero-copy">
    <p class="eyebrow">LILFLIX</p>
    <h1>{title.displayTitle}</h1>
    <p class="meta">{title.meta.year ?? 'Año desconocido'} · {title.kind === 'series' ? (title.meta.format ?? 'Serie') : 'Película'}{title.meta.score ? ` · ★ ${title.meta.score}` : ''}</p>
    <p class="description">{title.meta.description || 'Sin sinopsis disponible.'}</p>
    <a class="primary" href={watchHref}>{title.kind === 'series' ? 'Reproducir' : 'Reproducir'}</a>
  </div>
</section>

<style>
  .hero { min-height: min(72dvh, 680px); display: flex; align-items: end; background-color: var(--surface); background-size: cover; background-position: center; border-radius: 0 0 var(--radius) var(--radius); margin: -24px -20px 0; }
  .hero-copy { width: min(700px, 100%); padding: clamp(28px, 7vw, 72px); padding-bottom: clamp(36px, 8vw, 84px); }
  .eyebrow { color: var(--accent); font-weight: 800; letter-spacing: .18em; margin: 0 0 8px; }
  h1 { margin: 0 0 12px; font-size: clamp(2.3rem, 7vw, 5.4rem); }
  .meta { color: var(--text); }
  .description { display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 4; overflow: hidden; max-width: 62ch; }
  .primary { display: inline-flex; align-items: center; min-height: 46px; padding: 0 20px; background: var(--accent); color: #16110b; border-radius: var(--radius); text-decoration: none; font-weight: 800; margin-top: 8px; }
  @media (max-width: 600px) { .hero { min-height: 66dvh; } }
</style>
