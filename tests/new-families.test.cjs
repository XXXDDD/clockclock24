'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const Classic=require('../src/web/classic.js');
const catalog=Classic.catalog(require('../src/models/landscape.js'));
const models=['clockclockl','amt96'].map(id=>catalog.get(id));
const error=(a,b)=>Math.abs(Math.atan2(Math.sin(a-b),Math.cos(a-b)));
const snapshot=clock=>clock.hands.map(h=>[h.angle,h.opacity]);

test('both new families use their own inspected product video and documented evidence boundaries',()=>{
  for (const model of models) {
    const slug=model.reference.split('/').pop();
    const source=require('../artifacts/new-family-references/'+slug+'-source.json');
    assert.equal(source.checked,'2026-10-17');
    assert.equal(source.product,model.reference);
    assert.ok(source.gallery_videos.some(v=>v.sources.some(s=>s.url===model.motionReference)));
    assert.equal(model.motionProvenance,'official-video');
    const design=fs.readFileSync('src/models/'+model.id+'/design.md','utf8');
    assert.ok(design.includes(model.reference)); assert.ok(design.includes(model.motionReference));
    assert.equal(model.family,model.id);
  }
  assert.equal(models[0].referenceDuration,null);
  assert.equal(models[1].referenceDuration,52.2);
  assert.equal(models[1].referenceTime,'11:34');
  assert.equal(require('../src/models/landscape.js').models.length,5,'existing platform registry stays compatible');
  const landscape=fs.readFileSync('clockclock24.html','utf8');
  for (const model of models) assert.match(landscape,new RegExp('data-model="'+model.id+'"'));
  for (const page of ['circular.html','portrait.html']) assert.doesNotMatch(fs.readFileSync(page,'utf8'),/ClockClockLAnimation=|AMT96Animation=/);
});

test('AMT96 photographed first and last readouts retain the capped one and all eight rows',()=>{
  // Independently transcribed from primary-video t=0 and t=51.9 stills.
  const glyphs={
    '1':['SE EW SW','NE SW NS','PP NS NS','PP NS NS','PP NS NS','PP NE NW'],
    '3':['SE EW SW','NE SW NS','SE NW NS','NE SW NS','SE NW NS','NE EW NW'],
    '4':['SE SW SW','NS NS NS','NS NE NS','NE SW NS','PP NS NS','PP NE NW'],
    '5':['SE EW SW','NS SE NW','NS NE SW','NE SW NS','SE NW NS','NE EW NW']
  };
  const dirs={E:0,S:Math.PI/2,W:Math.PI,N:-Math.PI/2,P:Math.PI*.75};
  const model=models[1];
  for (const digits of ['1134','1135']) {
    const pose=model.digitPose(digits);
    for (let row=0;row<8;row++) for (let col=0;col<12;col++) {
      const token=row===0 || row===7 ? 'PP' : glyphs[digits[Math.floor(col/3)]][row-1].split(' ')[col%3];
      const pair=pose.slice((row*12+col)*2,(row*12+col)*2+2).map(h=>h.angle);
      const target=[...token].map(d=>dirs[d]);
      assert.ok(Math.min(error(pair[0],target[0])+error(pair[1],target[1]),
        error(pair[0],target[1])+error(pair[1],target[0]))<1e-9,`${digits} row ${row} col ${col}`);
    }
  }
});

test('new-family typography covers the full day in both time formats without missing motors',()=>{
  for (const model of models) for (const format24 of [true,false]) for (let minute=0;minute<1440;minute++) {
    const digits=model.displayDigits(minute,format24),pose=model.digitPose(digits);
    assert.match(digits,/^\d{4}$/); assert.equal(pose.length,model.count*2);
    assert.ok(pose.every(h=>Number.isFinite(h.angle) && typeof h.used==='boolean'));
    if (!format24) assert.ok(Number(digits.slice(0,2))>=1 && Number(digits.slice(0,2))<=12);
  }
});

test('AMT96 diagonal hold is a repeated 2 by 2 pattern and its two lanes counter-rotate',()=>{
  const model=models[1],clock=model.create(); clock.initialize(694,0); clock.animate(695,0);
  clock.sample(12000);
  const anchors=[[45,315],[135,225]];
  for (let cell=0;cell<96;cell++) {
    const heading=anchors[Math.floor(cell/12)%2][cell%12%2]*Math.PI/180;
    assert.ok(error(clock.hands[cell*2].angle,heading)<1e-9);
    assert.ok(error(clock.hands[cell*2+1].angle,heading+Math.PI)<1e-9);
  }
  clock.sample(20000); const before=snapshot(clock); clock.sample(20100);
  clock.hands.forEach((h,i)=>assert.ok((h.angle-before[i][0])*(i%2 ? -1 : 1)>0));
});

test('new motion curves match unordered source silhouettes within documented image uncertainty',()=>{
  for (const model of models) {
    const data=require('../artifacts/new-family-references/'+model.id+'-observations.json');
    const clock=model.create({choreography:'scatter'}),errors=[];clock.initialize(694,0);clock.animate(695,0);
    // AMT96 checks every clock, including 80 clocks outside the phase-fit subset.
    for (const sample of data.samples.filter(s=>model.id==='amt96' ? s.time>=15 && s.time<=40 : s.time<=7.4)) {
      clock.sample((sample.time+(model.id==='clockclockl' ? 6 : 0))*1000);
      sample.poses.forEach((pair,cell)=>{
        const [a,b]=clock.hands.slice(cell*2,cell*2+2).map(h=>h.angle);
        const [x,y]=pair.map(v=>v*Math.PI/180);
        errors.push(Math.min(error(a,x)**2+error(b,y)**2,error(a,y)**2+error(b,x)**2)/2);
      });
    }
    const rms=Math.sqrt(errors.reduce((s,e)=>s+e,0)/errors.length)*180/Math.PI;
    assert.ok(rms<(model.id==='amt96' ? 16 : 15),model.id+' silhouette RMS '+rms);
  }
});

test('entry, measured-phase joins and braking preserve angular position and velocity',()=>{
  for (const model of models) {
    const clock=model.create({choreography:'scatter'});clock.initialize(694,0);clock.animate(695,0);
    const joins=model.id==='clockclockl' ? [6000,32000] : [13000,14000,16000,20000,26000,40000,41800];
    for (const time of joins) {
      clock.sample(time-.01);const past=snapshot(clock);clock.sample(time);const now=snapshot(clock);
      clock.sample(time+.01);
      clock.hands.forEach((h,i)=>assert.ok(Math.abs((h.angle-now[i][0])-(now[i][0]-past[i][0]))<1e-7,
        `${model.id} velocity join ${time} hand ${i}`));
    }
  }
});

test('replay, pause sampling and mid-flight retarget preserve progress and reach arbitrary times',()=>{
  for (const model of models) for (const time of [1500,18000,model.Settings.defaults.duration*900]) {
    const clock=model.create();clock.initialize(694,0);clock.animate(695,0);
    clock.sample(time-.1);const past=snapshot(clock);clock.sample(time);const now=snapshot(clock);
    clock.sample(time);assert.deepEqual(snapshot(clock),now,'same paused progress is deterministic');
    assert.equal(clock.retarget(7*60+8,time),true);clock.sample(time);
    clock.hands.forEach((h,i)=>assert.ok(error(h.angle,now[i][0])<1e-9));
    clock.sample(time+.1);
    clock.hands.forEach((h,i)=>assert.ok(Math.abs((h.angle-now[i][0])-(now[i][0]-past[i][0]))<.0002));
    clock.sample(90000);assert.equal(clock.isAnimating(90000),false);
    const pose=model.digitPose('0708');
    clock.hands.forEach((h,i)=>{assert.ok(error(h.angle,pose[i].angle)<1e-9);assert.equal(h.opacity,1);});
    clock.animate(428,90000,true);clock.sample(90000);
    clock.hands.forEach((h,i)=>assert.ok(error(h.angle,pose[i].angle)<1e-9,'replay starts without a jump'));
  }
});

test('new families honor reduced motion and accept complete customizations without changing preset defaults',()=>{
  for (const model of models) {
    const clock=model.create({}, {reducedMotion:true});clock.initialize(694,0);clock.animate(695,0);clock.sample(1000);
    assert.equal(clock.isAnimating(1000),false);
    clock.hands.forEach((h,i)=>assert.ok(error(h.angle,model.digitPose('1135')[i].angle)<1e-9));
    clock.update({board:'#ff0000',gap:20,motion:'spin',duration:1,scale:72},1000);
    assert.equal(clock.state.board,'#ff0000');assert.equal(clock.state.gap,20);
    assert.equal(clock.state.motion,'wave');assert.equal(clock.state.duration,1);
    assert.notEqual(model.Settings.defaults.board,'#ff0000');
    assert.equal(clock.state.scale,72);
  }
});

test('ClockClock L offers exactly three saved motion choices and keeps the selection across minutes and replays',()=>{
  const model=models[0],Config=require('../src/shared/config.js');
  assert.equal(model.Settings.defaults.choreography,'diagonal');
  assert.deepEqual(model.Settings.fields.choreography.options.map(o=>o[0]),['scatter','diagonal','tidal']);
  for (const choreography of ['scatter','diagonal','tidal']) {
    const settings=model.Settings.normalize({choreography});
    const restored=catalog.parse(Config.serialize(model,settings));
    assert.equal(restored.settings.choreography,choreography);
    const clock=model.create(settings);clock.initialize(574,0);
    for (let round=0;round<4;round++) {
      const start=round*60000;clock.animate(575+round,start);clock.sample(start+42000);
      assert.equal(clock.getChoreography().id,choreography);
      assert.equal(clock.state.choreography,choreography);
      assert.equal(clock.isAnimating(start+42000),false);
      clock.animate(575+round,start+43000,true);
      assert.equal(clock.getChoreography().id,choreography);
    }
  }
  assert.throws(()=>catalog.parse(JSON.stringify({version:2,type:'landscape',model:'clockclockl',settings:{choreography:'random'}})),/无效/);
  assert.equal(models[1].Settings.fields.choreography,undefined);
});

test('ClockClock L diagonal holds parallel opposed arms while scatter retains distinct phases',()=>{
  const model=models[0],poses={};
  for (const choreography of ['diagonal','scatter','tidal']) {
    const clock=model.create({choreography});clock.initialize(574,0);clock.animate(575,0);clock.sample(8700);
    poses[choreography]=clock.hands.map(h=>h.angle);
  }
  poses.diagonal.forEach((angle,i)=>{
    const longLane=model.Drawing.longLane({i:i-i%2});
    assert.ok(error(angle,(i%2 === longLane ? 315 : 135)*Math.PI/180)<1e-9);
  });
  for (const choreography of ['scatter','tidal']) assert.ok(poses[choreography].filter((a,i)=>error(a,poses.diagonal[i])>.2).length>30);
  assert.ok(poses.scatter.filter((a,i)=>error(a,poses.tidal[i])>.2).length>30);
});

test('ClockClock L Tidal agrees with clear rectified edge observations and propagates outwards',()=>{
  const model=models[0],clock=model.create({choreography:'tidal'});
  const evidence=require('./fixtures/ccl-tidal-checked.json');
  clock.initialize(574,0);clock.animate(575,0);const errors=[];
  // Four clear views along the left edge avoid the overexposed metal arms in
  // the spotlight. Other frames contain silhouette/identity ambiguities.
  for (const sample of evidence.samples) {
    clock.sample((6+sample.time-7.1345049723)*1000);
    evidence.cells.forEach((cell,index)=>{
      const [a,b]=clock.hands.slice(cell*2,cell*2+2).map(h=>h.angle);
      const [x,y]=sample.poses[index].map(v=>v*Math.PI/180);
      errors.push(Math.min(error(a,x)**2+error(b,y)**2,error(a,y)**2+error(b,x)**2)/2);
    });
  }
  const rms=Math.sqrt(errors.reduce((a,b)=>a+b,0)/errors.length)*180/Math.PI;
  assert.ok(rms<15,'clear edge silhouettes RMS '+rms);
  clock.sample(6500);const before=clock.hands.map(h=>h.angle);clock.sample(6600);
  assert.ok(Math.abs(clock.hands[22].angle-before[22])>Math.abs(clock.hands[0].angle-before[0]),'inner pair moves before outer corner');
});

test('all ClockClock L selections reach arbitrary targets and keep velocity continuous when switched in flight',()=>{
  const model=models[0],clock=model.create({choreography:'diagonal'});clock.initialize(574,0);clock.animate(575,0);
  let time=16000;
  for (const choreography of ['scatter','tidal','diagonal']) {
    clock.sample(time-.01);const past=snapshot(clock);clock.sample(time);const current=snapshot(clock);
    clock.update({choreography},time);clock.animate(575,time,true);clock.sample(time);
    clock.hands.forEach((h,i)=>assert.ok(error(h.angle,current[i][0])<1e-9));
    clock.sample(time+.01);
    clock.hands.forEach((h,i)=>assert.ok(Math.abs((h.angle-current[i][0])-(current[i][0]-past[i][0]))<1e-7));
    assert.equal(clock.getChoreography().id,choreography);time+=16000;
  }
  for (const choreography of ['scatter','diagonal','tidal']) for (const target of [0,428,720,1439]) {
    const c=model.create({choreography});c.initialize(574,0);c.animate(target,0);c.retarget(target+1,20000);c.sample(45000);
    const pose=model.digitPose(model.displayDigits(target+1));
    c.hands.forEach((h,i)=>assert.ok(error(h.angle,pose[i].angle)<1e-9));
    assert.equal(c.getChoreography().id,choreography);
    const reduced=model.create({choreography},{reducedMotion:true});reduced.initialize(574,0);reduced.animate(target,0);reduced.sample(1000);
    assert.equal(reduced.isAnimating(1000),false);
  }
});
