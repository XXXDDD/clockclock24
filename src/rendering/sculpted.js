(function (root, factory) {
  const cjs = typeof module === 'object' && module.exports;
  const api = factory(cjs ? require('./surfaces.js') : root.Timeform.AppearanceSurfaces,
    cjs ? require('./hands.js') : root.Timeform.AppearanceHands);
  if (cjs) module.exports = api;
  else (root.Timeform ||= {}).SculptedDrawing = api;
})(globalThis, function (Surfaces, Hands) {
  'use strict';
  // The mode composes independent surface and hand renderers. Neither layer
  // owns animation state; hand materials never inspect the board's color.
  return { drawSurface: Surfaces.drawSurface, drawHands: Hands.drawHands };
});
