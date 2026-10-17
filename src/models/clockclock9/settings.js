(function (root, factory) {
  const commonJS = typeof module === 'object' && module.exports;
  const api = factory(commonJS ? require('../../shared/config.js') : root.Timeform.Config,
    commonJS ? require('../clockclock24/settings.js') : root.Timeform.ClockClock24Settings);
  if (commonJS) module.exports = api;
  else (root.Timeform ||= {}).ClockClock9Settings = api;
})(globalThis, function (Config, Base) {
  'use strict';
  const { visibility, ...baseFields } = Base.fields;
  const fields = {
    ...baseFields,
    background: { ...Base.fields.background, value: '#e9e6de' },
    board: { ...Base.fields.board, value: '#f6f4ef' },
    long: { ...Base.fields.long, label: '分针 / 第一臂', value: '#343633' },
    short: { ...Base.fields.short, label: '时针 / 第二臂', value: '#343633' },
    canvasWidth: { ...Base.fields.canvasWidth, value: 1080 },
    canvasHeight: { ...Base.fields.canvasHeight, value: 1080 },
    radius: { ...Base.fields.radius, label: '针臂基准长度', help: '九组双针直接安装在圆板上，没有独立的小圆表盘。' },
    gap: { ...Base.fields.gap, label: '轴心额外间距', value: 0, help: '默认针臂已保留针尖间隙；此数值会额外拉开轴心，加宽外围接缝。' },
    longWidth: { ...Base.fields.longWidth, value: 6.2 },
    shortWidth: { ...Base.fields.shortWidth, value: 6.2 },
    centerHourLength: { type: 'number', label: '中央时针比例', value: 82, min: 50, max: 100, step: 1, unit: '%', group: 'geometry', help: '只缩短中央时针，外围第二臂仍按短针长度绘制。' },
    motion: { ...Base.fields.motion, value: 'wave', options: [['wave', '斜线扫动 · 菱形成型'], ['spin', '多圈顺时针成型'], ['quiet', '安静读时'], ['none', '立即换时']] },
    duration: { ...Base.fields.duration, label: '完整编排时长', value: 18, max: 120, help: '斜线追齐、共同扫动、菱形成型，中间持续转动；默认 18 秒，可延长到 120 秒。' },
    format24: { ...Base.fields.format24, help: '中央指针始终按 12 小时转动；此选项切换调试读数的时制。' },
    manualTime: { ...Base.fields.manualTime, value: '10:10' }
  };
  fields.demoInterval = { ...Base.fields.demoInterval, help: '编排模式至少等待本轮结束并读时停留 2 秒，避免自动切换反复打断动画。' };
  function normalize(input = {}, base = {}) {
    const config = Config.normalize(fields, input, base);
    config.shortLength = Math.min(config.shortLength, config.longLength);
    return config;
  }
  return { fields, defaults: normalize(), normalize };
});
