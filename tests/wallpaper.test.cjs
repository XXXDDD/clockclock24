'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const Spec = require('../wallpaper/src/config.js');
const Zip = require('../wallpaper/src/zip.js');

test('Lively numeric dropdowns and booleans decode without resetting unrelated settings', () => {
  const colors = Spec.normalize({ board: '#123456', long: '#abcdef', duration: 7 });
  const changed = Spec.normalize({ layout: 2, motion: '1', visibility: 1, format24: 'false' }, colors);
  assert.equal(changed.layout, 'portrait'); assert.equal(changed.motion, 'quiet'); assert.equal(changed.visibility, 'ghost');
  assert.equal(changed.format24, false); assert.equal(changed.board, '#123456'); assert.equal(changed.long, '#abcdef'); assert.equal(changed.duration, 7);
  assert.deepEqual(Spec.normalize({ board: '<script>', scale: 'NaN', format24: 'bad', motion: 99, timezone: 'not/a/zone' }, colors), colors);
});

test('colors remain independent and pointer lengths stay physically valid', () => {
  const next = Spec.normalize({ background: '#223344', short: '#778899', longLength: 75, shortLength: 100 });
  assert.equal(next.board, '#111213'); assert.equal(next.long, '#f9faf7'); assert.equal(next.background, '#223344');
  assert.equal(next.short, '#778899'); assert.equal(next.shortLength, 75);
});

test('all configuration fields survive JSON and URL transfer, with no private screen identity', () => {
  const config = Spec.normalize({ ...Spec.presets[4], layout: 'portrait', motion: 'quiet', visibility: 'ghost', timezone: 'Asia/Hong_Kong', scale: 71, padding: 30, offsetX: -27, offsetY: 55, format24: false });
  assert.deepEqual(Spec.importConfig(Spec.exportConfig(config)), config);
  assert.deepEqual(Spec.normalize(Spec.fromSearch(Spec.toSearch(config))), config);
  assert.deepEqual(Spec.normalize(Spec.fromSearch(Spec.toSearch(Spec.defaults, config)), config), Spec.defaults);
  const json = JSON.parse(Spec.exportConfig(config)); assert.equal(json.version, 1); assert.deepEqual(Object.keys(json.settings), Object.keys(Spec.fields));
  assert.throws(() => Spec.importConfig('{"version":9,"settings":{}}'));
  assert.throws(() => Spec.importConfig('{"version":1,"settings":{"timezone":"bad/zone"}}'));
});

test('Lively schema defaults rehydrate to exactly the portable wallpaper configuration', () => {
  const config = Spec.normalize({ ...Spec.presets[6], scale: 63, motion: 'none', layout: 'portrait', timezone: 'Europe/London' });
  const properties = Spec.livelyProperties(config);
  assert.deepEqual(Spec.normalize(Object.fromEntries(Object.entries(properties).map(([key, value]) => [key, value.value]))), config);
  assert.ok(Object.values(properties).every(field => !Object.hasOwn(field, 'group') && !Object.hasOwn(field, 'values')));
});

test('full clock stays inside all display shapes at extreme sizes, padding and offsets', () => {
  for (const [width, height] of [[1920,1080],[2560,1440],[3840,2160],[3440,1440],[5120,1440],[1080,1920],[1280,1024],[800,800],[320,568],[1,1]]) {
    for (const layout of ['auto','portrait','landscape']) for (const scale of [20,90,100]) for (const offsetX of [-100,0,100]) for (const offsetY of [-100,100]) {
      const box = Spec.geometry(width, height, { layout, scale, padding: 160, offsetX, offsetY });
      assert.ok(box.x >= box.padding - 1e-8 && box.y >= box.padding - 1e-8);
      assert.ok(box.x + box.width <= width - box.padding + 1e-8 && box.y + box.height <= height - box.padding + 1e-8);
      assert.equal(box.points.length, 24); assert.equal(new Set(box.points.map(p => p.i)).size, 24);
      for (const point of box.points) { assert.ok(point.x-54>0 && point.x+54<box.boardWidth); assert.ok(point.y-54>0 && point.y+54<box.boardHeight); }
    }
  }
  assert.equal(Spec.geometry(1920,1080).layout, 'landscape'); assert.equal(Spec.geometry(1080,1920).layout, 'portrait');
});

function clockHarness(initial = {}) {
  let now = 1000, dateNow = Date.parse('2026-10-13T10:58:58+08:00'), nextFrame = 1;
  const frames = new Map(), listeners = new Map(); let interval;
  const context = new Proxy({}, { get: (_, key) => key.startsWith('create') ? () => ({ addColorStop() {} }) : () => {} });
  const canvas = () => ({ style: {}, width: 1, height: 1, getContext: () => context, setAttribute() {} });
  class ClockDate extends Date { constructor(...args) { super(...(args.length ? args : [dateNow])); } }
  const sandbox = {
    TimeformSettings: Spec, Date: ClockDate, Intl, performance: { now: () => now },
    document: { hidden: false, createElement: canvas, addEventListener: (name, fn) => listeners.set(name, fn), removeEventListener: name => listeners.delete(name) },
    window: { matchMedia: () => ({ matches: false }), devicePixelRatio: 2 },
    requestAnimationFrame: fn => { const id = nextFrame++; frames.set(id, fn); return id; }, cancelAnimationFrame: id => frames.delete(id),
    setInterval: fn => { interval = fn; return 1; }, clearInterval() {}
  };
  let source = fs.readFileSync(path.join(__dirname, '../wallpaper/src/renderer.js'), 'utf8');
  source = source.replace('return {update,resize,thumbnail,', 'return {testHands:hands,testState:state,update,resize,thumbnail,');
  vm.runInNewContext(source, sandbox);
  const engine = sandbox.TimeformRenderer.create(canvas(), { ...initial, timezone: 'Asia/Hong_Kong' }, () => ({ width:1920,height:1080 }));
  return { engine, sandbox, frames, tick: () => interval(), setDate: value => { dateNow=value; }, flush(value) { now=value; const pending=[...frames.values()];frames.clear();pending.forEach(fn=>fn(now)); }, resume() { listeners.get('visibilitychange')(); } };
}

test('renderer stops rendering when idle and commits the exact final animation frame', () => {
  const c = clockHarness(); c.flush(1000); assert.equal(c.frames.size,0);
  const initialFrames = c.engine.getStats().frameCount;
  for(let n=0;n<10;n++){c.tick();c.flush(1000+n*1000);} assert.equal(c.engine.getStats().frameCount,initialFrames);
  c.setDate(Date.parse('2026-10-13T10:59:00+08:00'));c.tick();c.flush(11100);c.flush(15100);
  assert.equal(c.engine.getStats().display,'1059'); assert.equal(c.frames.size,0);
  assert.ok(c.engine.testHands.every(h=>Math.abs(h.opacity-(h.used?1:0))<1e-8));
  const settled=c.engine.getStats().frameCount;c.tick();c.flush(16000);assert.equal(c.engine.getStats().frameCount,settled);
});

test('hidden wallpaper resumes at the correct time and none mode updates immediately', () => {
  const c=clockHarness({motion:'none'});c.flush(1000);c.sandbox.document.hidden=true;c.resume();
  c.setDate(Date.parse('2026-10-13T12:01:00+08:00'));c.tick();assert.equal(c.engine.getStats().display,'1058');
  c.sandbox.document.hidden=false;c.resume();c.flush(2000);assert.equal(c.engine.getStats().display,'1201');assert.equal(c.frames.size,0);
  c.engine.update({timezone:'Europe/London',format24:false});c.flush(3000);assert.equal(c.engine.getStats().display,'0501');
});

test('portable ZIP contains root-level files, UTF-8 names, independent checksums and deterministic bytes', () => {
  assert.equal(Zip.crc32(new TextEncoder().encode('123456789')),0xcbf43926);
  const files={'index.html':'<!doctype html>\n时钟','LivelyInfo.json':'{"Type":1}','LivelyProperties.json':'{}','thumbnail.jpg':new Uint8Array([255,216,255,217])};
  const bytes=Zip.create(files);assert.deepEqual(Zip.create(files),bytes);const data=Buffer.from(bytes);
  let offset=0;
  for(const [name,content] of Object.entries(files)) {
    assert.equal(data.readUInt32LE(offset),0x04034b50);assert.equal(data.readUInt16LE(offset+6),0x800);
    const size=data.readUInt32LE(offset+18),nameLength=data.readUInt16LE(offset+26),filename=data.subarray(offset+30,offset+30+nameLength).toString('utf8');
    assert.equal(filename,name);const actual=data.subarray(offset+30+nameLength,offset+30+nameLength+size);assert.deepEqual(actual,Buffer.from(content));offset+=30+nameLength+size;
  }
  assert.equal(data.readUInt32LE(offset),0x02014b50);assert.equal(data.readUInt32LE(data.length-22),0x06054b50);
  assert.throws(()=>Zip.create({'../escape':'bad'}));
});
