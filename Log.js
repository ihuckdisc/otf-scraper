/**
 * Log.js - Log tab writer + toast helper.
 *
 * Every run appends one row to the Log tab and surfaces a short toast. The Log
 * is append-only history; per-row review/duplicate/anomaly state lives in the
 * Data tab's Status column (single source of truth).
 */

/**
 * Append a run summary to the Log tab.
 * @param {string} runType - "Update" | "Full Scrape" | "Add Manual Row"
 * @param {{scanned:number, added:number, skipped:number, flags:number, errors:number}} stats
 */
function logRun(runType, stats) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var log = ss.getSheetByName(SHEETS.LOG);
  if (!log) {
    ensureSheets();
    log = ss.getSheetByName(SHEETS.LOG);
  }
  log.appendRow([
    new Date(),
    runType,
    stats.scanned || 0,
    stats.added || 0,
    stats.skipped || 0,
    stats.flags || 0,
    stats.errors || 0,
  ]);
}

/** Show a transient toast on the active spreadsheet. */
function toast(message, title, seconds) {
  SpreadsheetApp.getActiveSpreadsheet().toast(message, title || 'OTF Scraper', seconds || 5);
}

/** Build a human-readable one-line summary from run stats. */
function summarizeStats(stats) {
  return (stats.added || 0) + ' added, ' +
         (stats.skipped || 0) + ' skipped, ' +
         (stats.flags || 0) + ' flagged' +
         (stats.errors ? (', ' + stats.errors + ' errors') : '');
}
