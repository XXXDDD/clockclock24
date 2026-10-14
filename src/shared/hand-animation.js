(function (root, factory) {
  const api = factory(typeof module === 'object' && module.exports ? require('./math.js') : root.Timeform.Math);
  if (typeof module === 'object' && module.exports) module.exports = api;
  else (root.Timeform ||= {}).HandAnimation = api;
})(globalThis, function (Maths) {
  'use strict';
  const { TAU, clamp, wrap, smooth, tween } = Maths;
  // The caller supplies one timeline. No DOM, timers, storage or host integration.
  function create({ Settings, digitPose, displayDigits, handCount, phase = () => 0 }, initial, { reducedMotion = false } = {}) {
    const state = { ...Settings.normalize(initial), minuteKey: null };
    const hands = Array.from({ length: handCount }, (_, index) => {
      const angle = Math.PI * .75 + (index % 2 ? .18 : -.18);
      return { angle, from: angle, to: angle, start: 0, duration: 1, used: false, opacity: 0, revealFrom: 0, revealStart: 0, revealEnd: 0, travelOpacity: 0, motionEnd: 0, fadeStart: 0, fadeEnd: 0, fadeFrom: 0, fadeTo: 0 };
    });
    const settleOpacity = hand => hand.used || state.visibility === 'show' ? 1 : state.visibility === 'ghost' ? .12 : 0;
    function sample(now) {
      for (const hand of hands) {
        const progress = clamp((now - hand.start) / hand.duration, 0, 1);
        hand.angle = progress === 1 ? wrap(hand.to) : hand.from + (hand.to - hand.from) * smooth(progress);
        if (now < hand.revealEnd) hand.opacity = tween(now, hand.revealStart, hand.revealEnd, hand.revealFrom, hand.travelOpacity);
        else if (now < hand.fadeStart) hand.opacity = hand.travelOpacity;
        else hand.opacity = tween(now, hand.fadeStart, hand.fadeEnd, hand.fadeFrom, hand.fadeTo);
      }
      return hands;
    }
    function initialize(minutes, now) {
      const digits = displayDigits(minutes, state.format24), pose = digitPose(digits);
      for (let index = 0; index < handCount; index++) {
        const hand = hands[index]; hand.angle = pose[index].angle; hand.from = hand.angle; hand.to = hand.angle; hand.used = pose[index].used;
        hand.opacity = settleOpacity(hand); hand.revealFrom = hand.opacity; hand.travelOpacity = hand.opacity; hand.fadeFrom = hand.opacity; hand.fadeTo = hand.opacity;
        hand.start = now; hand.duration = 1; hand.motionEnd = now; hand.revealStart = now; hand.revealEnd = now; hand.fadeStart = now; hand.fadeEnd = now;
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
      const reveal = reducedMotion ? 60 : Math.min(rotating ? 350 : 160, duration * .15);
      const hide = reducedMotion ? 80 : Math.min(350, duration * .18);
      const travel = duration - reveal - hide, idleAlpha = state.visibility === 'show' ? 1 : state.visibility === 'ghost' ? .12 : 0;
      for (let index = 0; index < handCount; index++) {
        const hand = hands[index], current = hand.angle;
        let turn = ((target[index].angle - current + Math.PI) % TAU + TAU) % TAU - Math.PI;
        if (rotating) turn = index % 2 ? -wrap(wrap(current) - target[index].angle) - TAU : wrap(target[index].angle - wrap(current)) + TAU;
        const participating = rotating || hand.used || target[index].used || hand.opacity > idleAlpha + .001;
        hand.revealFrom = hand.opacity; hand.travelOpacity = participating ? 1 : idleAlpha; hand.used = target[index].used;
        const delay = state.motion === 'wave' && !reducedMotion ? travel * .3 * clamp(phase(index), 0, 1) : 0;
        hand.from = current; hand.to = current + turn; hand.start = now + reveal + delay; hand.duration = travel - delay; hand.motionEnd = now + duration - hide;
        hand.revealStart = now; hand.revealEnd = now + reveal;
        hand.fadeStart = hand.motionEnd; hand.fadeEnd = now + duration; hand.fadeFrom = hand.travelOpacity; hand.fadeTo = settleOpacity(hand);
      }
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
    return { state, hands, sample, initialize, animate, setVisibility, update, isAnimating: now => hands.some(hand => now < hand.fadeEnd) };
  }
  return { create };
});
