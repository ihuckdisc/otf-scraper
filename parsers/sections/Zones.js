/**
 * Zone-minutes section - grey/blue/green/orange/red minutes.
 *
 * Always reads the READABLE minute numbers, never the bar pixel heights or zone
 * image filenames.
 *   Modern: five `bar-bumber` numbers rendered immediately BEFORE the
 *           "MINUTES / ZONE" label, in order grey, blue, green, orange, red.
 *   Legacy: five `numbers-summary` numbers rendered AFTER the
 *           "heart rate and zone summary" heading, same order.
 */
var ZonesSection = (function () {
  var MODERN_LABEL = /MINUTES\s*\/\s*ZONE/i;
  var LEGACY_LABEL = /heart rate and zone summary/i;
  var KEYS = ['zoneGrey', 'zoneBlue', 'zoneGreen', 'zoneOrange', 'zoneRed'];

  function isPresent(ctx) {
    return findToken(ctx.tokens, MODERN_LABEL) !== -1 ||
           findToken(ctx.tokens, LEGACY_LABEL) !== -1;
  }

  /** Collect up to `count` value-like tokens scanning a direction from idx. */
  function collect(tokens, idx, dir, count) {
    var vals = [];
    if (dir === 'before') {
      for (var i = idx - 1; i >= 0 && vals.length < count; i--) {
        if (isValueToken(tokens[i])) vals.unshift(parseNumber(tokens[i]));
        else break;
      }
    } else {
      for (var j = idx + 1; j < tokens.length && vals.length < count; j++) {
        if (isValueToken(tokens[j])) vals.push(parseNumber(tokens[j]));
        else if (vals.length > 0) break;
      }
    }
    return vals;
  }

  function extract(ctx) {
    var tokens = ctx.tokens;
    var out = {};
    var i;
    for (i = 0; i < KEYS.length; i++) out[KEYS[i]] = '';

    var vals = [];
    var modernIdx = findToken(tokens, MODERN_LABEL);
    if (modernIdx !== -1) {
      vals = collect(tokens, modernIdx, 'before', 5);
    } else {
      var legacyIdx = findToken(tokens, LEGACY_LABEL);
      if (legacyIdx !== -1) vals = collect(tokens, legacyIdx, 'after', 5);
    }

    if (vals.length === 5) {
      for (i = 0; i < 5; i++) out[KEYS[i]] = vals[i];
    }
    return out;
  }

  return { isPresent: isPresent, extract: extract };
})();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = ZonesSection;
}
