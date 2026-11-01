// YouTube 再生と、実際に再生していた時間の計測。
export const LOAD_ERROR = '動画を読み込めませんでした。電波の良い場所で再度お試しください';

let apiPromise = null;

export function loadYouTubeAPI() {
  if (window.YT?.Player) return Promise.resolve();
  if (apiPromise) return apiPromise;
  apiPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    const fail = (err) => {
      clearTimeout(timer);
      apiPromise = null; // 次回また読み込みを試せるようにする
      script.remove();
      reject(err);
    };
    const timer = setTimeout(() => fail(new Error('timeout')), 10000);
    const prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      clearTimeout(timer);
      if (typeof prev === 'function') prev();
      resolve();
    };
    script.src = 'https://www.youtube.com/iframe_api';
    script.onerror = () => fail(new Error('load error'));
    document.head.appendChild(script);
  });
  return apiPromise;
}

export function createPlayer(el, youtubeId, { autoplay = false, onEnded, onError, onTick } = {}) {
  let seconds = 0;
  let player = null;
  let timer = null;
  let destroyed = false;

  el.innerHTML = '<div class="player-frame"><div></div></div>';

  const showError = () => {
    if (destroyed) return;
    clearInterval(timer);
    el.innerHTML = `<p class="player-error">${LOAD_ERROR}</p>`;
    onError?.();
  };

  const isPlaying = () => !!player?.getPlayerState && player.getPlayerState() === window.YT.PlayerState.PLAYING;

  const tick = () => {
    if (destroyed) return;
    if (isPlaying()) {
      seconds += 1;
      onTick?.(seconds);
    }
  };

  loadYouTubeAPI().then(() => {
    if (destroyed) return;
    player = new window.YT.Player(el.querySelector('.player-frame > div'), {
      videoId: youtubeId,
      playerVars: { playsinline: 1, rel: 0, autoplay: autoplay ? 1 : 0 },
      events: {
        onReady: () => { if (!destroyed && autoplay) player.playVideo(); },
        onStateChange: (e) => {
          // 破棄後に届いたイベントは無視する（やめた動画を記録しないため）
          if (destroyed) return;
          if (e.data === window.YT.PlayerState.ENDED) onEnded?.();
        },
        onError: showError,
      },
    });
    timer = setInterval(tick, 1000);
  }).catch(showError);

  return {
    getPlayedSeconds: () => seconds,
    isPlaying,
    play: () => player?.playVideo?.(),
    pause: () => player?.pauseVideo?.(),
    destroy() {
      destroyed = true;
      clearInterval(timer);
      try { player?.destroy?.(); } catch { /* 破棄時のエラーは無視 */ }
    },
  };
}
