(function (root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) module.exports = api;
  else (root.Timeform ||= {}).BrowserEnvironment = api;
})(globalThis, function (root) {
  'use strict';
  // Only this boundary accesses browser services. Tests can supply another environment.
  function create({ onAutoTime = () => {} } = {}) {
    return {
      createSurface: () => root.document.createElement('canvas'),
      reducedMotion: () => root.window.matchMedia('(prefers-reduced-motion: reduce)').matches,
      pixelRatio: () => root.window.devicePixelRatio || 1,
      isHidden: () => root.document.hidden,
      requestFrame: callback => root.requestAnimationFrame(callback),
      cancelFrame: id => root.cancelAnimationFrame(id),
      setTimer: (callback, interval) => root.setInterval(callback, interval),
      clearTimer: id => root.clearInterval(id),
      onVisibilityChange(callback) {
        root.document.addEventListener('visibilitychange', callback);
        return () => root.document.removeEventListener('visibilitychange', callback);
      },
      onAutoTime
    };
  }
  return { create };
});
