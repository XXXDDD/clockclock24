(function (root, factory) {
  const api = factory(typeof module === 'object' && module.exports ? require('./math.js') : root.Timeform.Math);
  if (typeof module === 'object' && module.exports) module.exports = api;
  else (root.Timeform ||= {}).HandAnimation = api;
})(globalThis, function (Maths) {
  'use strict';
  const { TAU, clamp, wrap, smooth, tween } = Maths;
  const stages = Object.freeze({ align: .22, hold: .30, pattern: .74, settle: .94 });
  const shortest = value => ((value + Math.PI) % TAU + TAU) % TAU - Math.PI;
  // The caller supplies one timeline. No DOM, timers, storage or host integration.
  function create({ Settings, digitPose, displayDigits, handCount, phase = () => 0, choreography = null }, initial, { reducedMotion = false } = {}) {
    const state = { ...Settings.normalize(initial), minuteKey: null };
    let sequence = null;
    const hands = Array.from({ length: handCount }, (_, index) => {
      const angle = Math.PI * .75 + (index % 2 ? .18 : -.18);
      return { angle, from: angle, to: angle, start: 0, duration: 1, path: null, used: false, opacity: 0, revealFrom: 0, revealStart: 0, revealEnd: 0, travelOpacity: 0, motionEnd: 0, fadeStart: 0, fadeEnd: 0, fadeFrom: 0, fadeTo: 0 };
    });
    const settleOpacity = hand => hand.used || state.visibility === 'show' ? 1 : state.visibility === 'ghost' ? .12 : 0;
    function pathAngle(path, now) {
      const p = clamp((now - path.start) / path.duration, 0, 1);
      if (path.direct) return p === 1 ? wrap(path.target) : path.from + (path.target - path.from) * smooth(p);
      if (p < stages.align) return path.from + (path.aligned - path.from) * smooth(p / stages.align);
      if (p < stages.hold) return path.aligned;
      if (p < stages.pattern) {
        const progress = (p - stages.hold) / (stages.pattern - stages.hold);
        const local = clamp((progress - path.delay) / (1 - path.delay), 0, 1);
        return path.aligned + (path.patternEnd - path.aligned) * smooth(local);
      }
      if (p < stages.settle) return path.patternEnd + (path.target - path.patternEnd) * smooth((p - stages.pattern) / (stages.settle - stages.pattern));
      return wrap(path.target);
    }
    function sample(now) {
      for (const hand of hands) {
        const progress = clamp((now - hand.start) / hand.duration, 0, 1);
        hand.angle = hand.path ? pathAngle(hand.path, now) : progress === 1 ? wrap(hand.to) : hand.from + (hand.to - hand.from) * smooth(progress);
        if (now < hand.revealEnd) hand.opacity = tween(now, hand.revealStart, hand.revealEnd, hand.revealFrom, hand.travelOpacity);
        else if (now < hand.fadeStart) hand.opacity = hand.travelOpacity;
        else hand.opacity = tween(now, hand.fadeStart, hand.fadeEnd, hand.fadeFrom, hand.fadeTo);
      }
      return hands;
    }
    function initialize(minutes, now) {
      sequence = null;
      const digits = displayDigits(minutes, state.format24), pose = digitPose(digits);
      for (let index = 0; index < handCount; index++) {
        const hand = hands[index]; hand.angle = pose[index].angle; hand.from = hand.angle; hand.to = hand.angle; hand.used = pose[index].used;
        hand.opacity = settleOpacity(hand); hand.revealFrom = hand.opacity; hand.travelOpacity = hand.opacity; hand.fadeFrom = hand.opacity; hand.fadeTo = hand.opacity;
        hand.path = null; hand.start = now; hand.duration = 1; hand.motionEnd = now; hand.revealStart = now; hand.revealEnd = now; hand.fadeStart = now; hand.fadeEnd = now;
      }
      state.minuteKey = digits;
    }
    function animate(minutes, now, force = false) {
      const digits = displayDigits(minutes, state.format24);
      if (!force && state.minuteKey === digits) return false;
      if (state.motion === 'none') { initialize(minutes, now); return true; }
      if (force && state.motion === 'quiet' && state.minuteKey === digits) return false;
      sample(now);
      const target = digitPose(digits), duration = reducedMotion ? 300 : state.duration * 1000;
      const rotating = ['spin', 'wave'].includes(state.motion) && !reducedMotion;
      const staged = rotating && choreography;
      sequence = staged ? { start: now, duration } : null;
      const reveal = reducedMotion ? 60 : Math.min(rotating ? 350 : 160, duration * .15);
      const hide = reducedMotion ? 80 : Math.min(350, duration * (staged ? .06 : .18));
      const travel = duration - reveal - hide, idleAlpha = state.visibility === 'show' ? 1 : state.visibility === 'ghost' ? .12 : 0;
      for (let index = 0; index < handCount; index++) {
        const hand = hands[index], current = hand.angle;
        let turn = shortest(target[index].angle - current);
        if (rotating) turn = index % 2 ? -wrap(wrap(current) - target[index].angle) - TAU : wrap(target[index].angle - wrap(current)) + TAU;
        const participating = rotating || hand.used || target[index].used || hand.opacity > idleAlpha + .001;
        hand.revealFrom = hand.opacity; hand.travelOpacity = participating ? 1 : idleAlpha; hand.used = target[index].used;
        const delay = state.motion === 'wave' && !reducedMotion ? travel * .3 * clamp(phase(index), 0, 1) : 0;
        hand.from = current; hand.to = current + turn; hand.start = now + reveal + delay; hand.duration = travel - delay; hand.motionEnd = now + duration - hide;
        hand.revealStart = now; hand.revealEnd = now + reveal;
        hand.fadeStart = hand.motionEnd; hand.fadeEnd = now + duration; hand.fadeFrom = hand.travelOpacity; hand.fadeTo = settleOpacity(hand);
        hand.path = null;
        if (staged) {
          const aligned = current + shortest(choreography.alignment(index) - current);
          const patternEnd = aligned + TAU * choreography.direction(index);
          hand.path = { from: current, aligned, patternEnd, target: patternEnd + shortest(target[index].angle - patternEnd),
            start: now, duration, delay: state.motion === 'wave' ? .22 * clamp(phase(index), 0, 1) : 0 };
          hand.start = now; hand.duration = duration; hand.to = hand.path.target;
        }
      }
      state.minuteKey = digits; return true;
    }
    // A long live performance may cross a minute boundary. Keep its choreography
    // running and bring the latest time home instead of restarting forever.
    function retarget(minutes, now) {
      if (!sequence || now >= sequence.start + sequence.duration) return animate(minutes, now);
      const digits = displayDigits(minutes, state.format24);
      if (digits === state.minuteKey) return false;
      sample(now);
      const target = digitPose(digits), settling = sequence.settling || now >= sequence.start + sequence.duration * stages.pattern;
      const finish = Math.max(sequence.start + sequence.duration, now + 350);
      const motionEnd = finish - Math.min(200, (finish - now) * .06);
      if (settling) sequence = { start: now, duration: finish - now, motionEnd, settling: true };
      hands.forEach((hand, index) => {
        hand.used = target[index].used;
        if (settling) {
          hand.from = hand.angle; hand.to = hand.angle + shortest(target[index].angle - hand.angle);
          hand.path = { direct: true, from: hand.from, target: hand.to, start: now, duration: motionEnd - now };
          hand.start = now; hand.duration = motionEnd - now; hand.motionEnd = motionEnd;
          hand.revealFrom = hand.opacity; hand.travelOpacity = 1; hand.revealStart = now; hand.revealEnd = Math.min(motionEnd, now + 80);
          hand.fadeFrom = 1; hand.fadeStart = motionEnd; hand.fadeEnd = finish;
        } else {
          hand.path.target = hand.path.patternEnd + shortest(target[index].angle - hand.path.patternEnd);
          hand.to = hand.path.target;
        }
        hand.fadeTo = settleOpacity(hand);
      });
      state.minuteKey = digits; return true;
    }
    function setVisibility(mode, now) {
      if (mode === state.visibility) return;
      sample(now); state.visibility = mode;
      for (const hand of hands) {
        const target = settleOpacity(hand);
        if (now < hand.fadeStart) {
          hand.fadeTo = target;
          if (target > hand.travelOpacity) {
            hand.revealFrom = hand.opacity; hand.revealStart = now; hand.revealEnd = Math.min(now + 250, hand.fadeStart);
            hand.travelOpacity = target; hand.fadeFrom = target;
          }
        } else {
          hand.revealStart = now; hand.revealEnd = now; hand.travelOpacity = hand.opacity; hand.fadeFrom = hand.opacity; hand.fadeTo = target;
          hand.fadeStart = now; hand.fadeEnd = now + (reducedMotion ? 150 : 350);
        }
      }
    }
    function update(config, now) {
      const next = Settings.normalize(config, state), visibility = next.visibility;
      const reformat = next.format24 !== state.format24;
      Object.assign(state, next, { visibility: state.visibility });
      setVisibility(visibility, now); return { reformat };
    }
    function getStage(now) {
      if (!sequence || now >= sequence.start + sequence.duration) return '';
      if (sequence.settling) return now < sequence.motionEnd ? '时间归位' : '读时停留';
      const p = (now - sequence.start) / sequence.duration;
      return p < stages.align ? '整队对齐' : p < stages.hold ? '统一停留' : p < stages.pattern ? '图案运动' : p < stages.settle ? '时间归位' : '读时停留';
    }
    return { state, hands, sample, initialize, animate, retarget, setVisibility, update, getStage, isAnimating: now => hands.some(hand => now < hand.fadeEnd) };
  }
  return { create, stages };
});
