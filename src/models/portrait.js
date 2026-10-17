(function (root, factory) {
  const commonJS = typeof module === 'object' && module.exports;
  const api = factory(commonJS ? require('./amt72v/model.js') : root.Timeform.AMT72v,
    commonJS ? require('../shared/config.js') : root.Timeform.Config);
  if (commonJS) module.exports = api;
  else (root.Timeform ||= {}).Portrait = api;
})(globalThis, function (AMT72v, Config) {
  'use strict';
  const models = [AMT72v];
  const get = id => models.find(model => model.id === id);
  function parse(text) {
    const data = JSON.parse(text), model = get(data?.model);
    if (data?.version !== 2 || !model || data.type !== 'portrait') throw new Error('请选择 AMT72v 竖排配置；横屏方案请在横屏页面导入。');
    return { model, settings: Config.parse(model, text) };
  }
  return { models, get, parse };
});
