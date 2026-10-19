'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');

function androidRuntime() {
  let serial = 0, session;
  const pending = new Map(), intervals = new Map(), attributes = new Map(), listeners = {};
  const drawing = new Proxy({}, { get: (_, key) => /create(?:Linear|Radial)Gradient/.test(key)
    ? () => ({ addColorStop() {} }) : () => {} });
  const canvas = { style: {}, getContext: () => drawing, setAttribute: (key, value) => attributes.set(key, value) };
  const viewport = { style: {}, clientWidth: 393, clientHeight: 873 };
  const sandbox = vm.createContext({ Intl, performance, devicePixelRatio: 3,
    setTimeout(callback, delay) { const id = ++serial; pending.set(id, { callback, delay }); return id; },
    clearTimeout(id) { pending.delete(id); },
    setInterval(callback) { const id = ++serial; intervals.set(id, callback); return id; },
    clearInterval(id) { intervals.delete(id); },
    requestAnimationFrame() { throw new Error('Android host must use its capped scheduling.'); },
    cancelAnimationFrame() {},
    addEventListener(name, fn) { listeners[name] = fn; },
    ResizeObserver: class { observe() {} disconnect() {} },
    document: { hidden: false, getElementById: id => id === 'clock' ? canvas : viewport,
      createElement: () => ({ getContext: () => drawing }), addEventListener() {}, removeEventListener() {} } });
  sandbox.window = sandbox;
  sandbox.matchMedia = () => ({ matches: false });
  vm.runInContext(read('android/app/src/main/assets/timeform.js'), sandbox);
  const mount = sandbox.Timeform.Session.create;
  sandbox.Timeform.Session.create = options => { session = mount(options); return session; };
  vm.runInContext(read('src/hosts/android/app.js'), sandbox);
  return { sandbox, attributes, canvas, viewport, pending, intervals, listeners, get session() { return session; } };
}

test('Android renders all 30 bundled editions at phone dimensions with live device time', () => {
  const host = androidRuntime(), { sandbox } = host;
  assert.equal(Number.parseFloat(host.canvas.style.width),host.viewport.clientWidth);
  assert.equal(Number.parseFloat(host.canvas.style.height),host.viewport.clientHeight);
  for (const model of sandbox.Timeform.PresentationConfig.models) {
    sandbox.TimeformAndroid.update({ edition: model.id, scale: 70, offsetX: 4, offsetY: -5, fps: 30, source: 'manual', autoDemo: true });
    assert.equal(host.session.getConfig().edition, model.id);
    assert.equal(host.session.getConfig().source, 'live');
    assert.equal(host.session.getConfig().autoDemo, false);
    assert.equal(host.session.getConfig().scale, 100);
    assert.equal(host.session.getConfig().offsetX, 0);
    assert.equal(host.session.getConfig().offsetY, 0);
    assert.ok(host.canvas.width > 0 && host.canvas.height > 0, model.id);
    assert.match(host.attributes.get('aria-label'), /现在显示 \d\d:\d\d/);
    assert.ok(Number.parseFloat(host.canvas.style.width) <= host.viewport.clientWidth, model.id);
    assert.ok(Number.parseFloat(host.canvas.style.height) <= host.viewport.clientHeight, model.id);
  }
  host.listeners.pagehide();
  assert.equal(host.pending.size, 0);
  assert.equal(host.intervals.size, 0);
});

test('Android suspends animation while invisible, settles on resume, caps frames and cleans up', () => {
  const host = androidRuntime(), { sandbox } = host;
  for (const fps of [15, 30]) {
    sandbox.TimeformAndroid.suspend(true);
    sandbox.TimeformAndroid.update({ edition: 'amt72v-black', scale: 85, offsetX: 0, offsetY: 0, fps });
    sandbox.TimeformAndroid.suspend(false);
    sandbox.TimeformAndroid.replay();
    const scheduled = [...host.pending.values()];
    assert.ok(scheduled.length > 0);
    assert.ok(scheduled.every(timer => timer.delay >= 1000 / fps));
    sandbox.TimeformAndroid.suspend(true);
    assert.equal(host.session.renderer.getStats().paused, true);
    assert.equal(host.pending.size, 0);
    sandbox.TimeformAndroid.suspend(false);
    assert.equal(host.session.renderer.getStats().paused, false);
    assert.equal(host.session.renderer.getStats().animating, false);
  }
  host.listeners.pagehide();
  assert.equal(host.session.disposed, true);
  assert.equal(host.pending.size, 0);
  assert.equal(host.intervals.size, 0);
});

test('every edition fills portrait, landscape, square and tablet screens without distorting or clipping any dial', () => {
  const Fullscreen=require('../src/shared/borderless.js');
  const Spec=require('../src/core/presentation-config.js');
  for(const [width,height] of [[393,873],[320,1000],[873,393],[800,1200],[512,512],[200,180]]) for(const model of Spec.models) {
    const config=Spec.resolve({edition:model.id}).settings;
    const g=Fullscreen.geometry(model,width,height,config);
    const original=model.geometry(1080,1920,{...config,scale:100,padding:0,safeTop:0,safeBottom:0});
    assert.deepEqual([g.x,g.y,g.width,g.height,g.boardWidth,g.boardHeight],[0,0,width,height,width,height]);
    assert.equal(g.points.length,original.points.length);
    const ratio=g.points[0].radius/original.points[0].radius;
    for(let i=0;i<g.points.length;i++) {
      const p=g.points[i],o=original.points[i];
      assert.equal(p.i,o.i);
      assert.ok(p.x-p.radius>=0 && p.x+p.radius<=width && p.y-p.radius>=0 && p.y+p.radius<=height,model.id);
      assert.ok(Math.abs(p.radius/o.radius-ratio)<1e-8);
      assert.ok(Math.abs((p.x-g.points[0].x)-(o.x-original.points[0].x)*ratio)<1e-8);
      assert.ok(Math.abs((p.y-g.points[0].y)-(o.y-original.points[0].y)*ratio)<1e-8);
    }
  }
});

test('color edits keep the selected live clock and fullscreen geometry, and the application uses no visible text controls', () => {
  const host=androidRuntime();
  for (const model of host.sandbox.Timeform.PresentationConfig.models) {
    const config={edition:model.id,board:'#21444c',long:'#ffcc88',short:'#f6f4ef'};
    host.sandbox.TimeformAndroid.update(config);
    const session=host.session, renderer=session.renderer, geometry=renderer.getStats().geometry;
    assert.equal(session.getConfig().customColors,true);
    for(const key of ['board','long','short'])assert.equal(session.getConfig()[key],config[key]);
    assert.equal(host.viewport.style.background,config.board);
    host.sandbox.TimeformAndroid.update({...config,board:'#6d3340'});
    assert.equal(session.renderer,renderer);
    assert.equal(session.renderer.getStats().geometry,geometry);
    assert.equal(host.viewport.style.background,'#6d3340');
  }
  const activity=read('android/app/src/main/java/com/timeform/wallpaper/MainActivity.java');
  assert.doesNotMatch(activity,/\b(?:TextView|EditText|SeekBar|Spinner|setText|drawText)\b/);
  assert.match(activity,/ClockThumbnailView/);
  host.listeners.pagehide();
});

test('Android catalog contains exactly the shared editions and declares no network or overlay permissions', () => {
  const catalog = JSON.parse(read('android/app/src/main/assets/editions.json'));
  const Spec = require('../src/core/presentation-config.js');
  assert.deepEqual(catalog.map(entry => entry.id), Spec.models.map(model => model.id));
  assert.equal(catalog.filter(entry => entry.category === 'portrait').length, 4);
  const manifest = read('android/app/src/main/AndroidManifest.xml');
  assert.doesNotMatch(manifest, /android.permission.(?:INTERNET|SYSTEM_ALERT_WINDOW|MANAGE_EXTERNAL_STORAGE)/);
  assert.match(manifest, /android.permission.BIND_WALLPAPER/);
  const html = read('android/app/src/main/assets/index.html');
  assert.doesNotMatch(html, /(?:src|href)=["']https?:/);
});
