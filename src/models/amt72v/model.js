(function (root, factory) {
  const commonJS = typeof module === 'object' && module.exports;
  const api = factory(commonJS ? require('../amt/typography.js') : root.Timeform.AMTTypography,
    commonJS ? require('./settings.js') : root.Timeform.AMT72vSettings,
    commonJS ? require('./animation.js') : root.Timeform.AMT72vAnimation,
    commonJS ? require('./drawing.js') : root.Timeform.AMT72vDrawing);
  if (commonJS) module.exports = api;
  else (root.Timeform ||= {}).AMT72v = api;
})(globalThis, function (Typography, Settings, Animation, Drawing) {
  'use strict';
  const { IDLE, displayDigits } = Typography;
  const columns = 6, rows = 12, count = 72, digitWidth = 3, digitHeight = 6, frameAspect = 95 / 173;
  const digitOrigins = [[0, 0], [3, 0], [0, 6], [3, 6]];
  const glyphs = Object.fromEntries(Array.from({ length: 10 }, (_, digit) => [digit, Typography.glyphPose(String(digit), digitWidth)]));
  function digitPose(digits) {
    const pose = Array.from({ length: count * 2 }, () => ({ angle: IDLE, used: false }));
    digitOrigins.forEach(([x, y], digit) => {
      const glyph = glyphs[digits[digit]];
      for (let row = 0; row < digitHeight; row++) for (let col = 0; col < digitWidth; col++) {
        const target = ((y + row) * columns + x + col) * 2, source = (row * digitWidth + col) * 2;
        pose[target] = { ...glyph[source] }; pose[target + 1] = { ...glyph[source + 1] };
      }
    });
    return pose;
  }
  function geometry(width, height, input) {
    const config = Settings.normalize(input), radius = config.radius, step = radius * 2 + config.gap;
    const gridWidth = radius * 2 + (columns - 1) * step, gridHeight = radius * 2 + (rows - 1) * step;
    // Black Sterling measured in the rectified front-board plane.
    const boardWidth = step * 457.46 / 62.45, boardHeight = boardWidth / frameAspect;
    const originX = (boardWidth - gridWidth) / 2 + radius, originY = (boardHeight - gridHeight) / 2 + radius;
    const padding = Math.min(config.padding, (width - 1) / 2, (height - 1) / 2);
    const innerHeight = Math.max(1, height - padding * 2), requested = config.safeTop + config.safeBottom;
    // Large safe areas shrink proportionally on small canvases, leaving a positive drawing region.
    const safeFactor = requested ? Math.min(1, (innerHeight - 1) / requested) : 1;
    const safeTop = config.safeTop * safeFactor, safeBottom = config.safeBottom * safeFactor;
    const availableWidth = Math.max(1, width - padding * 2), availableHeight = Math.max(1, innerHeight - safeTop - safeBottom);
    const factor = Math.min(availableWidth / boardWidth, availableHeight / boardHeight) * config.scale / 100;
    const displayWidth = boardWidth * factor, displayHeight = boardHeight * factor;
    const x = padding + (availableWidth - displayWidth) / 2 * (1 + config.offsetX / 100);
    const y = padding + safeTop + (availableHeight - displayHeight) / 2 * (1 + config.offsetY / 100);
    const points = Array.from({ length: count }, (_, index) => ({
      x: originX + index % columns * step, y: originY + Math.floor(index / columns) * step, radius, i: index * 2
    }));
    return { x, y, width: displayWidth, height: displayHeight, boardWidth, boardHeight, points, padding, safeTop, safeBottom, layout: 'portrait' };
  }
  function create(initial, options) {
    return Animation.create({ Settings, displayDigits, digitPose }, initial, options);
  }
  return { id: 'amt72v', type: 'portrait', name: 'A million Times 72v', badge: 'AMT72v',
    count, columns, rows, digitWidth, digitHeight, digitOrigins, frameAspect,
    reference: 'https://www.humanssince1982.com/en-int/products/a-million-times-72v-black-sterling',
    referenceLabel: 'AMT72v Black Sterling · 原作参考',
    motionReference: 'https://cdn.shopify.com/videos/c/vp/c9a11576a51645cf9c158a61c4a2706f/c9a11576a51645cf9c158a61c4a2706f.HD-1080p-7.2Mbps-31645859.mp4',
    referenceTime: '09:34', referenceDuration: 32, referenceClip: true, choreographed: true,
    description: '6 × 12 黑板银针；同列同步、列间错相旋转，双针沿快慢两路逐渐组成上方小时与下方分钟。',
    previewNote: 'Black Sterling 原片约 32.03 秒，从已在旋转的直线开始，片尾为 09:35。完整换时另补 6 秒拆字；原片对照略过此段。上下留白可独立调节。',
    Settings, Drawing, displayDigits, digitPose, geometry, create };
});
