# Netflix privado para dos: diseño y tickets (v2, 6 tickets)

> Versión simplificada. Respecto a la v1 se eliminan: búsqueda, filtros, listados por tipo, fila "Continuar viendo" en Home, descarga/conversión de imágenes, PWA, CSP elaborada, accesibilidad avanzada, E2E y presupuestos de bundle. De 29 tickets pasamos a **6**.

## 1. Resumen ejecutivo

Una SPA estática en **Svelte + Vite + TypeScript**, sin backend propio, pensada para un catálogo pequeño (unas pocas series y películas).

- El catálogo es **un único archivo** (`src/content/catalog.ts`) donde escribes `anilistId` y URLs de vídeo.
- Un script (`npm run sync`) pide a AniList los metadatos que faltan, los guarda en un JSON dentro del repo y listo. En runtime la app **no llama a AniList**: lee JSON estático, así que funciona aunque AniList caiga y no hay rate limits que vigilar.
- Pantallas: **Home** (hero + filas de Series y Películas), **página de serie** (episodios, con temporadas opcionales), **página de película** y **reproductor** propio sobre `<video>` con MP4 progresivo (sin HLS/DASH).
- El reproductor retoma donde lo dejaste (progreso en `localStorage`) y pasa al siguiente episodio.
- Despliegue: hosting estático desde GitHub, con acceso restringido a las dos personas.

Hay un riesgo que no pude cerrar: el comportamiento técnico real de los enlaces de Turbo.cr (sección 3). Por eso el **TICKET-1 incluye una verificación** antes de construir el reproductor.

## 2. Investigación de AniList

- **Endpoint y acceso:** todo va a `https://graphql.anilist.co` por POST. Los datos públicos de solo lectura no requieren API key.
- **Rate limit:** la documentación indica 90 peticiones por minuto, pero avisa de un estado degradado temporal limitado a 30 por minuto. Si se excede, hay un bloqueo de un minuto con error 429, además de un limitador de ráfagas. Por eso la app hace **cero requests en runtime** y el script usa **una sola query batch con `id_in`** (hasta 50 obras).
- **Campos de `Media` útiles** (por conocimiento de la API, sin re-verificar cada campo en el schema en vivo): `id`, `format`, `title{romaji english native}`, `coverImage{extraLarge color}`, `bannerImage` (puede ser `null`), `description` (viene con HTML), `genres`, `seasonYear`, `episodes`, `duration` (minutos por episodio), `averageScore`, `studios`.
- **Hallazgo de diseño clave:** AniList no tiene "temporadas" como entidad. **Cada temporada es un `Media` distinto** enlazado por relaciones `PREQUEL`/`SEQUEL`. Por eso, en este proyecto, las temporadas son solo una **agrupación local** de tu catálogo (sección 6): una serie usa un único `anilistId` para portada, banner y sinopsis, y tú agrupas los episodios por temporada.
- **CORS:** **probable** que permita llamadas desde navegador, pero **NO VERIFICADO**. Es irrelevante, porque el script corre en Node.
- **Imágenes:** la app usa directamente las URLs de imagen de AniList guardadas en el JSON. Si alguna deja de funcionar, `npm run sync -- --refresh` las renueva. Las condiciones de uso del CDN de imágenes **NO están verificadas**; para uso personal es razonable.

## 3. Investigación de Turbo.cr

| Aspecto | Estado | Detalle |
|---|---|---|
| Host de vídeo gratuito sin transcodificación | **Confirmado** | La portada promete originales sin re-encode, sin límite de resolución y con enlace y código de embed. |
| Límite de tamaño | **Confirmado (con matiz)** | El FAQ actual dice 750 MB por vídeo, formatos MP4, MOV, M4V, MPG y similares. Un snippet antiguo indicaba 250 MB, así que el límite ha cambiado. |
| Acceso por enlace/embed | **Confirmado** | El FAQ dice que el contenido suele ser accesible por enlace directo o embed. |
| Página de descarga con verificación anti-bot | **Confirmado** | La página `/d/…` pide verificar "no soy un robot". El botón "Direct link" podría no ser un MP4 directo estable. |
| Existen páginas `/embed/ID` | **Confirmado** | Una petición a `/embed/…` devolvió 200 en un reporte público. Posible plan B por iframe. |
| Términos: bypass y automatización | **Confirmado** | Prohíben saltarse rate limits o controles de acceso y avisan de que el scraping o la descarga masiva automatizada pueden bloquearse. No garantizan reproducción perfecta ni almacenamiento permanente. |
| Contenido permitido | **Confirmado** | Prohíben subir contenido protegido por copyright sin permiso. Es responsabilidad tuya que lo que alojes cumpla esto. |
| URL directa `.mp4` reproducible en `<video src>` | **NO VERIFICADO** | No pude obtener una URL directa real ni inspeccionar cabeceras. |
| `Accept-Ranges` / `206 Partial Content` / seek | **NO VERIFICADO** | Probable (está detrás de Cloudflare), pero no demostrado. |
| CORS | **NO VERIFICADO** | `<video src>` **no necesita CORS** para reproducir; solo haría falta para `fetch` o canvas, y no los usamos. |
| Hotlinking / chequeo de `Referer` desde otro dominio | **NO VERIFICADO** | Riesgo real. Mitigación: `referrerpolicy="no-referrer"` en el `<video>`. |
| Enlaces firmados o con caducidad | **NO VERIFICADO** | Si caducan, el modelo "pegar URL en catalog.ts" no sirve y habría que cambiar de estrategia. |
| Ancho de banda y estabilidad | **NO VERIFICADO** | El dominio es muy reciente (registrado en enero de 2026): riesgo de estabilidad a largo plazo. |

**Conclusión:** la arquitectura funciona si una URL directa responde `200/206` con `Accept-Ranges: bytes` y `Content-Type: video/mp4` sin `Referer` ni cookies. El TICKET-1 lo comprueba. Si falla, el plan B es el iframe de `/embed/ID` (sin controles propios) o cambiar de host manteniendo el mismo catálogo, porque la URL es solo un string.

## 4. Stack tecnológico recomendado

- **Elegido:** **Svelte 5 + Vite + TypeScript** como SPA pura (no SvelteKit), con CSS propio sin Tailwind y **router hash propio** (~40 líneas).
- **Por qué:** Svelte compila a JS mínimo, rinde bien en Android modesto, los componentes son casi HTML y un agente de IA los escribe con pocos errores. El router hash funciona en cualquier hosting estático sin reglas de rewrite y sobrevive al refresh.
- **Tests:** Vitest solo para la validación del catálogo y el saneado de descripciones. Nada más.
- **Descartado:** React + Vite (más runtime y dependencias para lo mismo), Vue + Vite (sin ventaja aquí), SvelteKit (SSR y adapters innecesarios), Astro (es MPA; el reproductor y las transiciones serían un parche) y Vanilla TS (acabaría reinventando un framework).
- **Complejidad evitada:** SSR, estado global, GraphQL en el cliente, servidor, base de datos, autenticación propia y librerías de reproductor.
- **Dependencias de runtime:** idealmente solo Svelte.

## 5. Arquitectura

```
 catalog.ts (tú escribes IDs + URLs)
      │
      ├──────────── npm run sync (Node, antes de dev/build) ────────┐
      │                                                             ▼
      │                                          AniList GraphQL (1 request batch id_in)
      │                                                             │
      │                                         normalizar + descripción a texto plano
      │                                                             │
      │                                  src/content/generated/media.json  (se commitea)
      ▼                                                             │
 Content service  ◄─────────────────────────────────────────────────┘
 (cruza catálogo + metadatos → Title[])
      │
      ▼
 Router hash → Pages (Home, Serie, Película, Watch)
                                   │
                                   └── (carga diferida) Player ──► <video src="https://turbo.cr/….mp4">
                                              │
                                              └── progreso en localStorage
```

Dos fronteras estrictas: solo `scripts/` habla con AniList, y solo `player/` toca el elemento `<video>`. Los componentes importan únicamente del Content service.

## 6. Modelo de datos

```ts
// src/types/index.ts

// ───────── Lo que escribe el humano (catalog.ts)
export type EpisodeInput =
  | string                                   // URL directa
  | { video: string; title?: string; durationMin?: number; thumb?: string };

export type EpisodeMap = Record<number, EpisodeInput>;   // clave = nº de episodio

export interface SeriesInput {
  anilistId: number;                         // metadatos (portada, sinopsis...) de este ID
  episodes?: EpisodeMap;                     // serie de una sola temporada
  seasons?: Record<number, EpisodeMap>;      // varias temporadas (usa una u otra, no ambas)
  featured?: boolean;                        // candidato al hero de Home
  titleOverride?: string;
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
export interface MediaMeta {
  id: number;
  title: { romaji: string; english: string | null; native: string | null };
  description: string;                       // texto plano, párrafos separados por \n
  genres: string[];
  format: string | null;                     // TV, MOVIE, OVA...
  year: number | null;
  episodes: number | null;
  durationMin: number | null;                // minutos por episodio (o total en películas)
  score: number | null;                      // 0–100
  studio: string | null;
  color: string | null;                      // color dominante de la portada
  cover: string;                             // URL de la portada
  banner: string | null;
  fetchedAt: string;                         // ISO
}
export type MediaMetaMap = Record<number, MediaMeta>;

// ───────── Modelo interno (lo que consume la UI)
export interface Episode { number: number; video: string; title?: string; durationMin?: number; thumb?: string }
export interface Season  { number: number; episodes: Episode[] }

interface TitleBase { id: number; meta: MediaMeta; displayTitle: string; featured: boolean; order: number }
export interface Series extends TitleBase { kind: 'series'; seasons: Season[] }   // `episodes` se normaliza a la temporada 1
export interface Movie  extends TitleBase { kind: 'movie'; video: string; durationMin: number | null }
export type Title = Series | Movie;

// ───────── Progreso (localStorage, clave "pm:progress:v1")
export interface ProgressEntry {
  s: number;            // temporada actual (películas: 1)
  ep: number;           // episodio actual (películas: 1)
  t: number;            // segundos
  d: number;            // duración conocida
  u: number;            // timestamp ms
  watched: string[];    // "temporada:episodio" completados, p. ej. "1:3"
}
export type ProgressStore = { v: 1; items: Record<string, ProgressEntry> };   // clave = id
```

Si más adelante quieres que cada temporada tenga su propia portada y sinopsis, se añade como otra entrada del catálogo con su propio `anilistId`. No se implementa ahora.

## 7. Estructura de archivos

```
├── README.md                   cómo añadir contenido y desplegar
├── docs/turbo-findings.md      resultado de la verificación de Turbo.cr
├── scripts/
│   ├── sync.ts                 catálogo → AniList (batch) → media.json (incluye validación)
│   └── probe-video.ts          verificación de Turbo.cr
├── public/
│   └── _headers                noindex y cabeceras básicas
├── src/
│   ├── main.ts, App.svelte
│   ├── content/
│   │   ├── catalog.ts          ← ÚNICO archivo que editas
│   │   ├── helpers.ts          series(), movie()
│   │   ├── validate.ts
│   │   └── generated/media.json
│   ├── services/
│   │   ├── content.ts          catálogo + meta → Title[]
│   │   └── progress.ts         localStorage
│   ├── app/router.ts           router hash
│   ├── pages/                  Home, SeriesPage, MoviePage, Watch
│   ├── components/             Hero, Row, PosterCard, EpisodeRow
│   ├── player/                 Player.svelte, controls.ts
│   ├── styles/base.css
│   └── types/index.ts
└── tests/validate.test.ts
```

- **`content/`:** datos y helpers de escritura. Sin lógica de UI ni red.
- **`services/`:** lógica sin DOM (cruce de datos y progreso).
- **`pages/`:** una pantalla por ruta, componiendo componentes.
- **`components/`:** piezas visuales que reciben props; no hacen requests ni leen `localStorage`.
- **`player/`:** todo lo que toca `<video>`.
- **`scripts/`:** código solo de Node; no se importa desde `src/`.

## 8. Flujo para añadir una serie

1. Abre la obra en AniList y copia el número de la URL (`anilist.co/anime/21` → `21`).
2. En `src/content/catalog.ts` añade:

```ts
// una sola temporada
series({
  anilistId: 21,
  episodes: {
    1: "https://turbo.cr/.../ep1.mp4",
    2: "https://turbo.cr/.../ep2.mp4",
  },
}),

// varias temporadas (los metadatos salen de un solo anilistId)
series({
  anilistId: 16498,
  seasons: {
    1: { 1: "https://...", 2: "https://..." },
    2: { 1: "https://..." },
  },
}),
```

3. Ejecuta `npm run dev`. El hook `predev` detecta IDs sin metadatos, hace **una** petición batch y actualiza `media.json`.
4. `git add . && git commit && git push`. El hosting construye y publica.

Si el ID no existe, un episodio está duplicado o una URL no es `https`, el script falla con un mensaje claro que indica la entrada.

## 9. Flujo para añadir una película

```ts
movie({ anilistId: 199, video: "https://turbo.cr/.../pelicula.mp4" }),
```

Los pasos 3 y 4 son idénticos. La duración sale de AniList y puedes sobrescribirla con `durationMin`.

## 10. AniList integration

Un script que genera y cachea un JSON que se commitea (**opción C**).

- **Por qué:** cero requests en runtime, cero dependencia de AniList en producción y el código más simple (sin backend ni cache en el navegador).
- **Sync incremental:** solo pide los IDs del catálogo que faltan en `media.json`, en **una** query `Page{media(id_in:[…])}`. `npm run sync -- --refresh` renueva todos y `--id 21` renueva uno. Una segunda ejecución sin cambios no hace requests.
- **Resiliencia:** respeta `Retry-After` en 429 y reintenta con backoff. Si AniList falla y hay datos guardados, avisa y continúa. Si falta un ID sin datos, falla con error claro.
- **Normalización** (única capa que conoce el esquema de AniList): la descripción pasa de HTML a texto plano (`<br>` → `\n`, se eliminan las demás etiquetas, se decodifican entidades), y se guardan solo los campos de `MediaMeta`.
- **Se ejecuta** automáticamente antes de `dev` y `build` (`predev`/`prebuild`).

## 11. Streaming architecture

- **Un solo `<video>`** con `playsinline`, `preload="metadata"` y `referrerpolicy="no-referrer"`. El navegador gestiona el progresivo con peticiones Range. Sin HLS/DASH.
- **Reanudar:** al cargar, si hay progreso, `loadedmetadata` establece `currentTime`. Si falta menos del 5% o 30 s, empieza desde el principio.
- **Cambio de episodio:** se reutiliza el **mismo** elemento `<video>` cambiando `src`, para conservar el permiso de autoplay.
- **Guardado de progreso:** cada ~5 s, además de en `pause`, `visibilitychange` y `pagehide`. Se marca como visto al pasar del 90% o al terminar.
- **Siguiente episodio:** al terminar aparece una cuenta atrás de 5 s cancelable. En el último episodio vuelve a la serie.
- **Errores:** si falla el vídeo, pantalla con mensaje y botón **Reintentar** (retoma la posición). Si el buffering se alarga (~8 s), aviso "Conexión lenta". Si `seekable` no cubre el rango, se desactiva el seek y se avisa (el host no soportaría Range).
- **Fullscreen:** Fullscreen API sobre el contenedor. En iPhone solo funciona sobre el propio vídeo (fullscreen nativo con controles nativos): limitación conocida de iOS. Se intenta bloquear orientación horizontal al entrar en fullscreen, con `try/catch` (funciona en Android/Chrome, no en iOS).

## 12. UX/UI

**Identidad visual:**
- Negro cálido `#0c0b0a`, texto marfil y **un solo acento ámbar** (`#e9a23b`). Sin rojo tipo Netflix.
- Titulares con una fuente con carácter y cuerpo en la fuente del sistema.
- Radios de 4–6 px, sin blur ni cristal, un único scrim lineal para texto sobre imagen.
- Animaciones de 120–200 ms (solo `opacity` y `transform`).

**Navegación:** sin barra inferior. Home → serie/película → reproductor, con botón de volver visible en cada pantalla.

**Home:**
- Hero grande con el título `featured` (o el último añadido), banner, título, sinopsis corta y botón Reproducir/Continuar.
- Debajo, filas horizontales con scroll-snap: **Series** y **Películas**.
- A 360 px se ven ~2.3 pósters por fila para invitar al scroll.
- Catálogo vacío: mensaje explicativo.

**Serie:**
- Banner, título, línea `año · formato · N episodios · ★ puntuación`, sinopsis recortada a 4 líneas con "Más" y géneros como chips.
- Botón principal **Continuar T·E / Reproducir**.
- Selector de temporada (solo si hay más de una).
- Lista de episodios con miniatura (la portada recortada o `thumb`), número, título opcional, duración y marca de visto.

**Película:** banner grande, título, año, duración, géneros, sinopsis y botón Reproducir/Continuar. Sin lista de episodios.

**Reproductor (`#/watch/...`):**
- Pantalla completa negra (`100dvh`, con safe-area).
- Barra superior: volver y "Título · T·E".
- Centro: −10, play/pause grande (64 px) y +10.
- Inferior: barra de progreso con área táctil de 44 px y buffer visible, tiempos y fullscreen.
- Un toque muestra u oculta controles (se ocultan solos a los 3 s). Doble toque en los lados salta ±10 s.
- Escritorio: espacio, flechas y `F`.

## 13. Performance

- Objetivos razonables en Android medio con 4G: LCP < 2.5 s y sin saltos de layout notables.
- Cero requests de red en runtime salvo imágenes y vídeo.
- Imágenes con `width`/`height` explícitos, `loading="lazy"` salvo el hero, y fondo del color dominante mientras cargan.
- Rutas con carga diferida; **el reproductor solo se carga al entrar a `/watch`**.
- `preload="metadata"` en el vídeo, nunca `auto`.
- Sin librerías de UI. Animaciones solo con `transform` y `opacity`.

## 14. Seguridad

- **Las URLs de Turbo.cr estarán en el bundle público.** "Privado" por defecto es solo oscuridad. Mitigación: acceso restringido (sección 15) y `noindex`.
- **XSS:** las descripciones se convierten a texto plano en el sync y se renderizan como texto, nunca con `{@html}`.
- **URLs externas:** solo `https`, validadas con `new URL()` al sincronizar.
- **Mixed content:** todo `https`.
- **Secretos:** no existen. AniList no necesita API key para esto.
- **Meta:** `noindex, nofollow` en el HTML y `X-Robots-Tag` en `_headers`.
- **Legal:** los términos de Turbo.cr exigen que tengas derechos sobre lo que subas; eso queda de tu lado.

## 15. Deployment

- **Recomendación:** repositorio **privado en GitHub** → **Cloudflare Pages** (integración con Git, build `npm run build`, salida `dist/`, HTTPS incluido). Es hosting estático sin backend.
- **Acceso restringido:** GitHub Pages sirve el sitio públicamente aunque el repo sea privado (en cuentas gratuitas), por eso prefiero Cloudflare Pages con **Cloudflare Access** para vuestros 2 correos. Esto lo conozco de forma general y **no lo verifiqué en esta investigación**: confirma límites y precio vigentes antes de depender de ello.
- **Backend:** no hace falta. Ni AniList (se consulta desde Node) ni Turbo.cr (`<video src>` no requiere CORS) obligan a tener uno.

## 16. Tickets de implementación

Convención: cada ticket indica **Objetivo, Archivos, Implementación, Criterios, Dependencias y Prueba**. Se ejecutan en orden.

### FASE 1 — Base

**TICKET-1 · Base del proyecto, estilos y verificación de Turbo.cr**
- **Objetivo:** proyecto que compila, identidad visual y confirmar que los enlaces de Turbo.cr sirven para `<video>`.
- **Archivos:** `package.json`, `vite.config.ts`, `tsconfig.json`, `index.html`, `src/main.ts`, `src/App.svelte`, `src/styles/base.css`, `scripts/probe-video.ts`, `docs/turbo-findings.md`.
- **Implementación:**
  - Configurar Svelte 5 + Vite + TS, con scripts `dev`, `build`, `preview`, `typecheck`, `test`, `sync`.
  - Estilos base de la sección 12: fondo casi negro cálido, texto marfil, acento ámbar, radios de 4–6 px, sin blur ni cristal, safe-area y `prefers-reduced-motion`.
  - Script que, dada una URL, hace `HEAD` y `GET` con `Range: bytes=0-1` y `bytes=1000000-1000100`, y anota `200` vs `206`, `Accept-Ranges`, `Content-Type`, `Content-Length`, cabeceras CORS, redirecciones y si responde con otro `Referer` y sin cookies.
  - Una prueba manual de `<video src>` en un móvil real (seek incluido).
  - Documentar cada punto como CONFIRMADO / NO VERIFICADO en `docs/turbo-findings.md`, con la **decisión**: reproductor directo, plan B (iframe `/embed/ID`) o cambio de host.
- **Criterios:**
  - `npm run build` y `npm run typecheck` pasan.
  - `turbo-findings.md` responde: ¿Range?, ¿seek?, ¿hotlink?, ¿caducidad?, ¿qué host sirve el vídeo?
  - Cada afirmación lleva evidencia (cabeceras copiadas).
  - Si el resultado es negativo, el plan B queda decidido antes de seguir.
- **Dependencias:** None.
- **Prueba:** `npx tsx scripts/probe-video.ts <url>` y reproducir la URL en un móvil.

### FASE 2 — Contenido

**TICKET-2 · Catálogo y sync de AniList**
- **Objetivo:** añadir contenido editando un solo archivo.
- **Archivos:** `src/types/index.ts`, `src/content/{catalog,helpers,validate}.ts`, `scripts/sync.ts`, `src/content/generated/media.json`, `src/services/content.ts`, `tests/validate.test.ts`.
- **Implementación:**
  - Tipos de la sección 6 y helpers `series()` / `movie()` con tipos estrictos. `catalog.ts` con una serie y una película de ejemplo.
  - `validate.ts`: `anilistId` entero > 0 y no duplicado, URLs `https`, números de temporada y episodio enteros positivos, al menos un episodio, y no usar `episodes` y `seasons` a la vez. Avisos (no fallo) si hay huecos en la numeración.
  - `sync.ts`: calcula los IDs que faltan, hace **una** petición `Page{media(id_in:…)}`, normaliza a `MediaMeta` (descripción a texto plano) y fusiona en `media.json` con orden estable. Respeta `Retry-After` en 429 y reintenta hasta 3 veces. Flags `--refresh` y `--id`. Se ejecuta en `predev` y `prebuild`.
  - `content.ts`: une catálogo y metadatos en `Title[]`, normaliza `episodes` a la temporada 1, ordena episodios, calcula `displayTitle` (override > english > romaji) y expone `getAll`, `getById`, `getFeatured` (primer `featured` o el último añadido), `getSeries`, `getMovies`. Si falta metadato, la entrada se omite con un aviso y la app no se rompe.
- **Criterios:**
  - Añadir una serie es un bloque en `catalog.ts` más `npm run dev`.
  - La segunda ejecución del sync no hace requests.
  - Un ID inexistente o una URL `http` fallan con mensaje claro.
  - Los componentes no importan nada de AniList.
  - Los tests de validación cubren cada regla (válida e inválida) y el saneado HTML → texto.
- **Dependencias:** TICKET-1.
- **Prueba:** añadir 2 IDs reales (una serie y una película), ejecutar el sync, verificar el JSON y `npm test`.

### FASE 3 — Interfaz

**TICKET-3 · Home y navegación**
- **Objetivo:** el catálogo bonito.
- **Archivos:** `src/app/router.ts`, `src/pages/Home.svelte`, `src/components/{Hero,Row,PosterCard}.svelte`, `src/App.svelte`.
- **Implementación:**
  - Router hash con las rutas `#/`, `#/series/:id`, `#/movie/:id` y `#/watch/series/:id/:season/:ep` / `#/watch/movie/:id`. Páginas con `import()`. Ruta desconocida → pantalla "no encontrado" con enlace a Inicio.
  - Home de la sección 12: hero y filas de Series y Películas.
  - Pósters con `loading="lazy"`, `width`/`height` y fallback (color + inicial del título) si falla la imagen.
- **Criterios:**
  - Se ve bien a 360 px de ancho y en 1280 px.
  - Tocar un póster abre su página y refrescar mantiene la ruta.
  - Atrás y adelante funcionan.
  - Catálogo vacío muestra un mensaje, no una pantalla en blanco.
  - No hay scroll horizontal de la página.
- **Dependencias:** TICKET-2.
- **Prueba:** manual en móvil y en escritorio.

**TICKET-4 · Página de serie y de película**
- **Objetivo:** el flujo tipo Netflix al entrar a un título.
- **Archivos:** `src/pages/SeriesPage.svelte`, `src/pages/MoviePage.svelte`, `src/components/EpisodeRow.svelte`, `src/services/progress.ts`.
- **Implementación:**
  - Serie y película según la sección 12.
  - `progress.ts` con clave `pm:progress:v1`: `get(id)`, `save(id, entry)`, `markWatched(id, s, ep)`. Todo en `try/catch`: si `localStorage` falla o el JSON está corrupto, usa memoria y no rompe.
  - El botón principal calcula el episodio a continuar (el actual si no está completo, si no el siguiente, y el primero si no hay progreso).
- **Criterios:**
  - El botón principal refleja el progreso real.
  - Los episodios vistos se marcan.
  - El selector de temporada solo aparece con más de una temporada.
  - Una serie sin banner o sin sinopsis no rompe el diseño.
  - Un ID inexistente muestra "no encontrado".
- **Dependencias:** TICKET-3.
- **Prueba:** manual con una serie de 3 episodios, en una y en dos temporadas, y con progreso simulado en `localStorage`.

### FASE 4 — Reproductor

**TICKET-5 · Reproductor**
- **Objetivo:** reproducción cómoda en móvil.
- **Archivos:** `src/pages/Watch.svelte`, `src/player/Player.svelte`, `src/player/controls.ts`.
- **Implementación:**
  - `<video playsinline preload="metadata" referrerpolicy="no-referrer">` en pantalla completa negra, cargado con `import()` solo al entrar a `/watch`.
  - Controles propios de la sección 12: play/pause grande, ±10 s, barra de progreso táctil (Pointer Events, `touch-action: none`) con buffer visible, tiempos, fullscreen y volver. Un toque alterna controles (auto-ocultan a 3 s) y doble toque en los lados salta ±10 s.
  - Reanudar, guardar progreso y siguiente episodio de la sección 11 (mismo `<video>`, `replaceState` de la URL).
  - Buffering con spinner tras 400 ms, aviso "Conexión lenta" a los ~8 s y pantalla de error con causa y botón **Reintentar** / **Volver**.
  - Fullscreen con fallback iOS y bloqueo de orientación con `try/catch`.
- **Criterios:**
  - Se puede arrastrar el seek con el dedo sin mover la página.
  - Botones de al menos 44 px.
  - Cerrar y reabrir retoma a ±5 s.
  - Al terminar un episodio, la cuenta atrás pasa al siguiente y se puede cancelar. Tras el último vuelve a la serie.
  - Una URL rota muestra el error y no una pantalla negra.
  - Cortar la red a mitad muestra buffering y se recupera con Reintentar.
  - Las películas guardan progreso con `s = 1`, `ep = 1`.
  - El chunk del reproductor no se carga fuera de `/watch`.
- **Dependencias:** TICKET-4.
- **Prueba:** manual en un Android real (y en un iPhone si lo tienes a mano), con DevTools en offline y una URL falsa.

### FASE 5 — Producción

**TICKET-6 · Despliegue, README y revisión final**
- **Objetivo:** que esté en producción y que añadir contenido sea trivial.
- **Archivos:** `README.md`, `public/_headers`, `index.html`.
- **Implementación:**
  - `noindex, nofollow` en el HTML y `X-Robots-Tag: noindex` en `_headers`.
  - Repositorio en GitHub conectado a Cloudflare Pages (`npm run build`, salida `dist/`).
  - Cloudflare Access con los 2 correos (confirmar límites vigentes).
  - README con "cómo añadir una serie" y "cómo añadir una película" en 3 pasos, `npm run sync` y qué hacer si Turbo.cr cambia de host.
  - Lista de comprobación en el móvil: Home, serie, reproducir, seek, fullscreen, siguiente episodio, error de red.
- **Criterios:**
  - Un push a `main` publica el sitio.
  - Alguien sin acceso no ve el contenido ni las URLs.
  - La lista de comprobación pasa en el móvil.
  - Una persona nueva añade una serie solo siguiendo el README.
- **Dependencias:** TICKET-5.
- **Prueba:** añadir una serie real de principio a fin siguiendo solo el README.

## 17. Definition of Done

- La sección 3 tiene sus **NO VERIFICADO** resueltos o documentados en `docs/turbo-findings.md`, con decisión tomada.
- Añadir una serie o película requiere **editar solo `catalog.ts`** y ejecutar un comando. El README lo demuestra.
- La app **no hace requests a AniList en runtime** y funciona con AniList caído.
- Home, serie (con temporadas opcionales), película y reproductor funcionan en un móvil real.
- El reproductor reproduce, hace seek, entra en fullscreen, retoma y pasa al siguiente episodio. Los errores de red muestran mensaje y Reintentar.
- Está desplegado con acceso restringido a las dos personas y `noindex`.
- Sin secretos en el repo.
- Ninguna de las exclusiones (backend propio, cuentas, analytics, DRM, HLS, búsqueda) se ha colado.
