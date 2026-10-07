export type EpisodeInput =
  | string
  | { video: string; title?: string; durationMin?: number; thumb?: string };

export type EpisodeMap = Record<number, EpisodeInput>;

export interface SeriesInput {
  anilistId: number;
  episodes?: EpisodeMap;
  seasons?: Record<number, EpisodeMap>;
  featured?: boolean;
  titleOverride?: string;
}

export interface MovieInput {
  anilistId: number;
  video: string;
  durationMin?: number;
  featured?: boolean;
  titleOverride?: string;
}

export type CatalogEntry =
  | ({ type: 'series' } & SeriesInput)
  | ({ type: 'movie' } & MovieInput);

export interface MediaMeta {
  id: number;
  title: { romaji: string; english: string | null; native: string | null };
  description: string;
  genres: string[];
  format: string | null;
  year: number | null;
  episodes: number | null;
  durationMin: number | null;
  score: number | null;
  studio: string | null;
  color: string | null;
  cover: string;
  banner: string | null;
  fetchedAt: string;
}

export type MediaMetaMap = Record<number, MediaMeta>;

export interface Episode {
  number: number;
  video: string;
  title?: string;
  durationMin?: number;
  thumb?: string;
}

export interface Season {
  number: number;
  episodes: Episode[];
}

interface TitleBase {
  id: number;
  meta: MediaMeta;
  displayTitle: string;
  featured: boolean;
  order: number;
}

export interface Series extends TitleBase {
  kind: 'series';
  seasons: Season[];
}

export interface Movie extends TitleBase {
  kind: 'movie';
  video: string;
  durationMin: number | null;
}

export type Title = Series | Movie;

export interface ProgressEntry {
  s: number;
  ep: number;
  t: number;
  d: number;
  u: number;
  watched: string[];
}

export type ProgressStore = { v: 1; items: Record<string, ProgressEntry> };
