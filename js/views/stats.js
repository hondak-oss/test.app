// 記録タブ：まとめ・動画別・部位別・設定・バックアップ。
import { VIDEOS, MUSCLES } from '../videos.js';
import { REST_CHOICES } from '../storage.js';

const PLAY_MODE_LABELS = [['youtube', 'YouTubeアプリ'], ['app', 'アプリ内']];
import { totals, currentStreak, longestStreak, byVideo, byMuscle, formatDuration } from '../stats.js';
import { esc } from '../util.js';

export function renderStats(el, ctx) {
  const { records, settings } = ctx.store.getData();
  const today = ctx.today();
  const t = totals(records);
  const perVideo = byVideo(records);
  const perMuscle = byMuscle(records);
  const muscleRows = Object.entries(MUSCLES)
    .map(([id, m]) => ({ id, m, count: perMuscle[id] ?? 0 }))
    .sort((a, b) => b.count - a.count);
  const maxMuscle = Math.max(1, ...muscleRows.map((r) => r.count));

  el.innerHTML = `
    <h1>記録</h1>
    <section class="stat-grid">
      <div class="card stat"><span class="muted">トレーニング日数</span><strong>${t.days}日</strong></div>
      <div class="card stat"><span class="muted">動画の回数</span><strong>${t.count}回</strong></div>
      <div class="card stat"><span class="muted">合計時間</span><strong>${formatDuration(t.seconds)}</strong></div>
      <div class="card stat"><span class="muted">連続日数</span><strong>${currentStreak(records, today)}日</strong></div>
      <div class="card stat stat-wide"><span class="muted">最長の連続日数</span><strong>${longestStreak(records)}日</strong></div>
    </section>

    <h2>動画ごと</h2>
    <ul class="card row-list">
      ${VIDEOS.map((v) => {
        const s = perVideo[v.id] ?? { count: 0, seconds: 0 };
        return `<li><span class="row-title">${esc(v.title)}</span><span class="row-val">${s.count}回<small>${formatDuration(s.seconds)}</small></span></li>`;
      }).join('')}
    </ul>

    <h2>部位ごと</h2>
    <p class="muted">メインで鍛えた回数</p>
    <ul class="card bar-list">
      ${muscleRows.map(({ m, count }) => `
        <li>
          <span class="bar-label">${esc(m.nick)}<small>${esc(m.name)}</small></span>
          <span class="bar"><span style="width:${(count / maxMuscle) * 100}%"></span></span>
          <span class="bar-val">${count}回</span>
        </li>`).join('')}
    </ul>

    <h2>設定</h2>
    <section class="card settings">
      <label class="setting-row">
        <span>週の目標</span>
        <select data-goal>
          ${[1, 2, 3, 4, 5, 6, 7].map((n) => `<option value="${n}"${n === settings.weeklyGoal ? ' selected' : ''}>週${n}日</option>`).join('')}
        </select>
      </label>
      <div class="setting-row">
        <span>休憩時間</span>
        <div class="segmented" role="radiogroup" aria-label="休憩時間">
          ${REST_CHOICES.map((n) => `<button type="button" role="radio" aria-checked="${n === settings.restSeconds}" data-rest="${n}">${n}秒</button>`).join('')}
        </div>
      </div>
      <div class="setting-row setting-col">
        <span>再生方法</span>
        <div class="segmented" role="radiogroup" aria-label="再生方法">
          ${PLAY_MODE_LABELS.map(([v, label]) => `<button type="button" role="radio" aria-checked="${v === settings.playMode}" data-play-mode="${v}">${label}</button>`).join('')}
        </div>
        <p class="muted setting-help">「YouTubeアプリ」はYouTubeアプリで開いて再生します（プレミアムなら広告なし）。終わったら戻って「完了」を押します。</p>
      </div>
    </section>

    <h2>バックアップ</h2>
    <section class="card backup">
      <p class="muted">記録はこのiPhoneの中にだけ保存されています。機種変更やSafariのデータ削除に備えて、ときどき書き出しておくと安心です。</p>
      <div class="backup-actions">
        <button type="button" class="btn" data-export>書き出す</button>
        <button type="button" class="btn" data-import>読み込む</button>
        <input type="file" accept="application/json,.json" data-file hidden>
      </div>
      <p class="backup-msg" data-backup-msg role="status"></p>
    </section>
  `;

  const msg = el.querySelector('[data-backup-msg]');

  el.querySelector('[data-goal]').addEventListener('change', (e) => {
    ctx.store.updateSettings({ weeklyGoal: Number(e.target.value) });
  });
  el.querySelectorAll('[data-rest]').forEach((b) => b.addEventListener('click', () => {
    ctx.store.updateSettings({ restSeconds: Number(b.dataset.rest) });
    el.querySelectorAll('[data-rest]').forEach((x) => x.setAttribute('aria-checked', String(x === b)));
  }));

  el.querySelectorAll('[data-play-mode]').forEach((b) => b.addEventListener('click', () => {
    ctx.store.updateSettings({ playMode: b.dataset.playMode });
    el.querySelectorAll('[data-play-mode]').forEach((x) => x.setAttribute('aria-checked', String(x === b)));
  }));

  el.querySelector('[data-export]').addEventListener('click', async () => {
    const name = `kintore-backup-${today}.json`;
    const json = ctx.store.exportJSON();
    msg.classList.remove('is-error');
    // iPhone では共有シートから「"ファイル"に保存」を選んでもらうのが確実
    const file = typeof File === 'function' ? new File([json], name, { type: 'application/json' }) : null;
    if (file && navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: '筋トレ記録のバックアップ' });
        msg.textContent = 'バックアップを保存しました';
      } catch (e) {
        msg.textContent = e?.name === 'AbortError' ? '書き出しをキャンセルしました' : '書き出せませんでした。もう一度お試しください';
        if (e?.name !== 'AbortError') msg.classList.add('is-error');
      }
      return;
    }
    const url = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 60000); // 保存先を選ぶ時間を確保する
    msg.textContent = `「${name}」を保存してください（「ファイル」アプリなどに）`;
  });

  const fileInput = el.querySelector('[data-file]');
  el.querySelector('[data-import]').addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', async () => {
    const file = fileInput.files?.[0];
    fileInput.value = '';
    if (!file) return;
    if (!window.confirm('今の記録をすべて置き換えます。よろしいですか？')) return;
    try {
      ctx.store.importJSON(await file.text());
      renderStats(el, ctx);
      el.querySelector('[data-backup-msg]').textContent = '読み込みました';
    } catch {
      msg.textContent = 'ファイルを読み込めませんでした。今の記録はそのままです';
      msg.classList.add('is-error');
    }
  });
}
