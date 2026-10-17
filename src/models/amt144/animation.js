(function (root, factory) {
  const commonJS = typeof module === 'object' && module.exports;
  const api = factory(commonJS ? require('../../shared/math.js') : root.Timeform.Math,
    commonJS ? require('../../shared/hand-animation.js') : root.Timeform.HandAnimation);
  if (commonJS) module.exports = api;
  else (root.Timeform ||= {}).AMT144Animation = api;
})(globalThis, function (Maths, HandAnimation) {
  'use strict';
  const { TAU, wrap, clamp, smooth } = Maths;
  const referenceDuration = 54.36;
  const shortest = value => Math.atan2(Math.sin(value), Math.cos(value));
  const rad = degrees => degrees * Math.PI / 180;
  // Observed left-column line orientations, unwrapped from the filmed 135°/315° pose.
  const waveKnots = [[0, 0], [1, 12.18], [2.04, 31.97], [3, 51.97], [4.04, 75.51],
    [5, 97.66], [6.04, 122.5], [7, 146.09], [8.04, 171.81], [9, 196.01],
    [10.04, 222.24], [11, 246.99], [12.04, 273.49], [13, 298.35], [14.04, 324.72],
    [15, 349.96], [16.04, 376.19], [17, 397.3], [18.04, 421.48], [19, 441.97],
    [20.04, 465.41], [21, 487.4], [22.04, 510.18], [23, 533.51], [24, 558.6]];
  const alignKnots = [[0, 0], [.24, .045], [.5, .10], [1, .18], [2, .40],
    [3, .65], [4, .865], [5, .985], [5.5, 1]];
  function hermite(from, to, v0, v1, start, end, now) {
    const duration = end - start, u = clamp((now - start) / duration, 0, 1), u2 = u * u, u3 = u2 * u;
    return { angle: from + (to - from) * (3 * u2 - 2 * u3)
      + duration * (v0 * (u3 - 2 * u2 + u) + v1 * (u3 - u2)),
    velocity: (to - from) * 6 * u * (1 - u) / duration
      + v0 * (3 * u2 - 4 * u + 1) + v1 * (3 * u2 - 2 * u) };
  }
  function curve(knots, finalSlope) {
    const secants = knots.slice(1).map(([t, a], i) => (a - knots[i][1]) / (t - knots[i][0]));
    const slopes = knots.map((_, i) => i === 0 ? 0 : i === knots.length - 1 ? finalSlope
      : 2 / (1 / secants[i - 1] + 1 / secants[i]));
    return seconds => {
      if (seconds <= 0) return { angle: 0, velocity: 0 };
      const last = knots.length - 1;
      if (seconds >= knots[last][0]) return { angle: knots[last][1] + (seconds - knots[last][0]) * finalSlope, velocity: finalSlope };
      const i = knots.findIndex(point => point[0] > seconds) - 1;
      return hermite(knots[i][1], knots[i + 1][1], slopes[i], slopes[i + 1], knots[i][0], knots[i + 1][0], seconds);
    };
  }
  const waveCurve = curve(waveKnots, 25.2), alignment = curve(alignKnots, 0);
  function waveAt(seconds) {
    const value = waveCurve(seconds);
    return { angle: rad(value.angle), velocity: rad(value.velocity) };
  }
  function returnTrack(from, velocity, target, slow, start, end, reference = false, power = .95) {
    const duration = end - start;
    if (slow) {
      const power = 7.5, drift = velocity * duration / (power + 1);
      const to = from + drift + shortest(target - from - drift);
      return { slow, from, to, velocity, start, end, power, drift, correction: to - from - drift };
    }
    let travel = wrap(target - from);
    if (travel > TAU - 1e-8) travel = 0;
    const desired = Math.max(0, velocity) * duration * .86;
    // The reference fast lane keeps a substantial clockwise tour. Late target
    // edits instead select a feasible remaining tour from the current speed.
    while (travel + 1e-8 < Math.max(reference ? TAU * .9 : 0, velocity * duration / (power + 2))
      || (!reference && travel + TAU / 2 < desired)) travel += TAU;
    const bump = (travel / duration - velocity / (power + 1)) * (power + 1) * (power + 2);
    return { slow, from, to: from + travel, velocity, start, end, power, bump };
  }
  function trackAt(track, now) {
    if (now >= track.end) return { angle: track.to, velocity: 0 };
    const duration = track.end - track.start, u = clamp((now - track.start) / duration, 0, 1);
    if (!track.slow) {
      const integral = (1 - Math.pow(1 - u, track.power + 1)) / (track.power + 1);
      const bumpIntegral = integral - (1 - Math.pow(1 - u, track.power + 2)) / (track.power + 2);
      return { angle: track.from + duration * (track.velocity * integral + track.bump * bumpIntegral),
        velocity: (track.velocity + track.bump * u) * Math.pow(1 - u, track.power) };
    }
    return { angle: track.from + track.drift * (1 - Math.pow(1 - u, track.power + 1)) + track.correction * smooth(u),
      velocity: track.velocity * Math.pow(1 - u, track.power) + track.correction * 6 * u * (1 - u) / duration };
  }
  // Fixed correspondence between glyph indices and the two motion lanes.
  // Reconstructed from unordered silhouettes; not physical motor identities.
  const reverseLanes = [
    '000000000000000000', '001111110010010000', '001000011011001000', '000000011001000000',
    '001100001011000000', '001010111001100100', '001010010010000000', '000000000000000000'
  ].join('').split('').map(Number);
  function create(spec, initial, options = {}) {
    const fallback = HandAnimation.create({ ...spec, handCount: 288 }, initial, options);
    const { state, hands } = fallback;
    const lanes = spec.reverseLanes || reverseLanes;
    let sequence = null;
    const active = now => sequence && now < sequence.finish;
    function motorAt(motor, now) {
      if (motor.direct) return trackAt(motor.forming, now);
      if (now < motor.alignStart) return { angle: motor.from, velocity: 0 };
      if (now < motor.alignEnd) {
        const progress = alignment((now - motor.alignStart) / motor.alignUnit);
        const duration = motor.alignEnd - motor.alignStart, u = clamp((now - motor.alignStart) / duration, 0, 1);
        return { angle: motor.from + (motor.aligned - motor.from) * progress.angle
            + motor.entryVelocity * duration * u * (1 - u) * (1 - u),
          velocity: (motor.aligned - motor.from) * progress.velocity / motor.alignUnit
            + motor.entryVelocity * (1 - 4 * u + 3 * u * u) };
      }
      if (now < motor.waveStart) return { angle: motor.aligned, velocity: 0 };
      if (now < motor.formStart) {
        const wave = waveAt((now - motor.waveStart) / sequence.unit);
        return { angle: motor.aligned + wave.angle, velocity: wave.velocity / sequence.unit };
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
    function plan(minutes, now) {
      const current = snapshot(now), duration = state.duration * 1000, unit = duration / referenceDuration;
      const target = spec.digitPose(spec.displayDigits(minutes, state.format24));
      sequence = { start: now, finish: now + duration, unit, motors: [] };
      sequence.motors = hands.map((hand, i) => {
        const cell = Math.floor(i / 2), col = cell % 18, slow = Boolean((i % 2) ^ lanes[cell]);
        const short = i % 2 !== spec.longLane({ i: cell * 2 });
        const heading = rad(short ? 315 : 135);
        let travel = shortest(heading - current[i].angle);
        if (Math.abs(Math.abs(travel) - Math.PI) < 1e-8) travel = Math.PI;
        const aligned = current[i].angle + travel, delay = col * .48;
        const moving = Math.abs(current[i].velocity) > 1e-10;
        const alignStart = moving ? now : now + delay * unit;
        const alignEnd = now + (5.5 + delay) * unit, waveStart = now + (11 + delay) * unit;
        const formStart = now + (34.8 + delay) * unit, end = now + 54 * unit;
        const wave = waveAt(23.8);
        const motor = { from: current[i].angle, aligned, slow, alignStart, alignEnd,
          alignUnit: (alignEnd - alignStart) / 5.5, waveStart, formStart, entryVelocity: current[i].velocity,
          forming: returnTrack(aligned + wave.angle, wave.velocity / unit, target[i].angle, slow, formStart, end, true, .78 + .32 * col / 17) };
        const entryMoves = Math.abs(motor.aligned - motor.from) > 1e-8 || Math.abs(motor.entryVelocity) > 1e-10;
        const revealStart = entryMoves ? motor.alignStart : motor.waveStart;
        const revealEnd = entryMoves ? motor.alignEnd : motor.waveStart + (motor.formStart - motor.waveStart) * HandAnimation.stages.align;
        Object.assign(hand, { from: current[i].angle, start: now, duration, path: null, opacity: current[i].opacity,
          revealFrom: current[i].opacity, revealStart, revealEnd, travelOpacity: 1,
          fadeFrom: 1, fadeStart: motor.forming.start, fadeEnd: motor.forming.end });
        return motor;
      });
      publish(target, minutes);
      fallback.syncVisibility();
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
      sequence.motors.forEach((motor, i) => {
        if (motor.direct || now >= motor.formStart) {
          const current = motorAt(motor, now), end = Math.max(motor.forming.end, now + 350);
          motor.forming = returnTrack(current.angle, current.velocity, target[i].angle, motor.slow, now, end, false, motor.forming.power);
          motor.direct = true; sequence.finish = Math.max(sequence.finish, end + 80);
        } else {
          const track = motor.forming;
          motor.forming = returnTrack(track.from, track.velocity, target[i].angle, motor.slow, track.start, track.end, true, track.power);
        }
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
      if (sequence.motors.some(motor => motor.direct && now < motor.forming.end)) return '双速成型';
      const t = (now - sequence.start) / sequence.unit;
      return t < 5.5 ? '逐列归队' : t < 11 ? '斜线停留' : t < 34.8 ? '列波流动' : t < 54 ? '双速成型' : '读时停留';
    }
    return { state, hands, sample, initialize, animate, retarget, setVisibility, update, getStage,
      isAnimating: now => Boolean(active(now)) || hands.some(hand => now < hand.fadeEnd) };
  }
  return { create, referenceDuration };
});
