(function (root, factory) {
  const commonJS = typeof module === 'object' && module.exports;
  const api = factory(commonJS ? require('../../shared/math.js') : root.Timeform.Math,
    commonJS ? require('../../shared/hand-animation.js') : root.Timeform.HandAnimation);
  if (commonJS) module.exports = api;
  else (root.Timeform ||= {}).AMT120Animation = api;
})(globalThis, function (Maths, HandAnimation) {
  'use strict';
  const { TAU, wrap, clamp, smooth } = Maths;
  const referenceDuration = 43.36, nearestRadius = .5, farthestRadius = Math.hypot(7, 3.5);
  // Assign the two indistinguishable arc lanes to glyph-arm indices by position.
  // Fitted to the observed 09:34→09:35 return, not claimed physical motor IDs.
  const reverseLanes = [
    '000000000000000', '000000001110110', '000110000011110', '001111000011010',
    '001111100011100', '000000000001100', '001011000111110', '000000000000000'
  ].join('').split('').map(Number);
  const rad = degrees => degrees * Math.PI / 180;
  // Independent observations from the upper inner clock (7,3), relative to
  // its two resting arc directions. This phase is not AMT72's radial pose.
  const knots = [[0, 0], [.5, 6.9], [1.5, 22.8], [2.5, 43.6], [3.5, 70.3],
    [4.5, 95.3], [5.5, 124.6], [6.5, 157.8], [7.5, 188.7], [8.5, 221.4],
    [9.5, 258.4], [10.5, 294.7], [11.5, 329.2], [12.5, 368.7], [13.5, 405.6],
    [14.5, 444.9], [15.5, 479.8], [16.5, 515.1], [17.5, 554.9], [18.5, 591.5],
    [19.5, 630.6], [20.5, 666.8], [21.5, 706.8]];
  const secants = knots.slice(1).map(([t, a], i) => (a - knots[i][1]) / (t - knots[i][0]));
  const slopes = knots.map((_, i) => i === 0 ? 0 : i === knots.length - 1 ? 37.5
    : 2 / (1 / secants[i - 1] + 1 / secants[i]));
  function hermite(from, to, v0, v1, start, end, now) {
    const duration = end - start, u = clamp((now - start) / duration, 0, 1), u2 = u * u, u3 = u2 * u;
    return { angle: from + (to - from) * (3 * u2 - 2 * u3)
      + duration * (v0 * (u3 - 2 * u2 + u) + v1 * (u3 - u2)),
    velocity: (to - from) * 6 * u * (1 - u) / duration
      + v0 * (3 * u2 - 4 * u + 1) + v1 * (3 * u2 - 2 * u) };
  }
  function pulseAt(seconds) {
    if (seconds <= 0) return { angle: 0, velocity: 0 };
    const last = knots.length - 1;
    if (seconds >= knots[last][0]) return { angle: rad(knots[last][1] + (seconds - knots[last][0]) * slopes[last]), velocity: rad(slopes[last]) };
    const i = knots.findIndex(point => point[0] > seconds) - 1;
    const value = hermite(knots[i][1], knots[i + 1][1], slopes[i], slopes[i + 1], knots[i][0], knots[i + 1][0], seconds);
    return { angle: rad(value.angle), velocity: rad(value.velocity) };
  }
  function directedDistance(target, from, direction) {
    const distance = wrap((target - from) * direction);
    return distance > TAU - 1e-8 ? 0 : distance;
  }
  function returnTrack(from, velocity, target, direction, start, deadline, unit) {
    const speed = Math.max(0, velocity * direction);
    let travel = directedDistance(target, from, direction);
    // A moving arm already exactly at its target must pass it once more.
    // Otherwise a short arc brakes directly, without a compulsory extra lap.
    if (travel < 1e-8 && speed > 1e-10) travel += TAU;
    const end = Math.min(deadline, start + Math.max(1, (1.5 + 8 * Math.sqrt(travel / TAU)) * unit));
    const duration = end - start;
    const power = travel ? Math.max(2, Math.floor(speed * duration / travel)) : 2;
    const bump = travel ? Math.max(0, 6 * (travel / duration - speed / (power + 1))) : 0;
    return { from, travel, direction, speed, start, end, power, bump };
  }
  function trackAt(track, now) {
    if (now >= track.end) return { angle: track.from + track.direction * track.travel, velocity: 0 };
    const duration = track.end - track.start, u = clamp((now - track.start) / duration, 0, 1);
    const travel = duration * (track.speed * (1 - Math.pow(1 - u, track.power + 1)) / (track.power + 1)
      + track.bump * (u * u / 2 - u * u * u / 3));
    return { angle: track.from + track.direction * travel,
      velocity: track.direction * (track.speed * Math.pow(1 - u, track.power) + track.bump * u * (1 - u)) };
  }
  function create(spec, initial, options = {}) {
    const fallback = HandAnimation.create({ ...spec, handCount: 240 }, initial, options);
    const { state, hands } = fallback;
    const lanePattern = spec.reverseLanes || reverseLanes;
    let sequence = null;
    const active = now => sequence && now < sequence.finish;
    const settledOpacity = hand => hand.used || state.visibility === 'show' ? 1 : state.visibility === 'ghost' ? .12 : 0;
    function motorAt(motor, now) {
      if (motor.direct) return trackAt(motor.forming, now);
      if (now < motor.alignStart) return { angle: motor.from, velocity: 0 };
      if (now < motor.alignEnd) return hermite(motor.from, motor.arc, motor.entryVelocity, 0, motor.alignStart, motor.alignEnd, now);
      if (now < motor.pulseStart) return { angle: motor.arc, velocity: 0 };
      if (now < motor.formStart) {
        const pulse = pulseAt((now - motor.pulseStart) / sequence.unit);
        return { angle: motor.arc + motor.direction * pulse.angle, velocity: motor.direction * pulse.velocity / sequence.unit };
      }
      return trackAt(motor.forming, now);
    }
    function sample(now) {
      if (!sequence) return fallback.sample(now);
      sequence.motors.forEach((motor, i) => {
        const hand = hands[i]; hand.angle = motorAt(motor, now).angle;
        hand.opacity = now < hand.revealEnd
          ? hand.revealFrom + (1 - hand.revealFrom) * smooth(clamp((now - hand.revealStart) / Math.max(1, hand.revealEnd - hand.revealStart), 0, 1))
          : now < hand.fadeStart ? 1
            : hand.fadeFrom + (hand.fadeTo - hand.fadeFrom) * smooth(clamp((now - hand.fadeStart) / Math.max(1, hand.fadeEnd - hand.fadeStart), 0, 1));
      });
      return hands;
    }
    function snapshot(now) {
      sample(now);
      return hands.map((hand, i) => {
        const p = clamp((now - hand.start) / hand.duration, 0, 1);
        return { angle: hand.angle, opacity: hand.opacity,
          velocity: sequence ? motorAt(sequence.motors[i], now).velocity : (hand.to - hand.from) * 6 * p * (1 - p) / hand.duration };
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
        Object.assign(hand, { to: motor.forming.from + motor.direction * motor.forming.travel,
          motionEnd: motor.forming.end, fadeStart: motor.forming.end, fadeEnd: sequence.finish,
          fadeFrom: 1, fadeTo: settledOpacity(hand) });
      });
      state.minuteKey = spec.displayDigits(minutes, state.format24);
    }
    function plan(minutes, now) {
      const current = snapshot(now), duration = state.duration * 1000, unit = duration / referenceDuration;
      const target = spec.digitPose(spec.displayDigits(minutes, state.format24));
      sequence = { start: now, finish: now + duration, unit, motors: [] };
      sequence.motors = hands.map((hand, i) => {
        const cell = Math.floor(i / 2), col = cell % 15, row = Math.floor(cell / 15);
        const radius = Math.hypot(col - 7, row - 3.5), delay = (radius - nearestRadius) * .48;
        const theta = Math.atan2(3.5 - row, 7 - col), gamma = Math.atan2(radius, .3);
        const direction = ((i % 2) ^ lanePattern[cell]) ? -1 : 1;
        const heading = theta - direction * gamma;
        let travel = directedDistance(heading, current[i].angle, 1);
        if (travel > 1e-8 && travel < Math.PI / 2) travel += TAU;
        const moving = Math.abs(current[i].velocity) > 1e-10;
        const alignStart = moving ? now : now + (.55 + delay) * unit, alignEnd = now + (9.6 + delay) * unit;
        while (travel + 1e-8 < Math.max(0, current[i].velocity) * (alignEnd - alignStart) / 3) travel += TAU;
        const arc = current[i].angle + travel, pulseStart = now + (12.5 + delay) * unit;
        const formStart = now + (34 + delay) * unit;
        const deadline = now + (42.65 + (radius - nearestRadius) / (farthestRadius - nearestRadius) * .48 + (i % 5) * .01) * unit;
        const pulse = pulseAt((formStart - pulseStart) / unit);
        const motor = { from: current[i].angle, arc, direction, alignStart, alignEnd, pulseStart, formStart,
          entryVelocity: current[i].velocity,
          forming: returnTrack(arc + direction * pulse.angle, direction * pulse.velocity / unit,
            target[i].angle, direction, formStart, deadline, unit) };
        Object.assign(hand, { from: current[i].angle, start: now, duration, path: null, opacity: current[i].opacity,
          revealFrom: current[i].opacity, revealStart: now, revealEnd: now + Math.min(250, duration * .02) });
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
      const target = spec.digitPose(digits), opacity = hands.map(hand => hand.opacity);
      sequence.motors.forEach((motor, i) => {
        if (motor.direct || now >= motor.formStart) {
          const current = motorAt(motor, now), deadline = Math.max(motor.forming.end, now + 350);
          motor.forming = returnTrack(current.angle, current.velocity, target[i].angle, motor.direction, now, deadline, sequence.unit);
          motor.direct = true; sequence.finish = Math.max(sequence.finish, motor.forming.end + 80);
        } else {
          const track = motor.forming;
          motor.forming = returnTrack(track.from, track.direction * track.speed, target[i].angle,
            motor.direction, track.start, track.end, sequence.unit);
        }
      });
      publish(target, minutes);
      hands.forEach((hand, i) => Object.assign(hand, { revealFrom: opacity[i], revealStart: now, revealEnd: Math.min(hand.motionEnd, now + 80) }));
      return true;
    }
    function setVisibility(mode, now) {
      if (!sequence) return fallback.setVisibility(mode, now);
      if (mode === state.visibility) return;
      sample(now); state.visibility = mode;
      hands.forEach(hand => {
        if (now < hand.fadeStart) hand.fadeTo = settledOpacity(hand);
        else Object.assign(hand, { fadeFrom: hand.opacity, fadeTo: settledOpacity(hand), fadeStart: now, fadeEnd: now + 350 });
      });
    }
    function update(config, now) {
      const next = spec.Settings.normalize(config, state), visibility = next.visibility;
      const reformat = next.format24 !== state.format24;
      Object.assign(state, next, { visibility: state.visibility }); setVisibility(visibility, now); return { reformat };
    }
    function getStage(now) {
      if (!active(now)) return '';
      if (sequence.motors.some(motor => motor.direct && now < motor.forming.end)) return '逐针成型';
      const t = (now - sequence.start) / sequence.unit;
      return t < 10 ? '环弧归队' : t < 12.5 ? '环弧停留' : t < 34 ? '环波开合' : t < 43.2 ? '逐针成型' : '读时停留';
    }
    return { state, hands, sample, initialize, animate, retarget, setVisibility, update, getStage,
      isAnimating: now => Boolean(active(now)) || hands.some(hand => now < hand.fadeEnd) };
  }
  return { create, referenceDuration };
});
