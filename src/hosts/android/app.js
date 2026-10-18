(function (root) {
  'use strict';
  const { Session, Renderer, PresentationConfig: Spec, BrowserEnvironment } = root.Timeform;
  const viewport = document.getElementById('viewport');
  let fps = 30;
  const environment = BrowserEnvironment.create();
  // A cancellable per-instance timer caps animations without changing their timeline.
  environment.requestFrame = callback => root.setTimeout(() => callback(performance.now()), 1000 / fps);
  environment.cancelFrame = id => root.clearTimeout(id);
  environment.pixelRatio = () => Math.min(2, root.devicePixelRatio || 1);
  const preview = Session.create({ canvas: document.getElementById('clock'), Renderer,
    config: { edition: 'amt72v-black', borderless: true, source: 'live', autoDemo: false }, environment,
    // Use a stable design viewport so the 100-unit safe areas scale identically
    // in a small app preview and on the full wallpaper surface.
    readViewport() { const displayWidth = Math.max(1, viewport.clientWidth), displayHeight = Math.max(1, viewport.clientHeight);
      return { width: 1080, height: 1080 * displayHeight / displayWidth, displayWidth, displayHeight }; },
    onChange(config) { viewport.style.background = Spec.resolve(config).settings.board; } });
  viewport.style.background = Spec.resolve(preview.getConfig()).settings.board;
  const observer = new ResizeObserver(() => preview.renderer.resize());
  observer.observe(viewport);
  root.TimeformAndroid = {
    update(config) {
      fps = config.fps === 15 ? 15 : 30;
      const before = preview.getConfig();
      const colors = Object.fromEntries(['board', 'long', 'short'].filter(key => /^#[\da-f]{6}$/i.test(config[key])).map(key => [key, config[key]]));
      const next = Spec.normalize({ edition: config.edition, ...colors, customColors: Object.keys(colors).length === 3,
        background: colors.board, borderless: true, scale: 100, padding: 0, offsetX: 0, offsetY: 0,
        source: 'live', paused: false, autoDemo: false });
      preview.updateConfig(next);
      if (before.edition !== next.edition) preview.command('settle');
    },
    suspend(value) { preview.setSuspended('android', Boolean(value)); if (!value) preview.command('settle'); },
    replay() { preview.command('replay'); }
  };
  root.addEventListener('pagehide', () => { observer.disconnect(); preview.dispose(); });
})(globalThis);
