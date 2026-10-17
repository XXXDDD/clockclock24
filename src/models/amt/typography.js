(function (root, factory) {
  const api = factory(typeof module === 'object' && module.exports ? require('../../shared/math.js') : root.Timeform.Math);
  if (typeof module === 'object' && module.exports) module.exports = api;
  else (root.Timeform ||= {}).AMTTypography = api;
})(globalThis, function (Maths) {
  'use strict';
  const IDLE = Math.PI * .75;
  const DIR = { E: 0, S: Math.PI / 2, W: Math.PI, N: -Math.PI / 2, P: IDLE };
  function displayDigits(minutes, format24 = true) {
    const value = Maths.normalizeMinutes(minutes), hour = Math.floor(value / 60);
    return String(format24 ? hour : hour % 12 || 12).padStart(2, '0') + String(value % 60).padStart(2, '0');
  }
  // Trace orthogonal paths through clock centres. A centre can carry at most two directions.
  function trace(pose, columns, path, originX, originY) {
    const directions = new Map();
    function add(x, y, dx, dy) {
      const index = ((y + originY) * columns + x + originX) * 2;
      if (!directions.has(index)) directions.set(index, new Set());
      directions.get(index).add(Math.atan2(dy, dx));
    }
    for (let i = 1; i < path.length; i++) {
      let [x, y] = path[i - 1];
      const [endX, endY] = path[i], dx = Math.sign(endX - x), dy = Math.sign(endY - y);
      while (x !== endX || y !== endY) {
        add(x, y, dx, dy); x += dx; y += dy; add(x, y, -dx, -dy);
      }
    }
    for (const [index, set] of directions) {
      const angles = [...set];
      if (angles.length > 2) throw new Error('数字字形超出两根指针。');
      pose[index] = { angle: angles[0], used: true };
      pose[index + 1] = { angle: angles[1] ?? angles[0], used: angles.length === 2 };
    }
  }
  // Outlines of the broad digital strokes, including the inner counters.
  // A 3-clock-wide counter collapses into a vertical stroke; at width 5 it is a box.
  function glyphPaths(digit, width) {
    const right = width - 1, inner = right - 1;
    const box = (left, top, endX, endY) => [[left, top], [endX, top], [endX, endY], [left, endY], [left, top]];
    return {
      '0': [box(0, 0, right, 5), box(1, 1, inner, 4)],
      '1': [box(inner, 0, right, 5)],
      '2': [[[0, 0], [right, 0], [right, 3], [1, 3], [1, 4], [right, 4], [right, 5], [0, 5], [0, 2], [inner, 2], [inner, 1], [0, 1], [0, 0]]],
      '3': [[[0, 0], [right, 0], [right, 5], [0, 5], [0, 4], [inner, 4], [inner, 3], [0, 3], [0, 2], [inner, 2], [inner, 1], [0, 1], [0, 0]]],
      '4': [[[0, 0], [1, 0], [1, 2], [inner, 2], [inner, 0], [right, 0], [right, 5], [inner, 5], [inner, 3], [0, 3], [0, 0]]],
      '5': [[[0, 0], [right, 0], [right, 1], [1, 1], [1, 2], [right, 2], [right, 5], [0, 5], [0, 4], [inner, 4], [inner, 3], [0, 3], [0, 0]]],
      '6': [[[0, 0], [right, 0], [right, 1], [1, 1], [1, 2], [right, 2], [right, 5], [0, 5], [0, 0]], box(1, 3, inner, 4)],
      '7': [[[0, 0], [right, 0], [right, 5], [inner, 5], [inner, 1], [0, 1], [0, 0]]],
      '8': [box(0, 0, right, 5), box(1, 1, inner, 2), box(1, 3, inner, 4)],
      '9': [[[0, 0], [right, 0], [right, 5], [0, 5], [0, 4], [inner, 4], [inner, 3], [0, 3], [0, 0]], box(1, 1, inner, 2)]
    }[digit];
  }
  function glyphPose(digit, width) {
    if (digit === '4' && width === 3) {
      // The narrow four has a shared top join: match the two-hand poses in the AMT72 photo.
      return ['SE', 'SW', 'SW', 'NS', 'NS', 'NS', 'NS', 'NE', 'NS', 'NE', 'SW', 'NS', 'PP', 'NS', 'NS', 'PP', 'NE', 'NW'].flatMap(([a, b]) => [
        { angle: DIR[a], used: a !== 'P' }, { angle: DIR[b], used: b !== 'P' && b !== a }
      ]);
    }
    const pose = Array.from({ length: width * 6 * 2 }, () => ({ angle: IDLE, used: false }));
    for (const path of glyphPaths(digit, width)) trace(pose, width, path, 0, 0);
    return pose;
  }
  return { IDLE, trace, glyphPose, displayDigits };
});
