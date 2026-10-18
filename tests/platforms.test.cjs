'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const Spec = require('../src/core/presentation-config.js');
const Config = require('../src/shared/config.js');
const Session = require('../src/core/session.js');
const Preview = require('../src/hosts/browser-preview.js');
const Engine = require('../src/hosts/wallpaper-engine/adapter.js');
const Lively = require('../src/lively/classic-controller.js');
const LivelyConfig = require('../src/lively/classic-config.js');
const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');

function harness(factory = Session, config) {
  const renderers = [];
  const Renderer = { create(canvas, settings, model) {
    const instance = { settings, model, disposed: 0, paused: false,
      update(settings) { this.settings = settings; }, setPaused(value) { this.paused = value; },
      replay() { this.replayed = true; }, showCurrentTime() { this.settled = true; },
      step(value) { this.stepped = value; }, dispose() { this.disposed++; } };
    renderers.push(instance); return instance;
  } };
  return { session: factory.create({ Renderer, config }), renderers };
}

test('shared code and source graph cannot depend on a workbench or a wallpaper host', () => {
  for (const directory of ['src/core', 'src/catalog', 'src/runtime']) {
    for (const file of fs.readdirSync(path.join(root, directory)).filter(file => file.endsWith('.js'))) {
      const source = read(directory + '/' + file);
      assert.doesNotMatch(source, /require\(['"][^'"]*(?:web|lively|hosts)\//, file);
      if (file !== 'browser-environment.js') assert.doesNotMatch(source, /\b(?:document|window|localStorage)\./, file);
    }
  }
  const graph = require('../scripts/source-graph.cjs');
  for (const files of [...Object.values(graph.categories), graph.complete]) {
    assert.equal(new Set(files).size, files.length);
    assert.equal(files.some(file => /src\/(web|lively|hosts)\//.test(file)), false);
    files.forEach(file => assert.ok(fs.existsSync(path.join(root, file)), file));
  }
  assert.equal(require('../src/web/classic.js'), require('../src/catalog/classic.js'));
  assert.equal(require('../src/web/renderer.js'), require('../src/runtime/renderer.js'));
});

test('all 30 editions use the same defaults and exchange configuration across hosts', () => {
  assert.equal(Spec.models.length, 30);
  for (const model of Spec.models) {
    // Time selection belongs to the session; each workbench has its own reference minute.
    assert.deepEqual(Spec.resolve({ edition: model.id, manualTime: model.Settings.defaults.manualTime }).settings, model.Settings.defaults, model.id);
    const settings = model.Settings.normalize({ source: 'manual', manualTime: '23:59', gap: 6.9, board: '#123456', duration: 61 });
    const imported = Spec.parse(Config.serialize(model, settings));
    assert.deepEqual(Spec.resolve(imported).settings, settings, model.id);
    const portable = Spec.serialize(imported);
    assert.equal(JSON.parse(portable).platform, undefined);
    assert.deepEqual(Spec.parse(portable), imported);
    assert.deepEqual(LivelyConfig.parse(portable), imported);
    assert.deepEqual(Spec.resolve(imported), LivelyConfig.resolve(imported));
  }
  for (const value of [null, [], { schema: 'other', version: 1 },
    { schema: 'timeform.presentation', version: 99, settings: {} },
    { schema: 'timeform.presentation', version: 1, handGeometryVersion: 1, settings: { edition: 'missing' } }]) {
    assert.throws(() => Spec.parse(JSON.stringify(value)));
  }
});

test('Lively and Wallpaper Engine decode native settings into identical sessions', () => {
  const { session: lively } = harness(Lively);
  const { session: shared } = harness();
  const engine = Engine.create(shared);
  for (const model of Spec.models) {
    const input = Spec.normalize({ edition: model.id, customColors: true, board: '#17352a',
      customDuration: true, duration: 63.5, scale: 73, offsetX: 12, source: 'manual', manualTime: '12:36' });
    for (const [key, property] of Object.entries(LivelyConfig.livelyProperties(input))) {
      if (Spec.fields[key]) assert.equal(lively.property(key, property.value), true, key);
    }
    const properties = Engine.project(input).general.properties;
    assert.equal(engine.applyUserProperties(properties), true);
    assert.deepEqual(shared.getConfig(), lively.getConfig(), model.id);
    assert.deepEqual(shared.renderer.settings, lively.renderer.settings, model.id);
  }
  shared.dispose(); lively.dispose();
});

test('borderless fits every edition on desktop and phone, switches live and round-trips across hosts', () => {
  for (const base of Spec.models) {
    const config = Spec.normalize({ edition: base.id, borderless: true });
    const { model, settings } = Spec.resolve(config);
    assert.equal(model.id, base.id);
    assert.equal(model.create, base.create);
    for (const [width, height] of [[1920, 1080], [3440, 1440], [1080, 2400], [1080, 1080]]) {
      const g = model.geometry(width, height, settings);
      assert.equal(g.width, width); assert.equal(g.height, height);
      assert.equal(g.x, 0); assert.equal(g.y, 0);
      assert.equal(g.boardWidth, width); assert.equal(g.boardHeight, height);
      g.points.forEach(p => {
        assert.ok(p.x - p.radius >= 0 && p.x + p.radius <= width, base.id);
        assert.ok(p.y - p.radius >= 0 && p.y + p.radius <= height, base.id);
      });
    }
    assert.equal(Spec.parse(Spec.serialize(config)).borderless, true);
    assert.equal(LivelyConfig.parse(Spec.serialize(config)).borderless, true);
    assert.equal(Spec.resolve({ edition: base.id }).model, base);
  }
  const { session, renderers } = harness();
  session.setSuspended('hidden', true);
  session.updateConfig({ borderless: true });
  assert.equal(renderers.length, 2); assert.equal(renderers[0].disposed, 1);
  assert.equal(session.renderer.paused, true);
  session.updateConfig({ customColors: true, board: '#17352a' });
  assert.equal(renderers.length, 2);
  Engine.create(session).applyUserProperties({ borderless: { value: false } });
  assert.equal(renderers.length, 3); assert.equal(session.getConfig().borderless, false);
  session.dispose();
});

test('native updates are atomic and reject malformed values without changing unrelated settings', () => {
  const { session, renderers } = harness();
  const engine = Engine.create(session), before = session.getConfig();
  assert.equal(engine.applyUserProperties({ edition: { value: 'amt72v' }, customDuration: { value: true }, duration: { value: 63.5 } }), true);
  assert.equal(renderers.length, 2);
  assert.equal(session.renderer.settings.duration, 63.5);
  assert.equal(engine.applyUserProperties({ scale: { value: false }, board: { value: '1 0 Infinity' }, edition: { value: 0 }, paused: { value: null } }), false);
  assert.equal(session.getConfig().scale, before.scale);
  assert.equal(Engine.decode('board', '0 0.5 1'), '#0080ff');
  for (const invalid of ['', '1 0', '2 0 0', 'red', {}, '0 NaN 1']) assert.equal(Engine.decode('board', invalid), undefined);
  assert.equal(engine.applyUserProperties({ scale: { value: 77 }, unknown: { value: true }, board: { value: 'invalid' } }), true);
  assert.equal(session.getConfig().scale, 77);
  session.dispose(); assert.equal(engine.applyUserProperties({ scale: { value: 42 } }), false);
});

test('user pause and independent host suspensions survive edition changes and dispose exactly once', () => {
  const { session, renderers } = harness();
  const engine = Engine.create(session);
  engine.setPaused(true); session.setSuspended('embed-offscreen', true);
  session.updateConfig({ edition: 'amt72v', paused: true });
  assert.equal(session.renderer.paused, true);
  engine.setPaused(false); session.updateConfig({ paused: false });
  assert.equal(session.renderer.paused, true);
  session.setSuspended('embed-offscreen', false); assert.equal(session.renderer.paused, false);
  assert.equal(engine.setPaused('false'), false);
  session.command('replay'); assert.equal(session.renderer.replayed, true);
  session.command('settle'); assert.equal(session.renderer.settled, true);
  session.command('step', 100); assert.equal(session.renderer.stepped, 100);
  assert.equal(session.command('step', NaN), false);
  session.dispose(); session.dispose();
  renderers.forEach(renderer => assert.equal(renderer.disposed, 1));
  assert.equal(session.command('replay'), false); assert.equal(engine.setPaused(true), false);
  const count = renderers.length; session.updateConfig({ edition: 'amt72' }); assert.equal(renderers.length, count);
});

function canvasEnvironment() {
  let now = 0, tick, frames = 0, clearCount = 0, unsubscribeCount = 0;
  const context = new Proxy({}, { get: (_, key) => /create(?:Linear|Radial)Gradient/.test(key)
    ? () => ({ addColorStop() {} }) : () => {} });
  const canvas = { style: {}, getContext: () => context, setAttribute() {} };
  const environment = { createSurface: () => ({ getContext: () => context }), reducedMotion: () => false,
    pixelRatio: () => 1, isHidden: () => false, requestFrame: () => ++frames, cancelFrame() {},
    setTimer(callback) { tick = callback; return 1; }, clearTimer() { clearCount++; },
    onVisibilityChange() { return () => { unsubscribeCount++; }; }, readNow: () => now,
    readDate: () => new Date('2026-10-17T01:35:00Z') };
  return { canvas, environment, advance(ms) { now += ms; tick(); }, get clearCount() { return clearCount; },
    get unsubscribeCount() { return unsubscribeCount; } };
}

test('real embedded previews animate independently without a document event bus and clean up their resources', () => {
  const a = canvasEnvironment(), b = canvasEnvironment(), updates = [];
  const readViewport = () => ({ width: 1920, height: 1080, displayWidth: 720, displayHeight: 405 });
  const first = Preview.mount({ ...a, readViewport, onChange: config => updates.push(config),
    config: { edition: 'amt72', source: 'manual', manualTime: '10:10', autoDemo: true, demoInterval: 1, customDuration: true, duration: 1 } });
  const second = Preview.mount({ ...b, readViewport, config: { edition: 'clockclock24', source: 'manual', manualTime: '23:59' } });
  a.advance(3000);
  assert.equal(first.getConfig().manualTime, '10:11');
  assert.equal(updates.at(-1).manualTime, '10:11');
  assert.equal(second.getConfig().manualTime, '23:59');
  assert.equal(second.renderer.getStats().display, '2359');
  first.setSuspended('offscreen', true); const timeline = first.renderer.getStats().timeline;
  a.advance(60000); assert.equal(first.renderer.getStats().timeline, timeline);
  first.resize(); first.dispose(); first.dispose();
  assert.equal(first.disposed, true); assert.equal(a.clearCount, 1); assert.equal(a.unsubscribeCount, 1);
  second.updateConfig({ edition: 'clockclock9' });
  assert.equal(second.renderer.getStats().display, '2359');
  assert.equal(b.clearCount, 1);
  second.dispose(); assert.equal(b.clearCount, 2); assert.equal(b.unsubscribeCount, 2);
});

test('standalone runtime and offline Wallpaper Engine bundle embed the shared catalog without workbench code', () => {
  const runtime = read('dist/runtime/timeform.js');
  assert.doesNotMatch(runtime, /timeform-auto-time|localStorage|livelyPropertyListener|wallpaperPropertyListener/);
  const context = vm.createContext({ Intl, performance });
  vm.runInContext(runtime, context); // Loading the library must not need a DOM or start a clock.
  for (const model of context.Timeform.PresentationConfig.models) {
    const expected = Spec.get(model.id);
    assert.equal(JSON.stringify(model.Settings.defaults), JSON.stringify(expected.Settings.defaults));
    const clock = model.create(model.Settings.defaults), original = expected.create(expected.Settings.defaults);
    for (const instance of [clock, original]) { instance.initialize(574, 0); instance.animate(575, 0, true); instance.sample(10000); }
    assert.deepEqual(Array.from(clock.hands, hand => hand.angle), original.hands.map(hand => hand.angle), model.id);
  }
  const manifest = JSON.parse(read('dist/runtime/catalog.json'));
  assert.equal(manifest.editions.length, 30);
  assert.equal(new Set(manifest.editions.map(entry => entry.implementation)).size, 30);
  const html = read('dist/wallpaper-engine/index.html');
  assert.doesNotMatch(html, /<script[^>]+src=|<link[^>]+href=["']https?:/i);
  assert.match(html, /root.wallpaperPropertyListener = WallpaperEngine.create/);
  const script = html.match(/<script>([\s\S]*)<\/script>/)[1];
  new vm.Script(script);
  const project = JSON.parse(read('dist/wallpaper-engine/project.json'));
  assert.equal(project.file, 'index.html'); assert.equal(project.type, 'web');
  assert.equal(project.general.properties.edition.options.length, 30);
});
