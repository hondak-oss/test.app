// トレーニングタブ：今週の進み具合、一通りスタート、動画カード。
import { VIDEOS, MUSCLES } from '../videos.js';
import { weekProgress, currentStreak, lastDoneLabel } from '../stats.js';
import { esc } from '../util.js';

export function renderTrain(el, ctx) {
  const { records, settings } = ctx.store.getData();
  const today = ctx.today();
  const week = weekProgress(records, today, settings.weeklyGoal);
  const streak = currentStreak(records, today);
  const pct = Math.min(100, Math.round((week.done / week.goal) * 100));

  el.innerHTML = `
    <h1>トレーニング</h1>
    <section class="card summary">
      <div class="summary-row">
        <div>
          <div class="muted">今週の目標</div>
          <div class="summary-num" data-week>今週 ${week.done}/${week.goal}日</div>
        </div>
        <div class="summary-streak">
          <div class="muted">連続</div>
          <div class="summary-num">${streak}日</div>
        </div>
      </div>
      <div class="progress" aria-hidden="true"><div style="width:${pct}%"></div></div>
      ${week.achieved ? '<p class="achieved">🎉 今週の目標達成！</p>' : ''}
    </section>
    <button type="button" class="btn btn-primary btn-big btn-block start-all" data-start>▶ 一通りスタート（全${VIDEOS.length}本）</button>
    <h2>動画</h2>
    <ul class="video-list">
      ${VIDEOS.map((v) => `
        <li>
          <button type="button" class="video-card" data-video="${v.id}">
            <img src="https://i.ytimg.com/vi/${v.youtubeId}/mqdefault.jpg" alt="" loading="lazy" width="120" height="68">
            <span class="video-info">
              <span class="video-title">${esc(v.title)}</span>
              <span class="video-meta">${esc(v.durationLabel)}・${v.main.map((m) => esc(MUSCLES[m].nick)).join('・')}</span>
              <span class="video-last">前回：${lastDoneLabel(records, v.id, today)}</span>
            </span>
          </button>
        </li>`).join('')}
    </ul>
  `;

  el.querySelector('[data-start]').addEventListener('click', () => ctx.navigate('session'));
  el.querySelectorAll('[data-video]').forEach((b) =>
    b.addEventListener('click', () => ctx.navigate('play', { videoId: b.dataset.video })));
}
