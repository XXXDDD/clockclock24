(function (root, factory) {
  const commonJS = typeof module === 'object' && module.exports;
  const api = factory(commonJS ? require('./settings.js') : root.Timeform.ClockClock9Settings,
    commonJS ? require('./drawing.js') : root.Timeform.ClockClock9Drawing,
    commonJS ? require('../circular-layout.js') : root.Timeform.CircularLayout,
    commonJS ? require('./animation.js') : root.Timeform.ClockClock9Animation,
    commonJS ? require('../../shared/time.js') : root.Timeform.Time);
  if (commonJS) module.exports = api;
  else (root.Timeform ||= {}).ClockClock9 = api;
})(globalThis, function (Settings, Drawing, Layout, Animation, Time) {
  'use strict';
  const ring = [[0, -2], [1, -1], [2, 0], [1, 1], [0, 2], [-1, 1], [-2, 0], [-1, -1]];
  function displayDigits(minutes, format24 = true) {
    const value = Time.normalizeMinutes(minutes), hour = Math.floor(value / 60);
    return String(format24 ? hour : hour % 12 || 12).padStart(2, '0') + String(value % 60).padStart(2, '0');
  }
  function digitPose(digits) {
    const pose = ring.flatMap(([x, y], index) => [ring[(index + 7) % 8], ring[(index + 1) % 8]].map(([a, b]) => ({ angle: Math.atan2(b - y, a - x), used: true })));
    const hour = Number(digits.slice(0, 2)) % 12, minute = Number(digits.slice(2));
    pose.push({ angle: minute * Math.PI / 30 - Math.PI / 2, used: true },
      { angle: (hour + minute / 60) * Math.PI / 6 - Math.PI / 2, used: true });
    return pose;
  }
  function geometry(width, height, input) {
    const config = Settings.normalize(input), radius = config.radius, step = (radius * 2 + config.gap) / Math.SQRT2;
    // Board contour + eight axes fitted together in the rectified reference.
    const half = 2 * step + radius * 1.711, diameter = half * 2;
    const points = [...ring, [0, 0]].map(([x, y], index) => ({ x: half + x * step, y: half + y * step, radius, i: index * 2, center: index === 8 }));
    return Layout.fit(width, height, config, diameter, points);
  }
  function create(initial, options) {
    return Animation.create({ Settings, displayDigits, digitPose }, initial, options);
  }
  return { id: 'clockclock9', type: 'circular', name: 'ClockClock 9', badge: 'CC9', count: 9, handCount: 18, arrayLabel: '1 / 2 / 3 / 2 / 1', countLabel: '9 组双针', pickerName: 'ClockClock 9', pickerDetail: '九组裸露双针 · 中央指针读时',
    description: '九组双针直接安装于圆板；中央显示时间，外围分段围成菱形。',
    reference: 'https://www.humanssince1982.com/en-int/products/clockclock-9-white', referenceLabel: 'ClockClock 9 White · 官方参考 ↗',
    previewNote: '九组双针先追齐为平行斜直线，一同顺时针扫动，再以不同节奏逐渐展开成菱形，中央指针显示时间。全程衔接转动，最终共同完成；可暂停、单步对照动作参考。',
    geometryHelp: '针臂直接安装在圆板上，100% 长度仍保留针尖留白。可用轴心额外间距加宽接缝，中央时针比例可独立调整。',
    motionReference: 'https://www.humanssince1982.com/cdn/shop/videos/c/vp/7f0efea609c14fedbfea6547ede93683/7f0efea609c14fedbfea6547ede93683.HD-1080p-4.8Mbps-30628142.mp4?v=0',
    referenceTime: '10:10', choreographed: true, Settings, Drawing, create, geometry, digitPose, displayDigits };
});
