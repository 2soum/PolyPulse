// The spot-service base URL. Overridable at runtime via window.SPOT_API.
const API = window.SPOT_API || 'http://localhost:3001';

const list = document.getElementById('spot-list');
const form = document.getElementById('spot-form');
const formError = document.getElementById('form-error');
const planResult = document.getElementById('plan-result');
const planBody = document.getElementById('plan-body');

function today() {
  return new Date().toISOString().slice(0, 10);
}

async function loadSpots() {
  const res = await fetch(`${API}/api/spots`);
  const spots = await res.json();
  list.innerHTML = '';
  if (spots.length === 0) {
    list.innerHTML = '<li class="spot">Aucun spot pour le moment. Ajoutez-en un !</li>';
    return;
  }
  for (const spot of spots) {
    list.appendChild(renderSpot(spot));
  }
}

function renderSpot(spot) {
  const li = document.createElement('li');
  li.className = 'spot';
  li.innerHTML = `
    <div class="spot-head">
      <strong>${escapeHtml(spot.name)}</strong>
      <button class="secondary" data-delete="${spot.id}">Supprimer</button>
    </div>
    <small>${spot.latitude.toFixed(3)}, ${spot.longitude.toFixed(3)}${
      spot.description ? ' — ' + escapeHtml(spot.description) : ''
    }</small>
    <div class="spot-actions">
      <input type="date" value="${today()}" data-date="${spot.id}" />
      <button data-plan="${spot.id}">Évaluer le ciel</button>
    </div>`;
  return li;
}

function escapeHtml(value) {
  return String(value).replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c],
  );
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  formError.hidden = true;
  const data = Object.fromEntries(new FormData(form).entries());
  const payload = {
    name: data.name,
    latitude: Number(data.latitude),
    longitude: Number(data.longitude),
    description: data.description || undefined,
  };
  const res = await fetch(`${API}/api/spots`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    formError.textContent = body.error || 'Erreur lors de la création';
    formError.hidden = false;
    return;
  }
  form.reset();
  await loadSpots();
});

list.addEventListener('click', async (event) => {
  const target = event.target;
  if (target.dataset.delete) {
    await fetch(`${API}/api/spots/${target.dataset.delete}`, { method: 'DELETE' });
    await loadSpots();
  }
  if (target.dataset.plan) {
    const id = target.dataset.plan;
    const date = document.querySelector(`[data-date="${id}"]`).value;
    await planSession(id, date);
  }
});

async function planSession(id, date) {
  const res = await fetch(`${API}/api/spots/${id}/plan`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ date }),
  });
  const body = await res.json().catch(() => ({}));
  planResult.hidden = false;
  if (!res.ok) {
    planBody.innerHTML = `<p class="error">${body.error || 'Erreur'}</p>`;
    return;
  }
  const a = body.assessment;
  const badge = body.recommended
    ? '<span class="badge recommended">✅ Sortez les télescopes !</span>'
    : '<span class="badge not-recommended">⛅ Mieux vaut attendre</span>';
  planBody.innerHTML = `
    <p><strong>${escapeHtml(body.spot.name)}</strong> — ${escapeHtml(date)}</p>
    <p class="score">${a.score}/100</p>
    <p>${badge} · note ${a.rating}</p>
    <ul>
      <li>Site de référence : ${escapeHtml(a.nearestSite)} (Bortle ${a.bortleClass})</li>
      <li>Couverture nuageuse moyenne : ${a.cloudCover}%</li>
    </ul>`;
  planResult.scrollIntoView({ behavior: 'smooth' });
}

loadSpots().catch((err) => {
  list.innerHTML = `<li class="spot error">spot-service injoignable (${escapeHtml(err.message)})</li>`;
});
