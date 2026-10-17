'use strict';
const fs = require('node:fs');
const path = require('node:path');
const Spec = require('../src/lively/classic-config.js');
const Zip = require('../src/shared/zip.js');
const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8').replace(/\r\n/g, '\n');
const modules = [...require('./modules.cjs'),
  'src/models/circular-layout.js',
  'src/models/clockclock9/settings.js', 'src/models/clockclock9/drawing.js', 'src/models/clockclock9/animation.js', 'src/models/clockclock9/model.js',
  'src/models/amt61c/settings.js', 'src/models/amt61c/animation.js', 'src/models/amt61c/model.js', 'src/models/circular.js',
  'src/models/amt72v/settings.js', 'src/models/amt72v/animation.js', 'src/models/amt72v/drawing.js', 'src/models/amt72v/model.js', 'src/models/portrait.js',
  'src/shared/grid-layout.js', 'src/shared/edition-animation.js', 'src/shared/edition-drawing.js',
  'src/models/clockclockl/settings.js', 'src/models/clockclockl/animation.js', 'src/models/clockclockl/drawing.js', 'src/models/clockclockl/model.js',
  'src/models/amt96/settings.js', 'src/models/amt96/animation.js', 'src/models/amt96/drawing.js', 'src/models/amt96/model.js', 'src/models/classic-landscape.js',
  'src/web/classic-editions.js', 'src/web/reference-motion.js',
  'src/web/shared-actions.js', 'src/web/classic.js', 'src/shared/zip.js',
  'src/lively/classic-config.js', 'src/lively/classic-controller.js', 'src/lively/classic-app.js'];
if (Spec.models.length !== 30) throw new Error('全集壁纸应包含 30 款。');
const template = read('src/lively/classic-template.html')
  .replace('/* BUILD:STYLES */', () => read('src/lively/classic-styles.css'))
  .replace('/* BUILD:CONFIG */', () => JSON.stringify(Spec.defaults))
  .replace('/* BUILD:SCRIPTS */', () => modules.map(read).join('\n').replace(/<\/script/gi, '<\\/script'));
const files = {
  'index.html': template.replace('BUILD:EDITOR', '0'),
  'configure.html': template.replace('BUILD:EDITOR', '1'),
  'LivelyInfo.json': JSON.stringify(Spec.metadata, null, 2) + '\n',
  'LivelyProperties.json': JSON.stringify(Spec.livelyProperties(), null, 2) + '\n',
  'default-config.json': Spec.serialize(Spec.defaults) + '\n',
  'thumbnail.jpg': fs.readFileSync(path.join(root, 'src/lively/classic-thumbnail.jpg')),
  'README.txt': read('src/lively/classic-README.txt')
};
const outputs = {};
for (const directory of ['lively-complete', 'dist/lively-complete']) for (const [name, bytes] of Object.entries(files)) outputs[path.join(directory, name)] = bytes;
outputs['TIMEFORM-30款全集-Lively.zip'] = Zip.create(files);
if (process.argv.includes('--publish')) {
  for (const directory of ['wallpaper', 'dist/wallpaper']) for (const [name, bytes] of Object.entries(files)) outputs[path.join(directory, name)] = bytes;
  for (const directory of ['wallpaper', 'dist/wallpaper']) outputs[path.join(directory, 'README.md')] = files['README.txt'];
  outputs['downloads/TIMEFORM-Lively.zip'] = outputs['TIMEFORM-30款全集-Lively.zip'];
  outputs['downloads/TIMEFORM-wallpaper.html'] = files['index.html'];
}
const check = process.argv.includes('--check');
for (const [name, content] of Object.entries(outputs)) {
  const target = path.join(root, name), bytes = Buffer.from(content);
  if (check) { if (!fs.existsSync(target) || !fs.readFileSync(target).equals(bytes)) throw new Error('全集壁纸文件需要更新：' + name); }
  else { fs.mkdirSync(path.dirname(target), { recursive: true }); fs.writeFileSync(target, bytes); }
}
console.log(check ? 'Complete Lively package matches sources.' : 'Built offline 30-edition Lively package: TIMEFORM-30款全集-Lively.zip');
