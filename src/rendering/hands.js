(function (root, factory) {
  const cjs = typeof module === 'object' && module.exports;
  const api = factory(cjs ? require('../shared/palette.js') : root.Timeform.Palette,
    cjs ? require('./metal-light.js') : root.Timeform.MetalLight);
  if (typeof module === 'object' && module.exports) module.exports = api;
  else (root.Timeform ||= {}).AppearanceHands = api;
})(globalThis, function (Palette, MetalLight) {
  'use strict';
  const TAU = Math.PI * 2, UNIT = 53.2;
  function circle(ctx, x, y, radius) {
    ctx.beginPath(); ctx.arc(x, y, radius, 0, TAU);
  }
  function armPath(ctx, length, width, profile) {
    const tail = profile.tailLength ?? width * (profile.tail ?? .12);
    if (profile.handShape === 'roundBase') {
      ctx.beginPath(); ctx.moveTo(0, -width / 2); ctx.lineTo(length, -width / 2);
      ctx.lineTo(length, width / 2); ctx.lineTo(0, width / 2);
      ctx.arc(0, 0, width / 2, Math.PI / 2, Math.PI * 1.5); ctx.closePath();
    } else if (profile.handShape === 'rounded') Palette.roundRect(ctx, -tail, -width / 2, length + tail, width,
      profile.cornerRadius ? profile.cornerRadius(width) : width * .35);
    else { ctx.beginPath(); ctx.rect(-tail, -width / 2, length + tail, width); }
  }
  const isMetal = finish => finish === 'metal' || finish === 'outlined';
  const finishFor = (profile, secondary) => Array.isArray(profile.finish) ? profile.finish[secondary ? 1 : 0] : profile.finish;
  function drawArm(ctx, pose, length, width, color, profile, secondary, reflection) {
    if (pose.opacity <= .001) return;
    const finish = finishFor(profile, secondary), metal = isMetal(finish);
    ctx.save(); ctx.globalAlpha = pose.opacity; ctx.rotate(pose.angle);
    // Material shading must fit inside the model's exact original silhouette.
    // No translated side, extra cast shadow, outside outline or pixel-width floor.
    armPath(ctx, length, width, profile); ctx.clip();
    // Material response is independent of the board's color and lighting mode.
    const facing = Math.sin(pose.angle) * .6 - Math.cos(pose.angle) * .8;
    const slant = metal ? reflection.slant : 0;
    const top = ctx.createLinearGradient(length / 2 - width * slant / 2, -width / 2, length / 2 + width * slant / 2, width / 2);
    const bands = metal
      ? [...new Set([0, .12, .25, .38, .5, .62, .75, .88, 1, reflection.center,
          Math.max(0, reflection.center - reflection.spread), Math.min(1, reflection.center + reflection.spread)])]
          .sort((a, b) => a - b).map(position => [position, MetalLight.tintAt(position, reflection)])
      : [[0, .025 * facing], [.32, .01], [.65, 0], [1, -.045 * facing]];
    bands.forEach(([position, tint]) => top.addColorStop(position, Palette.tint(color, tint)));
    ctx.fillStyle = top; ctx.fill();
    ctx.fillStyle = Palette.tint(color, .6); ctx.globalAlpha = pose.opacity * (metal ? .08 + .10 * reflection.strength : .07) * Math.abs(facing);
    ctx.fillRect(-width, facing > 0 ? -width / 2 : width / 2 - .45, length + width * 2, .45);
    if (finish === 'outlined') {
      ctx.globalAlpha = pose.opacity;
      ctx.strokeStyle = '#d1d2cd'; ctx.lineWidth = Math.max(.7, width * .12); ctx.stroke();
    }
    ctx.restore();
  }
  function drawHands(ctx, geometry, instance, config, model) {
    const drawing = model.Drawing || {}, profile = drawing.appearance || {};
    for (const point of geometry.points) {
      ctx.save(); ctx.translate(point.x, point.y); ctx.scale(point.radius / UNIT, point.radius / UNIT);
      const lane = drawing.longLane?.(point) || 0;
      for (const secondary of [true, false]) {
        const pose = instance.hands[point.i + (secondary ? lane ^ 1 : lane)];
        const length = profile.handLength ? profile.handLength(point, config, secondary)
          : drawing.handLength ? drawing.handLength(config, secondary)
          : UNIT * (drawing.referenceReach || 49.3 / UNIT) * (secondary ? config.shortLength : config.longLength) / 100;
        drawArm(ctx, pose, length, secondary ? config.shortWidth : config.longWidth,
          secondary ? config.short : config.long, profile, secondary,
          pose.opacity > .001 && isMetal(finishFor(profile, secondary))
            ? MetalLight.sample(geometry, point, pose.angle, point.i + (secondary ? lane ^ 1 : lane)) : undefined);
      }
      if (profile.hub) {
        ctx.globalAlpha = Math.max(instance.hands[point.i].opacity, instance.hands[point.i + 1].opacity);
        ctx.fillStyle = config.long; circle(ctx, 0, 0, 3.1); ctx.fill();
      }
      ctx.restore();
    }
  }
  function drawByMaterial(ctx, geometry, instance, config, model) {
    const profile = model.Drawing.appearance || {};
    const hidden = instance.hands.map(hand => ({ angle: hand.angle, opacity: 0 }));
    const mask = [...hidden];
    // Mixed finishes (e.g. Pinakin) keep each motor's finish and the original
    // short-below-long stacking. Never paint a whole extra layer over both arms.
    for (const point of geometry.points) {
      const lane = model.Drawing.longLane?.(point) || 0;
      for (const secondary of [true, false]) {
        const index = point.i + (secondary ? lane ^ 1 : lane);
        mask[index] = instance.hands[index];
        const single = { ...geometry, points: [point] };
        if (isMetal(finishFor(profile, secondary))) drawHands(ctx, single, { hands: mask }, config, model);
        else model.Drawing.drawHands(ctx, single, { hands: mask }, config);
        mask[index] = hidden[index];
      }
    }
  }
  return { drawHands, drawByMaterial, isMetal, finishFor };
});
