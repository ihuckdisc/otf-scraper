/**
 * dev/harness.js - NODE-ONLY. Not pushed to Apps Script.
 *
 * Loads the pure-JS source files (Normalize + parsers + Validate) into a single
 * shared VM context, exactly mirroring how Apps Script shares one global scope
 * across files. Provides helpers to read the .eml fixtures so the parser can be
 * verified against real emails during development and in CI-style checks.
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');

// Order matters only for top-level execution (function declarations hoist, but
// the COLUMNS/CONFIG object literals must exist before anything reads them).
const SOURCE_FILES = [
  'Config.js',
  'Normalize.js',
  'parsers/Tokens.js',
  'parsers/Detect.js',
  'parsers/sections/Header.js',
  'parsers/sections/Summary.js',
  'parsers/sections/Zones.js',
  'parsers/sections/Treadmill.js',
  'parsers/sections/Rower.js',
  'parsers/Parse.js',
  'Validate.js',
];

function loadContext() {
  const sandbox = {
    console: console,
    Date: Date,
    Math: Math,
    JSON: JSON,
    parseInt: parseInt,
    parseFloat: parseFloat,
    isNaN: isNaN,
    Object: Object,
    Array: Array,
    String: String,
    Number: Number,
    RegExp: RegExp,
  };
  const context = vm.createContext(sandbox);
  for (const rel of SOURCE_FILES) {
    const file = path.join(ROOT, rel);
    const code = fs.readFileSync(file, 'utf8');
    vm.runInContext(code, context, { filename: rel });
  }
  return context;
}

/** Strip MIME headers and return the raw (still-encoded) body of an .eml. */
function readEmlBody(emlPath) {
  const raw = fs.readFileSync(emlPath, 'utf8');
  const idx = raw.search(/\r?\n\r?\n/);
  return idx === -1 ? raw : raw.slice(idx).replace(/^\r?\n\r?\n/, '');
}

/** Map of fixture id -> absolute .eml path. */
const FIXTURES = {
  eraA_2018_03_19: 'fixtures/eraA_2018-03-19.eml',
  eraA_2018_04_16: 'fixtures/eraA_2018-04-16.eml',
  eraB_2019_07_16: 'fixtures/eraB_2019-07-16.eml',
  eraB_2020_01_21: 'fixtures/eraB_2020-01-21.eml',
  eraC_2023_01_27: 'fixtures/eraC_2023-01-27.eml',
  eraC_2023_02_14: 'fixtures/eraC_2023-02-14.eml',
  eraC_2025_current: 'fixtures/eraC_2025-11-current.eml',
};

function fixtureBody(id) {
  return readEmlBody(path.join(ROOT, FIXTURES[id]));
}

module.exports = { loadContext, readEmlBody, fixtureBody, FIXTURES, ROOT };
