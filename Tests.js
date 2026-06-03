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

  // --- 5a. addCalendarMonths_ (portable month stepping) -----------------
  var dec1 = new Date(2019, 11, 1);
  var janNext = addCalendarMonths_(dec1, 1);
  c.eq('addCalendarMonths Dec→Jan year', janNext.getFullYear(), 2020);
  c.eq('addCalendarMonths Dec→Jan month', janNext.getMonth(), 0);
  c.eq('addCalendarMonths Dec→Jan day', janNext.getDate(), 1);

  var jan31 = new Date(2020, 0, 31);
  var febFromJan31 = addCalendarMonths_(jan31, 1);
  c.eq('addCalendarMonths Jan31→Feb month', febFromJan31.getMonth(), 1);
  c.eq('addCalendarMonths Jan31→Feb day', febFromJan31.getDate(), 1);

  var jun15 = new Date(2018, 5, 15);
  var sepFromJun = addCalendarMonths_(jun15, 3);
  c.eq('addCalendarMonths Jun+3 month', sepFromJun.getMonth(), 8);
  c.eq('addCalendarMonths Jun+3 year', sepFromJun.getFullYear(), 2018);

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
  c.eq('SCRIPT_VERSION', SCRIPT_VERSION, '1.5.1');

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

  c.eq('blankLabels builds empty label clause', blankLabels_(['year(Col2)', 'count(Col2)']),
    "label year(Col2) '', count(Col2) ''");

  c.eq('monthly band colCount', DASH_CALC_LAYOUT_.monthly.colCount, 19);

  function rowByMonthLabel_(rows, label) {
    for (var ri = 0; ri < rows.length; ri++) {
      if (rows[ri][0] === label) return rows[ri];
    }
    return null;
  }
  function approxEq_(label, actual, expected, tol) {
    tol = tol == null ? 0.01 : tol;
    var ok = typeof actual === 'number' && typeof expected === 'number'
      && Math.abs(actual - expected) < tol;
    if (ok) { c.passed++; }
    else { c.failed++; c.failures.push(label + ': expected ' + expected + ', got ' + actual); }
  }

  // --- 6c. Monthly spine + aggregation (script-computed band) ------------
  var boundsFebJun = firstLastClassMonth_([
    { date: new Date(2018, 1, 10) },
    { date: new Date(2018, 5, 20) }
  ]);
  var spineFive = buildMonthSpine_(boundsFebJun.first, boundsFebJun.last);
  c.eq('spine Feb–Jun count', spineFive.length, 5);
  c.eq('spine first label', spineFive[0].label, '2018-02');

  var gapRecords = [
    { date: new Date(2019, 11, 5), calories: 100, splatPoints: 1, avgHr: 130,
      zoneGrey: 1, zoneBlue: 1, zoneGreen: 1, zoneOrange: 1, zoneRed: 1 },
    { date: new Date(2023, 0, 5), calories: 200, splatPoints: 2, avgHr: 140,
      zoneGrey: 2, zoneBlue: 2, zoneGreen: 2, zoneOrange: 2, zoneRed: 2 }
  ];
  var gapBounds = firstLastClassMonth_(gapRecords);
  var gapSpine = buildMonthSpine_(gapBounds.first, gapBounds.last);
  c.truthy('gap spine includes 2020-01', gapSpine.some(function (e) { return e.label === '2020-01'; }));
  c.truthy('gap spine includes 2022-12', gapSpine.some(function (e) { return e.label === '2022-12'; }));

  var gapRows = buildMonthlyBandRows_(gapSpine, aggregateMonthlyFromRecords_(gapRecords));
  var pause2020 = rowByMonthLabel_(gapRows, '2020-03');
  c.truthy('gap pause month present', !!pause2020);
  c.eq('gap pause classes', pause2020[3], 0);
  c.eq('gap pause avg cal blank', pause2020[5], '');
  c.eq('gap pause grey pct blank', pause2020[14], '');

  var jan2026Records = [
    { date: new Date(2025, 11, 10), calories: 500, splatPoints: 10, avgHr: 150,
      zoneGrey: 5, zoneBlue: 5, zoneGreen: 5, zoneOrange: 5, zoneRed: 5 },
    { date: new Date(2026, 1, 10), calories: 600, splatPoints: 12, avgHr: 155,
      zoneGrey: 6, zoneBlue: 6, zoneGreen: 6, zoneOrange: 6, zoneRed: 6 }
  ];
  var jan2026Rows = buildMonthlyBandRows_(
    buildMonthSpine_(firstLastClassMonth_(jan2026Records).first, firstLastClassMonth_(jan2026Records).last),
    aggregateMonthlyFromRecords_(jan2026Records));
  var jan2026Pause = rowByMonthLabel_(jan2026Rows, '2026-01');
  c.eq('Jan 2026 gap classes', jan2026Pause[3], 0);
  c.eq('Jan 2026 gap avg HR blank', jan2026Pause[7], '');

  var decRows = buildMonthlyBandRows_(
    [{ label: '2019-12', year: 2019, month: 12 }],
    { '2019-12': { classes: 1, sumCal: 0, sumSplats: 0, hrSum: 0, hrCount: 0,
      zoneGrey: 0, zoneBlue: 0, zoneGreen: 0, zoneOrange: 0, zoneRed: 0 } });
  c.eq('December month col C', decRows[0][2], 12);

  var hrTwoRecords = [
    { date: new Date(2021, 5, 1), calories: 400, splatPoints: 8, avgHr: 160,
      zoneGrey: 1, zoneBlue: 1, zoneGreen: 10, zoneOrange: 5, zoneRed: 1 },
    { date: new Date(2021, 5, 15), calories: 500, splatPoints: 10, avgHr: '',
      zoneGrey: 1, zoneBlue: 1, zoneGreen: 10, zoneOrange: 5, zoneRed: 1 }
  ];
  var hrJune = rowByMonthLabel_(
    buildMonthlyBandRows_(buildMonthSpine_(new Date(2021, 5, 1), new Date(2021, 5, 1)),
      aggregateMonthlyFromRecords_(hrTwoRecords)), '2021-06');
  c.eq('avg HR one class with HR', hrJune[7], 160);

  c.eq('empty records monthly rows', buildMonthlyBandRows_([], {}), []);

  // Golden parity: fully populated rows; D–M hand-verified (QUERY-equivalent).
  var goldenRecords = [
    { date: new Date(2019, 11, 5), calories: 100, splatPoints: 5, avgHr: 140,
      zoneGrey: 1, zoneBlue: 2, zoneGreen: 10, zoneOrange: 5, zoneRed: 1 },
    { date: new Date(2019, 11, 20), calories: 200, splatPoints: 10, avgHr: '',
      zoneGrey: 2, zoneBlue: 3, zoneGreen: 12, zoneOrange: 6, zoneRed: 2 },
    { date: new Date(2020, 0, 10), calories: 500, splatPoints: 20, avgHr: 150,
      zoneGrey: 10, zoneBlue: 10, zoneGreen: 10, zoneOrange: 10, zoneRed: 10 },
    { date: new Date(2020, 2, 1), calories: 100, splatPoints: 4, avgHr: 130,
      zoneGrey: 1, zoneBlue: 1, zoneGreen: 5, zoneOrange: 2, zoneRed: 1 },
    { date: new Date(2020, 2, 15), calories: 100, splatPoints: 4, avgHr: 130,
      zoneGrey: 1, zoneBlue: 1, zoneGreen: 5, zoneOrange: 2, zoneRed: 1 },
    { date: new Date(2020, 2, 20), calories: 100, splatPoints: 4, avgHr: 130,
      zoneGrey: 1, zoneBlue: 1, zoneGreen: 5, zoneOrange: 2, zoneRed: 1 }
  ];
  var goldenBounds = firstLastClassMonth_(goldenRecords);
  var goldenRows = buildMonthlyBandRows_(
    buildMonthSpine_(goldenBounds.first, goldenBounds.last),
    aggregateMonthlyFromRecords_(goldenRecords));
  var gDec = rowByMonthLabel_(goldenRows, '2019-12');
  c.eq('golden Dec classes', gDec[3], 2);
  c.eq('golden Dec total cal', gDec[4], 300);
  approxEq_('golden Dec avg cal', gDec[5], 150);
  approxEq_('golden Dec avg splat', gDec[6], 7.5);
  c.eq('golden Dec avg HR', gDec[7], 140);
  c.eq('golden Dec grey min', gDec[8], 3);
  c.eq('golden Dec red min', gDec[12], 3);
  var gJan = rowByMonthLabel_(goldenRows, '2020-01');
  c.eq('golden Jan classes', gJan[3], 1);
  c.eq('golden Jan total cal', gJan[4], 500);
  var gMar = rowByMonthLabel_(goldenRows, '2020-03');
  c.eq('golden Mar classes', gMar[3], 3);
  c.eq('golden Mar total cal', gMar[4], 300);

  // JSON snapshot: multi-month spine with pause + active metrics.
  var snapRecords = [
    { date: new Date(2018, 0, 1), calories: 400, splatPoints: 8, avgHr: 140,
      zoneGrey: 2, zoneBlue: 2, zoneGreen: 20, zoneOrange: 8, zoneRed: 2 },
    { date: new Date(2018, 2, 1), calories: 450, splatPoints: 9, avgHr: 145,
      zoneGrey: 2, zoneBlue: 2, zoneGreen: 22, zoneOrange: 9, zoneRed: 2 }
  ];
  var snapRows = buildMonthlyBandRows_(
    buildMonthSpine_(firstLastClassMonth_(snapRecords).first, firstLastClassMonth_(snapRecords).last),
    aggregateMonthlyFromRecords_(snapRecords));
  c.eq('snapshot spine months', snapRows.length, 3);
  c.eq('snapshot pause Feb classes', rowByMonthLabel_(snapRows, '2018-02')[3], 0);
  c.eq('snapshot Mar classes', rowByMonthLabel_(snapRows, '2018-03')[3], 1);

  var bigRecords = [];
  for (var bi = 0; bi < 5000; bi++) {
    bigRecords.push({
      date: new Date(2020, bi % 12, (bi % 28) + 1),
      calories: 400 + (bi % 100), splatPoints: 10, avgHr: 140,
      zoneGrey: 1, zoneBlue: 2, zoneGreen: 20, zoneOrange: 8, zoneRed: 1
    });
  }
  c.truthy('5000-record aggregate', buildMonthlyBandRows_(
    buildMonthSpine_(firstLastClassMonth_(bigRecords).first, firstLastClassMonth_(bigRecords).last),
    aggregateMonthlyFromRecords_(bigRecords)).length > 0);

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
  c.eq('scorecards count', cards.length, 12);
  var cardFormulas = cards.map(function (k) { return k.formula; }).join(' | ');
  c.truthy('scorecards include a MINIFS PR', cardFormulas.indexOf('MINIFS(') !== -1);
  c.truthy('scorecards reference Data column', cardFormulas.indexOf(SHEETS.DATA + '!') !== -1);
  var maxWattsCol = colLetterForKey_('rowerMaxWatts');
  c.truthy('scorecards last is max rower watts', cards[11].label.indexOf('Max Rower Watts') !== -1
    && cards[11].label.indexOf('Avg') === -1);
  c.truthy('scorecards max rower watts uses rowerMaxWatts col',
    cards[11].formula.indexOf(SHEETS.DATA + '!' + maxWattsCol + ':' + maxWattsCol) !== -1);

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
