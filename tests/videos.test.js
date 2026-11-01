import { test } from 'node:test';
import assert from 'node:assert/strict';
import { VIDEOS, MUSCLES, getVideo } from '../js/videos.js';

test('6本の動画が再生リストの順で並んでいる', () => {
  assert.deepEqual(VIDEOS.map((v) => v.id),
    ['core5', 'lowerabs3', 'triceps4', 'triceps3', 'biceps-towel', 'abs7']);
});

test('すべての部位IDが MUSCLES に存在し、メイン部位が1つ以上ある', () => {
  for (const v of VIDEOS) {
    assert.ok(v.main.length >= 1, `${v.id} has no main muscle`);
    for (const m of [...v.main, ...v.sub]) assert.ok(MUSCLES[m], `${v.id}: unknown muscle ${m}`);
  }
});

test('getVideo で YouTube ID を引ける', () => {
  assert.equal(getVideo('abs7').youtubeId, 'u-wS8jABqQI');
  assert.equal(getVideo('nope'), undefined);
});
