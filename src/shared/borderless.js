(function (root, factory) {
  const api = factory(typeof module === 'object' && module.exports ? {
    Palette: require('./palette.js'), SingleClock: require('./single-clock.js')
  } : root.Timeform);
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.Timeform.Borderless = api;
})(globalThis, function (dependencies) {
  'use strict';
  const { Palette, SingleClock } = dependencies;
  const wrappers = new WeakMap();
  // Fit the dial array uniformly, keeping motor identities and digit layout.
  function geometry(model, width, height, config) {
    const original = model.geometry(1080, 1920, { ...config, scale: 100, padding: 0,
      offsetX: 0, offsetY: 0, safeTop: 0, safeBottom: 0 });
    const points = original.points;
    const left = Math.min(...points.map(p => p.x - p.radius));
    const right = Math.max(...points.map(p => p.x + p.radius));
    const top = Math.min(...points.map(p => p.y - p.radius));
    const bottom = Math.max(...points.map(p => p.y + p.radius));
    const margin = Math.min(width, height) * .035;
    const factor = Math.min((width - margin * 2) / (right - left), (height - margin * 2) / (bottom - top));
    const centerX = (left + right) / 2, centerY = (top + bottom) / 2;
    return { ...original, x: 0, y: 0, width, height, boardWidth: width, boardHeight: height,
      padding: 0, safeTop: 0, safeBottom: 0,
      points: points.map(point => ({ ...point, x: width / 2 + (point.x - centerX) * factor,
        y: height / 2 + (point.y - centerY) * factor, radius: point.radius * factor })) };
  }
  function circularSurface(ctx, g, config, dials) {
    const light = ctx.createLinearGradient(0, 0, g.boardWidth * .65, g.boardHeight);
    light.addColorStop(0, Palette.tint(config.board, .06)); light.addColorStop(.5, config.board);
    light.addColorStop(1, Palette.tint(config.board, -.06));
    ctx.fillStyle = light; ctx.fillRect(0, 0, g.boardWidth, g.boardHeight);
    if (dials) g.points.forEach(point => SingleClock.drawFace(ctx, point, config));
  }
  function wrap(model) {
    if (wrappers.has(model)) return wrappers.get(model);
    const drawing = model.Drawing;
    const wrapped = { ...model, geometry: (w, h, settings) => geometry(model, w, h, settings),
      Drawing: { ...drawing, appearance: { ...drawing?.appearance, boardShape: 'rect' },
        drawSurface: model.type === 'circular'
          ? (ctx, g, config) => circularSurface(ctx, g, config, drawing.appearance?.dials !== false)
          : drawing.drawSurface } };
    wrappers.set(model, wrapped);
    return wrapped;
  }
  return { geometry, wrap };
});
