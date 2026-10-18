(function (root, factory) {
  const cjs = typeof module === 'object' && module.exports;
  const api = factory(cjs ? require('./presentation-config.js') : root.Timeform.PresentationConfig);
  if (cjs) module.exports = api;
  else (root.Timeform ||= {}).Session = api;
})(globalThis, function (Presentation) {
  'use strict';
  function create({ canvas, config: initial, Renderer, readViewport, environment,
    Spec = Presentation, onChange = () => {} }) {
    let config = Spec.normalize(initial), disposed = false, renderer, renderedModel;
    const suspensions = new Set();
    function sync() {
      const { model, settings } = Spec.resolve(config);
      if (model !== renderedModel) {
        renderer?.dispose();
        renderer = Renderer.create(canvas, settings, model, readViewport, environment);
        renderedModel = model;
      } else renderer.update(settings);
      renderer.setPaused(Boolean(config.paused) || suspensions.size > 0);
    }
    function updateConfig(patch) {
      if (!disposed) { config = Spec.normalize(patch, config); sync(); onChange({ ...config }); }
      return { ...config };
    }
    function setSuspended(reason, value) {
      if (disposed || typeof value !== 'boolean') return false;
      if (value) suspensions.add(reason); else suspensions.delete(reason);
      renderer.setPaused(Boolean(config.paused) || suspensions.size > 0);
      return true;
    }
    function command(name, value) {
      if (disposed) return false;
      if (name === 'replay') return renderer.replay() !== false;
      if (name === 'settle') { renderer.showCurrentTime(); return true; }
      if (name === 'reference') return renderer.playReference() !== false;
      if (name === 'step' && Number.isFinite(value) && value >= 0) { renderer.step(value); return true; }
      return false;
    }
    sync();
    return { updateConfig, setSuspended, command, getConfig: () => ({ ...config }),
      get renderer() { return renderer; }, get disposed() { return disposed; },
      dispose() { if (!disposed) { disposed = true; renderer.dispose(); suspensions.clear(); } } };
  }
  return { create };
});
