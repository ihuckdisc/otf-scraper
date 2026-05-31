/** dev/dump.js - NODE-ONLY. Prints token streams for fixtures to derive anchors. */
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { readEmlBody, FIXTURES, ROOT } = require('./harness');

const sandbox = { console, Date, Math, JSON, parseInt, parseFloat, isNaN, Object, Array, String, Number, RegExp, module: { exports: {} } };
const context = vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(path.join(ROOT, 'Config.js'), 'utf8'), context, { filename: 'Config.js' });
vm.runInContext(fs.readFileSync(path.join(ROOT, 'Normalize.js'), 'utf8'), context, { filename: 'Normalize.js' });

const id = process.argv[2] || 'eraC_2025_current';
const n = parseInt(process.argv[3] || '60', 10);
const body = readEmlBody(path.join(ROOT, FIXTURES[id]));
const tokens = context.tokenizeHtml(body);

console.log('=== ' + id + ' : ' + tokens.length + ' tokens ===');
for (let i = 0; i < Math.min(n, tokens.length); i++) {
  console.log(i + '\t' + JSON.stringify(tokens[i]));
}
const text = tokens.join(' ');
['TREADMILL PERFORMANCE TOTALS', 'ROWER PERFORMANCE TOTALS', 'CALORIES', 'SPLAT', 'AVG. HEART-RATE', 'Peak HR:', 'STEPS', '% of MAX', '% MAX']
  .forEach(a => {
    const idx = tokens.findIndex(t => t.indexOf(a) !== -1);
    console.log('anchor [' + a + '] @ ' + idx);
  });
