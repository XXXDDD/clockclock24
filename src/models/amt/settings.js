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
    motion: { ...Base.fields.motion, value: 'wave', options: [['wave', '逐列波浪收束'], ['spin', '同步旋转'], ['quiet', '平滑过渡'], ['none', '立即换时']] },
    duration: { ...Base.fields.duration, value: 6 },
    visibility: { ...Base.fields.visibility, value: 'show', help: '参考图保留闲置指针的斜线；也可选择归位后隐藏或微光显示。' }
  };
  function normalize(input = {}, base = {}) {
    const settings = Config.normalize(fields, input, base);
    settings.shortLength = Math.min(settings.shortLength, settings.longLength);
    return settings;
  }
  return { fields, defaults: normalize(), normalize };
});
