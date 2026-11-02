import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createStopwatch } from '../js/stopwatch.js';

test('スタート前は0秒、スタート後は実際の経過時間（YouTubeアプリにいる間も進む）', () => {
  let now = 1_000_000;
  const sw = createStopwatch(() => now);
  assert.equal(sw.running, false);
  assert.equal(sw.getSeconds(), 0);
  sw.start();
  assert.equal(sw.running, true);
  now += 999;
  assert.equal(sw.getSeconds(), 0);
  now += 1;
  assert.equal(sw.getSeconds(), 1);
  now += 4 * 60_000; // アプリを離れて4分
  assert.equal(sw.getSeconds(), 241);
});

test('2回目の start は時間をリセットしない', () => {
  let now = 0;
  const sw = createStopwatch(() => now);
  sw.start();
  now = 10_000;
  sw.start();
  assert.equal(sw.getSeconds(), 10);
});
