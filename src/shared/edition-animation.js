(function (root, factory) {
  const commonJS = typeof module === 'object' && module.exports;
  const api = factory(commonJS ? require('./math.js') : root.Timeform.Math,
    commonJS ? require('./hand-animation.js') : root.Timeform.HandAnimation);
  if (commonJS) module.exports = api;
  else (root.Timeform ||= {}).EditionAnimation = api;
})(globalThis, function (Maths, HandAnimation) {
  'use strict';
  const { TAU, clamp, smooth } = Maths;
  const shortest = angle => Math.atan2(Math.sin(angle), Math.cos(angle));
  function hermite(from, to, v0, v1, start, end, now) {
    if (now < start) return { angle: from, velocity: 0 };
    if (now >= end) return { angle: to, velocity: 0 };
    const span = end - start, u = clamp((now - start) / span, 0, 1), u2 = u*u, u3 = u2*u;
    return { angle: from + (to-from)*smooth(u) + span*(v0*(u3-2*u2+u) + v1*(u3-u2)),
      velocity: (to-from)*6*u*(1-u)/span + v0*(3*u2-4*u+1) + v1*(3*u2-2*u) };
  }
  // Continuous phase curves, expressed in source seconds. Each edition supplies
  // its own timing/propagation measurements; no images or frame playback are used.
  function phaseAt(seconds, profile) {
    if (seconds <= 0) return { angle: 0, velocity: 0 };
    if (profile.phaseAt) return profile.phaseAt(seconds);
    if (profile.knots) {
      const points = profile.knots, last = points.length-1;
      const secant = i => (points[i+1][1]-points[i][1])/(points[i+1][0]-points[i][0]);
      const slope = i => i === 0 ? 0 : i === last ? secant(last-1)
        : 2*secant(i-1)*secant(i)/(secant(i-1)+secant(i) || 1);
      const radians = Math.PI/180;
      if (seconds >= points[last][0]) return {
        angle:(points[last][1]+(seconds-points[last][0])*slope(last))*radians,
        velocity:slope(last)*radians };
      let i=0; while (seconds >= points[i+1][0]) i++;
      const value=hermite(points[i][1],points[i+1][1],slope(i),slope(i+1),points[i][0],points[i+1][0],seconds);
      return { angle:value.angle*radians,velocity:value.velocity*radians };
    }
    const rampTime = profile.ramp || .65;
    const ramp = Math.exp(-seconds/rampTime);
    const phase = TAU * (seconds-rampTime*(1-ramp))/(profile.period || 11.5);
    const modulation = profile.modulation ?? .25;
    return { angle: phase-modulation*Math.sin(phase),
      velocity: TAU*(1-ramp)/(profile.period || 11.5)*(1-modulation*Math.cos(phase)) };
  }
  function create(model, Settings, initialProfile, initial, options = {}) {
    let profile=initialProfile;
    const fallback = HandAnimation.create({ Settings, digitPose: model.digitPose,
      displayDigits: model.displayDigits, handCount: model.count*2 }, initial, options);
    const { state, hands } = fallback;
    let sequence = null;
    const active = now => sequence && now < sequence.finish;
    const geometry = model.geometry(1920, 1920, Settings.defaults);
    const positions = geometry.points.map(point => {
      const step = geometry.points[1].x-geometry.points[0].x;
      return { x: (point.x-geometry.boardWidth/2)/step,
        y: (point.y-geometry.boardHeight/2)/step,
        longLane: model.Drawing.longLane?.(point) || 0 };
    });
    const maxX = Math.max(...positions.map(p => p.x));
    const minX = Math.min(...positions.map(p => p.x));
    function wave(motor, now) {
      if (motor.rate !== undefined) return { angle:motor.aligned+motor.rate*(now-motor.waveStart)/sequence.unit,
        velocity:motor.rate/sequence.unit };
      const phase = phaseAt((now-motor.waveStart)/sequence.unit, profile);
      return { angle: motor.aligned + motor.direction*phase.angle,
        velocity: motor.direction*phase.velocity/sequence.unit };
    }
    function motorAt(motor, now) {
      if (motor.direct || now >= motor.formStart) {
        const track = motor.returning;
        return hermite(track.from, track.to, track.velocity, 0, track.start, track.end, now);
      }
      if (now < motor.alignEnd) return hermite(motor.from, motor.aligned, motor.entryVelocity,
        (motor.rate || 0)/sequence.unit, motor.alignStart, motor.alignEnd, now);
      return wave(motor, now);
    }
    function sample(now) {
      if (!sequence) return fallback.sample(now);
      sequence.motors.forEach((motor, i) => {
        const hand = hands[i]; hand.angle = motorAt(motor, now).angle;
        hand.opacity = HandAnimation.opacityAt(hand, now);
      });
      return hands;
    }
    function returning(from, velocity, target, direction, start, end) {
      let distance = (direction*(target-from)%TAU+TAU)%TAU;
      if (distance > TAU-1e-8) distance = 0;
      // Preserve a moving arm's direction, and only add a lap when braking from
      // the incoming speed would otherwise reverse it. No universal extra lap.
      const speed = Math.max(0,velocity*direction);
      while (distance+1e-8 < speed*(end-start)/3) distance += TAU;
      return { from, to: from+direction*distance, velocity, start, end };
    }
    function publish(minutes) {
      const pose = model.digitPose(model.displayDigits(minutes,state.format24));
      sequence.motors.forEach((motor,i) => {
        const current = motor.direct ? { angle: motor.returning.from, velocity: motor.returning.velocity } : wave(motor,motor.formStart);
        motor.returning = returning(current.angle,current.velocity,pose[i].angle,motor.direction,
          motor.formStart,motor.end);
        Object.assign(hands[i],{ used:pose[i].used, to:motor.returning.to, motionEnd:motor.end });
      });
      state.minuteKey = model.displayDigits(minutes,state.format24);
    }
    function plan(minutes, now) {
      sample(now);
      const previous = hands.map((hand,i) => ({ angle:hand.angle, opacity:hand.opacity,
        velocity:sequence ? motorAt(sequence.motors[i],now).velocity : 0 }));
      profile=options.profileFor?.(minutes,state) || profile;
      const unit = state.duration*1000/profile.duration;
      sequence = { start:now, finish:now+state.duration*1000, unit, motors:[] };
      sequence.motors = hands.map((hand,i) => {
        const p = positions[Math.floor(i/2)], lane = i%2;
        const col = profile.order === -1 ? maxX-p.x : p.x-minX;
        const radius = Math.hypot(p.x,p.y);
        const delay = col*(profile.columnDelay || 0) + radius*(profile.radialDelay || 0) + Math.abs(p.y)*(profile.rowDelay || 0);
        const track=profile.tracks?.[Math.floor(i/2)], rate=track ? track[lane+2]*Math.PI/180 : undefined;
        const direction = rate === undefined ? profile.counter && lane ? -1 : 1 : Math.sign(rate);
        let heading = (profile.heading ?? 135)*Math.PI/180;
        if (profile.tileAngles) heading=profile.tileAngles[Math.floor(i/2/model.columns)%2][Math.floor(i/2)%model.columns%2]*Math.PI/180;
        if (profile.layout === 'radial') heading = Math.atan2(-p.y,-p.x)+(profile.tangent ? Math.PI/2 : 0);
        if (profile.splay) heading += direction*profile.splay*Math.PI/180;
        if (profile.layout === 'arc') heading = radius < .1 ? -Math.PI/2
          : Math.atan2(-p.y,-p.x)-direction*Math.atan2(radius,profile.curvature || .3);
        // A rigid straight pair has a physical long/short side. Opening and
        // counter-rotating patterns keep their independently measured lanes.
        const opposedLane = profile.counter ? lane : lane ^ p.longLane;
        if (profile.opposed && opposedLane) heading += Math.PI;
        if (track) heading=track[lane]*Math.PI/180;
        let aligned = previous[i].angle+shortest(heading-previous[i].angle);
        const entryDelay=delay+col*(profile.alignColumnDelay || 0);
        const alignStart = now+(profile.alignStart+entryDelay)*unit;
        const alignEnd = now+(profile.alignEnd+entryDelay)*unit;
        const waveStart = now+(profile.waveStart+delay)*unit;
        if (track) {
          // Join a measured moving shot with matching angular speed. The entry
          // is reconstructed because the source starts after the motion began.
          aligned=returning(previous[i].angle,previous[i].velocity,heading,direction,now,waveStart).to;
          while ((aligned-previous[i].angle)*direction < Math.abs(rate)*(waveStart-now)/unit/3) aligned+=direction*TAU;
        }
        const formStart = now+(profile.formStart+delay)*unit;
        const end = now+Math.min(profile.duration-.12,profile.formEnd+delay*.35+(i%7)*.015)*unit;
        hand.opacity=previous[i].opacity;
        return { from:previous[i].angle, aligned, direction,
          alignStart:Math.abs(previous[i].velocity)>1e-10 ? now : alignStart,
          alignEnd:track ? waveStart : Math.min(alignEnd,waveStart), waveStart, formStart, end, rate,
          entryVelocity:previous[i].velocity, direct:false };
      });
      publish(minutes);
      sequence.motors.forEach((motor,i) => {
        const entryMoves=Math.abs(motor.aligned-motor.from)>1e-8 || Math.abs(motor.entryVelocity)>1e-10;
        const revealStart=entryMoves ? motor.alignStart : motor.waveStart;
        const revealEnd=entryMoves ? motor.alignEnd : motor.waveStart+(motor.formStart-motor.waveStart)*HandAnimation.stages.align;
        fallback.beginVisibility(hands[i],revealStart,revealEnd,motor.formStart,motor.end);
      });
      fallback.syncVisibility();
      sample(now);
    }
    function initialize(minutes,now) { sequence=null; fallback.initialize(minutes,now); }
    function animate(minutes,now,force=false) {
      if (!force && state.minuteKey === model.displayDigits(minutes,state.format24)) return false;
      if (options.reducedMotion || state.motion !== 'wave') {
        sample(now); sequence=null;
        // Hand the current pose to the shared transition without resampling an old track.
        hands.forEach(hand => Object.assign(hand,{ from:hand.angle,to:hand.angle,path:null,start:now,duration:1,
          motionEnd:now,revealFrom:hand.opacity,travelOpacity:hand.opacity,revealStart:now,revealEnd:now,
          fadeFrom:hand.opacity,fadeTo:hand.opacity,fadeStart:now,fadeEnd:now }));
        return fallback.animate(minutes,now,force);
      }
      plan(minutes,now); return true;
    }
    function retarget(minutes,now) {
      if (!active(now)) return animate(minutes,now);
      if (state.minuteKey === model.displayDigits(minutes,state.format24)) return false;
      const pose = model.digitPose(model.displayDigits(minutes,state.format24));
      sample(now);
      sequence.motors.forEach((motor,i) => {
        hands[i].used=pose[i].used;
        if (now >= motor.formStart) {
          const current=motorAt(motor,now);
          motor.formStart=now; motor.end=Math.max(motor.end,now+350); motor.direct=true;
          motor.returning=returning(current.angle,current.velocity,pose[i].angle,motor.direction,now,motor.end);
          sequence.finish=Math.max(sequence.finish,motor.end+80);
        } else {
          const current=wave(motor,motor.formStart);
          motor.returning=returning(current.angle,current.velocity,pose[i].angle,motor.direction,motor.formStart,motor.end);
        }
        hands[i].to=motor.returning.to; hands[i].motionEnd=motor.end;
        fallback.retargetVisibility(hands[i],now,motor.returning.start,motor.end);
      });
      fallback.syncVisibility();
      state.minuteKey=model.displayDigits(minutes,state.format24); return true;
    }
    function update(config,now) {
      const next=Settings.normalize(config,state), reformat=next.format24!==state.format24;
      sample(now); Object.assign(state,next,{visibility:state.visibility});
      fallback.updateVisibility(next.visibility,now); return { reformat };
    }
    function getStage(now) {
      if (!active(now)) return '';
      if (sequence.motors.every(m => now >= m.end)) return '读时停留';
      if (sequence.motors.some(m => now >= m.formStart && now < m.end)) return '逐针成型';
      if (sequence.motors.some(m => now >= m.waveStart && now < m.formStart)) return profile.stage || '列间相位流动';
      if (sequence.motors.every(m => now >= m.alignEnd)) return '归队停留';
      return '逐位拆字归队';
    }
    return { state,hands,sample,initialize,animate,retarget,update,getStage,
      setVisibility(mode,now) { if (mode !== state.visibility) { sample(now); fallback.updateVisibility(mode,now); } },
      isAnimating:now => Boolean(active(now)) || hands.some(hand => now < hand.fadeEnd) };
  }
  return { create,phaseAt };
});
