import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { catalog } from '../src/content/catalog';
import { assertValidCatalog } from '../src/content/validate';
import { htmlToText } from '../src/content/sanitize';
import type { MediaMeta, MediaMetaMap } from '../src/types';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const OUTPUT = resolve(ROOT, 'src/content/generated/media.json');
const ENDPOINT = 'https://graphql.anilist.co';
const MAX_RETRIES = 3;

type AniListMedia = {
  id: number;
  format: string | null;
  title: { romaji: string; english: string | null; native: string | null };
  coverImage: { extraLarge: string; color: string | null };
  bannerImage: string | null;
  description: string | null;
  genres: string[];
  seasonYear: number | null;
  episodes: number | null;
  duration: number | null;
  averageScore: number | null;
  studios: { nodes: { name: string }[] };
};

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function queryAniList(ids: number[]): Promise<AniListMedia[]> {
  const query = `query($ids: [Int]) {
    Page {
      media(id_in: $ids) {
        id format
        title { romaji english native }
        coverImage { extraLarge color }
        bannerImage description genres seasonYear episodes duration averageScore
        studios { nodes { name } }
      }
    }
  }`;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    const response = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'content-type': 'application/json', accept: 'application/json' },
      body: JSON.stringify({ query, variables: { ids } }),
    });

    if (response.ok) {
      const body = await response.json() as { data?: { Page?: { media?: AniListMedia[] } }; errors?: unknown[] };
      if (body.errors?.length) throw new Error(`AniList devolvió errores GraphQL: ${JSON.stringify(body.errors)}`);
      return body.data?.Page?.media ?? [];
    }

    if (response.status === 429 && attempt < MAX_RETRIES) {
      const retryAfter = Number(response.headers.get('retry-after') ?? '0');
      const seconds = Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter : 2 ** attempt;
      await sleep(seconds * 1000);
      continue;
    }

    throw new Error(`AniList HTTP ${response.status}: ${await response.text()}`);
  }

  throw new Error('No se pudo consultar AniList.');
}

function normalize(media: AniListMedia): MediaMeta {
  return {
    id: media.id,
    title: media.title,
    description: htmlToText(media.description),
    genres: media.genres ?? [],
    format: media.format ?? null,
    year: media.seasonYear ?? null,
    episodes: media.episodes ?? null,
    durationMin: media.duration ?? null,
    score: media.averageScore ?? null,
    studio: media.studios?.nodes?.[0]?.name ?? null,
    color: media.coverImage?.color ?? null,
    cover: media.coverImage?.extraLarge ?? '',
    banner: media.bannerImage ?? null,
    fetchedAt: new Date().toISOString(),
  };
}

function parseArgs() {
  const args = process.argv.slice(2);
  const idIndex = args.indexOf('--id');
  const id = idIndex >= 0 ? Number(args[idIndex + 1]) : undefined;
  if (idIndex >= 0 && (!Number.isInteger(id) || id! <= 0)) throw new Error('--id requiere un entero positivo.');
  return { refresh: args.includes('--refresh'), id };
}

async function loadExisting(): Promise<MediaMetaMap> {
  try {
    return JSON.parse(await readFile(OUTPUT, 'utf8')) as MediaMetaMap;
  } catch {
    return {};
  }
}

export async function syncCatalog() {
  assertValidCatalog(catalog);
  const { refresh, id } = parseArgs();
  const existing = await loadExisting();
  const catalogIds = [...new Set(catalog.map(entry => entry.anilistId))];
  const ids = id ? [id] : (refresh ? catalogIds : catalogIds.filter(value => !existing[value]));

  if (!ids.length) {
    console.log('Sync: no hay metadatos nuevos que consultar.');
    return;
  }

  console.log(`Sync: consultando ${ids.length} ID(s) en una petición batch.`);
  let found: AniListMedia[];
  try {
    found = await queryAniList(ids);
  } catch (error) {
    const hasCachedData = ids.every(value => Boolean(existing[value]));
    if (hasCachedData) {
      console.warn(`Aviso: AniList no está disponible; se conservan los metadatos cacheados. ${error instanceof Error ? error.message : error}`);
      return;
    }
    throw error;
  }
  const foundIds = new Set(found.map(item => item.id));
  const missing = ids.filter(value => !foundIds.has(value));
  if (missing.length) throw new Error(`AniList no encontró estos IDs: ${missing.join(', ')}`);

  const next: MediaMetaMap = { ...existing };
  for (const item of found) next[item.id] = normalize(item);

  await mkdir(dirname(OUTPUT), { recursive: true });
  await writeFile(OUTPUT, JSON.stringify(next, null, 2) + '\n', 'utf8');
  console.log(`Sync: ${found.length} metadatos guardados en ${OUTPUT}.`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  syncCatalog().catch(error => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}
