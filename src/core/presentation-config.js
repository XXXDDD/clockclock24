(function (root, factory) {
  const cjs = typeof module === 'object' && module.exports;
  const api = factory(cjs ? require('../catalog/classic.js') : root.Timeform.Classic,
    cjs ? require('../models/landscape.js') : root.Timeform.Landscape,
    cjs ? require('../models/circular.js') : root.Timeform.Circular,
    cjs ? require('../models/portrait.js') : root.Timeform.Portrait,
    cjs ? require('../shared/config.js') : root.Timeform.Config,
    cjs ? require('../shared/borderless.js') : root.Timeform.Borderless);
  if (cjs) module.exports = api;
  else root.Timeform.PresentationConfig = api;
})(globalThis, function (Classic, Landscape, Circular, Portrait, Config, Borderless) {
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
    // The workbench exposes appearance experiments; portable settings retain
    // the selection without adding experimental controls to native host menus.
    appearance: { ...base.appearance, group: 'motion', hidden: true },
    handAppearance: { ...base.handAppearance, group: 'motion', hidden: true },
    borderless: checkbox('板面铺满屏幕', 'screen', '板面铺满屏幕，表盘等比适配；仍可调整缩放、留白和位置。画布背景被板面覆盖，请用背景板颜色换色。'),
    ...Object.fromEntries(['scale', 'padding', 'offsetX', 'offsetY'].map(key => [key, base[key]])),
    customColors: checkbox('启用自定义配色', 'colors', '关闭时使用所选款式的原作配色；开启后使用下方四项颜色。'),
    ...Object.fromEntries(['background', 'board', 'long', 'short'].map(key => [key, base[key]])),
    background: { ...base.background, help: '板面铺满屏幕时，画布背景被覆盖；请调整背景板颜色。' },
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
  function normalize(input = {}, previous = {}) { return Config.normalize(fields, input, previous); }
  const defaults = normalize();
  function resolve(input) {
    const config = normalize(input), model = get(config.edition), patch = {};
    for (const key of ['appearance', 'handAppearance', 'scale', 'padding', 'offsetX', 'offsetY', 'playbackSpeed', 'format24', 'timezone', 'source', 'manualTime', 'autoDemo', 'demoInterval']) patch[key] = config[key];
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
    return { model: config.borderless ? Borderless.wrap(model) : model, settings: model.Settings.normalize(patch) };
  }
  function serialize(input) {
    return JSON.stringify({ schema: 'timeform.presentation', version: 1, handGeometryVersion: 1, settings: normalize(input) }, null, 2);
  }
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
    if (data.schema !== 'timeform.presentation' || data.version !== 1 || data.handGeometryVersion !== 1
      || !data.settings || typeof data.settings !== 'object' || Array.isArray(data.settings)) throw new Error('无法识别此 TIMEFORM 配置版本。');
    for (const [key, field] of Object.entries(fields)) if (Object.hasOwn(data.settings, key)
      && Config.decode(field, data.settings[key], true) === undefined) throw new Error('「' + field.label + '」无效。');
    return normalize(data.settings);
  }
  return { models, get, label, categories, fields, groups, geometryKeys, defaults, normalize, resolve, serialize, parse };
});
