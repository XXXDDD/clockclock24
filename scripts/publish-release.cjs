'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');
const { spawnSync } = require('node:child_process');
const { describeRelease } = require('./prepare-release.cjs');
const hash = bytes => createHash('sha256').update(bytes).digest('hex');

async function publish(root) {
  const git = args => {
    const result = spawnSync('git', args, { cwd: root, encoding: 'utf8',
      env: { ...process.env, GIT_TERMINAL_PROMPT: '0', GCM_INTERACTIVE: 'Never' } });
    if (result.status !== 0) throw new Error('Git check failed: ' + args[0]);
    return result.stdout.trim();
  };
  if (git(['status', '--porcelain', '--untracked-files=no'])) throw new Error('Commit tracked release changes before publishing.');
  const { manifest, notes } = describeRelease(root);
  const saved = JSON.parse(fs.readFileSync(path.join(root, 'dist/release.json'), 'utf8'));
  if (JSON.stringify(saved) !== JSON.stringify(manifest)
    || fs.readFileSync(path.join(root, 'dist/release-notes.md'), 'utf8') !== notes) throw new Error('Run release:prepare before publishing; the manifest or notes are stale.');
  const commit = git(['rev-parse', 'HEAD']);
  let token = process.env.GITHUB_TOKEN;
  if (!token) {
    const result = spawnSync('git', ['credential', 'fill'], { cwd: root, encoding: 'utf8',
      input: 'protocol=https\nhost=github.com\n\n',
      env: { ...process.env, GIT_TERMINAL_PROMPT: '0', GCM_INTERACTIVE: 'Never' } });
    if (result.status === 0) token = result.stdout.split('\n').find(line => line.startsWith('password='))?.slice(9).trim();
  }
  if (!token) throw new Error('GitHub authentication unavailable. Use GITHUB_TOKEN or an authenticated Git credential helper.');
  const headers = { Authorization: 'Bearer ' + token, 'User-Agent': 'Shizhen-publisher',
    Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' };
  const repository = manifest.repository, prefix = '/repos/' + repository;
  async function request(url, options = {}) {
    const response = await fetch(url.startsWith('https:') ? url : 'https://api.github.com' + url,
      { ...options, headers: { ...headers, ...options.headers } });
    if (!response.ok) throw new Error('GitHub request failed (' + response.status + '): ' + url);
    return response;
  }
  const remote = await (await request(prefix + '/commits/main')).json();
  if (remote.sha !== commit) throw new Error('Push the release commit to main before publishing.');
  const existing = await fetch('https://api.github.com' + prefix + '/releases/tags/' + manifest.tag, { headers });
  let release;
  if (existing.status === 404) {
    release = await (await request(prefix + '/releases', { method: 'POST',
      headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tag_name: manifest.tag,
        target_commitish: commit, name: '时阵 ' + manifest.version, body: notes, draft: true, prerelease: false }) })).json();
  } else {
    if (!existing.ok) throw new Error('Unable to inspect existing release: ' + existing.status);
    release = await existing.json();
    if (release.target_commitish !== commit) throw new Error('Existing release targets a different commit.');
    if (release.body !== notes.trim() && release.body !== notes) throw new Error('Existing release has different notes.');
  }
  const assets = [];
  for (const file of manifest.assets) {
    const bytes = fs.readFileSync(path.join(root, file.file));
    let asset = release.assets.find(item => item.name === file.name);
    if (!asset) {
      if (!release.draft) throw new Error('Published release is incomplete; use a new version.');
      asset = await (await request('https://uploads.github.com' + prefix + '/releases/' + release.id + '/assets?name=' + encodeURIComponent(file.name), {
        method: 'POST', headers: { 'Content-Type': file.name.endsWith('.apk') ? 'application/vnd.android.package-archive' : 'application/zip',
          'Content-Length': String(bytes.length) }, body: bytes })).json();
    }
    if (asset.size !== file.size || asset.digest !== 'sha256:' + file.sha256) throw new Error('Uploaded asset checksum mismatch: ' + file.name);
    assets.push({ ...file, url: asset.browser_download_url });
  }
  if (release.draft) release = await (await request(prefix + '/releases/' + release.id, { method: 'PATCH',
    headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ draft: false, make_latest: 'true' }) })).json();
  for (const asset of assets) {
    const response = await fetch(asset.url, { headers: { 'User-Agent': 'Shizhen-publisher', 'Cache-Control': 'no-cache' } });
    if (!response.ok || hash(Buffer.from(await response.arrayBuffer())) !== asset.sha256) throw new Error('Public download checksum mismatch: ' + asset.name);
  }
  const latest = await (await request(prefix + '/releases/latest')).json();
  if (latest.tag_name !== manifest.tag) throw new Error('Release was not marked Latest.');
  console.log(JSON.stringify({ tag: manifest.tag, commit, release: release.html_url, assets }, null, 2));
}
if (require.main === module) publish(path.resolve(__dirname, '..')).catch(error => { console.error(error.message); process.exitCode = 1; });
module.exports = { publish };
