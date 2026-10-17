(function (root, factory) {
  const commonJS = typeof module === 'object' && module.exports;
  const api = factory(commonJS ? require('../../shared/math.js') : root.Timeform.Math,
    commonJS ? require('../../shared/hand-animation.js') : root.Timeform.HandAnimation);
  if (commonJS) module.exports = api;
  else (root.Timeform ||= {}).AMT288Animation = api;
})(globalThis, function (Maths, HandAnimation) {
  'use strict';
  const { TAU, wrap, clamp, smooth } = Maths;
  const referenceDuration = 54.24, nearestRadius = Math.SQRT1_2, farthestRadius = Math.hypot(11.5, 5.5);
  // Position-specific correspondence reconstructed from the White clip.
  // These are motion lanes, not identified physical motors.
  const assignments = [
    '000000000000666666222222', '000000000000666662222222', '000000000000666622222222',
    '023331100000676662623722', '031311023021262232773372', '000011022122763332373322',
    '033011222013272243777322', '032151200412256633333332', '021125222220022222333722',
    '000000000000000022222222', '000000000000000002222222', '000000000000000000222222'
  ].join('').split('').map(Number);
  const reverseLanes = assignments.map(c => c & 1);
  const alignmentDirections = assignments.flatMap(c => [0, 1].map(i => c & (1 << (1 + (i ^ (c & 1)))) ? -1 : 1));
  const rad = degrees => degrees * Math.PI / 180;
  // Sparse White-film observations from upper inner clock (11,5).
  // Overlap samples require a visually checked unwrapped revolution branch.
  const knots = [[0, 0], [1, 10.3], [2, 32.08], [3, 69.8], [4, 97.49],
    [5, 139.23], [6, 179.23], [7, 222.52], [8, 261.94], [9, 303.21],
    [10, 338.14], [11, 372.95], [12, 403.32], [13, 429.8], [14, 464.05],
    [15, 497.51], [16, 526.93], [17, 559.36], [18, 589.25], [19, 622.52],
    [20, 652.83], [21, 685.01], [22, 714.84]];
  const secants = knots.slice(1).map(([t, a], i) => (a - knots[i][1]) / (t - knots[i][0]));
  const slopes = knots.map((_, i) => i === 0 ? 0 : i === knots.length - 1 ? 31.8
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
  function returnTrack(from, velocity, target, direction, start, deadline) {
    const speed = Math.max(0, velocity * direction);
    let travel = directedDistance(target, from, direction);
    // A moving arm already exactly at its target must pass it once more.
    // Otherwise a short arc brakes directly, without a compulsory extra lap.
    if (travel < 1e-8 && speed > 1e-10) travel += TAU;
    const end = deadline;
    const duration = end - start;
    const power = travel ? Math.max(2, 1.35 * speed * duration / travel) : 2;
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
    const fallback = HandAnimation.create({ ...spec, handCount: 576 }, initial, options);
    const { state, hands } = fallback;
    const lanePattern = spec.reverseLanes || reverseLanes;
    const alignDirections = spec.alignmentDirections || alignmentDirections;
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
        const cell = Math.floor(i / 2), col = cell % 24, row = Math.floor(cell / 24);
        const radius = Math.hypot(col - 11.5, row - 5.5), delay = (radius - nearestRadius) * .58;
        const theta = Math.atan2(5.5 - row, 11.5 - col), gamma = Math.atan2(radius, .26);
        const direction = ((i % 2) ^ lanePattern[cell]) ? -1 : 1;
        const heading = theta - direction * gamma;
        const alignDirection = alignDirections[i];
        let travel = directedDistance(heading, current[i].angle, alignDirection);
        if (alignDirection > 0 && travel > 1e-8 && travel < Math.PI / 2) travel += TAU;
        const moving = Math.abs(current[i].velocity) > 1e-10;
        const alignStart = moving ? now : now + delay * unit, alignEnd = now + (10.6 + delay) * unit;
        while (travel + 1e-8 < Math.max(0, current[i].velocity * alignDirection) * (alignEnd - alignStart) / 3) travel += TAU;
        const arc = current[i].angle + alignDirection * travel, pulseStart = now + (18 + delay) * unit;
        const formStart = now + (40 + delay) * unit;
        const deadline = now + (52.7 + (radius - nearestRadius) / (farthestRadius - nearestRadius) * .6) * unit;
        const pulse = pulseAt((formStart - pulseStart) / unit);
        const motor = { from: current[i].angle, arc, direction, alignStart, alignEnd, pulseStart, formStart,
          entryVelocity: current[i].velocity,
          forming: returnTrack(arc + direction * pulse.angle, direction * pulse.velocity / unit,
            target[i].angle, direction, formStart, deadline) };
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
          motor.forming = returnTrack(current.angle, current.velocity, target[i].angle, motor.direction, now, deadline);
          motor.direct = true; sequence.finish = Math.max(sequence.finish, motor.forming.end + 80);
        } else {
          const track = motor.forming;
          motor.forming = returnTrack(track.from, track.direction * track.speed, target[i].angle,
            motor.direction, track.start, track.end);
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
      return t < 10.6 ? '环弧归队' : t < 18 ? '环弧停留' : t < 40 ? '环波开合' : t < 53.3 ? '逐针成型' : '读时停留';
    }
    return { state, hands, sample, initialize, animate, retarget, setVisibility, update, getStage,
      isAnimating: now => Boolean(active(now)) || hands.some(hand => now < hand.fadeEnd) };
  }
  return { create, referenceDuration };
});
