export const SEEK_SECONDS = 10;
export const CONTROL_HIDE_MS = 3000;
export const BUFFERING_DELAY_MS = 400;
export const SLOW_CONNECTION_MS = 8000;

export function clampTime(value: number, duration: number): number {
  return Math.max(0, Math.min(value, Number.isFinite(duration) ? duration : value));
}

export function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
  const total = Math.floor(seconds);
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const secs = total % 60;
  return hours > 0
    ? `${hours}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
    : `${minutes}:${String(secs).padStart(2, '0')}`;
}

export function shouldResume(time: number, duration: number): boolean {
  if (!Number.isFinite(time) || time <= 0 || !Number.isFinite(duration) || duration <= 0) return false;
  return duration - time >= Math.min(duration * 0.05, 30);
}
