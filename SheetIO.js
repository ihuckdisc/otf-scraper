/**
 * SheetIO.js - all spreadsheet reads/writes.
 *
 * Responsibilities:
 *   - ensureSheets(): idempotent bootstrap of the Welcome, Data, and Log tabs,
 *     freeze, number/date formats, formula columns, hidden helper column).
 *   - readRecords(): read existing rows back into record objects for dedupe and
 *     "better data" comparison.
 *   - insertRecordsAtTop() + sortByDateDesc(): newest-first insertion that keeps
 *     Manual rows correctly ordered and never rewrites their cell contents.
 *   - addManualRow(): user-entered row tagged Source=Manual.
 *
 * 1-based column indices are derived once from the COLUMNS schema so the layout
 * lives only in Config.js.
 */

/** Build helper maps from the schema: key->index, header list, etc. (1-based). */
function getColumnMeta() {
  var byKey = {};
  var headers = [];
  for (var i = 0; i < COLUMNS.length; i++) {
    byKey[COLUMNS[i].key] = i + 1;
    headers.push(COLUMNS[i].header);
  }
  return { byKey: byKey, headers: headers, count: COLUMNS.length };
}

/**
 * Resolve a schema column's 1-based index from the sheet header row when present,
 * falling back to the schema position (handles extra/missing columns vs. COLUMNS).
 */
function getDataColumnIndex_(sheet, key) {
  var meta = getColumnMeta();
  var expectedHeader = null;
  for (var i = 0; i < COLUMNS.length; i++) {
    if (COLUMNS[i].key === key) {
      expectedHeader = COLUMNS[i].header;
      break;
    }
  }
  if (!expectedHeader) return meta.byKey[key];
  var lastCol = sheet.getLastColumn();
  if (lastCol < 1) return meta.byKey[key];
  var headerRow = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  for (var c = 0; c < headerRow.length; c++) {
    if (String(headerRow[c]).trim() === expectedHeader) return c + 1;
  }
  return meta.byKey[key];
}

function getSpreadsheet_() {
  return SpreadsheetApp.getActiveSpreadsheet();
}

function getDataSheet_() {
  return getSpreadsheet_().getSheetByName(SHEETS.DATA);
}

/** Read trimmed header strings from row 1. */
function readHeaderRow_(sheet) {
  var lastCol = sheet.getLastColumn();
  if (lastCol < 1) return [];
  var row = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  var out = [];
  for (var i = 0; i < row.length; i++) out.push(String(row[i]).trim());
  return out;
}

/** True if `name` appears in headers at any index other than `excludeIndex`. */
function headerExistsIn_(headers, name, excludeIndex) {
  for (var j = 0; j < headers.length; j++) {
    if (j === excludeIndex) continue;
    if (headers[j] === name) return true;
  }
  return false;
}

/**
 * Insert missing schema columns so existing data stays aligned when COLUMNS grows.
 * Skips positions where the expected header already exists elsewhere (user reorder).
 */
function syncSchemaColumns_(sheet) {
  var headers = readHeaderRow_(sheet);
  for (var i = 0; i < COLUMNS.length; i++) {
    var expected = COLUMNS[i].header;
    var actual = headers[i] || '';
    if (actual === expected) continue;
    if (headerExistsIn_(headers, expected, i)) continue;
    sheet.insertColumnBefore(i + 1);
    headers.splice(i, 0, '');
  }
}

/**
 * Create/repair the Data and Log tabs. Safe to run repeatedly: it never clears
 * existing data rows, only (re)writes headers, formats, and formula columns.
 */
function ensureSheets() {
  var ss = getSpreadsheet_();
  var meta = getColumnMeta();

  var data = ss.getSheetByName(SHEETS.DATA);
  if (!data) data = ss.insertSheet(SHEETS.DATA);

  syncSchemaColumns_(data);

  // Header row.
  data.getRange(1, 1, 1, meta.count).setValues([meta.headers]).setFontWeight('bold');
  data.setFrozenRows(1);

  // Per-column number/date formats + hidden helper columns, applied below header.
  var maxRows = Math.max(data.getMaxRows() - 1, 1);
  for (var i = 0; i < COLUMNS.length; i++) {
    var c = COLUMNS[i];
    var colIdx = i + 1;
    if (c.format) {
      data.getRange(2, colIdx, maxRows, 1).setNumberFormat(c.format);
    }
    if (c.kind === 'hidden') {
      data.hideColumns(colIdx);
    }
  }

  // Stamp formula columns across any existing data rows.
  stampFormulaColumns_(data);

  // Log tab.
  var log = ss.getSheetByName(SHEETS.LOG);
  if (!log) log = ss.insertSheet(SHEETS.LOG);
  log.getRange(1, 1, 1, LOG_COLUMNS.length).setValues([LOG_COLUMNS]).setFontWeight('bold');
  log.setFrozenRows(1);

  ensureWelcomeSheet_(ss);
  ensureDashCalcSheet_(ss);

  return data;
}

/** Write the positional formulas into every formula column for all data rows. */
function stampFormulaColumns_(sheet) {
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return;
  var n = lastRow - 1;
  for (var i = 0; i < COLUMNS.length; i++) {
    var c = COLUMNS[i];
    if (c.kind !== 'formula') continue;
    var formula = c.formula();
    var formulas = [];
    for (var r = 0; r < n; r++) formulas.push([formula]);
    sheet.getRange(2, i + 1, n, 1).setFormulas(formulas);
  }
}

/**
 * Read existing rows into record objects keyed by schema field.
 * @returns {Array<{rowIndex:number, record:Object}>}
 */
function readRecords() {
  var sheet = getDataSheet_();
  if (!sheet) return [];
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];
  var meta = getColumnMeta();
  var values = sheet.getRange(2, 1, lastRow - 1, meta.count).getValues();
  var out = [];
  for (var r = 0; r < values.length; r++) {
    var rec = {};
    for (var i = 0; i < COLUMNS.length; i++) {
      var c = COLUMNS[i];
      if (c.kind === 'value' || c.kind === 'hidden') rec[c.key] = values[r][i];
    }
    out.push({ rowIndex: r + 2, record: rec });
  }
  return out;
}

/** Turn a record object into a row array in column order (formulas as text). */
function recordToRowArray_(record) {
  var row = [];
  for (var i = 0; i < COLUMNS.length; i++) {
    var c = COLUMNS[i];
    if (c.kind === 'formula') {
      row.push(c.formula());
    } else {
      var v = record[c.key];
      if (c.duration && v !== '' && v != null && typeof v === 'string') {
        v = parseDurationToDays(v);
      }
      row.push(v == null ? '' : v);
    }
  }
  return row;
}

/**
 * Insert new records at the top (newest-first), then re-sort the whole data
 * range by Date descending. Manual rows keep their content and are reordered by
 * date along with everything else.
 * @param {Object[]} records
 */
function insertRecordsAtTop(records) {
  if (!records || !records.length) return;
  var sheet = ensureSheets();
  var meta = getColumnMeta();

  // Insert blank rows below the header and write the new records there.
  sheet.insertRowsBefore(2, records.length);
  var rows = records.map(recordToRowArray_);
  sheet.getRange(2, 1, rows.length, meta.count).setValues(rows);

  sortByDateDesc();
  stampFormulaColumns_(sheet);
  reapplyFormats_(sheet);
}

/** Sort the data region by the Date column, newest first. */
function sortByDateDesc() {
  var sheet = getDataSheet_();
  var lastRow = sheet.getLastRow();
  if (lastRow < 3) return; // 0 or 1 data rows: nothing to sort.
  var meta = getColumnMeta();
  sheet.getRange(2, 1, lastRow - 1, meta.count)
       .sort({ column: meta.byKey.date, ascending: false });
}

/** Re-apply number/date formats to the current data range. */
function reapplyFormats_(sheet) {
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return;
  var n = lastRow - 1;
  for (var i = 0; i < COLUMNS.length; i++) {
    var c = COLUMNS[i];
    if (c.format) sheet.getRange(2, i + 1, n, 1).setNumberFormat(c.format);
  }
}

/** System fields the manual form must not expose (set by the engine itself). */
var MANUAL_EXCLUDE = { status: true, source: true, uniqueKey: true };

/**
 * Field descriptors for the manual-entry form, derived from the schema so the
 * form never drifts from COLUMNS. Excludes formula columns (#, Year, Total Active
 * Minutes, ...), hidden helpers, and engine-managed value fields.
 * @returns {Array<{key:string, header:string, duration:boolean}>}
 */
function getManualRowFields() {
  var fields = [];
  for (var i = 0; i < COLUMNS.length; i++) {
    var c = COLUMNS[i];
    if (c.kind !== 'value') continue;
    if (MANUAL_EXCLUDE[c.key]) continue;
    fields.push({ key: c.key, header: c.header, duration: !!c.duration });
  }
  return fields;
}

/**
 * Open the manual-entry form (replaces the old prompt chain). Manual rows are
 * excluded from dedupe/reflagging by the ingestion engine.
 */
function addManualRow() {
  var html = HtmlService.createHtmlOutputFromFile('ManualRowForm')
    .setWidth(380)
    .setHeight(580);
  SpreadsheetApp.getUi().showModalDialog(html, 'Add Manual Workout');
}

/**
 * Persist a manual workout submitted from the form. Empty fields stay blank
 * (never 0). Reuses the same parsers as the scraper so types stay consistent.
 * @param {Object<string,string>} formData - { fieldKey: rawValue }
 * @returns {{ok:boolean, message:string}}
 */
function submitManualRow(formData) {
  formData = formData || {};
  var date = parseDate(formData.date);
  if (!date) return { ok: false, message: 'Date is required (MM/DD/YYYY).' };

  var record = emptyRecord();
  var fields = getManualRowFields();
  for (var i = 0; i < fields.length; i++) {
    var f = fields[i];
    var raw = formData[f.key];
    if (raw == null || String(raw).trim() === '') continue; // leave blank, never 0

    if (f.key === 'date') {
      record.date = date;
    } else if (f.key === 'classTime') {
      record.classTime = parseClassTime(raw);
    } else if (f.key === 'studio' || f.key === 'coach') {
      record[f.key] = collapseWhitespace(raw);
    } else if (f.duration) {
      record[f.key] = parseDuration(raw); // recordToRowArray_ converts to a day fraction
    } else {
      record[f.key] = parseNumber(raw);   // '' when not numeric -> stays blank
    }
  }

  record.source = SOURCE.MANUAL;
  record.uniqueKey = buildUniqueKey(record, 'manual:' + new Date().getTime());

  insertRecordsAtTop([record]);
  logRun('Add Manual Row', { scanned: 0, added: 1, skipped: 0, flags: 0, errors: 0 });
  toast('Added 1 manual row.');
  return { ok: true, message: 'Added 1 manual row.' };
}

/** Menu action: delete all data rows (Email + Manual), then restore sheet layout. */
function clearAllData() {
  var ui = SpreadsheetApp.getUi();
  var resp = ui.alert(
    'Clear All Data',
    'Delete every class row (Email and Manual)? This cannot be undone.',
    ui.ButtonSet.YES_NO
  );
  if (resp !== ui.Button.YES) return;

  var sheet = getDataSheet_();
  if (!sheet) { ensureSheets(); return; }
  var lastRow = sheet.getLastRow();
  var deleted = 0;
  if (lastRow >= 2) {
    deleted = lastRow - 1;
    sheet.deleteRows(2, deleted);
  }

  ensureSheets();
  logRun('Clear All Data', { scanned: 0, added: 0, skipped: 0, flags: 0, errors: 0 });
  toast('Cleared ' + deleted + ' row(s). Run Full Scrape to reload email data.');
}

/** Menu action: delete all Data rows and clear Log history, then restore sheet layout. */
function resetSheet() {
  var ui = SpreadsheetApp.getUi();
  var resp = ui.alert(
    'Reset Sheet',
    'Reset the entire sheet? This deletes ALL class rows (Email and Manual) AND clears the entire Log history. This cannot be undone.',
    ui.ButtonSet.YES_NO
  );
  if (resp !== ui.Button.YES) return;

  var sheet = getDataSheet_();
  if (!sheet) { ensureSheets(); return; }
  var lastRow = sheet.getLastRow();
  if (lastRow >= 2) {
    sheet.deleteRows(2, lastRow - 1);
  }

  var ss = getSpreadsheet_();
  var log = ss.getSheetByName(SHEETS.LOG);
  if (log) {
    var logLastRow = log.getLastRow();
    if (logLastRow >= 2) {
      log.deleteRows(2, logLastRow - 1);
    }
  }

  ensureSheets();
  toast('Sheet reset to clean state.');
}

/** True when a row should be kept (Manual), not deleted. */
function isClearEmailKeepRow_(sourceVal, uniqueKeyVal) {
  var src = String(sourceVal == null ? '' : sourceVal).trim().toLowerCase();
  if (src === SOURCE.MANUAL.toLowerCase()) return true;
  var uk = String(uniqueKeyVal == null ? '' : uniqueKeyVal).trim().toLowerCase();
  return uk.indexOf('manual:') !== -1;
}

/** True when clear-email should delete this row. */
function isClearEmailDeleteRow_(sourceVal, uniqueKeyVal) {
  return !isClearEmailKeepRow_(sourceVal, uniqueKeyVal);
}

/** Count how many rows would be deleted vs kept before clear-email runs. */
function countClearEmailPlan_(sources, uniqueKeys) {
  var manual = 0;
  var wouldDelete = 0;
  for (var r = 0; r < sources.length; r++) {
    var uk = uniqueKeys[r]
      ? String(uniqueKeys[r][0] == null ? '' : uniqueKeys[r][0]).trim()
      : '';
    if (isClearEmailKeepRow_(sources[r][0], uk)) manual++;
    else wouldDelete++;
  }
  return { manual: manual, wouldDelete: wouldDelete };
}

/** Menu action: delete Email-sourced rows only; Manual rows are kept. */
function clearEmailData() {
  var ui = SpreadsheetApp.getUi();
  var sheet = getDataSheet_();
  if (!sheet) { ensureSheets(); return; }
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) {
    toast('No data rows to clear.');
    return;
  }

  var sourceCol = getDataColumnIndex_(sheet, 'source');
  var uniqueKeyCol = getDataColumnIndex_(sheet, 'uniqueKey');
  var numRows = lastRow - 1;
  var sources = sheet.getRange(2, sourceCol, numRows, 1).getValues();
  var uniqueKeys = sheet.getRange(2, uniqueKeyCol, numRows, 1).getValues();
  var plan = countClearEmailPlan_(sources, uniqueKeys);

  var confirmMsg =
    'Delete ' + plan.wouldDelete + ' row(s) and keep ' + plan.manual + ' Manual row(s)?\n\n' +
    'Manual rows are kept when Source = Manual or Unique Key contains "manual:".';
  if (plan.manual === 0) {
    confirmMsg =
      'WARNING: No Manual rows were detected.\n\n' +
      'Nothing will be kept unless you cancel.\n\n' +
      confirmMsg;
  }
  var resp = ui.alert('Clear Email Data', confirmMsg, ui.ButtonSet.YES_NO);
  if (resp !== ui.Button.YES) return;

  var deleted = 0;
  for (var r = sources.length - 1; r >= 0; r--) {
    if (isClearEmailDeleteRow_(sources[r][0], uniqueKeys[r][0])) {
      sheet.deleteRow(r + 2);
      deleted++;
    }
  }

  ensureSheets();
  logRun('Clear Email Data', { scanned: 0, added: 0, skipped: 0, flags: 0, errors: 0 });
  toast(
    'Cleared ' + deleted + ' row(s). Kept ' + plan.manual + ' Manual row(s).',
    'Clear Email Data'
  );
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    getColumnMeta: getColumnMeta,
    recordToRowArray_: recordToRowArray_,
    getManualRowFields: getManualRowFields,
    getDataColumnIndex_: getDataColumnIndex_,
    isClearEmailDeleteRow_: isClearEmailDeleteRow_,
  };
}
