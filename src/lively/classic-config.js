(function (root, factory) {
  const cjs = typeof module === 'object' && module.exports;
  const api = factory(cjs ? require('../core/presentation-config.js') : root.Timeform.PresentationConfig,
    cjs ? require('../shared/config.js') : root.Timeform.Config);
  if (cjs) module.exports = api;
  else root.Timeform.ClassicLivelyConfig = api;
})(globalThis, function (Presentation, Config) {
  'use strict';
  const { models, get, label, categories, fields, groups, geometryKeys, defaults, normalize, resolve } = Presentation;
  const metadata = { AppVersion: '2.2.1.0', Title: 'TIMEFORM · 30 款时钟 · 本地测试版',
    Desc: '圆形、横屏、竖排共 30 款时钟，统一下拉选择。包含最新的长短针比例、闲置显隐及动作修正，离线运行。',
    Author: 'TIMEFORM', Type: 1, FileName: 'index.html', IsAbsolutePath: false, Thumbnail: 'thumbnail.jpg', Preview: null,
    Arguments: '--pause-event true', Contact: 'https://github.com/XXXDDD/clockclock24', License: null, Version: 6 };
  function decodeProperty(key, value) {
    const field = fields[key];
    if (!field) return undefined;
    if (field.type === 'select' && typeof value !== 'boolean' && value !== '' && value !== null && Number.isInteger(Number(value))) value = field.options[Number(value)]?.[0];
    return Config.decode(field, value, true);
  }
  function livelyProperties(input = defaults) {
    const config = normalize(input), properties = {};
    for (const [group, title] of Object.entries(groups)) {
      properties['section' + group] = { type: 'label', value: title };
      for (const [key, field] of Object.entries(fields).filter(([, field]) => field.group === group && !field.hidden)) {
        const control = { text: field.label + (field.unit ? '（' + field.unit + '）' : ''), type: field.type, value: config[key] };
        if (field.type === 'select') { control.type = 'dropdown'; control.items = field.options.map(option => option[1]); control.value = field.options.findIndex(option => option[0] === config[key]); }
        else if (field.type === 'number') {
          if (field.step < 1) { control.type = 'textbox'; control.value = String(config[key]); }
          else { control.type = 'slider'; control.min = field.min; control.max = field.max; control.step = field.step; }
        } else if (['timezone', 'time'].includes(field.type)) control.type = 'textbox';
        if (field.help) control.help = field.help;
        properties[key] = control;
      }
    }
    properties.replay = { type: 'button', text: '重播当前动作', value: 'replay' };
    properties.settle = { type: 'button', text: '立即显示当前时间', value: 'settle' };
    return properties;
  }
  function serialize(input) { return JSON.stringify({ version: 6, handGeometryVersion: 1, platform: 'lively-classic', settings: normalize(input) }, null, 2); }
  function parse(text) {
    const data = JSON.parse(text);
    if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error('请选择有效的 TIMEFORM 配置。');
    if (data.version === 2 || data.schema === 'timeform.presentation') return Presentation.parse(text);
    if (![4, 5, 6].includes(data.version) || data.platform !== 'lively-classic' || !data.settings || typeof data.settings !== 'object' || Array.isArray(data.settings)) throw new Error('请选择 30 款壁纸配置，或网页版导出的单款 JSON。');
    for (const [key, field] of Object.entries(fields)) if (Object.hasOwn(data.settings, key) && Config.decode(field, data.settings[key], true) === undefined) throw new Error('「' + field.label + '」无效。');
    const imported = normalize(data.settings);
    if (data.handGeometryVersion === undefined && imported.customGeometry && imported.longLength === 100 && imported.shortLength === 100) {
      imported.shortLength = get(imported.edition).Settings.defaults.shortLength;
      if (imported.edition === 'clockclock9' && imported.centerHourLength === 82) imported.centerHourLength = get(imported.edition).Settings.defaults.centerHourLength;
    }
    return imported;
  }
  return { models, get, label, categories, fields, groups, geometryKeys, defaults, metadata, normalize, decodeProperty, resolve, livelyProperties, serialize, parse };
});
