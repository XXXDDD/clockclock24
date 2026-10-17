'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const Circular = require('../src/models/circular.js');
const Config = require('../src/shared/config.js');
const cc9 = Circular.get('clockclock9'), amt61c = Circular.get('amt61c');
const sameAngle = (actual, expected) => {
  assert.ok(Math.abs(Math.sin(actual) - Math.sin(expected)) < 1e-8);
  assert.ok(Math.abs(Math.cos(actual) - Math.cos(expected)) < 1e-8);
};
const shortAngle = value => Math.atan2(Math.sin(value), Math.cos(value));

test('61c has the photographed circular grid; CC9 has nine bare axes in a diamond', () => {
  assert.deepEqual(Circular.models.map(model => model.id), ['clockclock9', 'amt61c']);
  const grid = amt61c.geometry(1080, 1080, {}), rows = new Map();
  for (const point of grid.points) rows.set(point.y, (rows.get(point.y) || 0) + 1);
  assert.deepEqual([...rows.values()], [3, 7, 7, 9, 9, 9, 7, 7, 3]);
  const diamond = cc9.geometry(1080, 1080, {}), diamondRows = new Map();
  for (const point of diamond.points) diamondRows.set(point.y, (diamondRows.get(point.y) || 0) + 1);
  assert.deepEqual([...diamondRows].sort((a, b) => a[0] - b[0]).map(row => row[1]), [1, 2, 3, 2, 1]);
  assert.equal(diamond.points.filter(point => point.center).length, 1);
});

test('CC9 perimeter leaves visible gaps even with legacy zero-gap settings; the center tells analogue time', () => {
  const config = cc9.Settings.normalize({ gap: 0, longLength: 100, shortLength: 100 });
  const geometry = cc9.geometry(1080, 1080, config), pose = cc9.digitPose('1010');
  for (let index = 0; index < 8; index++) {
    const point = geometry.points[index], neighbor = geometry.points[(index + 1) % 8];
    const hand = pose[index * 2 + 1], otherHand = pose[neighbor.i];
    const length = cc9.Drawing.handLength(point, config, true), otherLength = cc9.Drawing.handLength(neighbor, config, false);
    const tip = [point.x + Math.cos(hand.angle) * length, point.y + Math.sin(hand.angle) * length];
    const otherTip = [neighbor.x + Math.cos(otherHand.angle) * otherLength, neighbor.y + Math.sin(otherHand.angle) * otherLength];
    const pitch = Math.hypot(neighbor.x - point.x, neighbor.y - point.y), clearance = Math.hypot(tip[0] - otherTip[0], tip[1] - otherTip[1]);
    assert.ok(clearance / pitch >= .025 && clearance / pitch <= .035, 'even a custom equal-long pair retains approximately 3% of the axis pitch clear');
    sameAngle(hand.angle, Math.atan2(neighbor.y - point.y, neighbor.x - point.x));
  }
  const wider = cc9.geometry(1080, 1080, { ...config, gap: 20 });
  assert.ok(Math.hypot(wider.points[1].x - wider.points[0].x, wider.points[1].y - wider.points[0].y)
    > Math.hypot(geometry.points[1].x - geometry.points[0].x, geometry.points[1].y - geometry.points[0].y));
  for (const format24 of [true, false]) for (let minute = 0; minute < 1440; minute++) {
    const digits = cc9.displayDigits(minute, format24), hands = cc9.digitPose(digits);
    assert.equal(hands.length, 18); assert.ok(hands.every(hand => hand.used && Number.isFinite(hand.angle)));
    sameAngle(hands[16].angle, (minute % 60) * Math.PI / 30 - Math.PI / 2);
    sameAngle(hands[17].angle, (minute % 720) * Math.PI / 360 - Math.PI / 2);
  }
  assert.equal(cc9.Settings.fields.visibility, undefined);
  assert.equal(cc9.Settings.normalize({ centerHourLength: 5 }).centerHourLength, 50);
});

test('circular geometry fits square, landscape, portrait and minimum canvases without clipping', () => {
  for (const model of Circular.models) for (const [width, height] of [[240, 240], [1080, 1080], [1920, 1080], [1080, 1920]]) {
    for (const radius of [20, model.Settings.fields.radius.max]) for (const gap of [0, 40]) for (const offset of [-100, 0, 100]) {
      const geometry = model.geometry(width, height, { radius, gap, padding: 160, scale: 100, offsetX: offset, offsetY: offset });
      const epsilon = 1e-8;
      assert.equal(geometry.layout, 'circular'); assert.equal(geometry.points.length, model.count);
      assert.equal(geometry.boardWidth, geometry.boardHeight); assert.equal(geometry.width, geometry.height);
      assert.ok(geometry.width > 0 && geometry.x >= geometry.padding - epsilon && geometry.y >= geometry.padding - epsilon);
      assert.ok(geometry.x + geometry.width <= width - geometry.padding + epsilon);
      assert.ok(geometry.y + geometry.height <= height - geometry.padding + epsilon);
      const half = geometry.boardWidth / 2;
      assert.equal(new Set(geometry.points.map(point => point.x + ':' + point.y)).size, model.count);
      geometry.points.forEach((point, index) => {
        assert.equal(point.i, index * 2); assert.equal(point.radius, radius);
        assert.ok(Math.hypot(point.x - half, point.y - half) + radius + 2 < half);
      });
    }
  }
});

test('61c compact digits remain distinct and every minute produces valid poses', () => {
  assert.equal(new Set(Array.from({ length: 10 }, (_, digit) => JSON.stringify(amt61c.digitPose(String(digit).repeat(4))))).size, 10);
  const geometry = amt61c.geometry(1080, 1080, {}), center = geometry.boardHeight / 2, step = amt61c.Settings.defaults.radius * 2 + amt61c.Settings.defaults.gap;
  for (const format24 of [true, false]) for (let minute = 0; minute < 1440; minute++) {
    const digits = amt61c.displayDigits(minute, format24), pose = amt61c.digitPose(digits);
    assert.equal(pose.length, 122); assert.ok(pose.every(hand => Number.isFinite(hand.angle)));
    geometry.points.forEach(point => {
      if (Math.abs(point.y - center) > step + .001 || Math.abs(point.x - center) < .001) {
        assert.ok(!pose[point.i].used && !pose[point.i + 1].used);
      }
    });
    assert.ok(pose.some(hand => hand.used));
  }
});

test('circular transitions stay continuous, honor idle visibility and settle on the target time', () => {
  for (const model of Circular.models) for (const motion of ['wave', 'spin', 'quiet', 'none']) for (const duration of [1, 6, 10]) {
    for (const visibility of ['show', 'hide', 'ghost']) {
      const clock = model.create({ motion, duration, visibility }); clock.initialize(1439, 0); clock.animate(0, 100);
      const middle = 100 + duration * 500; clock.sample(middle);
      const before = clock.hands.map(hand => ({ angle: hand.angle, opacity: hand.opacity }));
      clock.animate(610, middle); clock.sample(middle);
      if (motion !== 'none') clock.hands.forEach((hand, index) => {
        sameAngle(hand.angle, before[index].angle); assert.ok(Math.abs(hand.opacity - before[index].opacity) < 1e-8);
      });
      const end = middle + duration * 1000; clock.sample(end);
      const target = model.digitPose('1010');
      clock.hands.forEach((hand, index) => {
        sameAngle(hand.angle, target[index].angle);
        assert.equal(hand.opacity, (target[index].used || target[index ^ 1].used) || visibility === 'show' ? 1 : visibility === 'ghost' ? .12 : 0);
      });
      assert.equal(clock.isAnimating(end), false);
    }
  }
  for (const model of Circular.models) {
    const reduced = model.create({}, { reducedMotion: true }); reduced.initialize(0, 0); reduced.animate(1439, 100);
    reduced.hands.forEach(hand => { assert.ok(Math.abs(hand.to - hand.from) <= Math.PI + 1e-8); assert.equal(hand.fadeEnd, 400); });
  }
});

test('Zephyr arranges by position, holds, performs the wind, then forms the time', () => {
  const model = amt61c;
  for (const motion of ['wave', 'spin']) {
    const clock = model.create({ motion, duration: 10, visibility: 'hide' });
    clock.initialize(0, 0); clock.animate(610, 100);
    clock.sample(1100); assert.equal(clock.getStage(1100), '逐位整理');
    clock.sample(2600); assert.equal(clock.getStage(2600), '统一停留');
    clock.hands.forEach((hand, index) => {
      sameAngle(hand.angle, 0);
      assert.equal(hand.opacity, 1, 'idle hands also fully participate in the performance');
    });
    const held = clock.hands.map(hand => hand.angle); clock.sample(2800);
    clock.hands.forEach((hand, index) => sameAngle(hand.angle, held[index]));
    clock.sample(5100); assert.equal(clock.getStage(5100), '风势流动');
    const leading = [];
    for (let index = 0; index < model.handCount; index += 2) {
      const a = clock.hands[index].angle, b = clock.hands[index + 1].angle;
      sameAngle(a + b, 0);
      leading.push(Math.round(Math.cos(a) * 1e6));
    }
    assert.equal(new Set(leading).size === 1, motion === 'spin', 'waves vary across axes; synchronous mode stays together');
    clock.sample(8100); assert.equal(clock.getStage(8100), '逐针成型');
    clock.sample(9500); assert.equal(clock.getStage(9500), '读时停留');
    const pose = model.digitPose('1010');
    clock.hands.forEach((hand, index) => { sameAngle(hand.angle, pose[index].angle); assert.equal(hand.opacity, (pose[index].used || pose[index ^ 1].used) ? 1 : 0); });
    clock.sample(10100); assert.equal(clock.getStage(10100), ''); assert.equal(clock.isAnimating(10100), false);
    clock.hands.forEach((hand, index) => assert.equal(hand.opacity, (pose[index].used || pose[index ^ 1].used) ? 1 : 0));
  }
});

test('Zephyr wind has repeated openings and changing speed, with a travelling column delay', () => {
  const wind = amt61c.create({ motion: 'wave', duration: 53, visibility: 'hide' });
  wind.initialize(574, 0); wind.animate(575, 100);
  const start = 100 + 53e3 * .28, end = 100 + 53e3 * .80;
  wind.sample(start); const aligned = wind.hands.map(hand => hand.angle);
  const speeds = [];
  for (let now = start + 5000; now < end - 1000; now += 500) {
    wind.sample(now); const before = wind.hands[40].angle;
    wind.sample(now + 10); speeds.push((wind.hands[40].angle - before) / 10);
    assert.ok(wind.hands.every(hand => now < hand.revealEnd || hand.opacity === 1), 'each idle hand fully participates after its local reveal');
  }
  const moving = speeds.filter(speed => speed > 1e-7);
  assert.ok(Math.max(...moving) > Math.min(...moving) * 1.7, 'wind has substantial speed variation rather than uniform rotation');
  wind.sample(start + 1000);
  const geometry = amt61c.geometry(1080, 1080, {});
  const centerRow = geometry.points.filter(point => Math.abs(point.y - geometry.boardHeight / 2) < 1e-6);
  const left = centerRow[0].i, right = centerRow[8].i;
  assert.ok(wind.hands[left].angle > aligned[left] + .02, 'wind reaches the left edge first');
  sameAngle(wind.hands[right].angle, aligned[right]);
  wind.sample(end);
  wind.hands.forEach((hand, index) => assert.ok(Math.abs(hand.angle - aligned[index]) > Math.PI * 3.5, 'each hand performs multiple rotations'));
});

const zephyrCell = (row, col) => {
  const geometry = amt61c.geometry(1080, 1080, {}), center = geometry.boardHeight / 2;
  const step = amt61c.Settings.defaults.radius * 2 + amt61c.Settings.defaults.gap;
  return geometry.points.find(point => Math.abs(point.x - center - (col - 4) * step) < 1e-6
    && Math.abs(point.y - center - (row - 4) * step) < 1e-6).i;
};

test('Zephyr opening follows the observed horizontal and vertical position delays', () => {
  const clock = amt61c.create({ duration: 53.12, visibility: 'show' }); clock.initialize(574, 0); clock.animate(575, 0);
  const center = zephyrCell(4, 4), middle = zephyrCell(2, 4), outer = zephyrCell(0, 4);
  clock.sample(5000);
  assert.ok(clock.hands[center].angle < clock.hands[middle].angle);
  assert.ok(clock.hands[middle].angle < clock.hands[outer].angle);
  assert.ok(clock.hands[center].angle < Math.PI / 4, 'central decorations already point near right');
  assert.ok(clock.hands[outer].angle > Math.PI * .70, 'outer decorations still point near their initial diagonal');
  assert.ok(clock.hands[zephyrCell(1, 1)].angle < clock.hands[zephyrCell(1, 4)].angle);
  sameAngle(clock.hands[zephyrCell(1, 7)].angle, Math.PI * .75);
  for (let now = 0; now <= 10624; now += 40) {
    clock.sample(now);
    for (const [row, col] of [[0, 4], [1, 1], [2, 1], [1, 7]]) for (let hand = 0; hand < 2; hand++) {
      sameAngle(clock.hands[zephyrCell(row, col) + hand].angle, clock.hands[zephyrCell(8 - row, col) + hand].angle);
    }
    sameAngle(clock.hands[zephyrCell(3, 5)].angle, 0);
    sameAngle(clock.hands[zephyrCell(3, 5) + 1].angle, 0);
    sameAngle(clock.hands[zephyrCell(3, 0) + 1].angle, 0);
    assert.ok(clock.hands[center].angle >= -1e-9 && clock.hands[center].angle <= Math.PI * .75 + 1e-9,
      'decorations turn counterclockwise from the lower-left diagonal to right without a lap');
    sameAngle(clock.hands[center].angle, clock.hands[center + 1].angle);
  }
  clock.sample(11000); clock.hands.forEach(hand => sameAngle(hand.angle, 0));
});

test('Zephyr return keeps each winding direction and lets motors finish independently', () => {
  for (const motion of ['wave', 'spin']) for (const duration of [1, 18, 120]) for (const minute of [0, 575, 1439]) {
    const clock = amt61c.create({ motion, duration, visibility: 'show' }); clock.initialize(610, 0); clock.animate(minute, 100);
    const finish = 100 + duration * 1000 * .94;
    const returnStart = 100 + duration * 1000 * .80;
    clock.sample(returnStart); let previous = clock.hands.map(hand => hand.angle);
    const starts = [...previous];
    for (let frame = 1; frame <= 120; frame++) {
      clock.sample(returnStart + (finish - returnStart) * frame / 120);
      clock.hands.forEach((hand, index) => {
        assert.ok((hand.angle - previous[index]) * (index % 2 ? -1 : 1) >= -1e-9, 'each motor keeps its wind direction');
        assert.ok(Math.abs(hand.angle - previous[index]) < .5, 'forming has no jumps or hidden angle wrapping');
      });
      previous = clock.hands.map(hand => hand.angle);
    }
    assert.ok(new Set(clock.hands.map(hand => hand.motionEnd)).size > 3, 'motor completion times depend on position and remaining stroke');
    clock.hands.forEach(hand => assert.ok(hand.motionEnd <= finish));
    clock.hands.forEach((hand, index) => assert.ok(Math.abs(hand.to - starts[index]) <= Math.PI * 2 + 1e-8, 'no blanket extra revolution'));
    clock.sample(finish);
    clock.hands.forEach((hand, index) => sameAngle(hand.angle, amt61c.digitPose(amt61c.displayDigits(minute))[index].angle));
    const early = clock.hands.findIndex(hand => hand.motionEnd < finish - duration * 20);
    assert.ok(early >= 0);
    clock.sample(clock.hands[early].motionEnd); const stopped = clock.hands[early].angle;
    clock.sample(finish - 1); assert.equal(clock.hands[early].angle, stopped, 'early arrivals hold until the rest finishes');
    clock.sample(finish + 1);
    clock.hands.forEach((hand, index) => sameAngle(hand.angle, amt61c.digitPose(amt61c.displayDigits(minute))[index].angle));
  }
});

test('Zephyr return decorations share column timing and converge from their wind phases', () => {
  const clock = amt61c.create({ duration: 53.12, visibility: 'show' }); clock.initialize(574, 0); clock.animate(575, 0);
  const returnStart = 53120 * .80, finish = 53120 * .94;
  const left = zephyrCell(1, 1), right = zephyrCell(1, 7), center = zephyrCell(4, 4);
  clock.sample(returnStart);
  const separation = Math.abs(shortAngle(clock.hands[left].angle - clock.hands[right].angle));
  assert.ok(separation > .5, 'the forming stage inherits the horizontal wave instead of aligning first');
  for (let now = returnStart; now <= finish; now += 40) {
    clock.sample(now);
    for (let row = 0; row < 9; row++) for (let hand = 0; hand < 2; hand++) {
      const cell = zephyrCell(row, 4);
      assert.ok(Math.abs(shortAngle(clock.hands[cell + hand].angle - clock.hands[center + hand].angle)) < .14,
        'the central decorative column no longer repeats the large opening delay');
    }
    for (const [row, col] of [[0, 4], [1, 1], [2, 1], [1, 7]]) for (let hand = 0; hand < 2; hand++) {
      sameAngle(clock.hands[zephyrCell(row, col) + hand].angle, clock.hands[zephyrCell(8 - row, col) + hand].angle);
    }
  }
  clock.sample(finish);
  for (const cell of [left, right, center]) for (let hand = 0; hand < 2; hand++) sameAngle(clock.hands[cell + hand].angle, Math.PI * .75);
  assert.ok(new Set(Array.from({ length: 9 }, (_, row) => clock.hands[zephyrCell(row, 4)].motionEnd)).size === 1,
    'same-column decorations share completion timing');
});

test('Zephyr enters its final return continuously and preserves the wind when live time changes', () => {
  const clock = amt61c.create({ duration: 53 }); clock.initialize(574, 0); clock.animate(575, 100);
  const boundary = 100 + 53e3 * .80;
  clock.sample(boundary - .1); const before = clock.hands.map(hand => hand.angle);
  clock.sample(boundary); const at = clock.hands.map(hand => hand.angle);
  clock.sample(boundary + .1);
  clock.hands.forEach((hand, index) => {
    const left = at[index] - before[index], right = hand.angle - at[index];
    assert.ok(Math.abs(left - right) < Math.abs(left) * .002, 'both hands keep velocity continuity from wind into forming');
    assert.equal(Math.sign(right), index % 2 ? -1 : 1, 'return starts by continuing the opening motion rather than forcing both hands clockwise');
  });
  const other = amt61c.create({ duration: 53 }); other.initialize(574, 0); other.animate(575, 100);
  clock.initialize(574, 0); clock.animate(575, 100);
  clock.retarget(576, 20000);
  for (const now of [20000, 25000, 35000, boundary - 1]) {
    clock.sample(now); other.sample(now);
    clock.hands.forEach((hand, index) => assert.equal(hand.angle, other.hands[index].angle, 'retargeting preserves the remaining wind choreography'));
  }
  clock.sample(53100);
  clock.hands.forEach((hand, index) => sameAngle(hand.angle, amt61c.digitPose('0936')[index].angle));
});

test('Zephyr live retargeting preserves motor angles, velocities and winding directions', () => {
  for (const progress of [.80, .85, .93, .97]) {
    const clock = amt61c.create({ duration: 53, visibility: 'show' }); clock.initialize(574, 0); clock.animate(575, 100);
    const now = 100 + progress * 53000; clock.sample(now);
    let previous = clock.hands.map(hand => hand.angle);
    clock.sample(now - .01); const before = clock.hands.map(hand => hand.angle);
    clock.retarget(576, now); clock.sample(now);
    clock.hands.forEach((hand, index) => assert.equal(hand.angle, previous[index]));
    clock.sample(now + .01);
    clock.hands.forEach((hand, index) => assert.ok(Math.abs((hand.angle - previous[index]) - (previous[index] - before[index])) < 1e-7,
      'retargeting carries the sampled single-motor velocity'));
    for (let frame = 1; frame <= 100; frame++) {
      clock.sample(now + (53100 - now) * frame / 100);
      for (let index = 0; index < clock.hands.length; index += 2) {
        const da = clock.hands[index].angle - previous[index], db = clock.hands[index + 1].angle - previous[index + 1];
        assert.ok(da >= -1e-9 && db <= 1e-9, 'retargeting preserves each motor winding direction');
      }
      previous = clock.hands.map(hand => hand.angle);
    }
    clock.hands.forEach((hand, index) => sameAngle(hand.angle, amt61c.digitPose('0936')[index].angle));
  }
});

test('Zephyr forming retains relative opening travel beyond one full turn', () => {
  const clock = amt61c.create({ duration: 53 }); clock.initialize(574, 0); clock.animate(575, 100);
  clock.sample(100 + 53000 * .80);
  const initialGaps = Array.from({ length: 61 }, (_, index) => clock.hands[index * 2].angle - clock.hands[index * 2 + 1].angle);
  clock.sample(100 + 53000 * .94);
  const gapTravel = initialGaps.map((gap, index) => clock.hands[index * 2].angle - clock.hands[index * 2 + 1].angle - gap);
  assert.ok(gapTravel.every(travel => travel >= -1e-9));
  assert.ok(gapTravel.some(travel => travel > Math.PI * 2), 'relative opening is not clamped to the shortest angle or 360 degrees');
  clock.hands.forEach((hand, index) => sameAngle(hand.angle, amt61c.digitPose('0935')[index].angle));
});

test('Zephyr pair winding reaches every minute without swapping the two hands', () => {
  for (const format24 of [true, false]) {
    const clock = amt61c.create({ duration: 1, format24 }); clock.initialize(0, 0);
    for (let minute = 0; minute < 1440; minute++) {
      const start = minute * 1200; clock.animate(minute, start, true); clock.sample(start + 1000);
      const pose = amt61c.digitPose(amt61c.displayDigits(minute, format24));
      clock.hands.forEach((hand, index) => {
        sameAngle(hand.angle, pose[index].angle);
        assert.equal(hand.used, pose[index].used);
      });
    }
  }
});

test('Zephyr visibility changes during the final fade preserve the current opacity', () => {
  const clock = amt61c.create({ duration: 18, visibility: 'hide' }); clock.initialize(574, 0); clock.animate(575, 100);
  const now = 17600; clock.sample(now); const opacity = clock.hands.map(hand => hand.opacity);
  clock.update({ visibility: 'ghost' }, now); clock.sample(now);
  clock.hands.forEach((hand, index) => assert.ok(Math.abs(hand.opacity - opacity[index]) < 1e-9));
  clock.sample(19000);
  clock.hands.forEach((hand, i) => assert.equal(hand.opacity, hand.used || clock.hands[i ^ 1].used ? 1 : .12));
});

test('CC9 moves clockwise on every frame and all hands finish together', () => {
  for (const motion of ['wave', 'spin']) for (const duration of [1, 18, 120]) for (const minute of [0, 610, 830, 1439]) {
    const clock = cc9.create({ motion, duration }); clock.initialize(325, 0); clock.animate(minute, 100);
    let previous = clock.hands.map(hand => hand.angle);
    const frameCount = duration * 30;
    for (let frame = 1; frame <= frameCount; frame++) {
      clock.sample(100 + frame * 1000 / 30);
      clock.hands.forEach((hand, index) => {
        assert.ok(hand.angle >= previous[index] - 1e-10, `${motion}, ${duration}s, ${minute}, frame ${frame}, hand ${index} reversed`);
        assert.equal(hand.opacity, 1);
      });
      previous = clock.hands.map(hand => hand.angle);
    }
    const pose = cc9.digitPose(cc9.displayDigits(minute));
    const finish = 100 + duration * 1000;
    clock.hands.forEach((hand, index) => {
      sameAngle(hand.angle, pose[index].angle);
      assert.equal(hand.motionEnd, finish, 'all 18 motors share the exact finish');
    });
    clock.sample(finish - 20); const approaching = clock.hands.map(hand => hand.angle);
    clock.sample(finish - 10);
    clock.hands.forEach((hand, index) => {
      assert.ok(hand.angle > approaching[index], 'every hand keeps moving until the shared finish');
      assert.ok(hand.angle < hand.to, 'no hand arrives early');
    });
    clock.sample(finish + 100);
    clock.hands.forEach((hand, index) => sameAngle(hand.angle, pose[index].angle));
    assert.equal(clock.isAnimating(100 + duration * 1000), false);
  }
});

test('CC9 meets fixed parallel straight lines, sweeps together, then forms with changing speeds', () => {
  const commonPoses = [];
  for (const minute of [610, 830]) {
    const clock = cc9.create({ duration: 18 }); clock.initialize(0, 0); clock.animate(minute, 100);
    const alignedAt = 100 + 18000 * .18;
    clock.sample(alignedAt - .1); const before = clock.hands.map(hand => hand.angle);
    clock.sample(alignedAt); const aligned = clock.hands.map(hand => hand.angle);
    clock.sample(alignedAt + .1); const after = clock.hands.map(hand => hand.angle);
    aligned.forEach((angle, index) => {
      sameAngle(2 * angle, -Math.PI / 2);
      if (index % 2 === 0) sameAngle(aligned[index + 1] - angle, Math.PI);
      assert.ok(angle > before[index] && after[index] > angle, 'synchronization never inserts a hold');
      assert.ok(Math.abs((angle - before[index]) - (after[index] - angle)) < (after[index] - angle) * .001, 'speed stays continuous at synchronization');
    });
    clock.sample(alignedAt + 500); const swept = clock.hands.map(hand => hand.angle);
    swept.forEach((angle, index) => {
      sameAngle(2 * angle, 2 * swept[0]);
      assert.ok(Math.abs((angle - aligned[index]) - (swept[0] - aligned[0])) < 1e-8, 'parallel lines keep a common sweep speed');
    });
    commonPoses.push(aligned.slice(0, 2));
    clock.sample(9100); const partial = clock.hands.map(hand => hand.angle);
    clock.sample(9200);
    const steps = clock.hands.map((hand, index) => hand.angle - partial[index]);
    assert.ok(steps.every(step => step > 0), 'all hands continue clockwise');
    assert.ok(Math.max(...steps) > Math.min(...steps) * 1.5, 'different remaining arcs use visibly different return speeds');
    assert.equal(new Set(clock.hands.map(hand => hand.motionEnd)).size, 1, 'different speeds still finish at one time');
  }
  sameAngle(commonPoses[0][0], commonPoses[1][0]);
  sameAngle(commonPoses[0][1], commonPoses[1][1]);
});

test('CC9 forms the perimeter from a consistent long-arm side and retains the longer central minute-hand trip', () => {
  const clock = cc9.create({ duration: 18 }); clock.initialize(609, 0); clock.animate(610, 100);
  clock.sample(100 + 18000 * .18); const common = clock.hands.map(hand => hand.angle);
  clock.sample(18100);
  const arcs = clock.hands.map((hand, index) => (hand.angle - common[index]) / Math.PI);
  // Long arms all leave 315°, short arms 135°. The former positional lane
  // reversals gave different tours on E/SE/S/SW despite identical line axes.
  const expected = [1, 1.5, 1.5, 1.5, 1.5, 2, 2, 2, 2, .5, .5, .5, .5, 1, 1, 1];
  expected.forEach((turns, index) => assert.ok(Math.abs(arcs[index] - turns) < 1e-8));
  assert.ok(arcs[16] > 2, 'center minute hand keeps its full winding');
  assert.ok(arcs[17] < .5, 'center hour hand may take a much shorter route');
});

test('CC9 keeps velocity at the common sweep, forming boundary, and moving replays', () => {
  const clock = cc9.create({ duration: 18 }); clock.initialize(609, 0); clock.animate(610, 100);
  for (const now of [100 + 18000 * .18, 100 + 18000 * (.18 + .82 * .22)]) {
    clock.sample(now - .01); const before = clock.hands.map(hand => hand.angle);
    clock.sample(now); const at = clock.hands.map(hand => hand.angle);
    clock.sample(now + .01);
    clock.hands.forEach((hand, index) => assert.ok(Math.abs((hand.angle - at[index]) - (at[index] - before[index])) < 1e-8));
  }
  const now = 9100;
  clock.sample(now - .01); const before = clock.hands.map(hand => hand.angle);
  clock.sample(now); const at = clock.hands.map(hand => hand.angle);
  clock.animate(610, now, true); clock.sample(now);
  clock.hands.forEach((hand, index) => assert.equal(hand.angle, at[index]));
  clock.sample(now + .01);
  clock.hands.forEach((hand, index) => assert.ok(Math.abs((hand.angle - at[index]) - (at[index] - before[index])) < 1e-8));
});

test('CC9 gives equal-length arcs different position rhythms', () => {
  const clock = cc9.create({ duration: 18 }); clock.initialize(609, 0); clock.animate(610, 100);
  clock.sample(100 + 18000 * .18); const aligned = clock.hands.map(hand => hand.angle);
  clock.sample(100 + 18000 * .65);
  const north = clock.hands[1].angle - aligned[1], northEast = clock.hands[3].angle - aligned[3];
  assert.ok(northEast - north > Math.PI / 18, 'the NE pair accelerates ahead of an equal-length N arc');
  clock.sample(18100);
  assert.ok(Math.abs((clock.hands[1].angle - aligned[1]) - (clock.hands[3].angle - aligned[3])) < 1e-8,
    'different rhythms still cover the same arc at the common finish');
});

test('CC9 live minute changes preserve the perimeter and single-motor velocities', () => {
  for (const progress of [.1, .3, .6, .9]) {
    const clock = cc9.create({ duration: 18 }), control = cc9.create({ duration: 18 });
    for (const instance of [clock, control]) { instance.initialize(609, 0); instance.animate(610, 100); }
    const now = 100 + 18000 * progress;
    clock.sample(now - .01); const before = clock.hands.map(hand => hand.angle);
    clock.sample(now); const at = clock.hands.map(hand => hand.angle);
    clock.retarget(611, now); clock.sample(now);
    clock.hands.forEach((hand, index) => assert.equal(hand.angle, at[index]));
    clock.sample(now + .01);
    clock.hands.forEach((hand, index) => assert.ok(Math.abs((hand.angle - at[index]) - (at[index] - before[index])) < 1e-8));
    for (const future of [now + 1, (now + 18100) / 2, 18100]) {
      clock.sample(future); control.sample(future);
      for (let index = 0; index < 16; index++) assert.equal(clock.hands[index].angle, control.hands[index].angle);
    }
  }
});

test('CC9 late live changes do not add full perimeter laps near the finish', () => {
  const clock = cc9.create({ duration: 18 }); clock.initialize(609, 0); clock.animate(610, 100);
  const now = 18100 - .001; clock.sample(now); const before = clock.hands.map(hand => hand.angle);
  clock.retarget(611, now);
  for (let index = 0; index < 16; index++) assert.ok(clock.hands[index].to - before[index] < .001);
  clock.sample(now + 350);
  clock.hands.forEach((hand, index) => sameAngle(hand.angle, cc9.digitPose('1011')[index].angle));
});

test('CC9 reaches every minute in both formats without changing physical hand identities', () => {
  for (const format24 of [true, false]) {
    const clock = cc9.create({ duration: 1, format24 }); clock.initialize(0, 0);
    for (let minute = 0; minute < 1440; minute++) {
      const now = minute * 1200; clock.animate(minute, now, true); clock.sample(now + 1000);
      clock.hands.forEach((hand, index) => sameAngle(hand.angle, cc9.digitPose(cc9.displayDigits(minute, format24))[index].angle));
    }
  }
});

test('CC9 live retargeting keeps the current angles and a shared clockwise finish', () => {
  for (const progress of [.1, .3, .6, .9, .999]) {
    const clock = cc9.create({ duration: 18 }); clock.initialize(610, 0); clock.animate(611, 100);
    const now = 100 + progress * 18000; clock.sample(now);
    let previous = clock.hands.map(hand => hand.angle);
    assert.equal(clock.retarget(612, now), true); clock.sample(now);
    clock.hands.forEach((hand, index) => assert.equal(hand.angle, previous[index], 'changing the live minute preserves the current frame'));
    const finish = Math.max(18100, now + 350);
    clock.hands.forEach(hand => assert.equal(hand.motionEnd, finish));
    for (let frame = 1; frame <= 120; frame++) {
      clock.sample(now + (finish - now) * frame / 120);
      clock.hands.forEach((hand, index) => assert.ok(hand.angle >= previous[index] - 1e-10, 'retargeting never moves a hand backwards'));
      previous = clock.hands.map(hand => hand.angle);
    }
    clock.hands.forEach((hand, index) => sameAngle(hand.angle, cc9.digitPose('1012')[index].angle));
    assert.equal(clock.isAnimating(finish), false);
  }
});

test('CC9 can switch from a running clockwise performance to quiet or reduced motion without a jump', () => {
  for (const reducedMotion of [false, true]) {
    const clock = cc9.create({ duration: 18 }, { reducedMotion }); clock.initialize(0, 0); clock.animate(610, 100);
    clock.sample(200); const before = clock.hands.map(hand => hand.angle);
    clock.update({ motion: 'quiet' }, 200); clock.animate(611, 200); clock.sample(200);
    clock.hands.forEach((hand, index) => sameAngle(hand.angle, before[index]));
    clock.sample(18200);
    clock.hands.forEach((hand, index) => sameAngle(hand.angle, cc9.digitPose('1011')[index].angle));
  }
});

test('restarting, changing colors and changing idle visibility preserve every choreography stage', () => {
  for (const model of Circular.models) for (const progress of [.1, .25, .5, .8, .97]) {
    const clock = model.create({ duration: 10 }); clock.initialize(0, 0); clock.animate(610, 100);
    const now = 100 + progress * 10000; clock.sample(now);
    const before = clock.hands.map(hand => ({ angle: hand.angle, opacity: hand.opacity }));
    clock.update({ long: '#abcdef', visibility: 'show' }, now); clock.sample(now);
    clock.hands.forEach((hand, index) => {
      sameAngle(hand.angle, before[index].angle); assert.ok(Math.abs(hand.opacity - before[index].opacity) < 1e-8);
    });
    clock.animate(1439, now); clock.sample(now);
    clock.hands.forEach((hand, index) => {
      sameAngle(hand.angle, before[index].angle); assert.ok(Math.abs(hand.opacity - before[index].opacity) < 1e-8);
    });
    assert.equal(clock.getStage(now), model === cc9 ? '顺时针对齐' : '逐位整理');
    clock.sample(now + 10000);
    clock.hands.forEach((hand, index) => sameAngle(hand.angle, model.digitPose('2359')[index].angle));
  }
  for (const model of Circular.models) {
    const quiet = model.create({ motion: 'quiet' }), reduced = model.create({}, { reducedMotion: true });
    for (const clock of [quiet, reduced]) { clock.initialize(0, 0); clock.animate(610, 100); assert.equal(clock.getStage(200), ''); }
    const long = model.create({ duration: 120 }); long.initialize(0, 0); long.animate(610, 100); long.sample(120100);
    assert.equal(long.isAnimating(120100), false);
  }
});

test('live minute changes update the final time without restarting a long performance', () => {
  for (const model of Circular.models) for (const progress of [.25, .5, .8, .97]) {
    const clock = model.create({ duration: 120, visibility: 'ghost' }); clock.initialize(610, 0); clock.animate(611, 100);
    const now = 100 + progress * 120000; clock.sample(now);
    const before = clock.hands.map(hand => ({ angle: hand.angle, opacity: hand.opacity }));
    const oldStage = clock.getStage(now);
    assert.equal(clock.retarget(612, now), true); clock.sample(now);
    assert.equal(clock.state.minuteKey, '1012');
    assert.equal(clock.getStage(now), model === cc9 ? oldStage : progress < .80 ? oldStage : '逐针成型');
    clock.hands.forEach((hand, index) => {
      sameAngle(hand.angle, before[index].angle); assert.ok(Math.abs(hand.opacity - before[index].opacity) < 1e-8);
    });
    clock.sample(120100);
    assert.equal(clock.isAnimating(120100), false);
    const pose = model.digitPose('1012');
    clock.hands.forEach((hand, index) => {
      sameAngle(hand.angle, pose[index].angle); assert.equal(hand.opacity, (pose[index].used || pose[index ^ 1].used) ? 1 : .12);
    });
  }
});

test('circular configuration imports select the correct model and reject other categories and invalid values', () => {
  for (const model of Circular.models) {
    const settings = model.Settings.normalize({ source: 'manual', manualTime: '23:59', background: '#123456', radius: 27.3, gap: 9.2 });
    const text = Config.serialize(model, settings), imported = Circular.parse(text);
    assert.equal(imported.model, model); assert.deepEqual(imported.settings, settings);
    assert.equal(JSON.parse(text).type, 'circular');
    for (const patch of [{ radius: -10 }, { manualTime: '25:00' }, { motion: 'unknown' }]) {
      assert.throws(() => Circular.parse(JSON.stringify({ version: 2, type: 'circular', model: model.id, settings: patch })), /无效/);
    }
  }
  for (const model of [require('../src/models/landscape.js').get('clockclock24'), require('../src/models/portrait.js').get('amt72v')]) {
    assert.throws(() => Circular.parse(Config.serialize(model, {})), /圆形配置/);
  }
  assert.throws(() => Circular.parse('{"version":1,"settings":{}}'), /圆形配置/);
  assert.throws(() => Circular.parse('null'), /圆形配置/);
});
