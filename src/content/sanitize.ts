const namedEntities: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', hellip: '…', ndash: '–', mdash: '—', laquo: '«', raquo: '»' };

function decodeEntities(value: string): string {
  return value
    .replace(/&#(x[0-9a-f]+|[0-9]+);/gi, (_, raw: string) => {
      const code = raw.toLowerCase().startsWith('x') ? parseInt(raw.slice(1), 16) : Number(raw);
      return Number.isFinite(code) ? String.fromCodePoint(code) : '';
    })
    .replace(/&([a-z]+);/gi, (_, name: string) => namedEntities[name.toLowerCase()] ?? `&${name};`);
}

export function htmlToText(html: string | null | undefined): string {
  if (!html) return '';
  return decodeEntities(html.replace(/<br\s*\/?>/gi, '\n').replace(/<\/p\s*>/gi, '\n').replace(/<[^>]*>/g, '').replace(/[ \t]+/g, ' ').replace(/ *\n */g, '\n').replace(/\n{3,}/g, '\n\n').trim());
}
