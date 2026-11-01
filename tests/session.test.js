import { test } from 'node:test';
import assert from 'node:assert/strict';
import { startSession, afterVideo, afterRest, quit, nextVideoId } from '../js/session.js';

const IDS = ['core5', 'lowerabs3', 'triceps4', 'triceps3', 'biceps-towel', 'abs7'];

test('開始すると1本目を再生中', () => {
  const s = startSession(IDS);
  assert.equal(s.phase, 'playing');
  assert.equal(s.index, 0);
  assert.equal(s.recordedSeconds, 0);
  assert.deepEqual(s.videoIds, IDS);
});

test('1本終わると休憩に入り、次の動画は2本目', () => {
  const s = afterVideo(startSession(IDS), 200);
  assert.equal(s.phase, 'resting');
  assert.equal(s.index, 0);
  assert.equal(s.recordedSeconds, 200);
  assert.equal(nextVideoId(s), 'lowerabs3');
});

test('休憩が終わると次の動画を再生', () => {
  const s = afterRest(afterVideo(startSession(IDS), 200));
  assert.equal(s.phase, 'playing');
  assert.equal(s.index, 1);
});

test('最後の動画のあとは休憩せず完了', () => {
  let s = startSession(IDS);
  for (let i = 0; i < 5; i++) s = afterRest(afterVideo(s, 100));
  assert.equal(s.index, 5);
  s = afterVideo(s, 100);
  assert.equal(s.phase, 'done');
  assert.equal(s.recordedSeconds, 600);
  assert.equal(nextVideoId(s), null);
});

test('30秒未満で記録されなかった動画（0秒）でも休憩に進む', () => {
  const s = afterVideo(startSession(IDS), 0);
  assert.equal(s.phase, 'resting');
  assert.equal(s.recordedSeconds, 0);
});

test('やめると完了になり、記録済みの秒数は残る', () => {
  const s = quit(afterRest(afterVideo(startSession(IDS), 150)));
  assert.equal(s.phase, 'done');
  assert.equal(s.recordedSeconds, 150);
});

test('状態は元のオブジェクトを書き換えない', () => {
  const s0 = startSession(IDS);
  afterVideo(s0, 100);
  assert.equal(s0.phase, 'playing');
});

import { restRemaining } from '../js/session.js';

test('休憩の残り秒数は実際の時刻から計算する（画面ロック中も進む）', () => {
  const start = 1_000_000;
  const endAt = start + 60_000;
  assert.equal(restRemaining(endAt, start), 60);
  assert.equal(restRemaining(endAt, start + 500), 60);
  assert.equal(restRemaining(endAt, start + 1_000), 59);
  assert.equal(restRemaining(endAt, start + 120_000), 0); // 2分ロックしたら終わっている
});
