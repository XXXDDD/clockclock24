'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const Landscape = require('../src/models/landscape.js');
const Config = require('../src/shared/config.js');
const models = Landscape.models.filter(model => model.id !== 'clockclock24');
const sameAngle = (actual, expected) => {
  assert.ok(Math.abs(Math.sin(actual) - Math.sin(expected)) < 1e-8);
  assert.ok(Math.abs(Math.cos(actual) - Math.cos(expected)) < 1e-8);
};
function settled(model, instance, minutes) {
  const pose = model.digitPose(model.displayDigits(minutes, instance.state.format24));
  instance.hands.forEach((hand, index) => {
    sameAngle(hand.angle, pose[index].angle);
    assert.equal(hand.used, pose[index].used);
    assert.equal(hand.opacity, hand.used || instance.state.visibility === 'show' ? 1 : instance.state.visibility === 'ghost' ? .12 : 0);
  });
}

test('large models have the intended arrays and distinct, finite glyphs for all ten digits', () => {
  assert.deepEqual(models.map(model => [model.count, model.columns, model.rows]), [[72, 12, 6], [120, 15, 8], [144, 18, 8], [288, 24, 12]]);
  for (const model of models) {
    const signatures = new Set();
    for (let digit = 0; digit < 10; digit++) {
      const pose = model.digitPose(String(digit).repeat(4));
      assert.equal(pose.length, model.count * 2);
      assert.ok(pose.every(hand => Number.isFinite(hand.angle) && typeof hand.used === 'boolean'));
      assert.ok(pose.some(hand => hand.used));
      signatures.add(JSON.stringify(pose));
    }
    assert.equal(signatures.size, 10, model.id + ' must distinguish every digit');
    const clock = model.create({});
    for (const format24 of [true, false]) {
      clock.update({ format24 }, 0);
      for (let minute = 0; minute < 1440; minute++) {
        clock.initialize(minute, 0); clock.sample(1); settled(model, clock, minute);
      }
    }
  }
});

test('large arrays keep all circles and their board inside every supported canvas', () => {
  for (const model of models) for (const [width, height] of [[1920, 1080], [3440, 1440], [1280, 1024], [1080, 1920], [240, 240]]) {
    for (const radius of [20, 43, 65]) for (const gap of [0, 10, 40]) for (const offset of [-100, 0, 100]) {
      const geometry = model.geometry(width, height, { radius, gap, scale: 100, padding: 160, offsetX: offset, offsetY: offset });
      assert.equal(geometry.points.length, model.count);
      assert.ok(geometry.x >= -1e-8 && geometry.y >= -1e-8);
      assert.ok(geometry.x + geometry.width <= width + 1e-8 && geometry.y + geometry.height <= height + 1e-8);
      const locations = new Set();
      geometry.points.forEach((point, index) => {
        assert.equal(point.i, index * 2);
        assert.ok(point.x - radius >= 0 && point.x + radius <= geometry.boardWidth);
        assert.ok(point.y - radius >= 0 && point.y + radius <= geometry.boardHeight);
        locations.add(point.x + ':' + point.y);
      });
      assert.equal(locations.size, model.count);
    }
  }
});

test('waves stagger by column and settle all hands before the configured deadline', () => {
  for (const model of models) for (const duration of [1, 6, 10]) for (const visibility of ['hide', 'ghost', 'show']) {
    const clock = model.create({ duration, visibility });
    clock.initialize(1439, 0); assert.equal(clock.animate(0, 100), true);
    assert.ok(clock.hands[0].start < clock.hands[(model.columns - 1) * 2].start);
    for (let column = 1; column < model.columns; column++) assert.ok(clock.hands[column * 2].start > clock.hands[(column - 1) * 2].start);
    for (const hand of clock.hands) {
      assert.ok(Math.abs(hand.fadeEnd - (100 + duration * 1000)) < 1e-8);
      assert.ok(Math.abs(hand.motionEnd - (hand.start + hand.duration)) < 1e-8);
    }
    for (const fraction of [0, .15, .4, .8, .99]) {
      clock.sample(100 + duration * 1000 * fraction);
      assert.ok(clock.hands.every(hand => Number.isFinite(hand.angle) && hand.opacity >= 0 && hand.opacity <= 1));
    }
    clock.sample(100 + duration * 1000); settled(model, clock, 0);
    assert.equal(clock.isAnimating(100 + duration * 1000), false);
  }
});

test('interrupting large-array animations keeps angles and opacity continuous', () => {
  for (const model of models) for (const motion of ['wave', 'spin', 'quiet']) {
    const clock = model.create({ motion }); clock.initialize(0, 0); clock.animate(65, 100);
    for (const now of [200, 1300, 5900, 6050]) {
      clock.sample(now);
      const before = clock.hands.map(hand => ({ angle: hand.angle, opacity: hand.opacity }));
      clock.animate(808, now, true); clock.sample(now);
      clock.hands.forEach((hand, index) => { sameAngle(hand.angle, before[index].angle); assert.ok(Math.abs(hand.opacity - before[index].opacity) < 1e-8); });
      clock.setVisibility('show', now); clock.sample(now);
      clock.hands.forEach((hand, index) => { sameAngle(hand.angle, before[index].angle); assert.ok(Math.abs(hand.opacity - before[index].opacity) < 1e-8); });
    }
    clock.sample(13000); settled(model, clock, 808);
  }
});

test('large models honor immediate and reduced-motion transitions', () => {
  for (const model of models) {
    const immediate = model.create({ motion: 'none' }); immediate.initialize(1439, 0); immediate.animate(0, 1); settled(model, immediate, 0);
    const reduced = model.create({}, { reducedMotion: true }); reduced.initialize(0, 0); reduced.animate(1439, 100);
    reduced.hands.forEach(hand => { assert.ok(Math.abs(hand.to - hand.from) <= Math.PI + 1e-8); assert.equal(hand.fadeEnd, 400); });
    reduced.sample(400); settled(model, reduced, 1439);
  }
});

test('imports select the recorded model and preserve each model\'s settings', () => {
  for (const model of Landscape.models) {
    const settings = model.Settings.normalize({ radius: 48.2, source: 'manual', manualTime: '23:59', duration: 7.5, background: '#123456' });
    const imported = Landscape.parse(Config.serialize(model, settings));
    assert.equal(imported.model, model); assert.deepEqual(imported.settings, settings);
    for (const other of Landscape.models.filter(entry => entry !== model)) assert.throws(() => Config.parse(other, Config.serialize(model, settings)), /种类或型号/);
  }
  assert.equal(Landscape.parse(JSON.stringify({ version: 1, settings: { motion: 'wave', board: '#123456' } })).model.id, 'clockclock24');
  assert.throws(() => Landscape.parse(JSON.stringify({ version: 2, type: 'portrait', model: 'amt72', settings: {} })), /种类或型号/);
  assert.throws(() => Landscape.parse(JSON.stringify({ version: 2, type: 'landscape', model: 'amt999', settings: {} })), /暂不支持/);
});

// Independent photo fixtures: AMT72 shows 09:34; AMT120/144/288 show 09:35.
// These assertions compare photographed clock directions, not output against itself.
const photoGlyphs = {
  '0': ['SE EW SW', 'NS SS NS', 'NS NS NS', 'NS NS NS', 'NS NN NS', 'NE EW NW'],
  '9': ['SE EW SW', 'NS SS NS', 'NS NN NS', 'NE SW NS', 'SE NW NS', 'NE EW NW'],
  '3': ['SE EW SW', 'NE SW NS', 'SE NW NS', 'NE SW NS', 'SE NW NS', 'NE EW NW'],
  '4': ['SE SW SW', 'NS NS NS', 'NS NE NS', 'NE SW NS', 'PP NS NS', 'PP NE NW'],
  '5': ['SE EW SW', 'NS SE NW', 'NS NE SW', 'NE SW NS', 'SE NW NS', 'NE EW NW']
};
const widePhotoGlyphs = {
  '0': ['SE EW EW EW SW', 'NS SE EW SW NS', 'NS NS PP NS NS', 'NS NS PP NS NS', 'NS NE EW NW NS', 'NE EW EW EW NW'],
  '9': ['SE EW EW EW SW', 'NS SE EW SW NS', 'NS NE EW NW NS', 'NE EW EW SW NS', 'SE EW EW NW NS', 'NE EW EW EW NW'],
  '3': ['SE EW EW EW SW', 'NE EW EW SW NS', 'SE EW EW NW NS', 'NE EW EW SW NS', 'SE EW EW NW NS', 'NE EW EW EW NW'],
  '5': ['SE EW EW EW SW', 'NS SE EW EW NW', 'NS NE EW EW SW', 'NE EW EW SW NS', 'SE EW EW NW NS', 'NE EW EW EW NW']
};
function assertPhoto(model, digits, starts, top, glyphs, colon = []) {
  const expected = Array.from({ length: model.count }, () => 'PP');
  for (let digit = 0; digit < 4; digit++) glyphs[digits[digit]].forEach((row, y) => row.split(' ').forEach((pair, x) => {
    expected[(top + y) * model.columns + starts[digit] + x] = pair;
  }));
  for (const [x, y] of colon) {
    expected[y * model.columns + x] = 'SE'; expected[y * model.columns + x + 1] = 'SW';
    expected[(y + 1) * model.columns + x] = 'NE'; expected[(y + 1) * model.columns + x + 1] = 'NW';
  }
  const angles = { E: 0, S: 90, W: 180, N: 270, P: 135 }, pose = model.digitPose(digits);
  expected.forEach((pair, index) => {
    const actual = pose.slice(index * 2, index * 2 + 2).map(hand => Math.round((hand.angle * 180 / Math.PI + 360) % 360)).sort((a, b) => a - b);
    assert.deepEqual(actual, [...pair].map(letter => angles[letter]).sort((a, b) => a - b), model.id + ' photo cell ' + index);
    assert.equal(pose[index * 2].used || pose[index * 2 + 1].used, pair !== 'PP');
  });
}

test('AMT72 fills all six rows and twelve columns with the photographed 09:34 poses', () => {
  assertPhoto(Landscape.get('amt72'), '0934', [0, 3, 6, 9], 0, photoGlyphs);
});

test('AMT120 and AMT144 reproduce the photographed 09:35 outlines and spacing', () => {
  assertPhoto(Landscape.get('amt120'), '0935', [1, 4, 8, 11], 1, photoGlyphs);
  assertPhoto(Landscape.get('amt144'), '0935', [2, 5, 10, 13], 1, photoGlyphs, [[8, 2], [8, 4]]);
});

test('AMT288 uses five-column outlines, a hollow zero and the photographed central placement', () => {
  assertPhoto(Landscape.get('amt288'), '0935', [1, 6, 13, 18], 3, widePhotoGlyphs, [[11, 4], [11, 6]]);
});

test('reference proportions and idle diagonal hands survive resizing', () => {
  const ratios = { amt72: 173 / 95, amt120: 212 / 121, amt144: 262.4 / 130.4, amt288: 345.6 / 187.2 };
  for (const model of models) {
    assert.equal(model.Settings.defaults.visibility, 'show');
    const clock = model.create({}); clock.initialize(574, 0);
    assert.ok(clock.hands.every(hand => hand.opacity === 1));
    for (const [radius, gap] of [[20, 0], [43, 4.3], [65, 40]]) {
      const geometry = model.geometry(1920, 1080, { radius, gap });
      assert.ok(Math.abs(geometry.boardWidth / geometry.boardHeight - ratios[model.id]) < 1e-8);
    }
  }
});
