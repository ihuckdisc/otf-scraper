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
 *   - QUERY aggregates value columns only (count/sum/avg). Derived ratios (zone %,
 *     cal/active min) are NOT computed inside QUERY: Google's QUERY engine returns
 *     #N/A when several division expressions share a grouped select (a single
 *     division is fine; multiple together fail). Instead the monthly table emits
 *     raw zone-minute sums and the ratios are ARRAYFORMULA columns placed beside
 *     the spill (buildMonthlyDerivedFormulas_).
 *   - Only ensureDashCalcSheet_(ss) touches the Spreadsheet service.
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

/**
 * Monthly time series: one row per Year-Month. Groups on year(Col2)/month(Col2)
 * and filters with Col2 >= date '2010-01-01'. NO `order by` clause: in Google
 * QUERY, `order by year(Col2), month(Col2)` over a grouped query returns #N/A,
 * while grouped output is already returned in ascending group-key (chronological)
 * order.
 *
 * Selects ONLY plain aggregates (count/sum/avg). It deliberately emits the five
 * raw zone-minute sums rather than zone-% divisions: QUERY returns #N/A when
 * several division expressions share one grouped select. The ratios are
 * computed beside the spill by buildMonthlyDerivedFormulas_. Column layout of the
 * spill (queryCol = B): B year, C month, D count, E sum cal, F avg cal, G avg
 * splat, H avg HR, I-M zone-minute sums (grey/blue/green/orange/red).
 * @returns {string} QUERY formula
 */
function buildMonthlyQuery_() {
  var d = colQueryRef_('date');
  var sel = [
    'year(' + d + ')', 'month(' + d + ')', 'count(' + d + ')',
    'sum(' + colQueryRef_('calories') + ')', 'avg(' + colQueryRef_('calories') + ')',
    'avg(' + colQueryRef_('splatPoints') + ')', 'avg(' + colQueryRef_('avgHr') + ')',
    'sum(' + colQueryRef_('zoneGrey') + ')', 'sum(' + colQueryRef_('zoneBlue') + ')',
    'sum(' + colQueryRef_('zoneGreen') + ')', 'sum(' + colQueryRef_('zoneOrange') + ')',
    'sum(' + colQueryRef_('zoneRed') + ')'
  ];
  return '=QUERY(' + dataBodyRange_() + ', "select ' + sel.join(', ')
    + ' where ' + queryWhereDateRows_()
    + ' group by year(' + d + '), month(' + d + ') '
    + blankLabels_(sel) + '", 0)';
}

/**
 * ARRAYFORMULA ratio columns for the monthly spill. QUERY cannot host multiple
 * divisions, so Cal/Active-Min and each zone % are derived here from the raw
 * zone-minute sums. IFERROR collapses divide-by-zero (months with no zone data)
 * to "" and the year column gates empty rows.
 * @param {{year:string,totalCal:string,grey:string,blue:string,green:string,orange:string,red:string}} cols spill column letters
 * @param {number} bodyRow first body row of the spill
 * @returns {string[]} [calPerMin, grey%, blue%, green%, orange%, red%]
 */
function buildMonthlyDerivedFormulas_(cols, bodyRow) {
  function rng(c) { return c + bodyRow + ':' + c; }
  var total = '(' + rng(cols.grey) + '+' + rng(cols.blue) + '+' + rng(cols.green)
    + '+' + rng(cols.orange) + '+' + rng(cols.red) + ')';
  var present = rng(cols.year);
  function ratio(numCol) {
    return '=ARRAYFORMULA(IF(' + present + '="","",IFERROR('
      + rng(numCol) + '/' + total + ',"")))';
  }
  return [
    ratio(cols.totalCal),
    ratio(cols.grey), ratio(cols.blue), ratio(cols.green), ratio(cols.orange), ratio(cols.red)
  ];
}

/**
 * ARRAYFORMULA yyyy-mm label from QUERY year (col B) and month (col C) spill.
 * @param {string} yearColLetter
 * @param {string} monthColLetter
 * @param {number} bodyRow
 * @returns {string}
 */
function buildMonthLabelFormula_(yearColLetter, monthColLetter, bodyRow) {
  var y = yearColLetter + bodyRow + ':' + yearColLetter;
  var m = monthColLetter + bodyRow + ':' + monthColLetter;
  return '=ARRAYFORMULA(IF(ISNUMBER(' + y + '),TEXT(DATE(' + y + ',' + m + ',1),"yyyy-mm"),""))';
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
    { label: 'PR: Max Rower Avg Watts', formula: '=MAX(' + dashColRange_('rowerAvgWatts') + ')', format: '#,##0.0' }
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
  title: 'Dash_Calc - slicer-immune QUERY tables that back the FIXED dashboard charts. '
    + 'Do NOT attach slicers to this tab; build FIXED charts from these ranges. '
    + 'Rebuilt by OTF Scraper -> Initialize Sheet.',
  monthly: {
    name: 'Monthly time series',
    labelCol: 1,                 // A: yyyy-mm label
    labelHeader: 'Year-Month',
    queryCol: 2,                 // B..M: raw QUERY aggregates (12 cols)
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
function ensureDashCalcSheet_(ss) {
  var L = DASH_CALC_LAYOUT_;
  var sheet = ss.getSheetByName(SHEETS.DASH_CALC) || ss.insertSheet(SHEETS.DASH_CALC);

  sheet.clear();
  sheet.clearNotes();

  sheet.getRange(L.titleRow, 1).setValue(L.title).setFontWeight('bold');

  writeQueryBand_(sheet, L.monthly, buildMonthlyQuery_(), L);
  writeQueryBand_(sheet, L.byCoach, buildByCoachQuery_(), L);
  writeQueryBand_(sheet, L.byStudio, buildByStudioQuery_(), L);
  writeScorecards_(sheet, L.scorecards, buildScorecards_(), L);

  var m = L.monthly;
  var yearLetter = columnIndexToLetter_(m.queryCol);
  var monthLetter = columnIndexToLetter_(m.queryCol + 1);
  sheet.getRange(L.headerRow, m.labelCol).setValue(m.labelHeader).setFontWeight('bold');
  sheet.getRange(L.bodyRow, m.labelCol)
    .setFormula(buildMonthLabelFormula_(yearLetter, monthLetter, L.bodyRow));

  writeMonthlyDerived_(sheet, m, L);

  return sheet;
}

/**
 * Write the monthly ratio columns (Cal/Active-Min and zone %) beside the spill.
 * Spill column letters are derived from queryCol so positions never hardcode.
 */
function writeMonthlyDerived_(sheet, m, L) {
  var qc = m.queryCol;
  var cols = {
    year: columnIndexToLetter_(qc),         // B
    totalCal: columnIndexToLetter_(qc + 3), // E
    grey: columnIndexToLetter_(qc + 7),     // I
    blue: columnIndexToLetter_(qc + 8),     // J
    green: columnIndexToLetter_(qc + 9),    // K
    orange: columnIndexToLetter_(qc + 10),  // L
    red: columnIndexToLetter_(qc + 11)      // M
  };
  var formulas = buildMonthlyDerivedFormulas_(cols, L.bodyRow);
  for (var i = 0; i < formulas.length; i++) {
    var col = m.derivedCol + i;
    sheet.getRange(L.headerRow, col).setValue(m.derivedHeaders[i]).setFontWeight('bold');
    sheet.getRange(L.bodyRow, col).setFormula(formulas[i]);
    sheet.getRange(L.bodyRow, col, L.spillRows, 1).setNumberFormat(m.derivedFormats[i]);
  }
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
    buildMonthlyQuery_: buildMonthlyQuery_,
    buildMonthlyDerivedFormulas_: buildMonthlyDerivedFormulas_,
    blankLabels_: blankLabels_,
    buildMonthLabelFormula_: buildMonthLabelFormula_,
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
