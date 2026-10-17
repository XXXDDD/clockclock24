'use strict';
const fs = require('node:fs');
const path = require('node:path');
const Spec = require('../src/lively/config.js');
const Zip = require('../src/shared/zip.js');
const root = path.resolve(__dirname, '..'), read = file => fs.readFileSync(path.join(root, file), 'utf8').replace(/\r\n/g, '\n');
const modules = [...require('./modules.cjs'), 'src/shared/zip.js', 'src/lively/config.js', 'src/lively/controller.js', 'src/lively/app.js', 'src/lively/editor.js'];
const template = read('src/lively/template.html')
  .replace('/* BUILD:STYLES */', () => read('src/lively/workbench.css') + '\n' + read('src/lively/styles.css'))
  .replace('/* BUILD:CONFIG */', () => JSON.stringify(Spec.defaults))
  .replace('/* BUILD:SCRIPTS */', () => modules.map(read).join('\n').replace(/<\/script/gi, '<\\/script'));
const files = {
  'index.html': template.replace('BUILD:EDITOR', '0'),
  'configure.html': template.replace('BUILD:EDITOR', '1'),
  'LivelyInfo.json': JSON.stringify(Spec.metadata, null, 2) + '\n',
  'LivelyProperties.json': JSON.stringify(Spec.livelyProperties(), null, 2) + '\n',
  'default-config.json': Spec.serialize(Spec.defaults) + '\n',
  'thumbnail.jpg': fs.readFileSync(path.join(root, 'src/lively/thumbnail.jpg')),
  'README.md': read('src/lively/README.md')
};
const outputs = {};
for (const directory of ['lively-wallpaper', 'dist/lively-wallpaper']) for (const [name, bytes] of Object.entries(files)) outputs[path.join(directory, name)] = bytes;
outputs['TIMEFORM-五型号-Lively.zip'] = Zip.create(files);
if (process.argv.includes('--publish')) {
  for (const directory of ['wallpaper', 'dist/wallpaper']) for (const [name, bytes] of Object.entries(files)) outputs[path.join(directory, name)] = bytes;
  outputs['downloads/TIMEFORM-Lively.zip'] = outputs['TIMEFORM-五型号-Lively.zip'];
  outputs['downloads/TIMEFORM-wallpaper.html'] = files['index.html'];
}
const check = process.argv.includes('--check');
for (const [name, content] of Object.entries(outputs)) {
  const target = path.join(root, name), bytes = Buffer.from(content);
  if (check) { if (!fs.existsSync(target) || !fs.readFileSync(target).equals(bytes)) throw new Error('Lively 文件需要更新：' + name); }
  else { fs.mkdirSync(path.dirname(target), { recursive: true }); fs.writeFileSync(target, bytes); }
}
console.log(check ? 'Lively package matches shared models and sources.' : 'Built five-model Lively wallpaper, editor, properties and offline ZIP.');
