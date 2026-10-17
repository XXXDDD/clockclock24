(function (root, factory) {
  const cjs = typeof module === 'object' && module.exports;
  const api = factory(cjs ? require('../../core/presentation-config.js') : root.Timeform.PresentationConfig,
    cjs ? require('../../shared/config.js') : root.Timeform.Config);
  if (cjs) module.exports = api;
  else root.Timeform.WallpaperEngine = api;
})(globalThis, function (Spec, Config) {
  'use strict';
  function decode(key, value) {
    const field = Spec.fields[key];
    if (!field) return undefined;
    if (field.type === 'color') {
      if (typeof value !== 'string' || !value.trim()) return undefined;
      const parts = value.trim().split(/\s+/).map(Number);
      if (parts.length !== 3 || parts.some(n => !Number.isFinite(n) || n < 0 || n > 1)) return undefined;
      value = '#' + parts.map(n => Math.round(n * 255).toString(16).padStart(2, '0')).join('');
    }
    return Config.decode(field, value, true);
  }
  function create(session) {
    return {
      applyUserProperties(properties) {
        if (session.disposed || !properties || typeof properties !== 'object' || Array.isArray(properties)) return false;
        const patch = {};
        for (const [key, property] of Object.entries(properties)) {
          const value = decode(key, property?.value);
          if (value !== undefined) patch[key] = value;
        }
        if (!Object.keys(patch).length) return false;
        // Apply one native batch atomically, including edition and its overrides.
        session.updateConfig(patch); return true;
      },
      setPaused: value => session.setSuspended('wallpaper-engine', value)
    };
  }
  const colorValue = hex => [1, 3, 5].map(offset => parseInt(hex.slice(offset, offset + 2), 16) / 255).join(' ');
  function project(input = Spec.defaults) {
    const config = Spec.normalize(input), properties = {};
    for (const [key, field] of Object.entries(Spec.fields)) {
      if (field.hidden) continue;
      const control = { order: Object.keys(properties).length, text: field.label, value: config[key] };
      if (field.type === 'select') Object.assign(control, { type: 'combo', options: field.options.map(([value, label]) => ({ value, label })) });
      else if (field.type === 'number') Object.assign(control, { type: 'slider', min: field.min, max: field.max,
        fraction: field.step < 1, precision: field.step < 1 ? String(field.step).split('.')[1].length : 0 });
      else if (field.type === 'checkbox') control.type = 'bool';
      else if (field.type === 'color') Object.assign(control, { type: 'color', value: colorValue(config[key]) });
      else control.type = 'textinput';
      properties[key] = control;
    }
    return { title: 'TIMEFORM · 30 款时钟', type: 'web', file: 'index.html', preview: 'preview.jpg',
      description: 'TIMEFORM 共享时钟运行时，本地测试包。', general: { properties } };
  }
  return { create, decode, project };
});
