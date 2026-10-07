import type { CatalogEntry, EpisodeInput, EpisodeMap } from '../types';

const isHttps = (value: string): boolean => {
  try {
    const url = new URL(value);
    return url.protocol === 'https:';
  } catch {
    return false;
  }
};

const validateEpisodeMap = (map: EpisodeMap, context: string, errors: string[], warnings: string[]) => {
  const keys = Object.keys(map).map(Number);
  if (keys.length === 0) errors.push(`${context}: debe tener al menos un episodio.`);

  const seen = new Set<number>();
  for (const number of keys) {
    if (!Number.isInteger(number) || number <= 0) {
      errors.push(`${context}: el episodio "${number}" debe ser un entero positivo.`);
    }
    if (seen.has(number)) errors.push(`${context}: episodio duplicado ${number}.`);
    seen.add(number);

    const value: EpisodeInput | undefined = map[number];
    const url = typeof value === 'string' ? value : value?.video;
    if (!url || !isHttps(url)) {
      errors.push(`${context} episodio ${number}: la URL de vídeo debe ser HTTPS válida.`);
    }
    if (typeof value !== 'string' && value.durationMin !== undefined &&
        (!Number.isFinite(value.durationMin) || value.durationMin <= 0)) {
      errors.push(`${context} episodio ${number}: durationMin debe ser positivo.`);
    }
  }

  if (keys.length > 1) {
    const sorted = [...keys].sort((a, b) => a - b);
    for (let i = 1; i <= sorted[sorted.length - 1]; i++) {
      if (!seen.has(i)) warnings.push(`${context}: falta el episodio ${i} (hueco de numeración).`);
    }
  }
};

export interface ValidationResult {
  errors: string[];
  warnings: string[];
}

export function validateCatalog(entries: CatalogEntry[]): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const ids = new Set<number>();

  entries.forEach((entry, index) => {
    const context = `Entrada ${index + 1}`;
    if (!Number.isInteger(entry.anilistId) || entry.anilistId <= 0) {
      errors.push(`${context}: anilistId debe ser un entero > 0.`);
    } else if (ids.has(entry.anilistId)) {
      errors.push(`${context}: anilistId duplicado ${entry.anilistId}.`);
    } else {
      ids.add(entry.anilistId);
    }

    if (entry.type === 'movie') {
      if (!isHttps(entry.video)) errors.push(`${context}: la URL de película debe ser HTTPS válida.`);
      if (entry.durationMin !== undefined &&
          (!Number.isFinite(entry.durationMin) || entry.durationMin <= 0)) {
        errors.push(`${context}: durationMin debe ser positivo.`);
      }
      return;
    }

    if (entry.episodes && entry.seasons) {
      errors.push(`${context}: no se pueden usar episodes y seasons a la vez.`);
    }
    if (!entry.episodes && !entry.seasons) {
      errors.push(`${context}: debe existir episodes o seasons.`);
    }
    if (entry.episodes) validateEpisodeMap(entry.episodes, context, errors, warnings);
    if (entry.seasons) {
      const seasons = Object.keys(entry.seasons).map(Number);
      if (seasons.length === 0) errors.push(`${context}: seasons no puede estar vacío.`);
      for (const season of seasons) {
        if (!Number.isInteger(season) || season <= 0) {
          errors.push(`${context}: la temporada "${season}" debe ser un entero positivo.`);
          continue;
        }
        validateEpisodeMap(entry.seasons[season], `${context} temporada ${season}`, errors, warnings);
      }
    }
  });

  return { errors, warnings };
}

export function assertValidCatalog(entries: CatalogEntry[]): void {
  const result = validateCatalog(entries);
  if (result.errors.length) {
    throw new Error(['Catálogo inválido:', ...result.errors.map(e => `- ${e}`)].join('\n'));
  }
  for (const warning of result.warnings) console.warn(`Advertencia: ${warning}`);
}
