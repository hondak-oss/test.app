// 画面全体のまとめ役：タブ切り替えと画面遷移。
import { createStore } from './storage.js';
import { toDateKey, formatDuration } from './stats.js';
import { getVideo } from './videos.js';
import { renderTrain } from './views/train.js';
import { renderPlay } from './views/play.js';

const view = document.getElementById('view');
const tabButtons = document.querySelectorAll('.tabbar button');

function safeLocalStorage() {
  try { return window.localStorage; } catch { return null; }
}

const store = createStore(safeLocalStorage());
document.getElementById('storage-warning').hidden = store.available;

let cleanup = null;

const ctx = {
  store,
  today: () => toDateKey(new Date()),
  navigate,
};

// 各画面：render(el, ctx, params) は後片付け関数を返してもよい
const VIEWS = {
  train: { tab: 'train', render: renderTrain },
  calendar: { tab: 'calendar', render: (el) => { el.innerHTML = '<h1>カレンダー</h1>'; } },
  stats: { tab: 'stats', render: (el) => { el.innerHTML = '<h1>記録</h1>'; } },
  play: { tab: 'train', render: renderSinglePlay },
};

export function navigate(name, params = {}) {
  if (typeof cleanup === 'function') cleanup();
  cleanup = null;
  const def = VIEWS[name] ?? VIEWS.train;
  tabButtons.forEach((b) => {
    if (b.dataset.tab === def.tab) b.setAttribute('aria-current', 'page');
    else b.removeAttribute('aria-current');
  });
  view.innerHTML = '';
  cleanup = def.render(view, ctx, params) ?? null;
  window.scrollTo(0, 0);
}

function renderSinglePlay(el, c, { videoId }) {
  const video = getVideo(videoId);
  if (!video) return renderTrain(el, c);
  const screen = renderPlay(el, c, {
    video,
    onQuit: () => navigate('train'),
    onFinish: (seconds) => {
      const rec = c.store.addRecord({ date: c.today(), videoId: video.id, seconds });
      if (!rec) {
        screen.showMessage('<p class="msg-warn">30秒以上で記録されます</p>');
        return false;
      }
      screen.showMessage(`
        <div class="card msg-ok">
          <p>✅ 記録しました（${formatDuration(rec.seconds)}）</p>
          <button type="button" class="btn btn-primary btn-block" data-back>トレーニングに戻る</button>
        </div>`);
      el.querySelector('[data-back]').addEventListener('click', () => navigate('train'));
      return true;
    },
  });
  return screen.cleanup;
}

tabButtons.forEach((b) => b.addEventListener('click', () => navigate(b.dataset.tab)));
navigate('train');
