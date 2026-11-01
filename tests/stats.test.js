import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  toDateKey, addDays, weekStart, weekProgress, currentStreak, longestStreak,
  lastDoneLabel, totals, byVideo, byMuscle, recordsOn, formatDuration,
} from '../js/stats.js';

let n = 0;
const r = (date, videoId = 'core5', seconds = 100) => ({ id: `r${n++}`, date, videoId, seconds });

test('toDateKey は現地時刻の YYYY-MM-DD', () => {
  assert.equal(toDateKey(new Date(2026, 0, 5, 23, 59)), '2026-01-05');
});

test('addDays は月・年をまたげる', () => {
  assert.equal(addDays('2026-12-31', 1), '2027-01-01');
  assert.equal(addDays('2026-03-01', -1), '2026-02-28');
});

test('weekStart は月曜を返す', () => {
  assert.equal(weekStart('2026-11-01'), '2026-10-26'); // 日曜
  assert.equal(weekStart('2026-11-02'), '2026-11-02'); // 月曜
  assert.equal(weekStart('2027-01-01'), '2026-12-28'); // 年またぎ
});

test('同じ日に6件 → 週1日、合計1日・6回', () => {
  const recs = ['core5', 'lowerabs3', 'triceps4', 'triceps3', 'biceps-towel', 'abs7'].map((v) => r('2026-11-02', v));
  assert.equal(weekProgress(recs, '2026-11-02', 3).done, 1);
  assert.deepEqual(totals(recs), { days: 1, count: 6, seconds: 600 });
});

test('月〜水に記録、目標3 → 達成。前週は数えない', () => {
  const recs = [r('2026-11-01'), r('2026-11-02'), r('2026-11-03'), r('2026-11-04')];
  assert.deepEqual(weekProgress(recs, '2026-11-04', 3), { done: 3, goal: 3, achieved: true });
  assert.deepEqual(weekProgress(recs.slice(0, 3), '2026-11-03', 3), { done: 2, goal: 3, achieved: false });
});

test('週が年をまたいでも数える', () => {
  const recs = [r('2026-12-29'), r('2027-01-02')];
  assert.equal(weekProgress(recs, '2027-01-03', 3).done, 2);
});

test('連続日数：今日あり＋昨日あり → 2', () => {
  assert.equal(currentStreak([r('2026-11-01'), r('2026-10-31')], '2026-11-01'), 2);
});
test('連続日数：今日なし・昨日あり → 1（途切れていない）', () => {
  assert.equal(currentStreak([r('2026-10-31')], '2026-11-01'), 1);
});
test('連続日数：今日なし・昨日なし → 0', () => {
  assert.equal(currentStreak([r('2026-10-30')], '2026-11-01'), 0);
});
test('連続日数：年またぎ、同日複数も1日', () => {
  assert.equal(currentStreak([r('2026-12-31'), r('2027-01-01'), r('2027-01-01')], '2027-01-01'), 2);
});

test('最長連続日数', () => {
  const recs = ['2026-10-01', '2026-10-02', '2026-10-03', '2026-10-05', '2026-10-06'].map((d) => r(d));
  assert.equal(longestStreak(recs), 3);
  assert.equal(longestStreak([]), 0);
  assert.equal(longestStreak([r('2026-10-01'), r('2026-10-01')]), 1);
});

test('前回からの日数ラベル', () => {
  const recs = [r('2026-11-01', 'core5'), r('2026-10-31', 'abs7'), r('2026-10-27', 'triceps4'), r('2026-10-20', 'triceps4')];
  assert.equal(lastDoneLabel(recs, 'core5', '2026-11-01'), '今日');
  assert.equal(lastDoneLabel(recs, 'abs7', '2026-11-01'), '昨日');
  assert.equal(lastDoneLabel(recs, 'triceps4', '2026-11-01'), '5日前');
  assert.equal(lastDoneLabel(recs, 'lowerabs3', '2026-11-01'), 'まだ');
});

test('動画ごとの回数と時間', () => {
  const recs = [r('2026-11-01', 'abs7', 200), r('2026-11-02', 'abs7', 210), r('2026-11-02', 'core5', 300)];
  assert.deepEqual(byVideo(recs), { abs7: { count: 2, seconds: 410 }, core5: { count: 1, seconds: 300 } });
});

test('部位ごとはメイン部位だけ数える', () => {
  const m = byMuscle([r('2026-11-01', 'core5'), r('2026-11-01', 'abs7')]);
  assert.equal(m.rectus, 2);
  assert.equal(m.obliques, 1);
  assert.equal(m.erector ?? 0, 0);
});

test('recordsOn はその日の記録だけ', () => {
  const recs = [r('2026-11-01'), r('2026-11-02'), r('2026-11-01', 'abs7')];
  assert.equal(recordsOn(recs, '2026-11-01').length, 2);
});

test('formatDuration', () => {
  assert.equal(formatDuration(45), '45秒');
  assert.equal(formatDuration(200), '3分20秒');
  assert.equal(formatDuration(180), '3分');
  assert.equal(formatDuration(3900), '1時間5分');
  assert.equal(formatDuration(0), '0秒');
});
