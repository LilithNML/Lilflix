import { describe, expect, it } from 'vitest';
import { validateCatalog } from '../src/content/validate';
import { htmlToText } from '../scripts/sync';
import { movie, series } from '../src/content/helpers';

describe('validateCatalog', () => {
  const valid = [
    series({ anilistId: 21, episodes: { 1: 'https://example.com/1.mp4', 2: 'https://example.com/2.mp4' } }),
    movie({ anilistId: 199, video: 'https://example.com/movie.mp4' }),
  ];

  it('acepta una serie y película válidas', () => {
    expect(validateCatalog(valid).errors).toEqual([]);
  });

  it('rechaza anilistId no positivo', () => {
    const result = validateCatalog([series({ anilistId: 0, episodes: { 1: 'https://example.com/1.mp4' } })]);
    expect(result.errors.some(error => error.includes('anilistId'))).toBe(true);
  });

  it('rechaza anilistId duplicado', () => {
    const result = validateCatalog([
      series({ anilistId: 21, episodes: { 1: 'https://example.com/1.mp4' } }),
      movie({ anilistId: 21, video: 'https://example.com/movie.mp4' }),
    ]);
    expect(result.errors.some(error => error.includes('duplicado'))).toBe(true);
  });

  it('rechaza URLs HTTP', () => {
    const result = validateCatalog([movie({ anilistId: 199, video: 'http://example.com/movie.mp4' })]);
    expect(result.errors.some(error => error.includes('HTTPS'))).toBe(true);
  });

  it('rechaza episodes y seasons simultáneamente', () => {
    const result = validateCatalog([series({
      anilistId: 21,
      episodes: { 1: 'https://example.com/1.mp4' },
      seasons: { 1: { 1: 'https://example.com/1.mp4' } },
    })]);
    expect(result.errors.some(error => error.includes('episodes y seasons'))).toBe(true);
  });

  it('rechaza una serie sin episodios', () => {
    const result = validateCatalog([series({ anilistId: 21 })]);
    expect(result.errors.some(error => error.includes('episodes o seasons'))).toBe(true);
  });

  it('avisa de huecos sin convertirlos en error', () => {
    const result = validateCatalog([series({
      anilistId: 21,
      episodes: { 1: 'https://example.com/1.mp4', 3: 'https://example.com/3.mp4' },
    })]);
    expect(result.errors).toEqual([]);
    expect(result.warnings.some(warning => warning.includes('falta el episodio 2'))).toBe(true);
  });

  it('valida temporadas y episodios positivos', () => {
    const result = validateCatalog([series({
      anilistId: 21,
      seasons: { 0: { 1: 'https://example.com/1.mp4' } },
    })]);
    expect(result.errors.some(error => error.includes('temporada'))).toBe(true);
  });
});

describe('htmlToText', () => {
  it('convierte HTML a texto plano, conserva saltos y decodifica entidades', () => {
    expect(htmlToText('<p>Hello &amp; world</p><br><strong>Next</strong> &mdash; ok'))
      .toBe('Hello & world\nNext — ok');
  });

  it('maneja HTML vacío', () => {
    expect(htmlToText(null)).toBe('');
  });
});
