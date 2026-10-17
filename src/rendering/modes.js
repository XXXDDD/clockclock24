(function (root, factory) {
  const cjs = typeof module === 'object' && module.exports;
  const api = factory(cjs ? require('./sculpted.js') : root.Timeform.SculptedDrawing,
    cjs ? require('./surfaces.js') : root.Timeform.AppearanceSurfaces,
    cjs ? require('./hands.js') : root.Timeform.AppearanceHands);
  if (cjs) module.exports = api;
  else (root.Timeform ||= {}).RenderModes = api;
})(globalThis, function (Sculpted, Surfaces, Hands) {
  'use strict';
  // Appearance adapters consume the model's geometry and sampled hands. They
  // never own time, choreography, physical hand identities or configuration IO.
  const modes = [
    { id: 'original', label: '原有效果', drawing: null },
    { id: 'sculpted', label: '立体光影', drawing: Sculpted }
  ];
  const fields = {
    appearance: { type: 'select', label: '盘面光影', value: 'auto', group: 'appearance',
      options: [['auto', '按材质（默认）'], ...modes.map(mode => [mode.id, mode.label])],
      help: '默认黑白使用原版盘面，彩色使用立体光影；也可手动选择。' },
    handAppearance: { type: 'select', label: '指针效果', value: 'auto', group: 'appearance',
      options: [['auto', '按指针材质（默认）'], ['original', '原有指针'], ['sculpted', '材质与反光'], ['follow', '随光影模式']],
      help: '默认金属针使用反光效果，普通针沿用原版；同一光源下，高光随位置和朝向变化。' }
  };
  function resolve(model, config) {
    const profile = model.Drawing?.appearance || {};
    const surfaceMode = config.appearance === 'auto' ? Surfaces.usesOriginalSurface(config, profile) ? 'original' : 'sculpted' : config.appearance;
    const surface = modes.find(mode => mode.id === surfaceMode)?.drawing;
    const material = [false, true].map(secondary => Hands.isMetal(Hands.finishFor(profile, secondary)));
    const handMode = config.handAppearance === 'auto' ? material.every(Boolean) ? 'sculpted' : material.some(Boolean) ? 'mixed' : 'original'
      : !config.handAppearance || config.handAppearance === 'follow' ? surfaceMode : config.handAppearance;
    const hands = modes.find(mode => mode.id === handMode)?.drawing;
    if (!surface && !hands && handMode !== 'mixed') return model.Drawing;
    return {
      drawSurface: surface ? (ctx, geometry, settings) => surface.drawSurface(ctx, geometry, settings, model) : model.Drawing?.drawSurface,
      drawHands: handMode === 'mixed' ? (ctx, geometry, instance, settings) => Hands.drawByMaterial(ctx, geometry, instance, settings, model)
        : hands ? (ctx, geometry, instance, settings) => hands.drawHands(ctx, geometry, instance, settings, model) : model.Drawing?.drawHands
    };
  }
  return { modes, fields, resolve };
});
