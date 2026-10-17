(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else (root.Timeform ||= {}).Config = api;
})(globalThis, function () {
  'use strict';
  function decode(field, value, strict = false) {
    if (value === undefined || value === null) return undefined;
    if (field.type === 'color') {
      if (typeof value !== 'string') return undefined;
      const color = value.startsWith('#') ? value : '#' + value;
      return /^#[0-9a-f]{6}$/i.test(color) ? color.toLowerCase() : undefined;
    }
    if (field.type === 'number') {
      if (value === '' || typeof value === 'boolean' || !['string', 'number'].includes(typeof value)) return undefined;
      let number = Number(value);
      if (!Number.isFinite(number) || (strict && (number < field.min || number > field.max))) return undefined;
      number = Math.max(field.min, Math.min(field.max, number));
      return Number((Math.round((number - field.min) / field.step) * field.step + field.min).toFixed(6));
    }
    if (field.type === 'select') return field.options.some(option => option[0] === value) ? value : undefined;
    if (field.type === 'checkbox') {
      if ([true, 'true', '1', 1].includes(value)) return true;
      if ([false, 'false', '0', 0].includes(value)) return false;
      return undefined;
    }
    if (field.type === 'time') return typeof value === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(value) ? value : undefined;
    if (field.type === 'timezone' && typeof value === 'string') {
      const zone = value.trim();
      try { if (zone) new Intl.DateTimeFormat('en', { timeZone: zone }); return zone; } catch (_) { return undefined; }
    }
    return undefined;
  }
  function normalize(fields, input = {}, base = {}) {
    return Object.fromEntries(Object.entries(fields).map(([key, field]) => [key, decode(field, input[key]) ?? decode(field, base[key]) ?? field.value]));
  }
  function serialize(model, settings) {
    return JSON.stringify({ version: 2, handGeometryVersion: 1, type: model.type, model: model.id, settings: model.Settings.normalize(settings) }, null, 2);
  }
  function parse(model, text) {
    const data = JSON.parse(text);
    if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error('请选择有效的 TIMEFORM 配置。');
    let input;
    if (data.version === 2) {
      if (data.type !== model.type || data.model !== model.id) throw new Error('配置所属种类或型号与当前页面不一致。');
      input = data.settings;
    } else if (data.version === 1) input = data.settings;
    else if (data.version === undefined && typeof data.board === 'string') input = data;
    else throw new Error('无法识别此配置版本。');
    if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('配置参数格式无效。');
    input = { ...input };
    if (data.version !== 2 && ['wave', 'orbit'].includes(input.motion)) input.motion = 'spin';
    for (const [key, field] of Object.entries(model.Settings.fields)) {
      if (Object.hasOwn(input, key) && decode(field, input[key], true) === undefined) throw new Error('「' + field.label + '」无效，请检查单位和范围。');
    }
    // Old saves wrote the former equal-length defaults into every snapshot.
    // Upgrade that exact pair once; preserve other custom lengths and newly
    // exported equal-length configurations, which carry this revision marker.
    if (data.handGeometryVersion === undefined && Number(input.longLength) === 100 && Number(input.shortLength) === 100) {
      input.shortLength = model.Settings.defaults.shortLength;
      if (model.id === 'clockclock9' && Number(input.centerHourLength) === 82) input.centerHourLength = model.Settings.defaults.centerHourLength;
    }
    return model.Settings.normalize(input);
  }
  return { decode, normalize, serialize, parse };
});
