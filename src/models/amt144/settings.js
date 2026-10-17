(function (root, factory) {
  const commonJS = typeof module === 'object' && module.exports;
  const api = factory(commonJS ? require('../../shared/config.js') : root.Timeform.Config,
    commonJS ? require('../amt/settings.js') : root.Timeform.AMTSettings);
  if (commonJS) module.exports = api;
  else (root.Timeform ||= {}).AMT144Settings = api;
})(globalThis, function (Config, Base) {
  'use strict';
  const fields = {
    ...Base.fields,
    gap: { ...Base.fields.gap, value: 5.3 },
    longWidth: { ...Base.fields.longWidth, value: 8.2 },
    shortWidth: { ...Base.fields.shortWidth, value: 8.2 },
    motion: { ...Base.fields.motion, options: [['wave', '斜线列波 · 双速归位'], ['spin', '同步旋转'], ['quiet', '平滑过渡'], ['none', '立即换时']] },
    duration: { ...Base.fields.duration, label: '完整编排时长', value: 54.4, max: 120,
      help: '逐列排成斜直线，顺时针列波向右传播，双针分成快慢两路归位；54.4 秒对照黑色款原片。' },
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
