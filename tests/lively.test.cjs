'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const Spec = require('../src/lively/config.js');
const Controller = require('../src/lively/controller.js');
const Landscape = require('../src/models/landscape.js');

function harness(config) {
  const instances = [];
  const Renderer = { create(canvas, settings, model) {
    const instance = { settings, model, disposed: 0, paused: false,
      update(next) { this.settings = next; }, setPaused(value) { this.paused = value; },
      dispose() { this.disposed++; } };
    instances.push(instance); return instance;
  } };
  return { instances, controller: Controller.create({ canvas: {}, config, Renderer, readViewport: () => ({ width: 1920, height: 1080 }) }) };
}

test('Lively round trips all five models and preserves fractional custom settings', () => {
  for (const model of Landscape.models) {
    const config = Spec.normalize({ model: model.id, radius: 49.7, gap: 8.9, duration: 4.3,
      longWidth: 8.1, shortWidth: 5.2, background: '#21444c', source: 'manual', manualTime: '09:34', timezone: 'Asia/Hong_Kong' });
    assert.deepEqual(Spec.parse(Spec.serialize(config)), config);
    const adapted = Spec.rendererModel(model.id);
    assert.equal(adapted.geometry(1920, 1080, config).points.length, model.count);
    for (const motion of ['wave', 'spin', 'quiet', 'none']) {
      const clock = adapted.create({ ...config, motion });
      clock.initialize(0, 0); clock.animate(574, 100); clock.sample(10100);
      const pose = model.digitPose(model.displayDigits(574, true));
      assert.equal(clock.hands.length, model.count * 2);
      clock.hands.forEach((hand, index) => {
        assert.ok(Math.abs(Math.sin(hand.angle) - Math.sin(pose[index].angle)) < 1e-8);
        assert.ok(Math.abs(Math.cos(hand.angle) - Math.cos(pose[index].angle)) < 1e-8);
        assert.equal(hand.used, pose[index].used);
      });
      assert.equal(clock.isAnimating(10100), false);
    }
  }
  assert.throws(() => Spec.parse(JSON.stringify({ version: 3, platform: 'lively', settings: { manualTime: '24:00' } })), /无效/);
});

test('native properties restore every setting in either callback order', () => {
  const expected = Spec.normalize({ model: 'amt288', preset: 'custom', background: '#123456', board: '#abcdef',
    gap: 7.7, radius: 42.3, duration: 3.4, playbackSpeed: .7, offsetX: -17, source: 'manual', manualTime: '23:59', paused: true });
  const entries = Object.entries(Spec.livelyProperties(expected));
  for (const callbacks of [entries, [...entries].reverse()]) {
    const { controller } = harness();
    for (const [name, property] of callbacks) assert.equal(controller.property(name, property.value), property.type !== 'label');
    assert.deepEqual(controller.getConfig(), expected);
    assert.equal(controller.renderer.model.id, 'amt288');
    assert.equal(controller.renderer.paused, true);
    controller.dispose();
  }
  assert.equal(Spec.livelyProperties().gap.type, 'textbox');
  assert.equal(Spec.livelyProperties().offsetX.type, 'slider');
  assert.equal(Spec.decodeProperty('gap', '8.9'), 8.9);
  for (const [key, value] of [['model', 5], ['model', false], ['gap', 'NaN'], ['radius', 200], ['board', 'red'], ['manualTime', '9:34'], ['timezone', 'Invalid/Zone']]) {
    assert.equal(Spec.decodeProperty(key, value), undefined);
  }
});

test('model changes preserve user settings and dispose the previous renderer', () => {
  const { controller, instances } = harness({ background: '#21444c', scale: 75, gap: 7.1 });
  Landscape.models.forEach((model, index) => {
    assert.equal(controller.property('model', index), true);
    assert.equal(controller.renderer.model.id, model.id);
    assert.equal(controller.getConfig().background, '#21444c');
    assert.equal(controller.getConfig().scale, 75);
    assert.equal(controller.renderer.settings.gap, 7.1);
  });
  instances.slice(0, -1).forEach(instance => assert.equal(instance.disposed, 1));
  const last = controller.renderer; controller.dispose(); controller.dispose();
  assert.equal(last.disposed, 1);
});

test('host pause survives model and property changes and combines with user pause', () => {
  const { controller } = harness();
  assert.equal(controller.playback('{"IsPaused":true}'), true);
  controller.property('model', 4); controller.property('longWidth', '8.4');
  assert.equal(controller.renderer.paused, true);
  controller.property('paused', true); controller.playback({ IsPaused: false });
  assert.equal(controller.renderer.paused, true);
  controller.property('paused', false); assert.equal(controller.renderer.paused, false);
  for (const data of ['bad json', { IsPaused: 'true' }, null]) assert.equal(controller.playback(data), false);
  assert.equal(controller.renderer.paused, false);
  controller.dispose(); assert.equal(controller.playback({ IsPaused: true }), false);
});

test('preset callbacks do not overwrite independently saved colors', () => {
  const { controller } = harness({ board: '#123456', background: '#abcdef' });
  controller.property('preset', 1);
  assert.equal(controller.getConfig().board, '#123456');
  controller.property('background', '#21444c'); controller.property('preset', 0);
  assert.equal(controller.renderer.settings.background, '#21444c');
  assert.equal(controller.renderer.settings.board, '#123456');
});

test('generated offline wallpaper exposes native callbacks and embeds all shared models', () => {
  const html = fs.readFileSync(require.resolve('../lively-wallpaper/index.html'), 'utf8');
  const info = JSON.parse(fs.readFileSync(require.resolve('../lively-wallpaper/LivelyInfo.json'), 'utf8'));
  assert.equal(info.FileName, 'index.html'); assert.equal(info.Arguments, '--pause-event true');
  assert.match(html, /data-editor="0"/);
  assert.match(html, /root\.livelyPropertyListener = controller\.property/);
  assert.match(html, /root\.livelyWallpaperPlaybackChanged = controller\.playback/);
  assert.doesNotMatch(html, /<script[^>]+src=|<link[^>]+href=["']https?:/i);
  const bundled = html.match(/<script>([\s\S]*)<\/script>/)[1];
  const beforeApp = bundled.split("  const { LivelyConfig: Spec, LivelyController, Renderer, BrowserEnvironment, Landscape, Time }")[0];
  const context = vm.createContext({ Intl, TextEncoder, Uint8Array });
  vm.runInContext(beforeApp.slice(0, beforeApp.lastIndexOf('(function (root) {')), context);
  assert.deepEqual(Array.from(context.Timeform.Landscape.models, model => model.id), Landscape.models.map(model => model.id));
  const properties = JSON.parse(fs.readFileSync(require.resolve('../lively-wallpaper/LivelyProperties.json'), 'utf8'));
  assert.deepEqual(properties, Spec.livelyProperties());
});
