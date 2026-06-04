// watch-service base URL — overridable at runtime via window.WATCH_API.
const API = window.WATCH_API || 'http://localhost:3001';

const SERIES_COLORS = ['#1fd47e', '#5fe6a3', '#0f9e60', '#9af0c4', '#2bb574'];
const DONUT_COLORS = ['#1fd47e', '#149a5c', '#5fe6a3', '#0c6e43', '#8fe8bf', '#39564a'];

const els = {
  kpis: document.getElementById('kpis'),
  prices: document.getElementById('chart-prices'),
  legend: document.getElementById('legend'),
  cats: document.getElementById('chart-cats'),
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
const pctTxt = (p) => (p == null ? '—' : Math.round(p * 100) + '%');
const esc = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const short = (s, n) => (s.length > n ? s.slice(0, n - 1) + '…' : s);

function deltaHtml(change) {
  if (change == null) return '<span class="delta">—</span>';
  const cls = change >= 0 ? 'up' : 'down';
  const arrow = change >= 0 ? '▲' : '▼';
  return `<span class="delta ${cls}">${arrow} ${(Math.abs(change) * 100).toFixed(1)}</span>`;
}

// ---------- line chart (cotes over snapshots) ----------
function renderPriceChart(rows) {
  const W = 640;
  const H = 230;
  const pad = { l: 30, r: 12, t: 12, b: 18 };
  const series = rows
    .slice()
    .sort((a, b) => b.market.volume24h - a.market.volume24h)
    .slice(0, 5)
    .map((r, i) => ({
      name: short(r.market.question, 26),
      color: SERIES_COLORS[i % SERIES_COLORS.length],
      pts: (r.sparkline.length ? r.sparkline : [0]).slice(-24),
    }));

  if (!series.length) {
    els.prices.innerHTML = '<div class="empty">Ajoute des marchés pour voir l\'évolution des cotes.</div>';
    els.legend.innerHTML = '';
    return;
  }

  const maxLen = Math.max(...series.map((s) => s.pts.length), 2);
  const x = (i, len) => pad.l + (i / Math.max(1, len - 1)) * (W - pad.l - pad.r);
  const y = (v) => pad.t + (1 - v) * (H - pad.t - pad.b);

  let grid = '';
  for (let g = 0; g <= 4; g++) {
    const gy = y(g / 4);
    grid += `<line class="grid-line" x1="${pad.l}" y1="${gy}" x2="${W - pad.r}" y2="${gy}"/>`;
    grid += `<text class="axis-label" x="${pad.l - 6}" y="${gy + 3}" text-anchor="end">${g * 25}%</text>`;
  }

  const lines = series
    .map((s) => {
      const pts = s.pts.map((v, i) => `${x(i, s.pts.length).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
      const last = s.pts[s.pts.length - 1];
      const cx = x(s.pts.length - 1, s.pts.length);
      return `<polyline fill="none" stroke="${s.color}" stroke-width="2" stroke-linejoin="round" points="${pts}"/>
        <circle cx="${cx.toFixed(1)}" cy="${y(last).toFixed(1)}" r="2.6" fill="${s.color}"/>`;
    })
    .join('');

  els.prices.innerHTML = `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none">${grid}${lines}</svg>`;
  els.legend.innerHTML = series
    .map((s) => `<span><i style="background:${s.color}"></i>${esc(s.name)}</span>`)
    .join('');
  void maxLen;
}

// ---------- donut (allocation by category) ----------
function renderCategoryDonut(rows) {
  const counts = {};
  for (const r of rows) counts[r.market.category] = (counts[r.market.category] || 0) + 1;
  const entries = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  const total = rows.length;

  if (!total) {
    els.cats.innerHTML = '<div class="empty">—</div>';
    return;
  }

  const S = 180;
  const cx = S / 2;
  const cy = S / 2 - 6;
  const r = 58;
  const rin = 38;
  let a0 = -Math.PI / 2;
  let arcs = '';
  let legend = '';
  entries.forEach(([cat, n], i) => {
    const frac = n / total;
    const a1 = a0 + frac * Math.PI * 2;
    const large = frac > 0.5 ? 1 : 0;
    const p = (ang, rad) => `${(cx + rad * Math.cos(ang)).toFixed(2)},${(cy + rad * Math.sin(ang)).toFixed(2)}`;
    const color = DONUT_COLORS[i % DONUT_COLORS.length];
    arcs += `<path d="M ${p(a0, r)} A ${r} ${r} 0 ${large} 1 ${p(a1, r)} L ${p(a1, rin)} A ${rin} ${rin} 0 ${large} 0 ${p(a0, rin)} Z" fill="${color}"/>`;
    legend += `<span><i style="background:${color}"></i>${esc(cat)} · ${n}</span>`;
    a0 = a1;
  });

  els.cats.innerHTML = `<svg viewBox="0 0 ${S} ${S}">
      ${arcs}
      <text class="donut-center" x="${cx}" y="${cy + 2}" text-anchor="middle" font-size="22">${total}</text>
      <text class="donut-sub" x="${cx}" y="${cy + 16}" text-anchor="middle">marchés</text>
    </svg>
    <div class="legend" style="justify-content:center">${legend}</div>`;
}

// ---------- sparkline (table cell) ----------
function sparkline(values) {
  const data = values.length >= 2 ? values : values.length === 1 ? [values[0], values[0]] : [0, 0];
  const w = 88;
  const h = 26;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const span = max - min || 1;
  const pts = data
    .map((v, i) => `${((i / (data.length - 1)) * w).toFixed(1)},${(h - 3 - ((v - min) / span) * (h - 6)).toFixed(1)}`)
    .join(' ');
  const color = data[data.length - 1] >= data[0] ? 'var(--green)' : 'var(--red)';
  return `<svg class="spark" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none"><polyline fill="none" stroke="${color}" stroke-width="1.6" points="${pts}"/></svg>`;
}

// ---------- KPIs ----------
function renderKpis(k) {
  const mover = k.topMover
    ? `${k.topMover.oneDayChange >= 0 ? '▲' : '▼'} ${(Math.abs(k.topMover.oneDayChange) * 100).toFixed(1)} pts`
    : '—';
  const moverSub = k.topMover ? esc(short(k.topMover.question, 32)) : 'aucun marché suivi';
  els.kpis.innerHTML = `
    <div class="kpi"><div class="label">Marchés suivis</div><div class="value">${k.watched}</div><div class="sub">boostés en watchlist</div></div>
    <div class="kpi"><div class="label">Volume 24h cumulé</div><div class="value green">${fmtUsd(k.totalVolume24h)}</div><div class="sub">sur la watchlist</div></div>
    <div class="kpi"><div class="label">Boost score moyen</div><div class="value green">${k.avgBoostScore}<span style="font-size:13px;color:var(--muted)">/100</span></div><div class="sub">attractivité récompenses</div></div>
    <div class="kpi"><div class="label">Top mouvement 24h</div><div class="value">${mover}</div><div class="sub">${moverSub}</div></div>`;
}

// ---------- watchlist table ----------
function renderWatchlist(rows) {
  els.watchCount.textContent = rows.length ? `${rows.length} marché(s)` : '';
  if (!rows.length) {
    els.watchlist.innerHTML =
      '<div class="empty">Aucun marché suivi. Ajoute des marchés boostés depuis « Découvrir » →</div>';
    return;
  }
  const maxVol = Math.max(...rows.map((r) => r.market.volume24h), 1);
  const body = rows
    .map((row) => {
      const m = row.market;
      const w = Math.max(4, Math.round((m.volume24h / maxVol) * 100));
      return `<tr>
        <td class="q">${esc(short(m.question, 60))}<br/><span class="chip">${esc(m.category)}</span></td>
        <td class="r"><span class="cote">${pctTxt(m.yesPrice)}</span></td>
        <td class="r">${deltaHtml(m.oneDayChange)}</td>
        <td class="volcell"><span class="vol-num">${fmtUsd(m.volume24h)}</span><div class="volbar"><span style="width:${w}%"></span></div></td>
        <td>${sparkline(row.sparkline)}</td>
        <td><span class="boost" title="LP minSize ${m.boost.minSize} · spread max ${m.boost.maxSpread}${m.boost.holdingRewards ? ' · holding rewards' : ''}">⚡ ${m.boost.score}</span></td>
        <td class="r"><button class="remove" data-remove="${esc(m.id)}">✕</button></td>
      </tr>`;
    })
    .join('');
  els.watchlist.innerHTML = `<table>
    <thead><tr><th>Marché</th><th class="r">Cote</th><th class="r">24h</th><th>Volume 24h</th><th>Tendance</th><th>Boost</th><th></th></tr></thead>
    <tbody>${body}</tbody></table>`;
}

// ---------- discover ----------
function discRow(m, watchedIds) {
  const already = watchedIds.has(m.id);
  return `<div class="disc">
    <div class="info">
      <div class="dq" title="${esc(m.question)}">${esc(m.question)}</div>
      <div class="meta">${esc(m.category)} · ${pctTxt(m.yesPrice)} · ${fmtUsd(m.volume24h)} · ⚡${m.boost.score}</div>
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
    /* poly-service momentanément indisponible */
  }
}

async function refresh() {
  setStatus('chargement…');
  const category = els.category.value;
  try {
    const dash = await (await fetch(`${API}/api/dashboard`)).json();
    renderKpis(dash.kpis);
    renderPriceChart(dash.rows);
    renderCategoryDonut(dash.rows);
    renderWatchlist(dash.rows);
    const watchedIds = new Set(dash.rows.map((r) => r.market.id));

    const url = new URL(`${API}/api/discover`);
    url.searchParams.set('limit', '12');
    if (category) url.searchParams.set('category', category);
    const boosted = await (await fetch(url)).json();
    els.discover.innerHTML = boosted.map((m) => discRow(m, watchedIds)).join('');
    setStatus('à jour');
  } catch {
    setStatus('⚠ services injoignables');
  }
}
const setStatus = (t) => (els.status.textContent = '· ' + t);

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
