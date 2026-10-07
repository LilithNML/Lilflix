import { movie, series } from './helpers';
import type { CatalogEntry } from '../types';

/**
 * ÚNICO archivo que editas para añadir contenido.
 * Sustituye estas URLs de ejemplo por URLs HTTPS reales de tu proveedor.
 */
export const catalog: CatalogEntry[] = [
  series({
    anilistId: 21,
    featured: true,
    episodes: {
      1: 'https://turbo.cr/replace-with-episode-1.mp4',
      2: 'https://turbo.cr/replace-with-episode-2.mp4',
    },
  }),
  movie({
    anilistId: 199,
    video: 'https://turbo.cr/replace-with-movie.mp4',
  }),
];
