/**
 * Dashboard.js - builds the Dash_Calc helper tab.
 *
 * Why this exists: the user-built Dashboard tab uses slicers (Year, Month,
 * Studio, Coach). A Google Sheets slicer filters EVERY chart/pivot built on its
 * attached Data range, with no per-chart opt-out. Charts whose axis IS a slicer
 * dimension (over time, by Coach, by Studio) therefore collapse when a slicer is
 * applied. The fix is to source those "FIXED" charts from a range slicers never
 * touch: a QUERY that reads the whole Data range. Its output ignores slicers.
 *
 * Design:
 *   - Pure builders (no SpreadsheetApp) construct the QUERY/scorecard strings so
 *     they are unit-testable under Node, exactly like the COLUMNS formula()
 *     closures. QUERY clauses use colQueryRef_() (ColN); scorecards use A1 letters
 *     via colLetterForKey_(). Never hardcode column positions.
 *   - Monthly band (cols A–S) is script-computed: a continuous month spine with
 *     pause months (zero classes) so FIXED over-time charts do not bridge gaps.
 *     refreshMonthlyBand_ writes values via setValues; By Coach / By Studio remain QUERY.
 *   - ensureDashCalcSheet_(ss) full init; refreshMonthlyBand_(ss) light refresh after ingest.
 *   - Idempotent: re-running Initialize Sheet clears Dash_Calc and rewrites the
 *     header labels + QUERY anchors. It never touches the user's Dashboard tab.
 *   - Horizontal layout: each table occupies its own column band with a wide gap
 *     so tables that grow downward (months/coaches accumulate) never collide.
 */

/** A1 letter for a schema key (scorecards and sheet-level refs). */
function dashCol_(key) {
  return colLetterForKey_(key);
}

/** Body of the Data range (no header row): 'Data!A2:BB'. */
function dataBodyRange_() {
  return SHEETS.DATA + '!A2:' + lastColLetter_();
}

var ZONE_MIN_KEYS_ = ['zoneGrey', 'zoneBlue', 'zoneGreen', 'zoneOrange', 'zoneRed'];

/** Sum of all five zone-minute value columns for a QUERY group. */
function zoneMinSumExpr_() {
  var parts = [];
  for (var i = 0; i < ZONE_MIN_KEYS_.length; i++) {
    parts.push('sum(' + colQueryRef_(ZONE_MIN_KEYS_[i]) + ')');
  }
  return '(' + parts.join('+') + ')';
}

/** Group-level calories per active minute from value columns. */
function calPerActiveMinExpr_() {
  return 'sum(' + colQueryRef_('calories') + ')/' + zoneMinSumExpr_();
}

/**
 * `label` clause that blanks QUERY's auto-generated output header. QUERY always
 * emits a header row of function names (year(), sum, avg, ...) for aggregated
 * selects regardless of the source-headers argument; that text row is noise and
 * its non-numeric cells break downstream formulas (e.g. DATE on "year()"). Naming
 * every selected expression with '' leaves that header row blank.
 * @param {string[]} selExprs the select expressions, in order
 * @returns {string} e.g. "label year(Col2) '', count(Col2) ''"
 */
function blankLabels_(selExprs) {
  var parts = [];
  for (var i = 0; i < selExprs.length; i++) parts.push(selExprs[i] + " ''");
  return 'label ' + parts.join(', ');
}

/** Filter to rows with a real class date (QUERY is-not-null on dates matches nothing). */
function queryWhereDateRows_() {
  return colQueryRef_('date') + " >= date '2010-01-01'";
}

/** @param {*} v @returns {number|null} */
function dashNum_(v) {
  if (v === '' || v == null) return null;
  var n = typeof v === 'number' ? v : parseFloat(v);
  return isNaN(n) ? null : n;
}

/** @returns {string} e.g. "2019-12" */
function monthKey_(year, month) {
  return year + '-' + (month < 10 ? '0' + month : String(month));
}

/**
 * Scan records for valid dates; return first/last class month (local midnight).
 * @param {Object[]} records
 * @returns {{first:Date, last:Date}|null}
 */
function firstLastClassMonth_(records) {
  var first = null;
  var last = null;
  for (var i = 0; i < records.length; i++) {
    var d = records[i].date;
    if (!(d instanceof Date) || isNaN(d.getTime())) continue;
    d = toLocalMidnight(d);
    if (!first || d < first) first = d;
    if (!last || d > last) last = d;
  }
  if (!first || !last) return null;
  return { first: first, last: last };
}

/**
 * Continuous month spine from first-of-month through last-of-month (inclusive).
 * @param {Date} firstDate
 * @param {Date} lastDate
 * @returns {Array<{label:string, year:number, month:number}>}
 */
function buildMonthSpine_(firstDate, lastDate) {
  var cur = new Date(firstDate.getFullYear(), firstDate.getMonth(), 1);
  var end = new Date(lastDate.getFullYear(), lastDate.getMonth(), 1);
  var spine = [];
  while (cur.getTime() <= end.getTime()) {
    var y = cur.getFullYear();
    var m = cur.getMonth() + 1;
    spine.push({ label: monthKey_(y, m), year: y, month: m });
    cur = addCalendarMonths_(cur, 1);
  }
  return spine;
}

/** @returns {Object} empty monthly aggregate bucket */
function emptyMonthlyAgg_() {
  return {
    classes: 0, sumCal: 0, sumSplats: 0, hrSum: 0, hrCount: 0,
    zoneGrey: 0, zoneBlue: 0, zoneGreen: 0, zoneOrange: 0, zoneRed: 0
  };
}

/**
 * Single pass: bucket records by yyyy-mm. Avg HR uses sum/count of rows with HR only.
 * @param {Object[]} records
 * @returns {Object<string, Object>}
 */
function aggregateMonthlyFromRecords_(records) {
  var map = {};
  for (var i = 0; i < records.length; i++) {
    var rec = records[i];
    var d = rec.date;
    if (!(d instanceof Date) || isNaN(d.getTime())) continue;
    d = toLocalMidnight(d);
    var key = monthKey_(d.getFullYear(), d.getMonth() + 1);
    if (!map[key]) map[key] = emptyMonthlyAgg_();
    var agg = map[key];
    agg.classes++;
    var cal = dashNum_(rec.calories);
    if (cal != null) agg.sumCal += cal;
    var splat = dashNum_(rec.splatPoints);
    if (splat != null) agg.sumSplats += splat;
    var hr = dashNum_(rec.avgHr);
    if (hr != null) { agg.hrSum += hr; agg.hrCount++; }
    var zg = dashNum_(rec.zoneGrey); if (zg != null) agg.zoneGrey += zg;
    var zb = dashNum_(rec.zoneBlue); if (zb != null) agg.zoneBlue += zb;
    var zn = dashNum_(rec.zoneGreen); if (zn != null) agg.zoneGreen += zn;
    var zo = dashNum_(rec.zoneOrange); if (zo != null) agg.zoneOrange += zo;
    var zr = dashNum_(rec.zoneRed); if (zr != null) agg.zoneRed += zr;
  }
  return map;
}

/**
 * Derived metrics for one month (F–H, N–S). Pause months: averages/ratios blank.
 * @param {Object} agg
 * @returns {{avgCal:*, avgSplat:*, avgHr:*, calPerMin:*, zonePcts:Array}}
 */
function computeDerivedMetrics_(agg) {
  var blank = '';
  if (!agg.classes) {
    return { avgCal: blank, avgSplat: blank, avgHr: blank, calPerMin: blank,
      zonePcts: [blank, blank, blank, blank, blank] };
  }
  var zoneTotal = agg.zoneGrey + agg.zoneBlue + agg.zoneGreen + agg.zoneOrange + agg.zoneRed;
  var avgCal = agg.sumCal / agg.classes;
  var avgSplat = agg.sumSplats / agg.classes;
  var avgHr = agg.hrCount > 0 ? agg.hrSum / agg.hrCount : blank;
  var calPerMin = zoneTotal > 0 ? agg.sumCal / zoneTotal : blank;
  var zonePcts = zoneTotal > 0
    ? [
      agg.zoneGrey / zoneTotal, agg.zoneBlue / zoneTotal, agg.zoneGreen / zoneTotal,
      agg.zoneOrange / zoneTotal, agg.zoneRed / zoneTotal
    ]
    : [blank, blank, blank, blank, blank];
  return { avgCal: avgCal, avgSplat: avgSplat, avgHr: avgHr, calPerMin: calPerMin, zonePcts: zonePcts };
}

/**
 * One monthly band row (19 columns A–S).
 * @param {{label:string, year:number, month:number}} entry
 * @param {Object} agg
 * @returns {Array}
 */
function buildOneMonthlyRow_(entry, agg) {
  var derived = computeDerivedMetrics_(agg);
  var pause = !agg.classes;
  return [
    entry.label,
    entry.year,
    entry.month,
    pause ? 0 : agg.classes,
    pause ? 0 : agg.sumCal,
    derived.avgCal,
    derived.avgSplat,
    derived.avgHr,
    pause ? 0 : agg.zoneGrey,
    pause ? 0 : agg.zoneBlue,
    pause ? 0 : agg.zoneGreen,
    pause ? 0 : agg.zoneOrange,
    pause ? 0 : agg.zoneRed,
    derived.calPerMin,
    derived.zonePcts[0], derived.zonePcts[1], derived.zonePcts[2],
    derived.zonePcts[3], derived.zonePcts[4]
  ];
}

/**
 * @param {Array<{label:string, year:number, month:number}>} spine
 * @param {Object<string, Object>} aggMap
 * @returns {Array[]}
 */
function buildMonthlyBandRows_(spine, aggMap) {
  var rows = [];
  for (var i = 0; i < spine.length; i++) {
    var entry = spine[i];
    var agg = aggMap[entry.label] || emptyMonthlyAgg_();
    rows.push(buildOneMonthlyRow_(entry, agg));
  }
  return rows;
}

/**
 * By-coach aggregation, busiest coach first.
 * @returns {string} QUERY formula
 */
function buildByCoachQuery_() {
  var d = colQueryRef_('date');
  var coach = colQueryRef_('coach');
  var sel = [
    coach, 'count(' + d + ')',
    'avg(' + colQueryRef_('calories') + ')', 'avg(' + colQueryRef_('splatPoints') + ')',
    calPerActiveMinExpr_()
  ];
  return '=QUERY(' + dataBodyRange_() + ', "select ' + sel.join(', ')
    + ' where ' + coach + ' is not null group by ' + coach
    + ' order by count(' + d + ') desc '
    + blankLabels_(sel) + '", 0)';
}

/**
 * By-studio aggregation, busiest studio first.
 * @returns {string} QUERY formula
 */
function buildByStudioQuery_() {
  var d = colQueryRef_('date');
  var studio = colQueryRef_('studio');
  var sel = [
    studio, 'count(' + d + ')',
    'avg(' + colQueryRef_('calories') + ')', calPerActiveMinExpr_()
  ];
  return '=QUERY(' + dataBodyRange_() + ', "select ' + sel.join(', ')
    + ' where ' + studio + ' is not null group by ' + studio
    + ' order by count(' + d + ') desc '
    + blankLabels_(sel) + '", 0)';
}

/** Whole-column Data reference for single-cell scorecards, e.g. 'Data!K:K'. */
function dashColRange_(key) {
  var c = dashCol_(key);
  return SHEETS.DATA + '!' + c + ':' + c;
}

/**
 * All-time scorecards and personal records as label/formula pairs. Duration PRs
 * use MINIFS(range, range, "<>") so blank cells are excluded from the minimum.
 * @returns {Array<{label:string, formula:string, format:(string|undefined)}>}
 */
function buildScorecards_() {
  function minifsNonBlank_(key) {
    var r = dashColRange_(key);
    return '=MINIFS(' + r + ', ' + r + ', "<>")';
  }
  return [
    { label: 'Total Classes', formula: '=COUNT(' + dashColRange_('date') + ')', format: '#,##0' },
    { label: 'Total Calories', formula: '=SUM(' + dashColRange_('calories') + ')', format: '#,##0' },
    { label: 'Total Splat Points', formula: '=SUM(' + dashColRange_('splatPoints') + ')', format: '#,##0' },
    { label: 'Avg Calories / Class', formula: '=IFERROR(AVERAGE(' + dashColRange_('calories') + '), "")', format: '0.0' },
    { label: 'PR: Max Calories', formula: '=MAX(' + dashColRange_('calories') + ')', format: '#,##0' },
    { label: 'PR: Max Splat Points', formula: '=MAX(' + dashColRange_('splatPoints') + ')', format: '#,##0' },
    { label: 'PR: Max Tread Distance', formula: '=MAX(' + dashColRange_('treadTotalDistance') + ')', format: '0.00' },
    { label: 'PR: Best Tread Pace', formula: minifsNonBlank_('treadAvgPace'), format: '[mm]:ss' },
    { label: 'PR: Max Elevation / Mile', formula: '=MAX(' + dashColRange_('_elevPerMile') + ')', format: '0.00' },
    { label: 'PR: Best 500m Split', formula: minifsNonBlank_('rowerBest500mSplit'), format: '[mm]:ss' },
    { label: 'PR: Max Rower Avg Watts', formula: '=MAX(' + dashColRange_('rowerAvgWatts') + ')', format: '#,##0.0' },
    { label: 'PR: Max Rower Watts', formula: '=MAX(' + dashColRange_('rowerMaxWatts') + ')', format: '#,##0' }
  ];
}

/**
 * Layout spec for the Dash_Calc tab. Tables sit in separate column bands with a
 * wide gap so downward growth never overwrites a neighbour. headers[] line up
 * with the QUERY's select columns left-to-right; formats[] maps a 0-based offset
 * within a band to a number format applied to that whole spill column.
 */
var DASH_CALC_LAYOUT_ = {
  titleRow: 1,
  headerRow: 2,
  bodyRow: 3,
  spillRows: 1000,
  title: 'Dash_Calc - slicer-immune tables that back the FIXED dashboard charts. '
    + 'Monthly band (A–S) is script-computed and auto-refreshes on ingest; '
    + 'By Coach / By Studio use QUERY. Do NOT attach slicers to this tab. '
    + 'Rebuilt by OTF Scraper -> Initialize Sheet.',
  monthly: {
    name: 'Monthly time series',
    labelCol: 1,                 // A: yyyy-mm label
    labelHeader: 'Year-Month',
    queryCol: 2,                 // B..M: value columns (script-written, not QUERY)
    colCount: 19,                // A..S
    headers: [
      'Year', 'Month', 'Classes', 'Total Calories', 'Avg Calories', 'Avg Splat',
      'Avg HR', 'Grey Min', 'Blue Min', 'Green Min', 'Orange Min', 'Red Min'
    ],
    formats: {
      0: '0', 1: '0', 2: '#,##0', 3: '#,##0', 4: '0.0', 5: '0.0', 6: '0',
      7: '#,##0.0', 8: '#,##0.0', 9: '#,##0.0', 10: '#,##0.0', 11: '#,##0.0'
    },
    derivedCol: 14,              // N..S: ratios derived from the spill sums
    derivedHeaders: [
      'Avg Cal/Active Min', 'Grey %', 'Blue %', 'Green %', 'Orange %', 'Red %'
    ],
    derivedFormats: ['0.0', '0.0%', '0.0%', '0.0%', '0.0%', '0.0%']
  },
  byCoach: {
    name: 'By coach',
    queryCol: 23,                // W
    headers: ['Coach', 'Classes', 'Avg Calories', 'Avg Splat', 'Avg Cal/Active Min'],
    formats: { 1: '#,##0', 2: '0.0', 3: '0.0', 4: '0.0' }
  },
  byStudio: {
    name: 'By studio',
    queryCol: 30,                // AD
    headers: ['Studio', 'Classes', 'Avg Calories', 'Avg Cal/Active Min'],
    formats: { 1: '#,##0', 2: '0.0', 3: '0.0' }
  },
  scorecards: {
    name: 'All-time scorecards & PRs',
    labelCol: 36,                // AJ
    valueCol: 37                 // AK
  }
};

/**
 * Create or refresh the Dash_Calc tab. Idempotent: clears the sheet then writes
 * the band titles, header labels, QUERY anchors, scorecards, and number formats.
 * @param {GoogleAppsScript.Spreadsheet.Spreadsheet} ss
 * @returns {GoogleAppsScript.Spreadsheet.Sheet}
 */
function monthlyHeadersPresent_(sheet, L, band) {
  if (!sheet) return false;
  var label = sheet.getRange(L.headerRow, band.labelCol).getValue();
  return String(label).trim() === band.labelHeader;
}

/** Full init: headers + number formats for monthly band A–S (formats not reapplied on light refresh). */
function writeMonthlyBandHeaders_(sheet, band, L) {
  sheet.getRange(L.titleRow, band.queryCol).setNote(band.name);
  var headers = [band.labelHeader].concat(band.headers).concat(band.derivedHeaders);
  sheet.getRange(L.headerRow, band.labelCol, 1, band.colCount)
    .setValues([headers]).setFontWeight('bold');

  if (band.formats) {
    for (var offsetStr in band.formats) {
      if (!band.formats.hasOwnProperty(offsetStr)) continue;
      var col = band.queryCol + parseInt(offsetStr, 10);
      sheet.getRange(L.bodyRow, col, L.spillRows, 1).setNumberFormat(band.formats[offsetStr]);
    }
  }
  for (var i = 0; i < band.derivedFormats.length; i++) {
    var dcol = band.derivedCol + i;
    sheet.getRange(L.bodyRow, dcol, L.spillRows, 1).setNumberFormat(band.derivedFormats[i]);
  }
}

/**
 * Write monthly body values and clear stale tail. GAS getRange(row, col, numRows, numCols).
 * @param {GoogleAppsScript.Spreadsheet.Sheet} sheet
 * @param {Array[]} rows
 */
function writeMonthlyBandBody_(sheet, rows, band, L) {
  var numRows = rows.length;
  var numCols = band.colCount;

  if (numRows > 0) {
    // Third/fourth args are row/column counts, not end coordinates.
    sheet.getRange(L.bodyRow, 1, numRows, numCols).setValues(rows);
  } else {
    sheet.getRange(L.bodyRow, 1, L.spillRows, numCols).clearContent();
    return;
  }

  var tailStartRow = L.bodyRow + numRows;
  var tailNumRows = L.spillRows - numRows;
  if (tailNumRows > 0) {
    sheet.getRange(tailStartRow, 1, tailNumRows, numCols).clearContent();
  }
}

/**
 * Light refresh: recompute monthly band A–S from Data. Falls back to full init if layout missing.
 * @param {GoogleAppsScript.Spreadsheet.Spreadsheet} ss
 */
function refreshMonthlyBand_(ss) {
  var startMs = Date.now();
  var L = DASH_CALC_LAYOUT_;
  var m = L.monthly;
  var sheet = ss.getSheetByName(SHEETS.DASH_CALC);
  if (!sheet || !monthlyHeadersPresent_(sheet, L, m)) {
    ensureDashCalcSheet_(ss);
    return;
  }

  var raw = readRecords();
  var records = raw.map(function (r) { return r.record; });
  var rows = [];
  var bounds = firstLastClassMonth_(records);
  if (bounds) {
    var spine = buildMonthSpine_(bounds.first, bounds.last);
    var aggMap = aggregateMonthlyFromRecords_(records);
    rows = buildMonthlyBandRows_(spine, aggMap);
  }

  writeMonthlyBandBody_(sheet, rows, m, L);

  if (typeof Logger !== 'undefined' && Logger.log) {
    Logger.log('Dash_Calc monthly refresh: dataRows=' + records.length
      + ', spineMonths=' + rows.length + ', elapsedMs=' + (Date.now() - startMs));
  }
}

function ensureDashCalcSheet_(ss) {
  var L = DASH_CALC_LAYOUT_;
  var sheet = ss.getSheetByName(SHEETS.DASH_CALC) || ss.insertSheet(SHEETS.DASH_CALC);

  sheet.clear();
  sheet.clearNotes();

  sheet.getRange(L.titleRow, 1).setValue(L.title).setFontWeight('bold');

  writeMonthlyBandHeaders_(sheet, L.monthly, L);
  writeQueryBand_(sheet, L.byCoach, buildByCoachQuery_(), L);
  writeQueryBand_(sheet, L.byStudio, buildByStudioQuery_(), L);
  writeScorecards_(sheet, L.scorecards, buildScorecards_(), L);

  refreshMonthlyBand_(ss);

  return sheet;
}

/**
 * Write one QUERY table band: a name note, bold header labels, the anchor
 * formula one row below, and per-column number formats over the spill height.
 */
function writeQueryBand_(sheet, band, queryFormula, L) {
  var startCol = band.queryCol;

  sheet.getRange(L.titleRow, startCol).setNote(band.name);
  sheet.getRange(L.headerRow, startCol, 1, band.headers.length)
    .setValues([band.headers]).setFontWeight('bold');
  sheet.getRange(L.bodyRow, startCol).setFormula(queryFormula);

  if (band.formats) {
    for (var offsetStr in band.formats) {
      if (!band.formats.hasOwnProperty(offsetStr)) continue;
      var col = startCol + parseInt(offsetStr, 10);
      sheet.getRange(L.bodyRow, col, L.spillRows, 1).setNumberFormat(band.formats[offsetStr]);
    }
  }
}

/** Write the vertical label/value scorecards, applying any per-row formats. */
function writeScorecards_(sheet, band, cards, L) {
  sheet.getRange(L.titleRow, band.labelCol).setNote(band.name);
  sheet.getRange(L.headerRow, band.labelCol).setValue('Metric').setFontWeight('bold');
  sheet.getRange(L.headerRow, band.valueCol).setValue('Value').setFontWeight('bold');

  for (var i = 0; i < cards.length; i++) {
    var row = L.bodyRow + i;
    sheet.getRange(row, band.labelCol).setValue(cards[i].label);
    var valueCell = sheet.getRange(row, band.valueCol);
    valueCell.setFormula(cards[i].formula);
    if (cards[i].format) valueCell.setNumberFormat(cards[i].format);
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    monthKey_: monthKey_,
    firstLastClassMonth_: firstLastClassMonth_,
    buildMonthSpine_: buildMonthSpine_,
    aggregateMonthlyFromRecords_: aggregateMonthlyFromRecords_,
    computeDerivedMetrics_: computeDerivedMetrics_,
    buildMonthlyBandRows_: buildMonthlyBandRows_,
    blankLabels_: blankLabels_,
    buildByCoachQuery_: buildByCoachQuery_,
    buildByStudioQuery_: buildByStudioQuery_,
    buildScorecards_: buildScorecards_,
    dataBodyRange_: dataBodyRange_,
    zoneMinSumExpr_: zoneMinSumExpr_,
    calPerActiveMinExpr_: calPerActiveMinExpr_,
    queryWhereDateRows_: queryWhereDateRows_,
    DASH_CALC_LAYOUT_: DASH_CALC_LAYOUT_,
  };
}
