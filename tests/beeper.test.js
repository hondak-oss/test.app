import { test } from 'node:test';
import assert from 'node:assert/strict';

let resumes = 0;
class FakeAC {
  constructor() { this.state = 'running'; this.currentTime = 0; this.destination = {}; }
  resume() { resumes += 1; this.state = 'running'; return Promise.resolve(); }
  createOscillator() { return { frequency: {}, connect: (g) => g, start() {}, stop() {} }; }
  createGain() { return { gain: {}, connect: (d) => d }; }
  close() {}
}
globalThis.window = { AudioContext: FakeAC };
const { createBeeper } = await import('../js/beeper.js');

test('iPhoneで止められた AudioContext は鳴らす前に再開する', () => {
  const b = createBeeper();
  b.ctx.state = 'interrupted';
  resumes = 0;
  b.beep();
  assert.equal(resumes, 1);
});

test('unlock() でも再開する（ボタンのタップ時に呼ぶ）', () => {
  const b = createBeeper();
  b.ctx.state = 'suspended';
  resumes = 0;
  b.unlock();
  assert.equal(resumes, 1);
});
