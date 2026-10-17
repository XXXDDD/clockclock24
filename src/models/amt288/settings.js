(function (root, factory) {
  const commonJS = typeof module === 'object' && module.exports;
  const api = factory(commonJS ? require('../../shared/config.js') : root.Timeform.Config,
    commonJS ? require('../amt/settings.js') : root.Timeform.AMTSettings);
  if (commonJS) module.exports = api;
  else (root.Timeform ||= {}).AMT288Settings = api;
})(globalThis, function (Config, Base) {
  'use strict';
  const fields = {
    ...Base.fields,
    gap: { ...Base.fields.gap, value: 4.4 },
    background: { ...Base.fields.background, value: '#e4e3df' },
    board: { ...Base.fields.board, value: '#f6f4ef' },
    long: { ...Base.fields.long, value: '#252624' },
    short: { ...Base.fields.short, value: '#252624' },
    longWidth: { ...Base.fields.longWidth, value: 8.2 },
    shortWidth: { ...Base.fields.shortWidth, value: 8.2 },
    motion: { ...Base.fields.motion, options: [['wave', '环弧归队 · 环波开合'], ['spin', '同步旋转'], ['quiet', '平滑过渡'], ['none', '立即换时']] },
    duration: { ...Base.fields.duration, label: '完整编排时长', value: 54.2, max: 120,
      help: '由中心向外整理环弧，双针反向开合，最后沿各针原方向归位；54.2 秒对照白色款完整原片。' },
    manualTime: { ...Base.fields.manualTime, value: '09:34' },
    demoInterval: { ...Base.fields.demoInterval, help: '参考编排至少等本轮完成并读时停留 2 秒，再演示下一分钟。' }
  };
  function normalize(input = {}, base = {}) {
    const settings = Config.normalize(fields, input, base);
    settings.shortLength = Math.min(settings.shortLength, settings.longLength);
    return settings;
  }
  return { fields, defaults: normalize(), normalize };
});
