<main>
  <h1>Lilflix</h1>
  <p>Tu catálogo privado, en un solo lugar.</p>
</main>

<style>
  :global(html) {
    color-scheme: dark;
    background: #0c0b0a;
  }

  :global(body) {
    margin: 0;
    min-width: 320px;
    min-height: 100vh;
    font-family: system-ui, sans-serif;
    background: #0c0b0a;
    color: #f4efe6;
  }

  main {
    min-height: 100vh;
    display: grid;
    place-content: center;
    gap: 0.5rem;
    padding: 2rem;
    box-sizing: border-box;
  }

  h1,
  p {
    margin: 0;
  }

  h1 {
    font-size: clamp(2rem, 8vw, 4rem);
  }

  p {
    color: #c9c0b4;
  }
</style>
