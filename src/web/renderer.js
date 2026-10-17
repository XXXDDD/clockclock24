(function (root) {
  'use strict';
  const { Palette, SingleClock, Time } = root.Timeform;
  function create(canvas, config, model, readViewport) {
    const context = canvas.getContext('2d'), surface = document.createElement('canvas'), surfaceContext = surface.getContext('2d');
    const playback = Time.createPlayback(), source = Time.createSource();
    playback.setSpeed(config.playbackSpeed);
    const instance = model.create(config, { reducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches });
    let settings = { ...config }, geometry, frame = 0, frames = 0, dirty = true, surfaceDirty = true, disposed = false;
    let demoAt = playback.now();
    function request() { if (!disposed && !document.hidden && !frame) frame = requestAnimationFrame(draw); }
    function refresh() {
      dirty = true;
      if (playback.paused || document.hidden) { cancelAnimationFrame(frame); frame = 0; draw(); }
      else request();
    }
    function resize() {
      const viewport = readViewport(); geometry = model.geometry(viewport.width, viewport.height, settings);
      const factor = Math.min(viewport.displayWidth / viewport.width, viewport.displayHeight / viewport.height);
      const width = geometry.width * factor, height = geometry.height * factor;
      Object.assign(canvas.style, { width: width + 'px', height: height + 'px', left: geometry.x * factor + 'px', top: geometry.y * factor + 'px' });
      const dpr = Math.min(2.5, window.devicePixelRatio || 1, Math.sqrt(8000000 / Math.max(1, width * height)));
      canvas.width = surface.width = Math.max(1, Math.round(width * dpr)); canvas.height = surface.height = Math.max(1, Math.round(height * dpr));
      surfaceContext.setTransform(surface.width / geometry.boardWidth, 0, 0, surface.height / geometry.boardHeight, 0, 0);
      cancelAnimationFrame(frame); frame = 0;
      dirty = surfaceDirty = true; draw();
    }
    function paintSurface() {
      surfaceContext.clearRect(0, 0, geometry.boardWidth, geometry.boardHeight);
      if (model.Drawing?.drawSurface) model.Drawing.drawSurface(surfaceContext, geometry, settings);
      else {
        Palette.drawBoard(surfaceContext, geometry.boardWidth, geometry.boardHeight, settings);
        geometry.points.forEach(point => SingleClock.drawFace(surfaceContext, point, settings));
      }
      surfaceDirty = false;
    }
    function draw() {
      frame = 0; if (disposed) return;
      const now = playback.now();
      instance.sample(now); if (surfaceDirty) paintSurface();
      context.setTransform(canvas.width / geometry.boardWidth, 0, 0, canvas.height / geometry.boardHeight, 0, 0);
      context.clearRect(0, 0, geometry.boardWidth, geometry.boardHeight);
      context.drawImage(surface, 0, 0, geometry.boardWidth, geometry.boardHeight);
      if (model.Drawing?.drawHands) model.Drawing.drawHands(context, geometry, instance, settings);
      else geometry.points.forEach(point => SingleClock.drawHands(context, point, [instance.hands[point.i], instance.hands[point.i + 1]], settings));
      const digits = instance.state.minuteKey;
      canvas.setAttribute('aria-label', model.name + '，现在显示 ' + digits.slice(0, 2) + ':' + digits.slice(2));
      frames++; dirty = false;
      if (!playback.paused && instance.isAnimating(now)) request();
    }
    function update(next) {
      const previous = settings; settings = model.Settings.normalize(next, settings);
      playback.setSpeed(settings.playbackSpeed);
      const now = playback.now(), result = instance.update(settings, now);
      if (previous.board !== settings.board || previous.radius !== settings.radius || previous.gap !== settings.gap) surfaceDirty = true;
      if (result.reformat) instance.initialize(source.read(settings), now);
      else if (previous.choreography !== settings.choreography || model.classic && ['motion', 'duration'].some(key => previous[key] !== settings[key])) instance.animate(source.read(settings),now,true);
      else if (['source', 'manualTime', 'timezone'].some(key => previous[key] !== settings[key])) instance.animate(source.read(settings), now);
      if (['radius', 'gap', 'scale', 'padding', 'offsetX', 'offsetY', 'canvasWidth', 'canvasHeight', 'safeTop', 'safeBottom'].some(key => previous[key] !== settings[key])) resize();
      if (previous.autoDemo !== settings.autoDemo || previous.source !== settings.source || previous.demoInterval !== settings.demoInterval) demoAt = now;
      refresh();
    }
    function tick() {
      if (document.hidden || playback.paused) return;
      const now = playback.now();
      const demoPeriod = Math.max(settings.demoInterval, model.choreographed && ['wave', 'spin'].includes(settings.motion) ? settings.duration + 2 : 0) * 1000;
      if (settings.source === 'manual' && settings.autoDemo && now - demoAt >= demoPeriod) {
        const count = Math.floor((now - demoAt) / demoPeriod); demoAt += count * demoPeriod;
        settings.manualTime = Time.textFromMinutes(Time.minutesFromText(settings.manualTime) + count);
        document.dispatchEvent(new CustomEvent('timeform-auto-time', { detail: settings.manualTime }));
      }
      const changed = settings.source === 'live' && instance.getStage?.(now) && instance.retarget
        ? instance.retarget(source.read(settings), now) : instance.animate(source.read(settings), now);
      if (changed) request();
      if (dirty) request();
    }
    function setPaused(value) {
      playback.setPaused(value);
      if (playback.paused) { cancelAnimationFrame(frame); frame = 0; }
      else { tick(); request(); }
      refresh();
    }
    function replay() { const changed = instance.animate(source.read(settings), playback.now(), true); if (changed) refresh(); return changed; }
    function playReference() {
      if (!instance.playReference) return false;
      const changed = instance.playReference(source.read(settings), playback.now());
      if (changed) refresh();
      return changed;
    }
    function showCurrentTime() { instance.initialize(source.read(settings), playback.now()); refresh(); }
    function step(milliseconds = 100) { playback.step(milliseconds); refresh(); }
    function restoreVisibility() {
      if (document.hidden) { cancelAnimationFrame(frame); frame = 0; }
      else { if (!playback.paused) tick(); resize(); }
    }
    instance.initialize(source.read(settings), playback.now()); resize();
    const timer = setInterval(tick, 100);
    document.addEventListener('visibilitychange', restoreVisibility);
    return {
      update, resize, replay, playReference, showCurrentTime, step, setPaused,
      getStats() {
        const now = playback.now();
        return { display: instance.state.minuteKey, geometry, frames, timeline: now, paused: playback.paused, animating: instance.isAnimating(now), stage: instance.getStage?.(now) || '', pixelWidth: canvas.width, pixelHeight: canvas.height };
      },
      dispose() { disposed = true; cancelAnimationFrame(frame); clearInterval(timer); document.removeEventListener('visibilitychange', restoreVisibility); }
    };
  }
  root.Timeform.Renderer = { create };
})(globalThis);
