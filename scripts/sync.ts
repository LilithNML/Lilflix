import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { catalog } from '../src/content/catalog';
import { assertValidCatalog } from '../src/content/validate';
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

function decodeEntities(value: string): string {
  const named: Record<string, string> = {
    amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ',
    hellip: '…', ndash: '–', mdash: '—', laquo: '«', raquo: '»',
  };
  return value
    .replace(/&#(x[0-9a-f]+|[0-9]+);/gi, (_, raw: string) => {
      const code = raw.toLowerCase().startsWith('x') ? parseInt(raw.slice(1), 16) : Number(raw);
      return Number.isFinite(code) ? String.fromCodePoint(code) : '';
    })
    .replace(/&([a-z]+);/gi, (_, name: string) => named[name.toLowerCase()] ?? `&${name};`);
}

export function htmlToText(html: string | null | undefined): string {
  if (!html) return '';
  return decodeEntities(
    html
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/p\s*>/gi, '\n')
      .replace(/<[^>]*>/g, '')
      .replace(/[ \t]+/g, ' ')
      .replace(/ *\n */g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim(),
  );
}

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

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
      await sleep((Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter : 2 ** attempt) * 1000);
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
  return {
    refresh: args.includes('--refresh'),
    id: args.includes('--id') ? Number(args[args.indexOf('--id') + 1]) : undefined,
  };
}

async function loadExisting(): Promise<MediaMetaMap> {
  try {
    return JSON.parse(await readFile(OUTPUT, 'utf8')) as MediaMetaMap;
  } catch {
    return {};
  }
}

async function main() {
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
  const found = await queryAniList(ids);
  const foundIds = new Set(found.map(item => item.id));
  const missing = ids.filter(value => !foundIds.has(value));
  if (missing.length) throw new Error(`AniList no encontró estos IDs: ${missing.join(', ')}`);

  const next: MediaMetaMap = { ...existing };
  for (const item of found) next[item.id] = normalize(item);

  await mkdir(dirname(OUTPUT), { recursive: true });
  await writeFile(OUTPUT, JSON.stringify(next, null, 2) + '\n', 'utf8');
  console.log(`Sync: ${found.length} metadatos guardados en ${OUTPUT}.`);
}

main().catch(error => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
