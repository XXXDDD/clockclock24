(function (root, factory) {
  const commonJS = typeof module === 'object' && module.exports;
  const api = factory(commonJS ? require('./clockclock24/model.js') : root.Timeform.ClockClock24,
    commonJS ? require('../shared/config.js') : root.Timeform.Config,
    commonJS ? require('./amt72/model.js') : root.Timeform.AMT72,
    commonJS ? require('./amt120/model.js') : root.Timeform.AMT120,
    commonJS ? require('./amt144/model.js') : root.Timeform.AMT144,
    commonJS ? require('./amt288/model.js') : root.Timeform.AMT288);
  if (commonJS) module.exports = api;
  else (root.Timeform ||= {}).Landscape = api;
})(globalThis, function (ClockClock24, Config, AMT72, AMT120, AMT144, AMT288) {
  'use strict';
  const models = [ClockClock24, AMT72, AMT120, AMT144, AMT288];
  const get = id => models.find(model => model.id === id);
  function parse(text) {
    const data = JSON.parse(text);
    const model = data?.version === 2 ? get(data.model) : ClockClock24;
    if (!model) throw new Error('此横屏型号暂不支持。');
    return { model, settings: Config.parse(model, text) };
  }
  return { models, get, parse };
});
