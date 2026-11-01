// カレンダータブ：トレーニングした日に印、日付タップでその日の内容。
import { monthGrid } from '../calendar.js';
import { recordsOn, formatDuration, totals } from '../stats.js';
import { getVideo } from '../videos.js';
import { esc } from '../util.js';

const WEEKDAYS = ['月', '火', '水', '木', '金', '土', '日'];

export function renderCalendar(el, ctx) {
  const today = ctx.today();
  let [year, month] = today.split('-').map(Number);
  let selected = today;

  function draw() {
    const { records } = ctx.store.getData();
    const trained = new Set(records.map((r) => r.date));
    const weeks = monthGrid(year, month);
    const dayRecs = recordsOn(records, selected);
    const [, sm, sd] = selected.split('-').map(Number);

    el.innerHTML = `
      <h1>カレンダー</h1>
      <section class="card cal">
        <div class="cal-head">
          <button type="button" class="btn btn-ghost cal-nav" data-prev aria-label="前の月">‹</button>
          <strong data-month>${year}年${month}月</strong>
          <button type="button" class="btn btn-ghost cal-nav" data-next aria-label="次の月">›</button>
        </div>
        <div class="cal-grid" role="grid">
          ${WEEKDAYS.map((w, i) => `<div class="cal-wd${i === 5 ? ' sat' : ''}${i === 6 ? ' sun' : ''}">${w}</div>`).join('')}
          ${weeks.flat().map((key) => {
            if (!key) return '<div></div>';
            const cls = ['cal-day'];
            if (trained.has(key)) cls.push('is-trained');
            if (key === today) cls.push('is-today');
            if (key === selected) cls.push('is-selected');
            return `<button type="button" class="${cls.join(' ')}" data-day="${key}">${Number(key.slice(8))}</button>`;
          }).join('')}
        </div>
      </section>
      <section class="card cal-detail" data-detail>
        <h2>${sm}月${sd}日</h2>
        ${dayRecs.length === 0
          ? '<p class="muted">この日の記録はありません</p>'
          : `<ul class="day-list">
              ${dayRecs.map((r) => `<li><span>${esc(getVideo(r.videoId)?.title ?? r.videoId)}</span><span class="day-time">${formatDuration(r.seconds)}</span></li>`).join('')}
            </ul>
            <p class="day-total">合計 <strong>${formatDuration(totals(dayRecs).seconds)}</strong>（${dayRecs.length}本）</p>`}
      </section>
    `;

    el.querySelector('[data-prev]').addEventListener('click', () => {
      month -= 1;
      if (month === 0) { month = 12; year -= 1; }
      draw();
    });
    el.querySelector('[data-next]').addEventListener('click', () => {
      month += 1;
      if (month === 13) { month = 1; year += 1; }
      draw();
    });
    el.querySelectorAll('[data-day]').forEach((b) => b.addEventListener('click', () => {
      selected = b.dataset.day;
      draw();
    }));
  }

  draw();
}
