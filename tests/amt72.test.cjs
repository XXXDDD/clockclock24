'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const Model = require('../src/models/amt72/model.js');
const Landscape = require('../src/models/landscape.js');
const Config = require('../src/shared/config.js');
const near = (a,b,tolerance=1e-7) => assert.ok(Math.abs(a-b)<tolerance,`${a} versus ${b}`);
const sameAngle = (a,b) => near(Math.atan2(Math.sin(a-b),Math.cos(a-b)),0);
const referenceUnit = 43400/43.36;
function performance(config={},options) {
  const clock=Model.create({ motion:'wave',duration:43.4,...config },options);
  clock.initialize(574,0); clock.animate(575,0); return clock;
}
function settled(clock,minute,now) {
  clock.sample(now);
  const target=Model.digitPose(Model.displayDigits(minute,clock.state.format24));
  clock.hands.forEach((h,i)=>{
    sameAngle(h.angle,target[i].angle);
    near(h.opacity,(target[i].used || target[i ^ 1].used) || clock.state.visibility==='show' ? 1 : clock.state.visibility==='ghost' ? .12 : 0);
  });
}
function movingState(clock,now) {
  clock.sample(now-.01); const before=clock.hands.map(h=>h.angle);
  clock.sample(now);
  return clock.hands.map((h,i)=>({ angle:h.angle,opacity:h.opacity,velocity:(h.angle-before[i])/.01 }));
}

test('AMT72 registers its own choreography and keeps old configurations and the other arrays independent',()=>{
  assert.equal(Landscape.get('amt72'),Model);
  assert.equal(Model.Settings.defaults.duration,43.4); assert.equal(Model.Settings.defaults.visibility,'show');
  assert.match(Model.motionReference,/323e6a7bd18c49a1a9a91e63652ae536/);
  const old={ version:2,type:'landscape',model:'amt72',settings:{ duration:6,motion:'wave',visibility:'ghost',longWidth:5.6,board:'#123456' } };
  const settings=Config.parse(Model,JSON.stringify(old));
  assert.equal(settings.duration,6); assert.equal(settings.visibility,'ghost'); assert.equal(settings.longWidth,5.6);
  assert.deepEqual(Config.parse(Model,Config.serialize(Model,settings)),settings);
  assert.notEqual(Landscape.get('amt120').Settings,Model.Settings);
  assert.notEqual(Landscape.get('amt144').Settings,Model.Settings);
  assert.notEqual(Landscape.get('amt288').Settings,Model.Settings);
});

test('AMT72 coalesces toward the center, holds locally, then opens from the center to the corners',()=>{
  const clock=performance();
  // At 11s the inner four point inward and are still; the corners complete
  // their own inward pose later. These are observations from the source clip.
  for (const [time,cells] of [[11,[29,30,41,42]],[14,[0,11,60,71]]]) {
    clock.sample(time*referenceUnit);
    for (const cell of cells) {
      const heading=Math.atan2(2.5-Math.floor(cell/12),5.5-cell%12);
      sameAngle(clock.hands[cell*2].angle,heading);
      sameAngle(clock.hands[cell*2+1].angle,heading);
    }
  }
  clock.sample(14*referenceUnit);
  assert.ok(Math.abs(Math.sin(clock.hands[58].angle-clock.hands[59].angle))>.5,'center is already opening');
  sameAngle(clock.hands[0].angle,clock.hands[1].angle);
});

test('AMT72 matches observed inner and outer opening phases across multiple revolutions',()=>{
  const clock=performance(); clock.sample(11*referenceUnit); const inner=clock.hands[58].angle;
  clock.sample(14*referenceUnit); const corner=clock.hands[0].angle;
  // Independent approximate silhouette observations from the official video.
  for (const [time,phase] of [[13,6.8],[15,42.5],[17,94.5],[19,153.9],[21,218.5],[23,288.6],
    [25,364.9],[27,440.4],[29,514.4],[31,587.6],[33,662.4],[35,736.3]]) {
    clock.sample(time*referenceUnit); near((clock.hands[58].angle-inner)*180/Math.PI,phase,5);
  }
  for (const [time,phase] of [[18,41.7],[20,93],[22,152.8],[24,221],[26,291.1],[28,365.8],[30,439.4],[32,513.5],[34,589.1]]) {
    clock.sample(time*referenceUnit); near((clock.hands[0].angle-corner)*180/Math.PI,phase,5);
  }
});

test('AMT72 pairs stay symmetric about their inward heading, with mirror-related clocks sharing phase',()=>{
  const clock=performance();
  for (const time of [18,24,30,34]) {
    clock.sample(time*referenceUnit);
    for (let row=0;row<6;row++) for (let col=0;col<12;col++) {
      const cell=row*12+col,heading=Math.atan2(2.5-row,5.5-col);
      sameAngle(clock.hands[cell*2].angle+clock.hands[cell*2+1].angle,2*heading);
      const mirror=row*12+11-col,mirrorHeading=Math.atan2(2.5-row,5.5-(11-col));
      sameAngle(clock.hands[cell*2].angle-heading,clock.hands[mirror*2].angle-mirrorHeading);
    }
  }
});

test('AMT72 keeps opposite winding directions through ripple and forming, with continuous boundary speeds',()=>{
  const clock=performance(); clock.sample(16*referenceUnit); let previous=clock.hands.map(h=>h.angle);
  for (let now=16*referenceUnit+30;now<43400;now+=30) {
    clock.sample(now);
    clock.hands.forEach((h,i)=>assert.ok((h.angle-previous[i])*(i%2 ? -1 : 1)>=-1e-8));
    previous=clock.hands.map(h=>h.angle);
  }
  for (const cell of [0,5,11,24,29,30,41,60,71]) {
    const radius=Math.hypot(cell%12-5.5,Math.floor(cell/12)-2.5);
    const boundary=(35+.56*(radius-Math.SQRT1_2))*referenceUnit;
    const before=movingState(clock,boundary-.02),after=movingState(clock,boundary+.02);
    for (const i of [cell*2,cell*2+1]) near(before[i].velocity,after[i].velocity,1e-7);
  }
  assert.ok(new Set(clock.hands.map(h=>h.motionEnd)).size>12);
  settled(clock,575,43400); assert.equal(clock.isAnimating(43400),false);
});

test('AMT72 live target changes and replays preserve current angle, velocity and alpha',()=>{
  for (const action of ['retarget','animate']) for (const visibility of ['show','hide','ghost']) {
    for (const now of [1800,11000,21000,36000,43000]) {
      const clock=performance({ visibility }); const before=movingState(clock,now);
      assert.equal(clock[action](728,now,true),true); clock.sample(now);
      clock.hands.forEach((h,i)=>{ sameAngle(h.angle,before[i].angle); near(h.opacity,before[i].opacity); });
      clock.sample(now+.01);
      clock.hands.forEach((h,i)=>near((h.angle-before[i].angle)/.01,before[i].velocity,2e-6));
      settled(clock,728,now+121000);
    }
  }
});

test('AMT72 color and visibility updates preserve a moving or fading performance',()=>{
  const clock=performance({ visibility:'hide' });
  for (const now of [9000,22000,42000,43200,44000]) for (const visibility of ['ghost','show','hide']) {
    clock.sample(now); const before=clock.hands.map(h=>({ angle:h.angle,opacity:h.opacity }));
    clock.update({ visibility,board:'#123456',long:'#abcdef' },now); clock.sample(now);
    clock.hands.forEach((h,i)=>{ sameAngle(h.angle,before[i].angle); near(h.opacity,before[i].opacity); });
  }
  settled(clock,575,45000);
});

test('AMT72 reaches all minute poses in both formats and completes at every duration limit',()=>{
  for (const format24 of [true,false]) for (let minute=0;minute<1440;minute++) {
    const clock=performance({ duration:1,format24 }); clock.animate(minute,50,true); settled(clock,minute,1050);
  }
  for (const duration of [1,43.4,120]) for (const visibility of ['hide','ghost','show']) {
    const clock=performance({ duration,visibility });
    for (const p of [.1,.25,.5,.75,.9,.99]) {
      const now=duration*1000*p; clock.sample(now);
      clock.hands.forEach(h=>{
        assert.ok(Number.isFinite(h.angle) && h.opacity>=0 && h.opacity<=1);
        if (now>h.revealEnd && now<h.fadeStart) near(h.opacity,1);
      });
    }
    settled(clock,575,duration*1000); assert.equal(clock.isAnimating(duration*1000),false);
  }
});

test('AMT72 auxiliary modes and reduced motion stay correct; quiet replay does not freeze an active transition',()=>{
  for (const motion of ['none','quiet','spin']) {
    const clock=performance({ motion,duration:4 });
    if (motion==='quiet') {
      clock.sample(1500); const before=clock.hands.map(h=>({ ...h }));
      assert.equal(clock.animate(575,1500,true),false); assert.deepEqual(clock.hands,before);
    }
    settled(clock,575,4000);
  }
  const clock=performance({}, { reducedMotion:true });
  clock.hands.forEach(h=>{ assert.ok(Math.abs(h.to-h.from)<=Math.PI+1e-8); assert.equal(h.fadeEnd,300); });
  settled(clock,575,300);
});
