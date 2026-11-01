import { test } from 'node:test';
import assert from 'node:assert/strict';

// YouTube API の偽物
let lastPlayer = null;
globalThis.window = {
  YT: {
    PlayerState: { ENDED: 0, PLAYING: 1, PAUSED: 2 },
    Player: class {
      constructor(_el, opts) { this.opts = opts; this.state = -1; lastPlayer = this; }
      getPlayerState() { return this.state; }
      playVideo() { this.state = 1; }
      pauseVideo() { this.state = 2; }
      destroy() {}
    },
  },
};
const fakeEl = () => ({ innerHTML: '', querySelector: () => ({}) });

const { createPlayer } = await import('../js/player.js');
const tick = () => new Promise((r) => setTimeout(r, 0));

test('破棄後に届いた ENDED イベントでは onEnded を呼ばない', async () => {
  let ended = 0;
  const p = createPlayer(fakeEl(), 'abc', { onEnded: () => { ended += 1; } });
  await tick();
  p.destroy();
  lastPlayer.opts.events.onStateChange({ data: 0 });
  assert.equal(ended, 0);
});

test('破棄前の ENDED イベントでは onEnded を呼ぶ', async () => {
  let ended = 0;
  const p = createPlayer(fakeEl(), 'abc', { onEnded: () => { ended += 1; } });
  await tick();
  lastPlayer.opts.events.onStateChange({ data: 0 });
  assert.equal(ended, 1);
  p.destroy();
});
