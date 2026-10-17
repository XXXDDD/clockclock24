'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const Classic = require('../src/web/classic.js');
const Collection = require('../src/web/classic-catalog.js');
const Config = require('../src/shared/config.js');
const Palette = require('../src/shared/palette.js');
const PaletteOptions = require('../src/web/palette-options.js');
const sources = ['circular', 'landscape', 'portrait'].map(kind => require('../src/models/' + kind + '.js'));
const catalogs = sources.map(Classic.catalog);

test('classic geometry matches independently rectified references and reprojects onto photographed axes', () => {
  const reference = {...require('./fixtures/classic-geometry.json'),...require('./fixtures/new-family-geometry.json')};
  const near = (actual, expected, tolerance, label) => assert.ok(Math.abs(actual - expected) <= tolerance,
    `${label}: ${actual} versus photographed ${expected}`);
  for (const model of catalogs.flatMap(catalog => catalog.models)) {
    const source = reference[model.family], [w, h] = source.boardPx;
    for (const [width, height] of [[1920, 1080], [1080, 1920], [320, 480]]) {
      const geometry = model.geometry(width, height, {}), first = geometry.points[0];
      const physical = model.sizeCm || source.sizeCm;
      near(geometry.boardWidth / geometry.boardHeight, physical[0] / physical[1], 1e-10, model.id + ' board aspect');
      near(geometry.width / geometry.height, geometry.boardWidth / geometry.boardHeight, 1e-10, model.id + ' display aspect');
      if (model.sizeCm) continue; // The expanded stone border has its own size assertion below.
      const pixelScale = w / geometry.boardWidth;
      const project = point => {
        const x = point.x / geometry.boardWidth, y = point.y / geometry.boardHeight, h = source.planeToSource;
        const z = h[2][0] * x + h[2][1] * y + h[2][2];
        return [(h[0][0] * x + h[0][1] * y + h[0][2]) / z, (h[1][0] * x + h[1][1] * y + h[1][2]) / z];
      };
      const errors = source.observedSourceAxes.map((point, index) => {
        const actual = project(geometry.points[index]);
        if (source.observedAxisDirections) {
          const direction = source.observedAxisDirections[index];
          return Math.abs((actual[0] - point[0]) * -direction[1] + (actual[1] - point[1]) * direction[0]);
        }
        return Math.hypot(actual[0] - point[0], actual[1] - point[1]);
      });
      const rms = Math.sqrt(errors.reduce((sum, value) => sum + value ** 2, 0) / errors.length);
      assert.ok(rms < (model.id === 'clockclock9' ? 2 : 1.6), model.id + ' reprojection RMS: ' + rms);
      assert.ok(Math.max(...errors) < 3, model.id + ' maximum reprojection error');
      if (model.id === 'clockclock9') {
        near((geometry.boardHeight / 2 - first.y) * pixelScale, source.outerAxisRadiusPx, .2, 'CC9 outer axis');
        near(model.Drawing.handLength(first, model.Settings.defaults, false) * pixelScale, source.armLengthPx, .2, 'CC9 arm');
        continue;
      }
      near((geometry.points[1].x - first.x) * pixelScale, source.pitchPx, .15, model.id + ' pitch');
      near(first.radius * pixelScale, source.radiusPx, .15, model.id + ' face rim');
      near(first.x * pixelScale, source.firstAxisPx[0], 1.5, model.id + ' horizontal axis inset');
      near(first.y * pixelScale, source.firstAxisPx[1], 1.5, model.id + ' vertical axis inset');
      const expectedEdge = source.firstAxisPx[0] - source.radiusPx;
      near((first.x - first.radius) * pixelScale, expectedEdge, 1.6, model.id + ' edge clearance');
      near(geometry.boardHeight * pixelScale, h, .02, model.id + ' physical height');
    }
  }
});

test('web catalog contains three categories and all 30 editions in implemented families', () => {
  assert.deepEqual(catalogs.map(catalog => catalog.models.length), [3, 23, 4]);
  assert.equal(new Set(catalogs.flatMap(c => c.models.map(m => m.id))).size, 30);
  assert.equal(catalogs.flatMap(c => c.models).filter(m => m.family === m.id).length, 10);
  for (const model of catalogs.flatMap(catalog => catalog.models)) {
    assert.match(model.reference, /^https:\/\/www\.humanssince1982\.com\/.+\/products\//);
    assert.match(model.motionReference, /^https:\/\/.+\.mp4/);
    for (const group of ['screen', 'time', 'motion', 'colors', 'geometry']) {
      assert.ok(Object.values(model.Settings.fields).some(field => field.group === group), model.id + ': ' + group);
    }
    assert.equal(model.Settings.defaults.motion, 'wave');
    if (model.id !== 'clockclock9') assert.equal(model.Settings.defaults.visibility, 'show');
  }
});

test('imports and URL-style overrides preserve complete customizations while official preset defaults stay intact', () => {
  for (const catalog of catalogs) for (const model of catalog.models) {
    const input = { canvasWidth: '1440', canvasHeight: '2560', offsetX: '17', offsetY: '-25', scale: '76', source: 'manual', manualTime: '23:59',
      timezone: 'Asia/Hong_Kong', playbackSpeed: '2', board: '#a95441', long: '#e8bd90', short: '#123456', background: '#17151e',
      motion: 'spin', duration: 6, visibility: 'hide', radius: 22, longLength: 71, shortLength: 56, centerHourLength: 50 };
    const data = { version: 2, type: model.type, model: model.id, settings: input };
    const normalized = model.Settings.normalize(input, input), imported = catalog.parse(JSON.stringify(data));
    assert.equal(imported.model, model);
    assert.deepEqual(imported.settings, normalized);
    assert.deepEqual(Config.parse(model, Config.serialize(model, normalized)), normalized);
    for (const key of ['canvasWidth', 'canvasHeight', 'offsetX', 'offsetY', 'scale', 'playbackSpeed']) assert.equal(normalized[key], Number(input[key]));
    for (const key of ['source', 'manualTime', 'timezone']) assert.equal(normalized[key], input[key]);
    for (const key of ['board', 'long', 'short', 'background', 'duration', 'visibility', 'radius', 'longLength', 'shortLength', 'centerHourLength']) {
      if (Object.hasOwn(model.Settings.fields, key)) assert.equal(normalized[key], input[key], model.id + ': ' + key);
    }
    const instance = model.create(input); instance.initialize(574, 0); instance.animate(575, 100);
    assert.equal(instance.state.motion, 'wave'); assert.equal(instance.state.board, input.board);
    assert.notEqual(model.Settings.defaults.board, input.board);
    instance.sample(100 + normalized.duration * 1000);
    const pose = model.digitPose('0935');
    instance.hands.forEach((hand, index) => {
      assert.ok(Math.abs(Math.sin(hand.angle) - Math.sin(pose[index].angle)) < 1e-8);
      assert.ok(Math.abs(Math.cos(hand.angle) - Math.cos(pose[index].angle)) < 1e-8);
      assert.equal(hand.opacity, normalized.visibility === 'hide' && !pose[index].used ? 0 : 1);
    });
  }
  const legacy = catalogs[1].parse(JSON.stringify({ version: 1, settings: { board: '#a95441', motion: 'orbit', scale: 67 } }));
  assert.equal(legacy.model.id, 'clockclock24'); assert.equal(legacy.settings.scale, 67);
  assert.equal(legacy.settings.board, '#a95441'); assert.equal(legacy.settings.motion, 'wave');
});

test('web configuration validation still rejects invalid usage values and category mismatches', () => {
  for (const catalog of catalogs) for (const model of catalog.models) {
    for (const input of [{ canvasWidth: 0 }, { playbackSpeed: 0 }, { manualTime: '24:00' }, { timezone: 'Invalid/Zone' },
      { board: 'not-a-color' }, { shortLength: 101 }, { longWidth: -1 }, { motion: 'unknown' }, { duration: 0 }]) {
      assert.throws(() => catalog.parse(JSON.stringify({ version: 2, type: model.type, model: model.id, settings: input })), /无效/);
    }
    const other = catalogs.find(entry => entry !== catalog).models[0];
    assert.throws(() => catalog.parse(Config.serialize(other, other.Settings.defaults)), /种类|类别/);
  }
});

test('web presets expose only reference actions and migrate removed modes without losing customizations', () => {
  for (const model of catalogs.flatMap(catalog => catalog.models)) {
    assert.deepEqual(model.Settings.fields.motion.options.map(([id]) => id), ['wave']);
    for (const motion of ['spin', 'quiet', 'none', 'orbit']) {
      const config = catalogs.find(c => c.get(model.id)).parse(JSON.stringify({ version: 2, type: model.type, model: model.id,
        settings: { motion, board: '#21444c', scale: 73, longLength: 83, shortLength: 67 } })).settings;
      assert.equal(config.motion, 'wave'); assert.equal(config.board, '#21444c');
      assert.equal(config.scale, 73); assert.equal(config.longLength, 83); assert.equal(config.shortLength, 67);
    }
  }
});

test('all 24 presets share three reference choices, preserve interrupted poses and reach arbitrary times', () => {
  const models = catalogs[1].models.filter(model => model.group === 'clockclock24');
  assert.equal(models.length, 11);
  for (const model of models) {
    assert.deepEqual(model.Settings.fields.choreography.options, [['scatter', '交错旋转'], ['diagonal', '斜线波浪'], ['tidal', '潮汐波浪']]);
    const clock = model.create({ duration: 6 }); clock.initialize(574, 0); clock.animate(575, 0);
    let now = 2000;
    for (const choreography of ['scatter', 'tidal', 'diagonal']) {
      clock.sample(now); const before = clock.hands.map(hand => hand.angle);
      clock.update({ choreography }, now); clock.animate(575, now, true); clock.sample(now);
      clock.hands.forEach((hand, i) => assert.ok(Math.abs(hand.angle - before[i]) < 1e-8, model.id + ': pose preserved'));
      assert.equal(clock.state.choreography, choreography);
      clock.retarget(428, now + 500); clock.sample(now + 7000);
      const pose = model.digitPose('0708');
      clock.hands.forEach((hand, i) => assert.ok(Math.abs(Math.atan2(Math.sin(hand.angle-pose[i].angle),Math.cos(hand.angle-pose[i].angle))) < 1e-8, model.id + ': final pose'));
      assert.equal(clock.isAnimating(now + 7000), false);
      now += 8000;
    }
  }
});

test('generated workbenches put model selection, time, playback, customization and configuration in order', () => {
  for (const page of ['index.html', 'circular.html', 'portrait.html']) {
    const html = fs.readFileSync(require.resolve('../' + page), 'utf8');
    assert.match(html, /id="modelOptions"/);
    for (const id of ['modelEdition', 'classicEdition', 'classicColors', 'classicMotion', 'modelReference', 'motionReference']) {
      assert.equal((html.match(new RegExp('id="' + id + '"', 'g')) || []).length, 1);
    }
    const order = ['selectionTitle', 'timeTitle', 'playbackTitle', 'customizationTitle', 'fields-motion', 'fields-colors', 'fullCustomization', 'fields-screen', 'fields-geometry', 'configTitle', 'configSnapshot'];
    const positions = order.map(id => html.indexOf('id="' + id + '"'));
    assert.ok(positions.every((position, i) => position >= 0 && (!i || position > positions[i-1])));
    assert.doesNotMatch(html, /BUILD:CLASSIC|BUILD:CANVAS-OPTIONS/);
  }
});

test('the full official collection has 30 distinct editions with an implementation and design for every entry', () => {
  assert.equal(Collection.entries.length, 30);
  assert.equal(new Set(Collection.entries.map(entry => entry.reference)).size, 30);
  assert.deepEqual(Collection.summary(), { total: 30, implemented: 30, planned: 0 });
  assert.deepEqual(Object.keys(Collection.categories).map(Collection.summary), [
    { total: 3, implemented: 3, planned: 0 },
    { total: 23, implemented: 23, planned: 0 },
    { total: 4, implemented: 4, planned: 0 }
  ]);
  const implemented = catalogs.flatMap(catalog => catalog.models);
  for (const entry of Collection.entries) {
    const model = implemented.find(model => model.reference === entry.reference);
    assert.equal(entry.implementation, model?.id || null, entry.reference);
    assert.equal(entry.status, model ? 'implemented' : 'planned');
    if (model) assert.equal(entry.edition, model.edition);
  }
  // Preserve these supplied URLs rather than inferring slugs from display names.
  assert.ok(Collection.entries.some(entry => entry.slug === 'cc24-dada-blue'));
  assert.ok(Collection.entries.some(entry => entry.slug === 'a-million-times-72-white-1' && entry.edition === 'White'));
  assert.deepEqual(Collection.entries.filter(e => !e.implementation), []);
  for (const entry of Collection.entries) assert.ok(fs.existsSync(entry.designPath),entry.designPath);
});

test('compact selectors group CCL under 24 and contain every available preset', () => {
  for (const category of Object.keys(Collection.categories)) {
    const html = Collection.renderPicker(category);
    assert.equal((html.match(/data-model=/g) || []).length, Collection.summary(category).implemented);
    for (const entry of Collection.inCategory(category)) {
      const card = html.match(new RegExp('<option[^>]+data-edition="' + entry.slug + '"[^>]*>[\\s\\S]*?</option>'))?.[0];
      assert.ok(card, entry.slug);
      assert.ok(card.includes('data-family="' + entry.group + '"'));
      if (!entry.implementation) {
        assert.match(card, /待实现/);
        assert.match(card, /<option[^>]+disabled/);
        assert.doesNotMatch(card, /<canvas|data-model=/);
      }
    }
    for (const family of new Set(Collection.inCategory(category).map(entry => entry.group))) {
      assert.ok(html.includes('<option value="' + family + '" data-name='));
    }
    assert.ok(!html.includes('<option value="clockclockl" data-name='));
  }
});

test('product progress and generated model lists stay in sync with the complete collection', () => {
  const product = fs.readFileSync(require.resolve('../product.md'), 'utf8');
  const recorded = product.split('<!-- BEGIN:CLASSIC-CATALOG -->')[1]?.split('<!-- END:CLASSIC-CATALOG -->')[0].trim();
  assert.equal(recorded?.replace(/\r\n/g, '\n'), Collection.markdown());
  for (const [category, page] of [['circular', 'circular.html'], ['landscape', 'index.html'], ['portrait', 'portrait.html']]) {
    const html = fs.readFileSync(require.resolve('../' + page), 'utf8');
    const slugs = [...html.matchAll(/data-edition="([^"]+)"/g)].map(match => match[1]);
    assert.deepEqual(slugs.sort(), Collection.inCategory(category).map(entry => entry.slug).sort());
    assert.doesNotMatch(html, /classicCatalog|catalog-shortcut|完整经典目录|BUILD:MODEL-OPTIONS/);
  }
});

test('model palettes include every preset color in picker order, including CCL within 24, without other models leaking in', () => {
  for (const catalog of catalogs) {
    const order = Collection.inCategory(catalog.models[0].type).map(entry => entry.implementation);
    for (const model of catalog.models) {
      const { originals, supplemental } = PaletteOptions.forModel(catalog.models, model, order);
      const expected = Collection.inCategory(model.type).filter(entry => entry.group === model.group).map(entry => entry.implementation);
      assert.deepEqual(originals.map(palette => palette.id), expected, model.id);
      for (const palette of originals) {
        assert.deepEqual(Palette.colors(palette), Palette.colors(catalog.get(palette.id).Settings.defaults), palette.id);
      }
      assert.equal(new Set(originals.map(palette => palette.id)).size, originals.length);
      assert.ok(supplemental.every(extra => !originals.some(original => Object.keys(Palette.fields).every(key => extra[key] === original[key]))));
    }
  }
});

test('applying model or supplemental colors preserves the current preset, choreography, time, canvas and hand proportions', () => {
  for (const catalog of catalogs) for (const model of catalog.models) {
    const original = model.Settings.normalize({ canvasWidth: 1440, canvasHeight: 900, scale: 74, longLength: 84,
      shortLength: 65, duration: 8, source: 'manual', manualTime: '13:27', playbackSpeed: 2,
      radius: 27, gap: 11, ...(model.group === 'clockclock24' ? { choreography: 'scatter' } : {}) });
    const { originals, supplemental } = PaletteOptions.forModel(catalog.models, model);
    for (const palette of [...originals, ...supplemental]) {
      const updated = model.Settings.normalize(Palette.colors(palette), original);
      assert.deepEqual(Palette.colors(updated), Palette.colors(palette));
      for (const key of Object.keys(original).filter(key => !Object.hasOwn(Palette.fields, key))) {
        assert.equal(updated[key], original[key], model.id + ': ' + key);
      }
      assert.deepEqual(catalog.parse(Config.serialize(model, updated)).settings, updated);
    }
  }
});
