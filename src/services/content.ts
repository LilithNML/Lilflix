import catalog from '../content/catalog';
import metadata from '../content/generated/media.json';
import { episodeInputToObject } from '../content/helpers';
import type { CatalogEntry, Episode, MediaMetaMap, Movie, Series, Title } from '../types';

const media = metadata as MediaMetaMap;

function displayTitle(meta: Series['meta'], override?: string): string {
  return override?.trim() || meta.title.english || meta.title.romaji || meta.title.native || 'Sin título';
}

function episodesFromMap(map: Record<number, import('../types').EpisodeInput>): Episode[] {
  return Object.entries(map)
    .map(([number, input]) => {
      const value = episodeInputToObject(input);
      return { number: Number(number), ...value };
    })
    .sort((a, b) => a.number - b.number);
}

function buildTitle(entry: CatalogEntry, order: number): Title | null {
  const meta = media[entry.anilistId];
  if (!meta) {
    console.warn(`Se omite ${entry.type} ${entry.anilistId}: falta metadato en media.json.`);
    return null;
  }

  const base = {
    id: entry.anilistId,
    meta,
    displayTitle: displayTitle(meta, entry.titleOverride),
    featured: Boolean(entry.featured),
    order,
  };

  if (entry.type === 'movie') {
    return { ...base, kind: 'movie', video: entry.video, durationMin: entry.durationMin ?? meta.durationMin };
  }

  const seasons = entry.seasons
    ? Object.entries(entry.seasons)
        .map(([number, episodes]) => ({ number: Number(number), episodes: episodesFromMap(episodes) }))
        .sort((a, b) => a.number - b.number)
    : [{ number: 1, episodes: episodesFromMap(entry.episodes!) }];

  return { ...base, kind: 'series', seasons };
}

const titles = (): Title[] => catalog
  .map((entry, index) => buildTitle(entry, index))
  .filter((entry): entry is Title => entry !== null);

export function getAll(): Title[] { return titles(); }
export function getById(id: number): Title | undefined { return titles().find(title => title.id === id); }
export function getFeatured(): Title | undefined {
  const all = titles();
  return all.find(title => title.featured) ?? all.at(-1);
}
export function getSeries(): Series[] { return titles().filter((title): title is Series => title.kind === 'series'); }
export function getMovies(): Movie[] { return titles().filter((title): title is Movie => title.kind === 'movie'); }
