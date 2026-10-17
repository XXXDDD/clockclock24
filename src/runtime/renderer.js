(function (root, factory) {
  const cjs = typeof module === 'object' && module.exports;
  const api = factory(cjs ? { Palette: require('../shared/palette.js'), SingleClock: require('../shared/single-clock.js'),
    Time: require('../shared/time.js'), BrowserEnvironment: require('./browser-environment.js') } : root.Timeform);
  if (cjs) module.exports = api;
  else (root.Timeform ||= {}).Renderer = api;
})(globalThis, function (dependencies) {
  'use strict';
  const { Palette, SingleClock, Time, BrowserEnvironment } = dependencies;
  function create(canvas, config, model, readViewport, environment = BrowserEnvironment.create()) {
    const env = environment;
    const context = canvas.getContext('2d'), surface = env.createSurface(), surfaceContext = surface.getContext('2d');
    const playback = Time.createPlayback(env.readNow), source = Time.createSource(env.readDate);
    playback.setSpeed(config.playbackSpeed);
    const instance = model.create(config, { reducedMotion: env.reducedMotion() });
    let settings = { ...config }, geometry, frame = 0, frames = 0, dirty = true, surfaceDirty = true, disposed = false;
    let demoAt = playback.now();
    function request() { if (!disposed && !env.isHidden() && !frame) frame = env.requestFrame(draw); }
    function refresh() {
      dirty = true;
      if (playback.paused || env.isHidden()) { env.cancelFrame(frame); frame = 0; draw(); }
      else request();
    }
    function resize() {
      if (disposed) return;
      const viewport = readViewport(); geometry = model.geometry(viewport.width, viewport.height, settings);
      const factor = Math.min(viewport.displayWidth / viewport.width, viewport.displayHeight / viewport.height);
      const width = geometry.width * factor, height = geometry.height * factor;
      Object.assign(canvas.style, { width: width + 'px', height: height + 'px', left: geometry.x * factor + 'px', top: geometry.y * factor + 'px' });
      const dpr = Math.min(2.5, env.pixelRatio(), Math.sqrt(8000000 / Math.max(1, width * height)));
      canvas.width = surface.width = Math.max(1, Math.round(width * dpr)); canvas.height = surface.height = Math.max(1, Math.round(height * dpr));
      surfaceContext.setTransform(surface.width / geometry.boardWidth, 0, 0, surface.height / geometry.boardHeight, 0, 0);
      env.cancelFrame(frame); frame = 0;
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
      if (disposed) return;
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
      if (disposed || env.isHidden() || playback.paused) return;
      const now = playback.now();
      const demoPeriod = Math.max(settings.demoInterval, model.choreographed && ['wave', 'spin'].includes(settings.motion) ? settings.duration + 2 : 0) * 1000;
      if (settings.source === 'manual' && settings.autoDemo && now - demoAt >= demoPeriod) {
        const count = Math.floor((now - demoAt) / demoPeriod); demoAt += count * demoPeriod;
        settings.manualTime = Time.textFromMinutes(Time.minutesFromText(settings.manualTime) + count);
        env.onAutoTime(settings.manualTime);
      }
      const changed = settings.source === 'live' && instance.getStage?.(now) && instance.retarget
        ? instance.retarget(source.read(settings), now) : instance.animate(source.read(settings), now);
      if (changed) request();
      if (dirty) request();
    }
    function setPaused(value) {
      if (disposed) return;
      playback.setPaused(value);
      if (playback.paused) { env.cancelFrame(frame); frame = 0; }
      else { tick(); request(); }
      refresh();
    }
    function replay() { if (disposed) return false; const changed = instance.animate(source.read(settings), playback.now(), true); if (changed) refresh(); return changed; }
    function playReference() {
      if (disposed) return false;
      if (!instance.playReference) return false;
      const changed = instance.playReference(source.read(settings), playback.now());
      if (changed) refresh();
      return changed;
    }
    function showCurrentTime() { if (!disposed) { instance.initialize(source.read(settings), playback.now()); refresh(); } }
    function step(milliseconds = 100) { if (!disposed) { playback.step(milliseconds); refresh(); } }
    function restoreVisibility() {
      if (env.isHidden()) { env.cancelFrame(frame); frame = 0; }
      else { if (!playback.paused) tick(); resize(); }
    }
    instance.initialize(source.read(settings), playback.now()); resize();
    const timer = env.setTimer(tick, 100);
    const unsubscribe = env.onVisibilityChange(restoreVisibility);
    return {
      update, resize, replay, playReference, showCurrentTime, step, setPaused,
      getStats() {
        const now = playback.now();
        return { display: instance.state.minuteKey, geometry, frames, timeline: now, paused: playback.paused, animating: instance.isAnimating(now), stage: instance.getStage?.(now) || '', pixelWidth: canvas.width, pixelHeight: canvas.height };
      },
      dispose() { if (!disposed) { disposed = true; env.cancelFrame(frame); env.clearTimer(timer); unsubscribe(); } }
    };
  }
  return { create };
});
