'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const Classic = require('../src/web/classic.js');
const Time = require('../src/shared/time.js');
const models = ['circular', 'landscape', 'portrait']
  .flatMap(kind => Classic.catalog(require('../src/models/' + kind + '.js')).models)
  .filter(model => model.Settings.fields.visibility);
const choices = model => model.Settings.fields.choreography?.options.map(([id]) => id) || [undefined];
const near = (a, b, label) => assert.ok(Math.abs(a - b) < 1e-8, `${label}: ${a} versus ${b}`);
const snapshot = clock => clock.hands.map(({ angle, opacity }) => ({ angle, opacity }));
const dialUsed = (pose, i) => pose[i].used || pose[i ^ 1].used;
function paired(clock, label) {
  clock.hands.forEach((hand, i) => near(hand.opacity, clock.hands[i ^ 1].opacity, label + ' paired opacity'));
}
function continuous(clock, now, before, label) {
  clock.sample(now);
  clock.hands.forEach((hand, i) => {
    near(hand.angle, before[i].angle, label + ' angle');
    near(hand.opacity, before[i].opacity, label + ' opacity');
  });
  paired(clock, label);
}

test('only wholly idle dials reveal and fade, with both arms sharing their complete movement window', () => {
  for (const model of models) for (const choreography of choices(model)) {
    for (const visibility of ['hide', 'ghost']) for (const duration of [1, model.Settings.defaults.duration, 120]) {
      const label = `${model.id}/${choreography}/${visibility}/${duration}`;
      const clock = model.create({ visibility, duration, choreography });
      clock.initialize(754, 100); const initial = snapshot(clock);
      clock.animate(755, 100);
      const idleAlpha = visibility === 'ghost' ? .12 : 0;
      const idle = clock.hands.map((hand, i) => !dialUsed(clock.hands, i) ? i : -1).filter(i => i >= 0 && i % 2 === 0);
      assert.ok(idle.length, label + ' has unused digit/decorative hands');
      for (const i of idle) {
        const hand = clock.hands[i];
        assert.ok(hand.revealStart >= 100 && hand.revealEnd > hand.revealStart, label + ' entry phase');
        assert.ok(hand.fadeStart >= hand.revealEnd && hand.fadeStart < hand.fadeEnd, label + ' return phase');
        const partner = clock.hands[i ^ 1];
        near(hand.fadeEnd, Math.max(hand.motionEnd, partner.motionEnd), label + ' fade ends when both arms arrive');
        if (initial[i].opacity < 1) {
          clock.sample((100 + hand.revealStart) / 2);
          near(hand.opacity, initial[i].opacity, label + ' waiting for local departure');
          near(hand.angle, initial[i].angle, label + ' no opacity lead before movement');
          near(partner.angle, initial[i ^ 1].angle, label + ' partner still waiting');
          clock.sample((hand.revealStart + hand.revealEnd) / 2);
          assert.ok(hand.opacity > idleAlpha && hand.opacity < 1, label + ' gradually revealed during entry');
          assert.ok(Math.abs(hand.angle-initial[i].angle)>1e-10 || Math.abs(partner.angle-initial[i ^ 1].angle)>1e-10, label + ' reveal overlaps pair movement');
        }
        clock.sample((hand.revealEnd + hand.fadeStart) / 2);
        near(hand.opacity, 1, label + ' visible during pattern');
        const middle = (hand.fadeStart + hand.fadeEnd) / 2;
        clock.sample(middle);
        paired(clock, label);
        const movingAngle = hand.angle, movingPartnerAngle = partner.angle;
        assert.ok(hand.opacity > idleAlpha && hand.opacity < 1, label + ' fade overlaps return');
        clock.sample(hand.fadeEnd);
        near(hand.opacity, idleAlpha, label + ' settled opacity');
        // The opacity is already final on the exact frame that the motor stops.
        assert.ok(Math.abs(hand.angle - movingAngle) > 1e-10 || Math.abs(partner.angle - movingPartnerAngle) > 1e-10, label + ' returning pair actually moves');
        const stopped = snapshot(clock)[i]; clock.sample(100 + duration * 1000 + 1000);
        near(hand.opacity, stopped.opacity, label + ' no trailing fade');
      }
      assert.equal(clock.isAnimating(100 + duration * 1000 + 1000), false, label);
    }
  }
});

test('folded digit strokes stay fully visible through replays in hide and ghost modes', () => {
  let folded = 0;
  for (const model of models) for (const choreography of choices(model)) for (const visibility of ['hide', 'ghost']) {
    const clock = model.create({ visibility, choreography });
    for (const minutes of [574, 671, 755, 488]) {
      clock.initialize(minutes, 0);
      const pose = model.digitPose(model.displayDigits(minutes));
      clock.hands.forEach((hand, i) => {
        if (dialUsed(pose, i)) near(hand.opacity, 1, model.id + ' both arms of reading dial');
        if (!pose[i].used && pose[i ^ 1].used) folded++;
      });
      clock.animate(minutes, 0, true);
      for (const fraction of [0, .04, .3, .5, .85, .99, 1]) {
        clock.sample(clock.state.duration * 1000 * fraction);
        paired(clock, model.id);
        clock.hands.forEach((hand, i) => {
          if (dialUsed(pose, i)) near(hand.opacity, 1, model.id + ' folded/active dial stays opaque');
        });
      }
    }
  }
  assert.ok(folded > 0, 'covers arms marked unused only because the digit folds them together');
});

test('target edits, replays and visibility edits carry the current alpha through every action phase', () => {
  for (const model of models) for (const choreography of choices(model)) {
    for (const fraction of [.04, .5, .87, .997]) for (const operation of ['retarget', 'animate', 'visibility']) {
      const clock = model.create({ visibility: 'hide', choreography });
      const duration = clock.state.duration * 1000, now = duration * fraction;
      clock.initialize(574, 0); clock.animate(575, 0); clock.sample(now);
      const before = snapshot(clock), label = `${model.id}/${choreography}/${fraction}/${operation}`;
      if (operation === 'visibility') clock.setVisibility('ghost', now);
      else clock[operation](71, now, true);
      continuous(clock, now, before, label);
      // Repeat at the same playback time, as a paused renderer does.
      continuous(clock, now, before, label + ' paused');
      if (operation !== 'animate') clock.hands.forEach(hand => {
        const i = clock.hands.indexOf(hand), end = Math.max(hand.motionEnd, clock.hands[i ^ 1].motionEnd);
        if (now < end) assert.ok(hand.fadeEnd <= end, label + ' remaining pair movement owns fade');
      });
      clock.sample(duration * 3 + 1000);
      const pose = model.digitPose(model.displayDigits(operation === 'visibility' ? 575 : 71));
      clock.hands.forEach((hand, i) => near(hand.opacity, dialUsed(pose, i) ? 1 : operation === 'visibility' ? .12 : 0, label + ' final'));
      paired(clock, label + ' final');
    }
  }
});

test('switching shared actions during a fade starts from the displayed angle and opacity', () => {
  for (const model of models) {
    const actions = choices(model); if (actions.length < 2) continue;
    for (const action of actions) {
      const clock = model.create({ visibility: 'hide' });
      clock.initialize(574, 0); clock.animate(575, 0);
      const now = clock.state.duration * 870; clock.sample(now); const before = snapshot(clock);
      clock.update({ choreography: action }, now); clock.animate(575, now, true);
      continuous(clock, now, before, model.id + '/' + action);
    }
  }
});

test('paused steps and playback speed drive opacity and motors through the same timeline', () => {
  const model = models.find(model => model.id === 'clockclock24');
  const clock = model.create({ visibility: 'hide' });
  let wall = 0; const playback = Time.createPlayback(() => wall);
  clock.initialize(754, 0); clock.animate(755, 0);
  const hand = clock.hands.find((hand, i) => !dialUsed(clock.hands, i)), middle = (hand.fadeStart + hand.fadeEnd) / 2;
  playback.setSpeed(2); wall = middle / 2; clock.sample(playback.now());
  assert.ok(hand.opacity > 0 && hand.opacity < 1);
  playback.setPaused(true); const paused = snapshot(clock); wall += 10000;
  continuous(clock, playback.now(), paused, 'paused fade');
  playback.step(100); clock.sample(playback.now()); assert.ok(hand.opacity < paused[clock.hands.indexOf(hand)].opacity);
  playback.setSpeed(.5); playback.setPaused(false); wall += (hand.fadeEnd - playback.now()) * 2;
  clock.sample(playback.now()); near(hand.opacity, 0, 'speed-scaled arrival');
});
