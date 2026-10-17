(function (root, factory) {
  const api = factory(typeof module === 'object' && module.exports ? require('./classic-config.js') : root.Timeform.ClassicLivelyConfig);
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.Timeform.ClassicLivelyController = api;
})(globalThis, function (Spec) {
  'use strict';
  function create({ canvas, config: initial, Renderer, readViewport, onChange = () => {} }) {
    let config = Spec.normalize(initial), hostPaused = false, disposed = false;
    const start = () => { const { model, settings } = Spec.resolve(config); return Renderer.create(canvas, settings, model, readViewport); };
    let renderer = start(); renderer.setPaused(config.paused);
    function updateConfig(patch) {
      if (disposed) return { ...config };
      const previous = config; config = Spec.normalize(patch, config);
      if (previous.edition !== config.edition) { renderer.dispose(); renderer = start(); }
      else renderer.update(Spec.resolve(config).settings);
      renderer.setPaused(hostPaused || config.paused);
      onChange({ ...config }); return { ...config };
    }
    function property(name, value) {
      if (disposed) return false;
      if (name === 'replay') { renderer.replay(); return true; }
      if (name === 'settle') { renderer.showCurrentTime(); return true; }
      const decoded = Spec.decodeProperty(name, value);
      if (decoded === undefined) return false;
      updateConfig({ [name]: decoded }); return true;
    }
    function playback(data) {
      try {
        const value = typeof data === 'string' ? JSON.parse(data) : data;
        if (disposed || !value || typeof value.IsPaused !== 'boolean') return false;
        hostPaused = value.IsPaused; renderer.setPaused(hostPaused || config.paused); return true;
      } catch (_) { return false; }
    }
    return { updateConfig, property, playback, getConfig: () => ({ ...config }), get renderer() { return renderer; },
      dispose() { if (!disposed) { disposed = true; renderer.dispose(); } } };
  }
  return { create };
});
