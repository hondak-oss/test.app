// 一通りモードの画面：再生 → 休憩（カウントダウン）→ 次の動画 … → 完了
import { VIDEOS, getVideo } from '../videos.js';
import { startSession, afterVideo, afterRest, quit, nextVideoId } from '../session.js';
import { weekProgress, formatDuration } from '../stats.js';
import { renderPlay } from './play.js';
import { renderBody } from '../body.js';
import { esc } from '../util.js';

function createBeeper() {
  // iPhone では音を鳴らすのにユーザー操作が必要なので、「一通りスタート」のタップ中に作っておく
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return { beep() {}, close() {} };
  const ac = new AC();
  ac.resume?.();
  return {
    beep() {
      const osc = ac.createOscillator();
      const gain = ac.createGain();
      osc.frequency.value = 880;
      gain.gain.value = 0.2;
      osc.connect(gain).connect(ac.destination);
      osc.start();
      osc.stop(ac.currentTime + 0.12);
    },
    close() { ac.close?.(); },
  };
}

export function renderSession(el, ctx) {
  let s = startSession(VIDEOS.map((v) => v.id));
  let screenCleanup = null;
  const beeper = createBeeper();
  const total = s.videoIds.length;

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
    let remaining = ctx.store.getData().settings.restSeconds;
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
    const timer = setInterval(() => {
      remaining -= 1;
      if (remaining <= 0) { goNext(); return; }
      countEl.textContent = remaining;
      if (remaining <= 3) beeper.beep();
    }, 1000);

    el.querySelector('[data-plus]').addEventListener('click', () => {
      remaining += 30;
      countEl.textContent = remaining;
    });
    el.querySelector('[data-skip]').addEventListener('click', goNext);
    el.querySelector('[data-quit]').addEventListener('click', () => { s = quit(s); show(); });
    return () => clearInterval(timer);
  }

  function showDone() {
    const { records, settings } = ctx.store.getData();
    const week = weekProgress(records, ctx.today(), settings.weeklyGoal);
    el.innerHTML = `
      <section class="done">
        <div class="done-emoji" aria-hidden="true">💪</div>
        <h1>おつかれさまでした！</h1>
        <div class="card done-stats">
          <div><span class="muted">今日の合計時間</span><strong>${formatDuration(s.recordedSeconds)}</strong></div>
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
    beeper.close();
  };
}
