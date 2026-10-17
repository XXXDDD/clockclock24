'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const Classic = require('../src/web/classic.js');
const Config = require('../src/shared/config.js');
const catalogs = ['circular', 'landscape', 'portrait'].map(kind => Classic.catalog(require('../src/models/' + kind + '.js')));
const models = catalogs.flatMap(catalog => catalog.models);
const get = id => models.find(model => model.id === id);
const angularError = (a, b) => Math.abs(Math.atan2(Math.sin(a-b), Math.cos(a-b)));

test('each family exposes its distinct existing reference actions, deduplicating color and timing variants', () => {
  const counts = { clockclock9: 1, amt61c: 2, clockclock24: 3, amt72: 3, amt96: 1, amt120: 1, amt144: 1, amt288: 1, amt72v: 2 };
  for (const model of models) {
    const field = model.Settings.fields.choreography || model.Settings.fields.motion;
    assert.equal(field.options.length, counts[model.group], model.id);
    if (model.actions) {
      assert.equal(new Set(model.actions.map(action => action.id)).size, model.actions.length);
      for (const action of model.actions) {
        assert.equal(get(action.source).group, model.group);
        assert.match(action.motionReference, /^https:\/\/.+\.mp4/);
      }
    }
  }
});

test('shared actions reproduce their original source trajectories while preserving the target preset settings', () => {
  for (const model of models.filter(model => model.actions)) for (const action of model.actions) {
    const source = get(action.source);
    const settings = model.Settings.normalize({ choreography: action.id, duration: 10, board: '#274b45', long: '#ead2ac',
      short: '#dce3df', scale: 78, offsetX: 8, longLength: 84, shortLength: 69, source: 'manual', manualTime: '09:34' });
    const actual = model.create(settings);
    const expected = source.create({ ...settings, choreography: source.Settings.defaults.choreography });
    actual.initialize(574, 0); expected.initialize(574, 0); actual.animate(575, 0); expected.animate(575, 0);
    for (const time of [0, 1000, 3000, 5000, 8000, 11000]) {
      actual.sample(time); expected.sample(time);
      actual.hands.forEach((hand, i) => {
        assert.ok(angularError(hand.angle, expected.hands[i].angle) < 1e-9, model.id + ' borrows ' + action.source);
        assert.ok(Math.abs(hand.opacity-expected.hands[i].opacity) < 1e-9);
      });
    }
    for (const key of ['board', 'long', 'short', 'scale', 'offsetX', 'longLength', 'shortLength', 'manualTime']) assert.equal(actual.state[key], settings[key]);
    assert.equal(actual.state.choreography, action.id);
    const catalog = catalogs.find(catalog => catalog.get(model.id));
    assert.deepEqual(catalog.parse(Config.serialize(model, settings)).settings, settings);
  }
});

test('shared actions have visibly different motion and switch without a position jump before settling on arbitrary times', () => {
  for (const model of models.filter(model => model.actions)) {
    const poses = model.actions.map(action => {
      const clock = model.create({ choreography: action.id, duration: 10 });
      clock.initialize(574, 0); clock.animate(575, 0); clock.sample(4500);
      return clock.hands.map(hand => hand.angle);
    });
    for (let i=0; i<poses.length; i++) for (let j=i+1; j<poses.length; j++) {
      assert.ok(poses[i].some((angle, index) => angularError(angle, poses[j][index]) > .1), model.id + ': distinct actions');
    }
    const clock = model.create({ duration: 6 }); clock.initialize(574, 0); clock.animate(575, 0);
    let now = 1200;
    for (const action of model.actions) {
      clock.sample(now); const pose = clock.hands.map(hand => hand.angle);
      clock.update({ choreography: action.id }, now); clock.animate(575, now, true); clock.sample(now);
      clock.hands.forEach((hand, i) => assert.ok(angularError(hand.angle, pose[i]) < 1e-9, model.id + ': switch position'));
      const paused = clock.hands.map(hand => [hand.angle, hand.opacity]); clock.sample(now);
      assert.deepEqual(clock.hands.map(hand => [hand.angle, hand.opacity]), paused);
      clock.retarget(428, now + 750); clock.sample(now + 7000);
      const final = model.digitPose('0708');
      clock.hands.forEach((hand, i) => assert.ok(angularError(hand.angle, final[i].angle) < 1e-8, model.id + ': target'));
      assert.equal(clock.isAnimating(now + 7000), false);
      now += 8000;
    }
  }
});

test('a white 72v preset can play the borrowed Sterling clip and retain its own colors and full replay duration', () => {
  const model = get('amt72v-white');
  const clock = model.create({ choreography: 'phased', duration: 38 });
  clock.initialize(574, 0); clock.animate(575, 0);
  assert.equal(clock.playReference(575, 0), true);
  clock.sample(32000); assert.equal(clock.isAnimating(32000), false);
  assert.equal(clock.state.board, model.Settings.defaults.board);
  assert.equal(clock.state.choreography, 'phased');
  clock.animate(575, 33000, true); clock.sample(65000);
  assert.equal(clock.isAnimating(65000), true);
  clock.sample(71000); assert.equal(clock.isAnimating(71000), false);
});
