(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else (root.Timeform ||= {}).ReferenceMotion = api;
})(globalThis, function () {
  'use strict';
  const choices = [['scatter', '交错旋转'], ['diagonal', '斜线波浪'], ['tidal', '潮汐波浪']];
  // Preserve each edition's measured default performance. The other two choices
  // borrow the existing CCL reference motions, with the edition's own geometry.
  function create(primary, alternate, referenceChoice, Settings) {
    const choice = settings => settings.choreography || referenceChoice;
    return connect(settings => choice(settings) === referenceChoice ? primary : alternate, Settings, choices, primary.state);
  }
  function connect(engine, Settings, actionChoices, initial) {
    const choice = settings => settings.choreography || Settings.defaults.choreography;
    let active = engine(initial);
    active.state.choreography = choice(initial);
    function update(input, now) {
      const settings = Settings.normalize(input, active.state), next = engine(settings);
      if (next === active) {
        const result = active.update(settings, now);
        active.state.choreography = settings.choreography;
        return result;
      }
      active.sample(now);
      const pose = active.hands.map(hand => ({ angle: hand.angle, opacity: hand.opacity }));
      const digits = active.state.minuteKey;
      if (!digits) {
        const result = next.update(settings, now);
        next.state.choreography = settings.choreography; active = next;
        return result;
      }
      const minutes = Number(digits.slice(0, 2)) * 60 + Number(digits.slice(2));
      const reformat = settings.format24 !== active.state.format24;
      next.update(settings, now); next.state.choreography = settings.choreography;
      next.initialize(minutes, now);
      next.hands.forEach((hand, index) => Object.assign(hand, {
        angle: pose[index].angle, from: pose[index].angle, to: pose[index].angle, path: null,
        opacity: pose[index].opacity, start: now, duration: 1, motionEnd: now,
        revealFrom: pose[index].opacity, travelOpacity: pose[index].opacity,
        revealStart: now, revealEnd: now, fadeFrom: pose[index].opacity, fadeTo: pose[index].opacity,
        fadeStart: now, fadeEnd: now
      }));
      active = next;
      return { reformat };
    }
    const result = { update, get state() { return active.state; }, get hands() { return active.hands; },
      getChoreography: () => ({ id: choice(active.state), name: actionChoices.find(([id]) => id === choice(active.state))[1] }),
      playReference: (...args) => active.playReference?.(...args) || false };
    for (const method of ['sample', 'initialize', 'animate', 'retarget', 'setVisibility', 'getStage', 'isAnimating']) {
      result[method] = (...args) => active[method](...args);
    }
    return result;
  }
  return { choices, create, connect };
});
