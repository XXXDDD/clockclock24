(function (root, factory) {
  const commonJS = typeof module === 'object' && module.exports;
  const api = factory(commonJS ? require('../../shared/math.js') : root.Timeform.Math,
    commonJS ? require('../../shared/hand-animation.js') : root.Timeform.HandAnimation);
  if (commonJS) module.exports = api;
  else (root.Timeform ||= {}).AMT61cAnimation = api;
})(globalThis, function (Maths, HandAnimation) {
  'use strict';
  const { TAU, clamp, wrap, smooth } = Maths;
  const stages = Object.freeze({ align: .20, hold: .28, wind: .80, settle: .94 });
  // Keep the approved wind curve and propagation. Entry and return use separate
  // motor tracks, following the positional observations in this model's design.
  function wind(seconds) {
    if (seconds <= 0) return { angle: 0, velocity: 0 };
    const ramp = Math.exp(-seconds / .45);
    const cycles = (seconds - .45 * (1 - ramp)) / 11.5, phase = TAU * cycles;
    return { angle: phase - .36 * Math.sin(phase) + .05 * Math.sin(2 * phase),
      velocity: TAU * (1 - ramp) / 11.5 * (1 - .36 * Math.cos(phase) + .10 * Math.cos(2 * phase)) };
  }
  function hermite(from, travel, velocity, start, end, now) {
    if (now <= start) return { angle: from, velocity: now === start ? velocity : 0 };
    if (now >= end) return { angle: from + travel, velocity: 0 };
    const duration = end - start, u = clamp((now - start) / duration, 0, 1), u2 = u * u, u3 = u2 * u;
    return { angle: from + travel * smooth(u) + velocity * duration * (u3 - 2 * u2 + u),
      velocity: travel / duration * 6 * u * (1 - u) + velocity * (3 * u2 - 4 * u + 1) };
  }
  const shortest = angle => wrap(angle + Math.PI) - Math.PI;
  function create({ Settings, displayDigits, digitPose, cells }, initial, options = {}) {
    const fallback = HandAnimation.create({ Settings, displayDigits, digitPose, handCount: cells.length * 2 }, initial, options);
    const { state, hands } = fallback;
    let sequence = null;
    const poseAt = minutes => digitPose(displayDigits(minutes, state.format24));
    function windState(motor, now) {
      const value = wind((now - sequence.windStart) * sequence.windScale - motor.delay);
      return { angle: motor.aligned + motor.direction * value.angle,
        velocity: motor.direction * value.velocity * sequence.windScale };
    }
    function motorState(motor, now) {
      if (sequence.direct || now >= sequence.returnStart) {
        return hermite(motor.returnAngle, motor.travel, motor.returnVelocity, sequence.returnStart, motor.end, now);
      }
      if (now < sequence.windStart) return hermite(motor.from, motor.aligned - motor.from, 0, motor.alignStart, motor.alignEnd, now);
      return windState(motor, now);
    }
    function sample(now) {
      if (!sequence) return fallback.sample(now);
      sequence.motors.forEach((motor, index) => {
        const hand = hands[index]; hand.angle = motorState(motor, now).angle;
        hand.opacity = HandAnimation.opacityAt(hand, now);
      });
      return hands;
    }
    function initialize(minutes, now) { sequence = null; fallback.initialize(minutes, now); }
    function setTargets(minutes) {
      const pose = poseAt(minutes), runTime = sequence.returnEnd - sequence.returnStart;
      sequence.motors.forEach((motor, index) => {
        const target = pose[index], cellIndex = Math.floor(index / 2), partner = pose[index ^ 1];
        let distance = wrap(motor.direction * (target.angle - motor.returnAngle));
        if (distance > TAU - 1e-8 || distance < 1e-8) distance = 0;
        // Only a moving motor exactly crossing its destination needs another lap.
        // Otherwise retain its actual winding and stop at the next equivalent pose.
        if (!distance && Math.abs(motor.returnVelocity) > 1e-10) distance = TAU;
        const decorative = !target.used && !partner.used && Math.abs(shortest(target.angle - partner.angle)) < 1e-8;
        const col = sequence.positions[cellIndex].col;
        const timing = decorative ? .91 + .06 * col / 8 + .03 * (index % 2)
          : .50 + .44 * Math.sqrt(distance / TAU) + .06 * col / 8;
        let duration = runTime * timing;
        // Hermite stays monotone when v * duration <= 3 * distance. Shorten a
        // near-target motor's braking time instead of adding an arbitrary lap.
        if (Math.abs(motor.returnVelocity) > 1e-10) duration = Math.min(duration, 2.9 * distance / Math.abs(motor.returnVelocity));
        motor.travel = motor.direction * distance;
        motor.end = sequence.returnStart + duration;
        Object.assign(hands[index], { to: motor.returnAngle + motor.travel, used: target.used, motionEnd: motor.end });
      });
      sequence.motionEnd = Math.max(...sequence.motors.map(motor => motor.end));
      state.minuteKey = displayDigits(minutes, state.format24);
    }
    function install(minutes, now, duration, direct = false) {
      sample(now);
      const current = hands.map(hand => ({ angle: hand.angle, opacity: hand.opacity }));
      const old = sequence;
      const previousMotors = old && direct ? old.motors.map(motor => motorState(motor, now)) : null;
      const returnEnd = direct ? Math.max(old.returnEnd, now + Math.min(350, duration * .94)) : now + duration * stages.settle;
      const finish = direct ? Math.max(old.finish, returnEnd + Math.min(200, duration * .06)) : now + duration;
      fallback.initialize(minutes, now);
      sequence = { start: now, alignEnd: now + duration * stages.align, windStart: now + duration * stages.hold,
        returnStart: direct ? now : now + duration * stages.wind, returnEnd, finish, direct,
        windScale: 26 / (duration * (stages.wind - stages.hold)),
        positions: cells.map(cell => ({ ...cell, centerDistance: Math.abs(cell.row - 4), mirrorRow: Math.min(cell.row, 8 - cell.row) })),
        motors: [] };
      sequence.motors = hands.map((hand, index) => {
        const position = sequence.positions[Math.floor(index / 2)];
        const alignStart = now + duration * (.2 + .4 * position.col + .7 * position.centerDistance) / 53.12;
        const motor = { from: current[index].angle, aligned: current[index].angle + shortest(-current[index].angle),
          alignStart, alignEnd: alignStart + duration * 4.6 / 53.12, direction: index % 2 ? -1 : 1,
          delay: state.motion === 'wave' ? position.col * .31 + position.centerDistance * .05 : 0 };
        const start = direct ? previousMotors[index] : windState(motor, sequence.returnStart);
        Object.assign(motor, { returnAngle: start.angle, returnVelocity: start.velocity });
        return motor;
      });
      setTargets(minutes);
      hands.forEach((hand, index) => {
        const motor = sequence.motors[index];
        const entryMoves = Math.abs(motor.aligned - motor.from) > 1e-8;
        const revealStart = direct ? now : entryMoves ? motor.alignStart : sequence.windStart + motor.delay / sequence.windScale;
        const revealEnd = direct ? now : entryMoves ? motor.alignEnd : revealStart + (sequence.returnStart - revealStart) * HandAnimation.stages.align;
        Object.assign(hand, { angle: current[index].angle, opacity: current[index].opacity, from: current[index].angle,
          start: now, duration });
        fallback.beginVisibility(hand, revealStart, revealEnd,
          sequence.returnStart, motor.end, direct ? hand.opacity : 1);
      });
      fallback.syncVisibility();
    }
    function freezeFallback(now) {
      sample(now); sequence = null;
      hands.forEach(hand => Object.assign(hand, { from: hand.angle, to: hand.angle, start: now, duration: 1, path: null,
        revealFrom: hand.opacity, travelOpacity: hand.opacity, fadeFrom: hand.opacity, fadeTo: hand.opacity,
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
      install(minutes, now, state.duration * 1000); return true;
    }
    function retarget(minutes, now) {
      if (!sequence || now >= sequence.finish) return animate(minutes, now);
      if (displayDigits(minutes, state.format24) === state.minuteKey) return false;
      if (!sequence.direct && now < sequence.returnStart) {
        sample(now); setTargets(minutes);
        hands.forEach((hand, i) => fallback.retargetVisibility(hand, now, sequence.returnStart, sequence.motors[i].end));
        fallback.syncVisibility();
        return true;
      }
      install(minutes, now, Math.max(350, sequence.finish - now), true); return true;
    }
    function setVisibility(mode, now) {
      if (mode === state.visibility) return;
      sample(now); fallback.updateVisibility(mode, now);
    }
    function update(config, now) {
      const next = Settings.normalize(config, state), reformat = next.format24 !== state.format24, visibility = next.visibility;
      Object.assign(state, next, { visibility: state.visibility }); setVisibility(visibility, now); return { reformat };
    }
    function getStage(now) {
      if (!sequence || now >= sequence.finish) return '';
      if (!sequence.direct && now < sequence.alignEnd) return '逐位整理';
      if (!sequence.direct && now < sequence.windStart) return '统一停留';
      if (now < sequence.returnStart) return '风势流动';
      return now < sequence.motionEnd ? '逐针成型' : '读时停留';
    }
    return { state, hands, sample, initialize, animate, retarget, update, setVisibility, getStage,
      isAnimating: now => Boolean(sequence && now < sequence.finish) || hands.some(hand => now < hand.fadeEnd) };
  }
  return { create, stages };
});
