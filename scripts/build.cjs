'use strict';
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const Catalog = require('../src/web/classic-catalog.js');
const Sources = require('./source-graph.cjs');
const pages = [
  // Each category only embeds its own model implementations.
  { category: 'landscape', title: '横屏调试', names: ['index.html', 'clockclock24.html'] },
  { category: 'circular', title: '圆形调试', names: ['circular.html'] },
  { category: 'portrait', title: '竖排调试', names: ['portrait.html'] }
];
const check = process.argv.includes('--check');
for (const page of pages) {
  const scripts = [...Sources.categories[page.category], 'src/web/palette-options.js', 'src/web/workbench.js'].map(read).join('\n');
  const html = read('src/web/template.html')
    .replaceAll('BUILD:TITLE', page.title).replaceAll('BUILD:CATEGORY', page.category)
    .replace('/* BUILD:STYLES */', () => read('src/web/workbench.css'))
    .replace('<!-- BUILD:CONTENT -->', () => read('src/web/workspace.html'))
    .replace('<!-- BUILD:CANVAS-OPTIONS -->', () => read('src/web/pages/' + page.category + '.html'))
    .replace('<!-- BUILD:CLASSIC -->', () => read('src/web/classic-panel.html'))
    .replace('<!-- BUILD:MODEL-OPTIONS -->', () => Catalog.renderPicker(page.category))
    .replace('/* BUILD:SCRIPTS */', () => scripts.replace(/<\/script/gi, '<\\/script'));
  for (const directory of ['', 'dist']) for (const name of page.names) {
    const target = path.join(root, directory, name);
    if (check) {
      if (!fs.existsSync(target) || read(path.relative(root, target)) !== html) throw new Error('生成页面需要更新：' + path.relative(root, target));
    } else { fs.mkdirSync(path.dirname(target), { recursive: true }); fs.writeFileSync(target, html); }
  }
}
console.log(check ? 'Generated pages match their sources.' : 'Built landscape, portrait and circular workbenches.');
