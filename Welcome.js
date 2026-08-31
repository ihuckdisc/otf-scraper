/**
 * Welcome.js - in-sheet next-action guide and script version display.
 *
 * Content is rewritten when ensureSheets() runs (Initialize Sheet). Manual edits
 * on the Welcome tab will be overwritten.
 *
 * Contract: version + next action + skip Clear/Reset + Help. No full runbooks.
 */

/** Row indices (1-based) that receive bold section-heading style. */
var WELCOME_HEADING_ROWS_ = [4, 10, 13, 16];

/**
 * Build the Welcome tab body as a single-column 2D array.
 * @returns {string[][]}
 */
function buildWelcomeContent_() {
  return [
    ['OTF Email Scraper'],
    ['Script version: ' + SCRIPT_VERSION],
    [''],
    ['Do this next'],
    ['If the Data tab has no class rows: OTF Scraper menu → Full Scrape. When Google asks, allow access for this sheet’s script (your copy).'],
    ['If Data already has classes: after new OTbeat emails, use Update (since last class). Do not Full Scrape every time.'],
    ['Done looks like: rows on Data with Date, Calories, and Splat Points filled.'],
    ['Dashboard charts fill in after Full Scrape (empty charts before that are normal).'],
    [''],
    ['Skip these for now'],
    ['Clear All Data, Clear Email Data, and Reset Sheet — only use them when you mean to delete class rows.'],
    [''],
    ['Stuck?'],
    ['OTF Scraper → View Log, then open the User Guide troubleshooting section (link below). Do not mash Update or Full Scrape again if a run failed.'],
    [''],
    ['Help'],
    ['User Guide (install + troubleshooting): https://github.com/ihuckdisc/otf-scraper/blob/main/fixtures/USER_GUIDE.md'],
    ['How to read charts: https://github.com/ihuckdisc/otf-scraper/blob/main/fixtures/DASHBOARD_REFERENCE.md'],
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
