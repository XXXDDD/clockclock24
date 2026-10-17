(function (root, factory) {
  const commonJS = typeof module === 'object' && module.exports;
  const api = factory(commonJS ? require('../shared/config.js') : root.Timeform.Config,
    commonJS ? require('./reference-motion.js') : root.Timeform.ReferenceMotion);
  if (commonJS) module.exports = api;
  else (root.Timeform ||= {}).SharedActions = api;
})(globalThis, function (Config, ReferenceMotion) {
  'use strict';
  // Group by visible choreography, not by color, clip length or timing fit.
  // Every source points at an existing, individually documented implementation.
  const families = {
    amt61c: [
      { id: 'zephyr', name: '风势流动 · Zephyr', sources: ['amt61c'] },
      { id: 'tidal', name: '环弧波浪 · Tidal', sources: ['amt61c-tidal'] }
    ],
    amt72: [
      { id: 'radial', name: '向心涟漪', sources: ['amt72'] },
      { id: 'wind', name: '横向风势', sources: ['amt72-white-sterling'] },
      { id: 'diagonal', name: '斜线波浪', sources: ['amt72-white', 'amt72-black-sterling'] }
    ],
    amt72v: [
      { id: 'phased', name: '错相旋转 · 双速归位', sources: ['amt72v', 'amt72v-tidal'] },
      { id: 'diagonal', name: '斜线波浪', sources: ['amt72v-white', 'amt72v-black'] }
    ]
  };
  const singleNames = { amt120: '环弧波浪', amt144: '斜线波浪', amt288: '环弧波浪' };
  function install(models) {
    const get = id => models.find(model => model.id === id);
    const nativeCreates = new Map(models.map(model => [model.id, model.create]));
    const nativeDefaults = new Map(models.map(model => [model.id, model.Settings.defaults]));
    for (const model of models) {
      const definitions = families[model.group];
      if (!definitions) {
        if (singleNames[model.group]) model.Settings.fields.motion.options = [['wave', singleNames[model.group]]];
        continue;
      }
      const defaultAction = definitions.find(action => action.sources.includes(model.id));
      if (!defaultAction) throw new Error('此预设缺少型号动作归类：' + model.id);
      const actions = definitions.map(action => {
        // Keep a preset's own measured timing when it already has this action.
        // No-video Tidal borrows the original Black Sterling reference explicitly.
        const source = get(action.sources.includes(model.id) && model.motionProvenance !== 'family-default' ? model.id : action.sources[0]);
        if (!source) throw new Error('缺少共享动作来源：' + action.id);
        return { id: action.id, name: action.name, source: source.id, sourceLabel: source.presetLabel,
          duration: nativeDefaults.get(source.id).duration, referenceTime: source.referenceTime,
          referenceDuration: source.referenceDuration, referenceClip: source.referenceClip,
          motionReference: source.motionReference, motionReferenceLabel: source.motionReferenceLabel };
      });
      const original = model.Settings;
      const fields = { ...original.fields,
        motion: { ...original.fields.motion, hidden: true },
        choreography: { type: 'select', label: '动作类型', value: defaultAction.id, group: 'motion',
          options: actions.map(action => [action.id, action.name]),
          help: '同型号预设共享参考动作；切换会载入动作默认时长，配色和尺寸保持不变。' } };
      const normalize = (input = {}, base = {}) => {
        const config = Config.normalize(fields, input, base);
        return { ...original.normalize(config), choreography: config.choreography };
      };
      const Settings = { fields, normalize, defaults: normalize() };
      model.Settings = Settings;
      model.actions = actions;
      model.getMotion = input => actions.find(action => action.id === Settings.normalize(input).choreography);
      model.create = (input, options) => {
        const initial = normalize(input), engines = new Map();
        function resolve(settings) {
          const action = model.getMotion(settings);
          if (!engines.has(action.source)) engines.set(action.source, nativeCreates.get(action.source)(settings, options));
          return engines.get(action.source);
        }
        return ReferenceMotion.connect(resolve, Settings, fields.choreography.options, initial);
      };
    }
  }
  return { install };
});
