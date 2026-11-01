// 集計（画面に依存しない純粋な関数）。日付はすべて 'YYYY-MM-DD' の文字列。
import { getVideo } from './videos.js';

const pad = (n) => String(n).padStart(2, '0');

export function toDateKey(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function fromKey(key) {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(key, n) {
  const d = fromKey(key);
  d.setDate(d.getDate() + n);
  return toDateKey(d);
}

function daysBetween(fromKeyStr, toKeyStr) {
  // 現地時刻の正午同士で比べ、夏時間などのずれを避ける
  const a = fromKey(fromKeyStr); a.setHours(12);
  const b = fromKey(toKeyStr); b.setHours(12);
  return Math.round((b - a) / 86400000);
}

export function weekStart(key) {
  const dow = fromKey(key).getDay(); // 0=日
  return addDays(key, -((dow + 6) % 7));
}

const uniqueDays = (records) => new Set(records.map((r) => r.date));

export function weekProgress(records, todayKey, goal) {
  const start = weekStart(todayKey);
  const end = addDays(start, 6);
  const done = [...uniqueDays(records)].filter((d) => d >= start && d <= end).length;
  return { done, goal, achieved: done >= goal };
}

export function currentStreak(records, todayKey) {
  const days = uniqueDays(records);
  let day = days.has(todayKey) ? todayKey : addDays(todayKey, -1);
  let count = 0;
  while (days.has(day)) {
    count += 1;
    day = addDays(day, -1);
  }
  return count;
}

export function longestStreak(records) {
  const days = [...uniqueDays(records)].sort();
  let best = 0;
  let run = 0;
  let prev = null;
  for (const d of days) {
    run = prev && addDays(prev, 1) === d ? run + 1 : 1;
    best = Math.max(best, run);
    prev = d;
  }
  return best;
}

export function lastDoneLabel(records, videoId, todayKey) {
  const dates = records.filter((r) => r.videoId === videoId).map((r) => r.date).sort();
  if (dates.length === 0) return 'まだ';
  const diff = daysBetween(dates[dates.length - 1], todayKey);
  if (diff <= 0) return '今日';
  if (diff === 1) return '昨日';
  return `${diff}日前`;
}

export function totals(records) {
  return {
    days: uniqueDays(records).size,
    count: records.length,
    seconds: records.reduce((sum, r) => sum + r.seconds, 0),
  };
}

export function byVideo(records) {
  const out = {};
  for (const r of records) {
    const v = (out[r.videoId] ??= { count: 0, seconds: 0 });
    v.count += 1;
    v.seconds += r.seconds;
  }
  return out;
}

export function byMuscle(records) {
  const out = {};
  for (const r of records) {
    for (const m of getVideo(r.videoId)?.main ?? []) out[m] = (out[m] ?? 0) + 1;
  }
  return out;
}

export function recordsOn(records, key) {
  return records.filter((r) => r.date === key);
}

export function formatDuration(seconds) {
  const s = Math.round(seconds);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}時間${m > 0 ? `${m}分` : ''}`;
  if (m > 0) return `${m}分${sec > 0 ? `${sec}秒` : ''}`;
  return `${sec}秒`;
}
