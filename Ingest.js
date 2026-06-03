/**
 * Ingest.js - orchestration for incremental and full scrapes.
 *
 * runUpdate(): scrape everything since the last recorded Email class (may be
 *   several) using a Gmail `after:` bound.
 * runFullScrape(): scan all sender mail for anything missing.
 *
 * Both share scrapeMessages(): normalize -> parse -> dedupe -> validate ->
 * collect, then a single batched insert + sort. Manual rows are never used as
 * the "since" boundary and are never rewritten.
 */

/** Format a Date for a Gmail `after:` clause (YYYY/MM/DD, local). */
function formatGmailDate_(date) {
  var y = date.getFullYear();
  var m = ('0' + (date.getMonth() + 1)).slice(-2);
  var d = ('0' + date.getDate()).slice(-2);
  return y + '/' + m + '/' + d;
}

/**
 * Read the Data tab once and build the structures the scraper needs.
 * @returns {{keySet:Object, msgIdMap:Object, byDate:Object, lastEmailDate:Date|null}}
 */
function getExistingIndex() {
  var rows = readRecords();
  var keySet = {};
  var msgIdMap = {};
  var byDate = {};
  var lastEmailDate = null;

  for (var i = 0; i < rows.length; i++) {
    var rec = rows[i].record;
    if (rec.uniqueKey) keySet[rec.uniqueKey] = true;

    var dk = dateKey(rec.date instanceof Date ? rec.date : parseDate(rec.date));
    if (dk) {
      if (!byDate[dk]) byDate[dk] = [];
      byDate[dk].push({ studio: keyPart(rec.studio), classTime: keyPart(rec.classTime) });
    }

    if (rec.source === SOURCE.EMAIL) {
      if (rec.messageId) msgIdMap[rec.messageId] = { rowIndex: rows[i].rowIndex, record: rec };
      var d = rec.date instanceof Date ? rec.date : parseDate(rec.date);
      if (d && (!lastEmailDate || d.getTime() > lastEmailDate.getTime())) lastEmailDate = d;
    }
  }
  return { keySet: keySet, msgIdMap: msgIdMap, byDate: byDate, lastEmailDate: lastEmailDate };
}

/** Find the most recent Email class date (null if none). */
function findLastClassDate() {
  return getExistingIndex().lastEmailDate;
}

/** Iterate all sender messages matching `query`, calling fn(message). */
function forEachMessage_(query, fn) {
  var start = 0;
  var threads;
  do {
    threads = GmailApp.search(query, start, GMAIL.pageSize);
    for (var t = 0; t < threads.length; t++) {
      var msgs = threads[t].getMessages();
      for (var m = 0; m < msgs.length; m++) {
        if (msgs[m].getFrom().toLowerCase().indexOf(SENDER.toLowerCase()) !== -1) {
          fn(msgs[m]);
        }
      }
    }
    start += threads.length;
  } while (threads.length === GMAIL.pageSize);
}

/** Detect a near-duplicate (same date/studio, different time; or legacy same date). */
function isNearDuplicate_(record, byDate) {
  var dk = dateKey(record.date);
  var sameDay = byDate[dk];
  if (!sameDay || !sameDay.length) return false;
  var studio = keyPart(record.studio);
  var time = keyPart(record.classTime);
  for (var i = 0; i < sameDay.length; i++) {
    var e = sameDay[i];
    if (!studio && !time) return true;              // legacy: any same-day row
    if (studio && e.studio === studio && e.classTime !== time) return true;
  }
  return false;
}

/**
 * Core scraper shared by update + full scrape.
 * @param {string} query
 * @param {string} runType
 * @returns {{scanned:number, added:number, skipped:number, flags:number, errors:number}}
 */
function scrapeMessages_(query, runType) {
  var index = getExistingIndex();
  var stats = { scanned: 0, added: 0, skipped: 0, flags: 0, errors: 0 };
  var newRecords = [];
  var statusUpdates = []; // {rowIndex, note} for "better data available"

  forEachMessage_(query, function (message) {
    stats.scanned++;
    try {
      var messageId = message.getId();

      // Already imported: only check for better data; never overwrite.
      if (index.msgIdMap[messageId]) {
        var existing = index.msgIdMap[messageId];
        var reparse = parseEmail(message.getBody(), { fallbackDate: message.getDate() });
        var improved = betterDataFields(reparse.record, existing.record);
        if (improved.length) {
          statusUpdates.push({ rowIndex: existing.rowIndex, fields: improved });
        }
        return;
      }

      var result = parseEmail(message.getBody(), { fallbackDate: message.getDate() });
      var record = result.record;
      var key = buildUniqueKey(record, messageId);

      if (index.keySet[key]) { stats.skipped++; return; } // exact duplicate

      var notes = computeStatusNotes(result);
      if (isNearDuplicate_(record, index.byDate)) notes.push(STATUS.POSSIBLE_DUPLICATE);

      record.messageId = messageId;
      record.uniqueKey = key;
      record.status = mergeStatus('', notes);
      if (notes.length) stats.flags++;

      // Track within-run so the same key/day isn't added twice this run.
      index.keySet[key] = true;
      var dk = dateKey(record.date);
      if (!index.byDate[dk]) index.byDate[dk] = [];
      index.byDate[dk].push({ studio: keyPart(record.studio), classTime: keyPart(record.classTime) });

      newRecords.push(record);
      stats.added++;
    } catch (err) {
      stats.errors++;
      // Surface which message failed and why (Stackdriver) instead of swallowing it.
      try {
        var mid = (typeof message.getId === 'function') ? message.getId() : '(unknown id)';
        var mdate = (typeof message.getDate === 'function') ? message.getDate() : '';
        Logger.log('OTF parse error msg=' + mid + ' date=' + mdate + ' : ' + (err && err.stack ? err.stack : err));
      } catch (e2) { /* never let logging mask the original error */ }
    }
  });

  var insertResult = { refreshed: false };
  if (newRecords.length) insertResult = insertRecordsAtTop(newRecords);
  applyStatusUpdates_(statusUpdates, stats);

  logRun(runType, stats);
  var toastMsg = summarizeStats(stats);
  if (insertResult.refreshed) toastMsg += ' Dashboard data updated.';
  toast(toastMsg, runType);
  return stats;
}

/** Append a "better data available" note to existing rows (status only). */
function applyStatusUpdates_(updates, stats) {
  if (!updates || !updates.length) return;
  var sheet = getDataSheet_();
  var meta = getColumnMeta();
  var statusCol = meta.byKey.status;
  for (var i = 0; i < updates.length; i++) {
    var u = updates[i];
    var cell = sheet.getRange(u.rowIndex, statusCol);
    var note = STATUS.BETTER_DATA + ' (' + u.fields.join(', ') + ')';
    cell.setValue(mergeStatus(cell.getValue(), [note]));
    stats.flags++;
  }
}

/** Menu action: incremental scrape since the last recorded Email class. */
function runUpdate() {
  ensureSheets();
  var last = findLastClassDate();
  if (!last) {
    // No prior Email rows -> behave like a full scrape.
    return scrapeMessages_(GMAIL.base, 'Update');
  }
  var since = new Date(last.getTime());
  since.setDate(since.getDate() - GMAIL.updateLookbackDays);
  var query = GMAIL.base + ' after:' + formatGmailDate_(since);
  return scrapeMessages_(query, 'Update');
}

/** Menu action: scan all sender mail for anything missing. */
function runFullScrape() {
  ensureSheets();
  return scrapeMessages_(GMAIL.base, 'Full Scrape');
}
