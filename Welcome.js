/**
 * Welcome.js - in-sheet README and script version display.
 *
 * Content is rewritten when ensureSheets() runs (Initialize Sheet). Manual edits
 * on the Welcome tab will be overwritten.
 */

/** Row indices (1-based) that receive bold section-heading style. */
var WELCOME_HEADING_ROWS_ = [4, 7, 11, 18];

/**
 * Build the Welcome tab body as a single-column 2D array.
 * @returns {string[][]}
 */
function buildWelcomeContent_() {
  return [
    ['OTF Email Scraper'],
    ['Script version: ' + SCRIPT_VERSION],
    [''],
    ['About'],
    ['Scrapes OrangeTheory performance emails from ' + SENDER + ' and writes one row per workout to the Data tab. This script only ingests data.'],
    [''],
    ['First-time setup'],
    ['1. Reload the sheet. Use the OTF Scraper menu → Initialize Sheet (creates Welcome, Data, and Log tabs).'],
    ['2. Run Update or Full Scrape once and approve OAuth (Gmail read-only, this spreadsheet only).'],
    [''],
    ['Regular use'],
    ['• Update (since last class) — fast sync for new emails since your latest Email class.'],
    ['• Full Scrape (all emails) — scan all sender mail for anything missing; use for first import or after a long gap.'],
    ['• Add Manual Row — enter workouts with no scrapable email (e.g. 2020–2023 gap); tagged Source = Manual.'],
    ['• View Log — scrape history (scanned, added, skipped, flags, errors).'],
    ['• Review any row with text in the Status column.'],
    [''],
    ['Maintenance (menu)'],
    ['• Clear Email Data — removes Email rows; keeps Manual rows.'],
    ['• Clear All Data — deletes every class row.'],
    ['• Reset Sheet — clears all class rows and Log history.'],
  ];
}

/**
 * Create or refresh the Welcome tab (leftmost). Called from ensureSheets().
 * @param {GoogleAppsScript.Spreadsheet.Spreadsheet} ss
 */
function ensureWelcomeSheet_(ss) {
  var welcome = ss.getSheetByName(SHEETS.WELCOME);
  if (!welcome) {
    welcome = ss.insertSheet(SHEETS.WELCOME);
    ss.setActiveSheet(welcome);
    ss.moveActiveSheet(0);
  }

  var rows = buildWelcomeContent_();
  var numRows = rows.length;
  var range = welcome.getRange(1, 1, numRows, 1);
  range.clearContent().clearFormat();
  range.setValues(rows);
  range.setWrap(true);
  range.setVerticalAlignment('top');

  welcome.setColumnWidth(1, 520);

  var title = welcome.getRange(1, 1);
  title.setFontWeight('bold').setFontSize(14);

  for (var i = 0; i < WELCOME_HEADING_ROWS_.length; i++) {
    welcome.getRange(WELCOME_HEADING_ROWS_[i], 1).setFontWeight('bold');
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { buildWelcomeContent_: buildWelcomeContent_ };
}
