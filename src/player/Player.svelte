<script lang="ts">
  import { onMount, tick } from 'svelte';
  import { get, markWatched, save } from '../services/progress';
  import { href, navigate } from '../app/router';
  import type { Episode, Movie, Series, Title } from '../types';
  import { clampTime, CONTROL_HIDE_MS, formatTime, SEEK_SECONDS, shouldResume } from './controls';

  export let title: Title;
  export let video: string;
  export let season = 1;
  export let episode = 1;
  export let next: { s: number; ep: number } | undefined;
  export let backHref = '#/';

  let videoEl: HTMLVideoElement;
  let container: HTMLDivElement;
  let playing = false;
  let controlsVisible = true;
  let currentTime = 0;
  let duration = 0;
  let buffered = 0;
  let seeking = false;
  let loading = false;
  let slow = false;
  let errorMessage = '';
  let resumeTime = 0;
  let countdown = 0;
  let hideTimer: ReturnType<typeof setTimeout> | undefined;
  let bufferingTimer: ReturnType<typeof setTimeout> | undefined;
  let slowTimer: ReturnType<typeof setTimeout> | undefined;
  let resumeApplied = false;
  let activeSeason = season;
  let activeEpisode = episode;
  let activeVideo = video;

  $: progressPercent = duration ? (currentTime / duration) * 100 : 0;
  $: bufferedPercent = duration ? buffered / duration * 100 : 0;

  function currentProgress() {
    return { s: activeSeason, ep: activeEpisode, t: currentTime, d: duration, u: Date.now(), watched: get(title.id)?.watched ?? [] };
  }

  function persist(markComplete = false) {
    if (markComplete) markWatched(title.id, activeSeason, activeEpisode);
    else save(title.id, currentProgress());
  }

  function showControls() {
    controlsVisible = true;
    if (hideTimer) clearTimeout(hideTimer);
    if (playing) hideTimer = setTimeout(() => controlsVisible = false, CONTROL_HIDE_MS);
  }

  function togglePlay() {
    if (videoEl.paused) void videoEl.play().catch(() => undefined);
    else videoEl.pause();
    showControls();
  }

  function seekBy(delta: number) {
    videoEl.currentTime = clampTime(videoEl.currentTime + delta, videoEl.duration);
    persist();
    showControls();
  }

  function seekTo(clientX: number) {
    const rect = (event?.currentTarget as HTMLElement | null)?.getBoundingClientRect();
    if (!rect || !duration) return;
    videoEl.currentTime = clampTime(((clientX - rect.left) / rect.width) * duration, duration);
    persist();
  }

  function updateFromPointer(event: PointerEvent) {
    const el = event.currentTarget as HTMLElement;
    const rect = el.getBoundingClientRect();
    videoEl.currentTime = clampTime(((event.clientX - rect.left) / rect.width) * duration, duration);
  }

  async function toggleFullscreen() {
    try {
      if (!document.fullscreenElement) {
        await container.requestFullscreen();
        try { await screen.orientation.lock('landscape'); } catch { /* iOS / unsupported */ }
      } else {
        await document.exitFullscreen();
      }
    } catch {
      try { await videoEl.requestFullscreen(); } catch { /* native iOS fallback */ }
    }
  }

  function scheduleBuffering() {
    clearTimeout(bufferingTimer);
    bufferingTimer = setTimeout(() => { loading = true; }, 400);
    clearTimeout(slowTimer);
    slowTimer = setTimeout(() => { if (loading) slow = true; }, 8000);
  }

  function clearBuffering() {
    clearTimeout(bufferingTimer);
    clearTimeout(slowTimer);
    loading = false;
    slow = false;
  }

  function applyResume() {
    if (resumeApplied || !duration) return;
    resumeApplied = true;
    if (shouldResume(resumeTime, duration)) videoEl.currentTime = resumeTime;
  }

  function loadSource() {
    resumeApplied = false;
    resumeTime = get(title.id)?.s === activeSeason && get(title.id)?.ep === activeEpisode ? (get(title.id)?.t ?? 0) : 0;
    errorMessage = '';
    videoEl.src = activeVideo;
    videoEl.load();
  }

  function onLoadedMetadata() {
    duration = videoEl.duration;
    applyResume();
  }

  function onProgress() {
    const range = videoEl.buffered.length ? videoEl.buffered.end(videoEl.buffered.length - 1) : 0;
    buffered = range;
  }

  function onTimeUpdate() {
    currentTime = videoEl.currentTime;
    if (!seeking && Math.floor(currentTime) % 5 === 0) persist();
    if (duration > 0 && currentTime / duration >= 0.9) persist(true);
  }

  function onPlay() { playing = true; showControls(); }
  function onPause() { playing = false; persist(); controlsVisible = true; }
  function onWaiting() { scheduleBuffering(); }
  function onPlaying() { clearBuffering(); }
  function onError() {
    clearBuffering();
    const code = videoEl.error?.code;
    errorMessage = code === MediaError.MEDIA_ERR_NETWORK
      ? 'No se pudo cargar el vídeo. Comprueba tu conexión.'
      : 'Este vídeo no está disponible o la URL ha caducado.';
  }

  function onVisibilityChange() {
    if (document.visibilityState === 'hidden') persist();
  }

  function onPageHide() { persist(); }

  function startNext() {
    countdown = 0;
    if (title.kind === 'series' && next) {
      const nextEpisode = title.seasons.find(item => item.number === next.s)?.episodes.find(item => item.number === next.ep);
      if (!nextEpisode) return;
      activeSeason = next.s;
      activeEpisode = next.ep;
      activeVideo = nextEpisode.video;
      resumeApplied = false;
      currentTime = 0;
      duration = 0;
      buffered = 0;
      errorMessage = '';
      videoEl.src = activeVideo;
      videoEl.load();
      history.replaceState(null, '', href({ name: 'watch-series', id: title.id, season: activeSeason, episode: activeEpisode }));
      void videoEl.play().catch(() => undefined);
      return;
    }
    window.location.hash = backHref;
  }

  function cancelNext() { countdown = 0; }

  function onEnded() {
    persist(true);
    if (title.kind === 'series' && next) {
      countdown = 5;
      const timer = window.setInterval(() => {
        countdown -= 1;
        if (countdown <= 0) {
          window.clearInterval(timer);
          startNext();
        }
      }, 1000);
    } else {
      window.location.hash = backHref;
    }
  }

  function onPointerUp(event: PointerEvent) {
    if (event.detail === 2) {
      const rect = container.getBoundingClientRect();
      seekBy(event.clientX < rect.left + rect.width / 2 ? -SEEK_SECONDS : SEEK_SECONDS);
      return;
    }
    showControls();
  }

  function onKeydown(event: KeyboardEvent) {
    if (event.target instanceof HTMLInputElement) return;
    if (event.code === 'Space') { event.preventDefault(); togglePlay(); }
    else if (event.key === 'ArrowLeft') seekBy(-SEEK_SECONDS);
    else if (event.key === 'ArrowRight') seekBy(SEEK_SECONDS);
    else if (event.key.toLowerCase() === 'f') void toggleFullscreen();
  }

  onMount(async () => {
    await tick();
    loadSource();
    document.addEventListener('visibilitychange', onVisibilityChange);
    window.addEventListener('pagehide', onPageHide);
    window.addEventListener('keydown', onKeydown);
    return () => {
      persist();
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('pagehide', onPageHide);
      window.removeEventListener('keydown', onKeydown);
      if (hideTimer) clearTimeout(hideTimer);
      if (bufferingTimer) clearTimeout(bufferingTimer);
      if (slowTimer) clearTimeout(slowTimer);
    };
  });
</script>

<svelte:window on:keydown={onKeydown} />

<div class="player" bind:this={container} on:pointerup={onPointerUp} on:pointermove={() => showControls()} role="application" aria-label="Reproductor de vídeo">
  <video
    bind:this={videoEl}
    playsinline
    preload="metadata"
    referrerpolicy="no-referrer"
    on:loadedmetadata={onLoadedMetadata}
    on:timeupdate={onTimeUpdate}
    on:play={onPlay}
    on:pause={onPause}
    on:waiting={onWaiting}
    on:playing={onPlaying}
    on:progress={onProgress}
    on:error={onError}
    on:ended={onEnded}
    aria-label={title.displayTitle}
  ></video>

  <div class:visible={controlsVisible} class="chrome">
    <header class="top">
      <a href={backHref} aria-label="Volver">←</a>
      <strong>{title.displayTitle}{title.kind === 'series' ? ` · T${season} E${episode}` : ''}</strong>
    </header>

    {#if errorMessage}
      <div class="message error">
        <strong>Vídeo no disponible</strong>
        <p>{errorMessage}</p>
        <div><button on:click={loadSource}>Reintentar</button><a href={backHref}>Volver</a></div>
      </div>
    {:else}
      <div class="center">
        <button aria-label="Retroceder 10 segundos" on:click={() => seekBy(-SEEK_SECONDS)}>−10</button>
        <button class="play" aria-label={playing ? 'Pausar' : 'Reproducir'} on:click={togglePlay}>{playing ? '❚❚' : '▶'}</button>
        <button aria-label="Avanzar 10 segundos" on:click={() => seekBy(SEEK_SECONDS)}>+10</button>
      </div>

      <footer class="bottom">
        <div class="seek-wrap">
          <div class="buffer" style={`width: ${bufferedPercent}%`}></div>
          <div class="progress" style={`width: ${progressPercent}%`}></div>
          <input aria-label="Progreso" type="range" min="0" max={duration || 0} step="0.1" value={currentTime} on:pointerdown={() => seeking = true} on:pointerup={() => { seeking = false; persist(); }} on:input={(event) => videoEl.currentTime = Number((event.currentTarget as HTMLInputElement).value)} />
        </div>
        <div class="row">
          <span>{formatTime(currentTime)} / {formatTime(duration)}</span>
          {#if slow}<span class="slow">Conexión lenta</span>{/if}
          <button aria-label="Pantalla completa" on:click={toggleFullscreen}>⛶</button>
        </div>
      </footer>
    {/if}
  </div>

  {#if loading && !errorMessage}<div class="spinner" role="status">Cargando…</div>{/if}

  {#if countdown > 0}
    <div class="next">
      <strong>Siguiente episodio en {countdown}</strong>
      <button on:click={startNext}>Reproducir ahora</button>
      <button on:click={cancelNext}>Cancelar</button>
    </div>
  {/if}
</div>

<style>
  .player { position: relative; width: 100%; height: 100dvh; background: #000; overflow: hidden; touch-action: manipulation; user-select: none; }
  video { width: 100%; height: 100%; object-fit: contain; background: #000; }
  .chrome { position: absolute; inset: 0; opacity: 0; pointer-events: none; transition: opacity 160ms ease; background: linear-gradient(#000b, transparent 22%, transparent 70%, #000d); }
  .chrome.visible { opacity: 1; pointer-events: auto; }
  .top { position: absolute; inset: 0 0 auto; display: flex; align-items: center; gap: 12px; padding: max(12px, env(safe-area-inset-top)) max(14px, env(safe-area-inset-right)) 18px max(14px, env(safe-area-inset-left)); }
  .top a, button { min-width: 44px; min-height: 44px; }
  .top a { display: grid; place-items: center; text-decoration: none; font-size: 1.5rem; }
  .center { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; gap: 28px; }
  .center button { border: 0; background: #0008; color: #fff; border-radius: 50%; padding: 0 12px; font-weight: 800; }
  .center .play { width: 64px; height: 64px; font-size: 1.25rem; }
  .bottom { position: absolute; inset: auto 0 0; padding: 14px max(14px, env(safe-area-inset-right)) max(14px, env(safe-area-inset-bottom)) max(14px, env(safe-area-inset-left)); }
  .seek-wrap { position: relative; height: 44px; display: flex; align-items: center; }
  .seek-wrap::before, .buffer, .progress { position: absolute; left: 0; height: 4px; border-radius: 4px; }
  .seek-wrap::before { right: 0; content: ""; background: #ffffff40; }
  .buffer { background: #fff8; }
  .progress { background: var(--accent); }
  input[type=range] { position: absolute; inset: 0; width: 100%; height: 44px; opacity: 0; cursor: pointer; touch-action: none; }
  .row { display: flex; align-items: center; justify-content: space-between; gap: 12px; font-size: .85rem; }
  .row button { background: transparent; border: 0; font-size: 1.3rem; }
  .slow { color: var(--accent); }
  .message, .next { position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%); text-align: center; max-width: min(90vw, 520px); padding: 24px; background: #171513ee; border-radius: var(--radius); }
  .message p { margin: 8px 0 16px; }
  .message button, .message a, .next button { border: 0; background: var(--accent); color: #16110b; border-radius: var(--radius); padding: 10px 14px; text-decoration: none; font-weight: 800; margin: 4px; }
  .next { top: auto; bottom: 80px; transform: translateX(-50%); }
  .spinner { position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%); padding: 10px 14px; border-radius: 999px; background: #171513dd; }
  @media (prefers-reduced-motion: reduce) { .chrome { transition: none; } }
</style>
