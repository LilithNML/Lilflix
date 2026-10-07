import type { Movie, ProgressEntry, ProgressStore, Series } from '../types';

const STORAGE_KEY = 'pm:progress:v1';
const memory: ProgressStore = { v: 1, items: {} };

function clone(entry: ProgressEntry): ProgressEntry {
  return { ...entry, watched: [...entry.watched] };
}

function readStore(): ProgressStore {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return memory;
    const parsed = JSON.parse(raw) as ProgressStore;
    if (parsed?.v !== 1 || !parsed.items || typeof parsed.items !== 'object') return memory;
    memory.items = parsed.items;
    return parsed;
  } catch {
    return memory;
  }
}

function writeStore(store: ProgressStore): void {
  memory.items = store.items;
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(store)); } catch { /* memoria */ }
}

export function get(id: number): ProgressEntry | undefined {
  const entry = readStore().items[String(id)];
  return entry ? clone(entry) : undefined;
}

export function save(id: number, entry: ProgressEntry): void {
  const store = readStore();
  store.items[String(id)] = clone(entry);
  writeStore(store);
}

export function markWatched(id: number, s: number, ep: number): ProgressEntry {
  const existing = get(id) ?? { s, ep, t: 0, d: 0, u: Date.now(), watched: [] };
  const key = `${s}:${ep}`;
  if (!existing.watched.includes(key)) existing.watched = [...existing.watched, key];
  existing.s = s; existing.ep = ep; existing.t = 0; existing.u = Date.now();
  save(id, existing);
  return existing;
}

function isWatched(entry: ProgressEntry | undefined, s: number, ep: number): boolean {
  return Boolean(entry?.watched.includes(`${s}:${ep}`));
}

export function nextToWatch(title: Series | Movie, progress?: ProgressEntry): { s: number; ep: number } {
  if (title.kind === 'movie') return { s: 1, ep: 1 };
  if (!progress) return { s: title.seasons[0]?.number ?? 1, ep: title.seasons[0]?.episodes[0]?.number ?? 1 };

  const currentSeason = title.seasons.find(season => season.number === progress.s);
  const currentEpisode = currentSeason?.episodes.find(ep => ep.number === progress.ep);
  if (currentSeason && currentEpisode && !isWatched(progress, progress.s, progress.ep)) {
    return { s: progress.s, ep: progress.ep };
  }

  const all = title.seasons.flatMap(season => season.episodes.map(ep => ({ s: season.number, ep: ep.number })));
  const currentIndex = all.findIndex(item => item.s === progress.s && item.ep === progress.ep);
  const next = all.slice(currentIndex + 1).find(item => !isWatched(progress, item.s, item.ep));
  return next ?? all.at(-1) ?? { s: 1, ep: 1 };
}
