// 記録と設定の保存。iPhone本体（localStorage）にだけ保存する。
import { getVideo } from './videos.js';

export const STORAGE_KEY = 'kintore.v1';
export const MIN_SECONDS = 30;
export const DEFAULT_SETTINGS = Object.freeze({ weeklyGoal: 3, restSeconds: 60, playMode: 'youtube' });
export const REST_CHOICES = [30, 60, 90];
// youtube = YouTubeアプリで開く（プレミアムなら広告なし）、app = このアプリの中で再生
export const PLAY_MODES = ['youtube', 'app'];

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function isValidRecord(r) {
  return r && typeof r === 'object'
    && typeof r.id === 'string'
    && typeof r.date === 'string' && DATE_RE.test(r.date)
    && typeof r.videoId === 'string' && getVideo(r.videoId) !== undefined
    && Number.isFinite(r.seconds) && r.seconds >= 0;
}

function cleanSettings(raw) {
  const s = { ...DEFAULT_SETTINGS };
  if (raw && typeof raw === 'object') {
    if (Number.isInteger(raw.weeklyGoal) && raw.weeklyGoal >= 1 && raw.weeklyGoal <= 7) s.weeklyGoal = raw.weeklyGoal;
    if (REST_CHOICES.includes(raw.restSeconds)) s.restSeconds = raw.restSeconds;
    if (PLAY_MODES.includes(raw.playMode)) s.playMode = raw.playMode;
  }
  return s;
}

function parseStored(text) {
  try {
    const d = JSON.parse(text);
    const records = Array.isArray(d?.records) ? d.records.filter(isValidRecord) : [];
    return { records, settings: cleanSettings(d?.settings) };
  } catch {
    return { records: [], settings: { ...DEFAULT_SETTINGS } };
  }
}

let idCounter = 0;
function newId() {
  idCounter += 1;
  return `r_${Date.now()}_${idCounter}`;
}

export function createStore(backend = globalThis.localStorage) {
  let available = false;
  let text = null;
  if (backend) {
    try {
      text = backend.getItem(STORAGE_KEY);
      backend.setItem(`${STORAGE_KEY}.probe`, '1');
      available = true;
    } catch {
      available = false;
    }
  }
  let data = text ? parseStored(text) : { records: [], settings: { ...DEFAULT_SETTINGS } };

  function persist() {
    if (!available) return;
    try {
      backend.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch {
      available = false;
    }
  }

  return {
    get available() { return available; },
    getData() { return data; },

    addRecord({ date, videoId, seconds }) {
      const secs = Math.round(seconds);
      if (!(secs >= MIN_SECONDS)) return null;
      const record = { id: newId(), date, videoId, seconds: secs };
      data = { ...data, records: [...data.records, record] };
      persist();
      return record;
    },

    updateSettings(partial) {
      data = { ...data, settings: cleanSettings({ ...data.settings, ...partial }) };
      persist();
      return data.settings;
    },

    exportJSON() {
      return JSON.stringify({
        app: 'kintore', version: 1, exportedAt: new Date().toISOString(),
        records: data.records, settings: data.settings,
      }, null, 2);
    },

    importJSON(input) {
      const d = JSON.parse(input); // 壊れていればここで例外
      if (d?.app !== 'kintore' || d?.version !== 1) throw new Error('このアプリのバックアップではありません');
      if (!Array.isArray(d.records) || !d.records.every(isValidRecord)) throw new Error('記録の形式が正しくありません');
      data = { records: d.records.map((r) => ({ ...r })), settings: cleanSettings(d.settings) };
      persist();
    },
  };
}
