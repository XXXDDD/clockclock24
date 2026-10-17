(function (root, factory) {
  const commonJS = typeof module === 'object' && module.exports;
  const api = factory(commonJS ? require('../../shared/palette.js') : root.Timeform.Palette);
  if (commonJS) module.exports = api;
  else (root.Timeform ||= {}).AMT288Drawing = api;
})(globalThis, function (Palette) {
  'use strict';
  const TAU = Math.PI * 2;
  // Axis-to-tip proportions measured in the rectified official reference.
  const referenceReach = 0.983;
  const longLanes = '000000000000000000000000000000000000000000000000000000000000000000000000010000011110001111010110000000110110011101110010000000111111010001100010000000011100101110011100000000111101011110000000000010111110011111000010000000000000000000000000000000000000000000000000000000000000000000000000';
  const longLane = point => Number(longLanes[Math.floor(point.i / 2)]);
  const handLength = (config, secondary) => 53.2 * referenceReach * (secondary ? Math.min(config.shortLength, config.longLength) : config.longLength) / 100;
  function whiteRecess(context) {
    context.save();
    context.beginPath(); context.arc(0, 0, 53.2, 0, TAU); context.clip();
    // Keep the floor quiet; depth comes from the upper inner wall, not a bright
    // dome center or an illuminated outer bevel.
    const floor = context.createLinearGradient(0, -53.2, 0, 53.2);
    [[0, '#e7e8e4'], [.22, '#ebece8'], [.82, '#eeefeb'], [1, '#eff0ed']]
      .forEach(([stop, color]) => floor.addColorStop(stop, color));
    context.fillStyle = floor; context.fillRect(-53.2, -53.2, 106.4, 106.4);
    const shadow = context.createRadialGradient(2.8, 4, 46, 0, 0, 53.2);
    [[0, '#00000000'], [.65, '#00000002'], [.9, '#00000012'], [1, '#00000032']]
      .forEach(([stop, color]) => shadow.addColorStop(stop, color));
    context.fillStyle = shadow; context.beginPath(); context.arc(0, 0, 53.2, 0, TAU); context.fill();
    const wall = context.createLinearGradient(-38, -42, 38, 42);
    [[0, '#92978d'], [.4, '#b0b5ab'], [.65, '#e5e8e1'], [1, '#ffffff']]
      .forEach(([stop, color]) => wall.addColorStop(stop, color));
    context.strokeStyle = wall; context.lineWidth = 1.25;
    context.beginPath(); context.arc(0, 0, 52.55, 0, TAU); context.stroke();
    context.restore();
  }
  function drawSurface(context, geometry, config) {
    const { boardWidth: width, boardHeight: height } = geometry;
    const material = Palette.material(config), black = material === 'black', white = material === 'white';
    const gradient = context.createLinearGradient(0, 0, width, height);
    const colors = black ? ['#252626', '#202121', '#171818'] : white ? ['#eeeeec', '#f0f0ee', '#e4e4e2']
      : [Palette.tint(config.board, .05), config.board, Palette.tint(config.board, -.08)];
    colors.forEach((color, i) => gradient.addColorStop(i / 2, color));
    context.save(); context.fillStyle = gradient; context.fillRect(0, 0, width, height);
    geometry.points.forEach(point => {
      context.save(); context.translate(point.x, point.y); context.scale(point.radius / 53.2, point.radius / 53.2);
      if (white) { whiteRecess(context); context.restore(); return; }
      const face = context.createRadialGradient(-16, -19, 2, 6, 8, 69);
      const shades = black ? ['#252626', '#1b1c1c', '#0d0e0e']
        : [Palette.tint(config.board, -.02), Palette.tint(config.board, -.09), Palette.tint(config.board, -.28)];
      shades.forEach((color, i) => face.addColorStop([0, .66, 1][i], color));
      context.fillStyle = face; context.beginPath(); context.arc(0, 0, 53.2, 0, TAU); context.fill();
      context.strokeStyle = black ? '#090a0a88' : '#00000024'; context.lineWidth = 1.15;
      context.beginPath(); context.arc(0, 0, 52.7, 0, TAU); context.stroke(); context.restore();
    });
    context.restore();
  }
  function hand(context, pose, secondary, config) {
    if (pose.opacity <= .001) return;
    const width = secondary ? config.shortWidth : config.longWidth;
    const length = handLength(config, secondary);
    context.save(); context.rotate(pose.angle); context.globalAlpha = pose.opacity;
    context.fillStyle = secondary ? config.short : config.long;
    context.shadowColor = '#00000032'; context.shadowBlur = 1.1; context.shadowOffsetY = 1.1;
    context.beginPath(); context.moveTo(0, -width / 2); context.lineTo(length, -width / 2);
    context.lineTo(length, width / 2); context.lineTo(0, width / 2);
    context.arc(0, 0, width / 2, Math.PI / 2, Math.PI * 1.5); context.closePath(); context.fill(); context.restore();
  }
  function drawHands(context, geometry, instance, config) {
    geometry.points.forEach(point => {
      context.save(); context.translate(point.x, point.y); context.scale(point.radius / 53.2, point.radius / 53.2);
      hand(context, instance.hands[point.i + (longLane(point) ^ 1)], true, config); hand(context, instance.hands[point.i + longLane(point)], false, config);
      context.restore();
    });
  }
  return { drawSurface, drawHands, handLength, referenceReach, longLane,
    appearance: { handShape: 'roundBase', finish: 'matte' } };
});
