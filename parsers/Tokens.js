/**
 * Tokens.js - navigation helpers over the ordered text-fragment list produced
 * by Normalize.tokenizeHtml().
 *
 * The OTF templates render each metric as a label fragment adjacent to a value
 * fragment. The relationship is consistent within a template but the DIRECTION
 * varies by metric (some put the value before the label, some after), so the
 * section extractors declare a direction per metric and these helpers do the
 * neighbor lookup. All searching is scoped to a token index window so the same
 * label appearing in two sections (e.g. "AVG. SPEED" in treadmill and rower)
 * never crosses wires.
 */

/** True if a token looks like it carries a number (incl. times like 14:20). */
function tokenHasNumber(tok) {
  return /\d/.test(String(tok));
}

/** True if a token is "value-like": numeric and not an obvious label word. */
function isValueToken(tok) {
  var t = String(tok);
  if (!/\d/.test(t)) return false;
  // A pure label like "500M SPLIT" contains digits but is mostly letters; we
  // treat tokens that are predominantly alphabetic as labels, not values.
  var letters = (t.match(/[A-Za-z]/g) || []).length;
  var digits = (t.match(/\d/g) || []).length;
  return digits >= letters;
}

/**
 * Find the index of the first token (within [start, end)) matching `matcher`.
 * @param {string[]} tokens
 * @param {RegExp|string} matcher
 * @param {number} [start]
 * @param {number} [end]
 * @returns {number} index or -1
 */
function findToken(tokens, matcher, start, end) {
  start = start || 0;
  end = (end == null) ? tokens.length : end;
  // Duck-type the matcher (a RegExp has a .test method) instead of using
  // `instanceof RegExp`, which is unreliable across JS realms.
  var re = (matcher && typeof matcher.test === 'function') ? matcher : null;
  for (var i = start; i < end; i++) {
    var t = tokens[i];
    if (re ? re.test(t) : t.indexOf(matcher) !== -1) return i;
  }
  return -1;
}

/**
 * Return the nearest value-like token scanning forward from `idx` (exclusive),
 * stopping at `limit` tokens away. Returns '' if none.
 */
function valueAfter(tokens, idx, limit) {
  limit = limit || 4;
  var end = Math.min(tokens.length, idx + 1 + limit);
  for (var i = idx + 1; i < end; i++) {
    if (isValueToken(tokens[i])) return tokens[i];
  }
  return '';
}

/**
 * Return the nearest value-like token scanning backward from `idx` (exclusive),
 * stopping at `limit` tokens away. Returns '' if none.
 */
function valueBefore(tokens, idx, limit) {
  limit = limit || 4;
  var start = Math.max(0, idx - limit);
  for (var i = idx - 1; i >= start; i--) {
    if (isValueToken(tokens[i])) return tokens[i];
  }
  return '';
}

/**
 * Generic label-anchored read inside a token window.
 * @param {string[]} tokens
 * @param {RegExp} labelRe        - matches the label fragment
 * @param {Object} opts
 * @param {string} opts.dir       - 'before' | 'after' (relative to label)
 * @param {number} [opts.limit]   - neighbor scan distance
 * @param {number} [opts.start]   - window start index
 * @param {number} [opts.end]     - window end index
 * @returns {string} the raw value token, or ''
 */
function readByLabel(tokens, labelRe, opts) {
  opts = opts || {};
  var idx = findToken(tokens, labelRe, opts.start, opts.end);
  if (idx === -1) return '';
  return opts.dir === 'before'
    ? valueBefore(tokens, idx, opts.limit)
    : valueAfter(tokens, idx, opts.limit);
}

/**
 * Read the value following a prefix span such as "Max:" / "Fastest:" that sits
 * within `limit` tokens AFTER a previously located anchor index. Used for the
 * treadmill/rower max columns.
 * @returns {string}
 */
function readPrefixedAfter(tokens, anchorIdx, prefixRe, scan) {
  scan = scan || 6;
  var end = Math.min(tokens.length, anchorIdx + 1 + scan);
  for (var i = anchorIdx + 1; i < end; i++) {
    if (prefixRe.test(tokens[i])) {
      // The value may be embedded in the same token ("Max: 5.4") or the next.
      if (isValueToken(tokens[i])) return tokens[i];
      return valueAfter(tokens, i, 2);
    }
  }
  return '';
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    tokenHasNumber: tokenHasNumber,
    isValueToken: isValueToken,
    findToken: findToken,
    valueAfter: valueAfter,
    valueBefore: valueBefore,
    readByLabel: readByLabel,
    readPrefixedAfter: readPrefixedAfter,
  };
}
