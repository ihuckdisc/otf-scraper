/**
 * Config.js - single source of truth for the OTF Email Scraper.
 *
 * Holds the sender address, sheet/tab names, the full column schema, Gmail query
 * constants, and the layout-family anchor strings. Every other module reads from
 * here so that schema/anchor changes happen in exactly one place.
 *
 * NOTE: In Apps Script all files share one global scope, so these are exposed as
 * globals. The `module.exports` guard at the bottom is inert inside GAS and only
 * exists so the pure-JS modules can be unit-tested under Node.
 */

/** The only sender that produces OTF performance emails. */
var SENDER = 'OTbeatReport@orangetheoryfitness.com';

/** Bump when releasing script changes; Welcome tab shows this after Initialize Sheet. */
var SCRIPT_VERSION = '1.5.1';

/** Sheet/tab names. */
var SHEETS = {
  WELCOME: 'Welcome',
  DATA: 'Data',
  LOG: 'Log',
  DASH_CALC: 'Dash_Calc',
};

/**
 * Column schema (left -> right). This drives header creation, formatting, the
 * record->row mapping, and reads. `key` is the record field; `header` is the
 * visible column title.
 *
 * kind:
 *   'value'   - written from a parsed/manual record field
 *   'formula' - a live per-row formula (re-stamped on insert); `formula(rowExpr)`
 *               returns the A1 formula string given the row's number expression
 *   'hidden'  - a value column that is hidden in the sheet (helper data)
 *
 * format: optional Google Sheets number/date format string.
 */

/** Factory for zone-minute ÷ Total Active Minutes percentage formulas. */
function zonePctFormula_(zoneKey) {
  return function () {
    var zoneCol = colLetterForKey_(zoneKey);
    var activeCol = colLetterForKey_('_activeMin');
    var zoneExpr = 'INDEX($' + zoneCol + ':$' + zoneCol + ',ROW())';
    var activeExpr = 'INDEX($' + activeCol + ':$' + activeCol + ',ROW())';
    return '=IF(INDEX($B:$B,ROW())="","",IF(OR(' + activeExpr + '="",'
      + activeExpr + '<=0,' + zoneExpr + '=""),"",' + zoneExpr + '/' + activeExpr + '))';
  };
}

var COLUMNS = [
  // Formula columns are position-based (INDEX($B:$B,ROW())) so they stay correct
  // after rows are inserted at the top and the sheet is re-sorted. $B is Date.
  { key: '_row', header: '#', kind: 'formula', formula: function () {
    return '=IF(INDEX($B:$B,ROW())="","",COUNT($B:$B)-ROW()+2)';
  } },
  { key: 'date', header: 'Date', kind: 'value', format: 'mm/dd/yyyy' },
  { key: '_dow', header: 'Day of Week', kind: 'formula', formula: function () { return '=IF(INDEX($B:$B,ROW())="","",TEXT(INDEX($B:$B,ROW()),"dddd"))'; } },
  { key: '_dowIndex', header: 'Day of Week Index', kind: 'formula', format: '0', formula: function () { return '=IF(INDEX($B:$B,ROW())="","",WEEKDAY(INDEX($B:$B,ROW()),2))'; } },
  { key: '_dom', header: 'Day of Month', kind: 'formula', formula: function () { return '=IF(INDEX($B:$B,ROW())="","",DAY(INDEX($B:$B,ROW())))'; } },
  { key: '_month', header: 'Month', kind: 'formula', formula: function () { return '=IF(INDEX($B:$B,ROW())="","",TEXT(INDEX($B:$B,ROW()),"mmmm"))'; } },
  { key: '_year', header: 'Year', kind: 'formula', formula: function () { return '=IF(INDEX($B:$B,ROW())="","",YEAR(INDEX($B:$B,ROW())))'; } },
  { key: 'classTime', header: 'Class Time', kind: 'value' },
  { key: 'coach', header: 'Coach', kind: 'value' },
  { key: 'studio', header: 'Studio', kind: 'value' },

  { key: 'calories', header: 'Calories', kind: 'value', format: '#,##0' },
  { key: 'splatPoints', header: 'Splat Points', kind: 'value', format: '#,##0' },
  { key: 'avgHr', header: 'Avg HR', kind: 'value', format: '#,##0' },
  { key: 'avgPctMaxHr', header: 'Avg % Max HR', kind: 'value', format: '#,##0' },
  { key: 'peakHr', header: 'Peak HR', kind: 'value', format: '#,##0' },
  { key: 'maxPctMaxHr', header: 'Max % Max HR', kind: 'value', format: '#,##0' },
  { key: '_peakMinusAvgHr', header: 'Peak − Avg HR', kind: 'formula', format: '#,##0', formula: function () {
    var peakCol = colLetterForKey_('peakHr');
    var avgCol = colLetterForKey_('avgHr');
    var peakExpr = 'INDEX($' + peakCol + ':$' + peakCol + ',ROW())';
    var avgExpr = 'INDEX($' + avgCol + ':$' + avgCol + ',ROW())';
    return '=IF(INDEX($B:$B,ROW())="","",IF(OR(' + peakExpr + '="",' + avgExpr + '=""),"",' + peakExpr + '-' + avgExpr + '))';
  } },
  { key: 'zoneGrey', header: 'Grey Zone (min)', kind: 'value', format: '#,##0' },
  { key: 'zoneBlue', header: 'Blue Zone (min)', kind: 'value', format: '#,##0' },
  { key: 'zoneGreen', header: 'Green Zone (min)', kind: 'value', format: '#,##0' },
  { key: 'zoneOrange', header: 'Orange Zone (min)', kind: 'value', format: '#,##0' },
  { key: 'zoneRed', header: 'Red Zone (min)', kind: 'value', format: '#,##0' },
  { key: 'steps', header: 'Steps', kind: 'value', format: '#,##0' },
  // Derived: sum of the five zone-minute columns for the same row. Position-based
  // (INDEX/ROW) and resolves the zone column letters from the schema, so it stays
  // correct after inserts/sorts and if column positions shift. Blank (never 0) when
  // the row has no numeric zone data, matching the "blanks for missing metrics" rule.
  { key: '_activeMin', header: 'Total Active Minutes', kind: 'formula', format: '#,##0', formula: function () {
    var first = colLetterForKey_('zoneGrey');
    var last = colLetterForKey_('zoneRed');
    var range = '$' + first + ':$' + last;
    return '=IF(INDEX($B:$B,ROW())="","",IF(COUNT(INDEX(' + range + ',ROW(),0))=0,"",SUM(INDEX(' + range + ',ROW(),0))))';
  } },
  { key: '_zoneGreyPct', header: 'Grey Zone %', kind: 'formula', format: '0.0%', formula: zonePctFormula_('zoneGrey') },
  { key: '_zoneBluePct', header: 'Blue Zone %', kind: 'formula', format: '0.0%', formula: zonePctFormula_('zoneBlue') },
  { key: '_zoneGreenPct', header: 'Green Zone %', kind: 'formula', format: '0.0%', formula: zonePctFormula_('zoneGreen') },
  { key: '_zoneOrangePct', header: 'Orange Zone %', kind: 'formula', format: '0.0%', formula: zonePctFormula_('zoneOrange') },
  { key: '_zoneRedPct', header: 'Red Zone %', kind: 'formula', format: '0.0%', formula: zonePctFormula_('zoneRed') },
  { key: '_calPerActiveMin', header: 'Calories per Active Minute', kind: 'formula', format: '0.0', formula: function () {
    var calCol = colLetterForKey_('calories');
    var activeCol = colLetterForKey_('_activeMin');
    var calExpr = 'INDEX($' + calCol + ':$' + calCol + ',ROW())';
    var activeExpr = 'INDEX($' + activeCol + ':$' + activeCol + ',ROW())';
    return '=IF(INDEX($B:$B,ROW())="","",IF(OR(' + calExpr + '="",' + activeExpr + '="",'
      + activeExpr + '<=0),"",' + calExpr + '/' + activeExpr + '))';
  } },

  { key: 'treadTotalDistance', header: 'Tread Total Distance', kind: 'value', format: '0.00' },
  { key: '_stepsPerMile', header: 'Steps per Mile', kind: 'formula', format: '#,##0', formula: function () {
    var stepsCol = colLetterForKey_('steps');
    var distCol = colLetterForKey_('treadTotalDistance');
    var stepsExpr = 'INDEX($' + stepsCol + ':$' + stepsCol + ',ROW())';
    var distExpr = 'INDEX($' + distCol + ':$' + distCol + ',ROW())';
    return '=IF(INDEX($B:$B,ROW())="","",IF(OR(' + stepsExpr + '="",' + distExpr + '="",'
      + distExpr + '<=0),"",' + stepsExpr + '/' + distExpr + '))';
  } },
  { key: 'treadTotalTime', header: 'Tread Total Time', kind: 'value', duration: true, format: '[mm]:ss' },
  { key: 'treadAvgSpeed', header: 'Tread Avg Speed', kind: 'value', format: '0.0' },
  { key: 'treadMaxSpeed', header: 'Tread Max Speed', kind: 'value', format: '0.0' },
  { key: 'treadAvgIncline', header: 'Tread Avg Incline', kind: 'value', format: '0.0' },
  { key: 'treadMaxIncline', header: 'Tread Max Incline', kind: 'value', format: '0.0' },
  { key: 'treadAvgPace', header: 'Tread Avg Pace', kind: 'value', duration: true, format: '[mm]:ss' },
  { key: 'treadMaxPace', header: 'Tread Max Pace', kind: 'value', duration: true, format: '[mm]:ss' },
  { key: 'elevationGain', header: 'Elevation Gain', kind: 'value', format: '#,##0.00' },
  { key: '_elevPerMile', header: 'Elevation per Mile', kind: 'formula', format: '0.00', formula: function () {
    var elevCol = colLetterForKey_('elevationGain');
    var distCol = colLetterForKey_('treadTotalDistance');
    var elevExpr = 'INDEX($' + elevCol + ':$' + elevCol + ',ROW())';
    var distExpr = 'INDEX($' + distCol + ':$' + distCol + ',ROW())';
    return '=IF(INDEX($B:$B,ROW())="","",IF(OR(' + elevExpr + '="",' + distExpr + '="",'
      + distExpr + '<=0),"",' + elevExpr + '/' + distExpr + '))';
  } },

  { key: 'rowerTotalDistance', header: 'Rower Total Distance', kind: 'value', format: '#,##0' },
  { key: 'rowerTotalTime', header: 'Rower Total Time', kind: 'value', duration: true, format: '[mm]:ss' },
  { key: 'rowerAvgWatts', header: 'Rower Avg Watts', kind: 'value', format: '#,##0.0' },
  { key: 'rowerMaxWatts', header: 'Rower Max Watts', kind: 'value', format: '#,##0' },
  { key: 'rowerAvgSpeed', header: 'Rower Avg Speed', kind: 'value', format: '0.0' },
  { key: 'rowerMaxSpeed', header: 'Rower Max Speed', kind: 'value', format: '0.0' },
  { key: 'rower500mSplit', header: 'Rower 500m Split', kind: 'value', duration: true, format: '[mm]:ss' },
  { key: 'rowerBest500mSplit', header: 'Rower Best 500m Split', kind: 'value', duration: true, format: '[mm]:ss' },
  { key: 'rowerAvgStrokeRate', header: 'Rower Avg Stroke Rate', kind: 'value', format: '0.0' },

  { key: 'status', header: 'Status', kind: 'value' },
  { key: 'source', header: 'Source', kind: 'value' },
  { key: 'uniqueKey', header: 'Unique Key', kind: 'value' },
  { key: 'messageId', header: 'Gmail Message ID', kind: 'hidden' },
];

/** Convert a 1-based column index to its A1 letter (1 -> A, 27 -> AA). */
function columnIndexToLetter_(idx) {
  var s = '';
  while (idx > 0) {
    var m = (idx - 1) % 26;
    s = String.fromCharCode(65 + m) + s;
    idx = Math.floor((idx - 1) / 26);
  }
  return s;
}

/** A1 column letter for a schema key (resolved lazily so it survives layout changes). */
function colLetterForKey_(key) {
  for (var i = 0; i < COLUMNS.length; i++) {
    if (COLUMNS[i].key === key) return columnIndexToLetter_(i + 1);
  }
  return '';
}

/** A1 letter of the last schema column (right bound for QUERY ranges). */
function lastColLetter_() {
  return columnIndexToLetter_(COLUMNS.length);
}

/** 1-based column index for a schema key (1 = first column). */
function colIndexForKey_(key) {
  for (var i = 0; i < COLUMNS.length; i++) {
    if (COLUMNS[i].key === key) return i + 1;
  }
  return 0;
}

/** QUERY column reference (ColN) for a schema key; use inside QUERY strings with headers=0. */
function colQueryRef_(key) {
  var idx = colIndexForKey_(key);
  return idx ? 'Col' + idx : '';
}

/** Log tab columns (left -> right). */
var LOG_COLUMNS = [
  'Timestamp', 'Run Type', 'Messages Scanned', 'Rows Added',
  'Rows Skipped', 'Flags Raised', 'Errors',
];

/** Source provenance values. */
var SOURCE = { EMAIL: 'Email', MANUAL: 'Manual' };

/** Status flag strings (kept here so wording stays consistent everywhere). */
var STATUS = {
  UNKNOWN_TEMPLATE: 'Needs Review: unknown template',
  PARTIAL_PARSE: 'Needs Review: partial parse',
  POSSIBLE_DUPLICATE: 'Possible duplicate',
  BETTER_DATA: 'Better data available - review',
};

/** Gmail search constants. */
var GMAIL = {
  /** Base query: sender only (this sender sends nothing else). */
  base: 'from:' + SENDER,
  /** How many days before the last recorded class to start an incremental scan. */
  updateLookbackDays: 1,
  /** Page size for paged Gmail reads (stay well under quota on large mailboxes). */
  pageSize: 100,
};

/**
 * Layout-family anchors. Family only governs the decoding/markup dialect; the
 * section extractors run independently of which "era" an email belongs to.
 */
var FAMILY_ANCHORS = {
  // Modern family: 2019-present markup (header-day, bar-bumber, text-gray h2).
  modern: ['header-day', 'bar-bumber', 'AVG. HEART-RATE', 'PERFORMANCE TOTALS'],
  // Legacy family: 2018 "#keepburning" markup.
  legacy: ['numbers-summary', 'number-titles', 'zones-stats', '#keepburning'],
};

/** Section anchor probes (matched against normalized, tag-stripped-ish text). */
var SECTION_ANCHORS = {
  treadmill: /TREADMILL PERFORMANCE TOTALS/i,
  rower: /ROWER PERFORMANCE TOTALS/i,
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    SENDER: SENDER, SCRIPT_VERSION: SCRIPT_VERSION, SHEETS: SHEETS, COLUMNS: COLUMNS, LOG_COLUMNS: LOG_COLUMNS,
    SOURCE: SOURCE, STATUS: STATUS, GMAIL: GMAIL,
    FAMILY_ANCHORS: FAMILY_ANCHORS, SECTION_ANCHORS: SECTION_ANCHORS,
    colLetterForKey_: colLetterForKey_, columnIndexToLetter_: columnIndexToLetter_, lastColLetter_: lastColLetter_,
    colIndexForKey_: colIndexForKey_, colQueryRef_: colQueryRef_,
  };
}
