// ---------------- Configuration ----------------
const API_BASE = 'https://recipeengine.fly.dev';
const INGEST_API_URL = 'https://recipeengine.fly.dev/recipes/ingest';
let ADMIN_AUTH = sessionStorage.getItem('ADMIN_AUTH') || null;

// ---------------- Helpers ----------------------
const api = (p) => (API_BASE ? API_BASE.replace(/\/$/, '') : '') + p;
const qs = (s, el=document) => el.querySelector(s);
const text = (el, v) => el && (el.textContent = v ?? '');

// ---------------- Boot -------------------------
document.addEventListener('DOMContentLoaded', () => {
  if (qs('#recipesTbody')) { wireGlobalSend(); loadList(); }
  if (qs('#recipeTitle')) { loadDetail(); }
});

// ---------------  Send via Spring to be Processed -------------------
function wireGlobalSend(){
  const btn = qs('#globalSendBtn'); if (!btn) return;
  const input = qs('#globalUrl'), status = qs('#globalSendStatus');

  btn.addEventListener('click', async () => {
    const toSend = (input?.value || '').trim();
    if (!toSend){ text(status,'Please enter a URL first.'); return; }
    if (!INGEST_API_URL){ text(status,'EXTERNAL_API_URL not set.'); return; }

    try {
      text(status,'Sending...');

      // prepare headers
      const headers = { 'Content-Type': 'application/json' };
      if (ADMIN_AUTH) headers['Authorization'] = ADMIN_AUTH;

      // first attempt
      let resp = await fetch(INGEST_API_URL, {
        method: 'POST',
        headers,
        body: JSON.stringify({ url: toSend })
      });

      // if unauthorized, prompt and retry
      if (resp.status === 401 && !ADMIN_AUTH) {
        const u = prompt("Admin username:");
        const p = prompt("Admin password:");
        if (u && p) {
          ADMIN_AUTH = "Basic " + btoa(u + ":" + p);
          sessionStorage.setItem('ADMIN_AUTH', ADMIN_AUTH);

          resp = await fetch(INGEST_API_URL, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': ADMIN_AUTH
            },
            body: JSON.stringify({ url: toSend })
          });
        }
      }

      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      text(status,'Sent to be processed. Please refresh in 30 seconds.');
    } catch (e) {
      text(status, 'Unsuccessful, please contact administrator.');
    }
  });
}


// --------------- List page ---------------------
async function loadList(){
  const countEl = qs('#recipesCount');
  const errEl = qs('#listError');
  const tbody = qs('#recipesTbody');
  const rowTpl = qs('#recipe-row-template');

  try {
    const res = await fetch(api('/recipes'));
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const recipes = await res.json();

    text(countEl, `${recipes.length} recipe${recipes.length === 1 ? '' : 's'}`);
    tbody.innerHTML = '';

    recipes.forEach(r => {
      const frag = rowTpl.content.cloneNode(true);
      qs('.title', frag).textContent = r.title || '(Untitled)';
      qs('.dietType', frag).textContent = r.dietType || '';
      qs('.gf', frag).textContent = r.glutenFree ? 'Yes' : 'No';
      qs('.prep', frag).textContent = r.prepTime ? `${r.prepTime} min` : '';
      qs('.cook', frag).textContent = r.cookTime ? `${r.cookTime} min` : '';
      qs('.total', frag).textContent = r.totalTime ? `${r.totalTime} min` : '';
      qs('.serves', frag).textContent = r.serves ? `${r.serves}` : '';

      const view = qs('[data-view-link]', frag);
      view.href = `recipe.html?id=${encodeURIComponent(r.id)}`;
      view.textContent = 'View';

      tbody.appendChild(frag);
    });

  } catch (e) {
    errEl.style.display = 'block';
    text(errEl, e.message || 'Failed to load recipes.');
  }
}

// --------------- Detail page ---------------------
async function loadDetail(){
  const qsLocal = (s, el=document) => el.querySelector(s);
  const textLocal = (el, v) => el && (el.textContent = v ?? '');

  const id = new URL(location.href).searchParams.get('id');
  const errEl = qsLocal('#detailError');
  if (!id){ errEl.style.display='block'; textLocal(errEl,'Missing recipe id.'); return; }

  try {
    const res = await fetch(api(`/recipes/${encodeURIComponent(id)}`));
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const r = await res.json();

    // Basic fields
    textLocal(qsLocal('#recipeTitle'), r.title || '(Untitled)');
    textLocal(qsLocal('#recipeDescription'), r.description || '');
    textLocal(qsLocal('#createdAt'), r.createdAt ? new Date(r.createdAt).toLocaleString() : '');

    const link = qsLocal('#sourceLink');
    if (link){ link.href = r.url || '#'; link.style.visibility = r.url ? 'visible' : 'hidden'; }
    textLocal(qsLocal('#recipeUrl'), r.url || '');

    // Ingredients <ul> with UK/non-UK logic
    const ul = qsLocal('#ingredientsList');
    if (ul) {
      ul.innerHTML = '';
      (r.ingredients || []).forEach(ing => {
        const li = document.createElement('li');

        if (ing.isNonUkUnit) {
          const parts = [];
          if (ing.amountG != null && ing.amountG !== '') {
            parts.push(`${ing.amountG} g`);
          }
          if (ing.amountMl != null && ing.amountMl !== '') {
            parts.push(`${ing.amountMl} ml`);
          }
          const qty = parts.join(' / ');
          li.textContent = `${qty}${qty ? ' ' : ''}${ing.name || ''}`.trim();
        } else {
          const amount = ing.originalAmount != null ? ing.originalAmount : '';
          const unit   = ing.originalUnit || '';
          const qty    = [amount, unit].filter(Boolean).join(' ');
          li.textContent = `${qty}${qty ? ' ' : ''}${ing.name || ''}`.trim();
        }
        if (ing.originalText) li.title = ing.originalText;

        ul.appendChild(li);
      });
    }

    // Metadata table will include prepTime, cookTime, totalTime, serves, dietType, glutenFree, etc.
    const meta = qsLocal('#metaTable');
    if (meta){
      meta.innerHTML = '';
      const skip = new Set(['id','title','url','createdAt','ingredients','instructions','description']);
      Object.entries(r).forEach(([k,v]) => {
        if (skip.has(k)) return;
        if (Array.isArray(v) || (v && typeof v === 'object')) return;
        const tr = document.createElement('tr');
        const th = document.createElement('th'); th.textContent = formatKey(k);
        const tdv = document.createElement('td'); tdv.textContent = formatValue(k,v) ?? '';
        tr.appendChild(th); tr.appendChild(tdv);
        meta.appendChild(tr);
      });
    }

    textLocal(qsLocal('#instructions'), r.instructions || '');

  } catch (e) {
    errEl.style.display = 'block';
    textLocal(errEl, e.message || 'Failed to load recipe.');
  }
}

function formatKey(key){
  // Insert spaces before capitals, capitalize first letter
  return key.replace(/([A-Z])/g, ' $1')
      .replace(/^./, c => c.toUpperCase());
}

function formatValue(key, value){
  if (key === 'glutenFree') return value ? 'Yes' : 'No';
  return value;
}
