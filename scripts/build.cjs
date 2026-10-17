'use strict';
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const modules = require('./modules.cjs');
const Catalog = require('../src/web/classic-catalog.js');
const portraitModules = [
  ...modules.filter(file => !['src/models/amt72/', 'src/models/amt120/', 'src/models/amt144/', 'src/models/amt288/'].some(prefix => file.startsWith(prefix)) && !['src/models/amt/model.js', 'src/models/landscape.js', 'src/models/clockclock24/model.js', 'src/models/clockclock24/animation.js', 'src/models/clockclock24/drawing.js'].includes(file)),
  'src/models/amt72v/settings.js', 'src/models/amt72v/animation.js', 'src/models/amt72v/drawing.js', 'src/models/amt72v/model.js', 'src/models/portrait.js'
];
const pages = [
  // Each category only embeds its own model implementations.
  { category: 'landscape', title: '横屏调试', names: ['index.html', 'clockclock24.html'] },
  { category: 'circular', title: '圆形调试', names: ['circular.html'] },
  { category: 'portrait', title: '竖排调试', names: ['portrait.html'] }
];
const circularModules = [
  'src/shared/math.js', 'src/shared/palette.js', 'src/shared/config.js', 'src/shared/time.js', 'src/shared/single-clock.js',
  'src/shared/hand-animation.js', 'src/models/clockclock24/settings.js', 'src/models/amt/settings.js',
  'src/models/circular-layout.js', 'src/models/clockclock9/settings.js', 'src/models/clockclock9/drawing.js', 'src/models/clockclock9/animation.js', 'src/models/clockclock9/model.js',
  'src/models/amt61c/settings.js', 'src/models/amt61c/animation.js', 'src/models/amt61c/model.js', 'src/models/circular.js', 'src/web/renderer.js'
];
const additionalLandscapeModules=[
  'src/shared/grid-layout.js',
  'src/models/clockclockl/settings.js','src/models/clockclockl/animation.js','src/models/clockclockl/drawing.js','src/models/clockclockl/model.js',
  'src/models/amt96/settings.js','src/models/amt96/animation.js','src/models/amt96/drawing.js','src/models/amt96/model.js',
  'src/models/classic-landscape.js'
];
const check = process.argv.includes('--check');
for (const page of pages) {
  const scripts = [...(page.category === 'landscape' ? modules : page.category === 'portrait' ? portraitModules : circularModules),
    'src/shared/edition-animation.js', 'src/shared/edition-drawing.js',
    ...(page.category === 'landscape' ? additionalLandscapeModules : []),
    'src/web/classic-editions.js', 'src/web/reference-motion.js', 'src/web/shared-actions.js', 'src/web/classic.js', 'src/web/palette-options.js', 'src/web/workbench.js'].map(read).join('\n');
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
