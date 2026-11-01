// 再生画面（1本再生・一通りモード共通）。
import { createPlayer } from '../player.js';
import { renderBody, renderMuscleCards } from '../body.js';
import { formatDuration } from '../stats.js';
import { esc } from '../util.js';

// onFinish(seconds) が true を返したら終了扱い（以後ボタンを無効化）。false なら再生を続けられる。
// 戻り値はこの画面の後片付け関数。
export function renderPlay(el, ctx, {
  video, onFinish, onQuit, quitLabel = '← 戻る', progressLabel = '', autoplay = false,
}) {
  el.innerHTML = `
    <div class="play-head">
      <button type="button" class="btn btn-ghost" data-quit>${esc(quitLabel)}</button>
      ${progressLabel ? `<span class="play-progress">${esc(progressLabel)}</span>` : ''}
    </div>
    <h1 class="play-title">${esc(video.title)}</h1>
    <div class="player-wrap">
      <div data-player></div>
      <button type="button" class="btn btn-primary btn-big tap-to-play" data-tap-play hidden>▶ 再生</button>
    </div>
    <div class="card play-bar">
      <div>
        <div class="muted">トレーニング時間</div>
        <strong class="play-time" data-time>0秒</strong>
      </div>
      <button type="button" class="btn btn-primary" data-done>完了</button>
    </div>
    <div class="play-msg" data-msg role="status"></div>
    <h2>効いている部位</h2>
    <div data-body></div>
    <div data-cards></div>
  `;

  const $ = (sel) => el.querySelector(sel);
  const timeEl = $('[data-time]');
  const msgEl = $('[data-msg]');
  const doneBtn = $('[data-done]');
  const tapPlay = $('[data-tap-play]');
  let finished = false;

  const finish = () => {
    if (finished) return;
    const seconds = player.getPlayedSeconds();
    if (onFinish(seconds) === true) {
      finished = true;
      doneBtn.disabled = true;
      player.pause();
    }
  };

  const player = createPlayer($('[data-player]'), video.youtubeId, {
    autoplay,
    onTick: (s) => {
      timeEl.textContent = formatDuration(s);
      tapPlay.hidden = true;
    },
    onEnded: finish,
    onError: () => { tapPlay.hidden = true; },
  });

  // 自動再生が iPhone に止められたときは、大きな再生ボタンを出す
  let autoplayCheck = null;
  if (autoplay) {
    autoplayCheck = setTimeout(() => { if (!player.isPlaying() && !finished) tapPlay.hidden = false; }, 3000);
  }
  tapPlay.addEventListener('click', () => { tapPlay.hidden = true; player.play(); });

  doneBtn.addEventListener('click', finish);
  $('[data-quit]').addEventListener('click', () => onQuit());

  renderBody($('[data-body]'), video);
  renderMuscleCards($('[data-cards]'), video);

  return {
    showMessage(html) { msgEl.innerHTML = html; },
    cleanup() {
      clearTimeout(autoplayCheck);
      player.destroy();
    },
  };
}
