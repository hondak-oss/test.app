import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createStore, STORAGE_KEY, MIN_SECONDS, DEFAULT_SETTINGS } from '../js/storage.js';

function fakeBackend(initial) {
  const m = new Map();
  if (initial !== undefined) m.set(STORAGE_KEY, initial);
  return {
    map: m,
    getItem: (k) => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => { m.set(k, String(v)); },
  };
}

const rec = (date, videoId = 'core5', seconds = 120) => ({ date, videoId, seconds });

test('定数がspecどおり', () => {
  assert.equal(STORAGE_KEY, 'kintore.v1');
  assert.equal(MIN_SECONDS, 30);
  assert.deepEqual(DEFAULT_SETTINGS, { weeklyGoal: 3, restSeconds: 60 });
});

test('空のbackendなら空の記録と初期設定', () => {
  const s = createStore(fakeBackend());
  assert.equal(s.available, true);
  assert.deepEqual(s.getData(), { records: [], settings: { weeklyGoal: 3, restSeconds: 60 } });
});

test('29秒は記録しない、30秒は記録する', () => {
  const s = createStore(fakeBackend());
  assert.equal(s.addRecord(rec('2026-11-01', 'core5', 29)), null);
  assert.equal(s.getData().records.length, 0);
  const r = s.addRecord(rec('2026-11-01', 'core5', 30));
  assert.equal(r.seconds, 30);
  assert.equal(r.videoId, 'core5');
  assert.equal(r.date, '2026-11-01');
  assert.equal(typeof r.id, 'string');
  assert.equal(s.getData().records.length, 1);
});

test('秒数は整数に丸める', () => {
  const s = createStore(fakeBackend());
  assert.equal(s.addRecord(rec('2026-11-01', 'core5', 61.6)).seconds, 62);
});

test('記録は保存され、新しいストアで読み直せる', () => {
  const b = fakeBackend();
  createStore(b).addRecord(rec('2026-11-01'));
  assert.equal(createStore(b).getData().records.length, 1);
});

test('壊れたJSONなら初期値で起動する', () => {
  const s = createStore(fakeBackend('{not json'));
  assert.deepEqual(s.getData(), { records: [], settings: DEFAULT_SETTINGS });
});

test('別アプリのデータなら初期値で起動する', () => {
  const s = createStore(fakeBackend('{"foo":1}'));
  assert.deepEqual(s.getData(), { records: [], settings: DEFAULT_SETTINGS });
});

test('settingsが欠けていても有効なrecordsは残す', () => {
  const data = { records: [{ id: 'r1', date: '2026-11-01', videoId: 'core5', seconds: 100 }] };
  const s = createStore(fakeBackend(JSON.stringify(data)));
  assert.equal(s.getData().records.length, 1);
  assert.deepEqual(s.getData().settings, DEFAULT_SETTINGS);
});

test('updateSettings は保存され読み直せる', () => {
  const b = fakeBackend();
  createStore(b).updateSettings({ restSeconds: 90 });
  assert.equal(createStore(b).getData().settings.restSeconds, 90);
});

test('範囲外・選択肢外の設定は無視する', () => {
  const s = createStore(fakeBackend());
  s.updateSettings({ weeklyGoal: 8 });
  s.updateSettings({ restSeconds: 45 });
  s.updateSettings({ weeklyGoal: 0 });
  assert.deepEqual(s.getData().settings, DEFAULT_SETTINGS);
  s.updateSettings({ weeklyGoal: 7, restSeconds: 30 });
  assert.deepEqual(s.getData().settings, { weeklyGoal: 7, restSeconds: 30 });
});

test('exportJSON → importJSON で元に戻る', () => {
  const a = createStore(fakeBackend());
  a.addRecord(rec('2026-10-30', 'abs7', 210));
  a.addRecord(rec('2026-11-01', 'core5', 300));
  a.updateSettings({ weeklyGoal: 4 });
  const text = a.exportJSON();
  const parsed = JSON.parse(text);
  assert.equal(parsed.app, 'kintore');
  assert.equal(parsed.version, 1);

  const b = createStore(fakeBackend());
  b.addRecord(rec('2026-01-01'));
  b.importJSON(text);
  assert.deepEqual(b.getData(), a.getData());
});

function assertRejected(text) {
  const s = createStore(fakeBackend());
  s.addRecord(rec('2026-11-01'));
  const before = JSON.stringify(s.getData());
  assert.throws(() => s.importJSON(text));
  assert.equal(JSON.stringify(s.getData()), before);
}

const valid = (records) => JSON.stringify({ app: 'kintore', version: 1, records, settings: DEFAULT_SETTINGS });

test('壊れたJSONの読み込みは拒否し、記録を変えない', () => assertRejected('{oops'));
test('別アプリ・別バージョンのファイルは拒否', () => {
  assertRejected(JSON.stringify({ app: 'other', version: 1, records: [] }));
  assertRejected(JSON.stringify({ app: 'kintore', version: 2, records: [] }));
});
test('存在しない動画IDを含むファイルは拒否', () =>
  assertRejected(valid([{ id: 'r', date: '2026-11-01', videoId: 'nope', seconds: 100 }])));
test('負の秒数を含むファイルは拒否', () =>
  assertRejected(valid([{ id: 'r', date: '2026-11-01', videoId: 'core5', seconds: -5 }])));
test('日付形式が違うファイルは拒否', () =>
  assertRejected(valid([{ id: 'r', date: '2026/11/01', videoId: 'core5', seconds: 100 }])));

test('setItemが例外を投げるとavailable=falseだがメモリ上には記録される', () => {
  const b = { getItem: () => null, setItem: () => { throw new Error('QuotaExceeded'); } };
  const s = createStore(b);
  assert.equal(s.available, false);
  assert.ok(s.addRecord(rec('2026-11-01')));
  assert.equal(s.getData().records.length, 1);
});

test('backendが無くても動く', () => {
  const s = createStore(null);
  assert.equal(s.available, false);
  assert.ok(s.addRecord(rec('2026-11-01')));
});
