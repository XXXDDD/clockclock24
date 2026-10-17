'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const Spec = require('../src/core/presentation-config.js');
const Gallery = require('../showcase/presentation.js');

test('fullscreen extends the board to every edge without stretching or cropping the clock layout', () => {
  for (const model of Spec.models.filter(model => model.type !== 'circular')) {
    for (const [width, height] of [[3440, 1440], [1920, 1080], [1080, 1920]]) {
      const settings = Spec.resolve(Gallery.config(model)).settings;
      const original = model.geometry(width, height, settings);
      const full = Gallery.fullscreenGeometry(original, width, height);
      const scale = full.width / full.boardWidth;
      assert.equal(full.x, 0); assert.equal(full.y, 0);
      assert.equal(full.width, width); assert.equal(full.height, height);
      assert.ok(Math.abs(scale - full.height / full.boardHeight) < 1e-9);
      assert.ok(Math.abs(scale - original.width / original.boardWidth) < 1e-9);
      assert.equal(full.points.length, original.points.length);
      full.points.forEach((point, index) => {
        const before = original.points[index];
        assert.equal(point.radius, before.radius); assert.equal(point.i, before.i);
        assert.ok(Math.abs((point.x - full.points[0].x) - (before.x - original.points[0].x)) < 1e-9);
        assert.ok(Math.abs((point.y - full.points[0].y) - (before.y - original.points[0].y)) < 1e-9);
        assert.ok(point.x - point.radius >= -1e-9 && point.x + point.radius <= full.boardWidth + 1e-9, model.id);
        assert.ok(point.y - point.radius >= -1e-9 && point.y + point.radius <= full.boardHeight + 1e-9, model.id);
      });
    }
  }
});
