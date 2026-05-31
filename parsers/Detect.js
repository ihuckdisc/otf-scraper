/**
 * Detect.js - layout-family classification.
 *
 * Family governs ONLY the decoding/markup dialect (which anchors a section
 * extractor should look for); it does NOT route to a monolithic era parser.
 * Section presence is decided independently per section (see Parse.js).
 *
 *   'modern'  - 2019-present markup: header-day, bar-bumber, text-gray h2,
 *               "AVG. HEART-RATE", "... PERFORMANCE TOTALS".
 *   'legacy'  - 2018 "#keepburning": numbers/number-titles/zones-stats markup.
 *   'unknown' - neither matched confidently -> caller flags for review.
 */

/** Count how many of `anchors` appear in `haystack` (case-insensitive). */
function countAnchors(haystack, anchors) {
  var hits = 0;
  var hay = haystack.toLowerCase();
  for (var i = 0; i < anchors.length; i++) {
    if (hay.indexOf(anchors[i].toLowerCase()) !== -1) hits++;
  }
  return hits;
}

/**
 * Classify the cleaned HTML (tags preserved so class names are visible).
 * @param {string} cleanedHtml - output of Normalize.cleanHtml()
 * @returns {'modern'|'legacy'|'unknown'}
 */
function detectFamily(cleanedHtml) {
  if (!cleanedHtml) return 'unknown';
  var modernHits = countAnchors(cleanedHtml, FAMILY_ANCHORS.modern);
  var legacyHits = countAnchors(cleanedHtml, FAMILY_ANCHORS.legacy);
  if (modernHits === 0 && legacyHits === 0) return 'unknown';
  return modernHits >= legacyHits ? 'modern' : 'legacy';
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { detectFamily: detectFamily, countAnchors: countAnchors };
}
