(function (root, factory) {
  const cjs = typeof module === 'object' && module.exports;
  const api = factory(cjs ? require('../web/classic.js') : root.Timeform.Classic,
    cjs ? require('../models/landscape.js') : root.Timeform.Landscape,
    cjs ? require('../models/circular.js') : root.Timeform.Circular,
    cjs ? require('../models/portrait.js') : root.Timeform.Portrait,
    cjs ? require('../shared/config.js') : root.Timeform.Config);
  if (cjs) module.exports = api;
  else root.Timeform.ClassicLivelyConfig = api;
})(globalThis, function (Classic, Landscape, Circular, Portrait, Config) {
  'use strict';
  const categories = { landscape: '横屏', circular: '圆形', portrait: '竖排' };
  const catalogs = [Landscape, Circular, Portrait].map(source => Classic.catalog(source));
  const models = catalogs.flatMap(catalog => catalog.models);
  const get = id => models.find(model => model.id === id);
  const label = model => categories[model.type] + ' · ' + model.name.replace('A million Times ', 'AMT ') + ' · ' + model.edition;
  const base = get('amt144').Settings.fields;
  const geometryKeys = [...new Set(models.flatMap(model => Object.entries(model.Settings.fields)
    .filter(([key, field]) => field.group === 'geometry' || ['safeTop', 'safeBottom'].includes(key)).map(([key]) => key)))];
  const geometryFields = Object.fromEntries(geometryKeys.map(key => {
    const definitions = models.map(model => model.Settings.fields[key]).filter(Boolean);
    const field = base[key] || definitions[0];
    return [key, { ...field, group: 'geometry', min: Math.min(...definitions.map(item => item.min)),
      max: Math.max(...definitions.map(item => item.max)), help: '启用自定义尺寸后生效；数值会限制在当前型号的有效范围。' }];
  }));
  const actions = [['default', '当前预设原动作']];
  for (const model of models) for (const [id, name] of model.Settings.fields.choreography?.options || []) {
    const value = model.group + ':' + id;
    if (!actions.some(option => option[0] === value)) actions.push([value, model.group.replace('clockclock24', '24 系列').replace(/^amt/, 'AMT ') + ' · ' + name]);
  }
  const checkbox = (label, group, help) => ({ type: 'checkbox', label, value: false, group, help });
  const fields = {
    edition: { type: 'select', label: '时钟款式（全部 30 款）', value: 'amt144', group: 'edition', options: models.map(model => [model.id, label(model)]) },
    ...Object.fromEntries(['scale', 'padding', 'offsetX', 'offsetY'].map(key => [key, base[key]])),
    customColors: checkbox('启用自定义配色', 'colors', '关闭时使用所选款式的原作配色；开启后使用下方四项颜色。'),
    ...Object.fromEntries(['background', 'board', 'long', 'short'].map(key => [key, base[key]])),
    action: { type: 'select', label: '动作', value: 'default', options: actions, group: 'motion',
      help: '默认沿用各款校准动作；附加动作只适用于名称标注的型号，其他型号自动使用原动作。' },
    customDuration: checkbox('启用自定义动作时长', 'motion', '关闭时沿用当前款式或当前动作的参考时长。'),
    duration: { ...base.duration, min: 1, max: 120, help: '启用自定义动作时长后生效。' },
    visibility: { ...base.visibility, value: 'default', options: [['default', '当前预设默认'], ...base.visibility.options] },
    playbackSpeed: { ...base.playbackSpeed, label: '播放速度' },
    paused: checkbox('暂停播放', 'motion'),
    ...Object.fromEntries(['format24', 'timezone', 'source', 'manualTime', 'autoDemo', 'demoInterval'].map(key => [key, base[key]])),
    customGeometry: checkbox('启用自定义尺寸与指针', 'geometry', '关闭时每款自动使用自身尺寸与指针参数；开启后使用下方数值。'),
    ...geometryFields
  };
  const groups = { edition: '时钟款式', screen: '大小与位置', colors: '配色', motion: '动作与播放', time: '时间', geometry: '完整自定义：尺寸与指针' };
  const metadata = { AppVersion: '2.2.1.0', Title: 'TIMEFORM · 30 款时钟 · 本地测试版',
    Desc: '圆形、横屏、竖排共 30 款时钟，统一下拉选择。包含最新的长短针比例、闲置显隐及动作修正，离线运行。',
    Author: 'TIMEFORM', Type: 1, FileName: 'index.html', IsAbsolutePath: false, Thumbnail: 'thumbnail.jpg', Preview: null,
    Arguments: '--pause-event true', Contact: 'https://github.com/XXXDDD/clockclock24', License: null, Version: 6 };
  function normalize(input = {}, previous = {}) { return Config.normalize(fields, input, previous); }
  const defaults = normalize();
  function decodeProperty(key, value) {
    const field = fields[key];
    if (!field) return undefined;
    if (field.type === 'select' && typeof value !== 'boolean' && value !== '' && value !== null && Number.isInteger(Number(value))) value = field.options[Number(value)]?.[0];
    return Config.decode(field, value, true);
  }
  function resolve(input) {
    const config = normalize(input), model = get(config.edition), patch = {};
    for (const key of ['scale', 'padding', 'offsetX', 'offsetY', 'playbackSpeed', 'format24', 'timezone', 'source', 'manualTime', 'autoDemo', 'demoInterval']) patch[key] = config[key];
    if (config.customColors) for (const key of ['background', 'board', 'long', 'short']) patch[key] = config[key];
    if (config.customGeometry) for (const key of geometryKeys) if (model.Settings.fields[key]) patch[key] = config[key];
    if (config.visibility !== 'default' && model.Settings.fields.visibility) patch.visibility = config.visibility;
    const [group, action] = config.action.split(':');
    if (group === model.group && model.Settings.fields.choreography?.options.some(option => option[0] === action)) patch.choreography = action;
    if (patch.choreography && patch.choreography !== model.Settings.defaults.choreography) {
      const motion = model.getMotion?.({ ...model.Settings.defaults, ...patch });
      // The 24-series shares three motions with a 42-second CCL reference.
      patch.duration = motion?.duration || 42;
    }
    if (config.customDuration) patch.duration = config.duration;
    return { model, settings: model.Settings.normalize(patch) };
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
    if (data.version === 2) {
      const catalog = catalogs.find(item => item.get(data.model));
      if (!catalog) throw new Error('无法识别此配置的时钟款式。');
      const { model, settings } = catalog.parse(text);
      return normalize({ ...settings, edition: model.id, customColors: true, customGeometry: true, customDuration: true,
        action: settings.choreography ? model.group + ':' + settings.choreography : 'default' });
    }
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
