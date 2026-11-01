const view = document.getElementById('view');
const tabButtons = document.querySelectorAll('.tabbar button');

const TITLES = { train: 'トレーニング', calendar: 'カレンダー', stats: '記録' };

export function showTab(name) {
  tabButtons.forEach((b) => {
    if (b.dataset.tab === name) b.setAttribute('aria-current', 'page');
    else b.removeAttribute('aria-current');
  });
  view.innerHTML = `<h1>${TITLES[name]}</h1>`;
  window.scrollTo(0, 0);
}

tabButtons.forEach((b) => b.addEventListener('click', () => showTab(b.dataset.tab)));
showTab('train');
