(function (root, factory) {
  const commonJS = typeof module === 'object' && module.exports;
  const api = factory(commonJS ? require('./clockclock24/model.js') : root.Timeform.ClockClock24,
    commonJS ? require('./amt/model.js') : root.Timeform.AMTModels,
    commonJS ? require('../shared/config.js') : root.Timeform.Config);
  if (commonJS) module.exports = api;
  else (root.Timeform ||= {}).Landscape = api;
})(globalThis, function (ClockClock24, AMTModels, Config) {
  'use strict';
  const models = [ClockClock24, ...AMTModels];
  const get = id => models.find(model => model.id === id);
  function parse(text) {
    const data = JSON.parse(text);
    const model = data?.version === 2 ? get(data.model) : ClockClock24;
    if (!model) throw new Error('此横屏型号暂不支持。');
    return { model, settings: Config.parse(model, text) };
  }
  return { models, get, parse };
});
