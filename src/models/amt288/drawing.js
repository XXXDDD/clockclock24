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
      const face = context.createRadialGradient(-16, -19, 2, 6, 8, 69);
      const shades = black ? ['#252626', '#1b1c1c', '#0d0e0e'] : white ? ['#eeefec', '#e8e9e6', '#d5d7d1']
        : [Palette.tint(config.board, -.02), Palette.tint(config.board, -.09), Palette.tint(config.board, -.28)];
      shades.forEach((color, i) => face.addColorStop([0, .66, 1][i], color));
      context.fillStyle = face; context.beginPath(); context.arc(0, 0, 53.2, 0, TAU); context.fill();
      if (white) {
        const rim = context.createLinearGradient(-42, -23, 42, 23);
        rim.addColorStop(0, '#ffffff'); rim.addColorStop(.4, '#ffffffdc');
        rim.addColorStop(.7, '#c1c4bc'); rim.addColorStop(1, '#aeb1a8');
        context.strokeStyle = rim; context.lineWidth = 2;
      } else { context.strokeStyle = black ? '#090a0a88' : '#00000024'; context.lineWidth = 1.15; }
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
  return { drawSurface, drawHands, handLength, referenceReach, longLane };
});
