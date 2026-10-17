(function (root, factory) {
  const commonJS = typeof module === 'object' && module.exports;
  const api = factory(commonJS ? require('../amt/model.js') : root.Timeform.AMTModels,
    commonJS ? require('./settings.js') : root.Timeform.AMT144Settings,
    commonJS ? require('./animation.js') : root.Timeform.AMT144Animation,
    commonJS ? require('./drawing.js') : root.Timeform.AMT144Drawing);
  if (commonJS) module.exports = api;
  else (root.Timeform ||= {}).AMT144 = api;
})(globalThis, function (LegacyModels, Settings, Animation, Drawing) {
  'use strict';
  const base = LegacyModels.find(model => model.id === 'amt144');
  const { digitPose, displayDigits } = base;
  function geometry(width, height, input) {
    const config = Settings.normalize(input), radius = config.radius, step = radius * 2 + config.gap;
    const gridWidth = radius * 2 + 17 * step, gridHeight = radius * 2 + 7 * step;
    const aspect = 262.4 / 130.4;
    // Axis pitch measured in the rectified front-board plane.
    const boardWidth = step * 1320.30 / 66.42, boardHeight = boardWidth / aspect;
    const originX = (boardWidth - gridWidth) / 2 + radius, originY = (boardHeight - gridHeight) / 2 + radius;
    const padding = Math.min(config.padding, (width - 1) / 2, (height - 1) / 2);
    const availableWidth = Math.max(1, width - padding * 2), availableHeight = Math.max(1, height - padding * 2);
    const factor = Math.min(availableWidth / boardWidth, availableHeight / boardHeight) * config.scale / 100;
    const displayWidth = boardWidth * factor, displayHeight = boardHeight * factor;
    const x = (width - displayWidth) / 2 + (availableWidth - displayWidth) / 2 * config.offsetX / 100;
    const y = (height - displayHeight) / 2 + (availableHeight - displayHeight) / 2 * config.offsetY / 100;
    const points = Array.from({ length: 144 }, (_, i) => ({ x: originX + i % 18 * step, y: originY + Math.floor(i / 18) * step, radius, i: i * 2 }));
    return { x, y, width: displayWidth, height: displayHeight, boardWidth, boardHeight, points, padding, layout: 'landscape' };
  }
  function create(initial, options) { return Animation.create({ Settings, digitPose, displayDigits }, initial, options); }
  return { ...base, Settings, Drawing, create, geometry,
    description: '18 × 8 阵列，双方形冒号；逐列整理斜直线，顺时针列波向右传播，最后双速归位。',
    referenceLabel: 'AMT144 Black · 原作参考',
    motionReference: 'https://cdn.shopify.com/videos/c/vp/ab5cc7720a4c4034823baf8359c2b619/ab5cc7720a4c4034823baf8359c2b619.HD-1080p-7.2Mbps-30993239.mp4',
    referenceTime: '09:34', referenceDuration: 54.4, choreographed: true,
    previewNote: 'AMT144 第一套：斜线列波与双速归位。黑色款完整原片约 54.36 秒，09:34 → 09:35；速度曲线、针序及其他时间路径为网页重建。' };
});
