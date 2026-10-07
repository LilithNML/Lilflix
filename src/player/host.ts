const ANONMP4_ORIGIN = 'https://anonmp4.art';

export function toEmbedUrl(video: string): string {
  const url = new URL(video);

  if (url.origin !== ANONMP4_ORIGIN) {
    throw new Error('El reproductor espera una URL de vídeo de anonmp4.art.');
  }

  if (url.pathname.startsWith('/v/')) {
    return new URL(url.pathname.replace(/^\/v\//, '/embed/'), ANONMP4_ORIGIN).toString();
  }

  if (url.pathname.startsWith('/embed/')) {
    return url.toString();
  }

  throw new Error('URL de anonmp4.art no válida. Usa el direct link /v/<id>.');
}
