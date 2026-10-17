(function (root, factory) {
  const commonJS = typeof module === 'object' && module.exports;
  const api = factory(commonJS ? require('../../shared/math.js') : root.Timeform.Math,
    commonJS ? require('./settings.js') : root.Timeform.ClockClock24Settings,
    commonJS ? require('./animation.js') : root.Timeform.ClockClock24Animation,
    commonJS ? require('./drawing.js') : root.Timeform.ClockClock24Drawing);
  if (commonJS) module.exports = api;
  else (root.Timeform ||= {}).ClockClock24 = api;
})(globalThis, function (Maths, Settings, Animation, Drawing) {
  'use strict';
  const { normalizeMinutes } = Maths;
  const DIR = { E: 0, S: Math.PI / 2, W: Math.PI, N: -Math.PI / 2, P: Math.PI * .75 };
  // Original 2 × 3 glyphs and 8 × 3 array; these belong to this model only.
  const GLYPHS = {
    '0': ['SE', 'SW', 'NS', 'NS', 'NE', 'NW'], '1': ['PP', 'SS', 'PP', 'NS', 'PP', 'NN'],
    '2': ['EE', 'SW', 'SE', 'NW', 'NE', 'WW'], '3': ['EE', 'SW', 'EE', 'NW', 'EE', 'NW'],
    '4': ['SS', 'SS', 'NE', 'NS', 'PP', 'NN'], '5': ['SE', 'WW', 'NE', 'SW', 'EE', 'NW'],
    '6': ['SE', 'WW', 'NS', 'SW', 'NE', 'NW'], '7': ['EE', 'SW', 'PP', 'NS', 'PP', 'NN'],
    '8': ['SE', 'SW', 'NE', 'NW', 'NE', 'NW'], '9': ['SE', 'SW', 'EN', 'NS', 'EE', 'NW']
  };
  function displayDigits(minutes, format24 = true) {
    const value = normalizeMinutes(minutes), hour = Math.floor(value / 60);
    return String(format24 ? hour : hour % 12 || 12).padStart(2, '0') + String(value % 60).padStart(2, '0');
  }
  function digitPose(digits) {
    const result = new Array(48);
    for (let digit = 0; digit < 4; digit++) for (let cell = 0; cell < 6; cell++) {
      const index = (Math.floor(cell / 2) * 8 + digit * 2 + cell % 2) * 2;
      const [a, b] = GLYPHS[digits[digit]][cell];
      result[index] = { angle: DIR[a], used: a !== 'P' };
      result[index + 1] = { angle: DIR[b], used: b !== 'P' && b !== a };
    }
    return result;
  }
  function geometry(width, height, input) {
    const config = Settings.normalize(input), radius = config.radius, step = radius * 2 + config.gap;
    // Measured after board-plane rectification; see geometry-reference.md.
    const boardWidth = step * 1010.36 / 112.16;
    const boardHeight = boardWidth * 4 / 9;
    const padding = Math.min(config.padding, (width - 1) / 2, (height - 1) / 2);
    const availableWidth = Math.max(1, width - padding * 2), availableHeight = Math.max(1, height - padding * 2);
    const factor = Math.min(availableWidth / boardWidth, availableHeight / boardHeight) * config.scale / 100;
    const displayWidth = boardWidth * factor, displayHeight = boardHeight * factor;
    const x = (width - displayWidth) / 2 + (availableWidth - displayWidth) / 2 * config.offsetX / 100;
    const y = (height - displayHeight) / 2 + (availableHeight - displayHeight) / 2 * config.offsetY / 100;
    const points = [];
    for (let row = 0; row < 3; row++) for (let col = 0; col < 8; col++) {
      points.push({ x: (boardWidth - step * 7) / 2 + col * step, y: (boardHeight - step * 2) / 2 + row * step, radius, i: (row * 8 + col) * 2 });
    }
    return { x, y, width: displayWidth, height: displayHeight, boardWidth, boardHeight, points, padding, layout: 'landscape' };
  }
  function create(initial, options) {
    return Animation.create({ Settings, digitPose, displayDigits, motionProfile: options?.motionProfile }, initial, options);
  }
  return { id: 'clockclock24', type: 'landscape', name: 'ClockClock 24', badge: 'CC24', columns: 8, rows: 3, count: 24,
    description: '8 × 3 黑色阵列；先整理为平行斜线，再由右向左列波流动，最后逐针成型。',
    reference: 'https://www.humanssince1982.com/en-int/products/clockclock-24-black', referenceLabel: 'CC24 Black · 原作参考',
    motionReference: 'https://cdn.shopify.com/videos/c/vp/26052ba4fa56402987fa920391ed224c/26052ba4fa56402987fa920391ed224c.HD-1080p-7.2Mbps-30411181.mp4',
    referenceTime: '09:34', referenceDuration: 40.1, choreographed: true,
    previewNote: '已重制第一套：CC24 斜线列波。原片约 40 秒，09:34 → 09:35；其他时间的轨迹为网页重建。',
    Settings, Drawing, create, geometry, displayDigits, digitPose };
});
