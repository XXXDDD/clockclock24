(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.TimeformSettings = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  // One schema drives the web editor, Lively controls, URL parameters and exports.
  const fields = {
    background: { type: 'color', text: '屏幕背景', value: '#000000', group: 'colors' },
    board: { type: 'color', text: '时钟背景板', value: '#111213', group: 'colors' },
    long: { type: 'color', text: '长针颜色', value: '#f9faf7', group: 'colors' },
    short: { type: 'color', text: '短针颜色', value: '#eef0ec', group: 'colors' },
    layout: { type: 'dropdown', text: '数字排列', value: 'auto', values: ['auto', 'landscape', 'portrait'], items: ['自动适配', '横排 HHMM', '上下两排 HH / MM'], group: 'screen' },
    scale: { type: 'slider', text: '时钟大小', min: 20, max: 100, step: 1, value: 90, unit: '%', group: 'screen' },
    padding: { type: 'slider', text: '屏幕安全边距', min: 0, max: 160, step: 1, value: 0, unit: 'px', group: 'screen' },
    offsetX: { type: 'slider', text: '水平位置', min: -100, max: 100, step: 1, value: 0, unit: '%', help: '负值向左，正值向右；始终保留完整时钟。', group: 'screen' },
    offsetY: { type: 'slider', text: '垂直位置', min: -100, max: 100, step: 1, value: 0, unit: '%', help: '负值向上，正值向下；始终保留完整时钟。', group: 'screen' },
    motion: { type: 'dropdown', text: '换时动画', value: 'spin', values: ['spin', 'quiet', 'none'], items: ['经典旋转', '平滑过渡', '立即换时'], group: 'motion' },
    duration: { type: 'slider', text: '动画时长', min: 1, max: 10, step: 1, value: 4, unit: 's', group: 'motion' },
    visibility: { type: 'dropdown', text: '闲置指针', value: 'hide', values: ['hide', 'ghost', 'show'], items: ['归位后隐藏', '微光显示', '全部显示'], group: 'motion' },
    longLength: { type: 'slider', text: '长针长度', min: 70, max: 100, step: 1, value: 100, unit: '%', group: 'motion' },
    shortLength: { type: 'slider', text: '短针长度', min: 55, max: 100, step: 1, value: 100, unit: '%', group: 'motion' },
    format24: { type: 'checkbox', text: '24 小时制', value: true, group: 'time' },
    timezone: { type: 'textbox', text: '时区', value: '', help: '留空跟随电脑；也可填 Asia/Hong_Kong、Europe/London 等。', group: 'time' }
  };
  const defaults = Object.fromEntries(Object.entries(fields).map(([key, field]) => [key, field.value]));
  const metadata = { AppVersion: '2.2.1.0', Title: 'TIMEFORM · 可定制时钟', Desc: '24 表盘时钟；颜色、位置、动画可独立设置，自动适配横屏、竖屏和超宽屏。完全离线。', Author: 'TIMEFORM', Type: 1, FileName: 'index.html', IsAbsolutePath: false, Thumbnail: 'thumbnail.jpg', Preview: null, Arguments: null, Contact: 'https://github.com/XXXDDD/clockclock24', License: null, Version: 2 };
  const presets = [
    { name: '经典黑', board: '#111213', long: '#f9faf7', short: '#eef0ec', background: '#000000' },
    { name: '经典白', board: '#f6f4ef', long: '#50534f', short: '#757873', background: '#e9e6de' },
    { name: '苔原', board: '#3d493f', long: '#f3f1e7', short: '#bfcdb0', background: '#171e19' },
    { name: '纸与墨', board: '#e9e6de', long: '#2a312b', short: '#858775', background: '#d3d0c7' },
    { name: '暮色', board: '#393746', long: '#cecce6', short: '#e8a991', background: '#17151e' },
    { name: '深海', board: '#21444c', long: '#e7e9dd', short: '#91c1c6', background: '#0a1b20' },
    { name: '赤陶', board: '#a95441', long: '#f6ecdc', short: '#e8bd90', background: '#301c19' },
    { name: '午夜', board: '#232624', long: '#dfc797', short: '#f1efe2', background: '#080b09' }
  ];
  function decode(key, value) {
    const field = fields[key];
    if (!field) return undefined;
    if (field.type === 'color') {
      if (typeof value !== 'string') return undefined;
      const hex = value.startsWith('#') ? value : '#' + value;
      return /^#[0-9a-f]{6}$/i.test(hex) ? hex.toLowerCase() : undefined;
    }
    if (field.type === 'slider') {
      if (value === '' || value === null || typeof value === 'boolean') return undefined;
      const number = Number(value);
      return Number.isFinite(number) ? Math.round(Math.max(field.min, Math.min(field.max, number)) / field.step) * field.step : undefined;
    }
    if (field.type === 'dropdown') {
      if (field.values.includes(value)) return value;
      // Lively sends dropdown item indexes, including on first load.
      if (typeof value !== 'boolean' && value !== '' && value !== null && Number.isInteger(Number(value))) return field.values[Number(value)];
      return undefined;
    }
    if (field.type === 'checkbox') {
      if (value === true || value === 'true' || value === '1' || value === 1) return true;
      if (value === false || value === 'false' || value === '0' || value === 0) return false;
      return undefined;
    }
    if (key === 'timezone' && typeof value === 'string') {
      const zone = value.trim();
      try { if (zone) new Intl.DateTimeFormat('en', { timeZone: zone }); return zone; }
      catch (_) { return undefined; }
    }
    return undefined;
  }
  function normalize(input = {}, base = defaults) {
    const result = { ...defaults, ...base };
    for (const key of Object.keys(fields)) {
      const value = decode(key, input[key]);
      if (value !== undefined) result[key] = value;
    }
    result.shortLength = Math.min(result.shortLength, result.longLength);
    return Object.fromEntries(Object.keys(fields).map(key => [key, result[key]]));
  }
  function fromSearch(search) {
    return Object.fromEntries([...new URLSearchParams(search)].filter(([key]) => Object.hasOwn(fields, key)));
  }
  function toSearch(config, base = defaults) {
    const values = normalize(config), initial = normalize(base);
    const parameters = new URLSearchParams();
    for (const [key, value] of Object.entries(values)) {
      if (value !== initial[key]) parameters.set(key, typeof value === 'string' ? value.replace(/^#/, '') : String(value));
    }
    return parameters.toString();
  }
  function livelyProperties(config = defaults) {
    const values = normalize(config);
    return Object.fromEntries(Object.entries(fields).map(([key, field]) => {
      const { group, values: choices, unit, ...control } = field;
      control.value = choices ? choices.indexOf(values[key]) : values[key];
      return [key, control];
    }));
  }
  function importConfig(text) {
    const data = JSON.parse(text);
    if (!data || data.version !== 1 || !data.settings || typeof data.settings !== 'object' || Array.isArray(data.settings)) throw new Error('请选择 TIMEFORM 导出的第 1 版配色配置。');
    for (const key of Object.keys(fields)) {
      if (Object.hasOwn(data.settings, key) && decode(key, data.settings[key]) === undefined) throw new Error('配置中的「' + fields[key].text + '」无效。');
    }
    return normalize(data.settings);
  }
  function exportConfig(config) { return JSON.stringify({ version: 1, settings: normalize(config) }, null, 2); }
  function geometry(width, height, input = defaults) {
    const config = normalize(input);
    width = Math.max(1, Number(width) || 1); height = Math.max(1, Number(height) || 1);
    const padding = Math.min(config.padding, (width - 1) / 2, (height - 1) / 2);
    const availableWidth = (width - padding * 2) * config.scale / 100;
    const availableHeight = (height - padding * 2) * config.scale / 100;
    const shapes = { landscape: { w: 1000, h: 445 }, portrait: { w: 552, h: 805 } };
    const fit = shape => Math.min(availableWidth / shape.w, availableHeight / shape.h);
    const layout = config.layout === 'auto' ? (fit(shapes.portrait) > fit(shapes.landscape) ? 'portrait' : 'landscape') : config.layout;
    const shape = shapes[layout], factor = fit(shape), w = shape.w * factor, h = shape.h * factor;
    const x = (width - w) / 2 + (width - padding * 2 - w) / 2 * config.offsetX / 100;
    const y = (height - h) / 2 + (height - padding * 2 - h) / 2 * config.offsetY / 100;
    const points = [];
    for (let digit = 0; digit < 4; digit++) for (let cell = 0; cell < 6; cell++) {
      const originalRow = Math.floor(cell / 2), originalCol = digit * 2 + cell % 2;
      const col = layout === 'portrait' ? (digit % 2) * 2 + cell % 2 : originalCol;
      const row = layout === 'portrait' ? Math.floor(digit / 2) * 3 + originalRow : originalRow;
      points.push({ x: 105 + col * 112, y: 110 + row * 112 + (layout === 'portrait' && digit >= 2 ? 24 : 0), i: (originalRow * 8 + originalCol) * 2 });
    }
    return { layout, x, y, width: w, height: h, boardWidth: shape.w, boardHeight: shape.h, points, padding };
  }
  return { fields, defaults, metadata, presets, decode, normalize, fromSearch, toSearch, livelyProperties, importConfig, exportConfig, geometry };
});
