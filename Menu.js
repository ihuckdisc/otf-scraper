/**
 * Menu.js - custom menu + on-sheet button entry points.
 *
 * onOpen() builds the "OTF Scraper" menu. The two scrape entry points are also
 * exposed as plain top-level functions (runUpdate / runFullScrape, defined in
 * Ingest.js) so they can be wired to inserted Drawing buttons. Apps Script
 * cannot create Drawing buttons programmatically, so that wiring is a one-time
 * manual step documented in README.md.
 */

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('OTF Scraper')
    .addItem('Update (since last class)', 'runUpdate')
    .addItem('Full Scrape (all emails)', 'runFullScrape')
    .addSeparator()
    .addItem('Add Manual Row', 'addManualRow')
    .addItem('Refresh Dashboard Calcs', 'runRefreshDashboardCalcs')
    .addSeparator()
    .addItem('Clear All Data', 'clearAllData')
    .addItem('Clear Email Data (keep Manual)', 'clearEmailData')
    .addSeparator()
    .addItem('Reset Sheet (delete all data + logs)', 'resetSheet')
    .addSeparator()
    .addItem('Initialize Sheet', 'initializeSheet')
    .addItem('View Welcome', 'viewWelcome')
    .addItem('View Log', 'viewLog')
    .addItem('View Dashboard Data', 'viewDashCalc')
    .addToUi();
}

/** Menu action: (re)build Welcome, Data, and Log tabs. Idempotent. */
function initializeSheet() {
  ensureSheets();
  toast('Sheet initialized: Welcome, Data, and Log tabs ready.', 'OTF Scraper');
}

/** Menu action: jump to the Welcome tab. */
function viewWelcome() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var welcome = ss.getSheetByName(SHEETS.WELCOME);
  if (!welcome) { ensureSheets(); welcome = ss.getSheetByName(SHEETS.WELCOME); }
  ss.setActiveSheet(welcome);
}

/** Menu action: jump to the Log tab. */
function viewLog() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var log = ss.getSheetByName(SHEETS.LOG);
  if (!log) { ensureSheets(); log = ss.getSheetByName(SHEETS.LOG); }
  ss.setActiveSheet(log);
}

/** Menu + button: refresh script-computed monthly band (A–S) after manual Data edits. */
function runRefreshDashboardCalcs() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  refreshMonthlyBand_(ss);
  toast('Monthly dashboard data updated.', 'OTF Scraper');
}

/** Menu action: jump to the Dash_Calc helper tab (source for FIXED charts). */
function viewDashCalc() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var dashCalc = ss.getSheetByName(SHEETS.DASH_CALC);
  if (!dashCalc) { ensureSheets(); dashCalc = ss.getSheetByName(SHEETS.DASH_CALC); }
  ss.setActiveSheet(dashCalc);
}
