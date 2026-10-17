(function (root, factory) {
  const api = factory(typeof module === 'object' && module.exports ? require('./palette.js') : root.Timeform.Palette);
  if (typeof module === 'object' && module.exports) module.exports = api;
  else (root.Timeform ||= {}).SingleClock = api;
})(globalThis, function (Palette) {
  'use strict';
  const TAU = Math.PI * 2;
  function local(context, point) {
    context.save(); context.translate(point.x, point.y); context.scale(point.radius / 53.2, point.radius / 53.2);
  }
  // Draw in the caller's canonical dial coordinates; lighting stays inside the
  // opening, with a quiet floor and a continuous, directionally lit inner wall.
  function drawWhiteRecess(context) {
    context.save();
    context.beginPath(); context.arc(0, 0, 53.2, 0, TAU); context.clip();
    const floor = context.createLinearGradient(0, -53.2, 0, 53.2);
    [[0, '#e8e5df'], [.22, '#edeae4'], [.82, '#f0ede7'], [1, '#f1eee8']]
      .forEach(([stop, color]) => floor.addColorStop(stop, color));
    context.fillStyle = floor; context.fillRect(-53.2, -53.2, 106.4, 106.4);
    const shadow = context.createRadialGradient(2.8, 4, 46, 0, 0, 53.2);
    [[0, '#00000000'], [.65, '#00000002'], [.9, '#00000012'], [1, '#00000032']]
      .forEach(([stop, color]) => shadow.addColorStop(stop, color));
    context.fillStyle = shadow; context.beginPath(); context.arc(0, 0, 53.2, 0, TAU); context.fill();
    const rim = context.createLinearGradient(-20, -53.2, 20, 53.2);
    [[0, '#b3b0a8'], [.4, '#d7d4cd'], [.65, '#f4f2ec'], [1, '#ffffff']]
      .forEach(([stop, color]) => rim.addColorStop(stop, color));
    context.strokeStyle = rim; context.lineWidth = 1.2;
    context.beginPath(); context.arc(0, 0, 52.6, 0, TAU); context.stroke();
    context.restore();
  }
  // Geometry and hand poses are inputs; this component has no time or model state.
  function drawFace(context, point, config) {
    local(context, point);
    const kind = Palette.material(config), white = kind === 'white', black = kind === 'black';
    if (white) { drawWhiteRecess(context); context.restore(); return; }
    const rim = context.createRadialGradient(-11, -17, 3, 0, 0, 55);
    const stops = black ? [[0, '#121415'], [.70, '#0d0f10'], [.94, '#08090a'], [1, '#242628']] : [[0, Palette.tint(config.board, -.06)], [.82, Palette.tint(config.board, -.12)], [.96, Palette.tint(config.board, -.24)], [1, Palette.tint(config.board, .06)]];
    stops.forEach(([offset, color]) => rim.addColorStop(offset, color));
    context.shadowColor = black ? '#000000b8' : '#0000003b'; context.shadowBlur = 7; context.shadowOffsetY = 2;
    context.fillStyle = rim; context.beginPath(); context.arc(0, 0, 53.2, 0, TAU); context.fill();
    context.shadowBlur = 0; context.shadowOffsetY = 0; context.lineWidth = 1;
    context.strokeStyle = '#ffffff13'; context.beginPath(); context.arc(0, 0, 52.2, 0, TAU); context.stroke();
    context.strokeStyle = '#00000018'; context.beginPath(); context.arc(0, 0, 49.5, 0, TAU); context.stroke();
    context.restore();
  }
  function drawHand(context, angle, opacity, secondary, config, referenceReach) {
    if (opacity <= .001) return;
    context.save(); context.globalAlpha = opacity; context.rotate(angle);
    const color = secondary ? config.short : config.long;
    const length = 53.2 * referenceReach * (secondary ? Math.min(config.shortLength, config.longLength) : config.longLength) / 100;
    const width = secondary ? config.shortWidth : config.longWidth;
    const shade = context.createLinearGradient(0, -width / 2, 0, width / 2);
    const kind = Palette.material(config), original = Palette.presets.find(preset => preset.id === 'classic-' + kind);
    if (original && color === (secondary ? original.short : original.long)) {
      shade.addColorStop(0, kind === 'white' ? (secondary ? '#555853' : '#303330') : (secondary ? '#c6c8c6' : '#e8e9e7'));
      shade.addColorStop(.55, color); shade.addColorStop(1, kind === 'white' ? '#383b38' : (secondary ? '#abaeab' : '#c2c5c1'));
    } else { shade.addColorStop(0, Palette.tint(color, .10)); shade.addColorStop(.5, color); shade.addColorStop(1, Palette.tint(color, -.12)); }
    context.shadowColor = '#00000038'; context.shadowBlur = 2; context.shadowOffsetY = 1.3; context.fillStyle = shade;
    Palette.roundRect(context, -1.6, -width / 2, length + 1.6, width, Math.min(1.5, width / 2)); context.fill(); context.restore();
  }
  function drawHands(context, point, poses, config, referenceReach = 49.3 / 53.2) {
    local(context, point);
    // Preserve the original stroke order when the two hands overlap.
    drawHand(context, poses[1].angle, poses[1].opacity, true, config, referenceReach);
    drawHand(context, poses[0].angle, poses[0].opacity, false, config, referenceReach);
    const opacity = Math.max(poses[0].opacity, poses[1].opacity);
    if (opacity > .001) {
      context.globalAlpha = opacity; context.fillStyle = config.long; context.beginPath(); context.arc(0, 0, 3.1, 0, TAU); context.fill();
      context.fillStyle = Palette.tint(config.long, .22); context.beginPath(); context.arc(-.6, -.6, 1, 0, TAU); context.fill();
    }
    context.restore();
  }
  return { drawFace, drawHands, drawWhiteRecess };
});
