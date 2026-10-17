(function (root, factory) {
  const commonJS = typeof module === 'object' && module.exports;
  const api = factory(commonJS ? require('../amt/model.js') : root.Timeform.AMTModels,
    commonJS ? require('./settings.js') : root.Timeform.AMT120Settings,
    commonJS ? require('./animation.js') : root.Timeform.AMT120Animation,
    commonJS ? require('./drawing.js') : root.Timeform.AMT120Drawing);
  if (commonJS) module.exports = api;
  else (root.Timeform ||= {}).AMT120 = api;
})(globalThis, function (LegacyModels, Settings, Animation, Drawing) {
  'use strict';
  const base = LegacyModels.find(model => model.id === 'amt120');
  const { digitPose, displayDigits } = base;
  function geometry(width, height, input) {
    const config = Settings.normalize(input), radius = config.radius, step = radius * 2 + config.gap;
    const gridWidth = radius * 2 + 14 * step, gridHeight = radius * 2 + 7 * step;
    // Rectified front plane; official size 212 × 121 cm.
    const boardWidth = step * 1189.30 / 72.86, boardHeight = boardWidth * 121 / 212;
    const originX = (boardWidth - gridWidth) / 2 + radius, originY = (boardHeight - gridHeight) / 2 + radius;
    const padding = Math.min(config.padding, (width - 1) / 2, (height - 1) / 2);
    const availableWidth = Math.max(1, width - padding * 2), availableHeight = Math.max(1, height - padding * 2);
    const factor = Math.min(availableWidth / boardWidth, availableHeight / boardHeight) * config.scale / 100;
    const displayWidth = boardWidth * factor, displayHeight = boardHeight * factor;
    const x = (width - displayWidth) / 2 + (availableWidth - displayWidth) / 2 * config.offsetX / 100;
    const y = (height - displayHeight) / 2 + (availableHeight - displayHeight) / 2 * config.offsetY / 100;
    const points = Array.from({ length: 120 }, (_, i) => ({ x: originX + i % 15 * step, y: originY + Math.floor(i / 15) * step, radius, i: i * 2 }));
    return { x, y, width: displayWidth, height: displayHeight, boardWidth, boardHeight, points, padding, layout: 'landscape' };
  }
  function create(initial, options) { return Animation.create({ Settings, digitPose, displayDigits }, initial, options); }
  return { ...base, Settings, Drawing, create, geometry,
    description: '15 × 8 阵列；先整理成环弧，再由中心向外反向开合，最后沿各针原方向逐针归位。',
    referenceLabel: 'AMT120 Black · 原作参考',
    motionReference: 'https://cdn.shopify.com/videos/c/vp/2a1a2d37452a4306a0f95211d7b3e436/2a1a2d37452a4306a0f95211d7b3e436.HD-1080p-7.2Mbps-32751872.mp4',
    referenceTime: '09:34', referenceDuration: 43.4, choreographed: true,
    previewNote: 'AMT120 第一套：环弧归队与环波开合。黑色款完整原片约 43.36 秒，09:34 → 09:35；弧面几何及其他时间路径为网页重建。' };
});
