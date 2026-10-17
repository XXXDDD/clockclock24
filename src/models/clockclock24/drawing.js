(function (root, factory) {
  const commonJS = typeof module === 'object' && module.exports;
  const api = factory(commonJS ? require('../../shared/palette.js') : root.Timeform.Palette);
  if (commonJS) module.exports = api;
  else (root.Timeform ||= {}).ClockClock24Drawing = api;
})(globalThis, function (Palette) {
  'use strict';
  const TAU = Math.PI * 2;
  function drawSurface(context, geometry, config) {
    const { boardWidth: width, boardHeight: height } = geometry;
    const material = Palette.material(config), black = material === 'black', white = material === 'white';
    const board = context.createLinearGradient(0, 0, width, height);
    const stops = black ? ['#252626', '#222323', '#1b1c1c'] : white ? ['#f0eee8', '#f6f4ef', '#e5e3dd']
      : [Palette.tint(config.board, .05), config.board, Palette.tint(config.board, -.07)];
    stops.forEach((color, i) => board.addColorStop(i / 2, color));
    context.save();
    context.fillStyle = board; context.fillRect(0, 0, width, height);
    geometry.points.forEach(point => {
      context.save(); context.translate(point.x, point.y); context.scale(point.radius / 53.2, point.radius / 53.2);
      const face = context.createRadialGradient(-13, -16, 3, 5, 7, 66);
      const colors = black ? ['#232424', '#1a1b1b', '#101111'] : white ? ['#f6f4ef', '#eeece6', '#d8d6d0']
        : [Palette.tint(config.board, -.04), Palette.tint(config.board, -.10), Palette.tint(config.board, -.25)];
      colors.forEach((color, i) => face.addColorStop([0, .65, 1][i], color));
      context.fillStyle = face; context.beginPath(); context.arc(0, 0, 53.2, 0, TAU); context.fill();
      context.strokeStyle = black ? '#08090999' : '#00000023'; context.lineWidth = 1.2;
      context.beginPath(); context.arc(0, 0, 52.7, 0, TAU); context.stroke();
      context.restore();
    });
    context.restore();
  }
  function drawHand(context, hand, secondary, config) {
    if (hand.opacity <= .001) return;
    const width = secondary ? config.shortWidth : config.longWidth;
    const length = 49.3 * (secondary ? Math.min(config.shortLength, config.longLength) : config.longLength) / 100;
    context.save(); context.rotate(hand.angle); context.globalAlpha = hand.opacity;
    context.fillStyle = secondary ? config.short : config.long;
    context.shadowColor = '#00000035'; context.shadowBlur = 1.2; context.shadowOffsetY = 1.2;
    // Flat square-ended arms meet at their own axis; the film has no glossy cap.
    context.fillRect(-width * .42, -width / 2, length + width * .42, width);
    context.restore();
  }
  function drawHands(context, geometry, instance, config) {
    geometry.points.forEach(point => {
      context.save(); context.translate(point.x, point.y); context.scale(point.radius / 53.2, point.radius / 53.2);
      drawHand(context, instance.hands[point.i + 1], true, config);
      drawHand(context, instance.hands[point.i], false, config);
      context.restore();
    });
  }
  return { drawSurface, drawHands };
});
