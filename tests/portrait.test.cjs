'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const Portrait = require('../src/models/portrait.js');
const Landscape = require('../src/models/landscape.js');
const Config = require('../src/shared/config.js');
const Model = Portrait.get('amt72v');
const sameAngle = (actual, expected) => assert.ok(Math.abs(Math.sin(actual) - Math.sin(expected)) < 1e-8 && Math.abs(Math.cos(actual) - Math.cos(expected)) < 1e-8);

// Independently transcribed from the official AMT72v Black static specimen (72 above 36).
// Each pair describes the two directions at a clock centre, row by row.
const photographed = [
  'SE EW SW SE EW SW',
  'NE SW NS NE SW NS',
  'PP NS NS SE NW NS',
  'PP NS NS NS SE NW',
  'PP NS NS NS NE SW',
  'PP NE NW NE EW NW',
  'SE EW SW SE EW SW',
  'NE SW NS NS SE NW',
  'SE NW NS NS NE SW',
  'NE SW NS NS SS NS',
  'SE NW NS NS NN NS',
  'NE EW NW NE EW NW'
];
test('72v matches all clock directions in the official black specimen', () => {
  assert.deepEqual(Portrait.models.map(model => model.id), ['amt72v']);
  assert.deepEqual([Model.count, Model.columns, Model.rows], [72, 6, 12]);
  const angles = { E: 0, S: 90, W: 180, N: 270, P: 135 }, pose = Model.digitPose('7236');
  photographed.flatMap(row => row.split(' ')).forEach((pair, index) => {
    const actual = pose.slice(index * 2, index * 2 + 2).map(hand => Math.round((hand.angle * 180 / Math.PI + 360) % 360)).sort((a, b) => a - b);
    assert.deepEqual(actual, [...pair].map(letter => angles[letter]).sort((a, b) => a - b), 'photo cell ' + index);
    assert.equal(pose[index * 2].used || pose[index * 2 + 1].used, pair !== 'PP');
  });
});

test('all digits are distinct and every minute is finite in both time formats', () => {
  assert.equal(new Set(Array.from({ length: 10 }, (_, digit) => JSON.stringify(Model.digitPose(String(digit).repeat(4))))).size, 10);
  const clock = Model.create({});
  for (const format24 of [true, false]) {
    clock.update({ format24 }, 0);
    for (let minute = 0; minute < 1440; minute++) {
      clock.initialize(minute, 0); clock.sample(1);
      assert.equal(clock.hands.length, 144);
      assert.equal(clock.state.minuteKey, Model.displayDigits(minute, format24));
      assert.ok(clock.hands.every(hand => Number.isFinite(hand.angle) && hand.opacity === 1));
    }
  }
  assert.equal(Model.displayDigits(0, false), '1200');
  assert.equal(Model.displayDigits(1440), '0000');
});

test('portrait geometry preserves the panel ratio, round faces and independent safe areas', () => {
  for (const [width, height] of [[1080, 1920], [1170, 2532], [1440, 3200], [950, 1730], [1920, 1080], [240, 240]]) {
    for (const [safeTop, safeBottom] of [[0, 0], [360, 120], [1200, 1200]]) {
      for (const [radius, gap] of [[20, 0], [43, 4.3], [65, 40]]) for (const offset of [-100, 0, 100]) {
        const g = Model.geometry(width, height, { radius, gap, safeTop, safeBottom, scale: 100, padding: 160, offsetX: offset, offsetY: offset });
        assert.equal(g.layout, 'portrait'); assert.equal(g.points.length, 72);
        assert.ok(Math.abs(g.boardWidth / g.boardHeight - 95 / 173) < 1e-8);
        assert.ok(Math.abs(g.width / g.boardWidth - g.height / g.boardHeight) < 1e-8);
        assert.ok(g.x >= g.padding - 1e-8 && g.x + g.width <= width - g.padding + 1e-8);
        assert.ok(g.y >= g.padding + g.safeTop - 1e-8 && g.y + g.height <= height - g.padding - g.safeBottom + 1e-8);
        assert.ok(g.width > 0 && g.height > 0);
        assert.equal(new Set(g.points.map(point => point.x + ':' + point.y)).size, 72);
        g.points.forEach((point, index) => {
          assert.equal(point.i, index * 2); assert.equal(point.radius, radius);
          assert.ok(point.x - radius >= 0 && point.x + radius <= g.boardWidth);
          assert.ok(point.y - radius >= 0 && point.y + radius <= g.boardHeight);
        });
      }
    }
  }
  const top = Model.geometry(1080, 1920, { safeTop: 400, safeBottom: 0 });
  const bottom = Model.geometry(1080, 1920, { safeTop: 0, safeBottom: 400 });
  assert.equal(top.height, bottom.height); assert.ok(Math.abs(top.y - bottom.y - 400) < 1e-8);
});

test('72v choreography stays continuous on interruption and settles on time', () => {
  for (const duration of [1, 6, 10]) for (const visibility of ['show', 'hide', 'ghost']) {
    const clock = Model.create({ duration, visibility }); clock.initialize(1439, 0); clock.animate(0, 100);
    const halfway = 100 + duration * 500; clock.sample(halfway);
    const previous = clock.hands.map(hand => ({ angle: hand.angle, opacity: hand.opacity }));
    clock.animate(756, halfway); clock.sample(halfway);
    clock.hands.forEach((hand, index) => { sameAngle(hand.angle, previous[index].angle); assert.ok(Math.abs(hand.opacity - previous[index].opacity) < 1e-8); });
    const end = halfway + duration * 1000; clock.sample(end);
    const pose = Model.digitPose('1236');
    clock.hands.forEach((hand, index) => {
      sameAngle(hand.angle, pose[index].angle);
      assert.equal(hand.used, pose[index].used);
      assert.equal(hand.opacity, hand.used || visibility === 'show' ? 1 : visibility === 'ghost' ? .12 : 0);
      assert.equal(hand.fadeEnd, end);
    });
    assert.equal(clock.isAnimating(end), false);
  }
  const reduced = Model.create({}, { reducedMotion: true }); reduced.initialize(0, 0); reduced.animate(1439, 100);
  reduced.hands.forEach(hand => { assert.ok(Math.abs(hand.to - hand.from) <= Math.PI + 1e-8); assert.equal(hand.fadeEnd, 400); });
});

test('portrait configurations round trip independently and reject horizontal or legacy imports', () => {
  const settings = Model.Settings.normalize({ safeTop: 324, safeBottom: 87, source: 'manual', manualTime: '12:36', background: '#123456', radius: 49.7, gap: 7.3 });
  const text = Config.serialize(Model, settings), imported = Portrait.parse(text);
  assert.equal(imported.model, Model); assert.deepEqual(imported.settings, settings);
  assert.equal(JSON.parse(text).type, 'portrait');
  for (const landscape of Landscape.models) {
    assert.throws(() => Portrait.parse(Config.serialize(landscape, {})), /竖排配置/);
    assert.throws(() => Landscape.parse(text), /暂不支持/);
  }
  assert.throws(() => Portrait.parse(JSON.stringify({ version: 1, settings: {} })), /竖排配置/);
  for (const patch of [{ safeTop: -1 }, { safeBottom: 1201 }, { manualTime: '24:00' }]) {
    assert.throws(() => Portrait.parse(JSON.stringify({ version: 2, type: 'portrait', model: 'amt72v', settings: patch })), /无效/);
  }
  assert.equal(Model.Settings.defaults.canvasWidth, 1080); assert.equal(Model.Settings.defaults.canvasHeight, 1920);
  assert.equal(Model.Settings.normalize({ shortLength: 100, longLength: 80 }).shortLength, 80);
});
