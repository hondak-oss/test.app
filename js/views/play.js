// 再生画面（1本再生・一通りモード共通）。
// 再生方法の設定が「YouTubeアプリ」なら、アプリ内のプレーヤーは読み込まず（広告が出ないように）
// YouTubeアプリで開くボタンとストップウォッチで時間を測る。
import { createPlayer } from '../player.js';
import { createStopwatch } from '../stopwatch.js';
import { renderBody, renderMuscleCards } from '../body.js';
import { formatDuration } from '../stats.js';
import { esc } from '../util.js';

const youtubeUrl = (video) => `https://www.youtube.com/watch?v=${encodeURIComponent(video.youtubeId)}`;

// onFinish(seconds) が true を返したら終了扱い（以後ボタンを無効化）。false なら続けられる。
// 戻り値 { showMessage, cleanup }。
export function renderPlay(el, ctx, {
  video, onFinish, onQuit, quitLabel = '← 戻る', progressLabel = '', autoplay = false,
}) {
  const inApp = ctx.store.getData().settings.playMode === 'app';
  const url = youtubeUrl(video);

  el.innerHTML = `
    <div class="play-head">
      <button type="button" class="btn btn-ghost" data-quit>${esc(quitLabel)}</button>
      ${progressLabel ? `<span class="play-progress">${esc(progressLabel)}</span>` : ''}
    </div>
    <h1 class="play-title">${esc(video.title)}</h1>
    <div class="player-wrap" data-player-wrap>
      ${inApp ? `
        <div data-player></div>
        <button type="button" class="btn btn-primary btn-big tap-to-play" data-tap-play hidden>▶ 再生</button>
      ` : `
        <a class="yt-poster" href="${url}" target="_blank" rel="noopener" data-open-yt>
          <img src="https://i.ytimg.com/vi/${encodeURIComponent(video.youtubeId)}/mqdefault.jpg" alt="">
          <span class="btn btn-primary btn-big">▶ YouTubeアプリで開く</span>
        </a>
      `}
    </div>
    ${inApp ? `<a class="btn btn-ghost btn-block open-yt-link" href="${url}" target="_blank" rel="noopener" data-open-yt>YouTubeアプリで開く（プレミアムなら広告なし）</a>` : ''}
    <p class="muted yt-note" data-yt-note hidden>YouTubeアプリで再生中です。見終わったらこの画面に戻って「完了」を押してください。</p>
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
  const stopwatch = createStopwatch();
  let embeddedSeconds = 0; // YouTubeアプリに切り替える前にアプリ内で再生していた秒数
  let player = null;
  let finished = false;
  let autoplayCheck = null;

  const totalSeconds = () => embeddedSeconds + (player ? player.getPlayedSeconds() : 0) + stopwatch.getSeconds();
  const updateTime = () => { timeEl.textContent = formatDuration(totalSeconds()); };

  const finish = () => {
    if (finished) return;
    if (onFinish(totalSeconds()) === true) {
      finished = true;
      doneBtn.disabled = true;
      player?.pause();
      clearInterval(clock);
    }
  };

  if (inApp) {
    player = createPlayer($('[data-player]'), video.youtubeId, {
      autoplay,
      onTick: () => { updateTime(); tapPlay.hidden = true; },
      onEnded: finish,
      onError: () => { tapPlay.hidden = true; },
    });
    // 自動再生が iPhone に止められたときは、大きな再生ボタンを出す
    if (autoplay) {
      autoplayCheck = setTimeout(() => { if (!player?.isPlaying() && !finished) tapPlay.hidden = false; }, 3000);
    }
    tapPlay.addEventListener('click', () => { tapPlay.hidden = true; player?.play(); });
  }

  // YouTubeアプリで開いたら、アプリ内プレーヤーを止めてストップウォッチに切り替える
  el.querySelectorAll('[data-open-yt]').forEach((a) => a.addEventListener('click', () => {
    if (finished) return;
    if (player) {
      embeddedSeconds += player.getPlayedSeconds();
      player.destroy();
      player = null;
      clearTimeout(autoplayCheck);
      $('[data-player-wrap]').innerHTML = `<a class="yt-poster" href="${url}" target="_blank" rel="noopener"><img src="https://i.ytimg.com/vi/${encodeURIComponent(video.youtubeId)}/mqdefault.jpg" alt=""><span class="btn btn-big">YouTubeアプリで再生中</span></a>`;
      $('.open-yt-link')?.remove();
    }
    stopwatch.start();
    $('[data-yt-note]').hidden = false;
    updateTime();
  }));

  // YouTubeアプリから戻ったときにすぐ時間を更新する
  const clock = setInterval(() => { if (stopwatch.running) updateTime(); }, 1000);
  const onVisible = () => { if (document.visibilityState === 'visible' && stopwatch.running) updateTime(); };
  document.addEventListener('visibilitychange', onVisible);

  doneBtn.addEventListener('click', finish);
  $('[data-quit]').addEventListener('click', () => onQuit());

  renderBody($('[data-body]'), video);
  renderMuscleCards($('[data-cards]'), video);

  return {
    showMessage(html) { msgEl.innerHTML = html; },
    cleanup() {
      clearTimeout(autoplayCheck);
      clearInterval(clock);
      document.removeEventListener('visibilitychange', onVisible);
      player?.destroy();
    },
  };
}
