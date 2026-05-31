/**
 * Summary section - calories, splat, avg/peak HR, %max HR, steps.
 *
 * Modern family: values precede their labels (CALORIES BURNED, SPLAT POINTS,
 * AVG. HEART-RATE, STEPS); Peak HR and Max % are inline-after their prefix
 * spans ("Peak HR:", "Max:"). Reads are scoped to the region BEFORE the
 * treadmill section so the compact footer summary (CALORIES / SPLAT PTS /
 * STEPS) never wins.
 *
 * Legacy family: same value-before-label idea but with the 2018 label dialect
 * (CALORIES BURNED, "avg hr", SPLAT POINTS, "AVG MAX HR").
 */
var SummarySection = (function () {
  function isPresent(ctx) {
    return findToken(ctx.tokens, /CALORIES/i) !== -1;
  }

  function extractModern(ctx) {
    var tokens = ctx.tokens;
    // Window: header end .. start of treadmill/rower (avoids the footer block).
    var start = 0;
    var end = ctx.idx.tread !== -1 ? ctx.idx.tread
            : (ctx.idx.rower !== -1 ? ctx.idx.rower : tokens.length);

    var out = {
      calories: parseNumber(readByLabel(tokens, /CALORIES BURNED/, { dir: 'before', start: start, end: end })),
      splatPoints: parseNumber(readByLabel(tokens, /SPLAT POINTS/i, { dir: 'before', start: start, end: end })),
      avgHr: parseNumber(readByLabel(tokens, /AVG\.\s*HEART-RATE/i, { dir: 'before', start: start, end: end })),
      peakHr: parseNumber(readByLabel(tokens, /Peak HR:/i, { dir: 'after', start: start, end: end })),
      steps: '',
      avgPctMaxHr: '',
      maxPctMaxHr: '',
      zoneGrey: '', zoneBlue: '', zoneGreen: '', zoneOrange: '', zoneRed: '',
    };

    // Steps: only when a STEPS label sits inside the main window.
    var stepsIdx = findToken(tokens, /^STEPS$/i, start, end);
    if (stepsIdx !== -1) out.steps = parseNumber(valueBefore(tokens, stepsIdx, 3));

    // % of Max HR (2019/2020 variant): "<n>% AVG. % of MAX HEART-RATE Max: <n>".
    var pctIdx = findToken(tokens, /AVG\.\s*%\s*of\s*MAX/i, start, end);
    if (pctIdx !== -1) {
      out.avgPctMaxHr = parseNumber(valueBefore(tokens, pctIdx, 3));
      out.maxPctMaxHr = parseNumber(readPrefixedAfter(tokens, pctIdx, /Max:/i, 6));
    }

    return out;
  }

  function extractLegacy(ctx) {
    var tokens = ctx.tokens;
    return {
      calories: parseNumber(readByLabel(tokens, /CALORIES BURNED/, { dir: 'before' })),
      splatPoints: parseNumber(readByLabel(tokens, /SPLAT POINTS/, { dir: 'before' })),
      avgHr: parseNumber(readByLabel(tokens, /avg hr/i, { dir: 'before' })),
      avgPctMaxHr: parseNumber(readByLabel(tokens, /AVG MAX HR/i, { dir: 'before' })),
      peakHr: '', maxPctMaxHr: '', steps: '',
      zoneGrey: '', zoneBlue: '', zoneGreen: '', zoneOrange: '', zoneRed: '',
    };
  }

  function extract(ctx) {
    return ctx.family === 'legacy' ? extractLegacy(ctx) : extractModern(ctx);
  }

  return { isPresent: isPresent, extract: extract };
})();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = SummarySection;
}
