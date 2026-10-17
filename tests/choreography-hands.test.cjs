'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const Classic = require('../src/web/classic.js');
const models = ['circular', 'landscape', 'portrait'].flatMap(kind => Classic.catalog(require('../src/models/' + kind + '.js')).models);
const nearAngle = (a, b, label) => assert.ok(Math.abs(Math.atan2(Math.sin(a - b), Math.cos(a - b))) < 1e-8, label);
const pose = clock => clock.hands.map(h => [h.angle, h.opacity]);
const points = model => model.geometry(1920, 1080, {}).points;
const longIndex = (model, point) => point.i + (model.Drawing.longLane?.(point) || 0);
const diagonalModels = models.filter(m => ['clockclock24', 'clockclockl', 'amt72', 'amt144', 'amt72v'].includes(m.family));

function parallelColumns(model, clock) {
  const anchors = new Map();
  for (const point of points(model)) {
    const index = longIndex(model, point), col = Math.floor(point.i / 2) % model.columns;
    const angle = clock.hands[index].angle;
    if (!anchors.has(col)) anchors.set(col, angle);
    nearAngle(angle, anchors.get(col), model.id + ': physical long arms agree within a column');
    nearAngle(clock.hands[index ^ 1].angle, angle + Math.PI, model.id + ': physical short arm stays opposite');
  }
  return [...anchors.values()];
}

test('all diagonal presets and borrowed actions preserve physical long/short sides through their column wave', () => {
  for (const model of diagonalModels) for (const duration of [1, model.Settings.defaults.duration, 120]) {
    const clock = model.create({ choreography: 'diagonal', duration, visibility: 'hide' });
    clock.initialize(574, 0); clock.animate(575, 0);
    for (const progress of [.5, .55]) {
      clock.sample(duration * 1000 * progress);
      const columns = parallelColumns(model, clock);
      assert.ok(columns.some(a => Math.abs(Math.sin(a - columns[0])) > .05), model.id + ': propagation across columns is retained');
      assert.ok(clock.hands.every(h => h.opacity > .999), model.id + ': idle dials are revealed during motion');
    }
    clock.sample(duration * 1000);
    const target = model.digitPose('0935');
    clock.hands.forEach((h, i) => nearAngle(h.angle, target[i].angle, model.id + ': original endpoint motor assignment'));
  }
});

test('AMT72 White holds the same physical long-arm direction on every dial before the column wave', () => {
  const model = models.find(m => m.id === 'amt72-white'), clock = model.create();
  clock.initialize(574, 0); clock.animate(575, 0); clock.sample(10900);
  for (const point of points(model)) {
    const index = longIndex(model, point);
    nearAngle(clock.hands[index].angle, Math.PI * .75, 'long arm consistently points down-left');
    nearAngle(clock.hands[index ^ 1].angle, Math.PI * 1.75, 'short arm consistently points up-right');
  }
  const paused = pose(clock); clock.sample(10900); assert.deepEqual(pose(clock), paused);
});

test('switching into diagonal motion and replaying keeps the current pose before resolving physical sides', () => {
  for (const model of diagonalModels.filter(m => m.Settings.fields.choreography)) {
    const other = model.Settings.fields.choreography.options.find(([id]) => id !== 'diagonal')[0];
    const clock = model.create({ choreography: other, duration: 10, visibility: 'ghost' });
    clock.initialize(574, 0); clock.animate(575, 0); clock.sample(2300);
    const before = pose(clock);
    clock.update({ choreography: 'diagonal' }, 2300); clock.animate(575, 2300, true); clock.sample(2300);
    assert.deepEqual(pose(clock), before, model.id + ': switching preserves angles and opacity');
    clock.sample(7300); parallelColumns(model, clock);
    const playing = pose(clock); clock.animate(575, 7300, true); clock.sample(7300);
    assert.deepEqual(pose(clock), playing, model.id + ': replay preserves angles and opacity');
    clock.sample(12300); parallelColumns(model, clock);
    clock.retarget(428, 12300); clock.sample(18000);
    const target = model.digitPose('0708');
    clock.hands.forEach((h, i) => nearAngle(h.angle, target[i].angle, model.id + ': retarget reaches correct time'));
  }
});

test('phased 72v and continuous CC9 sweeps also maintain physical pair polarity', () => {
  for (const model of models.filter(m => m.family === 'amt72v')) {
    const clock = model.create({ choreography: 'phased', duration: 10 });
    clock.initialize(574, 0); clock.animate(575, 0);
    for (const time of [3000, 4000]) { clock.sample(time); parallelColumns(model, clock); }
    clock.playReference(575, 11000); clock.sample(15000); parallelColumns(model, clock);
  }
  const model = models.find(m => m.id === 'clockclock9'), clock = model.create({ duration: 10 });
  clock.initialize(574, 0); clock.animate(575, 0);
  for (const time of [1800, 2500, 3500]) {
    clock.sample(time);
    for (const point of points(model)) {
      nearAngle(clock.hands[point.i].angle, clock.hands[0].angle, 'CC9 physical long arms sweep together');
      nearAngle(clock.hands[point.i + 1].angle, clock.hands[0].angle + Math.PI, 'CC9 physical short arms sweep together');
    }
  }
});
