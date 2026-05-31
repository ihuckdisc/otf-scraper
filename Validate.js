/**
 * Validate.js - dedupe keys, anomaly rules, and review flags.
 *
 * Philosophy: import almost everything, but never leave a quietly half-empty
 * row. Anomalous-but-real values are imported AND flagged; structurally broken
 * parses are flagged for human review. All flags are additive and concatenated
 * into the single per-row Status column so none are lost.
 */

/** Format a Date as YYYY-MM-DD for stable keys; '' when absent. */
function dateKey(d) {
  if (!d) return '';
  if (d instanceof Date && !isNaN(d.getTime())) {
    var y = d.getFullYear();
    var m = ('0' + (d.getMonth() + 1)).slice(-2);
    var day = ('0' + d.getDate()).slice(-2);
    return y + '-' + m + '-' + day;
  }
  return String(d);
}

/** Lowercase + collapse for key components so casing/spacing don't split keys. */
function keyPart(s) {
  return String(s == null ? '' : s).toLowerCase().replace(/\s+/g, ' ').trim();
}

/**
 * Dedupe key: Date + Studio + ClassTime when available; otherwise fall back to
 * Date + Gmail message ID (legacy/2018 emails lack studio/time).
 * @param {Object} record
 * @param {string} [messageId]
 * @returns {string}
 */
function buildUniqueKey(record, messageId) {
  var dk = dateKey(record.date);
  if (record.studio && record.classTime) {
    return dk + '|' + keyPart(record.studio) + '|' + keyPart(record.classTime);
  }
  return dk + '|msg:' + keyPart(messageId);
}

/**
 * Inspect a parse result and produce review/anomaly status notes.
 * @param {Object} parseResult - output of parseEmail()
 * @returns {string[]} status notes (possibly empty)
 */
function computeStatusNotes(parseResult) {
  var notes = [];
  var rec = parseResult.record;
  var c = parseResult.completeness;

  // Unknown layout family: import what parsed, flag for review.
  if (parseResult.family === 'unknown') {
    notes.push(STATUS.UNKNOWN_TEMPLATE);
  } else if (parseResult.family === 'modern') {
    // Partial-parse safety net for unseen modern-ish variants.
    var looksLikeClass = c.sectionsFound.header || c.sectionsFound.summary;
    if (looksLikeClass && (c.dataSectionCount === 0 || !c.hasDate || !c.hasCalories)) {
      notes.push(STATUS.PARTIAL_PARSE);
    }
  }

  // Anomaly rules (import + flag). Small tolerance for rounding.
  var anomalies = [];
  if (rec.avgPctMaxHr !== '' && rec.avgPctMaxHr > 100) anomalies.push('avg %max HR > 100');
  if (rec.maxPctMaxHr !== '' && rec.maxPctMaxHr > 105) anomalies.push('max %max HR > 105');
  if (rec.avgHr !== '' && (rec.avgHr < 40 || rec.avgHr > 230)) anomalies.push('avg HR out of range');
  if (rec.peakHr !== '' && rec.peakHr > 230) anomalies.push('peak HR out of range');
  if (rec.rowerAvgStrokeRate !== '' && (rec.rowerAvgStrokeRate < 5 || rec.rowerAvgStrokeRate > 60)) {
    anomalies.push('stroke rate implausible');
  }
  var zoneSum = ['zoneGrey', 'zoneBlue', 'zoneGreen', 'zoneOrange', 'zoneRed']
    .reduce(function (acc, k) { return acc + (typeof rec[k] === 'number' ? rec[k] : 0); }, 0);
  if (zoneSum > 90) anomalies.push('zone minutes sum > 90');
  if (anomalies.length) notes.push('Anomaly: ' + anomalies.join('; '));

  return notes;
}

/** Join status notes with the existing status, keeping all flags. */
function mergeStatus(existing, notes) {
  var parts = [];
  if (existing) parts.push(existing);
  for (var i = 0; i < notes.length; i++) {
    if (notes[i] && parts.indexOf(notes[i]) === -1) parts.push(notes[i]);
  }
  return parts.join(' | ');
}

/**
 * Compare a freshly parsed record against an already-imported one (same message
 * ID) during a full scrape. Returns the list of value fields that now have data
 * where the stored row was blank (i.e. "better data available").
 * @param {Object} fresh   - newly parsed record
 * @param {Object} stored  - map of {fieldKey: storedValue}
 * @returns {string[]} field keys with newly-available data
 */
function betterDataFields(fresh, stored) {
  var improved = [];
  for (var i = 0; i < COLUMNS.length; i++) {
    var c = COLUMNS[i];
    if (c.kind !== 'value') continue;
    if (c.key === 'status' || c.key === 'source' || c.key === 'uniqueKey') continue;
    var freshHas = fresh[c.key] !== '' && fresh[c.key] != null;
    var storedHas = stored[c.key] !== '' && stored[c.key] != null;
    if (freshHas && !storedHas) improved.push(c.key);
  }
  return improved;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    dateKey: dateKey,
    keyPart: keyPart,
    buildUniqueKey: buildUniqueKey,
    computeStatusNotes: computeStatusNotes,
    mergeStatus: mergeStatus,
    betterDataFields: betterDataFields,
  };
}
