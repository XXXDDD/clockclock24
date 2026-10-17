(function (root) {
  'use strict';
  const { Preview, WallpaperEngine, PresentationConfig } = root.Timeform;
  const viewport = document.getElementById('viewport');
  function background(config) { viewport.style.background = PresentationConfig.resolve(config).settings.background; }
  const preview = Preview.mount({ canvas: document.getElementById('clock'),
    config: JSON.parse(document.getElementById('timeform-config').textContent),
    readViewport() { const width = Math.max(1, viewport.clientWidth), height = Math.max(1, viewport.clientHeight);
      return { width, height, displayWidth: width, displayHeight: height }; }, onChange: background });
  root.wallpaperPropertyListener = WallpaperEngine.create(preview);
  background(preview.getConfig());
  const observer = new ResizeObserver(() => preview.resize()); observer.observe(viewport);
  window.addEventListener('pagehide', event => { if (!event.persisted) { observer.disconnect(); preview.dispose(); } });
  window.addEventListener('pageshow', event => { if (event.persisted) preview.resize(); });
})(globalThis);
