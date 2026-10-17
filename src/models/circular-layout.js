(function (root, factory) {
  const api = factory(typeof module === 'object' && module.exports ? require('../shared/palette.js') : root.Timeform.Palette);
  if (typeof module === 'object' && module.exports) module.exports = api;
  else (root.Timeform ||= {}).CircularLayout = api;
})(globalThis, function (Palette) {
  'use strict';
  function fit(width, height, config, diameter, points) {
    const padding = Math.min(config.padding, (width - 1) / 2, (height - 1) / 2);
    const availableWidth = Math.max(1, width - padding * 2), availableHeight = Math.max(1, height - padding * 2);
    const size = Math.min(availableWidth, availableHeight) * config.scale / 100;
    return {
      x: padding + (availableWidth - size) / 2 * (1 + config.offsetX / 100),
      y: padding + (availableHeight - size) / 2 * (1 + config.offsetY / 100),
      width: size, height: size, boardWidth: diameter, boardHeight: diameter, points, padding, layout: 'circular'
    };
  }
  function drawBoard(context, geometry, config) {
    const size = geometry.boardWidth, center = size / 2, radius = center - 1;
    context.save();
    const gradient = context.createLinearGradient(0, 0, size, size);
    gradient.addColorStop(0, Palette.tint(config.board, .065)); gradient.addColorStop(.48, config.board); gradient.addColorStop(1, Palette.tint(config.board, -.12));
    context.fillStyle = gradient; context.beginPath(); context.arc(center, center, radius, 0, Math.PI * 2); context.fill();
    context.strokeStyle = Palette.tint(config.board, -.18); context.lineWidth = 2; context.stroke();
    context.strokeStyle = '#ffffff15'; context.lineWidth = 1; context.beginPath(); context.arc(center, center, radius - 1.5, Math.PI, Math.PI * 1.8); context.stroke();
    context.restore();
  }
  return { fit, drawBoard };
});
