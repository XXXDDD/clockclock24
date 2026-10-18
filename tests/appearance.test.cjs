'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const Classic = require('../src/catalog/classic.js');
const Config = require('../src/shared/config.js');
const Modes = require('../src/rendering/modes.js');
const Surfaces = require('../src/rendering/surfaces.js');
const MetalLight = require('../src/rendering/metal-light.js');
const Renderer = require('../src/runtime/renderer.js');
const Presentation = require('../src/core/presentation-config.js');
const models = ['circular', 'landscape', 'portrait'].flatMap(kind => Classic.catalog(require('../src/models/' + kind + '.js')).models);

test('shared recess rim and AMT72v use one concentric full circle with no half-circle seams', () => {
  const SingleClock=require('../src/shared/single-clock.js');
  const Portrait=require('../src/models/amt72v/drawing.js');
  for(const board of ['#111213','#f6f4ef','#21444c']) {
    const strokes=[]; let arcs=[];
    const context=new Proxy({}, {get:(_,key)=>{
      if(key==='createLinearGradient'||key==='createRadialGradient')return()=>({addColorStop(){}});
      if(key==='beginPath')return()=>{arcs=[];};
      if(key==='arc')return(...args)=>arcs.push(args);
      if(key==='stroke')return()=>strokes.push(...arcs);
      return()=>{};
    }});
    SingleClock.drawRecessRim(context,{board});
    assert.deepEqual(strokes,[[0,0,52.6,0,Math.PI*2]]);
    strokes.length=0;
    Portrait.drawSurface(context,{boardWidth:200,boardHeight:200,points:[{x:100,y:100,radius:53.2}]},{board});
    assert.deepEqual(strokes,[[0,0,52.6,0,Math.PI*2]],board+' has a continuous rim');
  }
});

function recorder() {
  const arms = [], stack = []; let state = { scale: 1, active: null }, surfaces = 0;
  const tip = value => { if (state.active && !state.active.clipped) state.active.tip = Math.max(state.active.tip, value * state.scale); };
  const thickness = (y, height = 0) => {
    if (!state.active || state.active.clipped) return;
    state.active.minY = Math.min(state.active.minY, y * state.scale);
    state.active.maxY = Math.max(state.active.maxY, (y + height) * state.scale);
  };
  const ctx = new Proxy({}, { get(_, key) {
    if (key === 'createLinearGradient' || key === 'createRadialGradient') return () => ({ addColorStop() {} });
    if (key === 'getTransform') return () => ({ a: state.scale, b: 0 });
    if (key === 'save') return () => stack.push({ ...state });
    if (key === 'restore') return () => { state = stack.pop(); };
    if (key === 'scale') return scale => { state.scale *= scale; };
    if (key === 'rotate') return angle => { state.active = { angle, tip: -Infinity, minY: Infinity, maxY: -Infinity }; arms.push(state.active); };
    if (key === 'clip') return () => { if (state.active) state.active.clipped = true; };
    if (['rect', 'fillRect', 'roundRect'].includes(key)) return (x, y, width, height) => {
      tip(x + width); thickness(y, height);
      if (key === 'fillRect' && state.active && !state.active.clipped) state.active.drawn = true;
    };
    if (key === 'fill') return () => { if (state.active) state.active.drawn = true; };
    if (['moveTo', 'lineTo'].includes(key)) return (x, y) => { tip(x); thickness(y); };
    if (key === 'arc') return (x, y, radius) => thickness(y - radius, radius * 2);
    if (key === 'clearRect') return () => { surfaces++; };
    return () => {};
  } });
  return { ctx, get arms() { return arms.filter(arm => arm.drawn && Number.isFinite(arm.tip)); }, get surfaces() { return surfaces; } };
}

test('appearance modes round-trip for every edition, use material defaults and preserve explicit overrides', () => {
  for (const model of models) {
    assert.equal(model.Settings.defaults.appearance, 'auto', model.id);
    assert.equal(model.Settings.defaults.handAppearance, 'auto', model.id);
    const old = Config.parse(model, JSON.stringify({ version: 2, type: model.type, model: model.id, settings: { board: '#123456' } }));
    assert.equal(old.appearance, 'auto'); assert.equal(old.board, '#123456');
    assert.equal(old.handAppearance, 'auto');
    const enhanced = model.Settings.normalize({ appearance: 'sculpted' });
    assert.deepEqual(Config.parse(model, Config.serialize(model, enhanced)), enhanced);
    const portable = Presentation.parse(Config.serialize(model, enhanced));
    assert.equal(Presentation.resolve(Presentation.parse(Presentation.serialize(portable))).settings.appearance, 'sculpted');
    assert.throws(() => Config.parse(model, JSON.stringify({ version: 2, type: model.type, model: model.id,
      settings: { appearance: 'unknown' } })), /无效/);
    assert.equal(Modes.resolve(model, { appearance: 'original', handAppearance: 'original' }), model.Drawing, 'explicit original preserves the exact existing drawing adapter');
    for (const appearance of ['auto', 'original', 'sculpted']) for (const handAppearance of ['auto', 'follow', 'original', 'sculpted']) {
      const mixed = model.Settings.normalize({ appearance, handAppearance });
      assert.deepEqual(Config.parse(model, Config.serialize(model, mixed)), mixed);
      assert.deepEqual(Presentation.resolve(Presentation.parse(Config.serialize(model, mixed))).settings, mixed);
    }
    assert.throws(() => Config.parse(model, JSON.stringify({ version: 2, type: model.type, model: model.id,
      settings: { handAppearance: 'invalid' } })), /无效/);
  }
});

test('neutral boards retain their original surface while surface and hand adapters combine independently', () => {
  for (const original of models) {
    let surfaces = 0;
    const model = { ...original, Drawing: { ...original.Drawing, drawSurface() { surfaces++; } } };
    const geometry = model.geometry(1920, 1080, {}), { ctx } = recorder();
    const config = model.Settings.normalize({ appearance: 'sculpted' });
    const neutral = Surfaces.usesOriginalSurface(config, model.Drawing.appearance);
    Modes.resolve(model, config).drawSurface(ctx, geometry, config);
    // Stone also calls its original texture renderer, then adds its own lighting.
    assert.equal(surfaces, neutral || model.Drawing.appearance.texture ? 1 : 0, model.id);
    const surfaceOnly = Modes.resolve(model, { appearance: 'sculpted', handAppearance: 'original' });
    assert.equal(surfaceOnly.drawHands, model.Drawing.drawHands);
    const handsOnly = Modes.resolve(model, { appearance: 'original', handAppearance: 'sculpted' });
    assert.equal(handsOnly.drawSurface, model.Drawing.drawSurface);
    assert.notEqual(handsOnly.drawHands, model.Drawing.drawHands);
  }
});

test('automatic effects choose original neutral surfaces and handle each motor material without changing stacking', () => {
  for (const model of models) {
    const config = model.Settings.defaults, profile = model.Drawing.appearance;
    const drawing = Modes.resolve(model, config), geometry = model.geometry(1920, 1080, config);
    const metal = secondary => ['metal', 'outlined'].includes(Array.isArray(profile.finish) ? profile.finish[secondary ? 1 : 0] : profile.finish);
    const neutral = Surfaces.usesOriginalSurface(config, profile);
    assert.equal(drawing.drawSurface === model.Drawing.drawSurface, neutral, model.id + ' default surface');
    if (!metal(false) && !metal(true)) assert.equal(drawing.drawHands, model.Drawing.drawHands, model.id + ' ordinary hands stay original');
    const hands = Array.from({ length: model.count * 2 }, (_, i) => ({ angle: .123 + i / 1000, opacity: 1 }));
    // Capture after drawing, since the recorder exposes only painted arm paths.
    const recording = recorder(); drawing.drawHands(recording.ctx, geometry, { hands }, config);
    const painted = recording.arms;
    assert.equal(painted.length, model.count * 2, model.id + ' each motor paints one original silhouette');
    let index = 0;
    for (const point of geometry.points) {
      const lane = model.Drawing.longLane?.(point) || 0;
      for (const secondary of [true, false]) {
        const angle = hands[point.i + (secondary ? lane ^ 1 : lane)].angle;
        assert.equal(painted[index++].angle, angle, model.id + ' short stays below long');
      }
    }
  }
});

test('metal reflection varies with world position, stays coherent, repeats exactly and is independent of display scale', () => {
  const geometry = { boardWidth: 1000, boardHeight: 450 };
  const left = { x: 100, y: 120, radius: 53.2 }, right = { x: 900, y: 350, radius: 53.2 };
  const a = MetalLight.sample(geometry, left, .4, 0), b = MetalLight.sample(geometry, right, .4, 0);
  assert.ok(Math.abs(a.center - b.center) > .05, 'parallel hands have spatially different highlights');
  assert.ok(Math.abs(a.strength - b.strength) > .05, 'near and far hands see different light strengths');
  assert.deepEqual(MetalLight.sample(geometry, left, .4, 0), a, 'pause/repaint never rerolls a finish');
  const wrapped = MetalLight.sample(geometry, left, .4 + Math.PI * 2, 0);
  const scaled = MetalLight.sample({ boardWidth: 2000, boardHeight: 900 }, { x: 200, y: 240, radius: 106.4 }, .4, 0);
  const nextFrame = MetalLight.sample(geometry, left, .401, 0);
  for (const key of Object.keys(a)) {
    assert.ok(Math.abs(a[key] - wrapped[key]) < 1e-12, key + ' has no rotation seam');
    assert.equal(a[key], scaled[key], key + ' is independent of resolution');
    assert.ok(Math.abs(a[key] - nextFrame[key]) < .005, key + ' changes continuously');
  }
});

test('automatic surface selection follows manual color changes without recreating or advancing the clock', () => {
  const original = models.find(model => model.id === 'clockclock24');
  let nativeSurfaces = 0, creations = 0;
  const model = { ...original,
    create(...args) { creations++; return original.create(...args); },
    Drawing: { ...original.Drawing, drawSurface(...args) { nativeSurfaces++; original.Drawing.drawSurface(...args); } } };
  const main = recorder(), surface = recorder();
  const env = { readNow: () => 0, createSurface: () => ({ getContext: () => surface.ctx }), reducedMotion: () => false,
    pixelRatio: () => 1, isHidden: () => true, cancelFrame() {}, requestFrame() {}, setTimer: () => 1, clearTimer() {}, onVisibilityChange: () => () => {} };
  const renderer = Renderer.create({ style: {}, getContext: () => main.ctx, setAttribute() {} }, model.Settings.defaults, model,
    () => ({ width: 1920, height: 1080, displayWidth: 800, displayHeight: 450 }), env);
  renderer.setPaused(true); const timeline = renderer.getStats().timeline;
  assert.equal(nativeSurfaces, 1);
  renderer.update({ board: '#101c38' }); assert.equal(nativeSurfaces, 1, 'colored uses the sculpted surface');
  renderer.update({ board: '#f6f4ef' }); assert.equal(nativeSurfaces, 2, 'white restores the native surface');
  assert.equal(renderer.getStats().appearance, 'auto'); assert.equal(renderer.getStats().timeline, timeline);
  assert.equal(creations, 1); renderer.dispose();
});

test('sculpted drawing preserves the actual legacy hand reaches and motor lanes across all editions and custom widths', () => {
  for (const model of models) for (const patch of [{}, { longLength: 83, shortLength: 63, longWidth: 4, shortWidth: 3, radius: 30 }]) {
    const settings = model.Settings.normalize({ ...patch, appearance: 'sculpted', handAppearance: 'sculpted' });
    const geometry = model.geometry(1920, 1080, settings);
    const hands = Array.from({ length: model.count * 2 }, (_, i) => ({ angle: .123 + i / 1000, opacity: 1 }));
    const legacy = recorder(), enhanced = recorder();
    model.Drawing.drawHands(legacy.ctx, geometry, { hands }, settings);
    const untouched = structuredClone(hands);
    Modes.resolve(model, settings).drawHands(enhanced.ctx, geometry, { hands }, settings);
    assert.deepEqual(hands, untouched, model.id + ' appearance cannot mutate sampled animation state');
    assert.equal(enhanced.arms.length, legacy.arms.length, model.id + ' one unchanged silhouette per arm');
    legacy.arms.forEach((arm, index) => {
      for (const actual of enhanced.arms.slice(index, index + 1)) {
        assert.equal(actual.angle, arm.angle, model.id + ' preserves motor identity');
        assert.ok(Math.abs(actual.tip - arm.tip) < 1e-9, `${model.id} physical tip: ${actual.tip} versus ${arm.tip}`);
        assert.ok(Math.abs(actual.minY - arm.minY) < 1e-9 && Math.abs(actual.maxY - arm.maxY) < 1e-9,
          model.id + ' original width is preserved on both sides');
      }
    });
  }
});

test('switching appearance while paused repaints the surface without moving time or restarting the choreography', () => {
  for (const original of models) {
    const main = recorder(), surface = recorder(); let clock;
    const model = { ...original, create(...args) { clock = original.create(...args); return clock; } };
    const env = { readNow: () => 0, createSurface: () => ({ getContext: () => surface.ctx }),
      reducedMotion: () => false, pixelRatio: () => 1, isHidden: () => true,
      cancelFrame() {}, requestFrame() { throw new Error('Paused comparison should repaint immediately.'); },
      setTimer: () => 1, clearTimer() {}, onVisibilityChange: () => () => {} };
    const canvas = { style: {}, getContext: () => main.ctx, setAttribute() {} };
    const renderer = Renderer.create(canvas, model.Settings.normalize({ source: 'manual', manualTime: '09:34' }), model,
      () => ({ width: 1920, height: 1080, displayWidth: 800, displayHeight: 450 }), env);
    renderer.setPaused(true); renderer.update({ manualTime: '09:35' }); renderer.step(12000);
    const before = renderer.getStats(), pose = clock.hands.map(({ angle, opacity }) => ({ angle, opacity }));
    let paints = surface.surfaces;
    for (const appearance of ['sculpted', 'original', 'sculpted']) {
      renderer.update({ appearance });
      const after = renderer.getStats();
      assert.equal(after.appearance, appearance); assert.equal(after.timeline, before.timeline);
      assert.equal(after.stage, before.stage); assert.equal(after.display, before.display); assert.equal(after.paused, true);
      assert.equal(after.animating, before.animating); assert.deepEqual(after.geometry, before.geometry);
      assert.deepEqual(clock.hands.map(({ angle, opacity }) => ({ angle, opacity })), pose, model.id);
      assert.equal(surface.surfaces, ++paints, model.id + ' invalidates cached surface on mode change');
    }
    renderer.update({ long: '#e5be63' });
    assert.equal(surface.surfaces, paints, 'changing only the hands keeps the static surface cached');
    for (const handAppearance of ['original', 'sculpted', 'follow']) {
      renderer.update({ handAppearance });
      assert.equal(surface.surfaces, paints, 'switching only the hand renderer keeps the surface cached');
      assert.equal(renderer.getStats().timeline, before.timeline);
      assert.deepEqual(clock.hands.map(({ angle, opacity }) => ({ angle, opacity })), pose);
    }
    renderer.step(100); assert.equal(renderer.getStats().timeline, before.timeline + 100);
    renderer.dispose();
  }
});
