'use strict';
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const crypto = require('node:crypto');
const { spawnSync } = require('node:child_process');
const Sources = require('./source-graph.cjs');
const Spec = require('../src/core/presentation-config.js');
const root = path.resolve(__dirname, '..');
require('./build-brand.cjs');
const project = path.join(root, 'android');
const read = file => fs.readFileSync(path.join(root, file), 'utf8').replace(/\r\n/g, '\n');
const files = {
  'index.html': read('src/hosts/android/index.html'),
  'android.js': read('src/hosts/android/app.js'),
  'timeform.js': [...Sources.complete, 'src/hosts/browser-preview.js'].map(read).join('\n'),
  'editions.json': JSON.stringify(Spec.models.map(model => {
    const { settings } = Spec.resolve({ edition: model.id });
    const geometry = model.geometry(1080, 1920, settings), instance = model.create(settings, { reducedMotion: true });
    instance.initialize(610, 0); instance.sample(0);
    return { id: model.id, category: model.type, label: Spec.label(model),
      colors: Object.fromEntries(['board', 'long', 'short'].map(key => [key, settings[key]])),
      thumbnail: { width: geometry.boardWidth, height: geometry.boardHeight,
        dials: model.Drawing.appearance?.dials !== false,
        points: geometry.points.map(point => ({ ...point, lane: model.Drawing.longLane?.(point) || 0 })),
        hands: instance.hands.map(hand => ({ angle: hand.angle, opacity: hand.opacity })),
        longLength: settings.longLength / 100, shortLength: settings.shortLength / 100 } };
  }), null, 2) + '\n'
};
const check = process.argv.includes('--check');
for (const [file, content] of Object.entries(files)) {
  const target = path.join(project, 'app/src/main/assets', file);
  if (check) {
    if (!fs.existsSync(target) || !fs.readFileSync(target).equals(Buffer.from(content))) throw new Error('Android assets are stale: ' + file);
  } else { fs.mkdirSync(path.dirname(target), { recursive: true }); fs.writeFileSync(target, content); }
}
if (!process.argv.includes('--apk')) { console.log(check ? 'Android offline assets match sources.' : 'Built Android offline assets for all 30 editions.'); process.exit(0); }

const isWindows = process.platform === 'win32';
function run(command, args, env = process.env) {
  // A fixed .bat path needs cmd.exe on Windows; arguments are controlled build flags.
  const result = isWindows && command.endsWith('.bat')
    ? spawnSync(process.env.ComSpec || 'cmd.exe', ['/d', '/s', '/c', '"' + '"' + command + '" ' + args.join(' ') + '"'], { cwd: project, env, stdio: 'inherit', windowsVerbatimArguments: true })
    : spawnSync(command, args, { cwd: project, env, stdio: 'inherit' });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(path.basename(command) + ' failed (' + result.status + ')');
}
let gradle = process.env.TIMEFORM_GRADLE;
if (!gradle && fs.existsSync(path.join(project, isWindows ? 'gradlew.bat' : 'gradlew'))) gradle = path.join(project, isWindows ? 'gradlew.bat' : 'gradlew');
if (!gradle) {
  const distributions = path.join(os.homedir(), '.gradle/wrapper/dists/gradle-9.5.0-bin');
  if (fs.existsSync(distributions)) for (const folder of fs.readdirSync(distributions)) {
    const candidate = path.join(distributions, folder, 'gradle-9.5.0/bin', isWindows ? 'gradle.bat' : 'gradle');
    if (fs.existsSync(candidate)) { gradle = candidate; break; }
  }
}
gradle ||= isWindows ? 'gradle.bat' : 'gradle';
let env = { ...process.env };
if (!env.TIMEFORM_KEYSTORE) {
  const directory = path.join(os.homedir(), '.codex/signing/timeform');
  fs.mkdirSync(directory, { recursive: true });
  const credentialsFile = path.join(directory, 'credentials.json');
  const keystore = path.join(directory, 'timeform-release.p12');
  if (!fs.existsSync(credentialsFile)) {
    if (fs.existsSync(keystore)) throw new Error('Signing credentials missing; preserve the existing keystore.');
    fs.writeFileSync(credentialsFile, JSON.stringify({ password: crypto.randomBytes(32).toString('hex') }), { mode: 0o600 });
  }
  const { password } = JSON.parse(fs.readFileSync(credentialsFile, 'utf8'));
  env.TIMEFORM_KEYSTORE = keystore; env.TIMEFORM_STORE_PASSWORD = password; env.TIMEFORM_KEY_PASSWORD = password;
  if (!fs.existsSync(keystore)) {
    const keytool = process.env.JAVA_HOME ? path.join(process.env.JAVA_HOME, 'bin', isWindows ? 'keytool.exe' : 'keytool') : 'keytool';
    run(keytool, ['-genkeypair', '-keystore', keystore, '-storetype', 'PKCS12', '-alias', 'timeform', '-keyalg', 'RSA', '-keysize', '3072', '-validity', '10000',
      '-storepass:env', 'TIMEFORM_STORE_PASSWORD', '-keypass:env', 'TIMEFORM_KEY_PASSWORD', '-dname', 'CN=TIMEFORM'], env);
  }
}
if (!fs.existsSync(path.join(project, 'gradlew.bat'))) run(gradle, ['wrapper', '--gradle-version', '9.5.0', '--distribution-type', 'bin', '--console=plain'], env);
run(gradle, ['--no-daemon', '--console=plain', ':app:assembleRelease', ':app:lintRelease'], env);
const source = path.join(project, 'app/build/outputs/apk/release/app-release.apk');
if (!fs.existsSync(source)) throw new Error('Signed APK was not generated.');
for (const directory of ['dist', 'downloads']) {
  fs.mkdirSync(path.join(root, directory), { recursive: true });
  fs.copyFileSync(source, path.join(root, directory, 'TIMEFORM-Android.apk'));
  fs.copyFileSync(source, path.join(root, directory, 'Shizhen-Android.apk'));
}
console.log('Signed offline APK: downloads/Shizhen-Android.apk');
