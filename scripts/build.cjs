'use strict';
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const modules = [
  'src/shared/math.js', 'src/shared/palette.js', 'src/shared/config.js', 'src/shared/time.js', 'src/shared/single-clock.js',
  'src/shared/hand-animation.js', 'src/models/clockclock24/settings.js', 'src/models/clockclock24/model.js',
  'src/models/amt/settings.js', 'src/models/amt/model.js', 'src/models/landscape.js', 'src/web/renderer.js', 'src/web/workbench.js'
];
const pages = [
  { category: 'landscape', title: '横屏调试', names: ['index.html', 'clockclock24.html'] },
  { category: 'circular', title: '圆形调试', names: ['circular.html'] },
  { category: 'portrait', title: '竖排调试', names: ['portrait.html'] }
];
const check = process.argv.includes('--check');
for (const page of pages) {
  const scripts = (page.category === 'landscape' ? modules : ['src/web/workbench.js']).map(read).join('\n');
  const html = read('src/web/template.html')
    .replaceAll('BUILD:TITLE', page.title).replaceAll('BUILD:CATEGORY', page.category)
    .replace('/* BUILD:STYLES */', () => read('src/web/workbench.css'))
    .replace('<!-- BUILD:CONTENT -->', () => read('src/web/pages/' + page.category + '.html'))
    .replace('/* BUILD:SCRIPTS */', () => scripts.replace(/<\/script/gi, '<\\/script'));
  for (const directory of ['', 'dist']) for (const name of page.names) {
    const target = path.join(root, directory, name);
    if (check) {
      if (!fs.existsSync(target) || read(path.relative(root, target)) !== html) throw new Error('生成页面需要更新：' + path.relative(root, target));
    } else { fs.mkdirSync(path.dirname(target), { recursive: true }); fs.writeFileSync(target, html); }
  }
}
console.log(check ? 'Generated pages match their sources.' : 'Built development workbench and two category placeholders.');
