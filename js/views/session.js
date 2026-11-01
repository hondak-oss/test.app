// 一通りモードの画面：再生 → 休憩（カウントダウン）→ 次の動画 … → 完了
import { VIDEOS, getVideo } from '../videos.js';
import { startSession, afterVideo, afterRest, quit, nextVideoId, restRemaining } from '../session.js';
import { weekProgress, formatDuration, totals, recordsOn } from '../stats.js';
import { createBeeper } from '../beeper.js';
import { renderPlay } from './play.js';
import { renderBody } from '../body.js';
import { esc } from '../util.js';

export function renderSession(el, ctx) {
  let s = startSession(VIDEOS.map((v) => v.id));
  let screenCleanup = null;
  // iPhone では音を鳴らすのにユーザー操作が必要なので、「一通りスタート」のタップ中に作っておく
  const beeper = createBeeper();
  const total = s.videoIds.length;
  // 画面内のボタンがタップされるたびに音声を再開できるようにしておく
  el.addEventListener('click', beeper.unlock);

  function show() {
    if (screenCleanup) screenCleanup();
    screenCleanup = null;
    el.innerHTML = '';
    window.scrollTo(0, 0);
    if (s.phase === 'playing') screenCleanup = showPlaying();
    else if (s.phase === 'resting') screenCleanup = showResting();
    else showDone();
  }

  function showPlaying() {
    const video = getVideo(s.videoIds[s.index]);
    const screen = renderPlay(el, ctx, {
      video,
      autoplay: true,
      quitLabel: 'やめる',
      progressLabel: `${s.index + 1} / ${total}`,
      onQuit: () => { s = quit(s); show(); },
      onFinish: (seconds) => {
        const rec = ctx.store.addRecord({ date: ctx.today(), videoId: video.id, seconds });
        s = afterVideo(s, rec ? rec.seconds : 0);
        setTimeout(show, 0); // プレーヤーのイベント処理が終わってから画面を切り替える
        return true;
      },
    });
    return screen.cleanup;
  }

  function showResting() {
    let endAt = Date.now() + ctx.store.getData().settings.restSeconds * 1000;
    let remaining = restRemaining(endAt, Date.now());
    const next = getVideo(nextVideoId(s));
    el.innerHTML = `
      <div class="play-head">
        <button type="button" class="btn btn-ghost" data-quit>やめる</button>
        <span class="play-progress">${s.index + 1} / ${total} 完了</span>
      </div>
      <section class="rest">
        <div class="rest-label">休憩</div>
        <div class="rest-count" data-count aria-live="polite">${remaining}</div>
        <div class="rest-actions">
          <button type="button" class="btn" data-plus>+30秒</button>
          <button type="button" class="btn btn-primary" data-skip>スキップ ▶</button>
        </div>
      </section>
      <section class="card rest-next">
        <div class="muted">次はこれ（${s.index + 2} / ${total}）</div>
        <strong>${esc(next.title)}</strong>
        <div data-body></div>
      </section>
    `;
    renderBody(el.querySelector('[data-body]'), next);
    const countEl = el.querySelector('[data-count]');

    const goNext = () => { s = afterRest(s); show(); };
    // 画面ロック中は iPhone がタイマーを止めるので、終了時刻から残りを計算し直す
    const update = () => {
      const left = restRemaining(endAt, Date.now());
      if (left <= 0) { goNext(); return; }
      if (left !== remaining && left <= 3) beeper.beep();
      remaining = left;
      countEl.textContent = remaining;
    };
    const timer = setInterval(update, 250);
    const onVisible = () => { if (document.visibilityState === 'visible') update(); };
    document.addEventListener('visibilitychange', onVisible);

    el.querySelector('[data-plus]').addEventListener('click', () => {
      endAt += 30000;
      update();
    });
    el.querySelector('[data-skip]').addEventListener('click', goNext);
    el.querySelector('[data-quit]').addEventListener('click', () => { s = quit(s); show(); });
    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }

  function showDone() {
    const { records, settings } = ctx.store.getData();
    const today = ctx.today();
    const week = weekProgress(records, today, settings.weeklyGoal);
    const todaySeconds = totals(recordsOn(records, today)).seconds;
    el.innerHTML = `
      <section class="done">
        <div class="done-emoji" aria-hidden="true">💪</div>
        <h1>おつかれさまでした！</h1>
        <div class="card done-stats">
          <div><span class="muted">今日の合計時間</span><strong>${formatDuration(todaySeconds)}</strong></div>
          <div><span class="muted">今週の進み具合</span><strong>今週 ${week.done}/${week.goal}日</strong></div>
        </div>
        ${week.achieved ? '<p class="achieved done-achieved">🎉 今週の目標達成！</p>' : ''}
        <button type="button" class="btn btn-primary btn-big btn-block" data-back>トレーニングに戻る</button>
      </section>
    `;
    el.querySelector('[data-back]').addEventListener('click', () => ctx.navigate('train'));
  }

  show();
  return () => {
    if (screenCleanup) screenCleanup();
    el.removeEventListener('click', beeper.unlock);
    beeper.close();
  };
}
