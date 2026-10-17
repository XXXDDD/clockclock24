(function (root, factory) {
  const commonJS = typeof module === 'object' && module.exports;
  const api = factory(commonJS ? require('../../shared/config.js') : root.Timeform.Config,
    commonJS ? require('../../shared/palette.js') : root.Timeform.Palette);
  if (typeof module === 'object' && module.exports) module.exports = api;
  else (root.Timeform ||= {}).ClockClock24Settings = api;
})(globalThis, function (Config, Palette) {
  'use strict';
  const number = (label, value, min, max, step, unit, group) => ({ type: 'number', label, value, min, max, step, unit, group });
  const fields = {
    ...Palette.fields,
    canvasWidth: number('画布宽度', 1920, 240, 7680, 1, 'px', 'screen'),
    canvasHeight: number('画布高度', 1080, 240, 7680, 1, 'px', 'screen'),
    scale: number('整体缩放', 90, 20, 100, 1, '%', 'screen'),
    padding: number('画布安全边距', 0, 0, 160, 1, 'px', 'screen'),
    offsetX: number('水平位置', 0, -100, 100, 1, '%', 'screen'),
    offsetY: number('垂直位置', 0, -100, 100, 1, '%', 'screen'),
    radius: number('表盘半径', 53.2, 20, 80, .1, '设计单位', 'geometry'),
    gap: number('表盘间隙', 7.6, 0, 40, .1, '设计单位', 'geometry'),
    longLength: number('长针长度', 100, 70, 100, 1, '%', 'geometry'),
    shortLength: number('短针长度', 100, 55, 100, 1, '%', 'geometry'),
    longWidth: number('长针粗细', 9.3, 2, 14, .1, '设计单位', 'geometry'),
    shortWidth: number('短针粗细', 9.3, 2, 14, .1, '设计单位', 'geometry'),
    motion: { type: 'select', label: '换时动画', value: 'wave', options: [['wave', '斜线列波 · 参考编排'], ['spin', '经典旋转'], ['quiet', '平滑过渡'], ['none', '立即换时']], group: 'motion' },
    duration: { ...number('完整编排时长', 40.1, 1, 120, .1, 's', 'motion'), help: '原片约 40.08 秒；整条时间线同比缩放，可用参考节奏按钮恢复 40.1 秒。' },
    visibility: { type: 'select', label: '闲置指针', value: 'show', options: [['hide', '归位后隐藏'], ['ghost', '微光显示'], ['show', '全部显示']], group: 'motion' },
    playbackSpeed: number('调试播放速度', 1, .1, 3, .1, '倍', 'motion'),
    format24: { type: 'checkbox', label: '24 小时制', value: true, group: 'time' },
    timezone: { type: 'timezone', label: '时区', value: '', group: 'time', help: '留空跟随设备，例如 Asia/Hong_Kong。' },
    source: { type: 'select', label: '时间来源', value: 'live', options: [['live', '设备时间'], ['manual', '指定时间']], group: 'time' },
    manualTime: { type: 'time', label: '指定时间', value: '09:34', group: 'time' },
    autoDemo: { type: 'checkbox', label: '指定时间自动逐分钟切换', value: false, group: 'time' },
    demoInterval: number('自动切换间隔', 5, 1, 20, .1, 's', 'time')
  };
  function normalize(input = {}, base = {}) {
    const settings = Config.normalize(fields, input, base);
    settings.shortLength = Math.min(settings.shortLength, settings.longLength);
    return settings;
  }
  return { fields, defaults: normalize(), normalize };
});
