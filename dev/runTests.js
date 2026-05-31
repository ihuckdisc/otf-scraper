/** dev/runTests.js - NODE-ONLY. Loads the pure-JS source + Fixtures + Tests and runs runTests(). */
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { ROOT } = require('./harness');

const FILES = [
  'Config.js', 'Normalize.js',
  'parsers/Tokens.js', 'parsers/Detect.js',
  'parsers/sections/Header.js', 'parsers/sections/Summary.js', 'parsers/sections/Zones.js',
  'parsers/sections/Treadmill.js', 'parsers/sections/Rower.js',
  'parsers/Parse.js', 'Validate.js', 'Welcome.js', 'SheetIO.js', 'Dashboard.js',
  'Fixtures.js', 'Tests.js',
];

const sandbox = { console, Date, Math, JSON, parseInt, parseFloat, isNaN, Object, Array, String, Number, RegExp };
const context = vm.createContext(sandbox);
for (const rel of FILES) {
  vm.runInContext(fs.readFileSync(path.join(ROOT, rel), 'utf8'), context, { filename: rel });
}

const result = context.runTests();
if (result.failed > 0) process.exit(1);
