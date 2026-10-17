(function (root, factory) {
  const commonJS = typeof module === 'object' && module.exports;
  const api = factory(commonJS ? require('./clockclock9/model.js') : root.Timeform.ClockClock9,
    commonJS ? require('./amt61c/model.js') : root.Timeform.AMT61c,
    commonJS ? require('../shared/config.js') : root.Timeform.Config);
  if (commonJS) module.exports = api;
  else (root.Timeform ||= {}).Circular = api;
})(globalThis, function (ClockClock9, AMT61c, Config) {
  'use strict';
  const models = [ClockClock9, AMT61c];
  const get = id => models.find(model => model.id === id);
  function parse(text) {
    const data = JSON.parse(text), model = get(data?.model);
    if (data?.version !== 2 || data.type !== 'circular' || !model) throw new Error('请选择 ClockClock 9 或 AMT61c 的圆形配置。');
    return { model, settings: Config.parse(model, text) };
  }
  return { models, get, parse };
});
