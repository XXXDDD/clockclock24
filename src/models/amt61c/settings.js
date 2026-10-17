(function (root, factory) {
  const commonJS = typeof module === 'object' && module.exports;
  const api = factory(commonJS ? require('../../shared/config.js') : root.Timeform.Config,
    commonJS ? require('../amt/settings.js') : root.Timeform.AMTSettings);
  if (commonJS) module.exports = api;
  else (root.Timeform ||= {}).AMT61cSettings = api;
})(globalThis, function (Config, Base) {
  'use strict';
  const fields = {
    ...Base.fields,
    gap: { ...Base.fields.gap, value: 6.4 },
    background: { ...Base.fields.background, value: '#e9e6de' },
    board: { ...Base.fields.board, value: '#102b25' },
    long: { ...Base.fields.long, value: '#d9b667' },
    short: { ...Base.fields.short, value: '#d9b667' },
    shortLength: { ...Base.fields.shortLength, value: 86, help: '相对原作长针基准；61c 正视参考图量测约为 86%。' },
    canvasWidth: { ...Base.fields.canvasWidth, value: 1080 },
    canvasHeight: { ...Base.fields.canvasHeight, value: 1080 },
    motion: { ...Base.fields.motion, options: [['wave', 'Zephyr · 风势流动'], ['spin', 'Zephyr · 同步起伏'], ['quiet', '平滑过渡'], ['none', '立即换时']] },
    duration: { ...Base.fields.duration, label: '完整编排时长', value: 18, max: 120, help: '逐位整理、朝右停留、风势流动、逐针成型；默认 18 秒，可设约 53 秒对照原片，最长 120 秒。' },
    visibility: { ...Base.fields.visibility, value: 'ghost', help: '外围与数字内部的闲置表盘均以双针一起显隐；组成数字的折叠指针完整保留。' },
    manualTime: { ...Base.fields.manualTime, value: '12:36' }
  };
  fields.demoInterval = { ...Base.fields.demoInterval, help: '编排模式至少等待本轮结束并读时停留 2 秒，避免自动切换反复打断动画。' };
  function normalize(input = {}, base = {}) {
    const config = Config.normalize(fields, input, base);
    config.shortLength = Math.min(config.shortLength, config.longLength);
    return config;
  }
  return { fields, defaults: normalize(), normalize };
});
