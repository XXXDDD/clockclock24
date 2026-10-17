'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const Model = require('../src/models/amt72v/model.js');
const Animation = require('../src/models/amt72v/animation.js');
const near = (a, b, epsilon = 1e-7) => assert.ok(Math.abs(a - b) < epsilon, `${a} versus ${b}`);
const angle = (a, b, epsilon) => near(Math.atan2(Math.sin(a - b), Math.cos(a - b)), 0, epsilon);
const referenceUnit = 32000 / Animation.referenceDuration;
const fullUnit = 38000 / Animation.fullDuration;
function reference(settings = {}) {
  const clock = Model.create({ duration: 32, ...settings });
  clock.initialize(574, 0); clock.playReference(575, 0); return clock;
}
function sample(clock, time) {
  clock.sample(time - .001); const before = clock.hands.map(hand => hand.angle);
  clock.sample(time);
  return clock.hands.map((h, i) => ({ angle: h.angle, opacity: h.opacity, velocity: (h.angle - before[i]) / .001 }));
}
function finish(clock, minute, now) {
  clock.sample(now);
  const pose = Model.digitPose(Model.displayDigits(minute, clock.state.format24));
  clock.hands.forEach((hand, i) => {
    angle(hand.angle, pose[i].angle);
    near(hand.opacity, (pose[i].used || pose[i ^ 1].used) || clock.state.visibility === 'show' ? 1 : clock.state.visibility === 'ghost' ? .12 : 0);
  });
  assert.equal(clock.isAnimating(now), false);
}

test('72v reference has independent Sterling metadata, silver drawing and a missing-opening boundary', () => {
  assert.match(Model.reference, /72v-black-sterling$/);
  assert.match(Model.motionReference, /c9a11576a51645cf9c158a61c4a2706f/);
  assert.equal(Model.referenceDuration, 32); assert.equal(Model.Settings.defaults.duration, 38);
  assert.equal(Model.referenceClip, true); assert.equal(Model.choreographed, true);
  assert.equal(Model.Settings.fields.duration.max, 120);
  assert.equal(Model.Settings.defaults.longWidth, 8.2);
  assert.equal(typeof Model.Drawing.drawSurface, 'function'); assert.equal(typeof Model.Drawing.drawHands, 'function');
});

test('72v reference starts in motion and matches measured phase with same-column synchronization', () => {
  const clock = reference();
  const fixtures = [[0, 6.8], [2.002, 63.3], [4.004, 123.2], [6.006, 185.1], [8.008, 245.4], [10.01, 306.3], [12.012, 362.1]];
  for (const [seconds, degrees] of fixtures) {
    const now = seconds * referenceUnit; clock.sample(now);
    for (let col = 0; col < 6; col++) for (let row = 0; row < 12; row++) {
      const cell = row * 6 + col;
      // Unordered opposite arms: doubling the angle removes the 180° ambiguity.
      for (const lane of [0, 1]) angle(2 * clock.hands[cell * 2 + lane].angle,
        2 * (degrees * Math.PI / 180 + Animation.columnOffsets[col]), .004);
      angle(clock.hands[cell * 2].angle - clock.hands[cell * 2 + 1].angle, Math.PI);
    }
  }
  const moving = sample(clock, 5000);
  assert.ok(moving.every(h => h.velocity > 0));
  assert.equal(clock.getStage(0), '列间相位旋转');
});

test('72v full opening joins the filmed rotation with angle and speed continuity', () => {
  const clock = Model.create({ duration: 38 }); clock.initialize(574, 0); clock.animate(575, 0);
  assert.equal(clock.getStage(0), '拆字归队');
  const boundary = 6 * fullUnit;
  const before = sample(clock, boundary - .01), after = sample(clock, boundary + .01);
  before.forEach((hand, i) => {
    near(hand.angle, after[i].angle, .00003); near(hand.velocity, after[i].velocity, .0000002);
  });
  assert.equal(clock.getStage(boundary), '列间相位旋转');
  for (const [cell, departure] of [[0, 16], [1, 15.5], [2, 15], [5, 14]]) {
    const boundary = (6 + departure) * fullUnit;
    const a = sample(clock, boundary - .01), b = sample(clock, boundary + .01);
    for (const i of [cell * 2, cell * 2 + 1]) {
      near(a[i].angle, b[i].angle, .00004); near(a[i].velocity, b[i].velocity, .0000004);
    }
  }
  const ends = new Set(clock.hands.map(hand => hand.motionEnd));
  assert.ok(ends.size > 10); // Independent stopping times, followed by a final reading hold.
});

test('72v forming preserves a faster clockwise lane and settles exactly in the filmed 09:35', () => {
  const clock = reference();
  for (const seconds of [20, 24, 28, 30]) {
    const moving = sample(clock, seconds * referenceUnit);
    assert.ok(moving[1].velocity > moving[0].velocity);
    assert.ok(moving[1].velocity > 0);
    assert.equal(clock.getStage(seconds * referenceUnit), '双速逐针成型');
  }
  // Independent visual estimates for the top-left clock, unordered identity resolved by the fast tour.
  for (const [seconds, fast, slow] of [[20, 61, 220], [24, 237, 306], [28, 17, 348]]) {
    clock.sample(seconds * referenceUnit);
    angle(clock.hands[1].angle, fast * Math.PI / 180, 20 * Math.PI / 180);
    angle(clock.hands[0].angle, slow * Math.PI / 180, 20 * Math.PI / 180);
  }
  finish(clock, 575, 32000);
});

test('72v replay and target edits preserve angles, velocities and opacity through every stage', () => {
  for (const seconds of [2, 10, 23, 35, 37.99]) {
    for (const action of ['replay', 'target']) {
      const clock = Model.create({ duration: 38, visibility: 'hide' }); clock.initialize(574, 0); clock.animate(575, 0);
      const now = seconds * 1000, before = sample(clock, now);
      if (action === 'replay') clock.animate(756, now, true); else clock.retarget(756, now);
      const after = sample(clock, now + .001);
      before.forEach((hand, i) => {
        near(hand.angle, after[i].angle, .00002); near(hand.opacity, after[i].opacity, .00002);
        near(hand.velocity, after[i].velocity, .000003);
      });
      finish(clock, 756, now + 40000);
    }
  }
});

test('72v durations, all visibility modes, midnight and reduced motion finish correctly', () => {
  for (const duration of [1, 38, 120]) for (const visibility of ['show', 'hide', 'ghost']) {
    const clock = Model.create({ duration, visibility }); clock.initialize(1439, 0); clock.animate(0, 100);
    finish(clock, 0, 100 + duration * 1000);
    for (const motion of ['spin', 'quiet', 'none']) {
      clock.update({ motion }, 200000); clock.animate(756, 200000); finish(clock, 756, 200000 + duration * 1000);
    }
  }
  const clock = Model.create({}, { reducedMotion: true }); clock.initialize(574, 0); clock.animate(575, 100);
  clock.hands.forEach(h => assert.ok(Math.abs(h.to - h.from) <= Math.PI + 1e-8)); finish(clock, 575, 400);
});

test('72v visibility changes are continuous during motion and after the final hold', () => {
  const clock = Model.create({ duration: 38 }); clock.initialize(574, 0); clock.animate(575, 0);
  for (const now of [1000, 26000, 37980, 39000]) for (const visibility of ['hide', 'ghost', 'show']) {
    clock.sample(now); const before = clock.hands.map(h => h.opacity);
    clock.update({ visibility }, now); clock.sample(now);
    clock.hands.forEach((h, i) => near(h.opacity, before[i]));
    clock.sample(now + 400);
  }
  finish(clock, 575, 50000);
});
