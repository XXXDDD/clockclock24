'use strict';
const fs = require('node:fs');
const path = require('node:path');
const Sources = require('./source-graph.cjs');
const Spec = require('../src/core/presentation-config.js');
const Collection = require('../src/catalog/collection.js');
const Engine = require('../src/hosts/wallpaper-engine/adapter.js');
const Zip = require('../src/shared/zip.js');
const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8').replace(/\r\n/g, '\n');
const bundle = files => files.map(read).join('\n');
const runtime = bundle([...Sources.complete, 'src/hosts/browser-preview.js']);
const html = read('src/hosts/wallpaper-engine/template.html')
  .replace('/* BUILD:CONFIG */', () => JSON.stringify(Spec.defaults).replace(/</g, '\\u003c'))
  .replace('/* BUILD:SCRIPTS */', () => (runtime + '\n' + bundle([
    'src/hosts/wallpaper-engine/adapter.js', 'src/hosts/wallpaper-engine/app.js'])).replace(/<\/script/gi, '<\\/script'));
const engineFiles = {
  'index.html': html,
  'project.json': JSON.stringify(Engine.project(), null, 2) + '\n',
  'default-config.json': Spec.serialize(Spec.defaults) + '\n',
  'preview.jpg': fs.readFileSync(path.join(root, 'src/lively/classic-thumbnail.jpg')),
  'README.txt': 'TIMEFORM Wallpaper Engine 本地测试包。解压后用编辑器打开 index.html；project.json 包含全部 30 款和属性定义。尚需 Wallpaper Engine 真机验收。\n'
};
const manifest = { schema: 'timeform.catalog', version: 1, editions: Collection.entries.map(entry => {
  const model = Spec.get(entry.implementation);
  if (!model) throw new Error('目录实现不存在：' + entry.implementation);
  return { ...entry, settings: model.Settings.defaults };
}) };
const outputs = {
  'dist/runtime/timeform.js': runtime,
  'dist/runtime/catalog.json': JSON.stringify(manifest, null, 2) + '\n',
  'dist/runtime/default-config.json': Spec.serialize(Spec.defaults) + '\n',
  'dist/TIMEFORM-WallpaperEngine.zip': Zip.create(engineFiles)
};
for (const [file, content] of Object.entries(engineFiles)) outputs['dist/wallpaper-engine/' + file] = content;
if (process.argv.includes('--publish')) {
  outputs['downloads/TIMEFORM-WallpaperEngine.zip'] = outputs['dist/TIMEFORM-WallpaperEngine.zip'];
  for (const [file, content] of Object.entries(engineFiles)) outputs['wallpaper-engine/' + file] = content;
  for (const file of ['timeform.js', 'catalog.json', 'default-config.json']) outputs['runtime/' + file] = outputs['dist/runtime/' + file];
}
const check = process.argv.includes('--check');
for (const [file, content] of Object.entries(outputs)) {
  const target = path.join(root, file), bytes = Buffer.from(content);
  if (check) {
    if (!fs.existsSync(target) || !fs.readFileSync(target).equals(bytes)) throw new Error('共享运行时产物需要更新：' + file);
  } else { fs.mkdirSync(path.dirname(target), { recursive: true }); fs.writeFileSync(target, bytes); }
}
console.log(check ? 'Shared runtime and Wallpaper Engine package match sources.' : 'Built site runtime, catalog manifest and Wallpaper Engine local package.');
