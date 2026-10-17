'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const Classic = require('../src/web/classic.js');
const Config = require('../src/shared/config.js');
const observed = require('./fixtures/hand-proportions.json');
const models = ['circular', 'landscape', 'portrait'].flatMap(kind => Classic.catalog(require('../src/models/' + kind + '.js')).models);
const near = (actual, expected, tolerance, label) => assert.ok(Math.abs(actual - expected) <= tolerance, `${label}: ${actual} versus ${expected}`);

// Capture the needle-tip geometry actually sent to Canvas, including metal
// edition adapters, rather than only inspecting their configuration values.
function canvasRecorder() {
  const arms = [], stack = []; let active = null;
  const tip = value => { if (active) active.tip = Math.max(active.tip, value); };
  const context = new Proxy({}, { get(_, method) {
    if (method === 'createLinearGradient' || method === 'createRadialGradient') return () => ({ addColorStop() {} });
    if (method === 'save') return () => stack.push(active);
    if (method === 'restore') return () => { active = stack.pop(); };
    if (method === 'rotate') return angle => { active = { angle, tip: -Infinity }; arms.push(active); };
    if (method === 'rect' || method === 'fillRect' || method === 'roundRect') return (x, y, width) => tip(x + width);
    if (method === 'moveTo' || method === 'lineTo') return x => tip(x);
    if (method === 'arcTo' || method === 'quadraticCurveTo') return (x1, y1, x2) => tip(Math.max(x1, x2));
    return () => {};
  } });
  return { context, arms };
}

test('all 30 preset drawings use measured unequal lengths and preserve both distinct motors', () => {
  for (const model of models) {
    const config = model.Settings.defaults, reference = observed[model.family];
    near(config.shortLength / config.longLength, reference.observedShortToLong, .012, model.id + ' measured ratio');
    const geometry = model.geometry(1920, 1080, config);
    const hands = Array.from({ length: model.count * 2 }, (_, i) => ({ angle: .123 + i / 1000, opacity: 1 }));
    const { context, arms } = canvasRecorder();
    model.Drawing.drawHands(context, geometry, { hands }, config);
    assert.equal(arms.length, hands.length, model.id + ' draws two distinct arms per axis');
    for (let cell = 0; cell < model.count; cell++) {
      const point = geometry.points[cell], painted = arms.slice(cell * 2, cell * 2 + 2);
      const actualAngles = painted.map(arm => arm.angle).sort((a, b) => a - b);
      assert.deepEqual(actualAngles, hands.slice(point.i, point.i + 2).map(hand => hand.angle), model.id + ' neither motor omitted/duplicated');
      const reach = Math.max(...painted.map(arm => arm.tip));
      const ratio = Math.min(...painted.map(arm => arm.tip)) / reach;
      const expectedRatio = config.shortLength / 100 * (point.center ? config.centerHourLength / 100 : 1);
      near(ratio, expectedRatio, 1e-10, model.id + ' rendered ratio');
      if (model.family === 'clockclock9') {
        near(reach / geometry.boardWidth, reference.longToBoardMedian, .003, model.id + ' physical long reach');
        if (point.center) near(ratio, reference.centralShortToLong, .012, model.id + ' central hour arm');
      } else {
        near(reach / 53.2, reference.observedLongToRadius, .004, model.id + ' measured reach relative to dial');
        const expectedLong = Number(reference.longLanes[cell]);
        near(painted.find(arm => arm.angle === hands[point.i + expectedLong].angle).tip, reach, 1e-10, model.id + ' source long-arm direction');
      }
    }
  }
});

test('legacy equal defaults migrate once while custom lengths and newly saved equal pairs survive', () => {
  for (const model of models) {
    const legacy = { version: 2, type: model.type, model: model.id, settings: {
      longLength: 100, shortLength: 100, centerHourLength: model.id === 'clockclock9' ? 82 : undefined, board: '#123456'
    } };
    const migrated = Config.parse(model, JSON.stringify(legacy));
    assert.equal(migrated.shortLength, model.Settings.defaults.shortLength, model.id);
    assert.equal(migrated.board, '#123456');
    if (model.id === 'clockclock9') assert.equal(migrated.centerHourLength, 98);
    const custom = model.Settings.normalize({ longLength: 100, shortLength: 94 });
    assert.equal(Config.parse(model, JSON.stringify({ ...legacy, settings: custom })).shortLength, 94);
    const equal = model.Settings.normalize({ longLength: 100, shortLength: 100 });
    assert.equal(Config.parse(model, Config.serialize(model, equal)).shortLength, 100);
  }
});
