export type Route =
  | { name: 'home' }
  | { name: 'series'; id: number }
  | { name: 'movie'; id: number }
  | { name: 'watch-series'; id: number; season: number; episode: number }
  | { name: 'watch-movie'; id: number }
  | { name: 'not-found' };

function numberPart(value: string | undefined): number | null {
  if (!value || !/^\d+$/.test(value)) return null;
  const number = Number(value);
  return Number.isSafeInteger(number) && number > 0 ? number : null;
}

export function parseRoute(hash = window.location.hash): Route {
  const path = hash.replace(/^#/, '').replace(/\/+$/, '') || '/';
  const parts = path.split('/').filter(Boolean);

  if (parts.length === 0) return { name: 'home' };

  if (parts[0] === 'series' && parts.length === 2) {
    const id = numberPart(parts[1]);
    return id ? { name: 'series', id } : { name: 'not-found' };
  }

  if (parts[0] === 'movie' && parts.length === 2) {
    const id = numberPart(parts[1]);
    return id ? { name: 'movie', id } : { name: 'not-found' };
  }

  if (parts[0] === 'watch' && parts[1] === 'series' && parts.length === 5) {
    const id = numberPart(parts[2]);
    const season = numberPart(parts[3]);
    const episode = numberPart(parts[4]);
    return id && season && episode
      ? { name: 'watch-series', id, season, episode }
      : { name: 'not-found' };
  }

  if (parts[0] === 'watch' && parts[1] === 'movie' && parts.length === 3) {
    const id = numberPart(parts[2]);
    return id ? { name: 'watch-movie', id } : { name: 'not-found' };
  }

  return { name: 'not-found' };
}

export function href(route: Route): string {
  switch (route.name) {
    case 'home': return '#/';
    case 'series': return `#/series/${route.id}`;
    case 'movie': return `#/movie/${route.id}`;
    case 'watch-series': return `#/watch/series/${route.id}/${route.season}/${route.episode}`;
    case 'watch-movie': return `#/watch/movie/${route.id}`;
    case 'not-found': return '#/';
  }
}

export function navigate(route: Route): void {
  window.location.hash = href(route);
}
