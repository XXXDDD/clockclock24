'use strict';
const fs = require('node:fs');
const path = require('node:path');
const source = __dirname, project = path.dirname(source);
const outputIndex = process.argv.indexOf('--output');
const destination = path.resolve(outputIndex >= 0 ? process.argv[outputIndex + 1] : path.join(project, 'dist/showcase'));
const files = ['index.html', 'gallery.css', 'gallery.js', 'presentation.js', 'assets/lively.webp', 'assets/wallpaper-engine.svg', 'assets/SOURCES.txt'];
for (const file of files) {
  const target = path.join(destination, file);
  fs.mkdirSync(path.dirname(target), { recursive: true }); fs.copyFileSync(path.join(source, file), target);
}
fs.mkdirSync(path.join(destination, 'runtime'), { recursive: true });
fs.copyFileSync(path.join(project, 'runtime/timeform.js'), path.join(destination, 'runtime/timeform.js'));
console.log('Built TIMEFORM showcase: ' + destination);
