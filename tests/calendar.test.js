import { test } from 'node:test';
import assert from 'node:assert/strict';
import { monthGrid } from '../js/calendar.js';

test('2026年11月：1日は日曜なので1週目の最後', () => {
  const g = monthGrid(2026, 11);
  assert.deepEqual(g[0], [null, null, null, null, null, null, '2026-11-01']);
  assert.equal(g[g.length - 1][0], '2026-11-30');
  assert.ok(g.every((w) => w.length === 7));
  assert.equal(g.flat().filter(Boolean).length, 30);
});

test('2027年2月：1日が月曜で、ちょうど4週', () => {
  const g = monthGrid(2027, 2);
  assert.equal(g[0][0], '2027-02-01');
  assert.equal(g.length, 4);
  assert.equal(g[3][6], '2027-02-28');
});
