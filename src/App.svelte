<script lang="ts">
  import { onMount } from 'svelte';

  let status = 'Base de Lilflix lista';

  onMount(() => {
    status = 'Catálogo preparado. Ejecuta npm run sync para actualizar metadatos.';
  });
</script>

<main class="shell">
  <section class="empty-state" aria-labelledby="title">
    <p class="eyebrow">LILFLIX</p>
    <h1 id="title">Tu catálogo privado.</h1>
    <p>{status}</p>
  </section>
</main>
