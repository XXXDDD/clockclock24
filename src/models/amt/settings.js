(function (root, factory) {
  const commonJS = typeof module === 'object' && module.exports;
  const api = factory(commonJS ? require('../../shared/config.js') : root.Timeform.Config,
    commonJS ? require('../clockclock24/settings.js') : root.Timeform.ClockClock24Settings);
  if (commonJS) module.exports = api;
  else (root.Timeform ||= {}).AMTSettings = api;
})(globalThis, function (Config, Base) {
  'use strict';
  // The large arrays share control units, but have their own typography and motion.
  const fields = {
    ...Base.fields,
    radius: { ...Base.fields.radius, value: 43, min: 20, max: 65 },
    gap: { ...Base.fields.gap, value: 4.3 },
    longWidth: { ...Base.fields.longWidth, value: 6.2 },
    shortWidth: { ...Base.fields.shortWidth, value: 6.2 },
    shortLength: { ...Base.fields.shortLength, value: 85, help: '相对本型号原作长针基准；默认 85%，保留实物的长短针差异。' },
    motion: { ...Base.fields.motion, value: 'wave', options: [['wave', '逐列波浪收束'], ['spin', '同步旋转'], ['quiet', '平滑过渡'], ['none', '立即换时']] },
    duration: { ...Base.fields.duration, label: '动画时长', value: 6, max: 10, help: '' },
    manualTime: { ...Base.fields.manualTime, value: '12:38' },
    visibility: { ...Base.fields.visibility, value: 'show', help: '仅闲置表盘的双针一起随动作显隐；参与数字或冒号的双针完整保留，包括折叠的指针。' }
  };
  function normalize(input = {}, base = {}) {
    const settings = Config.normalize(fields, input, base);
    settings.shortLength = Math.min(settings.shortLength, settings.longLength);
    return settings;
  }
  return { fields, defaults: normalize(), normalize };
});
