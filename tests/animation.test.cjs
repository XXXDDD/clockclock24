const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

// Exercise the actual inline animation code without a browser or dependencies.
// The small DOM stand-in lets the page initialize; checks concern motion and alpha.
function loadClock({ reducedMotion = false, saved = null, canvasFactory = null } = {}) {
  let now = 1000;
  let storage = saved ? JSON.stringify(saved) : null;
  const elements = new Map();
  const context = new Proxy({}, {
    get(target, key) {
      if (key in target) return target[key];
      if (key === 'createLinearGradient' || key === 'createRadialGradient') return () => ({ addColorStop() {} });
      return () => {};
    }
  });
  function element(tagName) {
    const attrs = new Map();
    const node = {
      dataset: {}, style: {}, value: '', checked: false, hidden: false,
      classList: { add() {}, remove() {}, toggle() {} },
      addEventListener() {}, appendChild() {}, focus() {}, blur() {},
      setAttribute(key, value) { attrs.set(key, String(value)); },
      getAttribute(key) { return attrs.get(key) ?? null; },
      removeAttribute(key) { attrs.delete(key); },
      getContext() { return context; },
      getBoundingClientRect() { return { width: 1000, height: 445 }; }
    };
    if (tagName === 'canvas' && canvasFactory) {
      const canvas = canvasFactory(1000, 445);
      delete node.getContext;
      Object.assign(canvas, node);
      return canvas;
    }
    return node;
  }
  const document = {
    hidden: false,
    getElementById(id) { if (!elements.has(id)) elements.set(id, element(id === 'clock' ? 'canvas' : undefined)); return elements.get(id); },
    createElement: element,
    querySelector: element,
    querySelectorAll() { return []; },
    addEventListener() {}
  };
  const sandbox = {
    document, window: { matchMedia: () => ({ matches: reducedMotion }), addEventListener() {}, devicePixelRatio: 1 },
    performance: { now: () => now },
    localStorage: { getItem: () => storage, setItem: (_, value) => { storage = value; } },
    ResizeObserver: class { observe() {} },
    requestAnimationFrame: () => 1, cancelAnimationFrame() {},
    setInterval() {}, setTimeout: () => 1, clearTimeout() {}
  };
  const html = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8');
  const code = html.match(/<script>([\s\S]*?)<\/script>/)[1];
  const instrumented = code.replace(/\}\)\(\);\s*$/, `
    globalThis.clock = { state, hands, PRESETS, digitPose, interpolate, animate, initializeTime,
      setVisibility, applyPreset, setColor, scheme, advance, displayDigits, draw };
  })();`);
  vm.runInNewContext(instrumented, sandbox, { filename: 'clockclock24.html' });
  return { ...sandbox.clock, elements, at(value) { now = value; }, now: () => now };
}

const TAU = Math.PI * 2;
function near(actual, expected, message = '') {
  assert.ok(Math.abs(actual - expected) < 1e-8, `${message}: ${actual} versus ${expected}`);
}
function sameAngle(actual, expected) {
  near(Math.sin(actual), Math.sin(expected), 'needle orientation');
  near(Math.cos(actual), Math.cos(expected), 'needle orientation');
}
function snapshot(clock) {
  return clock.hands.map(h => ({ angle: h.angle, opacity: h.opacity }));
}
function continuous(clock, before) {
  clock.interpolate(clock.now());
  clock.hands.forEach((h, i) => { sameAngle(h.angle, before[i].angle); near(h.opacity, before[i].opacity, 'alpha at interruption'); });
}
function assertSettled(clock, minutes) {
  const pose = clock.digitPose(clock.displayDigits(minutes));
  clock.hands.forEach((h, i) => {
    sameAngle(h.angle, pose[i].angle);
    near(h.opacity, pose[i].used || clock.state.visibility === 'show' ? 1 : clock.state.visibility === 'ghost' ? .12 : 0, 'final alpha');
  });
}

test('classic black is the default; opening displays the time immediately', () => {
  const c = loadClock();
  assert.equal(c.state.preset, 'classic-black');
  assert.equal(c.state.material, 'black');
  assert.equal(c.state.longLength, 100);
  assert.equal(c.state.shortLength, 100);
  assert.equal(c.PRESETS.length, 8);
  assert.ok(c.PRESETS.some(p => p.id === 'classic-white'));
  assert.ok(c.hands.every(h => h.fadeEnd <= c.now()));
  assert.ok(c.hands.some(h => h.opacity === 1));
  c.draw(c.now()); // Both the material and hands can render on the first frame.
});

test('all 1440 minute poses settle correctly in both formats', () => {
  const c = loadClock();
  for (const format24 of [true, false]) {
    c.state.format24 = format24;
    for (let minute = 0; minute < 1440; minute++) {
      c.initializeTime(minute);
      c.interpolate(c.now() + 2);
      assertSettled(c, minute);
    }
  }
});

test('rotation holds opacity until arrival and finishes within the selected duration', () => {
  const c = loadClock();
  const times = [0, 65, 454, 808, 1239, 1439];
  for (const mode of ['spin', 'quiet']) for (const visibility of ['hide', 'ghost', 'show']) for (const duration of [1, 4, 10]) for (const minutes of times) {
    c.at(c.now() + 15000);
    Object.assign(c.state, { motion: mode, visibility, duration, format24: true });
    c.initializeTime((minutes + 37) % 1440);
    const start = c.now();
    const before = snapshot(c);
    c.animate(minutes);
    continuous(c, before);
    const end = start + duration * 1000;
    for (const h of c.hands) { near(h.fadeEnd, end, 'total duration'); assert.ok(h.fadeStart >= h.motionEnd); }
    for (const fraction of [.04, .15, .5, .9, .99, 1]) {
      c.interpolate(start + duration * 1000 * fraction);
      assert.ok(c.hands.every(h => Number.isFinite(h.angle) && h.opacity >= -1e-10 && h.opacity <= 1 + 1e-10));
    }
    const arrival = c.hands[0].motionEnd;
    c.interpolate(arrival - .001);
    if (mode === 'spin') for (const h of c.hands) near(h.opacity, 1, 'no fade while rotating');
    c.interpolate(arrival);
    const atArrival = snapshot(c);
    c.interpolate(end);
    assertSettled(c, minutes);
    c.hands.forEach((h, i) => sameAngle(h.angle, atArrival[i].angle));
  }
});

test('quiet transitions keep unchanged idle hands hidden or at 12%', () => {
  for (const visibility of ['hide', 'ghost']) {
    const c = loadClock();
    Object.assign(c.state, { motion: 'quiet', visibility, duration: 4 });
    c.initializeTime(1);
    const prior = c.hands.map(h => h.used);
    c.animate(2);
    const idle = c.hands.filter((h, i) => !prior[i] && !h.used);
    assert.ok(idle.length > 0);
    for (const elapsed of [0, 50, 160, 1500, 3650, 4000]) {
      c.interpolate(c.now() + elapsed);
      for (const h of idle) near(h.opacity, visibility === 'hide' ? 0 : .12, 'no idle flash');
    }
  }
});

test('rapid time changes and visibility changes preserve current angle and alpha', () => {
  const c = loadClock();
  c.initializeTime(0);
  c.animate(1);
  for (const elapsed of [1200, 2400, 3700, 3950]) {
    c.at(elapsed); c.interpolate(elapsed);
    let before = snapshot(c);
    c.animate(65 + elapsed % 10);
    continuous(c, before);
    for (const mode of ['show', 'ghost', 'hide']) {
      before = snapshot(c);
      c.setVisibility(mode);
      continuous(c, before);
    }
  }
  c.at(20000); c.interpolate(c.now());
  for (const mode of ['show', 'ghost', 'hide', 'show']) {
    const before = snapshot(c);
    c.setVisibility(mode); continuous(c, before);
    c.at(c.now() + 100); c.interpolate(c.now());
  }
  c.at(c.now() + 400); c.interpolate(c.now());
  assert.ok(c.hands.every(h => h.opacity === 1));
});

test('palette changes preserve motion, lengths, visibility and the running transition', () => {
  const c = loadClock();
  c.initializeTime(0); c.animate(1); c.at(2500); c.interpolate(c.now());
  Object.assign(c.state, { motion: 'quiet', visibility: 'ghost', duration: 6, longLength: 90, shortLength: 80 });
  for (const p of c.PRESETS) {
    const tracks = JSON.stringify(c.hands);
    c.applyPreset(p, false);
    assert.equal(JSON.stringify(c.hands), tracks);
    assert.equal(c.state.motion, 'quiet'); assert.equal(c.state.visibility, 'ghost');
    assert.equal(c.state.duration, 6); assert.equal(c.state.longLength, 90); assert.equal(c.state.shortLength, 80);
    c.draw(c.now());
  }
  c.applyPreset(c.PRESETS[0], false); c.setColor('long', '#ff9900');
  assert.equal(c.state.material, 'black');
  c.setColor('board', '#123456'); assert.equal(c.state.material, null);
});

test('old saved palettes migrate without losing custom colors', () => {
  const c = loadClock({ saved: { board: '#21444c', long: '#dfb977', short: '#9acaca', motion: 'wave', duration: 4, longLength: 100, shortLength: 94, visibility: 'ghost', format24: true, preset: null } });
  assert.equal(c.state.board, '#21444c'); assert.equal(c.state.short, '#9acaca');
  assert.equal(c.state.motion, 'spin'); assert.equal(c.state.visibility, 'ghost');
  c.initializeTime(1439); c.state.source = 'manual'; c.state.simulatedMinutes = 1439;
  c.advance(1); assert.equal(c.state.simulatedMinutes, 0);
  c.elements.get('reset').onclick();
  assert.equal(c.state.source, 'live'); assert.equal(c.state.preset, 'classic-black');
  assert.equal(c.state.shortLength, 100); assert.equal(c.state.visibility, 'hide');
});

test('reduced motion uses short, continuous transitions with no full rotations', () => {
  const c = loadClock({ reducedMotion: true });
  c.initializeTime(0);
  const before = snapshot(c);
  c.animate(1); continuous(c, before);
  for (const h of c.hands) { assert.ok(Math.abs(h.to - h.from) <= Math.PI + 1e-8); near(h.fadeEnd, c.now() + 300); }
  c.interpolate(c.now() + 300); assertSettled(c, 1);
});

module.exports = { loadClock };
