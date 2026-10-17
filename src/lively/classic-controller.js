(function (root, factory) {
  const cjs = typeof module === 'object' && module.exports;
  const api = factory(cjs ? require('./classic-config.js') : root.Timeform.ClassicLivelyConfig,
    cjs ? require('../core/session.js') : root.Timeform.Session);
  if (cjs) module.exports = api;
  else root.Timeform.ClassicLivelyController = api;
})(globalThis, function (Spec, Session) {
  'use strict';
  function create(options) {
    const session = Session.create({ ...options, Spec });
    function property(name, value) {
      if (session.disposed) return false;
      if (['replay', 'settle'].includes(name)) return session.command(name);
      const decoded = Spec.decodeProperty(name, value);
      if (decoded === undefined) return false;
      session.updateConfig({ [name]: decoded }); return true;
    }
    function playback(data) {
      try {
        const value = typeof data === 'string' ? JSON.parse(data) : data;
        return typeof value?.IsPaused === 'boolean' && session.setSuspended('lively', value.IsPaused);
      } catch (_) { return false; }
    }
    return { ...session, property, playback, get renderer() { return session.renderer; }, get disposed() { return session.disposed; } };
  }
  return { create };
});
