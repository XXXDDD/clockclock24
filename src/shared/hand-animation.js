(function (root, factory) {
  const api = factory(typeof module === 'object' && module.exports ? require('./math.js') : root.Timeform.Math);
  if (typeof module === 'object' && module.exports) module.exports = api;
  else (root.Timeform ||= {}).HandAnimation = api;
})(globalThis, function (Maths) {
  'use strict';
  const { TAU, clamp, wrap, smooth } = Maths;
  const stages = Object.freeze({ align: .22, hold: .30, pattern: .74, settle: .94 });
  const shortest = value => ((value + Math.PI) % TAU + TAU) % TAU - Math.PI;
  // Both arms of a dial share the visibility phases on the playback clock.
  function opacityAt(hand, now) {
    const interpolate = (start, end, from, to) => {
      const progress = end <= start ? Number(now >= end) : clamp((now - start) / (end - start), 0, 1);
      return from + (to - from) * smooth(progress);
    };
    if (now < hand.revealEnd) return interpolate(hand.revealStart, hand.revealEnd, hand.revealFrom, hand.travelOpacity);
    if (now < hand.fadeStart) return hand.travelOpacity;
    return interpolate(hand.fadeStart, hand.fadeEnd, hand.fadeFrom, hand.fadeTo);
  }
  // The caller supplies one timeline. No DOM, timers, storage or host integration.
  function create({ Settings, digitPose, displayDigits, handCount, phase = () => 0, choreography = null }, initial, { reducedMotion = false } = {}) {
    const state = { ...Settings.normalize(initial), minuteKey: null };
    let sequence = null;
    const hands = Array.from({ length: handCount }, (_, index) => {
      const angle = Math.PI * .75 + (index % 2 ? .18 : -.18);
      return { angle, from: angle, to: angle, start: 0, duration: 1, path: null, used: false, opacity: 0, revealFrom: 0, revealStart: 0, revealEnd: 0, travelOpacity: 0, motionEnd: 0, fadeStart: 0, fadeEnd: 0, fadeFrom: 0, fadeTo: 0 };
    });
    const settleOpacity = hand => hand.used || state.visibility === 'show' ? 1 : state.visibility === 'ghost' ? .12 : 0;
    function syncVisibility() {
      for (let index = 0; index < handCount; index += 2) {
        const first = hands[index], second = hands[index + 1];
        if (!second) continue;
        // A folded arm still belongs to a reading dial. Only a wholly unused
        // dial may fade; entry starts with its first moving arm and return
        // waits for both arms to enter forming and for the last arm to stop.
        const shared = {
          opacity: Math.max(first.opacity, second.opacity),
          revealFrom: Math.max(first.revealFrom, second.revealFrom),
          travelOpacity: Math.max(first.travelOpacity, second.travelOpacity),
          revealStart: Math.min(first.revealStart, second.revealStart),
          revealEnd: Math.min(first.revealEnd, second.revealEnd),
          fadeFrom: Math.max(first.fadeFrom, second.fadeFrom),
          fadeTo: Math.max(first.fadeTo, second.fadeTo),
          fadeStart: Math.max(first.fadeStart, second.fadeStart),
          fadeEnd: Math.max(first.fadeEnd, second.fadeEnd)
        };
        Object.assign(first, shared); Object.assign(second, shared);
      }
    }
    function beginVisibility(hand, revealStart, revealEnd, fadeStart, fadeEnd, travelOpacity = 1) {
      Object.assign(hand, { revealFrom: hand.opacity, travelOpacity, revealStart, revealEnd,
        fadeFrom: travelOpacity, fadeTo: settleOpacity(hand), fadeStart, fadeEnd });
    }
    function retargetVisibility(hand, now, fadeStart, fadeEnd) {
      if (now >= hand.fadeStart || now >= fadeStart) {
        Object.assign(hand, { revealFrom: hand.opacity, travelOpacity: hand.opacity, revealStart: now, revealEnd: now,
          fadeFrom: hand.opacity, fadeStart: now, fadeEnd, fadeTo: settleOpacity(hand) });
      } else Object.assign(hand, { fadeStart, fadeEnd, fadeTo: settleOpacity(hand) });
    }
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
        hand.opacity = opacityAt(hand, now);
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
      syncVisibility();
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
      const travel = duration, idleAlpha = state.visibility === 'show' ? 1 : state.visibility === 'ghost' ? .12 : 0;
      for (let index = 0; index < handCount; index++) {
        const hand = hands[index], current = hand.angle;
        let turn = shortest(target[index].angle - current);
        if (rotating) turn = index % 2 ? -wrap(wrap(current) - target[index].angle) - TAU : wrap(target[index].angle - wrap(current)) + TAU;
        const participating = rotating || hand.used || target[index].used || hand.opacity > idleAlpha + .001;
        hand.revealFrom = hand.opacity; hand.travelOpacity = participating ? 1 : idleAlpha; hand.used = target[index].used;
        const delay = state.motion === 'wave' && !reducedMotion ? travel * .3 * clamp(phase(index), 0, 1) : 0;
        hand.from = current; hand.to = current + turn; hand.start = now + delay; hand.duration = travel - delay; hand.motionEnd = now + duration;
        beginVisibility(hand, hand.start, hand.start + hand.duration * stages.align,
          hand.start + hand.duration * stages.pattern, hand.motionEnd, hand.travelOpacity);
        if (!rotating) {
          // Direct/reduced-motion transitions blend visibility throughout travel.
          hand.travelOpacity = hand.opacity; hand.revealEnd = hand.start;
          hand.fadeFrom = hand.opacity; hand.fadeStart = hand.start;
        }
        hand.path = null;
        if (staged) {
          const aligned = current + shortest(choreography.alignment(index) - current);
          const patternEnd = aligned + TAU * choreography.direction(index);
          hand.path = { from: current, aligned, patternEnd, target: patternEnd + shortest(target[index].angle - patternEnd),
            start: now, duration, delay: state.motion === 'wave' ? .22 * clamp(phase(index), 0, 1) : 0 };
          hand.start = now; hand.duration = duration; hand.to = hand.path.target;
          hand.motionEnd = now + duration * stages.settle;
          beginVisibility(hand, now, now + duration * stages.align,
            now + duration * stages.pattern, hand.motionEnd);
        }
      }
      syncVisibility();
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
      const motionEnd = finish;
      if (settling) sequence = { start: now, duration: finish - now, motionEnd, settling: true };
      hands.forEach((hand, index) => {
        hand.used = target[index].used;
        if (settling) {
          hand.from = hand.angle; hand.to = hand.angle + shortest(target[index].angle - hand.angle);
          hand.path = { direct: true, from: hand.from, target: hand.to, start: now, duration: motionEnd - now };
          hand.start = now; hand.duration = motionEnd - now; hand.motionEnd = motionEnd;
          retargetVisibility(hand, now, now, motionEnd);
        } else {
          hand.path.target = hand.path.patternEnd + shortest(target[index].angle - hand.path.patternEnd);
          hand.to = hand.path.target;
        }
        hand.fadeTo = settleOpacity(hand);
      });
      syncVisibility();
      state.minuteKey = digits; return true;
    }
    function updateVisibility(mode, now) {
      if (mode === state.visibility) return;
      state.visibility = mode;
      for (let index = 0; index < handCount; index++) {
        const hand = hands[index], motionEnd = Math.max(hand.motionEnd, hands[index ^ 1]?.motionEnd || hand.motionEnd);
        const target = settleOpacity(hand);
        if (now < hand.fadeStart) {
          hand.fadeTo = target;
          if (target > hand.travelOpacity) {
            hand.revealFrom = hand.opacity; hand.revealStart = now; hand.revealEnd = Math.min(now + 250, hand.fadeStart);
            hand.travelOpacity = target; hand.fadeFrom = target;
          }
        } else {
          hand.revealStart = now; hand.revealEnd = now; hand.travelOpacity = hand.opacity; hand.fadeFrom = hand.opacity; hand.fadeTo = target;
          hand.fadeStart = now; hand.fadeEnd = now < motionEnd ? motionEnd : now + (reducedMotion ? 150 : 350);
        }
      }
      syncVisibility();
    }
    function setVisibility(mode, now) {
      if (mode === state.visibility) return;
      sample(now); updateVisibility(mode, now);
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
    return { state, hands, sample, initialize, animate, retarget, setVisibility, update, getStage,
      beginVisibility, retargetVisibility, updateVisibility, syncVisibility,
      isAnimating: now => Boolean(sequence && now < sequence.start + sequence.duration) || hands.some(hand => now < hand.fadeEnd) };
  }
  return { create, stages, opacityAt };
});
