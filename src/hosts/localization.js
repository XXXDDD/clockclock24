(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else (root.Timeform ||= {}).Localization = api;
})(globalThis, function () {
  'use strict';
  const language = value => /^zh(?:-|$)/i.test(String(value || '')) ? 'zh-CN' : 'en';
  const labels = {
    appearance: 'Dial lighting', handAppearance: 'Hand appearance',
    edition: 'Clock design (all 30 editions)', scale: 'Size', padding: 'Safe margin', offsetX: 'Horizontal position', offsetY: 'Vertical position',
    customColors: 'Use custom colors', background: 'Background', board: 'Clock face', long: 'Long hand', short: 'Short hand',
    action: 'Motion', customDuration: 'Use custom motion duration', duration: 'Motion duration', visibility: 'Idle hands',
    playbackSpeed: 'Playback speed', paused: 'Pause', format24: '24-hour time', timezone: 'Time zone', source: 'Time source',
    manualTime: 'Set time', autoDemo: 'Advance one minute automatically', demoInterval: 'Demo interval',
    customGeometry: 'Customize dimensions and hands', radius: 'Dial radius', gap: 'Dial spacing', longLength: 'Long hand length',
    shortLength: 'Short hand length', longWidth: 'Long hand width', shortWidth: 'Short hand width',
    centerHourLength: 'Center hour hand ratio', safeTop: 'Top safe area', safeBottom: 'Bottom safe area'
  };
  const help = {
    appearance: 'By default, black and white use original lighting and colored dials use sculpted lighting. Manual overrides are available.',
    handAppearance: 'By default, metal hands use reflections and ordinary hands retain their original appearance. Highlights vary with position and direction under one light.',
    customColors: 'Off uses the selected design\'s original colors. Turn on to use the four colors below.',
    action: 'Uses the original motion by default. Extra motions apply only to the model named in the option.',
    customDuration: 'Off uses the reference duration for the selected design or motion.',
    duration: 'Applies when custom motion duration is enabled.',
    visibility: 'Both hands on idle dials fade together. Hands that form the time remain visible, including overlapping hands.',
    timezone: 'Leave blank to follow your device, for example Asia/Hong_Kong.',
    demoInterval: 'The complete motion finishes and holds the time for at least 2 seconds before advancing another minute.',
    customGeometry: 'Off uses each design\'s original dimensions and hand proportions. Turn on to use the values below.'
  };
  const geometryHelp = 'Applies when custom dimensions are enabled. Values are limited to the selected model\'s supported range.';
  const groups = { edition: 'Clock design', screen: 'Size and position', colors: 'Colors', motion: 'Motion and playback', time: 'Time', geometry: 'Dimensions and hands' };
  const words = {
    '原有效果': 'Original appearance', '立体光影': 'Sculpted lighting',
    '随光影模式': 'Follow lighting mode', '原有指针': 'Original hands', '材质与反光': 'Material and reflections',
    '按材质（默认）': 'By material (default)', '按指针材质（默认）': 'By hand material (default)',
    '横屏': 'Landscape', '圆形': 'Circular', '竖排': 'Portrait', '当前预设原动作': 'Original motion', '当前预设默认': 'Original setting',
    '随归位隐藏': 'Hide after settling', '微光显示': 'Dim idle hands', '全部显示': 'Show all hands', '设备时间': 'Device time', '指定时间': 'Set time',
    '交错旋转': 'Staggered rotation', '斜线波浪': 'Diagonal wave', '潮汐波浪': 'Tidal wave', '向心涟漪': 'Radial ripples',
    '横向风势': 'Horizontal wind', '风势流动': 'Flowing wind', '环弧波浪': 'Circular waves', '错相旋转': 'Phased rotation', '双速归位': 'Two-speed settling',
    '列间相位 · 双速成型': 'Phased columns · two-speed settling', '设计单位': 'design units', '倍': '×', '24 系列': '24 series'
  };
  function text(value, locale = 'en') {
    if (language(locale) === 'zh-CN' || typeof value !== 'string') return value;
    let result = value;
    for (const [source, target] of Object.entries(words).sort((a, b) => b[0].length - a[0].length)) result = result.split(source).join(target);
    return result;
  }
  function field(key, original, locale = 'en') {
    if (language(locale) === 'zh-CN') return original;
    if (!labels[key]) throw new Error('Missing English field: ' + key);
    return { ...original, label: labels[key], unit: text(original.unit, locale),
      ...(original.help ? { help: help[key] || geometryHelp } : {}),
      ...(original.options ? { options: original.options.map(([value, title]) => [value, text(title, locale)]) } : {}) };
  }
  function group(key, original, locale = 'en') { return language(locale) === 'zh-CN' ? original : groups[key]; }
  const ui = {
    title: ['TIMEFORM · Wallpaper settings', 'TIMEFORM · 壁纸设置'], badge: ['LIVELY / OFFLINE', 'LIVELY / 离线运行'],
    collectionEyebrow: ['THE COMPLETE COLLECTION / 30 EDITIONS', '30 款完整系列'], settingsEyebrow: ['WALLPAPER SETTINGS', '壁纸设置'],
    clockDescription: ['{name}, showing {time}', '{name}，现在显示 {time}'],
    preview: ['Wallpaper preview ↗', '纯壁纸预览 ↗'], settings: ['Wallpaper settings', '壁纸设置'], collection: ['30 editions', '30 款全集'],
    count: ['{count} dials', '{count} 个表盘'], pairs: ['9 pairs of hands', '9 组双针'], pause: ['Pause', '暂停'], resume: ['Resume', '继续'],
    replay: ['Replay motion', '重播动作'], settle: ['Show current time', '立即归位'], step: ['Step', '单步'], ready: ['Ready', '已归位'],
    inMotion: ['In motion', '过渡中'], paused: ['Paused', '已暂停'], counts: ['3 circular · 23 landscape · 4 portrait', '圆形 3 款 · 横屏 23 款 · 竖排 4 款'],
    instructions: ['Export the wallpaper ZIP, drag it into Lively, then open Customize on its card. All clocks work offline.', '调好后导出壁纸包，把 ZIP 拖进 Lively，再从壁纸卡片的「自定义」调整。全部时钟可离线运行。'],
    screen: ['Size and position', '大小与位置'], colors: ['Colors', '配色'], motion: ['Motion and playback', '动作与播放'], time: ['Time', '时间'],
    geometry: ['Dimensions and hands', '尺寸与指针'], reset: ['Restore this design', '恢复当前款式默认设置'], export: ['Export settings', '导出配置'], import: ['Import settings', '导入配置'],
    importHint: ['Import wallpaper settings or a single-design JSON from the workbench.', '支持本壁纸配置，以及网页版导出的单款 JSON。'],
    download: ['Export Lively wallpaper ZIP ↓', '导出 Lively 壁纸包 ↓'], saved: ['Settings are saved in this browser. Export a new ZIP to use them in Lively.', '配置保存在本地浏览器，导出新包后可在 Lively 使用。'],
    return: ['Return to settings', '返回壁纸设置'], resolution: ['Preview screen size', '预览屏幕尺寸'], language: ['Language', '语言'],
    landscape: ['Landscape', '横屏'], portrait: ['Portrait', '竖屏'], ultrawide: ['Ultrawide', '超宽屏'], square: ['Square', '方屏'], window: ['Current window', '当前窗口'],
    action: ['Motion: {name} · {duration} s', '当前动作：{name} · {duration} 秒'], originalMotion: ['Original motion', '原作动作'],
    invalid: ['Invalid value for {field}. Check the format and range.', '「{field}」格式或范围无效。'], slider: ['{field} slider', '{field}滑块'],
    timezonePlaceholder: ['Device time zone, e.g. Asia/Hong_Kong', '跟随设备，例如 Asia/Hong_Kong'],
    exported: ['Exported. Drag the new ZIP into Lively to import it as a new wallpaper.', '已导出，请将新 ZIP 拖入 Lively，导入为一张新壁纸。'],
    imported: ['Settings imported. You can now export the wallpaper ZIP.', '配置已导入，可以导出壁纸包。'],
    resetDone: ['Restored the selected design\'s defaults.', '已恢复当前款式默认设置。'], tooLarge: ['Choose a settings file smaller than 64 KB.', '请选择小于 64 KB 的配置。'],
    invalidConfig: ['Choose a valid TIMEFORM settings file.', '请选择有效的 TIMEFORM 配置。'],
    unknownConfig: ['Choose settings from the 30-edition wallpaper or a single-design JSON from the workbench.', '请选择 30 款壁纸配置，或网页版导出的单款 JSON。'],
    unknownEdition: ['This clock design is not recognized.', '无法识别此配置的时钟款式。'],
    invalidField: ['Invalid setting: {field}.', '「{field}」无效。']
  };
  function t(key, locale = 'en', values = {}) {
    if (!ui[key]) throw new Error('Missing interface translation: ' + key);
    return ui[key][language(locale) === 'zh-CN' ? 1 : 0].replace(/\{(\w+)\}/g, (_, name) => String(values[name] ?? ''));
  }
  function error(message, locale = 'en', fields = {}) {
    if (language(locale) === 'zh-CN') return message;
    for (const [key, pair] of Object.entries(ui)) if (pair[1] === message) return pair[0];
    if (/无法识别此配置版本/.test(message)) return t('unknownConfig', locale);
    const match = /「(.+?)」/.exec(message);
    if (match) {
      const key = Object.keys(fields).find(key => fields[key].label === match[1]);
      return t('invalidField', locale, { field: labels[key] || match[1] });
    }
    return 'Unable to import these settings. Check that the file is a valid TIMEFORM JSON.';
  }
  return { language, text, field, group, t, error, labels };
});
