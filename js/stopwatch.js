// YouTubeアプリで再生している間の時間を測るストップウォッチ。
// アプリを離れている間はタイマーが止まるので、開始時刻からの差で計算する。
export function createStopwatch(now = Date.now) {
  let startAt = null;
  return {
    get running() { return startAt !== null; },
    start() { if (startAt === null) startAt = now(); },
    getSeconds() { return startAt === null ? 0 : Math.floor((now() - startAt) / 1000); },
  };
}
