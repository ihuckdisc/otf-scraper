/**
 * Rower section - distance/time/watts/speed/500m split/stroke-rate totals.
 *
 * Modern family, 2023-present only. Scoped to the token window from the "ROWER
 * PERFORMANCE TOTALS" header to the end of the body. Same label-direction rules
 * as the treadmill section.
 *   - Total Distance / Total Time: value precedes the label.
 *   - AVG. WATTAGE / SPEED / 500M SPLIT / STROKE RATE: value follows the label;
 *     MAX value follows a "Max:" prefix span shortly after.
 */
var RowerSection = (function () {
  function isPresent(ctx) {
    return ctx.idx.rower !== -1;
  }

  function extract(ctx) {
    var tokens = ctx.tokens;
    var start = ctx.idx.rower;
    var end = tokens.length;

    function lbl(re) { return findToken(tokens, re, start, end); }

    var out = {
      rowerTotalDistance: parseNumber(readByLabel(tokens, /Total Distance/i, { dir: 'before', start: start, end: end })),
      rowerTotalTime: parseDuration(readByLabel(tokens, /Total Time/i, { dir: 'before', start: start, end: end })),
      rowerAvgWatts: '', rowerMaxWatts: '',
      rowerAvgSpeed: '', rowerMaxSpeed: '',
      rower500mSplit: '', rowerBest500mSplit: '',
      rowerAvgStrokeRate: '',
    };

    var wattsI = lbl(/AVG\.\s*WATT/i);
    if (wattsI !== -1) {
      out.rowerAvgWatts = parseNumber(valueAfter(tokens, wattsI, 3));
      out.rowerMaxWatts = parseNumber(readPrefixedAfter(tokens, wattsI, /Max:/i, 6));
    }
    var speedI = lbl(/AVG\.\s*SPEED/i);
    if (speedI !== -1) {
      out.rowerAvgSpeed = parseNumber(valueAfter(tokens, speedI, 3));
      out.rowerMaxSpeed = parseNumber(readPrefixedAfter(tokens, speedI, /Max:/i, 6));
    }
    var splitI = lbl(/500M SPLIT/i);
    if (splitI !== -1) {
      out.rower500mSplit = parseDuration(valueAfter(tokens, splitI, 3));
      out.rowerBest500mSplit = parseDuration(readPrefixedAfter(tokens, splitI, /Max:|Best:/i, 6));
    }
    var strokeI = lbl(/AVG\.\s*STROKE RATE/i);
    if (strokeI !== -1) {
      out.rowerAvgStrokeRate = parseNumber(valueAfter(tokens, strokeI, 3));
    }
    return out;
  }

  return { isPresent: isPresent, extract: extract };
})();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = RowerSection;
}
