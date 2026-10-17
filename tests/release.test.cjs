'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { createHash } = require('node:crypto');
const { releaseNotes, describeRelease } = require('../scripts/prepare-release.cjs');

test('release metadata follows one version, selects matching notes and fingerprints both download packages', t => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'timeform-release-'));
  t.after(() => {
    assert.equal(path.dirname(root), path.resolve(os.tmpdir()));
    fs.rmSync(root, { recursive: true, force: true });
  });
  fs.mkdirSync(path.join(root, 'docs')); fs.mkdirSync(path.join(root, 'downloads'));
  fs.writeFileSync(path.join(root, 'package.json'), JSON.stringify({ version: '4.7.2', repository: 'https://github.com/XXXDDD/clockclock24.git' }));
  fs.writeFileSync(path.join(root, 'docs/rundown.md'), '# Notes\r\n\r\n## v4.7.2 — today\r\n\r\n- New lighting.\r\n\r\n## v4.7.1\r\n\r\n- Older changes.\r\n');
  fs.writeFileSync(path.join(root, 'downloads/TIMEFORM-Lively.zip'), 'lively-package');
  fs.writeFileSync(path.join(root, 'downloads/TIMEFORM-WallpaperEngine.zip'), 'engine-package');
  const { manifest, notes } = describeRelease(root);
  assert.equal(manifest.version, '4.7.2'); assert.equal(manifest.tag, 'v4.7.2');
  assert.equal(manifest.repository, 'XXXDDD/clockclock24');
  assert.match(notes, /New lighting/); assert.doesNotMatch(notes, /Older changes/);
  assert.deepEqual(manifest.assets.map(asset => asset.name), ['TIMEFORM-Lively.zip', 'TIMEFORM-WallpaperEngine.zip']);
  for (const asset of manifest.assets) {
    const bytes = fs.readFileSync(path.join(root, asset.file));
    assert.equal(asset.size, bytes.length); assert.equal(asset.sha256, createHash('sha256').update(bytes).digest('hex'));
  }
  assert.throws(() => releaseNotes(root, '4.7.3'), /Add a rundown/);
  fs.appendFileSync(path.join(root, 'docs/rundown.md'), '\n## v4.7.3');
  assert.throws(() => releaseNotes(root, '4.7.3'), /Add a rundown/);
  fs.writeFileSync(path.join(root, 'downloads/TIMEFORM-Lively.zip'), 'updated-package');
  assert.notEqual(describeRelease(root).manifest.assets[0].sha256, manifest.assets[0].sha256);
});

test('gallery download entries follow Latest without embedding a release number', () => {
  const source = fs.readFileSync(path.join(__dirname, '../showcase/index.html'), 'utf8');
  const downloads = [...source.matchAll(/class="download-option" href="([^"]+)"/g)].map(match => match[1]);
  assert.deepEqual(downloads, ['TIMEFORM-Lively.zip', 'TIMEFORM-WallpaperEngine.zip'].map(name =>
    'https://github.com/XXXDDD/clockclock24/releases/latest/download/' + name));
});
