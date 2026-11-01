// 人体図（前・後ろ）と部位の説明カード。
import { MUSCLES } from './videos.js';
import { esc } from './util.js';

// シルエット（前後共通）
const SILHOUETTE = `
  <circle cx="100" cy="36" r="22"/>
  <rect x="91" y="54" width="18" height="18" rx="6"/>
  <path d="M70 72 Q100 66 130 72 L150 84 Q157 92 154 102 L140 122 L134 200 L138 236 L62 236 L66 200 L60 122 L46 102 Q43 92 50 84 Z"/>
  <rect x="34" y="86" width="22" height="92" rx="11"/>
  <rect x="144" y="86" width="22" height="92" rx="11"/>
  <rect x="30" y="174" width="20" height="88" rx="10"/>
  <rect x="150" y="174" width="20" height="88" rx="10"/>
  <circle cx="40" cy="272" r="9"/>
  <circle cx="160" cy="272" r="9"/>
  <rect x="64" y="226" width="34" height="164" rx="15"/>
  <rect x="102" y="226" width="34" height="164" rx="15"/>
`;

// 部位の図形。左右ある部位は同じ id で2つ描く。
const FRONT = {
  delts: ['<ellipse cx="52" cy="96" rx="13" ry="15"/>', '<ellipse cx="148" cy="96" rx="13" ry="15"/>'],
  pecs: ['<ellipse cx="83" cy="106" rx="17" ry="13"/>', '<ellipse cx="117" cy="106" rx="17" ry="13"/>'],
  biceps: ['<ellipse cx="45" cy="136" rx="9" ry="26"/>', '<ellipse cx="155" cy="136" rx="9" ry="26"/>'],
  forearm: ['<ellipse cx="40" cy="214" rx="8" ry="30"/>', '<ellipse cx="160" cy="214" rx="8" ry="30"/>'],
  rectus: ['<rect x="88" y="124" width="24" height="68" rx="6"/>'],
  lowerabs: ['<rect x="89" y="195" width="22" height="30" rx="6"/>'],
  obliques: ['<ellipse cx="73" cy="166" rx="8" ry="28"/>', '<ellipse cx="127" cy="166" rx="8" ry="28"/>'],
};

const BACK = {
  delts: FRONT.delts,
  triceps: ['<ellipse cx="45" cy="136" rx="9" ry="26"/>', '<ellipse cx="155" cy="136" rx="9" ry="26"/>'],
  erector: ['<rect x="88" y="110" width="10" height="100" rx="4"/>', '<rect x="102" y="110" width="10" height="100" rx="4"/>'],
  glutes: ['<ellipse cx="84" cy="244" rx="18" ry="16"/>', '<ellipse cx="116" cy="244" rx="18" ry="16"/>'],
};

function figure(shapes, label, main, sub) {
  const parts = Object.entries(shapes).map(([id, list]) => {
    const cls = main.includes(id) ? 'muscle is-main' : sub.includes(id) ? 'muscle is-sub' : 'muscle';
    return list.map((s) => s.replace(/^<(\w+)/, `<$1 class="${cls}" data-muscle="${id}"`)).join('');
  }).join('');
  return `
    <figure class="body-figure">
      <svg viewBox="0 0 200 400" role="img" aria-label="人体図（${label}）">
        <g class="silhouette">${SILHOUETTE}</g>
        ${parts}
      </svg>
      <figcaption>${label}</figcaption>
    </figure>`;
}

export function renderBody(el, { main = [], sub = [] }) {
  el.innerHTML = `<div class="body-diagram">${figure(FRONT, '前', main, sub)}${figure(BACK, '後ろ', main, sub)}</div>`;
}

export function renderMuscleCards(el, video) {
  const item = (id, kind) => {
    const m = MUSCLES[id];
    return `
      <li class="muscle-card ${kind === 'メイン' ? 'is-main' : 'is-sub'}">
        <span class="muscle-tag">${kind}</span>
        <strong>${esc(m.name)}</strong><span class="muscle-nick">（${esc(m.nick)}）</span>
        <p>${esc(m.desc)}</p>
      </li>`;
  };
  el.innerHTML = `<ul class="muscle-cards">${video.main.map((id) => item(id, 'メイン')).join('')}${video.sub.map((id) => item(id, 'サブ')).join('')}</ul>`;
}
