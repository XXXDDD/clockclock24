(function (root, factory) {
  const commonJS = typeof module === 'object' && module.exports;
  const api = factory(commonJS ? require('../models/landscape.js') : root.Timeform.Landscape,
    commonJS ? require('../shared/config.js') : root.Timeform.Config,
    commonJS ? require('../shared/palette.js') : root.Timeform.Palette,
    commonJS ? require('../shared/hand-animation.js') : root.Timeform.HandAnimation,
    commonJS ? require('../models/amt/settings.js') : root.Timeform.AMTSettings);
  if (commonJS) module.exports = api;
  else (root.Timeform ||= {}).LivelyConfig = api;
})(globalThis, function (Landscape, Config, Palette, HandAnimation, LegacySettings) {
  'use strict';
  const base = LegacySettings.fields;
  const fields = {
    model: { type: 'select', label: '阵列型号', value: 'amt144', options: Landscape.models.map(model => [model.id, model.name + ' · ' + model.columns + ' × ' + model.rows]), group: 'model' },
    preset: { type: 'select', label: '配色方案', value: 'custom', options: [['custom', '自定义（使用下方独立颜色）'], ...Palette.presets.map(preset => [preset.id, preset.name])], group: 'palette', help: '想单独修改背景或指针颜色，请选择自定义。' },
    ...Object.fromEntries(Object.entries(base).filter(([key]) => !['canvasWidth', 'canvasHeight'].includes(key))),
    motion: { ...base.motion, options: [['wave', '逐列波浪收束'], ['spin', '同步旋转'], ['quiet', '平滑过渡'], ['none', '立即换时']] },
    paused: { type: 'checkbox', label: '暂停播放（验证用）', value: false, group: 'motion' }
  };
  const metadata = { AppVersion: '2.2.1.0', Title: 'TIMEFORM · 五型号时钟 · 本地测试版', Desc: '24、72、120、144、288 五种横屏阵列；配色、大小、位置、表盘、指针、时间和动画可自定义。离线运行。', Author: 'TIMEFORM', Type: 1, FileName: 'index.html', IsAbsolutePath: false, Thumbnail: 'thumbnail.jpg', Preview: null, Arguments: '--pause-event true', Contact: 'https://github.com/XXXDDD/clockclock24', License: null, Version: 3 };
  function normalize(input = {}, previous = {}) {
    const result = Config.normalize(fields, input, previous);
    result.shortLength = Math.min(result.shortLength, result.longLength);
    return result;
  }
  const defaults = normalize();
  function decodeProperty(key, value) {
    const field = fields[key];
    if (!field) return undefined;
    if (field.type === 'select' && typeof value !== 'boolean' && value !== '' && value !== null && Number.isInteger(Number(value))) {
      value = field.options[Number(value)]?.[0];
    }
    return Config.decode(field, value, true);
  }
  function rendererConfig(input) {
    const config = normalize(input), preset = Palette.presets.find(entry => entry.id === config.preset);
    return preset ? { ...config, ...Palette.colors(preset) } : config;
  }
  function rendererModel(id) {
    const model = Landscape.get(id);
    if (!model) throw new Error('请选择支持的阵列型号。');
    const Settings = { fields, normalize: (input, previous) => rendererConfig(normalize(input, previous)), defaults: rendererConfig({ ...defaults, model: id }) };
    return { ...model, Settings, create(initial, options) {
      return HandAnimation.create({ Settings, digitPose: model.digitPose, displayDigits: model.displayDigits, handCount: model.count * 2,
        phase: index => Math.floor(index / 2) % model.columns / (model.columns - 1) }, initial, options);
    } };
  }
  function livelyProperties(input = defaults) {
    const config = normalize(input), properties = {};
    const groups = { model: '型号', palette: '配色方案', colors: '独立颜色（自定义配色时生效）', screen: '大小与位置', geometry: '表盘与指针', motion: '动画与播放', time: '时间' };
    for (const group of Object.keys(groups)) {
      properties['section' + group] = { type: 'label', value: groups[group] };
      for (const [key, field] of Object.entries(fields).filter(([, field]) => field.group === group)) {
        const control = { text: field.label + (field.unit ? '（' + field.unit + '）' : ''), type: field.type, value: config[key] };
        if (field.type === 'select') { control.type = 'dropdown'; control.items = field.options.map(option => option[1]); control.value = field.options.findIndex(option => option[0] === config[key]); }
        else if (field.type === 'number') {
          if (field.step < 1) { control.type = 'textbox'; control.value = String(config[key]); control.help = '有效范围 ' + field.min + '–' + field.max + '，可输入小数。'; }
          else { control.type = 'slider'; control.min = field.min; control.max = field.max; control.step = field.step; }
        } else if (['timezone', 'time'].includes(field.type)) control.type = 'textbox';
        if (field.help) control.help = field.help;
        if (field.type === 'time') control.help = '指定时间模式使用，格式 HH:MM，例如 09:34。';
        properties[key] = control;
      }
    }
    return properties;
  }
  function serialize(config) { return JSON.stringify({ version: 3, platform: 'lively', settings: normalize(config) }, null, 2); }
  function parse(text) {
    const data = JSON.parse(text);
    if (data?.version === 2) {
      const imported = Landscape.parse(text);
      return normalize({ ...imported.settings, model: imported.model.id });
    }
    if (data?.version === 1) return normalize({ ...Landscape.parse(text).settings, model: 'clockclock24' });
    if (!data || data.version !== 3 || data.platform !== 'lively' || !data.settings || typeof data.settings !== 'object' || Array.isArray(data.settings)) throw new Error('请选择有效的 TIMEFORM 壁纸配置。');
    for (const [key, field] of Object.entries(fields)) if (Object.hasOwn(data.settings, key) && Config.decode(field, data.settings[key], true) === undefined) throw new Error('「' + field.label + '」无效，请检查格式与范围。');
    return normalize(data.settings);
  }
  return { fields, defaults, metadata, normalize, decodeProperty, rendererConfig, rendererModel, livelyProperties, serialize, parse };
});
