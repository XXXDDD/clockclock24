(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.TimeformGallery = api;
})(globalThis, function () {
  'use strict';
  // Centimetres, from src/models/geometry-reference.md and the individual edition designs.
  const sizes = {
    clockclock9: [46, 46], amt61c: [146, 146],
    clockclock24: [90, 40], clockclockl: [157, 72],
    amt72: [173, 95], amt96: [177, 125], amt120: [212, 121],
    amt144: [262.4, 130.4], amt288: [345.6, 187.2], amt72v: [95, 173]
  };
  function physicalSize(model) {
    if (model.id === 'clockclock24-bjarke-ingels') return [92, 42];
    const size = sizes[model.family || model.group || model.id];
    if (!size) throw new Error('Missing display dimensions for ' + model.id);
    return size;
  }
  function displaySize(model, width, height, compact = false) {
    const [physicalWidth, physicalHeight] = physicalSize(model);
    const longest = Math.max(physicalWidth, physicalHeight);
    // Compress the physical size range so small pieces stay readable while larger ones retain weight.
    const reference = compact && model.type === 'portrait' ? [95, 173]
      : compact && model.type === 'circular' ? [146, 146] : [345.6, 187.2];
    const exponent = compact ? .30 : .45;
    const boost = Math.pow(Math.max(...reference) / longest, 1 - exponent);
    const pixelsPerCm = Math.min(width / reference[0], height / reference[1]) * .94;
    const wantedWidth = physicalWidth * pixelsPerCm * boost;
    const wantedHeight = physicalHeight * pixelsPerCm * boost;
    const fit = Math.min(1, width * .94 / wantedWidth, height * .94 / wantedHeight);
    return { width: wantedWidth * fit, height: wantedHeight * fit };
  }
  function icon(model) {
    const [width, height] = physicalSize(model);
    const longest = Math.max(width, height);
    const extent = 48 * Math.pow(longest / 345.6, .65);
    const w = extent * width / longest, h = extent * height / longest;
    const x = (56 - w) / 2, y = (52 - h) / 2;
    let shape = model.type === 'circular'
      ? `<circle cx="28" cy="${y + h / 2}" r="${w / 2}"/>`
      : `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx=".65"/>`;
    const columns = Math.min(model.columns || 3, 8), rows = Math.min(model.rows || 3, 4);
    for (let row = 0; row < rows; row++) for (let column = 0; column < columns; column++) {
      const cx = x + w * (.2 + .6 * column / Math.max(1, columns - 1));
      const cy = y + h * (.2 + .6 * row / Math.max(1, rows - 1));
      if (model.type !== 'circular' || Math.hypot(cx - 28, cy - y - h / 2) < w * .36) {
        shape += `<circle class="icon-cell" cx="${cx}" cy="${cy}" r=".55"/>`;
      }
    }
    return `<svg viewBox="0 0 56 52" aria-hidden="true">${shape}</svg>`;
  }
  function previousMinute(date = new Date()) {
    const minute = (date.getHours() * 60 + date.getMinutes() + 1439) % 1440;
    return String(Math.floor(minute / 60)).padStart(2, '0') + ':' + String(minute % 60).padStart(2, '0');
  }
  function fullscreenGeometry(geometry, width, height) {
    const scale = geometry.width / geometry.boardWidth;
    const boardWidth = width / scale, boardHeight = height / scale;
    const x = (boardWidth - geometry.boardWidth) / 2, y = (boardHeight - geometry.boardHeight) / 2;
    return { ...geometry, x: 0, y: 0, width, height, boardWidth, boardHeight,
      points: geometry.points.map(point => ({ ...point, x: point.x + x, y: point.y + y })) };
  }
  function config(model, patch = {}) {
    return {
      ...model.Settings.defaults,
      edition: model.id,
      // The gallery owns the surrounding space; the original board geometry is retained.
      customGeometry: true, safeTop: 0, safeBottom: 0,
      scale: 100, padding: 0, offsetX: 0, offsetY: 0,
      source: 'live', timezone: '', autoDemo: false, paused: false,
      ...patch
    };
  }
  function beginLive(preview, date = new Date()) {
    // Seed the real previous minute, then let the existing runtime target live time.
    // Subsequent minute boundaries are entirely owned by the runtime's live clock.
    preview.updateConfig({ source: 'manual', manualTime: previousMinute(date), autoDemo: false });
    preview.command('settle');
    preview.updateConfig({ source: 'live' });
  }
  return { physicalSize, displaySize, icon, previousMinute, fullscreenGeometry, config, beginLive };
});
