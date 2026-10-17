(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else (root.Timeform ||= {}).MetalLight = api;
})(globalThis, function () {
  'use strict';
  const normalize = (x, y, z) => {
    const length = Math.hypot(x, y, z);
    return [x / length, y / length, z / length];
  };
  function sample(geometry, point, angle, physicalIndex) {
    const width = geometry.boardWidth || point.radius * 2, height = geometry.boardHeight || point.radius * 2;
    const span = Math.max(width, height), x = (point.x - width / 2) / span, y = (point.y - height / 2) / span;
    // One finite softbox and one centered viewer, shared by the whole board.
    // Different positions see different half-vectors, even for parallel hands.
    const light = normalize(-.55 - x, -.7 - y, 1.05);
    const view = normalize(-x, -y, 1.8);
    const half = normalize(light[0] + view[0], light[1] + view[1], light[2] + view[2]);
    const along = Math.cos(angle) * half[0] + Math.sin(angle) * half[1];
    const across = -Math.sin(angle) * half[0] + Math.cos(angle) * half[1];
    // Tiny fixed finish tolerances, tied to a motor rather than a frame or time.
    const hash = (Math.imul(physicalIndex + 1, 1664525) + 1013904223) >>> 0;
    const grain = ((hash ^ (hash >>> 13)) & 1023) / 1023;
    const center = Math.max(.12, Math.min(.88, .5 + across * .72 + (grain - .5) * .012));
    const spread = .095 + Math.abs(along) * .055 + grain * .008;
    const distance = (-.55 - x) ** 2 + (-.7 - y) ** 2 + 1.05 ** 2;
    const strength = Math.min(1, 1.4 / distance) * (.4 + .6 * Math.exp(-((along / .34) ** 2)));
    return { center, spread, strength, slant: Math.max(-.05, Math.min(.05, along * .15)) };
  }
  function tintAt(position, reflection) {
    const edge = Math.abs(position * 2 - 1);
    const highlight = Math.exp(-(((position - reflection.center) / reflection.spread) ** 2) / 2);
    return .025 - .25 * edge ** 3 + (.13 + .27 * reflection.strength) * highlight;
  }
  return { sample, tintAt };
});
