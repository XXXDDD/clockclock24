'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');
const { spawnSync } = require('node:child_process');

function releaseNotes(root, version) {
  if (!/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(version)) throw new Error('Invalid release version');
  const rundown = fs.readFileSync(path.join(root, 'docs/rundown.md'), 'utf8').replace(/\r\n/g, '\n');
  const sections = rundown.split(/^## /m).slice(1);
  const section = sections.find(value => value.split('\n', 1)[0].split(/\s/)[0] === 'v' + version);
  if (!section?.split('\n').slice(1).join('\n').trim()) throw new Error('Add a rundown for v' + version + ' before preparing a release');
  return '## ' + section.trim() + '\n';
}

function describeRelease(root) {
  const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
  const repository = /^https:\/\/github\.com\/([^/]+\/[^/]+?)(?:\.git)?$/.exec(pkg.repository)?.[1];
  if (!repository) throw new Error('Set the GitHub repository in package.json');
  const notes = releaseNotes(root, pkg.version);
  const assets = ['TIMEFORM-Lively.zip', 'TIMEFORM-WallpaperEngine.zip'].map(name => {
    const file = 'downloads/' + name, bytes = fs.readFileSync(path.join(root, file));
    return { name, file, size: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex') };
  });
  return { manifest: { version: pkg.version, tag: 'v' + pkg.version, repository, assets }, notes };
}

function prepare(root) {
  const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
  releaseNotes(root, pkg.version);
  const npmCli = process.env.npm_execpath;
  if (!npmCli || !fs.existsSync(npmCli)) throw new Error('Run npm run release:prepare');
  const run = args => {
    const result = spawnSync(process.execPath, args, { cwd: root, stdio: 'inherit' });
    if (result.error) throw result.error;
    if (result.status !== 0) throw new Error('Release preparation stopped: ' + args.join(' '));
  };
  // Let npm own command parsing and the existing build/test definitions.
  const script = name => run([npmCli, 'run', name]);
  script('build:all');
  for (const file of ['scripts/build-lively-classic.cjs', 'scripts/build-runtime.cjs']) run([file, '--publish']);
  script('test');
  script('check:all');
  for (const file of ['scripts/build-lively-classic.cjs', 'scripts/build-runtime.cjs']) run([file, '--publish', '--check']);
  const { manifest, notes } = describeRelease(root);
  fs.mkdirSync(path.join(root, 'dist'), { recursive: true });
  fs.writeFileSync(path.join(root, 'dist/release.json'), JSON.stringify(manifest, null, 2) + '\n');
  fs.writeFileSync(path.join(root, 'dist/release-notes.md'), notes);
  console.log('Prepared ' + manifest.tag + ': demo, both wallpaper packages, dist/release.json and dist/release-notes.md. No upload performed.');
}

module.exports = { releaseNotes, describeRelease };
if (require.main === module) {
  try { prepare(path.resolve(__dirname, '..')); }
  catch (error) { console.error(error.message); process.exitCode = 1; }
}
