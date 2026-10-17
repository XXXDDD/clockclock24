(function (root, factory) {
  const commonJS = typeof module === 'object' && module.exports;
  const api = factory(commonJS ? require('../../shared/math.js') : root.Timeform.Math,
    commonJS ? require('../../shared/hand-animation.js') : root.Timeform.HandAnimation);
  if (commonJS) module.exports = api;
  else (root.Timeform ||= {}).AMT72vAnimation = api;
})(globalThis, function (Maths, HandAnimation) {
  'use strict';
  const { TAU, wrap, clamp, smooth } = Maths;
  const referenceDuration = 32.03203125, entryDuration = 6, fullDuration = referenceDuration + entryDuration;
  const rad = degrees => degrees * Math.PI / 180;
  const shortest = angle => Math.atan2(Math.sin(angle), Math.cos(angle));
  const columnOffsets = [0, 12.36, 24.46, 36.25, 48.51, 60.09].map(rad);
  const phaseKnots = [[0, 6.78], [2.002, 63.29], [4.004, 123.24], [6.006, 185.14],
    [8.008, 245.43], [10.01, 306.29], [12.012, 362.10], [14.014, 413.94], [16.016, 470.92]];
  const secants = phaseKnots.slice(1).map(([t, a], i) => (a - phaseKnots[i][1]) / (t - phaseKnots[i][0]));
  const slopes = phaseKnots.map((_, i) => i === 0 ? 26 : i === phaseKnots.length - 1 ? 29.5
    : 2 / (1 / secants[i - 1] + 1 / secants[i]));
  // Sparse per-cell reconstruction: departure time, glyph slow lane, fast tours,
  // slow braking shape, fast braking shape. No sampled motor stream is embedded.
  const lanes = [
    [16.0,0,1,2,0.65], [15.5,0,1,7.5,0.65], [15.0,0,1,7.5,0.65], [19.0,0,1,7.5,0.65], [13.0,0,1,4,0.65], [14.0,0,1,7.5,0.65],
    [17.0,0,1,2,1], [15.5,0,1,1,0.65], [16.0,1,1,2,1], [15.66,1,1,2,1], [20.0,0,0,4,0.65], [16.0,0,1,7.5,0.65],
    [16.0,1,1,1,0.65], [16.22,1,1,2,1], [16.0,1,1,1,1], [15.66,1,1,2,1], [15.379999999999999,0,1,2,1], [16.0,0,1,7.5,0.65],
    [16.5,0,1,2,1], [15.0,0,1,2,0.65], [15.94,1,1,2,1], [16.0,1,1,4,0.65], [14.5,1,1,7.5,0.65], [15.1,1,1,2,1],
    [17.0,0,1,2,1], [14.0,0,2,1,0.65], [16.5,0,1,4,1], [18.5,0,0,1,0.65], [15.379999999999999,0,1,2,1], [15.1,0,1,2,1],
    [17.0,0,1,1,1], [16.22,1,1,2,1], [16.5,0,1,4,1], [16.0,1,1,4,0.65], [15.379999999999999,1,1,2,1], [15.5,0,1,7.5,1],
    [20.0,1,0,1,0.65], [16.5,1,1,1,1], [16.5,1,1,1,1], [19.5,0,1,7.5,0.65], [15.379999999999999,1,1,2,1], [13.5,1,1,1,0.65],
    [16.5,1,1,2,1], [16.5,0,1,2,1], [16.0,1,1,1,1], [17.5,1,1,7.5,0.65], [15.379999999999999,1,1,2,1], [13.5,1,1,7.5,0.65],
    [20.0,0,0,2,0.65], [16.0,0,1,7.5,1], [15.94,1,1,2,1], [15.66,1,1,2,1], [15.379999999999999,1,1,2,1], [15.1,1,1,2,1],
    [17.0,0,1,1,1], [16.5,0,1,2,1], [16.0,1,1,1,1], [15.66,1,1,2,1], [15.379999999999999,1,1,2,1], [15.1,1,1,2,1],
    [20.0,0,0,4,0.65], [13.5,0,2,2,0.65], [15.94,0,1,2,1], [19.0,1,1,7.5,0.65], [15.379999999999999,1,1,2,1], [16.0,0,1,7.5,0.65],
    [17.0,0,1,1,1], [16.22,1,1,2,1], [16.0,1,1,7.5,1], [16.0,1,1,4,0.65], [13.0,1,1,4,1], [13.5,1,1,7.5,0.65]
  ];
  function hermite(from, to, v0, v1, start, end, now) {
    const duration = end - start, u = clamp((now - start) / duration, 0, 1), u2 = u * u, u3 = u2 * u;
    return { angle: from + (to - from) * (3 * u2 - 2 * u3)
      + duration * (v0 * (u3 - 2 * u2 + u) + v1 * (u3 - u2)),
    velocity: (to - from) * 6 * u * (1 - u) / duration
      + v0 * (3 * u2 - 4 * u + 1) + v1 * (3 * u2 - 2 * u) };
  }
  function phaseAt(seconds) {
    const last = phaseKnots.length - 1;
    if (seconds >= phaseKnots[last][0]) return { angle: rad(phaseKnots[last][1] + (seconds - phaseKnots[last][0]) * 29.5), velocity: rad(29.5) };
    const i = Math.max(0, phaseKnots.findIndex(k => k[0] > seconds) - 1);
    const value = hermite(phaseKnots[i][1], phaseKnots[i + 1][1], slopes[i], slopes[i + 1], phaseKnots[i][0], phaseKnots[i + 1][0], Math.max(0, seconds));
    return { angle: rad(value.angle), velocity: rad(value.velocity) };
  }
  function returnTrack(from, velocity, target, slow, start, end, power, tours = null) {
    const duration = end - start;
    if (slow) {
      const drift = velocity * duration / (power + 1);
      const to = from + drift + shortest(target - from - drift);
      return { from, to, velocity, slow, start, end, power, drift, correction: to - from - drift };
    }
    let travel = wrap(target - from);
    if (travel > TAU - 1e-8) travel = 0;
    if (tours !== null) travel += tours * TAU;
    const minimum = Math.max(0, velocity) * duration / (power + 2);
    while (travel < minimum - 1e-8) travel += TAU;
    const bump = (travel / duration - velocity / (power + 1)) * (power + 1) * (power + 2);
    return { from, to: from + travel, velocity, slow, start, end, power, bump };
  }
  function trackAt(track, now) {
    if (now >= track.end) return { angle: track.to, velocity: 0 };
    const duration = track.end - track.start, u = clamp((now - track.start) / duration, 0, 1);
    const tail = Math.pow(1 - u, track.power), integral = (1 - Math.pow(1 - u, track.power + 1)) / (track.power + 1);
    if (track.slow) return { angle: track.from + track.drift * (1 - Math.pow(1 - u, track.power + 1)) + track.correction * smooth(u),
      velocity: track.velocity * tail + track.correction * 6 * u * (1 - u) / duration };
    const bumpIntegral = integral - (1 - Math.pow(1 - u, track.power + 2)) / (track.power + 2);
    return { angle: track.from + duration * (track.velocity * integral + track.bump * bumpIntegral),
      velocity: (track.velocity + track.bump * u) * tail };
  }
  function create(spec, initial, options = {}) {
    const fallback = HandAnimation.create({ ...spec, handCount: 144 }, initial, options);
    const { state, hands } = fallback;
    let sequence = null;
    const active = now => sequence && now < sequence.finish;
    function motorAt(motor, now) {
      if (motor.direct) return trackAt(motor.forming, now);
      if (now < motor.alignStart) return { angle: motor.from, velocity: 0 };
      if (now < motor.waveStart) return hermite(motor.from, motor.aligned, motor.entryVelocity,
        phaseAt(0).velocity / sequence.unit, motor.alignStart, motor.waveStart, now);
      if (now < motor.formStart) {
        const phase = phaseAt((now - motor.waveStart) / sequence.unit);
        return { angle: motor.aligned + phase.angle - phaseAt(0).angle, velocity: phase.velocity / sequence.unit };
      }
      return trackAt(motor.forming, now);
    }
    function sample(now) {
      if (!sequence) return fallback.sample(now);
      sequence.motors.forEach((motor, i) => {
        const hand = hands[i]; hand.angle = motorAt(motor, now).angle;
        hand.opacity = HandAnimation.opacityAt(hand, now);
      });
      return hands;
    }
    function snapshot(now) {
      sample(now);
      return hands.map((hand, i) => {
        const u = clamp((now - hand.start) / hand.duration, 0, 1);
        return { angle: hand.angle, opacity: hand.opacity,
          velocity: sequence ? motorAt(sequence.motors[i], now).velocity : (hand.to - hand.from) * 6 * u * (1 - u) / hand.duration };
      });
    }
    function initialize(minutes, now) { sequence = null; fallback.initialize(minutes, now); }
    function freeze(now) {
      sample(now); sequence = null;
      hands.forEach(hand => Object.assign(hand, { from: hand.angle, to: hand.angle, path: null,
        start: now, duration: 1, motionEnd: now, revealFrom: hand.opacity, travelOpacity: hand.opacity,
        revealStart: now, revealEnd: now, fadeFrom: hand.opacity, fadeTo: hand.opacity, fadeStart: now, fadeEnd: now }));
    }
    function publish(target, minutes) {
      sequence.motors.forEach((motor, i) => {
        const hand = hands[i]; hand.used = target[i].used;
        hand.to = motor.forming.to; hand.motionEnd = motor.forming.end;
        hand.fadeTo = hand.used || state.visibility === 'show' ? 1 : state.visibility === 'ghost' ? .12 : 0;
      });
      state.minuteKey = spec.displayDigits(minutes, state.format24);
    }
    function makeReturn(motor, target, sequenceStart, entry, unit) {
      const wave = phaseAt(motor.departure);
      const start = sequenceStart + (entry + motor.departure) * unit;
      const from = motor.aligned + wave.angle - phaseAt(0).angle;
      // Small individual stopping differences preserve a clear final reading hold.
      const distance = Math.abs(shortest(target - from));
      const stop = motor.slow ? 31.45 + .4 * distance / Math.PI : 31.85 + .1 * distance / Math.PI;
      motor.formStart = start;
      motor.forming = returnTrack(from, wave.velocity / unit, target, motor.slow, start,
        sequenceStart + (entry + stop) * unit, motor.power, motor.slow ? null : motor.tours);
    }
    function plan(minutes, now, reference = false) {
      const current = snapshot(now), duration = state.duration * 1000;
      const unit = duration / (reference ? referenceDuration : fullDuration), entry = reference ? 0 : entryDuration;
      const target = spec.digitPose(spec.displayDigits(minutes, state.format24));
      sequence = { start: now, finish: now + duration, entry, unit, reference, motors: [] };
      sequence.motors = hands.map((hand, i) => {
        const cell = Math.floor(i / 2), col = cell % 6;
        const [departure, slowLane, tours, slowPower, fastPower] = lanes[cell];
        const slow = i % 2 === slowLane;
        const short = i % 2 !== spec.longLane({ i: cell * 2 });
        const heading = phaseAt(0).angle + columnOffsets[col] + (short ? 0 : Math.PI);
        const aligned = reference ? heading : current[i].angle + shortest(heading - current[i].angle);
        const waveStart = now + entry * unit;
        const motor = { from: reference ? heading : current[i].angle, aligned, waveStart,
          alignStart: reference || Math.abs(current[i].velocity) > 1e-10 ? now : now + col * .1 * unit,
          entryVelocity: current[i].velocity, slow, departure, tours, power: slow ? slowPower : fastPower };
        makeReturn(motor, target[i].angle, now, entry, unit);
        const entryMoves = Math.abs(motor.aligned - motor.from) > 1e-8 || Math.abs(motor.entryVelocity) > 1e-10;
        const revealStart = entryMoves ? motor.alignStart : motor.waveStart;
        const revealEnd = entryMoves ? motor.waveStart : motor.waveStart + (motor.formStart - motor.waveStart) * HandAnimation.stages.align;
        Object.assign(hand, { from: motor.from, start: now, duration, path: null,
          opacity: reference ? 1 : current[i].opacity, revealFrom: reference ? 1 : current[i].opacity,
          revealStart, revealEnd });
        hand.travelOpacity = 1; hand.fadeFrom = 1;
        hand.fadeStart = motor.forming.start; hand.fadeEnd = motor.forming.end;
        return motor;
      });
      publish(target, minutes); fallback.syncVisibility(); sample(now);
    }
    function animate(minutes, now, force = false) {
      const digits = spec.displayDigits(minutes, state.format24);
      if (!force && digits === state.minuteKey) return false;
      if (force && state.motion === 'quiet' && digits === state.minuteKey) return false;
      if (state.motion === 'none') { initialize(minutes, now); return true; }
      if (state.motion !== 'wave' || options.reducedMotion) { freeze(now); return fallback.animate(minutes, now, force); }
      plan(minutes, now); return true;
    }
    function playReference(minutes, now) {
      if (options.reducedMotion) return animate(minutes, now, true);
      plan(minutes, now, true); return true;
    }
    function retarget(minutes, now) {
      if (!active(now)) return animate(minutes, now);
      const digits = spec.displayDigits(minutes, state.format24);
      if (digits === state.minuteKey) return false;
      sample(now);
      const target = spec.digitPose(digits);
      sequence.motors.forEach((motor, i) => {
        if (motor.direct || now >= motor.formStart) {
          const current = motorAt(motor, now), end = Math.max(motor.forming.end, now + 350);
          motor.forming = returnTrack(current.angle, current.velocity, target[i].angle, motor.slow,
            now, end, motor.power);
          motor.direct = true; sequence.finish = Math.max(sequence.finish, end + 80);
        } else makeReturn(motor, target[i].angle, sequence.start, sequence.entry, sequence.unit);
      });
      publish(target, minutes);
      hands.forEach((hand, i) => fallback.retargetVisibility(hand, now, sequence.motors[i].forming.start, sequence.motors[i].forming.end));
      fallback.syncVisibility();
      return true;
    }
    function setVisibility(mode, now) {
      if (mode === state.visibility) return;
      sample(now); fallback.updateVisibility(mode, now);
    }
    function update(config, now) {
      const next = spec.Settings.normalize(config, state), visibility = next.visibility;
      const reformat = next.format24 !== state.format24;
      Object.assign(state, next, { visibility: state.visibility }); setVisibility(visibility, now); return { reformat };
    }
    function getStage(now) {
      if (!active(now)) return '';
      if (sequence.motors.some(motor => (motor.direct || now >= motor.formStart) && now < motor.forming.end)) return '双速逐针成型';
      if (now < sequence.start + sequence.entry * sequence.unit) return '拆字归队';
      return sequence.motors.every(motor => now >= motor.forming.end) ? '读时停留' : '列间相位旋转';
    }
    return { state, hands, initialize, sample, animate, playReference, retarget, update, setVisibility, getStage,
      isAnimating: now => Boolean(active(now)) || hands.some(hand => now < hand.fadeEnd) };
  }
  return { create, referenceDuration, fullDuration, phaseAt, columnOffsets };
});
