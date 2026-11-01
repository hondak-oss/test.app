// 休憩の残り3秒で鳴らす短いビープ音。
// iPhone では音を鳴らすのにユーザー操作が必要で、画面ロックや動画再生のあと止められることもあるので、
// 鳴らす前とボタンのタップ時に再開（resume）する。
export function createBeeper() {
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return { ctx: null, beep() {}, unlock() {}, close() {} };
  const ctx = new AC();
  const unlock = () => {
    if (ctx.state !== 'running') ctx.resume?.()?.catch?.(() => {});
  };
  unlock();
  return {
    ctx,
    unlock,
    beep() {
      unlock();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.value = 880;
      gain.gain.value = 0.2;
      osc.connect(gain).connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.12);
    },
    close() { ctx.close?.(); },
  };
}
