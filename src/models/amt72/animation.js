(function (root, factory) {
  const commonJS = typeof module === 'object' && module.exports;
  const api = factory(commonJS ? require('../../shared/math.js') : root.Timeform.Math,
    commonJS ? require('../../shared/hand-animation.js') : root.Timeform.HandAnimation);
  if (commonJS) module.exports = api;
  else (root.Timeform ||= {}).AMT72Animation = api;
})(globalThis, function (Maths, HandAnimation) {
  'use strict';
  const { TAU, wrap, clamp, smooth } = Maths;
  const referenceDuration = 43.36, nearestRadius = Math.SQRT1_2, farthestRadius = Math.hypot(5.5, 2.5);
  const rad = degrees => degrees * Math.PI / 180;
  // One opening phase inferred from the inner clock (5,2). Each clock samples
  // this curve at a radius-dependent delay; the two arms wind in opposite directions.
  const knots = [[0,0],[.5,6.8],[1.5,21.5],[2.5,42.5],[3.5,67.2],[4.5,94.5],
    [5.5,123.6],[6.5,153.9],[7.5,187.1],[8.5,218.5],[9.5,252.7],[10.5,288.6],
    [11.5,325.5],[12.5,364.9],[13.5,402.5],[14.5,440.4],[15.5,477.8],[16.5,514.4],
    [17.5,551.7],[18.5,587.6],[19.5,624.6],[20.5,662.4],[21.5,699.3],[22.5,736.3]];
  const secants = knots.slice(1).map(([t,a], i) => (a - knots[i][1]) / (t - knots[i][0]));
  const slopes = knots.map((_, i) => i === 0 ? 0 : i === knots.length - 1 ? 37
    : 2 / (1 / secants[i - 1] + 1 / secants[i]));
  function hermite(from, to, v0, v1, start, end, now) {
    const duration = end - start, u = clamp((now - start) / duration, 0, 1), u2 = u*u, u3 = u2*u;
    return { angle: from + (to - from) * (3*u2 - 2*u3)
      + duration * (v0 * (u3 - 2*u2 + u) + v1 * (u3 - u2)),
    velocity: (to - from) * 6*u*(1-u) / duration + v0 * (3*u2 - 4*u + 1) + v1 * (3*u2 - 2*u) };
  }
  function pulseAt(seconds) {
    if (seconds <= 0) return { angle: 0, velocity: 0 };
    const last = knots.length - 1;
    if (seconds >= knots[last][0]) return { angle: rad(knots[last][1] + (seconds - knots[last][0]) * slopes[last]), velocity: rad(slopes[last]) };
    const i = knots.findIndex(point => point[0] > seconds) - 1;
    const value = hermite(knots[i][1], knots[i+1][1], slopes[i], slopes[i+1], knots[i][0], knots[i+1][0], seconds);
    return { angle: rad(value.angle), velocity: rad(value.velocity) };
  }
  function directedDistance(target, from, direction) {
    const distance = wrap((target - from) * direction);
    return distance > TAU - 1e-8 ? 0 : distance;
  }
  function returnTrack(from, velocity, target, direction, start, end) {
    const duration = end - start, speed = Math.max(0, velocity * direction);
    let travel = directedDistance(target, from, direction);
    const desired = speed * duration * .85;
    while (travel + 1e-8 < speed * duration / 3 || travel + TAU / 2 < desired) travel += TAU;
    return { from, to: from + direction * travel, velocity, start, end };
  }
  function trackAt(track, now) {
    return now >= track.end ? { angle: track.to, velocity: 0 }
      : hermite(track.from, track.to, track.velocity, 0, track.start, track.end, now);
  }
  function create(spec, initial, options = {}) {
    const fallback = HandAnimation.create({ ...spec, handCount: 144 }, initial, options);
    const { state, hands } = fallback;
    let sequence = null;
    const active = now => sequence && now < sequence.finish;
    function motorAt(motor, now) {
      if (motor.direct) return trackAt(motor.forming, now);
      if (now < motor.alignStart) return { angle: motor.from, velocity: 0 };
      if (now < motor.alignEnd) return hermite(motor.from, motor.inward, motor.entryVelocity, 0, motor.alignStart, motor.alignEnd, now);
      if (now < motor.pulseStart) return { angle: motor.inward, velocity: 0 };
      if (now < motor.formStart) {
        const pulse = pulseAt((now - motor.pulseStart) / sequence.unit);
        return { angle: motor.inward + motor.direction * pulse.angle, velocity: motor.direction * pulse.velocity / sequence.unit };
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
      return hands.map((hand,i) => {
        const p = clamp((now-hand.start)/hand.duration,0,1);
        return { angle: hand.angle, opacity: hand.opacity,
          velocity: sequence ? motorAt(sequence.motors[i],now).velocity : (hand.to-hand.from)*6*p*(1-p)/hand.duration };
      });
    }
    function initialize(minutes, now) { sequence = null; fallback.initialize(minutes,now); }
    function freeze(now) {
      sample(now); sequence = null;
      hands.forEach(hand => Object.assign(hand,{ from: hand.angle, to: hand.angle, path: null,
        start: now, duration: 1, motionEnd: now, revealFrom: hand.opacity, travelOpacity: hand.opacity,
        revealStart: now, revealEnd: now, fadeFrom: hand.opacity, fadeTo: hand.opacity, fadeStart: now, fadeEnd: now }));
    }
    function publish(target, minutes) {
      sequence.motors.forEach((motor,i) => {
        const hand = hands[i]; hand.used = target[i].used;
        hand.to = motor.forming.to; hand.motionEnd = motor.forming.end;
        hand.fadeTo = hand.used || state.visibility === 'show' ? 1 : state.visibility === 'ghost' ? .12 : 0;
      });
      state.minuteKey = spec.displayDigits(minutes,state.format24);
    }
    function plan(minutes, now) {
      const current = snapshot(now), duration = state.duration * 1000, unit = duration / referenceDuration;
      const target = spec.digitPose(spec.displayDigits(minutes,state.format24));
      sequence = { start: now, finish: now+duration, unit, motors: [] };
      sequence.motors = hands.map((hand,i) => {
        const cell = Math.floor(i/2), col = cell%12, row = Math.floor(cell/12);
        const radius = Math.hypot(col-5.5,row-2.5), delay = (radius-nearestRadius)*.56;
        const heading = Math.atan2(2.5-row,5.5-col), direction = i%2 ? -1 : 1;
        let travel = directedDistance(heading,current[i].angle,1);
        const moving = Math.abs(current[i].velocity)>1e-10;
        const alignStart = moving ? now : now+(.55+delay)*unit, alignEnd = now+(9.6+delay)*unit;
        while (travel + 1e-8 < Math.max(0,current[i].velocity)*(alignEnd-alignStart)/3) travel += TAU;
        const inward = current[i].angle+travel, pulseStart = now+(12.5+delay)*unit;
        const formStart = now+(35+delay)*unit;
        const finish = now+(42.5+(radius-nearestRadius)/(farthestRadius-nearestRadius)*.48+(i%7)/6*.17)*unit;
        const pulse = pulseAt((formStart-pulseStart)/unit);
        const motor = { from: current[i].angle, inward, direction, alignStart, alignEnd, pulseStart, formStart,
          entryVelocity: current[i].velocity,
          forming: returnTrack(inward+direction*pulse.angle,direction*pulse.velocity/unit,target[i].angle,direction,formStart,finish) };
        const entryMoves = Math.abs(motor.inward - motor.from) > 1e-8 || Math.abs(motor.entryVelocity) > 1e-10;
        const revealStart = entryMoves ? motor.alignStart : motor.pulseStart;
        const revealEnd = entryMoves ? motor.alignEnd : motor.pulseStart + (motor.formStart - motor.pulseStart) * HandAnimation.stages.align;
        Object.assign(hand,{ from: current[i].angle, start: now, duration, path: null, opacity: current[i].opacity,
          revealFrom: current[i].opacity, revealStart, revealEnd, travelOpacity: 1,
          fadeFrom: 1, fadeStart: motor.forming.start, fadeEnd: motor.forming.end });
        return motor;
      });
      publish(target,minutes);
      fallback.syncVisibility();
    }
    function animate(minutes, now, force = false) {
      const digits = spec.displayDigits(minutes,state.format24);
      if (!force && digits===state.minuteKey) return false;
      if (force && state.motion==='quiet' && digits===state.minuteKey) return false;
      if (state.motion==='none') { initialize(minutes,now); return true; }
      if (state.motion!=='wave' || options.reducedMotion) { freeze(now); return fallback.animate(minutes,now,force); }
      plan(minutes,now); return true;
    }
    function retarget(minutes, now) {
      if (!active(now)) return animate(minutes,now);
      const digits = spec.displayDigits(minutes,state.format24);
      if (digits===state.minuteKey) return false;
      sample(now);
      const target = spec.digitPose(digits);
      sequence.motors.forEach((motor,i) => {
        if (motor.direct || now>=motor.formStart) {
          const current = motorAt(motor,now), end = Math.max(motor.forming.end,now+350);
          motor.forming = returnTrack(current.angle,current.velocity,target[i].angle,motor.direction,now,end);
          motor.direct = true; sequence.finish = Math.max(sequence.finish,end+80);
        } else {
          const track = motor.forming;
          motor.forming = returnTrack(track.from,track.velocity,target[i].angle,motor.direction,track.start,track.end);
        }
      });
      publish(target,minutes);
      hands.forEach((hand, i) => fallback.retargetVisibility(hand, now, sequence.motors[i].forming.start, sequence.motors[i].forming.end));
      fallback.syncVisibility();
      return true;
    }
    function setVisibility(mode, now) {
      if (mode === state.visibility) return;
      sample(now); fallback.updateVisibility(mode, now);
    }
    function update(config, now) {
      const next = spec.Settings.normalize(config,state), visibility = next.visibility;
      const reformat = next.format24!==state.format24;
      Object.assign(state,next,{ visibility: state.visibility }); setVisibility(visibility,now); return { reformat };
    }
    function getStage(now) {
      if (!active(now)) return '';
      if (sequence.motors.some(motor=>motor.direct && now<motor.forming.end)) return '逐针成型';
      const t = (now-sequence.start)/sequence.unit;
      return t<10 ? '向心归队' : t<12.5 ? '中心停留' : t<35 ? '涟漪开合' : t<43.15 ? '逐针成型' : '读时停留';
    }
    return { state,hands,sample,initialize,animate,retarget,setVisibility,update,getStage,
      isAnimating: now => Boolean(active(now)) || hands.some(hand=>now<hand.fadeEnd) };
  }
  return { create,referenceDuration };
});
