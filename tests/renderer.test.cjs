'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

test('paused ClockClock L applies a selected choreography immediately and preserves it on subsequent minutes',()=>{
  const model=require('../src/web/classic.js').catalog(require('../src/models/landscape.js')).get('clockclockl');
  const Time=require('../src/shared/time.js');let paints=0,lastPose;
  const context=new Proxy({},{get:(_,key)=>key==='createLinearGradient' || key==='createRadialGradient' ? ()=>({addColorStop(){}}) : ()=>{}});
  const rendered={...model,Drawing:{...model.Drawing,drawHands(ctx,g,clock){paints++;lastPose=clock.hands.map(h=>h.angle);}}};
  const sandbox=vm.createContext({Timeform:{Time:{...Time,createPlayback:()=>Time.createPlayback(()=>0)}},
    document:{hidden:true,createElement:()=>({getContext:()=>context}),addEventListener(){},removeEventListener(){}},
    window:{matchMedia:()=>({matches:false}),devicePixelRatio:1},setInterval:()=>1,clearInterval(){},cancelAnimationFrame(){}});
  vm.runInContext(fs.readFileSync(require.resolve('../src/runtime/browser-environment.js'), 'utf8'), sandbox);
  vm.runInContext(fs.readFileSync(require.resolve('../src/runtime/renderer.js'),'utf8'),sandbox);
  const renderer=sandbox.Timeform.Renderer.create({style:{},getContext:()=>context,setAttribute(){}},
    model.Settings.normalize({source:'manual',manualTime:'09:35'}),rendered,
    ()=>({width:1920,height:1080,displayWidth:720,displayHeight:405}));
  renderer.setPaused(true);const before=paints;renderer.update({choreography:'tidal'});
  assert.ok(paints>before);renderer.step(16000);assert.equal(renderer.getStats().stage,'Tidal 波浪');
  const tidal=lastPose;renderer.update({choreography:'scatter'});renderer.step(16000);
  assert.equal(renderer.getStats().stage,'散相旋转');assert.notDeepEqual(lastPose,tidal);
  renderer.step(43000);renderer.update({manualTime:'09:36'});renderer.step(16000);
  assert.equal(renderer.getStats().stage,'散相旋转');renderer.dispose();
});

test('initial and resized canvases paint while the preview tab is hidden', () => {
  let paints = 0, width = 1080, height = 1920;
  const attributes = new Map();
  const context = new Proxy({}, { get(_, key) {
    if (key === 'drawImage') return () => { paints++; };
    if (key === 'createLinearGradient' || key === 'createRadialGradient') return () => ({ addColorStop() {} });
    return () => {};
  } });
  const canvas = { style: {}, getContext: () => context, setAttribute: (key, value) => attributes.set(key, value) };
  const sandbox = vm.createContext({
    Timeform: { Palette: require('../src/shared/palette.js'), SingleClock: require('../src/shared/single-clock.js'), Time: require('../src/shared/time.js') },
    document: { hidden: true, createElement: () => ({ getContext: () => context }), addEventListener() {}, removeEventListener() {} },
    window: { matchMedia: () => ({ matches: false }), devicePixelRatio: 1 },
    setInterval: () => 1, clearInterval() {}, cancelAnimationFrame() {},
    requestAnimationFrame() { throw new Error('Hidden tabs cannot supply a visible animation frame.'); }
  });
  vm.runInContext(fs.readFileSync(require.resolve('../src/runtime/browser-environment.js'), 'utf8'), sandbox);
  vm.runInContext(fs.readFileSync(require.resolve('../src/runtime/renderer.js'), 'utf8'), sandbox);
  for (const model of [require('../src/models/amt72v/model.js'), require('../src/models/landscape.js').get('amt72'), ...require('../src/models/circular.js').models]) {
    paints = 0;
    const settings = model.Settings.normalize({ source: 'manual', manualTime: '12:36' });
    const renderer = sandbox.Timeform.Renderer.create(canvas, settings, model, () => ({ width, height, displayWidth: 320, displayHeight: 568 }));
    assert.equal(paints, 1, 'time is painted on the first frame without waiting for a foreground tab');
    assert.match(attributes.get('aria-label'), /12:36/);
    width = 1170; height = 2532; renderer.resize();
    assert.equal(paints, 2, 'resize clears and then immediately repaints the canvas');
    assert.ok(canvas.width > 0 && canvas.height > 0);
    renderer.dispose();
  }
});

test('CC9 renders through its own drawing adapter without invoking SingleClock', () => {
  let bars = 0;
  const context = new Proxy({}, { get(_, key) {
    if (key === 'fillRect') return () => { bars++; };
    if (key === 'createLinearGradient') return () => ({ addColorStop() {} });
    return () => {};
  } });
  const canvas = { style: {}, getContext: () => context, setAttribute() {} };
  const sandbox = vm.createContext({
    Timeform: {
      Palette: require('../src/shared/palette.js'), Time: require('../src/shared/time.js'),
      SingleClock: { drawFace() { throw new Error('CC9 has no individual faces.'); }, drawHands() { throw new Error('CC9 has its own exposed bars.'); } }
    },
    document: { hidden: true, createElement: () => ({ getContext: () => context }), addEventListener() {}, removeEventListener() {} },
    window: { matchMedia: () => ({ matches: false }), devicePixelRatio: 1 },
    setInterval: () => 1, clearInterval() {}, cancelAnimationFrame() {}
  });
  vm.runInContext(fs.readFileSync(require.resolve('../src/runtime/browser-environment.js'), 'utf8'), sandbox);
  vm.runInContext(fs.readFileSync(require.resolve('../src/runtime/renderer.js'), 'utf8'), sandbox);
  const model = require('../src/models/circular.js').get('clockclock9');
  const renderer = sandbox.Timeform.Renderer.create(canvas, model.Settings.defaults, model,
    () => ({ width: 1080, height: 1080, displayWidth: 400, displayHeight: 400 }));
  assert.equal(bars, 18, 'all 18 exposed arms are drawn without a rectangular board fill');
  renderer.dispose();
});

test('paused and hidden 72v actions paint the reference pose and single steps without a browser animation frame', () => {
  const Time = require('../src/shared/time.js'), Model = require('../src/models/amt72v/model.js');
  let now = 0, paints = 0, lastPose;
  const context = new Proxy({}, { get(_, key) {
    if (key === 'createLinearGradient' || key === 'createRadialGradient') return () => ({ addColorStop() {} });
    return () => {};
  } });
  const document = { hidden: false, createElement: () => ({ getContext: () => context }), addEventListener() {}, removeEventListener() {} };
  const sandbox = vm.createContext({
    Timeform: { Palette: require('../src/shared/palette.js'), SingleClock: require('../src/shared/single-clock.js'),
      Time: { ...Time, createPlayback: () => Time.createPlayback(() => now) } },
    document, window: { matchMedia: () => ({ matches: false }), devicePixelRatio: 1 },
    setInterval: () => 1, clearInterval() {}, cancelAnimationFrame() {}, requestAnimationFrame: () => 1
  });
  vm.runInContext(fs.readFileSync(require.resolve('../src/runtime/browser-environment.js'), 'utf8'), sandbox);
  vm.runInContext(fs.readFileSync(require.resolve('../src/runtime/renderer.js'), 'utf8'), sandbox);
  const model = { ...Model, Drawing: { ...Model.Drawing, drawHands(ctx, geometry, clock) {
    paints++; lastPose = clock.hands.map(h => h.angle);
  } } };
  const renderer = sandbox.Timeform.Renderer.create({ style: {}, getContext: () => context, setAttribute() {} },
    Model.Settings.normalize({ source: 'manual', manualTime: '09:34', duration: 32 }), model,
    () => ({ width: 1080, height: 1920, displayWidth: 320, displayHeight: 568 }));
  renderer.setPaused(true);
  renderer.update({ motion: 'wave', manualTime: '09:35' });
  const before = paints; renderer.playReference(); assert.equal(paints, before + 1);
  assert.ok(Math.abs(lastPose[0] - 6.78 * Math.PI / 180) < 1e-8);
  assert.equal(renderer.getStats().stage, '列间相位旋转');
  const first = lastPose[0]; renderer.step(100); assert.ok(lastPose[0] > first);
  assert.equal(renderer.getStats().timeline, 100);
  document.hidden = true; renderer.setPaused(false); now = 500;
  const hiddenBefore = paints; renderer.update({ motion: 'none', manualTime: '12:36' });
  assert.equal(paints, hiddenBefore + 1); assert.equal(renderer.getStats().display, '1236');
  assert.ok(Math.abs(lastPose[0] - Model.digitPose('1236')[0].angle) < 1e-8);
  renderer.dispose();
});

test('classic 72v plays the 32-second source clip and restores the 38-second full transition', () => {
  const Classic = require('../src/web/classic.js'), Time = require('../src/shared/time.js');
  const model = Classic.catalog(require('../src/models/portrait.js')).get('amt72v');
  const context = new Proxy({}, { get(_, key) {
    if (key === 'createLinearGradient' || key === 'createRadialGradient') return () => ({ addColorStop() {} });
    return () => {};
  } });
  const sandbox = vm.createContext({
    Timeform: { Palette: require('../src/shared/palette.js'), SingleClock: require('../src/shared/single-clock.js'),
      Time: { ...Time, createPlayback: () => Time.createPlayback(() => 0) } },
    document: { hidden: true, createElement: () => ({ getContext: () => context }), addEventListener() {}, removeEventListener() {} },
    window: { matchMedia: () => ({ matches: false }), devicePixelRatio: 1 },
    setInterval: () => 1, clearInterval() {}, cancelAnimationFrame() {}
  });
  vm.runInContext(fs.readFileSync(require.resolve('../src/runtime/browser-environment.js'), 'utf8'), sandbox);
  vm.runInContext(fs.readFileSync(require.resolve('../src/runtime/renderer.js'), 'utf8'), sandbox);
  const renderer = sandbox.Timeform.Renderer.create({ style: {}, getContext: () => context, setAttribute() {} },
    model.Settings.normalize({ source: 'manual', manualTime: '09:34' }), model,
    () => ({ width: 1080, height: 1920, displayWidth: 320, displayHeight: 568 }));
  renderer.setPaused(true); renderer.update({ manualTime: '09:35' });
  assert.equal(renderer.playReference(), true);
  assert.equal(renderer.getStats().stage, '列间相位旋转');
  renderer.step(32000); assert.equal(renderer.getStats().animating, false);
  renderer.replay(); assert.equal(renderer.getStats().stage, '拆字归队');
  renderer.step(32000); assert.equal(renderer.getStats().animating, true);
  renderer.step(6000); assert.equal(renderer.getStats().animating, false);
  renderer.dispose();
});

test('circular demo waits for the choreography and reading hold; live time retargets without restarting', () => {
  const Time = require('../src/shared/time.js');
  for (const source of ['manual', 'live']) {
    let now = 0, minute = 610, tick;
    const context = new Proxy({}, { get(_, key) {
      if (key === 'createLinearGradient' || key === 'createRadialGradient') return () => ({ addColorStop() {} });
      return () => {};
    } });
    const sandbox = vm.createContext({
      Timeform: {
        Palette: require('../src/shared/palette.js'), SingleClock: require('../src/shared/single-clock.js'),
        Time: { ...Time, createPlayback: () => Time.createPlayback(() => now),
          createSource: () => ({ read: settings => settings.source === 'manual' ? Time.minutesFromText(settings.manualTime) : minute }) }
      },
      document: { hidden: false, createElement: () => ({ getContext: () => context }), addEventListener() {}, removeEventListener() {}, dispatchEvent() {} },
      window: { matchMedia: () => ({ matches: false }), devicePixelRatio: 1 },
      setInterval: callback => { tick = callback; return 1; }, clearInterval() {}, cancelAnimationFrame() {}, requestAnimationFrame: () => 1,
      CustomEvent: class { constructor(type, options) { this.type = type; this.detail = options.detail; } }
    });
    vm.runInContext(fs.readFileSync(require.resolve('../src/runtime/browser-environment.js'), 'utf8'), sandbox);
  vm.runInContext(fs.readFileSync(require.resolve('../src/runtime/renderer.js'), 'utf8'), sandbox);
    const model = require('../src/models/circular.js').get('amt61c');
    const settings = model.Settings.normalize({ source, manualTime: '10:10', autoDemo: true, demoInterval: 1, duration: source === 'manual' ? 6 : 120 });
    const canvas = { style: {}, getContext: () => context, setAttribute() {} };
    const renderer = sandbox.Timeform.Renderer.create(canvas, settings, model,
      () => ({ width: 1080, height: 1080, displayWidth: 400, displayHeight: 400 }));
    if (source === 'manual') {
      now = 1000; tick(); assert.equal(renderer.getStats().display, '1010');
      now = 8000; tick(); assert.equal(renderer.getStats().display, '1011');
      now = 9500; tick(); assert.equal(renderer.getStats().stage, '统一停留');
      now = 15900; tick(); assert.equal(renderer.getStats().display, '1011'); assert.equal(renderer.getStats().animating, false);
      now = 16000; tick(); assert.equal(renderer.getStats().display, '1012');
    } else {
      now = 100; minute = 611; tick(); assert.equal(renderer.getStats().stage, '逐位整理');
      now = 61000; minute = 612; tick(); assert.equal(renderer.getStats().stage, '风势流动');
      now = 96100; minute = 613; tick(); assert.equal(renderer.getStats().stage, '逐针成型');
      now = 120100; tick(); assert.equal(renderer.getStats().display, '1013'); assert.equal(renderer.getStats().animating, false);
    }
    renderer.dispose();
  }
});

test('remastered AMT arrays finish across live minute boundaries and wait for a full manual performance', () => {
  const Time = require('../src/shared/time.js');
  for (const model of [require('../src/models/amt72/model.js'), require('../src/models/amt120/model.js'), require('../src/models/amt144/model.js'), require('../src/models/amt288/model.js'), require('../src/models/amt72v/model.js')]) for (const source of ['live','manual']) {
    let now=0,minute=574,tick;
    const context=new Proxy({}, { get(_,key) {
      if (key==='createLinearGradient' || key==='createRadialGradient') return ()=>({ addColorStop() {} });
      return ()=>{};
    } });
    const sandbox=vm.createContext({
      Timeform:{ Palette:require('../src/shared/palette.js'),SingleClock:require('../src/shared/single-clock.js'),
        Time:{ ...Time,createPlayback:()=>Time.createPlayback(()=>now),
          createSource:()=>({ read:settings=>settings.source==='manual' ? Time.minutesFromText(settings.manualTime) : minute }) } },
      document:{ hidden:false,createElement:()=>({ getContext:()=>context }),addEventListener() {},removeEventListener() {},dispatchEvent() {} },
      window:{ matchMedia:()=>({ matches:false }),devicePixelRatio:1 },
      setInterval:callback=>{ tick=callback; return 1; },clearInterval() {},cancelAnimationFrame() {},requestAnimationFrame:()=>1,
      CustomEvent:class { constructor(type,options) { this.type=type; this.detail=options.detail; } }
    });
    vm.runInContext(fs.readFileSync(require.resolve('../src/runtime/browser-environment.js'), 'utf8'), sandbox);
  vm.runInContext(fs.readFileSync(require.resolve('../src/runtime/renderer.js'),'utf8'),sandbox);
    const settings=model.Settings.normalize({ source,manualTime:'09:34',autoDemo:true,demoInterval:1,duration:120 });
    const renderer=sandbox.Timeform.Renderer.create({ style:{},getContext:()=>context,setAttribute() {} },settings,model,
      ()=>({ width:1920,height:1080,displayWidth:800,displayHeight:450 }));
    if (source==='live') {
      const stages={ amt72:['向心归队','涟漪开合','逐针成型'],amt120:['环弧归队','环波开合','逐针成型'],amt144:['逐列归队','列波流动','双速成型'],amt288:['环弧归队','环波开合','逐针成型'],amt72v:['拆字归队','列间相位旋转','双速逐针成型'] }[model.id];
      now=100; minute=575; tick(); assert.equal(renderer.getStats().stage,stages[0]);
      now=model.id==='amt72v'?41000:61000; minute=576; tick(); assert.equal(renderer.getStats().stage,stages[1]);
      now=100000; minute=577; tick(); assert.equal(renderer.getStats().stage,stages[2]);
      now=120100; tick(); assert.equal(renderer.getStats().display,'0937'); assert.equal(renderer.getStats().animating,false);
    } else {
      now=1000; tick(); assert.equal(renderer.getStats().display,'0934');
      now=122000; tick(); assert.equal(renderer.getStats().display,'0935');
      now=243000; tick(); assert.equal(renderer.getStats().display,'0935'); assert.equal(renderer.getStats().animating,false);
      now=244000; tick(); assert.equal(renderer.getStats().display,'0936');
    }
    renderer.setPaused(true); const paused=renderer.getStats().timeline;
    now+=50000; tick(); assert.equal(renderer.getStats().timeline,paused);
    renderer.step(100); assert.equal(renderer.getStats().timeline,paused+100);
    renderer.dispose();
  }
});
