'use strict';
const modules = require('./modules.cjs');
const portraitModules = [
  ...modules.filter(file => !['src/models/amt72/', 'src/models/amt120/', 'src/models/amt144/', 'src/models/amt288/'].some(prefix => file.startsWith(prefix)) && !['src/models/amt/model.js', 'src/models/landscape.js', 'src/models/clockclock24/model.js', 'src/models/clockclock24/animation.js', 'src/models/clockclock24/drawing.js'].includes(file)),
  'src/models/amt72v/settings.js', 'src/models/amt72v/animation.js', 'src/models/amt72v/drawing.js', 'src/models/amt72v/model.js', 'src/models/portrait.js'
];
const circularModules = [
  'src/shared/math.js', 'src/shared/palette.js', 'src/shared/config.js', 'src/shared/time.js', 'src/shared/single-clock.js',
  'src/shared/hand-animation.js', 'src/models/clockclock24/settings.js', 'src/models/amt/settings.js',
  'src/models/circular-layout.js', 'src/models/clockclock9/settings.js', 'src/models/clockclock9/drawing.js', 'src/models/clockclock9/animation.js', 'src/models/clockclock9/model.js',
  'src/models/amt61c/settings.js', 'src/models/amt61c/animation.js', 'src/models/amt61c/model.js', 'src/models/circular.js', 'src/runtime/browser-environment.js', 'src/runtime/renderer.js'
];
const additionalLandscapeModules=[
  'src/shared/grid-layout.js',
  'src/models/clockclockl/settings.js','src/models/clockclockl/animation.js','src/models/clockclockl/drawing.js','src/models/clockclockl/model.js',
  'src/models/amt96/settings.js','src/models/amt96/animation.js','src/models/amt96/drawing.js','src/models/amt96/model.js',
  'src/models/classic-landscape.js'
];

const editions = ['src/shared/edition-animation.js', 'src/shared/edition-drawing.js'];
const catalog = ['src/catalog/classic-editions.js', 'src/catalog/reference-motion.js', 'src/catalog/shared-actions.js', 'src/catalog/classic.js'];
const unique = files => [...new Set(files)];
const categories = {
  landscape: unique([...modules, ...editions, ...additionalLandscapeModules, ...catalog]),
  circular: unique([...circularModules, ...editions, ...catalog]),
  portrait: unique([...portraitModules, ...editions, ...catalog])
};
const complete = unique([...modules, ...circularModules, ...portraitModules, ...editions, ...additionalLandscapeModules, ...catalog,
  'src/core/presentation-config.js', 'src/core/session.js']);
module.exports = { categories, complete };
