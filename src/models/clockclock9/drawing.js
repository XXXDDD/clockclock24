(function (root, factory) {
  const commonJS = typeof module === 'object' && module.exports;
  const api = factory(commonJS ? require('../../shared/palette.js') : root.Timeform.Palette);
  if (commonJS) module.exports = api;
  else (root.Timeform ||= {}).ClockClock9Drawing = api;
})(globalThis, function (Palette) {
  'use strict';
  // CC9 uses exposed, square-ended bars. It deliberately does not depend on SingleClock.
  // The arm reach is shorter than half the axis pitch, leaving visible tip clearance
  // even in previously saved configurations with gap: 0 and both lengths at 100%.
  const referenceReach = .97;
  function handLength(point, config, secondary) {
    return point.radius * referenceReach * (secondary ? config.shortLength : config.longLength) / 100
      * (secondary && point.center ? config.centerHourLength / 100 : 1);
  }
  function drawSurface(context, geometry, config) {
    const size = geometry.boardWidth, center = size / 2, radius = center - .5;
    context.save();
    const body = context.createLinearGradient(0, 0, size * .8, size);
    body.addColorStop(0, Palette.tint(config.board, .30)); body.addColorStop(.45, config.board);
    body.addColorStop(1, Palette.tint(config.board, -.055));
    context.fillStyle = body; context.beginPath(); context.arc(center, center, radius, 0, Math.PI * 2); context.fill();
    context.strokeStyle = Palette.tint(config.board, -.10); context.lineWidth = 1; context.stroke();
    context.strokeStyle = '#ffffff65'; context.lineWidth = .7;
    context.beginPath(); context.arc(center, center, radius - .9, Math.PI, Math.PI * 1.8); context.stroke();
    context.restore();
  }
  function drawArm(context, hand, length, width, color) {
    if (hand.opacity <= .001) return;
    context.save(); context.rotate(hand.angle); context.globalAlpha = hand.opacity;
    const shade = context.createLinearGradient(0, -width / 2, 0, width / 2);
    shade.addColorStop(0, Palette.tint(color, .08)); shade.addColorStop(.45, color); shade.addColorStop(1, Palette.tint(color, -.12));
    context.shadowColor = '#0000002b'; context.shadowBlur = 1.8; context.shadowOffsetX = -1.5; context.shadowOffsetY = 2;
    context.fillStyle = shade; context.fillRect(-width * .35, -width / 2, length + width * .35, width); context.restore();
  }
  function drawHands(context, geometry, instance, config) {
    for (const point of geometry.points) {
      context.save(); context.translate(point.x, point.y);
      const ratio = point.radius / 53.2;
      drawArm(context, instance.hands[point.i + 1], handLength(point, config, true), config.shortWidth * ratio, config.short);
      drawArm(context, instance.hands[point.i], handLength(point, config, false), config.longWidth * ratio, config.long);
      context.restore();
    }
  }
  return { drawSurface, drawHands, handLength, referenceReach };
});
