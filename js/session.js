// 一通りモードの進行（純粋な状態遷移）：動画 → 休憩 → 次の動画 … → 完了
export function startSession(videoIds) {
  return { phase: 'playing', index: 0, videoIds: [...videoIds], recordedSeconds: 0 };
}

export function afterVideo(session, recordedSeconds) {
  const isLast = session.index >= session.videoIds.length - 1;
  return {
    ...session,
    phase: isLast ? 'done' : 'resting',
    recordedSeconds: session.recordedSeconds + recordedSeconds,
  };
}

export function afterRest(session) {
  return { ...session, phase: 'playing', index: session.index + 1 };
}

export function quit(session) {
  return { ...session, phase: 'done' };
}

export function nextVideoId(session) {
  if (session.phase === 'done') return null;
  return session.videoIds[session.index + 1] ?? null;
}

// 休憩の残り秒数。iPhone は画面ロック中にタイマーを止めるので、終了時刻から毎回計算する。
export function restRemaining(endAtMs, nowMs) {
  return Math.max(0, Math.ceil((endAtMs - nowMs) / 1000));
}
