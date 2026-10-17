(function (root, factory) {
  const commonJS = typeof module === 'object' && module.exports;
  const api = factory(commonJS ? require('../../shared/config.js') : root.Timeform.Config,
    commonJS ? require('../amt/settings.js') : root.Timeform.AMTSettings);
  if (commonJS) module.exports = api;
  else (root.Timeform ||= {}).AMT72vSettings = api;
})(globalThis, function (Config, Base) {
  'use strict';
  const fields = {
    ...Base.fields,
    gap: { ...Base.fields.gap, value: 3.6 },
    canvasWidth: { ...Base.fields.canvasWidth, value: 1080 },
    canvasHeight: { ...Base.fields.canvasHeight, value: 1920 },
    long: { ...Base.fields.long, value: '#d6d8d7' },
    short: { ...Base.fields.short, value: '#d6d8d7' },
    longWidth: { ...Base.fields.longWidth, value: 8.2 },
    shortWidth: { ...Base.fields.shortWidth, value: 8.2 },
    safeTop: { type: 'number', label: '顶部留白', value: 100, min: 0, max: 1200, step: 1, unit: 'px', group: 'screen', help: '在安全边距内额外预留空间，避开系统时间与通知。' },
    safeBottom: { type: 'number', label: '底部留白', value: 100, min: 0, max: 1200, step: 1, unit: 'px', group: 'screen', help: '在安全边距内额外预留空间，避开底部操作区域。' },
    motion: { ...Base.fields.motion, options: [['wave', '列间相位 · 双速成型'], ['spin', '同步旋转'], ['quiet', '平滑过渡'], ['none', '立即换时']] },
    duration: { ...Base.fields.duration, label: '完整编排时长', value: 38, max: 120,
      help: '默认含 6 秒补充拆字，再接原片旋转与双速成型；对照原片按钮略过补充段，直接播放约 32 秒。' },
    manualTime: { ...Base.fields.manualTime, value: '09:34' },
    demoInterval: { ...Base.fields.demoInterval, help: '完整编排结束并读时停留至少 2 秒，再演示下一分钟。' }
  };
  function normalize(input = {}, base = {}) {
    const settings = Config.normalize(fields, input, base);
    settings.shortLength = Math.min(settings.shortLength, settings.longLength);
    return settings;
  }
  return { fields, defaults: normalize(), normalize };
});
