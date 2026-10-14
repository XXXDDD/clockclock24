(function (root, factory) {
  const commonJS = typeof module === 'object' && module.exports;
  const api = factory(commonJS ? require('../../shared/math.js') : root.Timeform.Math,
    commonJS ? require('./settings.js') : root.Timeform.AMTSettings,
    commonJS ? require('../../shared/hand-animation.js') : root.Timeform.HandAnimation);
  if (commonJS) module.exports = api;
  else (root.Timeform ||= {}).AMTModels = api;
})(globalThis, function (Maths, Settings, HandAnimation) {
  'use strict';
  const IDLE = Math.PI * .75;
  const DIR = { E: 0, S: Math.PI / 2, W: Math.PI, N: -Math.PI / 2, P: IDLE };
  function displayDigits(minutes, format24 = true) {
    const value = Maths.normalizeMinutes(minutes), hour = Math.floor(value / 60);
    return String(format24 ? hour : hour % 12 || 12).padStart(2, '0') + String(value % 60).padStart(2, '0');
  }
  // Trace orthogonal paths through clock centres. A centre can carry at most two directions.
  function trace(pose, columns, path, originX, originY) {
    const directions = new Map();
    function add(x, y, dx, dy) {
      const index = ((y + originY) * columns + x + originX) * 2;
      if (!directions.has(index)) directions.set(index, new Set());
      directions.get(index).add(Math.atan2(dy, dx));
    }
    for (let i = 1; i < path.length; i++) {
      let [x, y] = path[i - 1];
      const [endX, endY] = path[i], dx = Math.sign(endX - x), dy = Math.sign(endY - y);
      while (x !== endX || y !== endY) {
        add(x, y, dx, dy); x += dx; y += dy; add(x, y, -dx, -dy);
      }
    }
    for (const [index, set] of directions) {
      const angles = [...set];
      if (angles.length > 2) throw new Error('数字字形超出两根指针。');
      pose[index] = { angle: angles[0], used: true };
      pose[index + 1] = { angle: angles[1] ?? angles[0], used: angles.length === 2 };
    }
  }
  // Outlines of the broad digital strokes, including the inner counters.
  // A 3-clock-wide counter collapses into a vertical stroke; at width 5 it is a box.
  function glyphPaths(digit, width) {
    const right = width - 1, inner = right - 1;
    const box = (left, top, endX, endY) => [[left, top], [endX, top], [endX, endY], [left, endY], [left, top]];
    return {
      '0': [box(0, 0, right, 5), box(1, 1, inner, 4)],
      '1': [box(inner, 0, right, 5)],
      '2': [[[0, 0], [right, 0], [right, 3], [1, 3], [1, 4], [right, 4], [right, 5], [0, 5], [0, 2], [inner, 2], [inner, 1], [0, 1], [0, 0]]],
      '3': [[[0, 0], [right, 0], [right, 5], [0, 5], [0, 4], [inner, 4], [inner, 3], [0, 3], [0, 2], [inner, 2], [inner, 1], [0, 1], [0, 0]]],
      '4': [[[0, 0], [1, 0], [1, 2], [inner, 2], [inner, 0], [right, 0], [right, 5], [inner, 5], [inner, 3], [0, 3], [0, 0]]],
      '5': [[[0, 0], [right, 0], [right, 1], [1, 1], [1, 2], [right, 2], [right, 5], [0, 5], [0, 4], [inner, 4], [inner, 3], [0, 3], [0, 0]]],
      '6': [[[0, 0], [right, 0], [right, 1], [1, 1], [1, 2], [right, 2], [right, 5], [0, 5], [0, 0]], box(1, 3, inner, 4)],
      '7': [[[0, 0], [right, 0], [right, 5], [inner, 5], [inner, 1], [0, 1], [0, 0]]],
      '8': [box(0, 0, right, 5), box(1, 1, inner, 2), box(1, 3, inner, 4)],
      '9': [[[0, 0], [right, 0], [right, 5], [0, 5], [0, 4], [inner, 4], [inner, 3], [0, 3], [0, 0]], box(1, 1, inner, 2)]
    }[digit];
  }
  function glyphPose(digit, width) {
    if (digit === '4' && width === 3) {
      // The narrow four has a shared top join: match the two-hand poses in the AMT72 photo.
      return ['SE', 'SW', 'SW', 'NS', 'NS', 'NS', 'NS', 'NE', 'NS', 'NE', 'SW', 'NS', 'PP', 'NS', 'NS', 'PP', 'NE', 'NW'].flatMap(([a, b]) => [
        { angle: DIR[a], used: a !== 'P' }, { angle: DIR[b], used: b !== 'P' && b !== a }
      ]);
    }
    const pose = Array.from({ length: width * 6 * 2 }, () => ({ angle: IDLE, used: false }));
    for (const path of glyphPaths(digit, width)) trace(pose, width, path, 0, 0);
    return pose;
  }
  function define({ count, columns, rows, digitWidth, digitColumns, colon = [], frameAspect, reference, description }) {
    const id = 'amt' + count, name = 'A million Times ' + count;
    const glyphs = Object.fromEntries(Array.from({ length: 10 }, (_, digit) => [digit, glyphPose(String(digit), digitWidth)]));
    const digitHeight = 6, digitRow = (rows - digitHeight) / 2;
    function digitPose(digits) {
      const pose = Array.from({ length: count * 2 }, () => ({ angle: IDLE, used: false }));
      for (let digit = 0; digit < 4; digit++) {
        const glyph = glyphs[digits[digit]];
        for (let row = 0; row < digitHeight; row++) for (let col = 0; col < digitWidth; col++) {
          const target = ((row + digitRow) * columns + digitColumns[digit] + col) * 2, source = (row * digitWidth + col) * 2;
          pose[target] = { ...glyph[source] }; pose[target + 1] = { ...glyph[source + 1] };
        }
      }
      for (const [x, y] of colon) trace(pose, columns, [[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]], x, y);
      return pose;
    }
    function geometry(width, height, input) {
      const config = Settings.normalize(input), radius = config.radius, step = radius * 2 + config.gap;
      const gridWidth = radius * 2 + (columns - 1) * step, gridHeight = radius * 2 + (rows - 1) * step;
      const edge = radius * 1.15;
      let boardWidth = gridWidth + edge * 2, boardHeight = gridHeight + edge * 2;
      // Preserve the reference panel proportions without stretching the circular faces.
      if (boardWidth / boardHeight > frameAspect) boardHeight = boardWidth / frameAspect;
      else boardWidth = boardHeight * frameAspect;
      const originX = (boardWidth - gridWidth) / 2 + radius, originY = (boardHeight - gridHeight) / 2 + radius;
      const padding = Math.min(config.padding, (width - 1) / 2, (height - 1) / 2);
      const availableWidth = Math.max(1, width - padding * 2), availableHeight = Math.max(1, height - padding * 2);
      const factor = Math.min(availableWidth / boardWidth, availableHeight / boardHeight) * config.scale / 100;
      const displayWidth = boardWidth * factor, displayHeight = boardHeight * factor;
      const x = (width - displayWidth) / 2 + (availableWidth - displayWidth) / 2 * config.offsetX / 100;
      const y = (height - displayHeight) / 2 + (availableHeight - displayHeight) / 2 * config.offsetY / 100;
      const points = Array.from({ length: count }, (_, index) => ({
        x: originX + index % columns * step, y: originY + Math.floor(index / columns) * step, radius, i: index * 2
      }));
      return { x, y, width: displayWidth, height: displayHeight, boardWidth, boardHeight, points, padding, layout: 'landscape' };
    }
    function create(initial, options) {
      return HandAnimation.create({ Settings, displayDigits, digitPose, handCount: count * 2,
        phase: index => Math.floor(index / 2) % columns / (columns - 1) }, initial, options);
    }
    return { id, type: 'landscape', name, badge: 'AMT' + count, count, columns, rows, digitWidth, digitHeight, digitColumns, digitRow, colon, frameAspect, reference, description, Settings, digitPose, displayDigits, geometry, create };
  }
  return [
    define({ count: 72, columns: 12, rows: 6, digitWidth: 3, digitColumns: [0, 3, 6, 9], frameAspect: 173 / 95, reference: 'https://www.humanssince1982.com/en-int/products/a-million-times-72-black-sterling', description: '12 × 6 阵列，四个 3 × 6 轮廓数字铺满表盘，无冒号。' }),
    define({ count: 120, columns: 15, rows: 8, digitWidth: 3, digitColumns: [1, 4, 8, 11], frameAspect: 212 / 121, reference: 'https://www.humanssince1982.com/en-int/products/a-million-times-120-black', description: '15 × 8 阵列，3 × 6 轮廓数字居中，外围与时分之间留白。' }),
    define({ count: 144, columns: 18, rows: 8, digitWidth: 3, digitColumns: [2, 5, 10, 13], colon: [[8, 2], [8, 4]], frameAspect: 262.4 / 130.4, reference: 'https://www.humanssince1982.com/en-int/products/a-million-times-144-black', description: '18 × 8 阵列，3 × 6 轮廓数字、双方形冒号与两侧留白。' }),
    define({ count: 288, columns: 24, rows: 12, digitWidth: 5, digitColumns: [1, 6, 13, 18], colon: [[11, 4], [11, 6]], frameAspect: 345.6 / 187.2, reference: 'https://www.humanssince1982.com/en-int/products/a-million-times-288-black', description: '24 × 12 阵列，5 × 6 宽幅轮廓数字与双方形冒号，上下各留三排表盘。' })
  ];
});
