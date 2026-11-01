# 筋トレ管理アプリ Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** iPhone の Safari で使う、YouTube 筋トレ動画の再生・記録・部位アニメーションつきの Web アプリを作る。

**Architecture:** ビルドなしの静的サイト（HTML/CSS/ES Modules）。計算・保存・状態遷移は DOM に依存しない純粋なモジュールに分けて `node --test` でテストし、画面側モジュールはそれらを呼ぶだけにする。GitHub Pages でブランチから配信する。

**Tech Stack:** HTML, CSS, JavaScript (ES Modules), YouTube IFrame Player API, Web Audio API, Node.js 標準テストランナー, Playwright（画面確認のみ、プリインストール版を使う）

**Spec:** `docs/superpowers/specs/2026-11-01-workout-app-design.md`

## Global Constraints

- 外部ライブラリ・ビルドツールを入れない。`package.json` は `"type": "module"` と `"test": "node --test tests/"` のみ
- 画面の文言はすべて日本語
- localStorage キーは `kintore.v1`、初期設定 `{ weeklyGoal: 3, restSeconds: 60 }`
- 記録の最小秒数は 30 秒（30 未満は記録しない、ちょうど 30 は記録する）
- 週は月曜はじまり。日付は端末の現地時刻で `YYYY-MM-DD`
- 休憩時間の選択肢は 30・60・90 秒、週の目標は 1〜7 日
- YouTube 埋め込みは `playsinline: 1`
- ボタンの高さ 44px 以上、iPhone 幅 375〜430px 基準、safe-area 余白を確保
- `prefers-reduced-motion: reduce` のときは明滅アニメーションを止める
- 相対パスのみ使う（GitHub Pages のサブパス `/test.app/` で動くように）

## Review Focus

- 日付またぎ・月またぎ・年またぎ（12/31→1/1、週が年をまたぐ）で週の進み具合と連続日数が正しい → Task 3 にテストを追加
- 同じ日に複数記録があっても連続日数・日数が重複しない → Task 3 にテストを追加
- 保存データが壊れた JSON・別アプリのデータ・settings 欠落のときに初期値で起動する → Task 2 にテストを追加
- バックアップ読み込みで、存在しない videoId や負の秒数を含むファイルを拒否し、今の記録を変えない → Task 2 にテストを追加
- 一通りモードの最後の動画のあとは休憩に入らず完了になる、途中で 30 秒未満の動画があっても次へ進む → Task 6 にテストを追加

---

### Task 1: 土台と動画・部位データ

**Files:**
- Create: `package.json`, `index.html`, `css/style.css`, `manifest.json`, `icons/icon-192.png`, `icons/icon-512.png`, `icons/apple-touch-icon.png`, `js/videos.js`, `js/app.js`
- Test: `tests/videos.test.js`

**Interfaces:**
- Produces:
  - `MUSCLES: Record<string, { name: string, nick: string, side: 'front'|'back'|'both', desc: string }>`（spec 4.2 の 10 部位、id も spec どおり）
  - `VIDEOS: Array<{ id, youtubeId, title, channel, durationLabel, main: string[], sub: string[] }>`（spec 4.1 の 6 本、表の順。channel は core5〜biceps-towel が `CALISLIFE自重トレ`、abs7 が `ザ・きんにくTV`）
  - `getVideo(id: string): Video | undefined`
  - `index.html`：`<main id="view">` と下部タブ `<nav>`（`data-tab="train" | "calendar" | "stats"`）、`<div id="storage-warning" hidden>`、`<script type="module" src="js/app.js">`、`apple-mobile-web-app-capable`、`viewport-fit=cover`
  - `app.js`：`showTab(name)` でタブを切り替える（この時点では各タブに見出しだけ表示）

- [ ] **Step 1: テストを書く** — `tests/videos.test.js`
  - `VIDEOS` が 6 件で、id 順が `core5, lowerabs3, triceps4, triceps3, biceps-towel, abs7`
  - すべての `main`/`sub` の id が `MUSCLES` に存在する、`main` は 1 つ以上
  - `getVideo('abs7').youtubeId === 'u-wS8jABqQI'`
- [ ] **Step 2: `npm test` で失敗を確認**（モジュールが無いエラー）
- [ ] **Step 3: `js/videos.js`、`package.json` を作る**。説明文は spec 4.2 の例文をそのまま使う
- [ ] **Step 4: `npm test` で成功を確認**
- [ ] **Step 5: `index.html`、`css/style.css`（ダーク背景 `#111`、アクセント `#ff8a00`、CSS 変数で定義）、`manifest.json`（name「筋トレ記録」、display `standalone`）、アイコン（Python で単色背景＋ダンベル風の図形の PNG を生成）、`js/app.js` を作る**
- [ ] **Step 6: `python3 -m http.server 8000` で配信し、Playwright（iPhone 13 サイズ）でタブ 3 つが切り替わることをスクリーンショットで確認**
- [ ] **Step 7: Commit** `feat: scaffold app shell and video/muscle data`

### Task 2: 保存とバックアップ（storage.js）

**Files:**
- Create: `js/storage.js`
- Test: `tests/storage.test.js`

**Interfaces:**
- Consumes: `getVideo` (Task 1)
- Produces:
  - `STORAGE_KEY = 'kintore.v1'`, `MIN_SECONDS = 30`, `DEFAULT_SETTINGS = { weeklyGoal: 3, restSeconds: 60 }`
  - `createStore(backend = globalThis.localStorage)` → `{ available: boolean, getData(): { records, settings }, addRecord({ date, videoId, seconds }): Record | null, updateSettings(partial): settings, exportJSON(): string, importJSON(text: string): void }`
  - `Record = { id: string, date: 'YYYY-MM-DD', videoId: string, seconds: number }`
  - `importJSON` は不正な内容なら `Error` を投げ、データを変更しない
  - `backend` が無い・`setItem` が例外を投げるとき `available === false`、データはメモリ上で保持

- [ ] **Step 1: テストを書く**（`backend` は `Map` を包んだ偽物）
  - `addRecord` 秒数 29 → `null` で件数変化なし、30 → 記録される、秒数は整数に丸める
  - 空の backend → `getData()` が `{ records: [], settings: DEFAULT_SETTINGS }`
  - 壊れた JSON、`{"foo":1}`、settings 欠落のデータ → 初期値（records は有効なら残す）
  - `updateSettings({ restSeconds: 90 })` が保存され、新しいストアで読み直しても 90
  - `updateSettings({ weeklyGoal: 8 })`、`{ restSeconds: 45 }` は無視（範囲外・選択肢外）
  - `exportJSON()` → 別ストアで `importJSON()` すると records/settings が一致
  - `importJSON` に壊れた JSON、存在しない videoId、負の seconds、日付形式違い → 例外、元の records は変化なし
  - `setItem` が例外を投げる backend → `available === false`、`addRecord` はメモリには追加される
- [ ] **Step 2: `npm test` で失敗を確認**
- [ ] **Step 3: `js/storage.js` を実装**。エクスポート形式は `{ app: 'kintore', version: 1, exportedAt: ISO文字列, records, settings }`、インポートは `app === 'kintore'` かつ `version === 1` を必須とする
- [ ] **Step 4: `npm test` で成功を確認**
- [ ] **Step 5: Commit** `feat: add local storage with backup import/export`

### Task 3: 集計（stats.js）

**Files:**
- Create: `js/stats.js`
- Test: `tests/stats.test.js`

**Interfaces:**
- Consumes: `VIDEOS`, `getVideo` (Task 1)、`Record` 型 (Task 2)
- Produces（すべて純粋関数、日付は `'YYYY-MM-DD'` 文字列）:
  - `toDateKey(date: Date): string`、`addDays(key, n): string`
  - `weekStart(key): string`（その週の月曜）
  - `weekProgress(records, todayKey, goal): { done: number, goal: number, achieved: boolean }`（今週の記録のある日数）
  - `currentStreak(records, todayKey): number`、`longestStreak(records): number`
  - `lastDoneLabel(records, videoId, todayKey): '今日' | '昨日' | 'N日前' | 'まだ'`
  - `totals(records): { days, count, seconds }`
  - `byVideo(records): Record<videoId, { count, seconds }>`
  - `byMuscle(records): Record<muscleId, number>`（メイン部位のみ数える）
  - `recordsOn(records, key): Record[]`
  - `formatDuration(seconds): string`（`'45秒'`、`'3分20秒'`、`'1時間5分'`）

- [ ] **Step 1: テストを書く**
  - `weekStart('2026-11-01')`（日曜）→ `'2026-10-26'`、`weekStart('2026-11-02')`（月曜）→ `'2026-11-02'`、`weekStart('2027-01-01')` → `'2026-12-28'`
  - 同じ日に 6 件の記録 → `weekProgress(...).done === 1`、`totals().days === 1`、`count === 6`
  - 月〜水に記録、goal 3 → `{ done: 3, goal: 3, achieved: true }`、前週の記録は数えない
  - 連続日数：今日あり＋昨日あり → 2、今日なし昨日あり → 1、今日なし昨日なし（一昨日あり）→ 0、12/31 と 1/1 → 2
  - `longestStreak`：3 日連続のあと 1 日空いて 2 日 → 3、記録なし → 0
  - `lastDoneLabel`：今日 → `'今日'`、昨日 → `'昨日'`、5 日前 → `'5日前'`、記録なし → `'まだ'`
  - `byMuscle`：core5 を 1 回、abs7 を 1 回 → `rectus: 2, obliques: 1`、sub の部位は 0
  - `formatDuration(45)` `'45秒'`、`(200)` `'3分20秒'`、`(3900)` `'1時間5分'`
- [ ] **Step 2: `npm test` で失敗を確認**
- [ ] **Step 3: `js/stats.js` を実装**。日付計算は `new Date(y, m-1, d)` の現地時刻で行い、UTC 変換を使わない
- [ ] **Step 4: `npm test` で成功を確認**
- [ ] **Step 5: Commit** `feat: add stats calculations`

### Task 4: 人体図と部位の説明（body.js）

**Files:**
- Create: `js/body.js`
- Modify: `css/style.css`

**Interfaces:**
- Consumes: `MUSCLES` (Task 1)
- Produces:
  - `renderBody(el: HTMLElement, { main: string[], sub: string[] }): void` — 前・後ろの SVG を横並びで描画。各部位は `data-muscle="<id>"` を持つ `<path>`/`<ellipse>`、`class` は `is-main` / `is-sub` / なし
  - `renderMuscleCards(el, video): void` — メイン→サブの順に「正式名（呼び名）」「説明文」のカード。メインには「メイン」、サブには「サブ」のラベル
- CSS：`.is-main` はアクセント色で不透明度 0.6↔1.0 を 2 秒周期で明滅、`.is-sub` は 0.25↔0.45、それ以外は `#3a3a3a`。`@media (prefers-reduced-motion: reduce)` で `animation: none`

- [ ] **Step 1: `js/body.js` を実装**。シルエットは頭・胴・腕・脚の単純な図形。部位の位置：前面＝大胸筋・三角筋・上腕二頭筋・前腕・腹直筋（上〜中）・腹直筋下部・腹斜筋（左右）、背面＝三角筋・上腕三頭筋・脊柱起立筋・大臀筋。左右ある部位は同じ `data-muscle` を 2 つ描く
- [ ] **Step 2: 一時的に `app.js` のトレーニングタブで `renderBody` と `renderMuscleCards` を `getVideo('core5')` で表示し、Playwright でスクリーンショットを撮って部位の位置と色を目視確認**（メイン＝腹直筋・腹斜筋が濃い、サブ＝背中・お尻が薄い）。`triceps4` でも撮る
- [ ] **Step 3: 一時表示を戻す**
- [ ] **Step 4: Commit** `feat: add body diagram and muscle descriptions`

### Task 5: 動画再生と 1 本再生の画面（player.js）

**Files:**
- Create: `js/player.js`, `js/views/train.js`, `js/views/play.js`
- Modify: `js/app.js`, `css/style.css`

**Interfaces:**
- Consumes: `VIDEOS`, `getVideo` (Task 1)、`createStore` (Task 2)、`weekProgress`, `currentStreak`, `lastDoneLabel`, `toDateKey`, `formatDuration` (Task 3)、`renderBody`, `renderMuscleCards` (Task 4)
- Produces:
  - `loadYouTubeAPI(): Promise<void>`（`https://www.youtube.com/iframe_api` を 1 度だけ読み込む。10 秒で reject）
  - `createPlayer(el, youtubeId, { autoplay: boolean, onEnded(), onError(), onTick(seconds) })` → `{ getPlayedSeconds(): number, destroy(): void }`。1 秒ごとに `getPlayerState() === PLAYING` のときだけ加算し `onTick` を呼ぶ
  - `renderTrain(el, ctx)`：今週の進み具合「今週 N/M日」、連続日数、「一通りスタート」ボタン、動画カード（サムネイル `https://i.ytimg.com/vi/<id>/hqdefault.jpg`、タイトル、目安時間、メイン部位の呼び名、`前回：<lastDoneLabel>`）
  - `renderPlay(el, ctx, { video, onFinish(seconds), onQuit() })`：プレーヤー、再生時間表示、「完了」ボタン、人体図、部位カード。`onFinish` は動画終了時と完了ボタンで 1 度だけ呼ぶ
  - `ctx = { store, today: () => string, navigate(viewName, params) }`（`app.js` が作る）

- [ ] **Step 1: `js/player.js` を実装**。読み込み失敗・`onError` 時は spec 7 の文言「動画を読み込めませんでした。電波の良い場所で再度お試しください」を `el` に表示
- [ ] **Step 2: `train.js`・`play.js` を実装し `app.js` につなぐ**。1 本再生では `onFinish(seconds)` で `store.addRecord`、`null` なら「30秒以上で記録されます」、記録できたら「記録しました（3分20秒）」を表示してトレーニングタブへ戻るボタンを出す。`store.available === false` なら `#storage-warning` に「記録が保存できません」を表示
- [ ] **Step 3: Playwright（iPhone 13）でカードをタップ→再生画面に人体図と部位カードが出ることを確認。すぐ「完了」を押すと「30秒以上で記録されます」が出ることを確認。次に `page.evaluate` で localStorage に今日の記録を 1 件書き込んでリロードし、トレーニングタブで「前回：今日」と「今週 1/3日」を確認**
- [ ] **Step 4: `npm test` が引き続き成功することを確認**
- [ ] **Step 5: Commit** `feat: add video playback and single-play screen`

### Task 6: 一通りモードと休憩（session.js）

**Files:**
- Create: `js/session.js`, `js/views/session.js`
- Modify: `js/app.js`, `css/style.css`
- Test: `tests/session.test.js`

**Interfaces:**
- Consumes: Task 1〜5 のすべて
- Produces（純粋な状態遷移）:
  - `startSession(videoIds: string[]): Session`、`Session = { phase: 'playing' | 'resting' | 'done', index: number, videoIds: string[], recordedSeconds: number }`
  - `afterVideo(session, recordedSeconds: number): Session` — 最後の動画なら `done`、それ以外は `resting`（index は変えない）。`recordedSeconds` は記録された秒数（記録されなかったら 0）を加算
  - `afterRest(session): Session` — `playing`、index+1
  - `quit(session): Session` — `done`
  - `nextVideoId(session): string | null`
- 画面：`renderSession(el, ctx)` が `session.phase` に応じて `renderPlay`（一通りモード用にタイトル上に「2 / 6」表示、「やめる」ボタン）、休憩画面、完了画面を描き分ける

- [ ] **Step 1: テストを書く**
  - 6 本で開始 → `{ phase: 'playing', index: 0 }`
  - `afterVideo(s, 200)` → `resting`、`recordedSeconds 200`、`nextVideoId` は 2 本目
  - `afterRest` → `playing`、index 1
  - index 5 で `afterVideo` → `done`（休憩なし）
  - `afterVideo(s, 0)`（30 秒未満で記録されなかった）→ `resting` に進む、`recordedSeconds` は変わらない
  - `quit` → `done`、`recordedSeconds` は保持
- [ ] **Step 2: `npm test` で失敗を確認**
- [ ] **Step 3: `js/session.js` を実装**
- [ ] **Step 4: `npm test` で成功を確認**
- [ ] **Step 5: 休憩画面を実装**：大きなカウントダウン（`settings.restSeconds` から）、「次はこれ」＋次の動画タイトル＋`renderBody`、「+30秒」「スキップ」。残り 3・2・1 秒で Web Audio の短いビープ（880Hz、0.12 秒）。`AudioContext` は「一通りスタート」タップ時に作って resume しておく（iPhone の制限対策）
- [ ] **Step 6: 休憩明けは `createPlayer(..., { autoplay: true })`。再生開始を 3 秒待っても `PLAYING` にならなければ大きな「再生」ボタンを表示し、タップで `playVideo()`**
- [ ] **Step 7: 完了画面**：「おつかれさまでした！」、今日の合計時間（`formatDuration(session.recordedSeconds)`）、`weekProgress` の「今週 N/M日」、`achieved` なら「今週の目標達成！」
- [ ] **Step 8: Playwright で、一通りスタート→完了ボタン→休憩画面（カウントダウン・次の動画・人体図）→スキップ→2 本目→やめる→完了画面、をスクリーンショットで確認**（再生時間が 30 秒未満なので記録はされず、それでも進むこと）
- [ ] **Step 9: Commit** `feat: add full-routine mode with rest timer`

### Task 7: カレンダー（calendar.js）

**Files:**
- Create: `js/calendar.js`, `js/views/calendar.js`
- Modify: `js/app.js`, `css/style.css`
- Test: `tests/calendar.test.js`

**Interfaces:**
- Consumes: `recordsOn`, `formatDuration`, `toDateKey` (Task 3)、`getVideo` (Task 1)
- Produces:
  - `monthGrid(year: number, month: number /* 1-12 */): Array<Array<string | null>>` — 月曜はじまりの週ごとの配列、各週 7 要素、月外は `null`
  - `renderCalendar(el, ctx)` — 「2026年11月」見出し、前月・次月ボタン、曜日見出し「月火水木金土日」、記録のある日に印、今日を強調、日付タップで下にその日の動画タイトル・時間の一覧と合計時間（記録なしなら「この日の記録はありません」）

- [ ] **Step 1: テストを書く**
  - `monthGrid(2026, 11)`：1 週目が `[null×6, '2026-11-01']`、最終週の先頭が `'2026-11-30'`、全週の長さが 7
  - `monthGrid(2027, 2)`：`'2027-02-01'` は月曜なので 1 週目先頭、合計 4 週
- [ ] **Step 2: `npm test` で失敗を確認**
- [ ] **Step 3: `js/calendar.js` と画面を実装**
- [ ] **Step 4: `npm test` で成功を確認**
- [ ] **Step 5: Playwright で記録を 2 日分入れてカレンダーの印・日付タップの一覧・月移動を確認**
- [ ] **Step 6: Commit** `feat: add training calendar`

### Task 8: 記録タブ（集計・設定・バックアップ）

**Files:**
- Create: `js/views/stats.js`
- Modify: `js/app.js`, `css/style.css`

**Interfaces:**
- Consumes: `totals`, `currentStreak`, `longestStreak`, `byVideo`, `byMuscle`, `formatDuration` (Task 3)、`createStore` の `updateSettings`/`exportJSON`/`importJSON` (Task 2)、`VIDEOS`, `MUSCLES` (Task 1)
- Produces: `renderStats(el, ctx)`
  - 上段：合計トレーニング日数、動画の回数、合計時間、連続日数、最長の連続日数
  - 動画ごと：タイトル・回数・時間（全 6 本、0 回も表示）
  - 部位ごと：呼び名（正式名）と回数を棒で表示（メイン部位として 1 回以上ある部位と、0 回の部位を全て表示）
  - 設定：週の目標（1〜7 の選択）、休憩時間（30/60/90 秒の切り替え）
  - バックアップ：「書き出す」→ `Blob` を `kintore-backup-YYYY-MM-DD.json` としてダウンロード、「読み込む」→ `<input type="file" accept="application/json,.json">` → `confirm('今の記録をすべて置き換えます。よろしいですか？')` → `importJSON`。失敗時「ファイルを読み込めませんでした。今の記録はそのままです」

- [ ] **Step 1: `js/views/stats.js` を実装し `app.js` につなぐ**
- [ ] **Step 2: Playwright で記録を入れて表示を確認。設定変更がリロード後も残ること、書き出し→記録を消す→読み込みで戻ること、壊れたファイルでエラー表示かつ記録が変わらないことを確認**
- [ ] **Step 3: `npm test` が成功することを確認**
- [ ] **Step 4: Commit** `feat: add stats tab with settings and backup`

### Task 9: 仕上げと公開準備

**Files:**
- Create: `README.md`
- Modify: 必要に応じて `css/style.css`

- [ ] **Step 1: Playwright で iPhone SE（375px）と iPhone 15 Pro Max（430px）の両方で全画面のスクリーンショットを撮り、横スクロールが出ないこと、ボタンが 44px 以上あることを確認**
- [ ] **Step 2: `README.md`（日本語）**：アプリの説明、iPhone での使い方（Safari で開く→共有→ホーム画面に追加）、動画の追加方法（`js/videos.js` に 1 件追加）、テストの実行方法 `npm test`
- [ ] **Step 3: `npm test` 全件成功を確認**
- [ ] **Step 4: Commit・push** `docs: add README`
- [ ] **Step 5: 本人にリポジトリを Public にしてよいか確認し、OK なら GitHub の Settings → Pages で「Deploy from a branch」→ このブランチ（またはマージ後の main）の `/ (root)` を選ぶ手順を案内する。公開 URL `https://hondak-oss.github.io/test.app/` を iPhone で開いてもらい、動画再生・自動再生・ビープ音を実機で確認してもらう**
