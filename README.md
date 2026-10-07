# Lilflix

SPA estática de Svelte + Vite + TypeScript para un catálogo privado pequeño.

## Desarrollo

```bash
npm install
npm run dev
```

Antes de `dev`/`build`, el sync obtiene de AniList los metadatos que falten y los guarda en `src/content/generated/media.json`.

## Comandos

- `npm run dev` — desarrollo.
- `npm run build` — sync + build de producción.
- `npm run typecheck` — comprobación TypeScript.
- `npm test` — tests de validación.
- `npm run sync` — sincronización incremental.
- `npm run sync -- --refresh` — renueva todos los IDs.
- `npm run sync -- --id 21` — renueva un ID concreto.

## Añadir una serie

1. Edita únicamente `src/content/catalog.ts` y añade un bloque `series({ anilistId, episodes })` o `series({ anilistId, seasons })`.
2. Pon las URLs directas de vídeo HTTPS autorizadas.
3. Ejecuta `npm run sync` y comprueba la serie en `npm run dev`.

Ejemplo:

```ts
series({
  anilistId: 21,
  episodes: {
    1: "https://turbo.cr/.../ep1.mp4",
    2: "https://turbo.cr/.../ep2.mp4",
  },
}),
```

## Añadir una película

1. Añade `movie({ anilistId, video })` en `src/content/catalog.ts`.
2. Usa una URL HTTPS directa y autorizada.
3. Ejecuta `npm run sync`.

```ts
movie({
  anilistId: 199,
  video: "https://turbo.cr/.../movie.mp4",
}),
```

## Reproducción y progreso

El reproductor se carga únicamente al entrar en una ruta `#/watch/...`. Usa MP4 progresivo mediante un único elemento `<video>`, `preload="metadata"`, `playsinline` y `referrerpolicy="no-referrer"`.

El progreso se guarda en `localStorage` con la clave `pm:progress:v1`. El reproductor retoma la posición, marca episodios vistos al 90 % o al terminar, muestra buffering y permite reintentar errores. Al terminar un episodio ofrece el siguiente y, tras el último, vuelve a la serie.

## Turbo.cr

La verificación técnica está en `docs/turbo-findings.md`.

Con una URL real autorizada:

```bash
npx tsx scripts/probe-video.ts "https://turbo.cr/....mp4"
```

Si Turbo.cr cambia de host o deja de servir MP4 directo, no hay que cambiar el modelo de catálogo: sustituye las URLs por las del nuevo proveedor. Si el proveedor requiere iframe, la capa `player/` es el único lugar que debe cambiar.

No se afirma compatibilidad con una URL de Turbo.cr concreta hasta ejecutar la prueba de cabeceras y la prueba manual en móvil.

## Producción

- Build: `npm run build`
- Directorio de salida: `dist/`
- El archivo `public/_headers` añade `X-Robots-Tag: noindex` y `Referrer-Policy: no-referrer`.
- `index.html` ya incluye `noindex, nofollow`.
- Para el acceso restringido, conecta el repositorio a Cloudflare Pages y configura Cloudflare Access para las dos cuentas autorizadas. Los límites/precios de Access deben comprobarse en la cuenta de Cloudflare antes de activar la protección.
- El repositorio debe permanecer privado y el sitio no debe exponerse sin Access.

### Checklist móvil

- [ ] Home abre y las filas navegan.
- [ ] Serie abre y muestra episodios.
- [ ] Reproducir retoma el progreso.
- [ ] Seek táctil funciona.
- [ ] Fullscreen funciona.
- [ ] El final de un episodio ofrece el siguiente.
- [ ] El último episodio vuelve a la serie.
- [ ] Una URL inválida muestra error y Reintentar.
- [ ] Al cortar la red aparece buffering/conexión lenta y puede reintentarse.

## Arquitectura

- `src/content/`: catálogo, helpers, validación y metadatos generados; sin UI ni red.
- `src/services/`: contenido y progreso.
- `src/app/router.ts`: router hash.
- `src/pages/`: pantallas.
- `src/components/`: piezas visuales.
- `src/player/`: único módulo que toca `<video>`.
- `scripts/`: Node; único lugar que habla con AniList.
