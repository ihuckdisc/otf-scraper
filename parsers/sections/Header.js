/**
 * Header section - class date, class time, studio, coach.
 *
 * Present only in the modern family (2018 "#keepburning" emails have no header
 * block). The modern templates render the header as an ordered run of tokens
 * following the "STUDIO WORKOUT SUMMARY" banner:
 *   [banner] [studio] [MM/DD/YYYY] [H:MM AM/PM] [coach]
 * This order holds across the 2019 and 2025 variants, so we anchor on the
 * banner and read positionally with type guards (date/time regex) rather than
 * trusting any single fixed offset.
 */
var HeaderSection = (function () {
  var BANNER = /STUDIO WORKOUT SUMMARY/i;
  var DATE_RE = /\b\d{1,2}\/\d{1,2}\/\d{4}\b/;
  var TIME_RE = /\b\d{1,2}:\d{2}\s*(?:AM|PM)\b/i;

  function isPresent(ctx) {
    return findToken(ctx.tokens, BANNER) !== -1 || findToken(ctx.tokens, DATE_RE, 0, 40) !== -1;
  }

  function extract(ctx) {
    var tokens = ctx.tokens;
    var out = { date: '', classTime: '', coach: '', studio: '' };
    var bannerIdx = findToken(tokens, BANNER);
    var searchStart = bannerIdx === -1 ? 0 : bannerIdx + 1;

    // Studio: the token immediately after the banner (when present).
    if (bannerIdx !== -1 && tokens[bannerIdx + 1] &&
        !DATE_RE.test(tokens[bannerIdx + 1]) && !TIME_RE.test(tokens[bannerIdx + 1])) {
      out.studio = collapseWhitespace(tokens[bannerIdx + 1]);
    }

    // Date: first MM/DD/YYYY token in the header region.
    var dateIdx = findToken(tokens, DATE_RE, searchStart, searchStart + 12);
    if (dateIdx !== -1) out.date = parseDate(tokens[dateIdx]);

    // Class time: first H:MM AM/PM token in the header region.
    var timeIdx = findToken(tokens, TIME_RE, searchStart, searchStart + 12);
    if (timeIdx !== -1) {
      out.classTime = parseClassTime(tokens[timeIdx]);
      // Coach: the token right after the time, if it reads like a name.
      var maybeCoach = tokens[timeIdx + 1];
      if (maybeCoach && /[A-Za-z]/.test(maybeCoach) &&
          !DATE_RE.test(maybeCoach) && !TIME_RE.test(maybeCoach) &&
          !/PERFORMANCE TOTALS|MINUTES|ZONE|CALORIES/i.test(maybeCoach)) {
        out.coach = collapseWhitespace(maybeCoach);
      }
    }
    return out;
  }

  return { isPresent: isPresent, extract: extract };
})();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = HeaderSection;
}
