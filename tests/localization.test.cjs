'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const I18n = require('../src/hosts/localization.js');
const Spec = require('../src/lively/classic-config.js');
const Engine = require('../src/hosts/wallpaper-engine/adapter.js');
const root = path.resolve(__dirname, '..');
const han = /[\u3400-\u9fff]/;

test('both native menus translate display text without translating stored values', () => {
  const input = { edition: 'amt61c-tidal', customColors: true, board: '#123456', scale: 73, timezone: 'Asia/Hong_Kong' };
  const en = Spec.livelyProperties(input), zh = Spec.livelyProperties(input, 'zh-CN');
  const translations = Spec.livelyLocalization(input).Languages['zh-CN'];
  assert.deepEqual(Object.keys(en), Object.keys(zh));
  assert.doesNotMatch(JSON.stringify(en), han);
  for (const [key, property] of Object.entries(en)) {
    assert.deepEqual({ ...property, ...translations[key] }, zh[key], key);
    if (Spec.fields[key]) {
      assert.equal(property.value, zh[key].value, key);
      assert.equal(Spec.decodeProperty(key, property.value), Spec.normalize(input)[key], key);
    }
  }
  const project = Engine.project(input);
  const { properties, localization } = project.general;
  assert.deepEqual(Object.keys(localization['en-us']), Object.keys(localization['zh-chs']));
  assert.doesNotMatch(JSON.stringify(localization['en-us']), han);
  for (const [key, property] of Object.entries(properties)) {
    assert.match(property.text, /^ui_/);
    assert.equal(localization['en-us'][property.text], I18n.field(key, Spec.fields[key]).label);
    assert.equal(localization['zh-chs'][property.text], Spec.fields[key].label);
    assert.equal(Engine.decode(key, property.value), Spec.normalize(input)[key], key);
    for (const [index, option] of (property.options || []).entries()) {
      assert.equal(option.value, Spec.fields[key].options[index][0]);
      for (const locale of ['en-us', 'zh-chs']) assert.ok(localization[locale][option.label], option.label);
    }
  }
});

function archiveEntries(file) {
  const bytes = fs.readFileSync(path.join(root, file)), entries = new Map();
  let offset = 0;
  while (bytes.readUInt32LE(offset) === 0x04034b50) {
    assert.equal(bytes.readUInt16LE(offset + 8), 0, 'release packages are deterministic stored ZIPs');
    const length = bytes.readUInt32LE(offset + 18), nameLength = bytes.readUInt16LE(offset + 26), extra = bytes.readUInt16LE(offset + 28);
    const name = bytes.toString('utf8', offset + 30, offset + 30 + nameLength), start = offset + 30 + nameLength + extra;
    entries.set(name, bytes.subarray(start, start + length)); offset = start + length;
  }
  return entries;
}

test('English-named release ZIPs include both languages and complete offline assets', () => {
  const lively = archiveEntries('TIMEFORM-Lively.zip');
  for (const name of ['index.html', 'configure.html', 'LivelyProperties.json', 'LivelyProperties.loc.json', 'LivelyInfo.loc.json', 'README.en.txt', 'README.zh-CN.txt']) assert.ok(lively.has(name), name);
  assert.deepEqual(JSON.parse(lively.get('LivelyProperties.loc.json')), Spec.livelyLocalization());
  assert.match(lively.get('configure.html').toString(), /id="interfaceLanguage"/);
  assert.doesNotMatch(lively.get('README.en.txt').toString(), han);
  assert.match(lively.get('README.zh-CN.txt').toString(), han);
  const engine = archiveEntries('dist/TIMEFORM-WallpaperEngine.zip');
  for (const name of ['index.html', 'project.json', 'README.en.txt', 'README.zh-CN.txt']) assert.ok(engine.has(name), name);
  assert.deepEqual(JSON.parse(engine.get('project.json')), Engine.project());
  assert.doesNotMatch(engine.get('README.en.txt').toString(), han);
});

test('browser language selection has an English fallback', () => {
  for (const locale of ['zh', 'zh-CN', 'zh-TW', 'zh-Hant']) assert.equal(I18n.language(locale), 'zh-CN');
  for (const locale of ['en-US', 'de-DE', undefined, '']) assert.equal(I18n.language(locale), 'en');
});
