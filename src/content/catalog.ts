import { series } from './helpers';
import type { CatalogEntry } from '../types';

/**
 * ÚNICO archivo que editas para añadir contenido.
 * Las URLs de vídeo deben ser HTTPS y estar autorizadas para su uso.
 */
export const catalog: CatalogEntry[] = [
  series({
    anilistId: 196722,
    featured: true,
    episodes: {
      1: 'https://turbo.cr/embed/5SdgNnMqkdSQ-',
      2: 'https://turbo.cr/embed/exv4XXWiUMkOz',
      3: 'https://turbo.cr/embed/OTq1FlnJdH8VA',
      4: 'https://turbo.cr/embed/IvmNTQoFHPbzK',
    },
  }),
];
