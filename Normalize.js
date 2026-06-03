/**
 * Normalize.js - low-level text cleanup + parsing primitives.
 *
 * Gmail's `getBody()` already decodes transfer encodings, but raw `.eml`
 * fixtures (used by Tests.js) are quoted-printable, so every helper here is
 * idempotent: running it on already-clean input is a no-op. The pipeline is
 * always: decode QP -> strip zero-width -> decode entities -> tokenize.
 */

/** Map of the named HTML entities that actually appear in these emails. */
var ENTITY_MAP = {
  '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"',
  '&apos;': "'", '&nbsp;': ' ', '&zwnj;': '', '&deg;': ' deg',
};

/**
 * Decode quoted-printable: remove soft line breaks (`=` at end of line) and
 * convert `=XX` hex escapes. Safe on non-QP input.
 * @param {string} raw
 * @returns {string}
 */
function decodeQuotedPrintable(raw) {
  if (raw == null) return '';
  var s = String(raw);
  // Soft line breaks: an '=' immediately followed by CRLF/LF.
  s = s.replace(/=\r?\n/g, '');
  // Hex escapes: =3D -> '='. Only touch valid two-hex-digit sequences.
  s = s.replace(/=([0-9A-Fa-f]{2})/g, function (_, hex) {
    return String.fromCharCode(parseInt(hex, 16));
  });
  return s;
}

/**
 * Remove zero-width non-joiners (U+200C) and their `&zwnj;` entity form. These
 * are injected into OTF time/number fields (e.g. `6&zwnj;:05`) and are the root
 * cause of garbled values like `25‌:15`.
 * @param {string} s
 * @returns {string}
 */
function stripZeroWidth(s) {
  if (s == null) return '';
  return String(s)
    .replace(/&zwnj;/gi, '')
    .replace(/[\u200B-\u200D\uFEFF]/g, '');
}

/**
 * Decode the small set of HTML entities found in these emails, including
 * numeric (&#160; / &#xA0;) forms.
 * @param {string} s
 * @returns {string}
 */
function decodeEntities(s) {
  if (s == null) return '';
  var out = String(s);
  out = out.replace(/&#x([0-9A-Fa-f]+);/g, function (_, hex) {
    return String.fromCharCode(parseInt(hex, 16));
  });
  out = out.replace(/&#(\d+);/g, function (_, dec) {
    return String.fromCharCode(parseInt(dec, 10));
  });
  out = out.replace(/&[a-zA-Z]+;/g, function (m) {
    return Object.prototype.hasOwnProperty.call(ENTITY_MAP, m.toLowerCase())
      ? ENTITY_MAP[m.toLowerCase()]
      : m;
  });
  return out;
}

/** Collapse runs of whitespace to single spaces and trim. */
function collapseWhitespace(s) {
  return String(s == null ? '' : s).replace(/\s+/g, ' ').trim();
}

/**
 * Fully clean a raw email body: QP-decode, strip zero-width, decode entities.
 * Returns HTML that still contains tags (tokenizer needs tag boundaries).
 * @param {string} raw
 * @returns {string}
 */
function cleanHtml(raw) {
  return decodeEntities(stripZeroWidth(decodeQuotedPrintable(raw)));
}

/**
 * Tokenize cleaned HTML into an ordered list of visible text fragments. Each
 * tag boundary (open or close) splits fragments, so an inline label/value pair
 * like `<span>Peak HR:</span> 161` becomes two tokens: "Peak HR:" and "161".
 * Style/script blocks are dropped so CSS text never leaks into tokens.
 * @param {string} raw
 * @returns {string[]}
 */
function tokenizeHtml(raw) {
  var html = cleanHtml(raw);
  // Drop <style>...</style> and <script>...</script> wholesale.
  html = html.replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ' ');
  html = html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ');
  // Replace every tag with a delimiter, then split.
  var withDelims = html.replace(/<[^>]*>/g, '\u0001');
  var parts = withDelims.split('\u0001');
  var tokens = [];
  for (var i = 0; i < parts.length; i++) {
    var t = collapseWhitespace(parts[i]);
    if (t) tokens.push(t);
  }
  return tokens;
}

/** Convert cleaned HTML to a single flat text blob (for anchor probes). */
function htmlToText(raw) {
  return tokenizeHtml(raw).join(' ');
}

/**
 * Parse a numeric string: strip commas/units/spaces. Returns a Number, or ''
 * (blank) when no number is present. Never returns 0 for missing data.
 * @param {string} s
 * @returns {number|string}
 */
function parseNumber(s) {
  if (s == null) return '';
  var m = String(s).replace(/,/g, '').match(/-?\d+(?:\.\d+)?/);
  if (!m) return '';
  var n = parseFloat(m[0]);
  return isNaN(n) ? '' : n;
}

/**
 * Normalize a class time like ` 6:05 AM ` (post zero-width strip) to "6:05 AM".
 * Returns '' if no time is found.
 * @param {string} s
 * @returns {string}
 */
function parseClassTime(s) {
  if (s == null) return '';
  var m = stripZeroWidth(String(s)).match(/(\d{1,2}:\d{2}\s*(?:AM|PM))/i);
  return m ? collapseWhitespace(m[1]).toUpperCase() : '';
}

/**
 * Normalize a duration/pace string like ` 29:04 ` or ` 01:46 ` to "29:04".
 * Accepts H:MM:SS too. Returns '' if none found.
 * @param {string} s
 * @returns {string}
 */
function parseDuration(s) {
  if (s == null) return '';
  var m = stripZeroWidth(String(s)).match(/(\d{1,2}:\d{2}(?::\d{2})?)/);
  return m ? m[1] : '';
}

/**
 * Convert a duration string to a Sheets time value (fraction of a day).
 * Handles MM:SS and H:MM:SS via parseDuration(). Returns '' when invalid.
 * @param {string} s
 * @returns {number|string}
 */
function parseDurationToDays(s) {
  var str = parseDuration(s);
  if (!str) return '';
  var p = str.split(':').map(function (x) { return parseInt(x, 10); });
  if (p.some(isNaN)) return '';
  var secs = p.length === 3 ? p[0] * 3600 + p[1] * 60 + p[2]
           : p.length === 2 ? p[0] * 60 + p[1] : NaN;
  return isNaN(secs) ? '' : secs / 86400;
}

/**
 * Parse an MM/DD/YYYY body date into a Date (local midnight). Returns null if
 * not present so the caller can fall back to the Gmail message date.
 * @param {string} s
 * @returns {Date|null}
 */
function parseDate(s) {
  if (s == null) return null;
  var m = String(s).match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (!m) return null;
  var month = parseInt(m[1], 10);
  var day = parseInt(m[2], 10);
  var year = parseInt(m[3], 10);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  return new Date(year, month - 1, day);
}

/**
 * Strip the time component from a Date, returning local midnight of the same
 * calendar day (in the script timezone). Used for the legacy fallback date
 * (Gmail's message timestamp) so the recorded day - and the derived Day/Year
 * columns - never shift across a day/year boundary. Pass-through on bad input.
 * @param {Date} d
 * @returns {Date}
 */
function toLocalMidnight(d) {
  if (!(d instanceof Date) || isNaN(d.getTime())) return d;
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

/**
 * Add signed calendar months to a date, returning the first day of the result
 * month (local timezone). Pure JS — safe under Node and Apps Script.
 * @param {Date} date
 * @param {number} deltaMonths
 * @returns {Date}
 */
function addCalendarMonths_(date, deltaMonths) {
  if (!(date instanceof Date) || isNaN(date.getTime())) return date;
  var anchor = new Date(date.getFullYear(), date.getMonth(), 1);
  var y = anchor.getFullYear();
  var m = anchor.getMonth();
  var total = y * 12 + m + (deltaMonths | 0);
  var newY = Math.floor(total / 12);
  var newM = ((total % 12) + 12) % 12;
  return new Date(newY, newM, 1);
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    decodeQuotedPrintable: decodeQuotedPrintable,
    stripZeroWidth: stripZeroWidth,
    decodeEntities: decodeEntities,
    collapseWhitespace: collapseWhitespace,
    cleanHtml: cleanHtml,
    tokenizeHtml: tokenizeHtml,
    htmlToText: htmlToText,
    parseNumber: parseNumber,
    parseClassTime: parseClassTime,
    parseDuration: parseDuration,
    parseDurationToDays: parseDurationToDays,
    parseDate: parseDate,
    toLocalMidnight: toLocalMidnight,
    addCalendarMonths_: addCalendarMonths_,
  };
}
