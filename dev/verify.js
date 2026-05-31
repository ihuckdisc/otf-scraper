/** dev/verify.js - NODE-ONLY. Parses every fixture and prints the record + flags. */
const { loadContext, fixtureBody, FIXTURES } = require('./harness');

const ctx = loadContext();
const order = Object.keys(FIXTURES);
const fallback = {
  eraA_2018_03_19: new Date(2018, 2, 19),
  eraA_2018_04_16: new Date(2018, 3, 16),
};

for (const id of order) {
  const body = fixtureBody(id);
  const res = ctx.parseEmail(body, { fallbackDate: fallback[id] });
  const notes = ctx.computeStatusNotes(res);
  const key = ctx.buildUniqueKey(res.record, 'MSGID_' + id);
  console.log('\n===== ' + id + '  [family=' + res.family + '] =====');
  console.log('present:', JSON.stringify(res.present));
  const r = res.record;
  const show = (k) => (r[k] === '' ? '·' : (r[k] instanceof Date ? r[k].toISOString().slice(0, 10) : r[k]));
  console.log(`date=${show('date')} time=${show('classTime')} studio=${show('studio')} coach=${show('coach')}`);
  console.log(`cal=${show('calories')} splat=${show('splatPoints')} avgHR=${show('avgHr')} peakHR=${show('peakHr')} avg%=${show('avgPctMaxHr')} max%=${show('maxPctMaxHr')} steps=${show('steps')}`);
  console.log(`zones g/b/gr/o/r = ${show('zoneGrey')}/${show('zoneBlue')}/${show('zoneGreen')}/${show('zoneOrange')}/${show('zoneRed')}`);
  console.log(`tread dist=${show('treadTotalDistance')} time=${show('treadTotalTime')} spd=${show('treadAvgSpeed')}/${show('treadMaxSpeed')} inc=${show('treadAvgIncline')}/${show('treadMaxIncline')} pace=${show('treadAvgPace')}/${show('treadMaxPace')} elev=${show('elevationGain')}`);
  console.log(`rower dist=${show('rowerTotalDistance')} time=${show('rowerTotalTime')} watts=${show('rowerAvgWatts')}/${show('rowerMaxWatts')} spd=${show('rowerAvgSpeed')}/${show('rowerMaxSpeed')} split=${show('rower500mSplit')}/${show('rowerBest500mSplit')} stroke=${show('rowerAvgStrokeRate')}`);
  console.log('key=' + key);
  console.log('flags=' + (notes.length ? notes.join(' | ') : '(clean)'));
}
