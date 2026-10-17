'use strict';
// Keep the established build command and published download URLs.
process.argv.push('--publish');
require('./build-lively-classic.cjs');
