(function (root, factory) {
  const commonJS = typeof module === 'object' && module.exports;
  const api = factory(commonJS ? require('../amt/model.js') : root.Timeform.AMTModels,
    commonJS ? require('./settings.js') : root.Timeform.AMT288Settings,
    commonJS ? require('./animation.js') : root.Timeform.AMT288Animation,
    commonJS ? require('./drawing.js') : root.Timeform.AMT288Drawing);
  if (commonJS) module.exports = api;
  else (root.Timeform ||= {}).AMT288 = api;
})(globalThis, function (LegacyModels, Settings, Animation, Drawing) {
  'use strict';
  const base = LegacyModels.find(model => model.id === 'amt288');
  const { displayDigits } = base;
  function digitPose(digits) {
    const pose = base.digitPose(digits);
    // Trial reconstruction: put every narrow 1 on the nearest central pair of
    // axes. A two-column glyph in a five-column slot has a half-pitch tie;
    // use the pair to the right of the exact centre consistently.
    const right = base.digitWidth - 2, centered = Math.round(right / 2), shift = (right - centered) * 2;
    for (let digit = 0; digit < 4; digit++) {
      if (digits[digit] !== '1') continue;
      for (let row = 0; row < base.digitHeight; row++) {
        const start = ((row + base.digitRow) * base.columns + base.digitColumns[digit]) * 2;
        const glyph = pose.slice(start, start + base.digitWidth * 2);
        for (let i = 0; i < glyph.length; i++) pose[start + i] = { ...glyph[(i + shift) % glyph.length] };
      }
    }
    return pose;
  }
  function geometry(width, height, input) {
    const config = Settings.normalize(input), radius = config.radius, step = radius * 2 + config.gap;
    const gridWidth = radius * 2 + 23 * step, gridHeight = radius * 2 + 11 * step;
    // White reference measured after front-board projective rectification.
    const boardWidth = step * 1046.50 / 39.93, boardHeight = boardWidth * 187.2 / 345.6;
    const originX = (boardWidth - gridWidth) / 2 + radius, originY = (boardHeight - gridHeight) / 2 + radius;
    const padding = Math.min(config.padding, (width - 1) / 2, (height - 1) / 2);
    const availableWidth = Math.max(1, width - padding * 2), availableHeight = Math.max(1, height - padding * 2);
    const factor = Math.min(availableWidth / boardWidth, availableHeight / boardHeight) * config.scale / 100;
    const displayWidth = boardWidth * factor, displayHeight = boardHeight * factor;
    const x = (width - displayWidth) / 2 + (availableWidth - displayWidth) / 2 * config.offsetX / 100;
    const y = (height - displayHeight) / 2 + (availableHeight - displayHeight) / 2 * config.offsetY / 100;
    const points = Array.from({ length: 288 }, (_, i) => ({ x: originX + i % 24 * step, y: originY + Math.floor(i / 24) * step, radius, i: i * 2 }));
    return { x, y, width: displayWidth, height: displayHeight, boardWidth, boardHeight, points, padding, layout: 'landscape' };
  }
  function create(initial, options) { return Animation.create({ Settings, digitPose, displayDigits }, initial, options); }
  return { ...base, Settings, Drawing, digitPose, create, geometry,
    description: '24 × 12 白色阵列，宽幅轮廓字形与双方形冒号；由中心向外整理环弧、反向开合，最后逐针归位。',
    reference: 'https://www.humanssince1982.com/en-int/products/a-million-times-288-white',
    referenceLabel: 'AMT288 White · 原作参考',
    motionReference: 'https://www.humanssince1982.com/cdn/shop/videos/c/vp/34b1aeeb08e84e0cb47a29fcb7900421/34b1aeeb08e84e0cb47a29fcb7900421.HD-1080p-7.2Mbps-30994155.mp4?v=0',
    referenceTime: '09:34', referenceDuration: 54.2, choreographed: true,
    previewNote: 'AMT288 White 第一套：环弧归队与环波开合。白色款完整原片约 54.24 秒，09:34 → 09:35；连续曲线、针序及其他时间路径为网页重建。' };
});
