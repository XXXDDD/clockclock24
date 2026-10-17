'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const Model = require('../src/models/amt120/model.js');
const Landscape = require('../src/models/landscape.js');
const Config = require('../src/shared/config.js');
const near = (a, b, tolerance = 1e-7) => assert.ok(Math.abs(a - b) < tolerance, `${a} versus ${b}`);
const sameAngle = (a, b) => near(Math.atan2(Math.sin(a - b), Math.cos(a - b)), 0);
const unit = 43400 / 43.36;
function performance(config = {}, options) {
  const clock = Model.create({ motion: 'wave', duration: 43.4, ...config }, options);
  clock.initialize(574, 0); clock.animate(575, 0); return clock;
}
function settled(clock, minute, now) {
  clock.sample(now);
  const target = Model.digitPose(Model.displayDigits(minute, clock.state.format24));
  clock.hands.forEach((h, i) => {
    sameAngle(h.angle, target[i].angle);
    near(h.opacity, target[i].used || clock.state.visibility === 'show' ? 1 : clock.state.visibility === 'ghost' ? .12 : 0);
  });
}
function movingState(clock, now) {
  clock.sample(now - .001); const before = clock.hands.map(h => h.angle);
  clock.sample(now);
  return clock.hands.map((h, i) => ({ angle: h.angle, opacity: h.opacity, velocity: (h.angle - before[i]) / .001 }));
}

test('AMT120 registers its independent settings and preserves saved values', () => {
  assert.equal(Landscape.get('amt120'), Model); assert.equal(Model.Settings.defaults.duration, 43.4);
  assert.equal(Model.Settings.defaults.visibility, 'show'); assert.match(Model.motionReference, /2a1a2d37452a4306a0f95211d7b3e436/);
  assert.notEqual(Model.Settings, Landscape.get('amt72').Settings);
  const settings = Config.parse(Model, JSON.stringify({ version: 2, type: 'landscape', model: 'amt120',
    settings: { duration: 6, visibility: 'ghost', motion: 'wave', longWidth: 5.6, board: '#123456' } }));
  assert.equal(settings.duration, 6); assert.equal(settings.visibility, 'ghost'); assert.equal(settings.longWidth, 5.6);
  assert.deepEqual(Config.parse(Model, Config.serialize(Model, settings)), settings);
  assert.equal(Landscape.get('amt72').Settings.defaults.duration, 43.4);
  assert.equal(Landscape.get('clockclock24').Settings.defaults.duration, 40.1);
  assert.notEqual(Model.Settings, Landscape.get('amt144').Settings);
  assert.notEqual(Model.Settings, Landscape.get('amt288').Settings);
});

test('AMT120 reproduces the filmed first and last glyphs with peripheral diagonal hands and no colon', () => {
  // Independent transcription of the 09:34 / 09:35 source frames.
  const glyphs = {
    '0': ['SE EW SW', 'NS SS NS', 'NS NS NS', 'NS NS NS', 'NS NN NS', 'NE EW NW'],
    '9': ['SE EW SW', 'NS SS NS', 'NS NN NS', 'NE SW NS', 'SE NW NS', 'NE EW NW'],
    '3': ['SE EW SW', 'NE SW NS', 'SE NW NS', 'NE SW NS', 'SE NW NS', 'NE EW NW'],
    '4': ['SE SW SW', 'NS NS NS', 'NS NE NS', 'NE SW NS', 'PP NS NS', 'PP NE NW'],
    '5': ['SE EW SW', 'NS SE NW', 'NS NE SW', 'NE SW NS', 'SE NW NS', 'NE EW NW']
  };
  const angle = { E: 0, S: 90, W: 180, N: 270, P: 135 };
  for (const digits of ['0934', '0935']) {
    const expected = Array(120).fill('PP');
    [1, 4, 8, 11].forEach((left, d) => glyphs[digits[d]].forEach((row, y) => row.split(' ').forEach((pair, x) => {
      expected[(y + 1) * 15 + left + x] = pair;
    })));
    const pose = Model.digitPose(digits);
    expected.forEach((pair, cell) => {
      const actual = pose.slice(cell * 2, cell * 2 + 2).map(h => Math.round((h.angle * 180 / Math.PI + 360) % 360)).sort((a, b) => a - b);
      assert.deepEqual(actual, [...pair].map(c => angle[c]).sort((a, b) => a - b));
      assert.equal(pose[cell * 2].used || pose[cell * 2 + 1].used, pair !== 'PP');
    });
  }
});

test('AMT120 holds curved ring arms, with a central angle near 120 degrees and near-tangent outer arms', () => {
  const clock = performance();
  for (const [time, cells] of [[11, [52, 67]], [14, [0, 14, 105, 119]]]) {
    clock.sample(time * unit);
    for (const cell of cells) {
      const radius = Math.hypot(cell % 15 - 7, Math.floor(cell / 15) - 3.5);
      const theta = Math.atan2(3.5 - Math.floor(cell / 15), 7 - cell % 15), gamma = Math.atan2(radius, .3);
      sameAngle(clock.hands[cell * 2].angle, theta - gamma);
      sameAngle(clock.hands[cell * 2 + 1].angle, theta + gamma);
    }
  }
  clock.sample(11 * unit);
  near(Math.abs(Math.atan2(Math.sin(clock.hands[104].angle - clock.hands[105].angle),
    Math.cos(clock.hands[104].angle - clock.hands[105].angle))) * 180 / Math.PI, 120, 3);
  clock.sample(14 * unit);
  assert.ok(Math.abs(Math.sin(clock.hands[104].angle - clock.hands[105].angle)) > .8);
});

test('AMT120 opening phases follow the observed inner and corner trajectories', () => {
  const clock = performance(); clock.sample(11 * unit); const inner = clock.hands[104].angle;
  clock.sample(14 * unit); const corner = clock.hands[0].angle;
  for (const [time, phase] of [[13, 6.9], [14, 22.79], [16, 70.25], [18, 124.64], [20, 188.74], [22, 258.38],
    [24, 329.18], [26, 405.58], [28, 479.78], [30, 554.94], [32, 630.59], [34, 706.8]]) {
    clock.sample(time * unit); near((clock.hands[104].angle - inner) * 180 / Math.PI, phase, 4);
  }
  for (const [time, phase] of [[18, 32], [20, 80], [22, 142], [24, 208], [28, 350], [32, 499], [34, 573]]) {
    clock.sample(time * unit); near((clock.hands[0].angle - corner) * 180 / Math.PI, phase, 5);
  }
});

test('AMT120 ring wave retains symmetry and the original opposite winding directions into forming', () => {
  const clock = performance();
  for (const time of [18, 24, 30, 33]) {
    clock.sample(time * unit);
    for (let cell = 0; cell < 120; cell++) {
      const theta = Math.atan2(3.5 - Math.floor(cell / 15), 7 - cell % 15);
      sameAngle(clock.hands[cell * 2].angle + clock.hands[cell * 2 + 1].angle, 2 * theta);
    }
  }
  const winding = movingState(clock, 17 * unit).map(h => Math.sign(h.velocity));
  for (let i = 0; i < 240; i += 2) { assert.notEqual(winding[i], 0); assert.equal(winding[i], -winding[i + 1]); }
  let previous = clock.hands.map(h => h.angle);
  for (let now = 17 * unit + 30; now < 43400; now += 30) {
    clock.sample(now);
    clock.hands.forEach((h, i) => assert.ok((h.angle - previous[i]) * winding[i] >= -1e-8));
    previous = clock.hands.map(h => h.angle);
  }
  for (const cell of [0, 7, 14, 45, 49, 52, 67, 105, 119]) {
    const radius = Math.hypot(cell % 15 - 7, Math.floor(cell / 15) - 3.5), boundary = (34 + .48 * (radius - .5)) * unit;
    const before = movingState(clock, boundary - .02), after = movingState(clock, boundary + .02);
    for (const i of [cell * 2, cell * 2 + 1]) near(before[i].velocity, after[i].velocity, 1e-7);
  }
  settled(clock, 575, 43400);
});

test('AMT120 short forming arcs brake directly and stop before their longer partner', () => {
  const clock = performance(); clock.sample(34 * unit);
  const shortFrom = clock.hands[105].angle, shortEnd = clock.hands[105].motionEnd, longEnd = clock.hands[104].motionEnd;
  near((shortFrom - clock.hands[105].to) * 180 / Math.PI, 27.2, 4);
  assert.ok(shortEnd < 40000); assert.ok(shortEnd < longEnd - 1500);
  clock.sample(shortEnd + 1); const stopped = clock.hands[105].angle;
  sameAngle(stopped, Math.PI * .75);
  clock.sample(longEnd - 10); sameAngle(clock.hands[105].angle, stopped);
  assert.ok(new Set(clock.hands.map(h => h.motionEnd)).size > 100);
});

test('AMT120 target updates and moving replays preserve angle, velocity and alpha in every stage', () => {
  for (const action of ['retarget', 'animate']) for (const visibility of ['show', 'hide', 'ghost']) {
    for (const now of [1800, 11000, 23000, 35000, 42000, 43300]) {
      const clock = performance({ visibility }), before = movingState(clock, now);
      assert.equal(clock[action](728, now, true), true); clock.sample(now);
      clock.hands.forEach((h, i) => { sameAngle(h.angle, before[i].angle); near(h.opacity, before[i].opacity); });
      clock.sample(now + .001);
      clock.hands.forEach((h, i) => near((h.angle - before[i].angle) / .001, before[i].velocity, 2e-6));
      settled(clock, 728, now + 121000);
    }
  }
});

test('AMT120 live target changes leave the unfinished ring wave intact', () => {
  const clock = performance(), control = performance();
  clock.retarget(728, 16000);
  for (const now of [16000, 22000, 30000, 33900]) {
    clock.sample(now); control.sample(now);
    clock.hands.forEach((h, i) => sameAngle(h.angle, control.hands[i].angle));
  }
  settled(clock, 728, 43400);
});

test('AMT120 color and visibility changes preserve both moving and fading hands', () => {
  const clock = performance({ visibility: 'hide' });
  for (const now of [9000, 22000, 38500, 43000, 44000]) for (const visibility of ['ghost', 'show', 'hide']) {
    clock.sample(now); const before = clock.hands.map(h => ({ angle: h.angle, opacity: h.opacity }));
    clock.update({ visibility, board: '#123456', long: '#abcdef' }, now); clock.sample(now);
    clock.hands.forEach((h, i) => { sameAngle(h.angle, before[i].angle); near(h.opacity, before[i].opacity); });
  }
  settled(clock, 575, 45000);
});

test('AMT120 reaches every minute in both formats at the shortest, reference and longest durations', () => {
  for (const format24 of [true, false]) for (let minute = 0; minute < 1440; minute++) {
    const clock = performance({ duration: 1, format24 }); clock.animate(minute, 50, true); settled(clock, minute, 1050);
  }
  for (const duration of [1, 43.4, 120]) for (const visibility of ['hide', 'ghost', 'show']) {
    const clock = performance({ duration, visibility });
    for (const p of [.1, .25, .5, .75, .9, .99]) {
      const now = duration * 1000 * p; clock.sample(now);
      clock.hands.forEach(h => {
        assert.ok(Number.isFinite(h.angle) && h.opacity >= 0 && h.opacity <= 1);
        if (now > h.revealEnd && now < h.motionEnd) near(h.opacity, 1);
      });
    }
    settled(clock, 575, duration * 1000); assert.equal(clock.isAnimating(duration * 1000), false);
  }
});

test('AMT120 quiet, immediate, spin and reduced-motion transitions preserve the original controls', () => {
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
