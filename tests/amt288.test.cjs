'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const Model = require('../src/models/amt288/model.js');
const Landscape = require('../src/models/landscape.js');
const Config = require('../src/shared/config.js');
const near = (a, b, tolerance = 1e-7) => assert.ok(Math.abs(a - b) < tolerance, `${a} versus ${b}`);
const sameAngle = (a, b) => near(Math.atan2(Math.sin(a - b), Math.cos(a - b)), 0);
const unit = 54200 / 54.24;
const rad = degrees => degrees * Math.PI / 180;
function performance(config = {}, options) {
  const clock = Model.create({ motion: 'wave', duration: 54.2, ...config }, options);
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
function pairNear(clock, cell, expected, tolerance = 5) {
  const actual = clock.hands.slice(cell * 2, cell * 2 + 2).map(h => h.angle);
  const delta = (a, b) => Math.abs(Math.atan2(Math.sin(a - b), Math.cos(a - b)));
  const desired = expected.map(rad);
  assert.ok(Math.min(Math.max(delta(actual[0], desired[0]), delta(actual[1], desired[1])),
    Math.max(delta(actual[0], desired[1]), delta(actual[1], desired[0]))) < rad(tolerance),
  `cell ${cell}: ${actual.map(a => (a * 180 / Math.PI % 360 + 360) % 360)} versus ${expected}`);
}

test('AMT288 uses the requested White source and independent white defaults while restoring old settings', () => {
  assert.equal(Landscape.get('amt288'), Model);
  assert.match(Model.reference, /288-white/); assert.match(Model.motionReference, /34b1aeeb08e84e0cb47a29fcb7900421/);
  assert.equal(Model.Settings.defaults.duration, 54.2); assert.equal(Model.Settings.defaults.board, '#f6f4ef');
  assert.equal(Model.Settings.defaults.long, '#252624'); assert.equal(Model.Settings.defaults.short, '#252624');
  assert.equal(Model.Settings.defaults.visibility, 'show');
  for (const id of ['amt72', 'amt120', 'amt144']) assert.notEqual(Model.Settings, Landscape.get(id).Settings);
  const old = Config.parse(Model, JSON.stringify({ version: 2, type: 'landscape', model: 'amt288',
    settings: { duration: 6, motion: 'wave', visibility: 'ghost', board: '#111213', longWidth: 5.6 } }));
  assert.equal(old.duration, 6); assert.equal(old.visibility, 'ghost'); assert.equal(old.board, '#111213'); assert.equal(old.longWidth, 5.6);
  assert.deepEqual(Config.parse(Model, Config.serialize(Model, old)), old);
  assert.equal(require('../src/lively/config.js').defaults.duration, 6);
});

test('AMT288 matches the filmed wide 09:34 and 09:35 outlines, hollow zero, wide four and both colons', () => {
  const glyphs = {
    '0': ['SE EW EW EW SW', 'NS SE EW SW NS', 'NS NS PP NS NS', 'NS NS PP NS NS', 'NS NE EW NW NS', 'NE EW EW EW NW'],
    '9': ['SE EW EW EW SW', 'NS SE EW SW NS', 'NS NE EW NW NS', 'NE EW EW SW NS', 'SE EW EW NW NS', 'NE EW EW EW NW'],
    '3': ['SE EW EW EW SW', 'NE EW EW SW NS', 'SE EW EW NW NS', 'NE EW EW SW NS', 'SE EW EW NW NS', 'NE EW EW EW NW'],
    '4': ['SE SW PP SE SW', 'NS NS PP NS NS', 'NS NE EW NW NS', 'NE EW EW SW NS', 'PP PP PP NS NS', 'PP PP PP NE NW'],
    '5': ['SE EW EW EW SW', 'NS SE EW EW NW', 'NS NE EW EW SW', 'NE EW EW SW NS', 'SE EW EW NW NS', 'NE EW EW EW NW']
  };
  const angles = { E: 0, S: 90, W: 180, N: 270, P: 135 };
  for (const digits of ['0934', '0935']) {
    const expected = Array(288).fill('PP');
    [1, 6, 13, 18].forEach((left, d) => glyphs[digits[d]].forEach((row, y) => row.split(' ').forEach((pair, x) => {
      expected[(y + 3) * 24 + left + x] = pair;
    })));
    for (const y of [4, 6]) {
      expected[y * 24 + 11] = 'SE'; expected[y * 24 + 12] = 'SW';
      expected[(y + 1) * 24 + 11] = 'NE'; expected[(y + 1) * 24 + 12] = 'NW';
    }
    const pose = Model.digitPose(digits);
    expected.forEach((pair, cell) => {
      const actual = pose.slice(cell * 2, cell * 2 + 2).map(h => Math.round((h.angle * 180 / Math.PI + 360) % 360)).sort((a, b) => a - b);
      assert.deepEqual(actual, [...pair].map(c => angles[c]).sort((a, b) => a - b), `cell ${cell}`);
      assert.equal(pose[cell * 2].used || pose[cell * 2 + 1].used, pair !== 'PP');
    });
  }
  const geometry = Model.geometry(1920, 1080, {});
  near(geometry.boardWidth / geometry.boardHeight, 345.6 / 187.2);
});

test('AMT288 White preserves its fixed digit modules and idle border at every time', () => {
  for (const format24 of [true, false]) for (let minute = 0; minute < 1440; minute++) {
    const digits = Model.displayDigits(minute, format24), pose = Model.digitPose(digits);
    const cells = Array.from({ length: 288 }, (_, cell) => cell).filter(cell => pose[cell * 2].used || pose[cell * 2 + 1].used);
    const columns = cells.map(cell => cell % 24), rows = cells.map(cell => Math.floor(cell / 24));
    assert.deepEqual([Math.min(...columns), Math.max(...columns), Math.min(...rows), Math.max(...rows)],
      [digits[0] === '1' ? 3 : 1, digits[3] === '1' ? 21 : 22, 3, 8], digits + ' readout bounds');
    for (let cell = 0; cell < 288; cell++) {
      if (cell % 24 !== 0 && cell % 24 !== 23 && Math.floor(cell / 24) >= 3 && Math.floor(cell / 24) <= 8) continue;
      for (const hand of pose.slice(cell * 2, cell * 2 + 2)) {
        assert.equal(hand.used, false, digits + ' border cell ' + cell);
        sameAngle(hand.angle, rad(135));
      }
    }
  }
});

test('AMT288 White uses the same central 1 in every slot and keeps other digits and colons in place', () => {
  for (const digits of ['1359', '0159', '0919', '0931', '1111']) {
    const pose = Model.digitPose(digits), reference = Model.digitPose(digits.replaceAll('1', '0'));
    for (const [digit, left] of [1, 6, 13, 18].entries()) {
      if (digits[digit] !== '1') continue;
      for (let row = 0; row < 6; row++) {
        const first = ((row + 3) * 24 + left) * 2;
        const pairs = row === 0 ? [[0, 90], [90, 180]] : row === 5 ? [[0, 270], [180, 270]] : [[90, 270], [90, 270]];
        for (let col = 0; col < 5; col++) {
          const hands = pose.slice(first + col * 2, first + col * 2 + 2);
          assert.deepEqual(hands.map(h => Math.round((h.angle * 180 / Math.PI + 360) % 360)).sort((a, b) => a - b),
            col === 2 || col === 3 ? pairs[col - 2] : [135, 135], digits + ' slot ' + digit + ' row ' + row);
        }
      }
    }
    for (let cell = 0; cell < 288; cell++) {
      if ([1, 6, 13, 18].some((left, digit) => digits[digit] === '1' && cell % 24 >= left && cell % 24 < left + 5)) continue;
      assert.deepEqual(pose.slice(cell * 2, cell * 2 + 2), reference.slice(cell * 2, cell * 2 + 2));
    }
  }
});

test('AMT288 arranges the center before the corners and preserves clockwise and counterclockwise openings', () => {
  const clock = performance();
  clock.sample(5 * unit);
  pairNear(clock, 0, [135, 135]); pairNear(clock, 287, [135, 135]);
  assert.ok(movingState(clock, 5 * unit).some(h => h.velocity < -.00001));
  assert.ok(movingState(clock, 5 * unit).some(h => h.velocity > .00001));
  clock.sample(16 * unit); pairNear(clock, 131, [336, 115]);
  clock.sample(18 * unit);
  for (const cell of [0, 23, 264, 287, 131, 132, 155, 156]) {
    const theta = Math.atan2(5.5 - Math.floor(cell / 24), 11.5 - cell % 24);
    const gamma = Math.atan2(Math.hypot(cell % 24 - 11.5, Math.floor(cell / 24) - 5.5), .26);
    pairNear(clock, cell, [(theta - gamma) * 180 / Math.PI, (theta + gamma) * 180 / Math.PI], .01);
  }
  clock.sample(20 * unit);
  pairNear(clock, 0, [114.6, 298.4]);
  pairNear(clock, 131, [82, 8], 9);
});

test('AMT288 inner and outer phases follow the independently observed White video', () => {
  const clock = performance(); clock.sample(18 * unit); const base = clock.hands[262].angle;
  for (const [time, phase] of [[19, 10], [20, 32], [22, 97], [24, 179], [26, 262],
    [28, 338], [30, 403], [32, 464], [34, 527], [36, 589], [38, 653], [40, 715]]) {
    clock.sample(time * unit); near((clock.hands[262].angle - base) * 180 / Math.PI, phase, 4);
  }
  for (const [time, pair] of [[26, [103.4, 308.9]], [28, [48.7, 2]], [30, [333.2, 74.9]],
    [34, [169.7, 243.6]], [36, [99.4, 313.3]], [42, [273.5, 138.7]]]) {
    clock.sample(time * unit); pairNear(clock, 0, pair, 7);
  }
});

test('AMT288 keeps opposing winding directions, ring symmetry and continuous velocity into forming', () => {
  const clock = performance();
  for (const time of [28, 34, 39]) {
    const current = movingState(clock, time * unit);
    for (let cell = 0; cell < 288; cell++) {
      const theta = Math.atan2(5.5 - Math.floor(cell / 24), 11.5 - cell % 24);
      sameAngle(current[cell * 2].angle + current[cell * 2 + 1].angle, 2 * theta);
      assert.ok(current[cell * 2].velocity * current[cell * 2 + 1].velocity < 0);
    }
  }
  const winding = movingState(clock, 28 * unit).map(h => Math.sign(h.velocity));
  let previous = clock.hands.map(h => h.angle);
  for (let now = 28 * unit + 30; now < 54200; now += 30) {
    clock.sample(now); clock.hands.forEach((h, i) => assert.ok((h.angle - previous[i]) * winding[i] >= -1e-8));
    previous = clock.hands.map(h => h.angle);
  }
  for (const cell of [0, 11, 23, 131, 132, 155, 264, 287]) {
    const radius = Math.hypot(cell % 24 - 11.5, Math.floor(cell / 24) - 5.5);
    const boundary = (40 + .58 * (radius - Math.SQRT1_2)) * unit;
    const before = movingState(clock, boundary - .02), after = movingState(clock, boundary + .02);
    for (const i of [cell * 2, cell * 2 + 1]) near(before[i].velocity, after[i].velocity, 2e-7);
  }
  settled(clock, 575, 54200);
});

test('AMT288 short arcs brake directly while longer partner arms continue into the final glyph', () => {
  const clock = performance(); clock.sample(40 * unit);
  near((clock.hands[262].to - clock.hands[262].angle) * 180 / Math.PI, 30, 4);
  near((clock.hands[263].angle - clock.hands[263].to) * 180 / Math.PI, 210, 4);
  for (const [time, pair] of [[42, [60.3, 349.6]], [46, [333.4, 356.6]], [48, [303.7, 359.7]], [50, [283.8, .5]]]) {
    clock.sample(time * unit); pairNear(clock, 131, pair, 5);
  }
  settled(clock, 575, 54200);
});

test('AMT288 replays and target edits preserve angle, velocity and alpha through every stage', () => {
  for (const action of ['retarget', 'animate']) for (const visibility of ['show', 'hide', 'ghost']) {
    for (const now of [1500, 14000, 29000, 41000, 49000, 53800]) {
      const clock = performance({ visibility }), before = movingState(clock, now);
      assert.equal(clock[action](728, now, true), true); clock.sample(now);
      clock.hands.forEach((h, i) => { sameAngle(h.angle, before[i].angle); near(h.opacity, before[i].opacity); });
      clock.sample(now + .001);
      clock.hands.forEach((h, i) => near((h.angle - before[i].angle) / .001, before[i].velocity, 2e-6));
      settled(clock, 728, now + 121000);
    }
  }
});

test('AMT288 live edits update the final time without restarting the unfinished ring performance', () => {
  const clock = performance(), control = performance(); clock.retarget(728, 21000);
  for (const now of [21000, 28000, 34000, 39900]) {
    clock.sample(now); control.sample(now);
    clock.hands.forEach((h, i) => sameAngle(h.angle, control.hands[i].angle));
  }
  settled(clock, 728, 54200);
});

test('AMT288 color and visibility edits preserve moving, fading and resting poses', () => {
  const clock = performance({ visibility: 'hide' });
  for (const now of [9000, 28000, 47000, 53900, 55000]) for (const visibility of ['ghost', 'show', 'hide']) {
    clock.sample(now); const before = clock.hands.map(h => ({ angle: h.angle, opacity: h.opacity }));
    clock.update({ visibility, board: '#123456', long: '#abcdef' }, now); clock.sample(now);
    clock.hands.forEach((h, i) => { sameAngle(h.angle, before[i].angle); near(h.opacity, before[i].opacity); });
  }
  settled(clock, 575, 56000);
});

test('AMT288 reaches all minutes in both formats and completes 1 to 120 second performances', () => {
  for (const format24 of [true, false]) for (let minute = 0; minute < 1440; minute++) {
    const clock = performance({ duration: 1, format24 }); clock.animate(minute, 50, true); settled(clock, minute, 1050);
  }
  for (const duration of [1, 54.2, 120]) for (const visibility of ['hide', 'ghost', 'show']) {
    const clock = performance({ duration, visibility });
    for (const p of [.1, .25, .5, .75, .9, .99]) {
      clock.sample(duration * 1000 * p);
      clock.hands.forEach(h => assert.ok(Number.isFinite(h.angle) && h.opacity >= 0 && h.opacity <= 1));
    }
    settled(clock, 575, duration * 1000); assert.equal(clock.isAnimating(duration * 1000), false);
  }
});

test('AMT288 quiet, immediate, spin and reduced-motion modes retain the existing controls', () => {
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
