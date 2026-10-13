'use strict';
const fs = require('node:fs');
const path = require('node:path');
const Spec = require('../wallpaper/src/config.js');
const Zip = require('../wallpaper/src/zip.js');
const root = path.join(__dirname, '..'), wallpaper = path.join(root, 'wallpaper');
const read = file => fs.readFileSync(path.join(wallpaper, 'src', file), 'utf8');
const scripts = ['config.js', 'zip.js', 'renderer.js', 'app.js', 'editor.js'].map(read).join('\n');
const base = read('template.html').replace('/* BUILD:STYLES */', () => read('styles.css')).replace('/* BUILD:CONFIG */', () => JSON.stringify(Spec.defaults)).replace('/* BUILD:SCRIPTS */', () => scripts.replace(/<\/script/gi, '<\\/script'));
const html = base.replace('BUILD:EDITOR', '0'), editor = base.replace('BUILD:EDITOR', '1');
const metadata = Spec.metadata;
const files = { 'index.html': html, 'LivelyInfo.json': JSON.stringify(metadata, null, 2) + '\n', 'LivelyProperties.json': JSON.stringify(Spec.livelyProperties(), null, 2) + '\n', 'thumbnail.jpg': fs.readFileSync(path.join(wallpaper, 'thumbnail.jpg')) };
const outputs = Object.fromEntries(Object.entries(files).map(([file,content]) => [path.join(wallpaper,file),content]));
outputs[path.join(wallpaper,'configure.html')] = editor;
outputs[path.join(wallpaper,'default-config.json')] = Spec.exportConfig(Spec.defaults) + '\n';
outputs[path.join(root,'downloads','TIMEFORM-Lively.zip')] = Zip.create(files);
outputs[path.join(root,'downloads','TIMEFORM-wallpaper.html')] = html;
const check = process.argv.includes('--check');
for (const [file, content] of Object.entries(outputs)) {
  const bytes = Buffer.from(content);
  if (check) { if (!fs.existsSync(file) || !fs.readFileSync(file).equals(bytes)) throw new Error('Rebuild wallpaper artifacts: ' + path.relative(root,file)); }
  else { fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,bytes); }
}
console.log(check ? 'Generated wallpaper artifacts match their sources.' : 'Built offline wallpaper, editor, Lively controls and portable downloads.');
