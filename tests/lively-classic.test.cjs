'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const Spec = require('../src/lively/classic-config.js');
const Controller = require('../src/lively/classic-controller.js');
const Catalog = require('../src/web/classic-catalog.js');
const Config = require('../src/shared/config.js');

function harness(initial) {
  const instances = [];
  const Renderer = { create(canvas, settings, model) {
    const result = { model, settings, disposed: 0, paused: false,
      update(next) { this.settings = next; }, setPaused(value) { this.paused = value; },
      replay() { this.replayed = true; }, showCurrentTime() { this.settled = true; }, dispose() { this.disposed++; } };
    instances.push(result); return result;
  } };
  return { controller: Controller.create({ config: initial, Renderer }), instances };
}

test('complete package registers the same 30 editions as the current web catalog', () => {
  assert.equal(Spec.models.length, 30);
  assert.deepEqual(Spec.models.map(model => model.id).sort(), Catalog.entries.map(entry => entry.implementation).sort());
  assert.deepEqual(['landscape', 'circular', 'portrait'].map(type => Spec.models.filter(model => model.type === type).length), [23, 3, 4]);
  for (const model of Spec.models) {
    const { settings } = Spec.resolve({ edition: model.id });
    for (const key of ['background', 'board', 'long', 'short', 'radius', 'gap', 'longLength', 'shortLength', 'visibility', 'duration', 'choreography', 'centerHourLength', 'safeTop']) {
      assert.equal(settings[key], model.Settings.defaults[key], model.id + ' retains its own ' + key);
    }
    const clock = model.create(settings); clock.initialize(574, 0); clock.animate(575, 0, true);
    for (const seconds of [0, settings.duration * .4, settings.duration]) {
      clock.sample(seconds * 1000);
      assert.ok(clock.hands.every(hand => Number.isFinite(hand.angle)), model.id + ' animates with finite hand positions');
    }
  }
});

test('native preset changes preserve screen settings while loading each edition appearance', () => {
  const { controller, instances } = harness({ scale: 73, offsetX: 12 });
  Spec.models.forEach((model, index) => {
    assert.equal(controller.property('edition', index), true);
    assert.equal(controller.renderer.model.id, model.id);
    assert.equal(controller.renderer.settings.board, model.Settings.defaults.board);
    assert.equal(controller.renderer.settings.duration, model.Settings.defaults.duration);
    assert.equal(controller.renderer.settings.scale, 73);
    assert.equal(controller.renderer.settings.offsetX, 12);
  });
  instances.slice(0, -1).forEach(instance => assert.equal(instance.disposed, 1));
  controller.dispose(); controller.dispose();
  assert.equal(instances.at(-1).disposed, 1);
  assert.equal(controller.property('edition', 0), false);
});

test('native callbacks restore the same saved configuration regardless of callback order', () => {
  const saved = Spec.normalize({ edition: 'amt61c-tidal', customColors: true, board: '#123456', background: '#192a37',
    customGeometry: true, radius: 49, gap: 9, scale: 81, customDuration: true, duration: 63.5, source: 'manual', manualTime: '23:59', timezone: 'Asia/Hong_Kong' });
  const properties = Object.entries(Spec.livelyProperties(saved)).filter(([name]) => Spec.fields[name]);
  for (const entries of [properties, [...properties].reverse()]) {
    const { controller } = harness();
    entries.forEach(([name, property]) => assert.equal(controller.property(name, property.value), true, name));
    assert.deepEqual(controller.getConfig(), saved);
    assert.deepEqual(controller.renderer.settings, Spec.resolve(saved).settings);
    controller.dispose();
  }
});

test('overrides can be disabled and unsupported actions return to the selected edition default', () => {
  const input = { edition: 'amt72v-white', customColors: true, board: '#123456', customGeometry: true, gap: 9.3, customDuration: true, duration: 60 };
  const custom = Spec.resolve(input);
  assert.equal(custom.settings.board, '#123456'); assert.equal(custom.settings.gap, 9.3); assert.equal(custom.settings.duration, 60);
  const restored = Spec.resolve({ ...input, customColors: false, customGeometry: false, customDuration: false, action: 'amt61c:tidal' });
  for (const key of ['board', 'gap', 'duration', 'choreography']) assert.equal(restored.settings[key], restored.model.Settings.defaults[key]);
  const wind = Spec.resolve({ edition: 'amt72', action: 'amt72:wind' });
  assert.equal(wind.settings.choreography, 'wind'); assert.equal(wind.settings.duration, wind.model.getMotion(wind.settings).duration);
  const tidal = Spec.resolve({ edition: 'clockclock24', action: 'clockclock24:tidal' });
  assert.equal(tidal.settings.choreography, 'tidal'); assert.equal(tidal.settings.duration, 42);
});

test('host pause remains in force across changes and combines with the user pause control', () => {
  const { controller } = harness();
  assert.equal(controller.playback('{"IsPaused":true}'), true);
  controller.property('edition', 26); assert.equal(controller.renderer.paused, true);
  controller.property('paused', true); controller.playback({ IsPaused: false }); assert.equal(controller.renderer.paused, true);
  controller.property('paused', false); assert.equal(controller.renderer.paused, false);
  assert.equal(controller.playback({ IsPaused: 'true' }), false);
  assert.equal(controller.playback('invalid'), false);
  controller.property('replay', 'replay'); assert.equal(controller.renderer.replayed, true);
  controller.property('settle', 'settle'); assert.equal(controller.renderer.settled, true);
  controller.dispose(); assert.equal(controller.playback({ IsPaused: true }), false);
});

test('web edition JSON imports keep exact model settings and complete configurations round trip', () => {
  for (const model of Spec.models) {
    const settings = model.Settings.normalize({ source: 'manual', manualTime: '12:36', background: '#17352a', gap: 6.9, duration: 60 });
    const imported = Spec.parse(Config.serialize(model, settings));
    assert.equal(imported.edition, model.id);
    assert.deepEqual(Spec.resolve(imported).settings, settings, model.id);
    assert.deepEqual(Spec.parse(Spec.serialize(imported)), imported);
  }
  for (const [name, value] of [['edition', 30], ['edition', false], ['gap', 'NaN'], ['board', 'red'], ['manualTime', '9:35'], ['timezone', 'Invalid/Zone']]) {
    assert.equal(Spec.decodeProperty(name, value), undefined);
  }
  assert.throws(() => Spec.parse('{"version":4,"platform":"lively-classic","settings":{"edition":"missing"}}'));
});

test('offline bundle includes all model code and native metadata at the archive root', () => {
  const html = fs.readFileSync(require.resolve('../lively-complete/index.html'), 'utf8');
  assert.doesNotMatch(html, /<script[^>]+src=|<link[^>]+href=["']https?:/i);
  assert.match(html, /data-editor="0"/);
  assert.match(html, /root\.livelyPropertyListener = controller\.property/);
  const script = html.match(/<script>([\s\S]*)<\/script>/)[1];
  const beforeApp = script.slice(0, script.indexOf("(function (root) {\n  'use strict';\n  const { ClassicLivelyConfig"));
  const context = vm.createContext({ Intl, TextEncoder, Uint8Array });
  vm.runInContext(beforeApp, context);
  assert.deepEqual(Array.from(context.Timeform.ClassicLivelyConfig.models, model => model.id), Spec.models.map(model => model.id));
  for (const model of context.Timeform.ClassicLivelyConfig.models) {
    const expected = Spec.get(model.id).Settings.defaults;
    for (const key of ['longLength', 'shortLength', 'centerHourLength', 'duration', 'visibility']) assert.equal(model.Settings.defaults[key], expected[key], model.id + ' embeds the latest ' + key);
  }
  const info = JSON.parse(fs.readFileSync(require.resolve('../lively-complete/LivelyInfo.json'), 'utf8'));
  assert.equal(info.Type, 1); assert.equal(info.FileName, 'index.html'); assert.equal(info.Arguments, '--pause-event true');
  const properties = JSON.parse(fs.readFileSync(require.resolve('../lively-complete/LivelyProperties.json'), 'utf8'));
  assert.deepEqual(properties, Spec.livelyProperties({ borderless: true }));
  assert.equal(properties.edition.items.length, 30);
  assert.equal(properties.layout, undefined);
  assert.equal(Object.keys(properties).some(key => /Picker$|^preset(?:amt|clockclock)/.test(key)), false);
});

test('flat selection imports v5 settings and preserves the latest hand-proportion migration', () => {
  const previous = Spec.parse(JSON.stringify({ version: 5, handGeometryVersion: 1, platform: 'lively-classic', settings: {
    edition: 'amt61c-tidal', layout: 'circular', circularModel: 'amt61c', presetamt61c: 'amt61c-tidal', scale: 73, offsetX: 12
  } }));
  assert.equal(previous.edition, 'amt61c-tidal'); assert.equal(previous.scale, 73); assert.equal(previous.offsetX, 12);
  assert.equal(Object.hasOwn(previous, 'layout'), false);
  const saved = Spec.parse(JSON.stringify({ version: 4, platform: 'lively-classic', settings: { edition: 'amt72v-white', customGeometry: true, longLength: 100, shortLength: 100 } }));
  assert.equal(saved.edition, 'amt72v-white');
  assert.equal(saved.shortLength, Spec.get('amt72v-white').Settings.defaults.shortLength);
  const equal = Spec.parse(Spec.serialize({ edition: 'amt72v-white', customGeometry: true, longLength: 100, shortLength: 100 }));
  assert.equal(equal.shortLength, 100);
});
