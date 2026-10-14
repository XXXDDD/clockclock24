(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else (root.Timeform ||= {}).Math = api;
})(globalThis, function () {
  'use strict';
  const TAU = Math.PI * 2;
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const wrap = value => ((value % TAU) + TAU) % TAU;
  const normalizeMinutes = value => ((value % 1440) + 1440) % 1440;
  const smooth = value => value * value * (3 - 2 * value);
  const fadeEase = value => value * value * value * (value * (value * 6 - 15) + 10);
  function tween(now, start, end, from, to) {
    const progress = end <= start ? Number(now >= end) : clamp((now - start) / (end - start), 0, 1);
    return from + (to - from) * fadeEase(progress);
  }
  return { TAU, clamp, wrap, normalizeMinutes, smooth, tween };
});
