# Netflix privado para dos: diseño y tickets

## 1. Resumen ejecutivo

Una SPA estática en **Svelte + Vite + TypeScript**, sin backend propio. El catálogo es **un único archivo** (`src/content/catalog.ts`) donde escribes `anilistId` y URLs de vídeo. Un script (`npm run sync`) descarga una sola vez los metadatos de AniList, los convierte a JSON y guarda las portadas y banners como WebP dentro del repo. En runtime la app **no llama a AniList**: lee JSON estático, así que funciona aunque AniList caiga y no existen problemas de rate limit.

El reproductor es propio, sobre `<video>` con MP4 progresivo (sin HLS/DASH). El progreso se guarda en `localStorage`. El despliegue es hosting estático desde GitHub.

Hay un riesgo grande que no pude cerrar: el comportamiento técnico real de los enlaces de Turbo.cr (sección 3). Por eso el **TICKET-002 es un spike de verificación** antes de construir el reproductor.

## 2. Investigación de AniList

- **Endpoint y acceso:** todo va a `https://graphql.anilist.co` por POST. Los datos públicos de solo lectura no requieren API key.
- **Rate limit:** la documentación indica 90 peticiones por minuto, pero avisa de un estado degradado temporal limitado a 30 por minuto. Si se excede, hay un bloqueo de un minuto con error 429, además de un limitador de ráfagas. Por eso diseño para **cero requests en runtime** y, en el script, **batching con `id_in`**: una sola query trae hasta 50 obras.
- **Campos de `Media` útiles** (por mi conocimiento de la API, sin re-verificar cada campo en el schema en vivo):
  - Identificación: `id`, `idMal`, `format` (`TV`, `TV_SHORT`, `MOVIE`, `SPECIAL`, `OVA`, `ONA`, `MUSIC`).
  - Títulos: `title{romaji english native}`, `synonyms`.
  - Imágenes: `coverImage{extraLarge large color}`, `bannerImage` (puede ser `null`).
  - Contenido: `description` (viene con HTML), `genres`, `seasonYear`, `startDate`, `episodes`, `duration` (minutos por episodio), `status`, `averageScore`.
  - Relaciones: `relations{edges{relationType node{id format title}}}`.
- **Hallazgo de diseño clave:** AniList no tiene "temporadas" como entidad. **Cada temporada es un `Media` distinto** enlazado por relaciones `PREQUEL`/`SEQUEL`. Por eso en v1 una entrada del catálogo equivale a un `anilistId`, y las sagas se podrán agrupar después con `relations`.
- **Cache recomendado:** las respuestas de obras terminadas cambian poco. La recomendación general es cachearlas y espaciar las ráfagas.
- **CORS:** **probable** que permita llamadas desde navegador, pero **NO VERIFICADO** por mí. Es irrelevante, porque el script corre en Node.
- **Condiciones de uso de las imágenes del CDN de AniList:** **NO VERIFICADO.** Para uso personal descargarlas es razonable, pero conviene revisar los términos si el proyecto cambia de alcance.

## 3. Investigación de Turbo.cr

| Aspecto | Estado | Detalle |
|---|---|---|
| Es un host de vídeo gratuito sin transcodificación | **Confirmado** | La portada promete originales sin re-encode, sin límite de resolución y con enlace y código de embed. |
| Límite de tamaño | **Confirmado (con matiz)** | El FAQ actual dice 750 MB por vídeo, formatos MP4, MOV, M4V, MPG y similares. Un snippet antiguo indicaba 250 MB, así que el límite ha cambiado. Úsalo como "el FAQ actual lo dice". |
| Acceso por enlace/embed | **Confirmado** | El FAQ dice que el contenido suele ser accesible por enlace directo o embed. |
| Página de descarga con verificación anti-bot | **Confirmado** | La página `/d/…` pide verificar "no soy un robot" antes de descargar. La página de un archivo muestra "Verify to download". El botón "Direct link" podría no ser un MP4 directo estable. |
| Existen páginas `/embed/ID` | **Confirmado** | Una petición a `/embed/…` devolvió 200 en un reporte público. Esto es un posible plan B por iframe. |
| Términos: bypass de límites y automatización | **Confirmado** | Los términos prohíben saltarse rate limits o controles de acceso y avisan de que el scraping o la descarga masiva automatizada pueden bloquearse. Tampoco garantizan reproducción perfecta ni almacenamiento permanente. |
| Contenido permitido | **Confirmado** | Los términos prohíben subir contenido protegido por copyright sin permiso. Es responsabilidad tuya que lo que alojes cumpla esto. |
| URL directa `.mp4` reproducible en `<video src>` | **NO VERIFICADO** | No pude obtener una URL directa real ni inspeccionar cabeceras. |
| `Accept-Ranges` / `206 Partial Content` / seek | **NO VERIFICADO** | Probable, porque está detrás de Cloudflare, pero no demostrado. |
| CORS | **NO VERIFICADO** | `<video src>` **no necesita CORS** para reproducir. Solo haría falta para `fetch` o canvas, y no los usamos. |
| Hotlinking / chequeo de `Referer` desde otro dominio | **NO VERIFICADO** | Riesgo real. Mitigación: `referrerpolicy="no-referrer"` en el `<video>`. |
| Enlaces firmados o con caducidad | **NO VERIFICADO** | Si caducan, el modelo "pegar URL en catalog.ts" no sirve y habría que cambiar de estrategia. |
| Límites de ancho de banda y estabilidad | **NO VERIFICADO** | El dominio es muy reciente (registrado en enero de 2026), así que hay riesgo de estabilidad a largo plazo. |

**Conclusión:** la arquitectura funciona si una URL directa responde `200/206` con `Accept-Ranges: bytes` y `Content-Type: video/mp4` sin `Referer` ni cookies. El TICKET-002 lo comprueba con un script. Si falla, el plan B es el iframe de `/embed/ID` (sin controles propios) o cambiar de host manteniendo el mismo catálogo, porque la URL es solo un string.

## 4. Stack tecnológico recomendado

- **Elegido:** **Svelte 5 + Vite + TypeScript** como SPA pura (no SvelteKit), con CSS propio sin Tailwind y **router hash propio** (~40 líneas).
- **Por qué:** Svelte compila a JS mínimo (el shell cabe en unas decenas de KB), se comporta bien en Android modesto, los componentes son casi HTML y por eso un agente de IA los escribe con pocos errores. El router hash funciona en cualquier hosting estático sin reglas de rewrite y sobrevive al refresh.
- **Tests:** Vitest para lógica pura y Playwright para 2–3 flujos E2E.
- **Descartado:**
  - React + Vite: más runtime y más dependencias para el mismo resultado.
  - Vue + Vite: razonable, pero sin ventaja aquí y con un router extra.
  - SvelteKit: añade SSR, adapters y convenciones que no necesitamos.
  - Astro: es MPA por naturaleza y el reproductor y las transiciones serían un parche.
  - Vanilla TS: el estado del reproductor y la UI reactiva acabarían reinventando un framework.
- **Complejidad evitada:** SSR, estado global tipo Redux, GraphQL en el cliente, un servidor, base de datos, autenticación propia y librerías de reproductor.
- **Dependencias de runtime:** idealmente cero aparte de Svelte. `sharp` es solo devDependency del script de sync.

## 5. Arquitectura

```
 catalog.ts (tú escribes IDs + URLs)
      │
      ├────────────── npm run sync (Node, build-time) ──────────────┐
      │                                                             ▼
      │                                          AniList GraphQL (batch id_in)
      │                                                             │
      │                                         normalizar + sanitizar a texto plano
      │                                                             │
      │                                  src/content/generated/media.json  (commit)
      │                                  public/media/<id>/cover.webp, banner.webp
      ▼                                                             │
 Content service  ◄─────────────────────────────────────────────────┘
 (cruza catálogo + metadatos → Title[])
      │
      ├── search index (en memoria)       ├── progress store (localStorage)
      ▼                                   ▼
            Router hash → Pages → Components
                               │
                               └── (lazy) Player: VideoEngine + UI
                                          │
                                          ▼
                               <video src="https://turbo.cr/….mp4">
```

Hay dos fronteras estrictas. Los componentes solo importan del Content service y del Progress store. Solo `scripts/` habla con AniList, y solo `player/` toca el elemento `<video>`.

## 6. Modelo de datos

```ts
// src/types/index.ts

// ───────── Lo que escribe el humano (catalog.ts)
export type EpisodeInput =
  | string                                   // URL directa
  | { video: string; title?: string; durationMin?: number; thumb?: string };

export interface SeriesInput {
  anilistId: number;
  episodes: Record<number, EpisodeInput>;    // clave = nº de episodio
  featured?: boolean;                        // candidato al hero de Home
  titleOverride?: string;                    // si no te gusta el título de AniList
}

export interface MovieInput {
  anilistId: number;
  video: string;
  durationMin?: number;                      // sobrescribe AniList
  featured?: boolean;
  titleOverride?: string;
}

export type CatalogEntry =
  | ({ type: 'series' } & SeriesInput)
  | ({ type: 'movie' } & MovieInput);

// ───────── Metadatos generados (media.json), normalizados desde AniList
export type MediaFormat = 'TV' | 'TV_SHORT' | 'MOVIE' | 'SPECIAL' | 'OVA' | 'ONA' | 'MUSIC';

export interface MediaMeta {
  id: number;
  idMal: number | null;
  title: { romaji: string; english: string | null; native: string | null };
  synonyms: string[];
  description: string;                       // texto plano, párrafos separados por \n
  genres: string[];
  format: MediaFormat | null;
  year: number | null;
  episodes: number | null;
  durationMin: number | null;                // minutos por episodio (o total en películas)
  status: string | null;
  score: number | null;                      // 0–100
  studio: string | null;
  color: string | null;                      // color dominante de la portada
  cover: string;                             // ruta local: /media/<id>/cover.webp
  banner: string | null;                     // ruta local o null
  relations: { id: number; type: string; format: MediaFormat | null; title: string }[];
  fetchedAt: string;                         // ISO
}
export type MediaMetaMap = Record<number, MediaMeta>;

// ───────── Modelo interno (lo que consume la UI)
export interface Episode {
  number: number;
  video: string;
  title?: string;
  durationMin?: number;
  thumb?: string;
}

interface TitleBase {
  id: number;                                // = anilistId
  meta: MediaMeta;
  displayTitle: string;
  featured: boolean;
  order: number;                             // posición en catalog.ts (para "reciente")
}
export interface Series extends TitleBase { kind: 'series'; episodes: Episode[] }
export interface Movie  extends TitleBase { kind: 'movie'; video: string; durationMin: number | null }
export type Title = Series | Movie;

// ───────── Progreso (localStorage, clave "pm:progress:v1")
export interface ProgressEntry {
  ep: number;          // episodio actual (películas: 1)
  t: number;           // segundos
  d: number;           // duración conocida
  u: number;           // timestamp ms
  watched: number[];   // episodios completados
}
export type ProgressStore = { v: 1; items: Record<string, ProgressEntry> };  // clave = id
```

**Extensión futura (NO implementar ahora):** OVAs y especiales entran como entradas independientes (cada uno tiene su propio `anilistId`). Agrupar temporadas y sagas usaría `meta.relations` más un campo opcional `group`.

## 7. Estructura de archivos

```
├── catalog.example.md          (opcional)
├── README.md                   cómo añadir contenido y desplegar
├── docs/turbo-findings.md      resultado del spike
├── scripts/
│   ├── sync.ts                 orquesta: lee catálogo → pide faltantes → escribe JSON/imágenes
│   ├── anilist.ts              query GraphQL, batch, reintentos, normalización
│   ├── probe-video.ts          spike de Turbo.cr
│   └── check-catalog.ts        validación para CI
├── public/
│   ├── media/<id>/cover.webp, banner.webp     (generado, commit)
│   ├── fonts/                  una fuente display self-hosted
│   ├── icons/ + manifest.webmanifest
│   └── _headers                CSP y X-Robots-Tag
├── src/
│   ├── main.ts, App.svelte
│   ├── content/
│   │   ├── catalog.ts          ← ÚNICO archivo que editas
│   │   ├── helpers.ts          series(), movie()
│   │   └── generated/media.json
│   ├── services/
│   │   ├── content.ts          catálogo + meta → Title[], selectores
│   │   ├── search.ts
│   │   └── progress.ts
│   ├── app/
│   │   ├── router.ts           router hash
│   │   └── routes.ts
│   ├── pages/                  Home, Library, SeriesPage, MoviePage, Search, Watch
│   ├── components/             Poster, MediaCard, Row, Hero, EpisodeRow, Chip, Skeleton, ErrorState, BottomNav
│   ├── player/
│   │   ├── engine.ts           lógica del <video>, sin UI
│   │   ├── Player.svelte, Controls.svelte, SeekBar.svelte, EpisodeSheet.svelte
│   │   └── platform.ts         fullscreen, orientación, PiP, wake lock, media session
│   ├── styles/                 tokens.css, base.css
│   ├── types/index.ts
│   └── utils/                  format.ts (tiempos), text.ts (normalizar), url.ts (validar)
├── tests/                      unitarios y e2e
└── .github/workflows/ci.yml
```

**Qué es cada carpeta:**
- **`content/`:** datos y helpers de escritura. No contiene lógica de UI ni llamadas de red.
- **`services/`:** lógica pura y testeable (cruce de datos, búsqueda, progreso). No contiene DOM ni componentes.
- **`pages/`:** una pantalla por ruta, componiendo componentes. No contiene lógica de negocio.
- **`components/`:** piezas visuales reutilizables que reciben props. No hacen requests ni leen `localStorage`.
- **`player/`:** todo lo que toca `<video>`. No importa páginas.
- **`scripts/`:** código solo de Node. No se importa desde `src/`.

## 8. Flujo para añadir una serie

1. Abre la obra en AniList y copia el número de la URL (`anilist.co/anime/21` → `21`).
2. En `src/content/catalog.ts` añade:

```ts
series({
  anilistId: 21,
  episodes: {
    1: "https://turbo.cr/.../ep1.mp4",
    2: "https://turbo.cr/.../ep2.mp4",
  },
}),
```

3. Ejecuta `npm run dev`. El hook `predev` detecta IDs sin metadatos, hace **una** petición batch y deja `media.json` y las imágenes listos.
4. `git add . && git commit && git push`. El hosting construye y publica.

Si el ID no existe, un episodio está duplicado o una URL no es `https`, el script falla con un mensaje claro que indica la línea del problema.

## 9. Flujo para añadir una película

```ts
movie({ anilistId: 199, video: "https://turbo.cr/.../pelicula.mp4" }),
```

Los pasos 3 y 4 son idénticos. La duración sale de AniList, y puedes sobrescribirla con `durationMin`.

## 10. AniList integration

Elijo la **Opción C**: un script que genera y cachea un JSON que se commitea.

- **Por qué:** cero requests en runtime y cero dependencia de AniList en producción. El build en CI normalmente no hace ninguna petición, porque el JSON ya está en el repo. Es el código más simple, sin backend y sin `localStorage` para metadatos.
- **Sync incremental:** solo pide los IDs del catálogo que faltan en `media.json`. `npm run sync -- --refresh` los renueva todos, y `--id 21` renueva uno. Las peticiones salen en lotes de hasta 50 con `Page{media(id_in:[…])}`.
- **Resiliencia:** respeta `Retry-After` en 429 y reintenta con backoff. Si AniList falla y hay datos en cache, el build continúa con un aviso. Si falta un ID sin cache, falla con error claro.
- **Normalización** (única capa que conoce el esquema de AniList):
  - Convierte la descripción HTML a texto plano (`<br>` → `\n`, elimina el resto de etiquetas, decodifica entidades).
  - Elige `cover` como `coverImage.extraLarge` y la guarda en WebP a 400 px de ancho.
  - Guarda el banner a 1280 px (o `null`).
  - Reduce `relations` a lo mínimo.
- **Imágenes:** se descargan una vez al repo, y la UI sirve siempre desde tu propio dominio.
- **Umbral:** si `media.json` supera ~150 KB gzip (cientos de títulos), se separa en índice ligero y detalle. Ahora no hace falta.

## 11. Streaming architecture

- **Un solo `<video>`** con `playsinline`, `preload="metadata"` y `referrerpolicy="no-referrer"`. El navegador gestiona el progresivo con peticiones Range. No hay HLS/DASH ni MSE.
- **`engine.ts`** es una máquina de estados pequeña (`idle → loading → ready → playing/paused → buffering → ended | error`) que expone un store de Svelte: `currentTime`, `duration`, `buffered`, `rate`, `volume`, `state`, `error`.
- **Reanudar:** al cargar, si hay progreso, `loadedmetadata` establece `currentTime`. Si falta menos del 5% o 30 s, empieza desde el principio.
- **Cambio de episodio:** se reutiliza el **mismo** elemento `<video>` cambiando `src`. Así el autoplay del siguiente capítulo conserva el permiso otorgado por el gesto del usuario.
- **Guardado de progreso:** cada ~5 s, además de en `pause`, `visibilitychange` y `pagehide`. Se marca como visto al pasar del 90% o llegar a `ended`.
- **Errores:**
  - `error` del `<video>` → pantalla con mensaje (red, formato, URL caducada) y botón Reintentar, que hace `load()` y retoma la posición.
  - `waiting`/`stalled` durante más de 8 s → aviso "Conexión lenta".
  - Si `seekable` no cubre el rango, se desactiva el seek y se avisa. Eso indicaría que el host no soporta Range.
- **Plataforma (`platform.ts`):**
  - Fullscreen: Fullscreen API sobre el contenedor. En iPhone solo funciona sobre el propio vídeo (`webkitEnterFullscreen`), con controles nativos. Es una limitación conocida de iOS.
  - Orientación: `screen.orientation.lock('landscape')` al entrar en fullscreen. Funciona en Android/Chrome y no en iOS.
  - PiP: `requestPictureInPicture` si está disponible.
  - Wake Lock mientras se reproduce y Media Session para controles del sistema.
- **Siguiente episodio:** en los últimos ~20 s, o al terminar, aparece el botón "Siguiente". Con cuenta atrás de 5 s cancelable, pasa solo al siguiente episodio.

## 12. UX/UI

**Identidad visual:**
- Negro cálido `#0c0b0a`, texto marfil y **un solo acento ámbar** (`#e9a23b`). Sin rojo tipo Netflix.
- Titulares en una fuente display con carácter (serif condensada o grotesca) self-hosted, cuerpo en la fuente del sistema.
- Radios de 4–6 px, sin blur ni cristal, un único scrim lineal para texto sobre imagen.
- Animaciones de 120–200 ms usando solo `opacity` y `transform`, con `prefers-reduced-motion` respetado.

**Navegación:** barra inferior (Inicio, Series, Películas, Buscar) con áreas táctiles ≥ 48 px. En escritorio pasa a barra superior.

**Home:**
- Hero a pantalla casi completa (aprox. 60% del alto) con el título `featured`, o el último añadido, con el banner y el botón Reproducir/Continuar.
- Filas con scroll-snap horizontal:
  - Continuar viendo: poster horizontal con barra de progreso fina.
  - Agregado recientemente.
  - Series.
  - Películas.
- En 360 px se ven 2.3 pósters por fila, para invitar al scroll.

**Series:**
- Banner arriba (si no hay, color de portada), con portada pequeña, título, línea `año · formato · N episodios · ★ puntuación`.
- Botón principal "Continuar T1·E4" o "Reproducir".
- Sinopsis recortada a 4 líneas con "Más".
- Géneros como chips.
- Lista de episodios: miniatura 16:9, número, duración, barra de progreso y marca de visto.
- Temporadas: **no aplica en v1**.

**Película:**
- Más cinematográfica y sin lista: banner grande, título, año, duración, géneros, sinopsis y botón Reproducir/Continuar con progreso.

**Búsqueda:**
- Input con foco automático, resultados en rejilla al escribir (debounce de 100 ms) y chips de género opcionales.
- Estado vacío con texto útil.

**Reproductor (`#/watch/...`):**
- Pantalla completa negra (`100dvh`, con safe-area).
- Barra superior: volver, "Título · T/E".
- Centro: −10, play/pause grande (64 px) y +10.
- Inferior: barra de progreso con área táctil de 44 px, que muestra el buffer y un tiempo flotante mientras se arrastra. Debajo van los tiempos, velocidad, PiP, episodios, siguiente y pantalla completa.
- Un toque muestra u oculta los controles (auto-ocultan a los 3 s). Doble toque en el tercio izquierdo o derecho salta ±10 s con una animación breve.
- El selector de episodios es una hoja inferior dentro del player.
- Escritorio: espacio, flechas, `F` y `M`.

## 13. Performance

**Objetivos** (móvil Android medio, 4G):
- LCP < 2.5 s, CLS < 0.1, Lighthouse móvil ≥ 90.
- JS inicial ≤ 70 KB gzip.
- Chunk del reproductor ≤ 30 KB gzip, cargado con `import()` al entrar a `/watch`.
- CSS ≤ 15 KB gzip.

**Decisiones:**
- Cero requests de red en runtime salvo el vídeo.
- Imágenes WebP locales con `width`/`height` explícitos, `loading="lazy"` salvo el hero y `decoding="async"`.
- Fondo de carga con el color dominante de la portada.
- Rutas con code splitting.
- Sin librerías de UI ni de búsqueda. La búsqueda es un `includes` sobre texto normalizado.
- `preload="metadata"` en el vídeo, nunca `auto`.
- Animaciones solo con `transform` y `opacity`, sin sombras grandes ni blur.
- Un chequeo de presupuesto de bundle en CI (TICKET-023).

## 14. Seguridad

- **Las URLs de Turbo.cr estarán en el bundle público.** "Privado" por defecto es solo oscuridad. Mitigación: poner delante un control de acceso (sección 15) y `noindex`.
- **XSS:** las descripciones se convierten a texto plano en el sync y se renderizan como texto, nunca con `{@html}`. No hace falta DOMPurify.
- **URLs externas:** solo `https`, validadas con `new URL()` al construir el catálogo. Una lista de hosts permitidos en `config.ts` evita errores y, junto con la CSP, limita el daño de una URL mala.
- **CSP** (en `_headers`): `default-src 'self'; img-src 'self' data:; media-src https://turbo.cr https://*.turbo.cr; connect-src 'self'; frame-src https://turbo.cr`. El host real del vídeo puede ser otro (resultado del spike), así que se ajusta ahí.
- **Mixed content:** todo `https`, y las URLs `http` se rechazan.
- **Secretos:** no existen. AniList no necesita API key para esto, y el script no usa credenciales.
- **Meta:** `noindex, nofollow` y `X-Robots-Tag`.
- **Legal:** los términos de Turbo.cr exigen que tengas derechos sobre lo que subas, y eso queda de tu lado.

## 15. Deployment

- **Recomendación:** repositorio **privado en GitHub** → **Cloudflare Pages** (integración con Git, build `npm run build`, salida `dist/`, HTTPS incluido). Es hosting estático sin backend.
- **Privacidad real:** GitHub Pages sirve el sitio públicamente (el repo privado no lo protege en cuentas gratuitas), por eso prefiero Cloudflare Pages. Se le puede poner **Cloudflare Access** con login por código al correo de las dos personas. Esto lo conozco de forma general y **no lo verifiqué en esta investigación**, así que confirma límites y precio actuales antes de depender de ello.
- **CI:** GitHub Actions ejecuta lint, tests y `check:catalog` en cada push. El deploy lo hace Cloudflare.
- **Backend:** no hace falta. Ni AniList (se consulta desde Node) ni Turbo.cr (`<video src>` no requiere CORS) obligan a tener uno.

## 16. Tickets de implementación

Convención: cada ticket indica **Objetivo, Archivos, Implementación, Criterios, Dependencias y Prueba**.

### FASE 1 — Foundation

**TICKET-001 · Inicializar proyecto**
- **Objetivo:** esqueleto Svelte 5 + Vite + TS que compila.
- **Archivos:** `package.json`, `vite.config.ts`, `tsconfig.json`, `src/main.ts`, `src/App.svelte`, `.gitignore`, ESLint/Prettier mínimos, Vitest.
- **Implementación:** scripts `dev`, `build`, `preview`, `test`, `lint`, `typecheck`, `sync` y `check:catalog` (stub). `base: './'`. Sin dependencias extra.
- **Criterios:**
  - `npm run build` y `npm run typecheck` pasan.
  - `npm test` ejecuta un test trivial.
  - `App.svelte` muestra un texto.
- **Dependencias:** None.
- **Prueba:** `npm ci && npm run build && npm test`.

**TICKET-002 · Spike: verificar Turbo.cr**
- **Objetivo:** comprobar con evidencia si los enlaces sirven para `<video>` desde otro dominio.
- **Archivos:** `scripts/probe-video.ts`, `public/probe.html`, `docs/turbo-findings.md`.
- **Implementación:** el script recibe una URL y hace `HEAD` y `GET` con `Range: bytes=0-1` y `bytes=1000000-1000100`. Registra status (`200` vs `206`), `Accept-Ranges`, `Content-Type`, `Content-Length`, `Access-Control-Allow-*`, `Cache-Control`/`Expires`, y redirecciones. Repite sin cookies y con `Referer` ajeno. `probe.html` carga la URL en un `<video>` en un origen distinto y registra `loadedmetadata`, seek y errores. Se documenta cada punto como CONFIRMADO / NO VERIFICADO y la **decisión**: reproductor directo, plan B (iframe `/embed/ID`) o cambio de host.
- **Criterios:**
  - `docs/turbo-findings.md` responde: ¿Range?, ¿seek?, ¿hotlink?, ¿caducidad?, ¿host real del vídeo? (para la CSP).
  - Cada afirmación lleva evidencia (cabeceras copiadas).
- **Dependencias:** TICKET-001.
- **Prueba:** `npx tsx scripts/probe-video.ts <url>`, y abrir `probe.html` en un móvil real.

**TICKET-003 · Tokens y estilos base**
- **Objetivo:** identidad visual y base responsive.
- **Archivos:** `src/styles/tokens.css`, `base.css`, `public/fonts/*`.
- **Implementación:** variables (colores, espaciado, radios 4–6 px, tipografía, z-index), reset, `color-scheme: dark`, safe-area, `@font-face` con `font-display: swap`, `prefers-reduced-motion`.
- **Criterios:**
  - No hay `backdrop-filter`, sombras mayores de 8 px de blur ni radios > 8 px.
  - Fondo y texto cumplen contraste AA.
  - Se ve bien a 360 px.
- **Dependencias:** TICKET-001.
- **Prueba:** visual en 360 px y 1280 px, y `grep` de `backdrop-filter` sin resultados.

**TICKET-004 · Router hash y shell**
- **Objetivo:** navegación entre rutas con carga diferida.
- **Archivos:** `src/app/router.ts`, `routes.ts`, `src/components/BottomNav.svelte`, `App.svelte`.
- **Implementación:** rutas `#/`, `#/series`, `#/movies`, `#/search`, `#/series/:id`, `#/movie/:id`, `#/watch/:kind/:id/:ep?`. Páginas con `import()`. Restaura el scroll al volver. En `/watch` se oculta la barra inferior. Ruta desconocida → pantalla 404 con enlace a Inicio.
- **Criterios:**
  - Refrescar mantiene la ruta.
  - Atrás y adelante funcionan.
  - Las páginas son chunks separados.
  - La barra inferior tiene áreas táctiles ≥ 48 px.
- **Dependencias:** TICKET-003.
- **Prueba:** tests unitarios del parser de rutas y navegación manual.

### FASE 2 — Content

**TICKET-005 · Tipos y helpers del catálogo**
- **Objetivo:** el modelo de la sección 6 y la API `series()`/`movie()`.
- **Archivos:** `src/types/index.ts`, `src/content/helpers.ts`, `src/content/catalog.ts` (con 1 serie y 1 película de ejemplo).
- **Implementación:** helpers que devuelven `CatalogEntry`, con tipos estrictos. `catalog.ts` exporta `catalog: CatalogEntry[]`.
- **Criterios:**
  - `series({anilistId, episodes:{1:"..."}})` compila.
  - Un campo desconocido da error de TS.
  - Los tipos coinciden con la sección 6.
- **Dependencias:** TICKET-001.
- **Prueba:** `npm run typecheck`.

**TICKET-006 · Validación del catálogo**
- **Objetivo:** detectar errores del catálogo antes del build.
- **Archivos:** `src/content/validate.ts`, `src/utils/url.ts`, `scripts/check-catalog.ts`, `tests/validate.test.ts`.
- **Implementación:** reglas: `anilistId` entero > 0 y no duplicado, URLs `https` y de host permitido, números de episodio enteros positivos, al menos 1 episodio. Avisos (no fallo): huecos en la numeración o más episodios que `meta.episodes`. Mensajes con el ID de la entrada.
- **Criterios:**
  - Tests cubren cada regla (válida e inválida).
  - `npm run check:catalog` sale con código ≠ 0 ante errores y 0 con avisos.
- **Dependencias:** TICKET-005.
- **Prueba:** `npm test` y `npm run check:catalog`.

### FASE 3 — AniList y servicios

**TICKET-007 · Cliente AniList y normalización**
- **Objetivo:** capa de acceso a AniList solo para Node.
- **Archivos:** `scripts/anilist.ts`, `tests/anilist.test.ts`, `tests/fixtures/anilist-response.json`.
- **Implementación:** query `Page(perPage:50){ media(id_in:$ids, type:ANIME) {…} }` con los campos de la sección 2. `fetchMedia(ids)` divide en lotes de 50. Maneja 429 (`Retry-After`), 5xx (hasta 3 reintentos con backoff) y errores GraphQL. `normalize()` devuelve `MediaMeta` (sin imágenes aún). La descripción pasa a texto plano.
- **Criterios:**
  - Tests con `fetch` simulado: lote correcto, 429 con reintento, ID inexistente reportado, HTML → texto plano, entidades decodificadas, `banner` nulo.
  - No hace ninguna petición en los tests.
- **Dependencias:** TICKET-005.
- **Prueba:** `npm test`.

**TICKET-008 · Script de sync**
- **Objetivo:** `npm run sync` genera datos e imágenes.
- **Archivos:** `scripts/sync.ts`, `src/content/generated/media.json`, `public/media/*`, `package.json` (hooks `predev`, `prebuild`).
- **Implementación:** lee `catalog`, calcula IDs faltantes, llama a `fetchMedia`, descarga cover (400 px) y banner (1280 px) a WebP con `sharp` en `public/media/<id>/`, y fusiona en `media.json` (ordenado por ID, JSON estable para diffs limpios). Flags `--refresh` y `--id`. Si AniList falla y existen datos, avisa y continúa. Si falta un ID sin cache, falla.
- **Criterios:**
  - Una segunda ejecución sin cambios hace 0 requests.
  - Añadir un ID nuevo solo pide ese.
  - Si una imagen falla, se usa un placeholder y se registra un aviso.
  - Los tamaños de imagen cumplen el presupuesto.
- **Dependencias:** TICKET-006, TICKET-007.
- **Prueba:** correr sync con 2 IDs reales, volver a correr y verificar `git diff` vacío.

**TICKET-009 · Content service**
- **Objetivo:** unir catálogo y metadatos en el modelo interno.
- **Archivos:** `src/services/content.ts`, `tests/content.test.ts`.
- **Implementación:** `getAll()`, `getById(id)`, `getSeries()`, `getMovies()`, `getFeatured()` (primer `featured`, si no el último añadido), `getRecent(n)`. Ordena episodios por número y calcula `displayTitle` (override > english > romaji). Si falta metadato, la entrada se omite con `console.warn` y no rompe la app.
- **Criterios:**
  - Tests para títulos, orden de episodios, featured, recientes y entradas sin meta.
  - Sin imports de DOM.
- **Dependencias:** TICKET-005, TICKET-008.
- **Prueba:** `npm test`.

**TICKET-010 · Búsqueda**
- **Objetivo:** búsqueda local rápida.
- **Archivos:** `src/utils/text.ts`, `src/services/search.ts`, `tests/search.test.ts`.
- **Implementación:** `normalize()` (minúsculas, sin acentos, sin signos). Se construye un índice una vez (títulos, sinónimos, tipo, géneros). `search(q, {genre?, kind?})` divide en tokens y exige que todos coincidan (`includes`), con prioridad a coincidencia al inicio del título.
- **Criterios:**
  - "shingeki" encuentra por sinónimo, "pelicula" encuentra por tipo y las tildes no importan.
  - 200 títulos se buscan en < 5 ms.
  - Query vacía devuelve lista vacía.
- **Dependencias:** TICKET-009.
- **Prueba:** `npm test`.

**TICKET-011 · Progress store**
- **Objetivo:** guardar y consultar el progreso.
- **Archivos:** `src/services/progress.ts`, `tests/progress.test.ts`.
- **Implementación:** clave `pm:progress:v1`. API: `get(id)`, `save(id, {ep,t,d})`, `markWatched(id, ep)`, `getContinueList()` (ordenada por `u`, sin las completadas), `clear(id)`. Todo en try/catch. Si `localStorage` falla o el JSON está corrupto, usa memoria y no rompe. Escritura con throttle.
- **Criterios:**
  - Tests con `localStorage` simulado: guardar, leer, JSON corrupto, `localStorage` que lanza y orden de continuar.
  - Una serie completa deja de aparecer en continuar.
- **Dependencias:** TICKET-005.
- **Prueba:** `npm test`.

### FASE 4 — UI

**TICKET-012 · Componentes base**
- **Objetivo:** piezas reutilizables.
- **Archivos:** `src/components/{Poster,MediaCard,Row,Chip,Skeleton,ErrorState}.svelte`.
- **Implementación:** `MediaCard` recibe un `Title`, no hace requests, usa `<img loading="lazy" width height>`, fondo del color dominante mientras carga y fallback con inicial del título si falla. `Row` es un scroll-snap horizontal con título. Soporta variante horizontal con barra de progreso.
- **Criterios:**
  - Render sin portada muestra el fallback.
  - Funciona a 360 px.
  - Son enlaces accesibles (`<a>`), con foco visible.
  - No hay lógica de negocio.
- **Dependencias:** TICKET-003, TICKET-009.
- **Prueba:** página temporal de pruebas (no se commitea) y revisión visual.

**TICKET-013 · Home**
- **Objetivo:** pantalla principal.
- **Archivos:** `src/pages/Home.svelte`, `src/components/Hero.svelte`.
- **Implementación:** hero con `getFeatured()`, y filas Continuar viendo (oculta si está vacía), Recientes, Series y Películas. El botón del hero lleva a continuar o a reproducir.
- **Criterios:**
  - Con catálogo vacío muestra un estado vacío explicativo.
  - Continuar viendo refleja el progreso real.
  - El hero no provoca CLS.
  - No hace requests de red.
- **Dependencias:** TICKET-004, TICKET-011, TICKET-012.
- **Prueba:** manual con progreso simulado en `localStorage`.

**TICKET-014 · Listados de Series y Películas**
- **Objetivo:** explorar por tipo.
- **Archivos:** `src/pages/Library.svelte`.
- **Implementación:** rejilla (3 columnas a 360 px, adaptativa en escritorio), chips de género derivados del catálogo, orden por reciente.
- **Criterios:**
  - Filtrar por género funciona.
  - Los chips se pueden recorrer con scroll horizontal.
  - Misma página sirve `#/series` y `#/movies`.
- **Dependencias:** TICKET-012.
- **Prueba:** manual y test del filtro si se extrae a función.

**TICKET-015 · Detalle de serie**
- **Objetivo:** página de serie.
- **Archivos:** `src/pages/SeriesPage.svelte`, `src/components/EpisodeRow.svelte`.
- **Implementación:** según sección 12. El botón principal calcula el episodio a continuar. `EpisodeRow` muestra miniatura (thumb o portada recortada), número, título opcional, duración, barra de progreso y marca de visto. ID inexistente → `ErrorState`.
- **Criterios:**
  - Botón "Continuar T·E" refleja el progreso.
  - Sinopsis colapsable.
  - Cada episodio enlaza a `/watch/series/:id/:ep`.
  - Funciona sin banner.
- **Dependencias:** TICKET-011, TICKET-012.
- **Prueba:** manual con una serie de 3 episodios y progreso simulado.

**TICKET-016 · Detalle de película**
- **Objetivo:** página de película con UX propia.
- **Archivos:** `src/pages/MoviePage.svelte`.
- **Implementación:** banner grande, metadatos (año, duración, géneros), sinopsis y botón Reproducir/Continuar.
- **Criterios:**
  - No contiene lista de episodios.
  - Muestra progreso si lo hay.
  - Duración usa `durationMin` si existe.
- **Dependencias:** TICKET-011, TICKET-012.
- **Prueba:** manual.

**TICKET-017 · Búsqueda (UI)**
- **Objetivo:** pantalla de búsqueda.
- **Archivos:** `src/pages/Search.svelte`.
- **Implementación:** input con foco automático, debounce de 100 ms, rejilla de resultados, chips de género y estado vacío y sin resultados.
- **Criterios:**
  - Escribir actualiza resultados sin recargar y sin requests.
  - Conserva la consulta al volver atrás.
  - El teclado móvil no tapa los resultados.
- **Dependencias:** TICKET-010, TICKET-012.
- **Prueba:** manual en móvil.

### FASE 5 — Player

**TICKET-018 · Engine del reproductor**
- **Objetivo:** lógica del `<video>` sin UI.
- **Archivos:** `src/player/engine.ts`, `tests/engine.test.ts`.
- **Implementación:** `createEngine(video)` con store de estado (sección 11), `load(src, startAt)`, `play/pause/seek/setRate/setVolume`, mapeo de errores (`MediaError` → mensaje), `retry()` que conserva la posición y detección de `stalled`. Sin acceso a DOM más allá del elemento recibido.
- **Criterios:**
  - Tests con un elemento simulado: transiciones de estado, reanudación en `loadedmetadata`, retry y mapeo de errores.
  - No asigna `src` hasta `load()`.
- **Dependencias:** TICKET-001.
- **Prueba:** `npm test`.

**TICKET-019 · UI del reproductor**
- **Objetivo:** controles táctiles.
- **Archivos:** `src/player/{Player,Controls,SeekBar}.svelte`, `src/pages/Watch.svelte`.
- **Implementación:** la ruta carga `Player` con `import()`. Controles de la sección 12, barra de progreso con Pointer Events y `touch-action: none`, buffer visible, auto-ocultar a 3 s, doble toque ±10 s con indicador, atajos de teclado en escritorio, `100dvh` con safe-area.
- **Criterios:**
  - Se puede arrastrar el seek con un dedo sin que se desplace la página.
  - Todos los botones ≥ 44 px.
  - Un toque muestra u oculta controles.
  - Doble toque salta ±10 s.
  - El chunk no se carga fuera de `/watch`.
- **Dependencias:** TICKET-018, TICKET-004.
- **Prueba:** manual en móvil real con un MP4 de prueba, y revisión del chunk en el build.

**TICKET-020 · Plataforma: fullscreen, orientación, PiP, sistema**
- **Objetivo:** integración con el dispositivo.
- **Archivos:** `src/player/platform.ts`, ajustes en `Controls.svelte`.
- **Implementación:** fullscreen del contenedor, con fallback `webkitEnterFullscreen` en iOS. Bloqueo de orientación `landscape` al entrar en fullscreen, protegido con try/catch. Botón PiP solo si es compatible. Wake Lock mientras reproduce y Media Session (título, artwork, play/pause/seek, siguiente).
- **Criterios:**
  - Cada característica se oculta o degrada sin errores si el navegador no la soporta.
  - Salir de fullscreen libera el bloqueo de orientación.
  - El Wake Lock se libera al pausar o salir.
- **Dependencias:** TICKET-019.
- **Prueba:** manual en Android/Chrome y iOS/Safari.

**TICKET-021 · Progreso, siguiente episodio y selector**
- **Objetivo:** continuidad de reproducción.
- **Archivos:** `src/player/EpisodeSheet.svelte`, ajustes en `Player.svelte` y `Watch.svelte`.
- **Implementación:** guardado de progreso (cada 5 s, `pause`, `visibilitychange`, `pagehide`) con `progress.ts`. Reanudación al abrir. Botón y cuenta atrás de 5 s cancelable en los últimos ~20 s. Cambio de episodio reutilizando el mismo `<video>` (cambiar `src` y actualizar la URL con `replaceState`). Hoja con la lista de episodios. En el último episodio no se ofrece siguiente.
- **Criterios:**
  - Cerrar y reabrir retoma a ±5 s.
  - Se marca visto al ≥ 90%.
  - La cuenta atrás se puede cancelar.
  - Al terminar el último episodio vuelve a la serie.
  - Películas guardan progreso con `ep = 1`.
- **Dependencias:** TICKET-011, TICKET-019.
- **Prueba:** manual con 3 episodios cortos, y tests unitarios de la decisión "qué episodio sigue".

**TICKET-022 · Estados de error y buffering**
- **Objetivo:** fallos elegantes.
- **Archivos:** `src/player/Overlay.svelte`, ajustes en `Player.svelte`.
- **Implementación:** spinner tras 400 ms de buffering, mensaje "Conexión lenta" a los 8 s, pantalla de error con causa y botón Reintentar (retoma la posición) y Volver. Si el host no soporta seek, se desactiva la barra con aviso.
- **Criterios:**
  - Una URL inválida muestra error y no deja la pantalla en negro.
  - Cortar la red a mitad muestra buffering y se recupera al volver con Reintentar.
  - Un 404 se distingue de una caída de red.
- **Dependencias:** TICKET-019.
- **Prueba:** DevTools en offline y una URL falsa.

### FASE 6 — Polish

**TICKET-023 · Pasada de rendimiento**
- **Objetivo:** cumplir presupuestos.
- **Archivos:** `scripts/check-size.ts`, ajustes de imports y `vite.config.ts`.
- **Implementación:** script que lee `dist/`, calcula gzip y falla si el JS inicial > 70 KB, el chunk del player > 30 KB o el CSS > 15 KB. Verifica que el hero tenga `fetchpriority="high"` y el resto lazy, que no haya `@html` y que las imágenes tengan dimensiones.
- **Criterios:**
  - `npm run build && npm run check:size` pasa.
  - Lighthouse móvil ≥ 90 con un catálogo de ejemplo.
- **Dependencias:** TICKET-019, TICKET-013.
- **Prueba:** ejecutar el script y Lighthouse.

**TICKET-024 · Manifest mínimo y metadatos**
- **Objetivo:** "Añadir a pantalla de inicio" en modo standalone.
- **Archivos:** `public/manifest.webmanifest`, `public/icons/*`, `index.html`.
- **Implementación:** `display: standalone`, `theme_color`, `background_color`, iconos 192/512 y maskable. `noindex`. Sin service worker.
- **Criterios:**
  - Chrome reconoce el manifest sin errores.
  - Instalada, abre sin barra del navegador.
- **Dependencias:** TICKET-003.
- **Prueba:** DevTools → Application, y un móvil real.

**TICKET-025 · Cabeceras de seguridad y CSP**
- **Objetivo:** endurecer sin romper.
- **Archivos:** `public/_headers`, `src/config.ts`.
- **Implementación:** CSP de la sección 14 con el host real de vídeo del spike, `X-Robots-Tag: noindex`, `Referrer-Policy`, `X-Content-Type-Options`. `config.ts` exporta `ALLOWED_VIDEO_HOSTS`, usado por la validación.
- **Criterios:**
  - La app funciona con la CSP activa (sin violaciones en consola).
  - Una URL de otro host falla la validación.
- **Dependencias:** TICKET-002, TICKET-006.
- **Prueba:** `vite preview` con las cabeceras y revisión de la consola.

**TICKET-026 · Accesibilidad básica**
- **Objetivo:** usable con teclado y lector.
- **Archivos:** ajustes transversales.
- **Implementación:** foco visible, `aria-label` en botones de iconos, `role="slider"` en la barra de progreso con `aria-valuenow/min/max`, `prefers-reduced-motion`, orden de tabulación lógico y texto alternativo en portadas.
- **Criterios:**
  - Todo el flujo (Inicio → serie → reproducir) funciona con teclado.
  - La barra de progreso es operable con flechas.
  - No hay botones sin nombre accesible.
- **Dependencias:** TICKET-021.
- **Prueba:** recorrido solo con teclado y Lighthouse Accessibility ≥ 95.

### FASE 7 — Testing

**TICKET-027 · E2E y responsive**
- **Objetivo:** proteger los flujos críticos.
- **Archivos:** `playwright.config.ts`, `tests/e2e/*.spec.ts`, `tests/fixtures/sample.mp4` (clip corto local).
- **Implementación:** catálogo de fixtures con `video` apuntando al MP4 local. Casos: (1) Home → serie → reproducir → la hora avanza; (2) cerrar y reabrir retoma el progreso; (3) URL de vídeo rota muestra error con Reintentar; (4) búsqueda encuentra por título alternativo; (5) imagen faltante muestra fallback. Proyectos en viewport 360×740 y 1280×800, sin scroll horizontal.
- **Criterios:**
  - Los 5 casos pasan en ambos viewports.
  - No hay desbordamiento horizontal.
  - Todo corre sin red externa.
- **Dependencias:** TICKET-021, TICKET-022, TICKET-017.
- **Prueba:** `npx playwright test`.

### FASE 8 — Deploy

**TICKET-028 · CI**
- **Objetivo:** validar en cada push.
- **Archivos:** `.github/workflows/ci.yml`.
- **Implementación:** `npm ci`, `lint`, `typecheck`, `test`, `check:catalog`, `build`, `check:size`. Sin llamadas a AniList (el JSON está commiteado).
- **Criterios:**
  - Falla si el catálogo es inválido o falta metadato.
  - Dura < 5 min.
- **Dependencias:** TICKET-006, TICKET-023.
- **Prueba:** abrir un PR con un error de catálogo a propósito.

**TICKET-029 · Despliegue y README**
- **Objetivo:** publicar y documentar.
- **Archivos:** `README.md`.
- **Implementación:** conectar el repo a Cloudflare Pages (`npm run build`, `dist`). Configurar Cloudflare Access con los 2 correos (verificar límites vigentes). README con: cómo añadir serie y película (secciones 8 y 9), `npm run sync`, solución de problemas, y qué hacer si Turbo.cr cambia de host.
- **Criterios:**
  - Un push a `main` publica en < 3 min.
  - Un tercero sin acceso no ve el sitio.
  - Una persona nueva añade una serie solo siguiendo el README.
- **Dependencias:** TICKET-025, TICKET-028.
- **Prueba:** añadir una serie real de principio a fin.

## 17. Definition of Done

- La sección 3 tiene sus **NO VERIFICADO** resueltos o documentados en `docs/turbo-findings.md`, con decisión tomada.
- Añadir una serie o película requiere **editar solo `catalog.ts`** y ejecutar un comando. El README lo demuestra.
- La app **no hace requests a AniList en runtime** y funciona con AniList caído.
- Reproductor en móvil real (Android y iOS): reproduce, hace seek, entra en fullscreen, reanuda y pasa al siguiente episodio. Los errores de red muestran mensaje y Reintentar.
- Búsqueda local por título, título alternativo, tipo y género.
- Presupuestos de la sección 13 cumplidos (`check:size` y Lighthouse ≥ 90).
- CI en verde: lint, typecheck, tests unitarios, `check:catalog`, build y E2E a 360 px y 1280 px.
- Sin secretos en el repo, CSP activa sin violaciones y acceso restringido a las dos personas.
- Ninguna de las exclusiones (backend propio, cuentas, analytics, DRM, HLS) se ha colado.

¿Quieres que lo deje como archivo `.md` para pasárselo tal cual al agente programador?