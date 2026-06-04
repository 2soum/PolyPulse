// watch-service base URL — overridable at runtime via window.WATCH_API.
const API = window.WATCH_API || 'http://localhost:3001';

const els = {
  kpis: document.getElementById('kpis'),
  watchlist: document.getElementById('watchlist'),
  discover: document.getElementById('discover'),
  category: document.getElementById('category'),
  refresh: document.getElementById('refresh'),
  auto: document.getElementById('auto'),
  watchCount: document.getElementById('watch-count'),
  status: document.getElementById('status'),
};

let autoTimer = null;

// ---------- helpers ----------
const fmtUsd = (n) => {
  if (n >= 1e9) return '$' + (n / 1e9).toFixed(1) + 'B';
  if (n >= 1e6) return '$' + (n / 1e6).toFixed(1) + 'M';
  if (n >= 1e3) return '$' + (n / 1e3).toFixed(1) + 'k';
  return '$' + Math.round(n);
};
const pct = (p) => (p == null ? '—' : Math.round(p * 100) + '%');
const esc = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

function deltaHtml(change) {
  if (change == null) return '<span class="delta">—</span>';
  const cls = change >= 0 ? 'up' : 'down';
  const arrow = change >= 0 ? '▲' : '▼';
  return `<span class="delta ${cls}">${arrow} ${(Math.abs(change) * 100).toFixed(1)} pts</span>`;
}

function sparkline(values) {
  const data = values.length >= 2 ? values : values.length === 1 ? [values[0], values[0]] : [0, 0];
  const w = 120;
  const h = 38;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const span = max - min || 1;
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * w;
    const y = h - 4 - ((v - min) / span) * (h - 8);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  const rising = data[data.length - 1] >= data[0];
  const color = rising ? 'var(--green)' : 'var(--red)';
  return `<svg class="spark" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none">
    <polyline fill="none" stroke="${color}" stroke-width="2" points="${pts.join(' ')}" />
  </svg>`;
}

// ---------- rendering ----------
function renderKpis(k) {
  const mover = k.topMover
    ? `${k.topMover.oneDayChange >= 0 ? '▲' : '▼'} ${(Math.abs(k.topMover.oneDayChange) * 100).toFixed(1)} pts`
    : '—';
  const moverSub = k.topMover ? esc(k.topMover.question.slice(0, 36)) : 'aucun marché suivi';
  els.kpis.innerHTML = `
    <div class="kpi"><div class="label">Marchés suivis</div><div class="value">${k.watched}</div><div class="sub">boostés en watchlist</div></div>
    <div class="kpi"><div class="label">Volume 24h cumulé</div><div class="value">${fmtUsd(k.totalVolume24h)}</div><div class="sub">sur la watchlist</div></div>
    <div class="kpi"><div class="label">Boost score moyen</div><div class="value">${k.avgBoostScore}<small style="font-size:14px;color:var(--muted)">/100</small></div><div class="sub">attractivité des récompenses</div></div>
    <div class="kpi"><div class="label">Top mouvement 24h</div><div class="value">${mover}</div><div class="sub">${moverSub}</div></div>`;
}

function watchCard(row) {
  const m = row.market;
  const outcome = m.outcomes[0] || 'Yes';
  return `<div class="card">
    <div class="card-top">
      <div class="q">${esc(m.question)}</div>
      <span class="chip">${esc(m.category)}</span>
    </div>
    <div class="card-mid">
      <div class="price">${pct(m.yesPrice)}<small> ${esc(outcome)}</small></div>
      ${deltaHtml(m.oneDayChange)}
    </div>
    ${sparkline(row.sparkline)}
    <div class="card-bot">
      <span class="boost" title="LP minSize ${m.boost.minSize} · spread max ${m.boost.maxSpread}${m.boost.holdingRewards ? ' · holding rewards' : ''}">⚡ BOOST ${m.boost.score}</span>
      <span>Vol ${fmtUsd(m.volume24h)} · liq ${fmtUsd(m.liquidity)}</span>
      <button class="remove" data-remove="${esc(m.id)}">Retirer</button>
    </div>
  </div>`;
}

function renderWatchlist(rows) {
  els.watchCount.textContent = rows.length ? `${rows.length} marché(s)` : '';
  if (!rows.length) {
    els.watchlist.innerHTML =
      '<div class="empty">Aucun marché suivi. Ajoute des marchés boostés depuis le panneau « Découvrir » →</div>';
    return;
  }
  els.watchlist.innerHTML = rows.map(watchCard).join('');
}

function discRow(m, watchedIds) {
  const already = watchedIds.has(m.id);
  return `<div class="disc">
    <div class="info">
      <div class="dq" title="${esc(m.question)}">${esc(m.question)}</div>
      <div class="meta">${esc(m.category)} · ${pct(m.yesPrice)} · vol ${fmtUsd(m.volume24h)} · ⚡${m.boost.score}</div>
    </div>
    <button class="add" data-add="${esc(m.id)}" ${already ? 'disabled' : ''} title="${already ? 'déjà suivi' : 'ajouter'}">+</button>
  </div>`;
}

// ---------- data ----------
async function loadCategories() {
  try {
    const cats = await (await fetch(`${API}/api/categories`)).json();
    for (const c of cats) {
      const o = document.createElement('option');
      o.value = c;
      o.textContent = c;
      els.category.appendChild(o);
    }
  } catch {
    /* poly-service peut être momentanément indisponible */
  }
}

async function refresh() {
  setStatus('chargement…');
  const category = els.category.value;
  try {
    const dash = await (await fetch(`${API}/api/dashboard`)).json();
    renderKpis(dash.kpis);
    renderWatchlist(dash.rows);
    const watchedIds = new Set(dash.rows.map((r) => r.market.id));

    const url = new URL(`${API}/api/discover`);
    url.searchParams.set('limit', '12');
    if (category) url.searchParams.set('category', category);
    const boosted = await (await fetch(url)).json();
    els.discover.innerHTML = boosted.map((m) => discRow(m, watchedIds)).join('');
    setStatus('à jour');
  } catch (err) {
    setStatus('⚠ services injoignables');
  }
}

function setStatus(text) {
  els.status.textContent = '· ' + text;
}

// ---------- events ----------
els.refresh.addEventListener('click', refresh);
els.category.addEventListener('change', refresh);
els.auto.addEventListener('change', () => {
  if (els.auto.checked) autoTimer = setInterval(refresh, 15000);
  else clearInterval(autoTimer);
});

document.addEventListener('click', async (e) => {
  const add = e.target.closest('[data-add]');
  const rem = e.target.closest('[data-remove]');
  if (add) {
    add.disabled = true;
    await fetch(`${API}/api/watchlist`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ marketId: add.dataset.add }),
    });
    refresh();
  }
  if (rem) {
    await fetch(`${API}/api/watchlist/${rem.dataset.remove}`, { method: 'DELETE' });
    refresh();
  }
});

// ---------- init ----------
(async function init() {
  await loadCategories();
  await refresh();
})();
