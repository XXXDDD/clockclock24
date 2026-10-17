'use strict';
const fs = require('node:fs');
const path = require('node:path');
const source = __dirname, project = path.dirname(source);
const files = ['index.html', 'gallery.css', 'gallery.js', 'presentation.js', 'assets/lively.webp', 'assets/wallpaper-engine.svg', 'assets/SOURCES.txt'];
function build(destination, check = false) {
  const outputs = {};
  for (const file of files) outputs[file] = file === 'index.html'
    ? Buffer.from(fs.readFileSync(path.join(source, file), 'utf8').replace('src="../runtime/timeform.js"', 'src="runtime/timeform.js"'))
    : fs.readFileSync(path.join(source, file));
  const modules = [...require('../scripts/source-graph.cjs').complete, 'src/hosts/browser-preview.js'];
  outputs['runtime/timeform.js'] = Buffer.from(modules.map(file => fs.readFileSync(path.join(project, file), 'utf8').replace(/\r\n/g, '\n')).join('\n'));
  for (const [file, bytes] of Object.entries(outputs)) {
    const target = path.join(destination, file);
    if (check) {
      if (!fs.existsSync(target) || !fs.readFileSync(target).equals(bytes)) throw new Error('Showcase output needs updating: ' + target);
    } else { fs.mkdirSync(path.dirname(target), { recursive: true }); fs.writeFileSync(target, bytes); }
  }
}
module.exports = { build };
if (require.main === module) {
  const outputIndex = process.argv.indexOf('--output');
  const destination = path.resolve(outputIndex >= 0 ? process.argv[outputIndex + 1] : path.join(project, 'dist/showcase'));
  build(destination, process.argv.includes('--check'));
  console.log('Built TIMEFORM showcase: ' + destination);
}
