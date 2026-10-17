'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const Model = require('../src/models/amt144/model.js');
const Landscape = require('../src/models/landscape.js');
const Config = require('../src/shared/config.js');
const near = (a, b, tolerance = 1e-7) => assert.ok(Math.abs(a - b) < tolerance, `${a} versus ${b}`);
const sameAngle = (a, b) => near(Math.atan2(Math.sin(a - b), Math.cos(a - b)), 0);
const unit = 54400 / 54.36;
function performance(config = {}, options) {
  const clock = Model.create({ motion: 'wave', duration: 54.4, ...config }, options);
  clock.initialize(574, 0); clock.animate(575, 0); return clock;
}
function settled(clock, minute, now) {
  clock.sample(now);
  const target = Model.digitPose(Model.displayDigits(minute, clock.state.format24));
  clock.hands.forEach((h, i) => {
    sameAngle(h.angle, target[i].angle);
    near(h.opacity, (target[i].used || target[i ^ 1].used) || clock.state.visibility === 'show' ? 1 : clock.state.visibility === 'ghost' ? .12 : 0);
  });
}
function movingState(clock, now) {
  clock.sample(now - .001); const before = clock.hands.map(h => h.angle);
  clock.sample(now);
  return clock.hands.map((h, i) => ({ angle: h.angle, opacity: h.opacity, velocity: (h.angle - before[i]) / .001 }));
}

test('AMT144 registers an independent remaster while preserving old configurations and other models', () => {
  assert.equal(Landscape.get('amt144'), Model); assert.equal(Model.Settings.defaults.duration, 54.4);
  assert.equal(Model.Settings.defaults.visibility, 'show'); assert.match(Model.motionReference, /ab5cc7720a4c4034823baf8359c2b619/);
  for (const id of ['amt72', 'amt120', 'amt288']) assert.notEqual(Model.Settings, Landscape.get(id).Settings);
  const settings = Config.parse(Model, JSON.stringify({ version: 2, type: 'landscape', model: 'amt144',
    settings: { duration: 6, visibility: 'ghost', motion: 'wave', longWidth: 5.6, board: '#123456' } }));
  assert.equal(settings.duration, 6); assert.equal(settings.visibility, 'ghost'); assert.equal(settings.longWidth, 5.6);
  assert.deepEqual(Config.parse(Model, Config.serialize(Model, settings)), settings);
  assert.equal(Landscape.get('amt288').Settings.defaults.duration, 54.2);
  assert.equal(Landscape.get('amt288').Settings.defaults.board, '#f6f4ef');
  assert.equal(Landscape.get('amt120').Settings.defaults.duration, 43.4);
  const wallpaper = require('../src/lively/config.js');
  assert.equal(wallpaper.defaults.duration, 6); assert.equal(wallpaper.fields.duration.max, 10);
});

test('AMT144 preserves the filmed first and last glyphs, two square colons and surrounding idle rows', () => {
  const glyphs = {
    '0': ['SE EW SW', 'NS SS NS', 'NS NS NS', 'NS NS NS', 'NS NN NS', 'NE EW NW'],
    '9': ['SE EW SW', 'NS SS NS', 'NS NN NS', 'NE SW NS', 'SE NW NS', 'NE EW NW'],
    '3': ['SE EW SW', 'NE SW NS', 'SE NW NS', 'NE SW NS', 'SE NW NS', 'NE EW NW'],
    '4': ['SE SW SW', 'NS NS NS', 'NS NE NS', 'NE SW NS', 'PP NS NS', 'PP NE NW'],
    '5': ['SE EW SW', 'NS SE NW', 'NS NE SW', 'NE SW NS', 'SE NW NS', 'NE EW NW']
  };
  const angles = { E: 0, S: 90, W: 180, N: 270, P: 135 };
  for (const digits of ['0934', '0935']) {
    const expected = Array(144).fill('PP');
    [2, 5, 10, 13].forEach((left, d) => glyphs[digits[d]].forEach((row, y) => row.split(' ').forEach((pair, x) => {
      expected[(y + 1) * 18 + left + x] = pair;
    })));
    for (const y of [2, 4]) {
      expected[y * 18 + 8] = 'SE'; expected[y * 18 + 9] = 'SW';
      expected[(y + 1) * 18 + 8] = 'NE'; expected[(y + 1) * 18 + 9] = 'NW';
    }
    const pose = Model.digitPose(digits);
    expected.forEach((pair, cell) => {
      const actual = pose.slice(cell * 2, cell * 2 + 2).map(h => Math.round((h.angle * 180 / Math.PI + 360) % 360)).sort((a, b) => a - b);
      assert.deepEqual(actual, [...pair].map(c => angles[c]).sort((a, b) => a - b));
      assert.equal(pose[cell * 2].used || pose[cell * 2 + 1].used, pair !== 'PP');
    });
  }
  const geometry = Model.geometry(1920, 1080, {});
  near(geometry.boardWidth / geometry.boardHeight, 262.4 / 130.4);
});

test('AMT144 aligns from left to right into opposite arms on the same diagonal', () => {
  const clock = performance();
  clock.sample(3 * unit);
  sameAngle(clock.hands[0].angle, Math.PI * .75);
  near(clock.hands[1].angle * 180 / Math.PI, 253, 5);
  sameAngle(clock.hands[34].angle, Math.PI * .75); sameAngle(clock.hands[35].angle, Math.PI * .75);
  for (const [time, col] of [[7, 0], [11, 8], [15, 17]]) {
    clock.sample(time * unit);
    sameAngle(clock.hands[col * 2].angle, Math.PI * .75);
    sameAngle(clock.hands[col * 2 + 1].angle, Math.PI * 1.75);
  }
  clock.sample(12 * unit);
  assert.ok(Math.abs(clock.hands[0].angle - Math.PI * .75) > .1);
  assert.ok(Math.abs(Math.sin(clock.hands[34].angle - clock.hands[35].angle)) > .2);
});

test('AMT144 column-wave phases follow the filmed left and right trajectories', () => {
  const clock = performance();
  for (const [time, phase] of [[12, 12], [14, 52], [18, 146], [22, 247], [26, 350], [30, 442], [34, 534]]) {
    clock.sample(time * unit); near((clock.hands[0].angle - Math.PI * .75) * 180 / Math.PI, phase, 4);
  }
  for (const [time, pose] of [[21, [167, 343]], [27, [306, 124]], [33, [94, 280]], [39, [242, 52]]]) {
    clock.sample(time * unit);
    for (let lane = 0; lane < 2; lane++) {
      const delta = clock.hands[34 + lane].angle - pose[lane] * Math.PI / 180;
      near(Math.atan2(Math.sin(delta), Math.cos(delta)), 0, 8 * Math.PI / 180);
    }
  }
});

test('AMT144 wave stays clockwise, antiparallel and synchronous within a column', () => {
  const clock = performance();
  for (const time of [20, 28, 34]) {
    const moving = movingState(clock, time * unit);
    for (let cell = 0; cell < 144; cell++) {
      const col = cell % 18;
      sameAngle(moving[cell * 2].angle - moving[cell * 2 + 1].angle, Math.PI);
      for (let lane = 0; lane < 2; lane++) {
        assert.ok(moving[cell * 2 + lane].velocity > 0);
        // Physical arm identities are not known; compare the unordered straight line.
        sameAngle(2 * moving[cell * 2 + lane].angle, 2 * moving[col * 2].angle);
      }
    }
  }
  for (const col of [0, 4, 8, 12, 17]) {
    const boundary = (34.8 + col * .48) * unit;
    const before = movingState(clock, boundary - .02), after = movingState(clock, boundary + .02);
    for (const i of [col * 2, col * 2 + 1]) near(before[i].velocity, after[i].velocity, 2e-7);
  }
});

test('AMT144 forming keeps a fast clockwise tour while the slow idle arm brakes and swings back', () => {
  const clock = performance();
  const fixtures = [[39, 100, 190], [45, 297, 171], [48, 25, 156], [51, 100, 143]];
  for (const [time, fast, slow] of fixtures) {
    clock.sample(time * unit);
    for (const [i, angle] of [[0, fast], [1, slow]]) {
      const delta = clock.hands[i].angle - angle * Math.PI / 180;
      near(Math.atan2(Math.sin(delta), Math.cos(delta)), 0, 10 * Math.PI / 180);
    }
  }
  assert.ok(movingState(clock, 37 * unit)[1].velocity > 0);
  assert.ok(movingState(clock, 45 * unit)[1].velocity < 0);
  let previous = movingState(clock, 35 * unit)[0].angle;
  for (let now = 35 * unit + 30; now < 54400; now += 30) {
    clock.sample(now); assert.ok(clock.hands[0].angle >= previous - 1e-8); previous = clock.hands[0].angle;
  }
  settled(clock, 575, 54400);
});

test('AMT144 target edits and replays preserve angle, velocity and opacity in every stage', () => {
  for (const action of ['retarget', 'animate']) for (const visibility of ['show', 'hide', 'ghost']) {
    for (const now of [1800, 8000, 24000, 37000, 47000, 54250]) {
      const clock = performance({ visibility }), before = movingState(clock, now);
      assert.equal(clock[action](728, now, true), true); clock.sample(now);
      clock.hands.forEach((h, i) => { sameAngle(h.angle, before[i].angle); near(h.opacity, before[i].opacity); });
      clock.sample(now + .001);
      clock.hands.forEach((h, i) => near((h.angle - before[i].angle) / .001, before[i].velocity, 2e-6));
      settled(clock, 728, now + 121000);
    }
  }
});

test('AMT144 live edits preserve the unfinished wave and keep the final target current', () => {
  const clock = performance(), control = performance(); clock.retarget(728, 19000);
  for (const now of [19000, 24000, 30000, 34700]) {
    clock.sample(now); control.sample(now);
    clock.hands.forEach((h, i) => sameAngle(h.angle, control.hands[i].angle));
  }
  settled(clock, 728, 54400);
});

test('AMT144 color and visibility changes preserve moving, fading and resting poses', () => {
  const clock = performance({ visibility: 'hide' });
  for (const now of [9000, 24000, 41000, 54200, 55000]) for (const visibility of ['ghost', 'show', 'hide']) {
    clock.sample(now); const before = clock.hands.map(h => ({ angle: h.angle, opacity: h.opacity }));
    clock.update({ visibility, board: '#123456', long: '#abcdef' }, now); clock.sample(now);
    clock.hands.forEach((h, i) => { sameAngle(h.angle, before[i].angle); near(h.opacity, before[i].opacity); });
  }
  settled(clock, 575, 56000);
});

test('AMT144 reaches every minute in both formats and supports 1 to 120 second performances', () => {
  for (const format24 of [true, false]) for (let minute = 0; minute < 1440; minute++) {
    const clock = performance({ duration: 1, format24 }); clock.animate(minute, 50, true); settled(clock, minute, 1050);
  }
  for (const duration of [1, 54.4, 120]) for (const visibility of ['hide', 'ghost', 'show']) {
    const clock = performance({ duration, visibility });
    for (const p of [.1, .25, .5, .75, .9, .99]) {
      const now = duration * 1000 * p; clock.sample(now);
      clock.hands.forEach(h => assert.ok(Number.isFinite(h.angle) && h.opacity >= 0 && h.opacity <= 1));
    }
    settled(clock, 575, duration * 1000); assert.equal(clock.isAnimating(duration * 1000), false);
  }
});

test('AMT144 quiet, immediate, spin and reduced-motion modes retain the existing controls', () => {
  for (const motion of ['none', 'quiet', 'spin']) {
    const clock = performance({ motion, duration: 4 });
    if (motion === 'quiet') {
      clock.sample(1500); const before = clock.hands.map(h => ({ ...h }));
      assert.equal(clock.animate(575, 1500, true), false); assert.deepEqual(clock.hands, before);
    }
    settled(clock, 575, 4000);
  }
  const clock = performance({}, { reducedMotion: true });
  clock.hands.forEach(h => { assert.ok(Math.abs(h.to - h.from) <= Math.PI + 1e-8); assert.equal(h.fadeEnd, 300); });
  settled(clock, 575, 300);
});
