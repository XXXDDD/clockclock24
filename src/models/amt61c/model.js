(function (root, factory) {
  const commonJS = typeof module === 'object' && module.exports;
  const api = factory(commonJS ? require('./settings.js') : root.Timeform.AMT61cSettings,
    commonJS ? require('../circular-layout.js') : root.Timeform.CircularLayout,
    commonJS ? require('../../shared/single-clock.js') : root.Timeform.SingleClock,
    commonJS ? require('./animation.js') : root.Timeform.AMT61cAnimation,
    commonJS ? require('../../shared/time.js') : root.Timeform.Time);
  if (commonJS) module.exports = api;
  else (root.Timeform ||= {}).AMT61c = api;
})(globalThis, function (Settings, Layout, SingleClock, Animation, Time) {
  'use strict';
  const rowCounts = [3, 7, 7, 9, 9, 9, 7, 7, 3];
  const cells = rowCounts.flatMap((count, row) => Array.from({ length: count }, (_, col) => ({ row, col: col + (9 - count) / 2 })));
  const directions = { E: 0, S: Math.PI / 2, W: Math.PI, N: -Math.PI / 2, P: Math.PI * .75 };
  // Compact 2 × 3 digits fit the three complete central rows of the circular grid.
  const glyphs = {
    0: ['SE', 'SW', 'NS', 'NS', 'NE', 'NW'], 1: ['PP', 'SS', 'PP', 'NS', 'PP', 'NN'],
    2: ['EE', 'SW', 'SE', 'NW', 'NE', 'WW'], 3: ['EE', 'SW', 'EE', 'NW', 'EE', 'NW'],
    4: ['SS', 'SS', 'NE', 'NS', 'PP', 'NN'], 5: ['SE', 'WW', 'NE', 'SW', 'EE', 'NW'],
    6: ['SE', 'WW', 'NS', 'SW', 'NE', 'NW'], 7: ['EE', 'SW', 'PP', 'NS', 'PP', 'NN'],
    8: ['SE', 'SW', 'NE', 'NW', 'NE', 'NW'], 9: ['SE', 'SW', 'EN', 'NS', 'EE', 'NW']
  };
  function displayDigits(minutes, format24 = true) {
    const value = Time.normalizeMinutes(minutes), hour = Math.floor(value / 60);
    return String(format24 ? hour : hour % 12 || 12).padStart(2, '0') + String(value % 60).padStart(2, '0');
  }
  function digitPose(digits) {
    return cells.flatMap(({ row, col }) => {
      const digit = col < 4 ? Math.floor(col / 2) : col > 4 ? 2 + Math.floor((col - 5) / 2) : -1;
      const localCol = col < 4 ? col % 2 : (col - 5) % 2;
      const pair = row >= 3 && row <= 5 && digit >= 0 ? glyphs[digits[digit]][(row - 3) * 2 + localCol] : 'PP';
      return [...pair].map((direction, index) => ({ angle: directions[direction], used: direction !== 'P' && (index === 0 || direction !== pair[0]) }));
    });
  }
  function geometry(width, height, input) {
    const config = Settings.normalize(input), radius = config.radius, step = radius * 2 + config.gap;
    // Circular contour and repeated axes jointly establish the reference plane.
    const half = step * 605 / 54.25 / 2;
    const points = cells.map(({ row, col }, index) => ({ x: half + (col - 4) * step, y: half + (row - 4) * step, radius, i: index * 2 }));
    return Layout.fit(width, height, config, half * 2, points);
  }
  function create(initial, options) {
    return Animation.create({ Settings, displayDigits, digitPose, cells }, initial, options);
  }
  const referenceReach = 1.016;
  const longLanes = '0000000000000000011100000000000000000000000000000000000000000';
  const longLane = point => Number(longLanes[Math.floor(point.i / 2)]);
  const Drawing = { referenceReach, longLane,
    appearance: { boardShape: 'circle', handShape: 'rounded', tailLength: 1.6,
      cornerRadius: width => Math.min(1.5, width / 2), finish: 'metal', hub: true },
    handLength: (config, secondary) => 53.2 * referenceReach * (secondary ? Math.min(config.shortLength, config.longLength) : config.longLength) / 100,
    drawHands(context, geometry, instance, config) {
      geometry.points.forEach(point => SingleClock.drawHands(context, point,
        [instance.hands[point.i + longLane(point)], instance.hands[point.i + (longLane(point) ^ 1)]], config, referenceReach));
    },
    drawSurface(context, geometry, config) {
    Layout.drawBoard(context, geometry, config);
    geometry.points.forEach(point => SingleClock.drawFace(context, point, config));
  } };
  return { id: 'amt61c', type: 'circular', name: 'A million Times 61c · Zephyr', badge: 'AMT61c', count: 61, handCount: 122, columns: 9, rows: 9, rowCounts,
    arrayLabel: '61 · 圆形阵列', pickerName: 'AMT 61c · Zephyr', pickerDetail: '61 个表盘 · 森林绿与金色指针',
    description: '61 个小表盘组成圆形阵列，以森林绿和金色双针演绎数字时间。',
    reference: 'https://www.humanssince1982.com/en-int/products/a-million-times-61c-zephyr', referenceLabel: 'AMT61c Zephyr · 官方参考 ↗',
    previewNote: '从左侧、靠近中心的位置依次整理朝右，停留后进入连续风势；随后从各自的风势姿态直接成字，指针先后到位并保持。可设约 53 秒，以 09:34 → 09:35 对照参考。',
    geometryHelp: '61 个圆表盘等比缩放。背景板始终为圆形，短针长度不超过长针。',
    motionReference: 'https://www.humanssince1982.com/cdn/shop/videos/c/vp/d2d7cd358c664452aa9d81a0931eb5ec/d2d7cd358c664452aa9d81a0931eb5ec.HD-1080p-7.2Mbps-46730750.mp4?v=0',
    referenceTime: '09:34', choreographed: true, Settings, Drawing, create, geometry, digitPose, displayDigits };
});
