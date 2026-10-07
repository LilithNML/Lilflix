import type { EpisodeInput, MovieInput, SeriesInput } from '../types';

export const series = (input: SeriesInput): { type: 'series' } & SeriesInput => ({
  type: 'series',
  ...input,
});

export const movie = (input: MovieInput): { type: 'movie' } & MovieInput => ({
  type: 'movie',
  ...input,
});

export const episodeInputToObject = (input: EpisodeInput) =>
  typeof input === 'string' ? { video: input } : input;
