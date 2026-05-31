/**
 * Treadmill section - distance/time/speed/incline/pace/elevation totals.
 *
 * Modern family only. Scoped to the token window between the "TREADMILL
 * PERFORMANCE TOTALS" header and the rower header (or end), so the identical
 * "AVG. SPEED" / "Total Distance" labels in the rower section never bleed in.
 *
 * Within the window:
 *   - Total Distance / Total Time: value precedes the label.
 *   - AVG. SPEED / INCLINE / PACE: value follows the label; the MAX/FASTEST
 *     value follows a "Max:" / "Fastest:" prefix span shortly after.
 *   - ELEVATION: value follows the label.
 */
var TreadmillSection = (function () {
  function isPresent(ctx) {
    return ctx.idx.tread !== -1;
  }

  function extract(ctx) {
    var tokens = ctx.tokens;
    var start = ctx.idx.tread;
    var end = ctx.idx.rower !== -1 ? ctx.idx.rower : tokens.length;

    function avgIdx(re) { return findToken(tokens, re, start, end); }

    var out = {
      treadTotalDistance: parseNumber(readByLabel(tokens, /Total Distance/i, { dir: 'before', start: start, end: end })),
      treadTotalTime: parseDuration(readByLabel(tokens, /Total Time/i, { dir: 'before', start: start, end: end })),
      treadAvgSpeed: '', treadMaxSpeed: '',
      treadAvgIncline: '', treadMaxIncline: '',
      treadAvgPace: '', treadMaxPace: '',
      elevationGain: parseNumber(readByLabel(tokens, /ELEVATION/i, { dir: 'after', start: start, end: end })),
    };

    var speedI = avgIdx(/AVG\.\s*SPEED/i);
    if (speedI !== -1) {
      out.treadAvgSpeed = parseNumber(valueAfter(tokens, speedI, 3));
      out.treadMaxSpeed = parseNumber(readPrefixedAfter(tokens, speedI, /Max:/i, 6));
    }
    var inclineI = avgIdx(/AVG\.\s*INCLINE/i);
    if (inclineI !== -1) {
      out.treadAvgIncline = parseNumber(valueAfter(tokens, inclineI, 3));
      out.treadMaxIncline = parseNumber(readPrefixedAfter(tokens, inclineI, /Max:/i, 6));
    }
    var paceI = avgIdx(/AVG\.\s*PACE/i);
    if (paceI !== -1) {
      out.treadAvgPace = parseDuration(valueAfter(tokens, paceI, 3));
      out.treadMaxPace = parseDuration(readPrefixedAfter(tokens, paceI, /Fastest:|Max:/i, 6));
    }
    return out;
  }

  return { isPresent: isPresent, extract: extract };
})();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = TreadmillSection;
}
