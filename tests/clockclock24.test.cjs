'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const Model = require('../src/models/clockclock24/model.js');
const TAU = Math.PI * 2;
const near = (a, b, tolerance = 1e-7) => assert.ok(Math.abs(a - b) < tolerance, `${a} versus ${b}`);
const sameAngle = (a, b) => near(Math.atan2(Math.sin(a - b), Math.cos(a - b)), 0);
function performance(config = {}) {
  const clock = Model.create({ motion: 'wave', duration: 40.1, ...config });
  clock.initialize(574, 0); clock.animate(575, 0); return clock;
}
function motionAt(clock, now) {
  clock.sample(now - .01); const before = clock.hands.map(h => h.angle);
  clock.sample(now); return clock.hands.map((h, i) => ({ angle: h.angle, opacity: h.opacity, velocity: (h.angle - before[i]) / .01 }));
}
function settled(clock, minute, now) {
  clock.sample(now);
  const pose = Model.digitPose(Model.displayDigits(minute, clock.state.format24));
  clock.hands.forEach((h, i) => {
    sameAngle(h.angle, pose[i].angle);
    near(h.opacity, (pose[i].used || pose[i ^ 1].used) || clock.state.visibility === 'show' ? 1 : clock.state.visibility === 'ghost' ? .12 : 0);
  });
}

test('CC24 preserves the filmed 09:34 and 09:35 silhouettes, including idle diagonal arms', () => {
  // Independently transcribed from the first and last frontal video frames.
  const glyphs = { '0': ['SE','SW','NS','NS','NE','NW'], '9': ['SE','SW','NE','NS','EE','NW'],
    '3': ['EE','SW','EE','NW','EE','NW'], '4': ['SS','SS','NE','NS','PP','NN'], '5': ['SE','WW','NE','SW','EE','NW'] };
  const directions = { E: 0, S: 90, W: 180, N: 270, P: 135 };
  for (const digits of ['0934', '0935']) {
    const pose = Model.digitPose(digits);
    for (let digit = 0; digit < 4; digit++) for (let cell = 0; cell < 6; cell++) {
      const index = (Math.floor(cell / 2) * 8 + digit * 2 + cell % 2) * 2;
      const actual = pose.slice(index, index + 2).map(h => Math.round((h.angle * 180 / Math.PI + 360) % 360)).sort((a, b) => a - b);
      assert.deepEqual(actual, [...glyphs[digits[digit]][cell]].map(d => directions[d]).sort((a, b) => a - b));
    }
  }
  assert.equal(Model.Settings.defaults.visibility, 'show');
});

test('CC24 holds antipodal slashes and follows the observed travelling column wave', () => {
  const clock = performance(), unit = 40100 / 40.08;
  clock.sample(8 * unit);
  for (let i = 0; i < 48; i += 2) {
    near(Math.cos(clock.hands[i].angle - clock.hands[i + 1].angle), -1);
    near(Math.sin(clock.hands[i].angle * 2), -1);
  }
  // Unwrapped line directions measured using image moments; ±4° permits the
  // sparse shared-curve reconstruction and image-centre estimation errors.
  for (const [t, left, right] of [[10,135.4,155.6],[12,139.6,224.1],[14,193.3,311],[16,274.1,399.9],
    [18,364.8,484.4],[20,452.7,553.1],[22,527.5,614.2],[24,589.2,675.3]]) {
    clock.sample(t * unit);
    for (const [col, expected] of [[0, left], [7, right]]) {
      const delta = (clock.hands[col * 2].angle * 180 / Math.PI - expected) * Math.PI / 180;
      near(Math.atan2(Math.sin(delta * 2), Math.cos(delta * 2)) / 2, 0, 4 * Math.PI / 180);
    }
    for (let col = 0; col < 8; col++) for (let row = 0; row < 3; row++) {
      const i = (row * 8 + col) * 2;
      near(Math.cos(clock.hands[i].angle - clock.hands[i + 1].angle), -1);
      sameAngle(clock.hands[i].angle * 2, clock.hands[col * 2].angle * 2);
    }
  }
});

test('CC24 wave and individual forming paths stay clockwise with continuous entry speeds', () => {
  const clock = performance(), unit = 40100 / 40.08;
  clock.sample(8.5 * unit); let previous = clock.hands.map(h => h.angle);
  for (let now = 8.5 * unit + 40; now < 40100; now += 40) {
    clock.sample(now);
    clock.hands.forEach((h, i) => assert.ok(h.angle >= previous[i] - 1e-8));
    previous = clock.hands.map(h => h.angle);
  }
  for (let cell = 0; cell < 24; cell++) {
    const t = (25.2 + (7 - cell % 8) * .4 + Math.floor(cell / 8) * .1) * unit;
    const before = motionAt(clock, t - .02), after = motionAt(clock, t + .02);
    for (let i = cell * 2; i < cell * 2 + 2; i++) near(before[i].velocity, after[i].velocity, 1e-7);
  }
  assert.ok(new Set(clock.hands.map(h => h.motionEnd)).size > 8);
  settled(clock, 575, 40100); assert.equal(clock.isAnimating(40100), false);
});

test('CC24 live retargets and replays preserve angles, velocity and alpha throughout the performance', () => {
  for (const action of ['retarget', 'animate']) for (const visibility of ['show', 'hide', 'ghost']) {
    for (const now of [1500, 12000, 27000, 37000, 39900]) {
      const clock = performance({ visibility }); const before = motionAt(clock, now);
      assert.equal(clock[action](728, now, true), true);
      clock.sample(now);
      clock.hands.forEach((h, i) => { sameAngle(h.angle, before[i].angle); near(h.opacity, before[i].opacity); });
      clock.sample(now + .01);
      clock.hands.forEach((h, i) => near((h.angle - before[i].angle) / .01, before[i].velocity, 2e-6));
      settled(clock, 728, now + 121000);
    }
  }
});

test('CC24 retargeting the last fade keeps stopped unchanged arms still', () => {
  const clock = performance({ visibility: 'hide' }); clock.sample(40000);
  const previous = clock.hands.map(h => ({ ...h })); clock.retarget(576, 40000); clock.sample(40050);
  const target = Model.digitPose('0936');
  previous.forEach((hand, i) => {
    if (Math.abs(Math.sin(hand.angle - target[i].angle)) < 1e-8 && Math.cos(hand.angle - target[i].angle) > 0) sameAngle(clock.hands[i].angle, hand.angle);
  });
  settled(clock, 576, 41000);
});

test('replay in quiet mode leaves an in-progress short transition running', () => {
  const clock = performance({ motion: 'quiet', duration: 4 });
  clock.sample(1500); const before = clock.hands.map(h => ({ ...h }));
  assert.equal(clock.animate(575, 1500, true), false);
  assert.deepEqual(clock.hands, before);
  settled(clock, 575, 4000);
});

test('CC24 staged transitions reach every minute and complete at short and long durations', () => {
  for (const format24 of [true, false]) for (let minute = 0; minute < 1440; minute++) {
    const clock = performance({ duration: 1, format24 }); clock.animate(minute, 50, true); settled(clock, minute, 1050);
  }
  for (const duration of [1, 40.1, 120]) for (const visibility of ['hide', 'ghost', 'show']) {
    const clock = performance({ duration, visibility });
    for (const p of [.1,.2,.4,.7,.9,.995]) {
      clock.sample(duration * 1000 * p);
      assert.ok(clock.hands.every(h => Number.isFinite(h.angle) && h.opacity >= 0 && h.opacity <= 1));
      clock.hands.filter(h => duration * 1000 * p < h.fadeStart && duration * 1000 * p > h.revealEnd).forEach(h => near(h.opacity, 1));
    }
    settled(clock, 575, duration * 1000); assert.equal(clock.isAnimating(duration * 1000), false);
  }
});
