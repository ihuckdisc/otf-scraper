/**
 * Parse.js - orchestrates section/capability parsing.
 *
 * Flow: build a parse context (clean HTML, token stream, family, section index
 * map) -> run every section extractor whose `isPresent` returns true -> merge
 * the slices into one full-shape record (blanks for absent sections/metrics) ->
 * emit a completeness signal for the Phase-5 partial-parse safety net.
 *
 * The email is never required to match a known era combination; whatever
 * sections exist are captured, so an unseen variant (e.g. a 2021 class) is
 * handled with no code change.
 */

/** Ordered list of section extractors, with stable names for the signal. */
function getSections() {
  return [
    { name: 'header', mod: HeaderSection },
    { name: 'summary', mod: SummarySection },
    { name: 'zones', mod: ZonesSection },
    { name: 'treadmill', mod: TreadmillSection },
    { name: 'rower', mod: RowerSection },
  ];
}

/** Build the value-key skeleton record with every field blank. */
function emptyRecord() {
  var rec = {};
  for (var i = 0; i < COLUMNS.length; i++) {
    var c = COLUMNS[i];
    if (c.kind === 'value' || c.kind === 'hidden') rec[c.key] = '';
  }
  return rec;
}

/** Construct the parse context from a raw (possibly QP-encoded) email body. */
function makeContext(raw) {
  var html = cleanHtml(raw);
  var tokens = tokenizeHtml(raw);
  return {
    raw: raw,
    html: html,
    tokens: tokens,
    family: detectFamily(html),
    idx: {
      tread: findToken(tokens, SECTION_ANCHORS.treadmill),
      rower: findToken(tokens, SECTION_ANCHORS.rower),
    },
  };
}

/**
 * Parse a raw email body into a full record plus metadata.
 * @param {string} raw
 * @param {Object} [opts]
 * @param {Date} [opts.fallbackDate] - used when no body date is found (legacy).
 * @returns {{record: Object, family: string, present: Object, completeness: Object}}
 */
function parseEmail(raw, opts) {
  opts = opts || {};
  var ctx = makeContext(raw);
  var record = emptyRecord();
  var present = {};
  var sections = getSections();

  for (var i = 0; i < sections.length; i++) {
    var s = sections[i];
    if (!s.mod.isPresent(ctx)) { present[s.name] = false; continue; }
    present[s.name] = true;
    var slice = s.mod.extract(ctx);
    for (var k in slice) {
      if (Object.prototype.hasOwnProperty.call(slice, k) && slice[k] !== '' && slice[k] != null) {
        record[k] = slice[k];
      }
    }
  }

  // Date fallback: legacy emails carry no body date. Normalize the Gmail
  // timestamp to local midnight so the recorded day/year can't drift across a
  // boundary due to the email's send time.
  if ((record.date === '' || record.date == null) && opts.fallbackDate) {
    record.date = toLocalMidnight(opts.fallbackDate);
  }

  record.source = SOURCE.EMAIL;

  var dataSections = ['summary', 'zones', 'treadmill', 'rower'];
  var dataFound = 0;
  for (var j = 0; j < dataSections.length; j++) if (present[dataSections[j]]) dataFound++;

  var completeness = {
    family: ctx.family,
    sectionsFound: present,
    dataSectionCount: dataFound,
    hasDate: !!record.date,
    hasCalories: record.calories !== '' && record.calories != null,
  };

  return { record: record, family: ctx.family, present: present, completeness: completeness, ctx: ctx };
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    parseEmail: parseEmail,
    makeContext: makeContext,
    emptyRecord: emptyRecord,
    getSections: getSections,
  };
}
