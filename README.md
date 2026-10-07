# Lilflix

SPA estática de Svelte + Vite + TypeScript para un catálogo privado pequeño.

## Desarrollo

```bash
npm install
npm run dev
```

## Añadir vídeos

Edita únicamente `src/content/catalog.ts`.

Para anonmp4.art pega **solo el direct link** que entrega el host:

```ts
series({
  anilistId: 196722,
  episodes: {
    1: 'https://anonmp4.art/v/ggRRfGVo2cDnLUg',
    2: 'https://anonmp4.art/v/OTRO_ID',
  },
}),
```

No necesitas pegar el HTML `<iframe>`. Lilflix convierte automáticamente:

`https://anonmp4.art/v/<id>` → `https://anonmp4.art/embed/<id>`

La misma regla se aplica a películas:

```ts
movie({
  anilistId: 199,
  video: 'https://anonmp4.art/v/ggRRfGVo2cDnLUg',
}),
```

## Reproductor

La reproducción se delega al reproductor de anonmp4.art mediante un `<iframe>`. Lilflix ya no descarga ni controla el vídeo con un `<video>` propio.

Esto significa que los controles de reproducción, seek, buffering y fullscreen pertenecen al reproductor del host. Al ser un iframe cross-origin, Lilflix no puede leer de forma fiable el tiempo reproducido ni recibir eventos del reproductor salvo que el proveedor exponga una API/postMessage documentada.

Lilflix conserva la navegación entre episodios y permite marcar manualmente el episodio actual como visto.

## URLs

- Usa únicamente HTTPS.
- Usa únicamente vídeos que estés autorizado a reproducir.
- El catálogo guarda el direct link, no el HTML del iframe.
- El adaptador de `src/player/host.ts` solo acepta `anonmp4.art`.

## Producción

- `npm run build` genera `dist/`.
- `public/_headers` añade `X-Robots-Tag: noindex` y `Referrer-Policy: no-referrer`.
- `index.html` incluye `noindex, nofollow`.
- Para acceso restringido, usa Cloudflare Access y mantén el repositorio privado.

## Arquitectura

- `src/content/`: catálogo, helpers, validación y metadatos.
- `src/services/`: contenido y progreso.
- `src/app/router.ts`: router hash.
- `src/pages/`: pantallas.
- `src/components/`: piezas visuales.
- `src/player/`: adaptador y pantalla del reproductor externo.
- `scripts/`: sincronización con AniList.
