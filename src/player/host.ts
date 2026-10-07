const ANONMP4_ORIGIN = 'https://anonmp4.art';
const LEGACY_TURBO_ORIGIN = 'https://turbo.cr';

export function toEmbedUrl(video: string): string {
  const url = new URL(video);

  if (url.origin === ANONMP4_ORIGIN) {
    if (url.pathname.startsWith('/v/')) {
      return new URL(url.pathname.replace(/^\/v\//, '/embed/'), ANONMP4_ORIGIN).toString();
    }

    if (url.pathname.startsWith('/embed/')) {
      return url.toString();
    }

    throw new Error('URL de anonmp4.art no válida. Usa el direct link /v/<id>.');
  }

  if (url.origin === LEGACY_TURBO_ORIGIN && url.pathname.startsWith('/embed/')) {
    return url.toString();
  }

  throw new Error('URL de vídeo no compatible. Usa https://anonmp4.art/v/<id>.');
}
