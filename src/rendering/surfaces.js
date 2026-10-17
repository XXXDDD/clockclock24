(function (root, factory) {
  const api = factory(typeof module === 'object' && module.exports ? require('../shared/palette.js') : root.Timeform.Palette);
  if (typeof module === 'object' && module.exports) module.exports = api;
  else (root.Timeform ||= {}).AppearanceSurfaces = api;
})(globalThis, function (Palette) {
  'use strict';
  const TAU = Math.PI * 2, UNIT = 53.2;
  function circle(ctx, x, y, radius) {
    ctx.beginPath(); ctx.arc(x, y, radius, 0, TAU);
  }
  function outline(ctx, geometry, profile) {
    if (profile.boardShape === 'circle') circle(ctx, geometry.boardWidth / 2, geometry.boardHeight / 2, geometry.boardWidth / 2 - .5);
    else { ctx.beginPath(); ctx.rect(0, 0, geometry.boardWidth, geometry.boardHeight); }
  }
  function recess(ctx, point, config, stone) {
    ctx.save(); ctx.translate(point.x, point.y); ctx.scale(point.radius / UNIT, point.radius / UNIT);
    circle(ctx, 0, 0, UNIT); ctx.clip();
    if (!stone) {
      // A nearly flat floor; most of the depth belongs to the narrow inner wall.
      const floor = ctx.createLinearGradient(-35, -40, 35, 40);
      floor.addColorStop(0, Palette.tint(config.board, -.07));
      floor.addColorStop(1, Palette.tint(config.board, .015));
      ctx.fillStyle = floor; ctx.fillRect(-UNIT, -UNIT, UNIT * 2, UNIT * 2);
    }
    const shadow = ctx.createRadialGradient(2.4, 3, 43, 0, 0, UNIT);
    shadow.addColorStop(0, '#00000000'); shadow.addColorStop(.65, '#00000005'); shadow.addColorStop(1, '#00000070');
    ctx.fillStyle = shadow; circle(ctx, 0, 0, UNIT); ctx.fill();
    const wall = ctx.createLinearGradient(-36, -40, 36, 40);
    wall.addColorStop(0, '#00000085'); wall.addColorStop(.5, '#00000020'); wall.addColorStop(1, '#ffffff30');
    ctx.strokeStyle = wall; ctx.lineWidth = 2.1; circle(ctx, 0, 0, UNIT - 1.1); ctx.stroke();
    const lip = ctx.createLinearGradient(-38, -40, 38, 40);
    lip.addColorStop(0, '#ffffff32'); lip.addColorStop(.5, '#ffffff08'); lip.addColorStop(1, '#00000038');
    ctx.strokeStyle = lip; ctx.lineWidth = .65; circle(ctx, 0, 0, UNIT - .35); ctx.stroke();
    ctx.restore();
  }
  function usesOriginalSurface(config, profile = {}) {
    if (profile.texture) return false;
    const channels = [1, 3, 5].map(offset => parseInt(config.board.slice(offset, offset + 2), 16));
    // Include warm whites and custom neutral grays, not just preset IDs.
    return Math.max(...channels) - Math.min(...channels) <= 12;
  }
  function drawSurface(ctx, geometry, config, model) {
    const profile = model.Drawing?.appearance || {};
    if (usesOriginalSurface(config, profile) && model.Drawing?.drawSurface) {
      // The original black/white dials already have calibrated depth and light.
      model.Drawing.drawSurface(ctx, geometry, config);
      return;
    }
    const stone = profile.texture === 'travertine';
    ctx.save(); outline(ctx, geometry, profile); ctx.clip();
    if (stone) {
      // Keep each edition's own continuous stone pattern and measured contours.
      model.Drawing.drawSurface(ctx, geometry, config);
    } else {
      const light = ctx.createLinearGradient(0, 0, geometry.boardWidth * .7, geometry.boardHeight);
      light.addColorStop(0, Palette.tint(config.board, .045)); light.addColorStop(.55, config.board);
      light.addColorStop(1, Palette.tint(config.board, -.025));
      ctx.fillStyle = light; ctx.fillRect(0, 0, geometry.boardWidth, geometry.boardHeight);
      let seed = 1982;
      const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
      ctx.globalAlpha = .022;
      for (let i = 0; i < 6500; i++) {
        ctx.fillStyle = i % 2 ? '#ffffff' : '#000000';
        ctx.fillRect(random() * geometry.boardWidth, random() * geometry.boardHeight, .6, .6);
      }
      ctx.globalAlpha = 1;
    }
    if (profile.dials !== false) geometry.points.forEach(point => recess(ctx, point, config, stone));
    ctx.restore();
    ctx.save(); outline(ctx, geometry, profile);
    const edge = ctx.createLinearGradient(0, 0, geometry.boardWidth, geometry.boardHeight);
    edge.addColorStop(0, '#ffffff24'); edge.addColorStop(1, '#00000042');
    ctx.strokeStyle = edge; ctx.lineWidth = .8; ctx.stroke(); ctx.restore();
  }
  return { drawSurface, usesOriginalSurface };
});
