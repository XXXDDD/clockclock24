(function (root, factory) {
  const commonJS = typeof module === 'object' && module.exports;
  const api = factory(commonJS ? require('../../shared/math.js') : root.Timeform.Math,
    commonJS ? require('../../shared/hand-animation.js') : root.Timeform.HandAnimation);
  if (commonJS) module.exports = api;
  else (root.Timeform ||= {}).ClockClock9Animation = api;
})(globalThis, function (Maths, HandAnimation) {
  'use strict';
  const { TAU, wrap, clamp } = Maths;
  const stages = Object.freeze({ align: .18, sweep: .18 + .82 * .22 });
  // N, NE, E, SE, S, SW, W, NW, center. The two physical arms may occupy
  // either lane of the same straight line; this is a positional assignment.
  const reverseLanes = [false, false, true, true, true, true, false, false, false];
  const commonHeading = -Math.PI / 4, sharedSweep = Math.PI / 4;
  function clockwiseDistance(target, from) {
    const delta = wrap(target - from);
    return delta > TAU - 1e-8 ? 0 : delta;
  }
  const sameDestination = (a, b) => Math.abs(Math.atan2(Math.sin(a - b), Math.cos(a - b))) < 1e-8;
  // Integrate a nonnegative velocity curve with the measured entry velocity
  // and zero exit velocity. Short arcs do not need a gratuitous extra lap.
  function returnTrack(from, travel, velocity, start, end, style = 'flow') {
    const duration = end - start;
    if (style === 'cruise') {
      const transition = duration * .24, braking = duration * .08;
      const cruiseSpeed = (travel - velocity * transition / 2) / (duration - (transition + braking) / 2);
      return { from, travel, velocity, start, end, transition, braking, cruiseSpeed };
    }
    const power = travel ? Math.max(2, Math.floor(velocity * duration / travel)) : 2;
    const bump = travel ? Math.max(0, 6 * (travel / duration - velocity / (power + 1))) : 0;
    return { from, travel, velocity, start, end, power, bump };
  }
  function returnState(track, now) {
    if (now <= track.start) return { angle: track.from, velocity: track.velocity };
    if (now >= track.end || !track.travel) return { angle: track.from + track.travel, velocity: 0 };
    if (track.transition) {
      const t = now - track.start, duration = track.end - track.start;
      if (t < track.transition) {
        const acceleration = (track.cruiseSpeed - track.velocity) / track.transition;
        return { angle: track.from + track.velocity * t + acceleration * t * t / 2,
          velocity: track.velocity + acceleration * t };
      }
      if (t < duration - track.braking) return {
        angle: track.from + (track.velocity + track.cruiseSpeed) * track.transition / 2 + track.cruiseSpeed * (t - track.transition),
        velocity: track.cruiseSpeed
      };
      const remaining = track.end - now;
      return { angle: track.from + track.travel - track.cruiseSpeed * remaining * remaining / (2 * track.braking),
        velocity: track.cruiseSpeed * remaining / track.braking };
    }
    const duration = track.end - track.start, u = clamp((now - track.start) / duration, 0, 1);
    return {
      angle: track.from + duration * (track.velocity * (1 - Math.pow(1 - u, track.power + 1)) / (track.power + 1)
        + track.bump * (u * u / 2 - u * u * u / 3)),
      velocity: track.velocity * Math.pow(1 - u, track.power) + track.bump * u * (1 - u)
    };
  }
  function motorState(motor, now) {
    if (motor.direct) return returnState(motor.forming, now);
    if (now < motor.alignEnd) {
      const duration = motor.alignEnd - motor.start, u = clamp((now - motor.start) / duration, 0, 1), u2 = u * u, u3 = u2 * u;
      return {
        angle: motor.from + motor.alignTravel * (3 * u2 - 2 * u3)
          + duration * (motor.entryVelocity * (u3 - 2 * u2 + u) + motor.speed * (u3 - u2)),
        velocity: motor.alignTravel * 6 * u * (1 - u) / duration
          + motor.entryVelocity * (3 * u2 - 4 * u + 1) + motor.speed * (3 * u2 - 2 * u)
      };
    }
    if (now < motor.formStart) return { angle: motor.aligned + motor.speed * (now - motor.alignEnd), velocity: motor.speed };
    return returnState(motor.forming, now);
  }
  function create({ Settings, displayDigits, digitPose }, initial, options = {}) {
    const fallback = HandAnimation.create({ Settings, displayDigits, digitPose, handCount: 18 }, initial, options);
    const { state, hands } = fallback;
    let sequence = null;
    const active = now => sequence && now < sequence.finish;
    const poseAt = minutes => digitPose(displayDigits(minutes, state.format24));
    function sample(now) {
      if (!sequence) return fallback.sample(now);
      sequence.motors.forEach((motor, index) => {
        hands[index].angle = motorState(motor, now).angle; hands[index].opacity = 1;
      });
      return hands;
    }
    function initialize(minutes, now) { sequence = null; fallback.initialize(minutes, now); }
    function formTarget(motor, target, index) {
      // The center minute hand goes around once in the observed clip; the
      // perimeter has position-specific quarter-, half-, and three-quarter arcs.
      const minimum = index === 16 ? TAU : Math.PI / 3;
      let travel = clockwiseDistance(target, motor.aligned);
      while (travel < minimum - 1e-8) travel += TAU;
      if (state.motion === 'spin') travel += TAU;
      motor.target = motor.aligned + travel;
      const pair = Math.floor(index / 2);
      // Equal-length arcs do not imply equal timing: N/S keep a steady sweep,
      // while NE/SW and the center minute hand accelerate in the middle.
      const style = index < 16 && pair !== 1 && pair !== 5 && travel >= Math.PI - 1e-8 && state.motion !== 'spin'
        ? 'cruise' : 'flow';
      motor.forming = returnTrack(motor.aligned + sharedSweep, travel - sharedSweep,
        motor.speed, motor.formStart, sequence.finish, style);
    }
    function publishTargets(target, minutes) {
      sequence.motors.forEach((motor, index) => Object.assign(hands[index], {
        to: motor.target, used: target[index].used, motionEnd: sequence.finish,
        fadeStart: sequence.finish, fadeEnd: sequence.finish
      }));
      state.minuteKey = displayDigits(minutes, state.format24);
    }
    function plan(minutes, now, duration) {
      sample(now);
      const current = hands.map((hand, index) => ({ angle: hand.angle,
        velocity: sequence ? motorState(sequence.motors[index], now).velocity : 0 }));
      const target = poseAt(minutes), alignEnd = now + duration * stages.align, formStart = now + duration * stages.sweep;
      const speed = sharedSweep / (formStart - alignEnd), alignTime = alignEnd - now;
      sequence = { start: now, alignEnd, formStart, finish: now + duration, motors: [] };
      sequence.motors = target.map((hand, index) => {
        const lane = (index % 2) ^ Number(reverseLanes[Math.floor(index / 2)]);
        const common = commonHeading + lane * Math.PI;
        let alignTravel = clockwiseDistance(common, current[index].angle);
        // Nonnegative Bezier velocity controls keep catch-up clockwise, including
        // a replay launched from the middle of a moving sequence.
        while (alignTravel < (current[index].velocity + speed) * alignTime / 3 + 1e-8) alignTravel += TAU;
        const motor = { from: current[index].angle, entryVelocity: current[index].velocity,
          aligned: current[index].angle + alignTravel, alignTravel, start: now, alignEnd, formStart, speed };
        formTarget(motor, hand.angle, index);
        return motor;
      });
      fallback.initialize(minutes, now);
      hands.forEach((hand, index) => Object.assign(hand, { angle: current[index].angle, from: current[index].angle,
        start: now, duration, opacity: 1 }));
      publishTargets(target, minutes);
    }
    function freezeFallback(now) {
      sample(now); sequence = null;
      hands.forEach(hand => Object.assign(hand, { from: hand.angle, to: hand.angle, start: now, duration: 1, path: null,
        opacity: 1, revealFrom: 1, travelOpacity: 1, fadeFrom: 1, fadeTo: 1,
        motionEnd: now, revealStart: now, revealEnd: now, fadeStart: now, fadeEnd: now }));
    }
    function animate(minutes, now, force = false) {
      const digits = displayDigits(minutes, state.format24);
      if (!force && digits === state.minuteKey) return false;
      if (state.motion === 'none') { initialize(minutes, now); return true; }
      if (force && state.motion === 'quiet' && digits === state.minuteKey) return false;
      if (options.reducedMotion || state.motion === 'quiet') {
        freezeFallback(now); return fallback.animate(minutes, now, force);
      }
      plan(minutes, now, state.duration * 1000); return true;
    }
    function retarget(minutes, now) {
      if (!active(now)) return animate(minutes, now);
      if (displayDigits(minutes, state.format24) === state.minuteKey) return false;
      sample(now);
      const target = poseAt(minutes);
      if (now < sequence.formStart) {
        // Fixed common poses and sweep are independent of the target time.
        // Editing the central time leaves entry and perimeter motion intact.
        sequence.motors.forEach((motor, index) => {
          if (!sameDestination(target[index].angle, motor.target)) formTarget(motor, target[index].angle, index);
        });
      } else {
        const finish = Math.max(sequence.finish, now + 350), extended = finish > sequence.finish;
        sequence.motors = sequence.motors.map((motor, index) => {
          const unchanged = sameDestination(target[index].angle, motor.target);
          if (!extended && unchanged) return motor;
          const current = motorState(motor, now);
          let travel = clockwiseDistance(target[index].angle, current.angle);
          if (!travel && !unchanged && current.velocity > 1e-10) travel = TAU;
          if (!travel) current.velocity = 0;
          return { direct: true, target: current.angle + travel,
            forming: returnTrack(current.angle, travel, current.velocity, now, finish) };
        });
        sequence.finish = finish;
      }
      publishTargets(target, minutes); return true;
    }
    function update(config, now) {
      sample(now);
      const current = hands.map(hand => ({ angle: hand.angle, opacity: hand.opacity }));
      const result = fallback.update(config, now);
      if (sequence) hands.forEach((hand, index) => Object.assign(hand, current[index]));
      return result;
    }
    function getStage(now) {
      if (!active(now)) return '';
      if (now < sequence.alignEnd) return '顺时针对齐';
      return now < sequence.formStart ? '共同扫动' : '顺时针成型';
    }
    return { state, hands, sample, initialize, animate, retarget, update, getStage,
      isAnimating: now => sequence ? now < sequence.finish : fallback.isAnimating(now),
      setVisibility(mode, now) { sample(now); if (!sequence) fallback.setVisibility(mode, now); } };
  }
  return { create, stages };
});
