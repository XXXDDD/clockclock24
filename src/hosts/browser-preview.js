(function (root, factory) {
  const cjs = typeof module === 'object' && module.exports;
  const api = factory(cjs ? require('../core/session.js') : root.Timeform.Session,
    cjs ? require('../core/presentation-config.js') : root.Timeform.PresentationConfig,
    cjs ? require('../runtime/renderer.js') : root.Timeform.Renderer,
    cjs ? require('../runtime/browser-environment.js') : root.Timeform.BrowserEnvironment);
  if (cjs) module.exports = api;
  else root.Timeform.Preview = api;
})(globalThis, function (Session, Spec, Renderer, BrowserEnvironment) {
  'use strict';
  // The site owns layout, storage and download UI. Each mounted preview owns a session.
  function mount({ canvas, config, readViewport, onChange, environment }) {
    let session;
    session = Session.create({ canvas, config, readViewport, onChange, Renderer,
      environment: { ...(environment || BrowserEnvironment.create()), onAutoTime(manualTime) {
        session.updateConfig({ manualTime }); environment?.onAutoTime?.(manualTime);
      } } });
    return { ...session, get renderer() { return session.renderer; }, get disposed() { return session.disposed; },
      resize: () => session.renderer.resize(),
      exportConfig: () => Spec.serialize(session.getConfig()),
      importConfig: text => session.updateConfig(Spec.parse(text)) };
  }
  return { mount };
});
