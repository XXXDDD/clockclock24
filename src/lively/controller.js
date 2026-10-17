(function (root, factory) {
  const api = factory(typeof module === 'object' && module.exports ? require('./config.js') : root.Timeform.LivelyConfig);
  if (typeof module === 'object' && module.exports) module.exports = api;
  else (root.Timeform ||= {}).LivelyController = api;
})(globalThis, function (Spec) {
  'use strict';
  function create({ canvas, config: initial, Renderer, readViewport, environment, onChange = () => {} }) {
    let config = Spec.normalize(initial), hostPaused = false, disposed = false;
    const start = () => Renderer.create(canvas, Spec.rendererConfig(config), Spec.rendererModel(config.model), readViewport, environment);
    let renderer = start(); renderer.setPaused(config.paused);
    function updateConfig(patch) {
      if (disposed) return { ...config };
      const previous = config; config = Spec.normalize(patch, config);
      if (previous.model !== config.model) { renderer.dispose(); renderer = start(); }
      else renderer.update(Spec.rendererConfig(config));
      renderer.setPaused(hostPaused || config.paused);
      onChange({ ...config }); return { ...config };
    }
    function property(name, value) {
      const decoded = Spec.decodeProperty(name, value);
      if (decoded === undefined) return false;
      updateConfig({ [name]: decoded }); return true;
    }
    function playback(data) {
      try {
        const value = typeof data === 'string' ? JSON.parse(data) : data;
        if (!value || typeof value.IsPaused !== 'boolean' || disposed) return false;
        hostPaused = value.IsPaused; renderer.setPaused(hostPaused || config.paused); onChange({ ...config }); return true;
      } catch (_) { return false; }
    }
    return { updateConfig, property, playback, getConfig: () => ({ ...config }), get renderer() { return renderer; },
      dispose() { if (!disposed) { disposed = true; renderer.dispose(); } } };
  }
  return { create };
});
