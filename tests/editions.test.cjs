'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Classic = require('../src/web/classic.js');
const variants = require('../src/web/classic-editions.js');
const collection = require('../src/web/classic-catalog.js');
const catalogs = ['circular','landscape','portrait'].map(kind => Classic.catalog(require('../src/models/'+kind+'.js')));
const models = catalogs.flatMap(c => c.models);
const get = id => models.find(m => m.id === id);
const angularError = (a,b) => Math.abs(Math.atan2(Math.sin(a-b),Math.cos(a-b)));
const axisError = (a,b) => angularError(a*2,b*2)*90/Math.PI;

test('all added editions have their own checked source, design document and configuration identity', () => {
  const inventory = require('../artifacts/edition-references/inventory.json');
  assert.equal(variants.length,20);
  assert.equal(variants.filter(v => v.video).length,18);
  for (const variant of variants) {
    const model=get(variant.id), entry=collection.entries.find(e => e.slug===variant.slug);
    assert.ok(model); assert.equal(entry.implementation,model.id);
    assert.equal(model.Settings.defaults.board,variant.palette.board);
    const source=inventory.find(r => r.slug===variant.slug);
    assert.equal(source.checked,'2026-10-17');
    assert.equal(source.gallery_videos.length,variant.video ? 1 : 0);
    if (variant.video) assert.ok(source.gallery_videos[0].sources.some(s => s.url===variant.video));
    assert.equal(model.reference,source.url);
    const design=fs.readFileSync(path.join(__dirname,'..',entry.designPath),'utf8');
    assert.ok(design.includes(source.url)); assert.match(design,/原片拆解与实现|网页换时/);
    assert.equal(model.motionProvenance,variant.video ? 'official-video' : 'family-default');
    assert.equal(Boolean(model.referenceDuration),Boolean(variant.completeVideo));
  }
});

test('no-video editions preserve the family animation and geometry, changing only fixed colours', () => {
  for (const id of ['amt72v-tidal','amt288-black']) {
    const variant=get(id),base=get(variant.family);
    assert.equal(variant.Drawing,base.Drawing);
    assert.equal(variant.motionReference,base.motionReference);
    assert.equal(variant.referenceDuration,null);
    assert.deepEqual(variant.geometry(1920,1080,{}),base.geometry(1920,1080,{}));
    const a=variant.create({}),b=base.create({});
    a.initialize(574,0); b.initialize(574,0); a.animate(575,100); b.animate(575,100);
    for (const t of [100,4000,12000,22000,36000,55000]) {
      a.sample(t); b.sample(t);
      assert.deepEqual(a.hands.map(h => [h.angle,h.opacity]),b.hands.map(h => [h.angle,h.opacity]));
    }
  }
});

test('Sunset Dune keeps the calibrated dial pitch inside its official 92 by 42 centimetre frame', () => {
  const base=get('clockclock24').geometry(1920,1080,{});
  const model=get('clockclock24-bjarke-ingels');
  for (const size of [[1920,1080],[320,480]]) {
    const g=model.geometry(...size,{});
    assert.ok(Math.abs(g.boardWidth/g.boardHeight-92/42)<1e-12);
    assert.equal(g.points[1].x-g.points[0].x,base.points[1].x-base.points[0].x);
    assert.ok(Math.abs((g.points[0].x-base.points[0].x)-base.boardWidth/90)<1e-10);
    assert.ok(g.x>=0 && g.y>=0 && g.x+g.width<=size[0]+1e-8 && g.y+g.height<=size[1]+1e-8);
  }
});

test('column-wave editions agree with independently observed axes and propagation order', () => {
  const observations=require('../artifacts/edition-references/amt-column-observations.json');
  for (const variant of variants.filter(v => observations[v.slug] || v.id==='amt72v-black')) {
    const evidence=observations[variant.slug] || observations['a-million-times-72v-white'];
    const model=get(variant.id),clock=model.create({});
    clock.initialize(574,0); clock.animate(575,0);
    const columns=[0,Math.floor(model.columns/2),model.columns-1],errors=[];
    for (const [seconds,...axes] of evidence.samples.filter(row => row[0]>=12 && row[0]<=29)) {
      clock.sample(seconds*1000);
      columns.forEach((col,i) => errors.push(axisError(clock.hands[col*2].angle,axes[i]*Math.PI/180)));
    }
    const rms=Math.sqrt(errors.reduce((sum,v) => sum+v*v,0)/errors.length);
    assert.ok(rms<4,`${model.id}: observed axis RMS ${rms} degrees`);
  }
});

test('CC24 colour editions reproduce their own observed hold offsets and Dada late wave', () => {
  const evidence=require('../artifacts/edition-references/cc24-wave-observations.json');
  for (const variant of variants.filter(v => v.baseProfile)) {
    const model=get(variant.id),clock=model.create({}),errors=[];
    clock.initialize(574,0); clock.animate(575,0);
    for (const sample of evidence[variant.slug].filter(o => o.time>=14 && o.time<=24)) {
      clock.sample(sample.time*1000);
      sample.columns.forEach((angle,col) => errors.push(axisError(clock.hands[col*2].angle,angle*Math.PI/180)));
    }
    const rms=Math.sqrt(errors.reduce((sum,v) => sum+v*v,0)/errors.length);
    assert.ok(rms<8,`${model.id}: observed axis RMS ${rms} degrees`);
  }
});

test('each new motion reaches arbitrary times and preserves position and speed when retargeted', () => {
  for (const variant of variants) {
    const model=get(variant.id);
    for (const time of [1000,16000,model.Settings.defaults.duration*820]) {
      const clock=model.create({}),target=7*60+8;
      clock.initialize(574,0); clock.animate(575,0);
      clock.sample(time-.1); const past=clock.hands.map(h => h.angle);
      clock.sample(time); const current=clock.hands.map(h => h.angle);
      assert.equal(clock.retarget(target,time),true);
      clock.sample(time);
      clock.hands.forEach((h,i) => assert.ok(angularError(h.angle,current[i])<1e-9,variant.id+' position'));
      clock.sample(time+.1);
      clock.hands.forEach((h,i) => assert.ok(Math.abs((h.angle-current[i])-(current[i]-past[i]))<.0002,variant.id+' speed'));
      clock.sample(130000);
      const pose=model.digitPose(model.displayDigits(target));
      clock.hands.forEach((h,i) => { assert.ok(angularError(h.angle,pose[i].angle)<1e-8,variant.id+' final'); assert.equal(h.opacity,1); });
      assert.equal(clock.isAnimating(130000),false);
      clock.update({board:'#ff0000',duration:1,motion:'spin'},130000);
      assert.equal(clock.state.board,'#ff0000');
      assert.equal(clock.state.duration,1);
      assert.equal(clock.state.motion,'wave');
      assert.equal(model.Settings.defaults.board,variant.palette.board);
    }
    const reduced=model.create({}, {reducedMotion:true});
    reduced.initialize(574,0); reduced.animate(575,0); reduced.sample(1000);
    assert.equal(reduced.isAnimating(1000),false,variant.id+' reduced motion');
    const pose=model.digitPose('0935');
    reduced.hands.forEach((h,i) => assert.ok(angularError(h.angle,pose[i].angle)<1e-8));
  }
});
