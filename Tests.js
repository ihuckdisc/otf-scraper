/**
 * Tests.js - in-editor test runner. Run `runTests` from the Apps Script editor
 * (or via the Node harness) to validate the parser/normalizer/validator against
 * the embedded fixtures and synthetic unseen-variant bodies.
 *
 * Output goes to Logger (GAS) or console (Node). `runTests()` returns a summary
 * object so it can also be asserted on programmatically.
 */

function tlog_(s) {
  if (typeof Logger !== 'undefined' && Logger.log) Logger.log(s);
  else if (typeof console !== 'undefined') console.log(s);
}

function findColumn_(key) {
  for (var i = 0; i < COLUMNS.length; i++) {
    if (COLUMNS[i].key === key) return COLUMNS[i];
  }
  return null;
}

function makeChecker_() {
  var ctx = { passed: 0, failed: 0, failures: [] };
  ctx.eq = function (label, actual, expected) {
    var ok = String(actual) === String(expected);
    if (ok) { ctx.passed++; }
    else { ctx.failed++; ctx.failures.push(label + ': expected ' + JSON.stringify(expected) + ', got ' + JSON.stringify(actual)); }
  };
  ctx.truthy = function (label, actual) {
    if (actual) { ctx.passed++; }
    else { ctx.failed++; ctx.failures.push(label + ': expected truthy, got ' + JSON.stringify(actual)); }
  };
  ctx.falsy = function (label, actual) {
    if (!actual) { ctx.passed++; }
    else { ctx.failed++; ctx.failures.push(label + ': expected falsy, got ' + JSON.stringify(actual)); }
  };
  return ctx;
}

/** Build a minimal modern-family HTML body from section flags (for synthetics). */
function synthModern_(opts) {
  opts = opts || {};
  var h = '<div class="header-day bar-bumber">';
  h += '<p class="header-day">STUDIO WORKOUT SUMMARY</p>';
  if (opts.studio) h += '<p class="header-studio-name">' + opts.studio + '</p>';
  if (opts.date) h += '<p>' + opts.date + '</p>';
  if (opts.time) h += '<p>' + opts.time + '</p>';
  if (opts.coach) h += '<p>' + opts.coach + '</p>';
  if (opts.zones) {
    for (var i = 0; i < 5; i++) h += '<p class="bar-bumber">' + opts.zones[i] + '</p>';
    h += '<p>MINUTES / ZONE</p>';
  }
  if (opts.summary) {
    h += '<p>' + opts.summary.calories + '</p><p class="h2 text-gray">CALORIES BURNED</p>';
    h += '<p>' + opts.summary.splat + '</p><p class="h2 text-gray">SPLAT POINTS</p>';
    h += '<p>' + opts.summary.avgHr + '</p><p class="h2 text-gray">AVG. HEART-RATE</p>';
    if (opts.summary.steps != null) h += '<p>' + opts.summary.steps + '</p><p class="h2 text-gray">STEPS</p>';
  }
  if (opts.treadmill) {
    h += '<p class="text-italic">TREADMILL PERFORMANCE TOTALS</p>';
    h += '<span>' + opts.treadmill.dist + '</span><span>miles</span><p>Total Distance</p>';
    h += '<p>' + opts.treadmill.time + '</p><p>Total Time</p>';
    h += '<p>AVG. SPEED</p><span>' + opts.treadmill.spd + '</span><span>mph</span><span>Max:</span><span>' + opts.treadmill.maxSpd + '</span>';
  }
  h += '</div>';
  return h;
}

function runTests() {
  var c = makeChecker_();

  // --- 1. Section values (current sample) -------------------------------
  var cur = parseEmail(getFixture('eraC_2025'));
  c.eq('eraC family', cur.family, 'modern');
  c.eq('eraC calories', cur.record.calories, 1003);
  c.eq('eraC splat', cur.record.splatPoints, 8);
  c.eq('eraC avgHr', cur.record.avgHr, 137);
  c.eq('eraC peakHr', cur.record.peakHr, 161);
  c.eq('eraC steps', cur.record.steps, 4240);

  // --- 2. Per-section presence ------------------------------------------
  var a18 = parseEmail(getFixture('eraA_2018'), { fallbackDate: new Date(2018, 2, 19) });
  c.eq('2018 family', a18.family, 'legacy');
  c.truthy('2018 summary present', a18.present.summary);
  c.truthy('2018 zones present', a18.present.zones);
  c.falsy('2018 header present', a18.present.header);
  c.falsy('2018 treadmill present', a18.present.treadmill);
  c.falsy('2018 rower present', a18.present.rower);

  var b19 = parseEmail(getFixture('eraB_2019'));
  c.truthy('2019 header present', b19.present.header);
  c.truthy('2019 treadmill present', b19.present.treadmill);
  c.falsy('2019 rower present', b19.present.rower);
  c.eq('2019 steps blank', b19.record.steps, '');

  c.truthy('2025 rower present', cur.present.rower);
  c.truthy('2025 treadmill present', cur.present.treadmill);

  // --- 3. Unseen-variant: modern, treadmill + steps, NO rower -----------
  var variant = synthModern_({
    studio: 'Somewhere, NC', date: '05/01/2021', time: '9:00 AM', coach: 'Pat',
    zones: [3, 5, 20, 14, 2],
    summary: { calories: 720, splat: 14, avgHr: 140, steps: 3100 },
    treadmill: { dist: 2.1, time: '25:00', spd: 4.2, maxSpd: 6.1 },
  });
  var vr = parseEmail(variant);
  c.eq('variant family', vr.family, 'modern');
  c.truthy('variant treadmill present', vr.present.treadmill);
  c.falsy('variant rower present', vr.present.rower);
  c.eq('variant calories', vr.record.calories, 720);
  c.eq('variant steps', vr.record.steps, 3100);
  c.eq('variant not flagged', computeStatusNotes(vr).length, 0);

  // --- 4. Partial-parse + unknown-template safety nets -------------------
  var partial = parseEmail('<div class="header-day bar-bumber"><p class="header-day">STUDIO WORKOUT SUMMARY</p><p>03/03/2021</p></div>');
  var partialNotes = computeStatusNotes(partial);
  c.truthy('partial flagged', partialNotes.indexOf(STATUS.PARTIAL_PARSE) !== -1);

  var unknown = parseEmail('<html><body><p>Hello, this is not an OTF performance email.</p></body></html>');
  var unknownNotes = computeStatusNotes(unknown);
  c.eq('unknown family', unknown.family, 'unknown');
  c.truthy('unknown flagged', unknownNotes.indexOf(STATUS.UNKNOWN_TEMPLATE) !== -1);

  // --- 5. Normalization --------------------------------------------------
  c.eq('QP =3D decode', decodeQuotedPrintable('a=3Db'), 'a=b');
  c.eq('QP soft break', decodeQuotedPrintable('foo=\r\nbar'), 'foobar');
  c.eq('zwnj entity strip', stripZeroWidth('6&zwnj;:05'), '6:05');
  c.eq('zwnj char strip', stripZeroWidth('29\u200c:04'), '29:04');
  c.eq('parseClassTime', parseClassTime(' 6\u200c:05 AM '), '6:05 AM');
  c.eq('parseNumber commas', parseNumber('1,030'), 1030);
  c.eq('parseNumber blank', parseNumber('n/a'), '');
  c.eq('duration to days', parseDurationToDays('29:04'), (29 * 60 + 4) / 86400);

  // toLocalMidnight: a late-night timestamp keeps its calendar day, time stripped.
  var lateNight = toLocalMidnight(new Date(2021, 0, 1, 23, 45, 0));
  c.eq('toLocalMidnight day', lateNight.getDate(), 1);
  c.eq('toLocalMidnight month', lateNight.getMonth(), 0);
  c.eq('toLocalMidnight year', lateNight.getFullYear(), 2021);
  c.eq('toLocalMidnight hour', lateNight.getHours(), 0);

  // --- 5b. Manual-row form fields (schema-derived) ----------------------
  var manualFields = getManualRowFields();
  var manualKeys = manualFields.map(function (f) { return f.key; });
  c.truthy('manual fields include date', manualKeys.indexOf('date') !== -1);
  c.truthy('manual fields include calories', manualKeys.indexOf('calories') !== -1);
  c.falsy('manual fields exclude status', manualKeys.indexOf('status') !== -1);
  c.falsy('manual fields exclude source', manualKeys.indexOf('source') !== -1);
  c.falsy('manual fields exclude uniqueKey', manualKeys.indexOf('uniqueKey') !== -1);
  c.falsy('manual fields exclude messageId (hidden)', manualKeys.indexOf('messageId') !== -1);
  c.falsy('manual fields exclude Year (formula)', manualKeys.indexOf('_year') !== -1);
  c.falsy('manual fields exclude Total Active Minutes (formula)', manualKeys.indexOf('_activeMin') !== -1);
  c.falsy('manual fields exclude Peak − Avg HR (formula)', manualKeys.indexOf('_peakMinusAvgHr') !== -1);
  c.falsy('manual fields exclude Grey Zone % (formula)', manualKeys.indexOf('_zoneGreyPct') !== -1);
  c.falsy('manual fields exclude Calories per Active Minute (formula)', manualKeys.indexOf('_calPerActiveMin') !== -1);
  c.falsy('manual fields exclude Steps per Mile (formula)', manualKeys.indexOf('_stepsPerMile') !== -1);
  c.falsy('manual fields exclude Elevation per Mile (formula)', manualKeys.indexOf('_elevPerMile') !== -1);

  // --- 5d. Day of Week Index (schema formula) ---------------------------
  var dowIndexCol = findColumn_('_dowIndex');
  c.truthy('schema includes _dowIndex', !!dowIndexCol);
  c.eq('dow index header', dowIndexCol.header, 'Day of Week Index');
  var dowIndexFormula = dowIndexCol.formula();
  c.truthy('dow index uses WEEKDAY', dowIndexFormula.indexOf('WEEKDAY') !== -1);
  c.truthy('dow index monday=1 mode', dowIndexFormula.indexOf('WEEKDAY') !== -1 && dowIndexFormula.indexOf(',2)') !== -1);

  // --- 5e. Derived formula columns (v1.2.0) -----------------------------
  c.eq('schema column count', COLUMNS.length, 54);
  c.eq('SCRIPT_VERSION', SCRIPT_VERSION, '1.3.9');

  var peakMinusCol = findColumn_('_peakMinusAvgHr');
  c.truthy('schema includes _peakMinusAvgHr', !!peakMinusCol);
  c.eq('peak minus avg hr header', peakMinusCol.header, 'Peak − Avg HR');
  var peakMinusFormula = peakMinusCol.formula();
  c.truthy('peak minus avg hr references peakHr', peakMinusFormula.indexOf(colLetterForKey_('peakHr')) !== -1);
  c.truthy('peak minus avg hr references avgHr', peakMinusFormula.indexOf(colLetterForKey_('avgHr')) !== -1);

  var zonePctKeys = ['_zoneGreyPct', '_zoneBluePct', '_zoneGreenPct', '_zoneOrangePct', '_zoneRedPct'];
  var zoneSrcKeys = ['zoneGrey', 'zoneBlue', 'zoneGreen', 'zoneOrange', 'zoneRed'];
  var activeMinLetter = colLetterForKey_('_activeMin');
  for (var zi = 0; zi < zonePctKeys.length; zi++) {
    var zpCol = findColumn_(zonePctKeys[zi]);
    c.truthy('schema includes ' + zonePctKeys[zi], !!zpCol);
    var zpFormula = zpCol.formula();
    c.truthy(zonePctKeys[zi] + ' references zone minutes', zpFormula.indexOf(colLetterForKey_(zoneSrcKeys[zi])) !== -1);
    c.truthy(zonePctKeys[zi] + ' references _activeMin', zpFormula.indexOf(activeMinLetter) !== -1);
  }

  var calPerActiveCol = findColumn_('_calPerActiveMin');
  c.truthy('schema includes _calPerActiveMin', !!calPerActiveCol);
  c.eq('cal per active min header', calPerActiveCol.header, 'Calories per Active Minute');
  var calPerActiveFormula = calPerActiveCol.formula();
  c.truthy('cal per active min references calories', calPerActiveFormula.indexOf(colLetterForKey_('calories')) !== -1);
  c.truthy('cal per active min references _activeMin', calPerActiveFormula.indexOf(activeMinLetter) !== -1);

  var stepsPerMileCol = findColumn_('_stepsPerMile');
  c.truthy('schema includes _stepsPerMile', !!stepsPerMileCol);
  c.eq('steps per mile header', stepsPerMileCol.header, 'Steps per Mile');
  var stepsPerMileFormula = stepsPerMileCol.formula();
  c.truthy('steps per mile references steps', stepsPerMileFormula.indexOf(colLetterForKey_('steps')) !== -1);
  c.truthy('steps per mile references treadTotalDistance', stepsPerMileFormula.indexOf(colLetterForKey_('treadTotalDistance')) !== -1);

  var elevPerMileCol = findColumn_('_elevPerMile');
  c.truthy('schema includes _elevPerMile', !!elevPerMileCol);
  c.eq('elevation per mile header', elevPerMileCol.header, 'Elevation per Mile');
  var elevPerMileFormula = elevPerMileCol.formula();
  c.truthy('elevation per mile references elevationGain', elevPerMileFormula.indexOf(colLetterForKey_('elevationGain')) !== -1);
  c.truthy('elevation per mile references treadTotalDistance', elevPerMileFormula.indexOf(colLetterForKey_('treadTotalDistance')) !== -1);

  // --- 5c. Clear email data (keep Manual) -------------------------------
  c.truthy('clear email deletes Email source', isClearEmailDeleteRow_('Email', ''));
  c.truthy('clear email deletes blank source', isClearEmailDeleteRow_('', ''));
  c.falsy('clear email keeps Manual source', isClearEmailDeleteRow_('Manual', ''));
  c.falsy('clear email keeps manual source case', isClearEmailDeleteRow_('manual', ''));
  c.falsy('clear email keeps manual unique key', isClearEmailDeleteRow_('', '2021/01/01|msg:manual:123'));
  c.truthy('clear email deletes email unique key', isClearEmailDeleteRow_('', '2021/01/01|msg:gmailabc'));

  // --- 6. Dedupe key behavior -------------------------------------------
  var rec1 = cur.record;
  var k1 = buildUniqueKey(rec1, 'MSG1');
  var k2 = buildUniqueKey(rec1, 'MSG1');
  c.eq('same record same key', k1, k2);
  c.truthy('modern key uses studio+time', k1.indexOf('chapel hill') !== -1);

  var legacyKey = buildUniqueKey(a18.record, 'LEGACYMSG');
  c.truthy('legacy key falls back to msg id', legacyKey.indexOf('msg:legacymsg') !== -1);

  // --- 6b. Dash_Calc helper builders (pure, slicer-immune QUERY strings) -
  c.eq('Dash_Calc tab name', SHEETS.DASH_CALC, 'Dash_Calc');
  c.eq('lastColLetter matches schema', lastColLetter_(), columnIndexToLetter_(COLUMNS.length));
  c.eq('colQueryRef date', colQueryRef_('date'), 'Col' + colIndexForKey_('date'));
  c.eq('colQueryRef zoneGrey', colQueryRef_('zoneGrey'), 'Col' + colIndexForKey_('zoneGrey'));

  var monthlyQuery = buildMonthlyQuery_();
  c.truthy('monthly query reads Data body', monthlyQuery.indexOf(SHEETS.DATA + '!A2:' + lastColLetter_()) !== -1);
  c.truthy('monthly query uses year/month on date col', monthlyQuery.indexOf('year(Col2)') !== -1);
  c.truthy('monthly query groups by year and month', monthlyQuery.indexOf('group by year(Col2), month(Col2)') !== -1);
  c.falsy('monthly query avoids format() — not in QUERY lang', monthlyQuery.indexOf('format(') !== -1);
  c.falsy('monthly query avoids formula Col7', monthlyQuery.indexOf('Col7') !== -1);
  c.truthy('monthly query filters with date literal', monthlyQuery.indexOf("Col2 >= date '2010-01-01'") !== -1);
  c.falsy('monthly query has no order by (breaks grouped QUERY)', monthlyQuery.indexOf('order by') !== -1);
  c.truthy('monthly query references date count', monthlyQuery.indexOf('count(Col2)') !== -1);
  c.truthy('monthly query references calories', monthlyQuery.indexOf('sum(Col11)') !== -1);
  c.truthy('monthly query references zoneGrey sum', monthlyQuery.indexOf('sum(Col18)') !== -1);
  c.truthy('monthly query references zoneRed sum', monthlyQuery.indexOf('sum(Col22)') !== -1);
  c.falsy('monthly query has NO division (multi-div => #N/A, probe G)', monthlyQuery.indexOf('/') !== -1);
  c.falsy('monthly query avoids sparse steps col', monthlyQuery.indexOf('Col23') !== -1);
  c.falsy('monthly query avoids sparse tread cols', monthlyQuery.indexOf('Col31') !== -1);
  c.falsy('monthly query avoids sparse rower cols', monthlyQuery.indexOf('Col48') !== -1);
  c.falsy('monthly query avoids _calPerActiveMin', monthlyQuery.indexOf('_calPerActiveMin') !== -1);
  c.falsy('monthly query avoids _zoneRedPct', monthlyQuery.indexOf('_zoneRedPct') !== -1);
  c.falsy('monthly query avoids _stepsPerMile', monthlyQuery.indexOf('_stepsPerMile') !== -1);
  c.truthy('monthly query blanks auto headers via label', monthlyQuery.indexOf("label year(Col2) ''") !== -1);

  c.eq('blankLabels builds empty label clause', blankLabels_(['year(Col2)', 'count(Col2)']),
    "label year(Col2) '', count(Col2) ''");

  var derived = buildMonthlyDerivedFormulas_(
    { year: 'B', totalCal: 'E', grey: 'I', blue: 'J', green: 'K', orange: 'L', red: 'M' }, 3);
  c.eq('derived has 6 ratio formulas', derived.length, 6);
  c.truthy('derived cal/min divides total cal by zone total',
    derived[0].indexOf('E3:E/(I3:I+J3:J+K3:K+L3:L+M3:M)') !== -1);
  c.truthy('derived uses ARRAYFORMULA + IFERROR',
    derived[0].indexOf('ARRAYFORMULA') !== -1 && derived[0].indexOf('IFERROR') !== -1);
  c.truthy('derived grey pct divides grey by zone total',
    derived[1].indexOf('I3:I/(I3:I+J3:J+K3:K+L3:L+M3:M)') !== -1);
  c.truthy('derived red pct divides red by zone total',
    derived[5].indexOf('M3:M/(I3:I+J3:J+K3:K+L3:L+M3:M)') !== -1);

  var monthLabel = buildMonthLabelFormula_('B', 'C', 3);
  c.truthy('month label builds yyyy-mm', monthLabel.indexOf('"yyyy-mm"') !== -1);
  c.truthy('month label uses ARRAYFORMULA', monthLabel.indexOf('ARRAYFORMULA') !== -1);
  c.truthy('month label guards non-numeric year via ISNUMBER', monthLabel.indexOf('ISNUMBER(B3:B)') !== -1);

  var coachQuery = buildByCoachQuery_();
  c.truthy('by-coach query groups by Col9', coachQuery.indexOf('group by Col9') !== -1);
  c.truthy('by-coach query orders by count', coachQuery.indexOf('order by count(Col2) desc') !== -1);
  c.truthy('by-coach query blanks auto headers via label', coachQuery.indexOf('label Col9 ') !== -1);
  c.falsy('by-coach query avoids _calPerActiveMin', coachQuery.indexOf('_calPerActiveMin') !== -1);

  var studioQuery = buildByStudioQuery_();
  c.truthy('by-studio query groups by Col10', studioQuery.indexOf('group by Col10') !== -1);
  c.truthy('by-studio query blanks auto headers via label', studioQuery.indexOf('label Col10 ') !== -1);
  c.falsy('by-studio query avoids _calPerActiveMin', studioQuery.indexOf('_calPerActiveMin') !== -1);

  var cards = buildScorecards_();
  c.truthy('scorecards non-empty', cards.length > 0);
  var cardFormulas = cards.map(function (k) { return k.formula; }).join(' | ');
  c.truthy('scorecards include a MINIFS PR', cardFormulas.indexOf('MINIFS(') !== -1);
  c.truthy('scorecards reference Data column', cardFormulas.indexOf(SHEETS.DATA + '!') !== -1);

  // --- 7. Welcome / version ---------------------------------------------
  c.truthy('SCRIPT_VERSION set', SCRIPT_VERSION && String(SCRIPT_VERSION).trim());
  var welcomeRows = buildWelcomeContent_();
  c.truthy('welcome content non-empty', welcomeRows.length > 0);
  c.truthy('welcome includes version', String(welcomeRows[1][0]).indexOf(SCRIPT_VERSION) !== -1);

  // --- Summary -----------------------------------------------------------
  tlog_('OTF Scraper tests: ' + c.passed + ' passed, ' + c.failed + ' failed.');
  for (var i = 0; i < c.failures.length; i++) tlog_('  FAIL ' + c.failures[i]);
  return { passed: c.passed, failed: c.failed, failures: c.failures };
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { runTests: runTests };
}
