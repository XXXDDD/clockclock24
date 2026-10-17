(function (root, factory) {
  const commonJS = typeof module === 'object' && module.exports;
  const api = factory(commonJS ? require('../../shared/math.js') : root.Timeform.Math,
    commonJS ? require('../../shared/hand-animation.js') : root.Timeform.HandAnimation);
  if (commonJS) module.exports = api;
  else (root.Timeform ||= {}).ClockClock24Animation = api;
})(globalThis, function (Maths, HandAnimation) {
  'use strict';
  const { TAU, wrap, clamp, smooth } = Maths;
  const referenceDuration = 40.08;
  const shortest = value => Math.atan2(Math.sin(value), Math.cos(value));
  const radians = value => value * Math.PI / 180;
  // One shared wave, measured from the rightmost column of the frontal clip.
  // Values describe an unwrapped straight line, not motor identities.
  const checkpoints = [[0, 0], [.5, 1.8], [1.5, 20.9], [2.5, 51.8], [3.5, 89.4],
    [4.5, 131.4], [5.5, 176.3], [6.5, 221], [7.5, 265.2], [8.5, 308.4],
    [9.5, 349.7], [10.5, 386], [11.5, 418.4], [12.5, 449.2], [13.5, 479.5],
    [14.5, 509.8], [15.5, 540.6], [16.5, 570.8]];
  const secants = checkpoints.slice(1).map(([t, a], i) => (a - checkpoints[i][1]) / (t - checkpoints[i][0]));
  const slopes = checkpoints.map((_, i) => i === 0 ? 0 : i === checkpoints.length - 1 ? 30.2
    : 2 / (1 / secants[i - 1] + 1 / secants[i]));
  function hermite(from, to, v0, v1, start, end, now) {
    const duration = end - start, u = clamp((now - start) / duration, 0, 1), u2 = u * u, u3 = u2 * u;
    return { angle: from + (to - from) * (3 * u2 - 2 * u3)
      + duration * (v0 * (u3 - 2 * u2 + u) + v1 * (u3 - u2)),
    velocity: (to - from) * 6 * u * (1 - u) / duration
      + v0 * (3 * u2 - 4 * u + 1) + v1 * (3 * u2 - 2 * u) };
  }
  function waveAt(seconds) {
    if (seconds <= 0) return { angle: 0, velocity: 0 };
    const last = checkpoints.length - 1;
    if (seconds >= checkpoints[last][0]) return { angle: radians(checkpoints[last][1] + (seconds - checkpoints[last][0]) * slopes[last]), velocity: radians(slopes[last]) };
    const i = checkpoints.findIndex(point => point[0] > seconds) - 1;
    const value = hermite(checkpoints[i][1], checkpoints[i + 1][1], slopes[i], slopes[i + 1], checkpoints[i][0], checkpoints[i + 1][0], seconds);
    return { angle: radians(value.angle), velocity: radians(value.velocity) };
  }
  function returnTrack(from, velocity, target, start, end) {
    const duration = end - start;
    let travel = wrap(target - from);
    if (travel > TAU - 1e-8) travel = 0;
    // Positive Bezier velocity controls prevent reversal. Pick a lap count
    // near the current cruising speed instead of adding one lap to every arm.
    const desired = Math.max(0, velocity) * duration * .86;
    while (travel + 1e-8 < Math.max(0, velocity) * duration / 3 || travel + TAU / 2 < desired) travel += TAU;
    return { from, to: from + travel, velocity, start, end };
  }
  function trackAt(track, now) {
    if (now >= track.end) return { angle: track.to, velocity: 0 };
    return hermite(track.from, track.to, track.velocity, 0, track.start, track.end, now);
  }
  function create(spec, initial, options = {}) {
    const timing = spec.motionProfile || {};
    const hold = timing.entryHold || 0;
    const fallback = HandAnimation.create({ ...spec, handCount: 48 }, initial, options);
    const { state, hands } = fallback;
    let sequence = null;
    const idleOpacity = hand => hand.used || state.visibility === 'show' ? 1 : state.visibility === 'ghost' ? .12 : 0;
    const active = now => sequence && now < sequence.finish;
    function motorAt(motor, now) {
      if (motor.direct) return trackAt(motor.forming, now);
      if (now < motor.alignStart) return { angle: motor.from, velocity: 0 };
      if (now < motor.alignEnd) return hermite(motor.from, motor.aligned, motor.entryVelocity, 0, motor.alignStart, motor.alignEnd, now);
      if (now < motor.waveStart) return { angle: motor.aligned, velocity: 0 };
      if (now < motor.formStart) {
        const value = waveAt((now - motor.waveStart) / sequence.unit);
        return { angle: motor.aligned + value.angle, velocity: value.velocity / sequence.unit };
      }
      return trackAt(motor.forming, now);
    }
    function sample(now) {
      if (!sequence) return fallback.sample(now);
      sequence.motors.forEach((motor, index) => {
        const hand = hands[index]; hand.angle = motorAt(motor, now).angle;
        hand.opacity = now < hand.revealEnd
          ? hand.revealFrom + (1 - hand.revealFrom) * smooth(clamp((now - hand.revealStart) / (hand.revealEnd - hand.revealStart), 0, 1))
          : now < hand.fadeStart ? 1
            : hand.fadeFrom + (hand.fadeTo - hand.fadeFrom) * smooth(clamp((now - hand.fadeStart) / Math.max(1, hand.fadeEnd - hand.fadeStart), 0, 1));
      });
      return hands;
    }
    function freeze(now) {
      sample(now); sequence = null;
      hands.forEach(hand => Object.assign(hand, { from: hand.angle, to: hand.angle, path: null,
        start: now, duration: 1, motionEnd: now, revealFrom: hand.opacity, travelOpacity: hand.opacity,
        revealStart: now, revealEnd: now, fadeFrom: hand.opacity, fadeTo: hand.opacity, fadeStart: now, fadeEnd: now }));
    }
    function initialize(minutes, now) { sequence = null; fallback.initialize(minutes, now); }
    function publish(target, minutes) {
      sequence.motors.forEach((motor, index) => {
        const hand = hands[index]; hand.used = target[index].used;
        hand.to = motor.forming.to; hand.motionEnd = motor.forming.end;
        hand.fadeStart = motor.forming.end; hand.fadeEnd = sequence.finish;
        hand.fadeFrom = 1; hand.fadeTo = idleOpacity(hand);
      });
      state.minuteKey = spec.displayDigits(minutes, state.format24);
    }
    function plan(minutes, now) {
      sample(now);
      const current = hands.map((hand, index) => ({ angle: hand.angle, opacity: hand.opacity,
        velocity: sequence ? motorAt(sequence.motors[index], now).velocity : 0 }));
      const target = spec.digitPose(spec.displayDigits(minutes, state.format24));
      const duration = state.duration * 1000, unit = duration / (timing.referenceDuration || referenceDuration);
      const start = now + hold * unit;
      sequence = { start: now, finish: now + duration, unit, motors: [] };
      sequence.motors = hands.map((hand, index) => {
        const cell = Math.floor(index / 2), col = cell % 8, row = Math.floor(cell / 8), lane = index % 2;
        // Lane identity is a reconstruction; the clip only identifies the pair.
        const reverse = (col === 5 || row === 1) ? 1 : 0;
        const common = radians((lane ^ reverse) ? 135 : 315);
        const aligned = current[index].angle + shortest(common - current[index].angle);
        const delay = (7 - col) * .34 + row * .06;
        const alignStart = start + (.45 + delay) * unit;
        const alignEnd = start + (5.25 + delay) * unit;
        const waveStart = start + ((timing.waveStart ?? 8.5) + (7 - col) * .4) * unit;
        const formStart = start + ((timing.formStart ?? 25.2) + (7 - col) * .4 + row * .1) * unit;
        const finish = start + ((timing.finish ?? 39.45) + ((index * 7) % 17) / 16 * .35) * unit;
        const wave = waveAt((formStart - waveStart) / unit);
        const motor = { from: current[index].angle, aligned, alignStart, alignEnd, waveStart, formStart,
          entryVelocity: current[index].velocity, forming: returnTrack(aligned + wave.angle, wave.velocity / unit, target[index].angle, formStart, finish) };
        // An interrupted performance must carry its current velocity immediately.
        if (Math.abs(current[index].velocity) > 1e-10) { motor.alignStart = now; motor.alignEnd = now + 7.8 * unit; }
        Object.assign(hand, { from: current[index].angle, start: now, duration, path: null,
          revealFrom: current[index].opacity, revealStart: now, revealEnd: now + Math.min(250, duration * .02), opacity: current[index].opacity });
        return motor;
      });
      publish(target, minutes);
    }
    function animate(minutes, now, force = false) {
      const digits = spec.displayDigits(minutes, state.format24);
      if (!force && digits === state.minuteKey) return false;
      if (force && state.motion === 'quiet' && digits === state.minuteKey) return false;
      if (state.motion === 'none') { initialize(minutes, now); return true; }
      if (state.motion !== 'wave' || options.reducedMotion) { freeze(now); return fallback.animate(minutes, now, force); }
      plan(minutes, now); return true;
    }
    function retarget(minutes, now) {
      if (!active(now)) return animate(minutes, now);
      const digits = spec.displayDigits(minutes, state.format24);
      if (digits === state.minuteKey) return false;
      sample(now);
      const target = spec.digitPose(digits);
      const opacity = hands.map(hand => hand.opacity);
      // Never restart a wave at a real minute boundary. If forming has begun,
      // only replan the remaining positive arc from this exact sampled state.
      const minimum = 350;
      sequence.motors.forEach((motor, index) => {
        if (now >= motor.formStart || motor.direct) {
          const value = motorAt(motor, now);
          const end = Math.max(motor.forming.end, now + minimum);
          motor.forming = returnTrack(value.angle, value.velocity, target[index].angle, now, end);
          motor.direct = true; sequence.finish = Math.max(sequence.finish, end + 80);
        } else {
          const track = motor.forming;
          motor.forming = returnTrack(track.from, track.velocity, target[index].angle, track.start, track.end);
        }
      });
      publish(target, minutes);
      hands.forEach((hand, index) => Object.assign(hand, { revealFrom: opacity[index], revealStart: now,
        revealEnd: Math.min(hand.motionEnd, now + 80) }));
      return true;
    }
    function setVisibility(mode, now) {
      if (!sequence) return fallback.setVisibility(mode, now);
      if (mode === state.visibility) return;
      sample(now); state.visibility = mode;
      hands.forEach(hand => {
        if (now < hand.fadeStart) hand.fadeTo = idleOpacity(hand);
        else {
          hand.fadeFrom = hand.opacity; hand.fadeTo = idleOpacity(hand);
          hand.fadeStart = now; hand.fadeEnd = now + (options.reducedMotion ? 150 : 350);
        }
      });
    }
    function update(config, now) {
      const next = spec.Settings.normalize(config, state), visibility = next.visibility;
      const reformat = next.format24 !== state.format24;
      Object.assign(state, next, { visibility: state.visibility });
      setVisibility(visibility, now); return { reformat };
    }
    function getStage(now) {
      if (!active(now)) return '';
      const t = (now - sequence.start) / sequence.unit;
      return t < 7.8 ? '逐列整理' : t < 8.5 ? '斜线停留' : t < 25.2 ? '列波流动' : t < 39.8 ? '逐针成型' : '读时停留';
    }
    return { state, hands, sample, initialize, animate, retarget, setVisibility, update, getStage,
      isAnimating: now => Boolean(active(now)) || hands.some(hand => now < hand.fadeEnd) };
  }
  return { create, waveAt, referenceDuration };
});
