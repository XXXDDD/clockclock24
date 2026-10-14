'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Model = require('../src/models/clockclock24/model.js');
const Config = require('../src/shared/config.js');
const Time = require('../src/shared/time.js');

test('configuration round trips with model identity and all precision settings', () => {
  const settings = Model.Settings.normalize({ radius: 49.7, gap: 8.9, duration: 4.3, longWidth: 8.1, source: 'manual', manualTime: '00:00', timezone: 'Asia/Hong_Kong', canvasWidth: 3440, autoDemo: true });
  const text = Config.serialize(Model, settings);
  assert.deepEqual(Config.parse(Model, text), settings);
  const data = JSON.parse(text);
  assert.equal(data.type, 'landscape'); assert.equal(data.model, 'clockclock24'); assert.equal(data.version, 2);
  assert.throws(() => Config.parse(Model, JSON.stringify({ ...data, type: 'portrait' })), /种类或型号/);
  assert.throws(() => Config.parse(Model, JSON.stringify({ ...data, model: 'amt72' })), /种类或型号/);
  assert.throws(() => Config.parse(Model, JSON.stringify({ ...data, version: 99 })), /版本/);
});

test('old wallpaper settings migrate without turning ClockClock 24 into another type', () => {
  const settings = Config.parse(Model, JSON.stringify({ version: 1, settings: { layout: 'portrait', scale: 80, board: '#21444C', long: '#abcdef', short: '#123456', timezone: 'Asia/Hong_Kong', duration: 6, motion: 'quiet' } }));
  assert.equal(settings.board, '#21444c'); assert.equal(settings.long, '#abcdef');
  assert.equal(settings.scale, 80); assert.equal(settings.duration, 6); assert.equal(settings.motion, 'quiet');
  assert.equal(Model.geometry(1080, 1920, settings).layout, 'landscape');
});

test('invalid configuration is rejected before application', () => {
  for (const input of [{ radius: 0 }, { duration: Infinity }, { board: 'red' }, { timezone: 'Invalid/Zone' }, { source: 'whatever' }, { manualTime: '24:00' }, { canvasWidth: false }]) {
    const data = { version: 2, type: Model.type, model: Model.id, settings: input };
    assert.throws(() => Config.parse(Model, JSON.stringify(data)), /无效/);
  }
  assert.equal(Model.Settings.normalize({ longLength: 80, shortLength: 100 }).shortLength, 80);
});

test('default geometry preserves original 24 points and stays inside target canvases', () => {
  const original = Model.geometry(1920, 1080, {});
  assert.equal(original.boardWidth, 1000); assert.equal(original.boardHeight, 445); assert.equal(original.points.length, 24);
  original.points.forEach((point, index) => {
    assert.equal(point.x, 105 + index % 8 * 112); assert.equal(point.y, 110 + Math.floor(index / 8) * 112); assert.equal(point.i, index * 2);
  });
  for (const [width, height] of [[1920, 1080], [3440, 1440], [1080, 1920], [240, 240]]) {
    for (const radius of [20, 53.2, 80]) for (const gap of [0, 5.6, 40]) for (const offset of [-100, 0, 100]) {
      const geometry = Model.geometry(width, height, { radius, gap, offsetX: offset, offsetY: offset, padding: 160, scale: 100 });
      assert.ok(geometry.x >= -1e-8 && geometry.y >= -1e-8);
      assert.ok(geometry.x + geometry.width <= width + 1e-8 && geometry.y + geometry.height <= height + 1e-8);
      geometry.points.forEach(point => {
        assert.ok(point.x - radius >= 0 && point.x + radius <= geometry.boardWidth);
        assert.ok(point.y - radius >= 0 && point.y + radius <= geometry.boardHeight);
      });
    }
  }
});

test('one playback timeline pauses, changes speed continuously and advances single steps', () => {
  let wall = 1000;
  const playback = Time.createPlayback(() => wall);
  wall = 1500; assert.equal(playback.now(), 500);
  playback.setPaused(true); wall = 9000; assert.equal(playback.now(), 500);
  playback.step(100); assert.equal(playback.now(), 600);
  playback.setSpeed(.5); playback.setPaused(false); wall += 200; assert.equal(playback.now(), 700);
  playback.setSpeed(2); wall += 200; assert.equal(playback.now(), 1100);
  assert.throws(() => playback.setSpeed(0), /大于零/);
});

test('time input supports live timezone and manual midnight', () => {
  const source = Time.createSource(() => new Date('2026-10-14T16:01:00Z'));
  assert.equal(source.read({ source: 'live', timezone: 'Asia/Hong_Kong' }), 1);
  assert.equal(source.read({ source: 'live', timezone: 'UTC' }), 961);
  assert.equal(source.read({ source: 'manual', manualTime: '00:00' }), 0);
});

test('placeholder pages stay empty and all browser entries come from the same sources', () => {
  const root = path.resolve(__dirname, '..');
  assert.equal(fs.readFileSync(path.join(root, 'clockclock24.html'), 'utf8'), fs.readFileSync(path.join(root, 'dist/index.html'), 'utf8'));
  for (const kind of ['circular', 'portrait']) {
    const html = fs.readFileSync(path.join(root, 'dist', kind + '.html'), 'utf8');
    assert.match(html, /型号暂未接入/); assert.ok(!html.includes('<canvas')); assert.ok(!html.includes('const GLYPHS'));
    assert.match(html, new RegExp('data-category="' + kind + '"'));
  }
});
