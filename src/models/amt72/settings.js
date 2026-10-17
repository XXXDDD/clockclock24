(function (root, factory) {
  const commonJS = typeof module === 'object' && module.exports;
  const api = factory(commonJS ? require('../../shared/config.js') : root.Timeform.Config,
    commonJS ? require('../amt/settings.js') : root.Timeform.AMTSettings);
  if (commonJS) module.exports = api;
  else (root.Timeform ||= {}).AMT72Settings = api;
})(globalThis, function (Config, Base) {
  'use strict';
  const fields = {
    ...Base.fields,
    gap: { ...Base.fields.gap, value: 4.5 },
    longWidth: { ...Base.fields.longWidth, value: 8.2 },
    shortWidth: { ...Base.fields.shortWidth, value: 8.2 },
    motion: { ...Base.fields.motion, options: [['wave', '中心放射 · 涟漪开合'], ['spin', '同步旋转'], ['quiet', '平滑过渡'], ['none', '立即换时']] },
    duration: { ...Base.fields.duration, label: '完整编排时长', value: 43.4, max: 120,
      help: '中心归队、向心停留、反向开合、逐针成型；默认 43.4 秒对照普通黑色款完整原片。' },
    manualTime: { ...Base.fields.manualTime, value: '09:34' },
    demoInterval: { ...Base.fields.demoInterval, help: '参考编排至少等本轮结束并读时停留 2 秒，再切换下一分钟。' }
  };
  function normalize(input = {}, base = {}) {
    const settings = Config.normalize(fields, input, base);
    settings.shortLength = Math.min(settings.shortLength, settings.longLength);
    return settings;
  }
  return { fields, defaults: normalize(), normalize };
});
