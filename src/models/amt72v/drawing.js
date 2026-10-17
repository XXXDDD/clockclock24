(function (root, factory) {
  const commonJS = typeof module === 'object' && module.exports;
  const api = factory(commonJS ? require('../../shared/palette.js') : root.Timeform.Palette);
  if (commonJS) module.exports = api;
  else (root.Timeform ||= {}).AMT72vDrawing = api;
})(globalThis, function (Palette) {
  'use strict';
  const TAU = Math.PI * 2;
  function drawSurface(ctx, geometry, config) {
    const { boardWidth: w, boardHeight: h } = geometry;
    const kind = Palette.material(config), black = kind === 'black', white = kind === 'white';
    ctx.save();
    const board = ctx.createLinearGradient(0, 0, w * .3, h);
    const colors = black ? ['#282829', '#1c1c1e', '#111113'] : white ? ['#f6f4ef', '#f1efea', '#e5e3de']
      : [Palette.tint(config.board, .06), config.board, Palette.tint(config.board, -.12)];
    colors.forEach((color, i) => board.addColorStop(i / 2, color));
    ctx.fillStyle = board; ctx.fillRect(0, 0, w, h);
    geometry.points.forEach(point => {
      ctx.save(); ctx.translate(point.x, point.y); ctx.scale(point.radius / 53.2, point.radius / 53.2);
      const face = ctx.createLinearGradient(-15, -53.2, 8, 53.2);
      const shades = black ? ['#1b1b1d', '#202022', '#151517'] : white ? ['#e3e1dc', '#efede8', '#f6f4ef']
        : [Palette.tint(config.board, -.20), Palette.tint(config.board, -.07), Palette.tint(config.board, -.12)];
      shades.forEach((color, i) => face.addColorStop(i / 2, color));
      ctx.beginPath(); ctx.arc(0, 0, 53.2, 0, TAU); ctx.fillStyle = face; ctx.fill();
      ctx.strokeStyle = black ? '#050506' : '#00000030'; ctx.lineWidth = 1.3;
      ctx.beginPath(); ctx.arc(0, .3, 52.6, Math.PI, TAU); ctx.stroke();
      ctx.strokeStyle = black ? '#ffffff0d' : '#ffffff50'; ctx.lineWidth = .8;
      ctx.beginPath(); ctx.arc(0, 0, 52.8, 0, Math.PI); ctx.stroke(); ctx.restore();
    });
    ctx.strokeStyle = '#00000050'; ctx.lineWidth = 1; ctx.strokeRect(.5, .5, w - 1, h - 1); ctx.restore();
  }
  function hand(ctx, pose, secondary, config) {
    if (pose.opacity <= .001) return;
    const width = secondary ? config.shortWidth : config.longWidth;
    const length = 49.3 * (secondary ? Math.min(config.shortLength, config.longLength) : config.longLength) / 100;
    const color = secondary ? config.short : config.long;
    ctx.save(); ctx.rotate(pose.angle); ctx.globalAlpha = pose.opacity;
    const metal = ctx.createLinearGradient(0, -width / 2, 0, width / 2);
    [[0, -.38], [.18, .02], [.42, .3], [.58, -.16], [1, -.45]].forEach(([stop, tint]) => metal.addColorStop(stop, Palette.tint(color, tint)));
    // Restrained angle-dependent reflections; derived from the selected hand colour.
    ctx.fillStyle = metal; ctx.shadowColor = '#00000080'; ctx.shadowBlur = 1.1; ctx.shadowOffsetY = 1.1;
    ctx.fillRect(-width * .15, -width / 2, length + width * .15, width);
    ctx.shadowColor = 'transparent';
    ctx.globalAlpha = pose.opacity * (.15 + .22 * Math.pow(Math.cos(pose.angle + .7), 2));
    ctx.fillStyle = Palette.tint(color, .55); ctx.fillRect(0, -width / 2, length, Math.min(1, width * .18));
    ctx.restore();
  }
  function drawHands(ctx, geometry, instance, config) {
    geometry.points.forEach(point => {
      ctx.save(); ctx.translate(point.x, point.y); ctx.scale(point.radius / 53.2, point.radius / 53.2);
      hand(ctx, instance.hands[point.i + 1], true, config); hand(ctx, instance.hands[point.i], false, config); ctx.restore();
    });
  }
  return { drawSurface, drawHands };
});
