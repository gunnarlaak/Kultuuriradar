const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { test } = require('node:test');
const vm = require('node:vm');

const app = readFileSync(require('node:path').join(__dirname, '../app.js'), 'utf8');
const api = vm.runInNewContext(app.replace(
  /if\(document\.readyState==='loading'\)[^\n]+/,
  'return { collectorEvent, uniqueEvents, tallinnMidnight, filtered, state, label };'
), { URL });
const today = new Intl.DateTimeFormat('sv-SE', {
  timeZone: 'Europe/Tallinn', year: 'numeric', month: '2-digit', day: '2-digit'
}).format();
const row = {
  id: 'event', title: 'Kontsert', status: 'active', source_url: 'https://example.org/event',
  date_precision: 'date', start_date: today, end_date: today, municipality: 'Pärnu linn',
  latitude: null, longitude: null
};

test('validates dates and source link, keeps all-day events and approximates known towns', () => {
  const event = api.collectorEvent(row);
  assert.equal(event.approximate, true);
  assert.equal(event.lat, 58.3859);
  assert.doesNotMatch(api.label(event), /\d:\d/);
  assert.equal(api.collectorEvent({ ...row, end_date: '2026-02-30' }), null);
  assert.equal(api.collectorEvent({ ...row, source_url: 'javascript:alert(1)' }), null);
  assert.equal(api.collectorEvent({ ...row, status: 'cancelled' }), null);
  assert.equal(api.tallinnMidnight('2026-03-30') - api.tallinnMidnight('2026-03-29'), 23 * 3600000);
});

test('preserves distinct showtimes, and filters by radius, category and end time', () => {
  const event = api.collectorEvent(row);
  const other = { ...event, id: 'other', start: new Date(Date.parse(event.start) + 3600000).toISOString() };
  assert.equal(api.uniqueEvents([event, { ...event, id: 'duplicate' }, other]).length, 2);
  api.state.events = [event, { ...event, id: 'remote', lat: 59.437, lng: 24.7536 },
    { ...event, id: 'past', start: '2020-01-01T00:00:00Z', end: '2020-01-01T01:00:00Z' }];
  api.state.place = { lat: event.lat, lng: event.lng };
  api.state.date = 'all';
  api.state.radius = 10;
  assert.equal(api.filtered().length, 1);
  api.state.radius = 0;
  assert.equal(api.filtered().length, 2);
  api.state.cat = 'theatre';
  assert.equal(api.filtered().length, 0);
});
