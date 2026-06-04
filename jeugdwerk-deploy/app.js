// ── SUPABASE REST API (geen SDK nodig) ──
const SUPABASE_URL = 'https://fjxzdhfclxhijdondtqn.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZqeHpkaGZjbHhoaWpkb25kdHFuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg5NTU0MzUsImV4cCI6MjA5NDUzMTQzNX0.m-7BRdylA5Kl9Ij0KKArO3CPY6Og99ginH5XHfsWgN8';
const DB = `${SUPABASE_URL}/rest/v1/notes`;
const HEADERS = {
  'apikey': SUPABASE_KEY,
  'Authorization': `Bearer ${SUPABASE_KEY}`,
  'Content-Type': 'application/json',
  'Prefer': 'return=representation'
};

function makeDb(table) {
  const url = `${SUPABASE_URL}/rest/v1/${table}`;
  return {
    async select(filter = '') {
      const r = await fetch(`${url}?select=*${filter}&order=created_at.asc`, { headers: HEADERS });
      if (!r.ok) throw new Error(await r.text());
      return r.json();
    },
    async insert(row) {
      const r = await fetch(url, { method: 'POST', headers: HEADERS, body: JSON.stringify(row) });
      if (!r.ok) throw new Error(await r.text());
      return r.json();
    },
    async update(id, row) {
      const r = await fetch(`${url}?id=eq.${id}`, { method: 'PATCH', headers: HEADERS, body: JSON.stringify(row) });
      if (!r.ok) throw new Error(await r.text());
      return r.json();
    },
    async delete(id) {
      const r = await fetch(`${url}?id=eq.${id}`, { method: 'DELETE', headers: HEADERS });
      if (!r.ok) throw new Error(await r.text());
    }
  };
}

const dbResponses = makeDb('responses');
const dbPriorities = makeDb('priorities');

const db = {
  async select(filter = '') {
    const r = await fetch(`${DB}?select=*${filter}&order=created_at.asc`, { headers: HEADERS });
    if (!r.ok) throw new Error(await r.text());
    return r.json();
  },
  async insert(row) {
    const r = await fetch(DB, { method: 'POST', headers: HEADERS, body: JSON.stringify(row) });
    if (!r.ok) throw new Error(await r.text());
    return r.json();
  },
  async update(id, row) {
    const r = await fetch(`${DB}?id=eq.${id}`, { method: 'PATCH', headers: HEADERS, body: JSON.stringify(row) });
    if (!r.ok) throw new Error(await r.text());
    return r.json();
  },
  async delete(id) {
    const r = await fetch(`${DB}?id=eq.${id}`, { method: 'DELETE', headers: HEADERS });
    if (!r.ok) throw new Error(await r.text());
  }
};

// ── PINCODE ──
const PINCODE = '2026';
let pinInput = '';

function initPin() {
  const overlay = document.getElementById('pin-overlay');
  if (sessionStorage.getItem('unlocked') === '1') {
    overlay.classList.add('hidden');
    setTimeout(() => overlay.remove(), 400);
    return;
  }
  document.querySelectorAll('.pin-key').forEach(key => {
    key.addEventListener('click', () => {
      const val = key.dataset.val;
      if (val === 'del') {
        pinInput = pinInput.slice(0, -1);
      } else {
        if (pinInput.length < 4) pinInput += val;
      }
      updateDots();
      if (pinInput.length === 4) checkPin();
    });
  });
  document.addEventListener('keydown', e => {
    if (!overlay.parentElement) return;
    if (e.key >= '0' && e.key <= '9' && pinInput.length < 4) {
      pinInput += e.key;
      updateDots();
      if (pinInput.length === 4) checkPin();
    } else if (e.key === 'Backspace') {
      pinInput = pinInput.slice(0, -1);
      updateDots();
    }
  });
}

function updateDots() {
  document.querySelectorAll('.pin-dot').forEach((dot, i) => {
    dot.classList.toggle('filled', i < pinInput.length);
  });
}

function checkPin() {
  if (pinInput === PINCODE) {
    sessionStorage.setItem('unlocked', '1');
    const overlay = document.getElementById('pin-overlay');
    overlay.classList.add('hidden');
    setTimeout(() => overlay.remove(), 400);
  } else {
    document.getElementById('pin-error').textContent = 'Onjuiste pincode. Probeer opnieuw.';
    pinInput = '';
    updateDots();
    setTimeout(() => { document.getElementById('pin-error').textContent = ''; }, 2000);
  }
}

// ── SIDEBAR & NAVIGATIE ──
function initNav() {
  const hamburger = document.querySelector('.hamburger');
  const sidebar = document.querySelector('.sidebar');
  const overlay = document.querySelector('.overlay');

  if (hamburger) {
    hamburger.addEventListener('click', () => {
      sidebar.classList.toggle('open');
      overlay.classList.toggle('open');
    });
    overlay.addEventListener('click', () => {
      sidebar.classList.remove('open');
      overlay.classList.remove('open');
    });
  }

  const sections = document.querySelectorAll('.section[id]');
  const navItems = document.querySelectorAll('.nav-item[data-section]');

  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        navItems.forEach(item => item.classList.remove('active'));
        const active = document.querySelector(`.nav-item[data-section="${entry.target.id}"]`);
        if (active) active.classList.add('active');
      }
    });
  }, { rootMargin: '-20% 0px -70% 0px' });

  sections.forEach(s => observer.observe(s));

  navItems.forEach(item => {
    item.addEventListener('click', () => {
      const target = document.getElementById(item.dataset.section);
      if (target) {
        target.scrollIntoView({ behavior: 'smooth' });
        if (window.innerWidth < 900) {
          sidebar.classList.remove('open');
          overlay.classList.remove('open');
        }
      }
    });
  });
}

// ── NOTITIES: LADEN ──
async function loadNotes(sectionId) {
  try {
    return await db.select(`&section_id=eq.${sectionId}`);
  } catch (e) { console.error('Fout bij laden:', e); return []; }
}

// ── NOTITIES: RENDEREN ──
async function renderNotes(sectionId) {
  const notes = await loadNotes(sectionId);
  const panel = document.getElementById(`notes-panel-${sectionId}`);
  if (!panel) return;
  const list = panel.querySelector('.notes-list');
  const btn = document.querySelector(`.note-btn[data-section="${sectionId}"]`);

  const countEl = btn?.querySelector('.note-count');
  if (notes.length > 0) {
    if (!countEl) {
      const badge = document.createElement('span');
      badge.className = 'note-count';
      badge.textContent = notes.length;
      btn?.appendChild(badge);
    } else {
      countEl.textContent = notes.length;
    }
  } else if (countEl) {
    countEl.remove();
  }

  if (notes.length === 0) {
    list.innerHTML = '<p class="notes-empty">Nog geen notities voor dit onderdeel.</p>';
    return;
  }

  list.innerHTML = notes.map(n => `
    <div class="note-item ${n.besproken ? 'besproken' : ''} ${n.verwerkt ? 'verwerkt' : ''}" data-id="${n.id}">
      <div class="note-meta">✍️ ${escapeHtml(n.author)} &nbsp;·&nbsp; ${formatDate(n.created_at)}
        ${n.besproken ? '<span class="note-besproken-badge">✓ besproken</span>' : ''}
        ${n.verwerkt ? '<span style="font-size:0.68rem;font-weight:700;color:#1d4ed8;background:#dbeafe;padding:0.1rem 0.45rem;border-radius:10px;margin-left:0.3rem">✓ verwerkt</span>' : ''}
      </div>
      <div class="note-text">${escapeHtml(n.text).replace(/\n/g, '<br>')}</div>
      <div style="display:flex;gap:0.5rem;flex-wrap:wrap">
        <button class="note-besproken-btn" onclick="markeerBesproken('${n.id}','${sectionId}',${!!n.besproken})">
          ${n.besproken ? '↩ Besproken' : '✓ Besproken'}
        </button>
        <button class="note-besproken-btn" style="color:${n.verwerkt ? '#1d4ed8' : 'var(--text-muted)'}" onclick="markeerVerwerkt('${n.id}','${sectionId}',${!!n.verwerkt})">
          ${n.verwerkt ? '↩ Verwerkt' : '⚙️ Verwerkt'}
        </button>
        <button onclick="deleteNote('${n.id}', '${sectionId}')" style="background:none;border:none;color:#92400E;font-size:0.75rem;cursor:pointer;margin-top:0.3rem;">Verwijder</button>
      </div>
    </div>
  `).join('');
}

// ── NOTITIE VERWIJDEREN ──
async function deleteNote(noteId, sectionId) {
  try { await db.delete(noteId); } catch (e) { console.error('Fout bij verwijderen:', e); return; }
  renderNotes(sectionId);
}

// ── NOTITIES: INITIALISEREN ──
function initNotes() {
  const savedName = localStorage.getItem('note_author');

  document.querySelectorAll('.note-btn').forEach(btn => {
    const id = btn.dataset.section;
    if (savedName) {
      const nameInput = document.getElementById(`note-name-${id}`);
      if (nameInput) nameInput.value = savedName;
    }

    btn.addEventListener('click', async () => {
      const panel = document.getElementById(`notes-panel-${id}`);
      const wasOpen = panel.classList.contains('open');
      panel.classList.toggle('open');
      if (!wasOpen) await renderNotes(id);
    });
  });

  document.querySelectorAll('.note-submit').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = btn.dataset.section;
      const nameInput = document.getElementById(`note-name-${id}`);
      const textInput = document.getElementById(`note-text-${id}`);
      const name = nameInput.value.trim() || 'Anoniem';
      const text = textInput.value.trim();
      if (!text) return;

      localStorage.setItem('note_author', name);
      btn.disabled = true;
      btn.textContent = 'Opslaan...';

      try {
        await db.insert({ section_id: id, author: name, text });
      } catch (e) {
        console.error('Fout bij opslaan:', e);
        btn.disabled = false;
        btn.textContent = 'Opslaan';
        alert('Er ging iets mis bij het opslaan. Probeer opnieuw.');
        return;
      }

      btn.disabled = false;
      btn.textContent = 'Opslaan';

      textInput.value = '';
      document.querySelectorAll('.note-name-input').forEach(el => el.value = name);
      await renderNotes(id);
    });
  });

  // Tellingen laden bij start
  document.querySelectorAll('.note-btn').forEach(async btn => {
    const id = btn.dataset.section;
    const notes = await loadNotes(id);
    if (notes.length > 0) {
      const badge = document.createElement('span');
      badge.className = 'note-count';
      badge.textContent = notes.length;
      btn.appendChild(badge);
    }
  });
}

// ── VERWERKT TOGGLE ──
async function markeerVerwerkt(noteId, sectionId, huidig) {
  try {
    const url = `${SUPABASE_URL}/rest/v1/notes?id=eq.${noteId}`;
    await fetch(url, { method: 'PATCH', headers: HEADERS, body: JSON.stringify({ verwerkt: !huidig }) });
    renderNotes(sectionId);
    laadDashboard();
  } catch(e) { console.error('Verwerkt fout:', e); }
}

// ── EXPORTEER ALS CLAUDE-PROMPT ──
async function exportAllNotes() {
  const btn = document.querySelector('.btn-export');
  btn.textContent = '⏳ Laden...';

  let data;
  try {
    data = await db.select('&order=section_id.asc,created_at.asc');
  } catch (e) {
    btn.textContent = '📋 Exporteer als prompt';
    alert('Er zijn nog geen notities opgeslagen.');
    return;
  }

  btn.textContent = '📋 Exporteer als prompt';

  if (!data || data.length === 0) {
    alert('Er zijn nog geen notities opgeslagen.');
    return;
  }

  // Alleen niet-verwerkte notities
  const openNotes = data.filter(n => !n.verwerkt);
  const verwerktNotes = data.filter(n => n.verwerkt);

  const grouped = {};
  openNotes.forEach(n => {
    if (!grouped[n.section_id]) grouped[n.section_id] = [];
    grouped[n.section_id].push(n);
  });

  // Bouw Claude-prompt
  let prompt = `NOTITIES TER VERWERKING — Jeugdplan CGK Zwolle\n`;
  prompt += `Datum: ${new Date().toLocaleDateString('nl-NL', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}\n`;
  prompt += `${'='.repeat(55)}\n\n`;

  prompt += `CONTEXT:\n`;
  prompt += `Dit zijn teamnotities bij het jeugdplan 2026-2031 van CGK Zwolle (jeugdwerk 12-25 jaar).\n`;
  prompt += `Kernvisie: "Jonge, vurige volgelingen van Jezus — gevormd in Zwolle, levend voor Gods Koninkrijk."\n`;
  prompt += `Drie bewegingen: ✨ Ontmoeten → 🌱 Gevormd worden → 🔥 Meenemen\n`;
  prompt += `Open notities: ${openNotes.length} | Al verwerkt: ${verwerktNotes.length}\n\n`;

  if (openNotes.length === 0) {
    prompt += `Alle notities zijn al verwerkt — er is niets nieuws om te verwerken.\n`;
  } else {
    prompt += `OPEN NOTITIES (nog te verwerken):\n${'─'.repeat(40)}\n\n`;
    for (const [sectionId, notes] of Object.entries(grouped)) {
      const titleEl = document.querySelector(`#${sectionId} .section-title`);
      const title = titleEl?.textContent || SECTIE_LABELS_NAV[sectionId] || sectionId;
      prompt += `▸ ${title.toUpperCase()}\n`;
      notes.forEach(n => {
        prompt += `  [${n.author}, ${formatDate(n.created_at)}]\n  "${n.text}"\n\n`;
      });
    }
  }

  prompt += `${'='.repeat(55)}\n`;
  prompt += `VERZOEK AAN CLAUDE:\n`;
  prompt += `Analyseer bovenstaande notities en:\n`;
  prompt += `1. Verwerk inhoudelijke inzichten in de relevante secties van het plan\n`;
  prompt += `2. Stel concrete aanpassingen voor in SWOT, prioriteiten of 5-jarenplan\n`;
  prompt += `3. Beantwoord vragen die teamleden hebben gesteld\n`;
  prompt += `4. Geef aan welke notities direct verwerkt kunnen worden en welke nader overleg vragen\n`;
  prompt += `5. Houd de kern altijd in het oog: discipelschap als basis, drie bewegingen als structuur\n`;

  navigator.clipboard.writeText(prompt).then(() => {
    btn.textContent = '✓ Prompt gekopieerd!';
    setTimeout(() => btn.textContent = '📋 Exporteer als prompt', 2500);
  }).catch(() => {
    const blob = new Blob([prompt], { type: 'text/plain' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'notities-prompt.txt';
    a.click();
    btn.textContent = '📋 Exporteer als prompt';
  });
}

// ── ALLE NOTITIES PAGINA ──
const SECTIE_LABELS = {
  intro:         '🏠 Introductie',
  aanpak:        '🗺️ Onze aanpak',
  visie:         '✝️ Visie CGK Zwolle',
  bronnen:       '📚 Bronnen',
  situatie:      '🔍 Huidige situatie',
  swot:          '📊 SWOT-analyse',
  ssdu:          '🎯 Start / Stop / Update',
  trends:        '📈 Trends vrijwilligers',
  vijfjarenplan: '🗓️ 5-Jarenplan',
  jaarplan:      '✅ Jaarplan 2026/2027',
  'lg-1114':     '🟢 11–14 jaar',
  'lg-1416':     '🟡 14–16 jaar',
  'lg-1618':     '🔴 16–18 jaar (GAT)',
  'lg-1822':     '🔵 18–22 jaar',
  'lg-2225':     '🟣 22–25 jaar',
};

async function laadAlleNotities() {
  const container = document.getElementById('alle-notities-container');
  if (!container) return;
  container.innerHTML = '<p style="color:var(--text-muted);font-size:0.9rem">Laden...</p>';

  let data;
  try {
    data = await db.select();
  } catch (e) {
    container.innerHTML = '<p style="color:var(--red)">Fout bij laden van notities.</p>';
    return;
  }

  // Tijdstip bijwerken
  const lastUpdated = document.getElementById('notes-last-updated');
  if (lastUpdated) lastUpdated.textContent = `Bijgewerkt om ${new Date().toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' })}`;

  // Groepeer per sectie in de juiste volgorde
  const grouped = {};
  Object.keys(SECTIE_LABELS).forEach(id => { grouped[id] = []; });
  (data || []).forEach(n => {
    if (!grouped[n.section_id]) grouped[n.section_id] = [];
    grouped[n.section_id].push(n);
  });

  const savedName = localStorage.getItem('note_author') || '';
  let html = '';
  let heeftNotities = false;

  for (const [sectionId, notes] of Object.entries(grouped)) {
    const label = SECTIE_LABELS[sectionId] || sectionId;
    heeftNotities = heeftNotities || notes.length > 0;

    html += `
      <div class="notities-sectie" id="alle-sectie-${sectionId}">
        <div class="notities-sectie-header">
          <div class="notities-sectie-titel">
            ${escapeHtml(label)}
            <span class="notities-sectie-count">${notes.length}</span>
          </div>
        </div>
    `;

    if (notes.length === 0) {
      html += `<p style="color:var(--text-muted);font-size:0.85rem;margin-bottom:0.75rem;font-style:italic">Nog geen notities voor dit onderdeel.</p>`;
    } else {
      notes.forEach(n => {
        html += `
          <div class="notitie-kaart" id="notitie-${n.id}">
            <div class="notitie-kaart-header">
              <div class="notitie-kaart-meta">✍️ ${escapeHtml(n.author)} &nbsp;·&nbsp; ${formatDate(n.created_at)}</div>
              <div class="notitie-kaart-acties">
                <button class="notitie-actie-btn" onclick="bewerkNotitie('${n.id}', \`${escapeHtml(n.text).replace(/`/g, '\\`')}\`)">✏️ Bewerk</button>
                <button class="notitie-actie-btn verwijder" onclick="verwijderNotitieOverzicht('${n.id}', '${sectionId}')">🗑️ Verwijder</button>
              </div>
            </div>
            <div class="notitie-kaart-tekst" id="tekst-${n.id}">${escapeHtml(n.text).replace(/\n/g, '<br>')}</div>
            <div class="notitie-edit-form" id="edit-${n.id}"></div>
          </div>
        `;
      });
    }

    // Toevoegen-formulier per sectie
    html += `
      <div class="notitie-toevoegen-sectie">
        <button class="notitie-toevoegen-toggle" onclick="toggleToevoegen('${sectionId}')">
          ＋ Notitie toevoegen aan dit onderdeel
        </button>
        <div class="notitie-toevoegen-form" id="toevoegen-${sectionId}">
          <input type="text" id="toevoegen-naam-${sectionId}" placeholder="Jouw naam" maxlength="40" value="${escapeHtml(savedName)}">
          <textarea id="toevoegen-tekst-${sectionId}" rows="3" placeholder="Schrijf hier je notitie..."></textarea>
          <div style="display:flex;gap:0.5rem">
            <button class="notitie-edit-opslaan" onclick="slaToevoegingOp('${sectionId}')">Opslaan</button>
            <button class="notitie-edit-annuleer" onclick="toggleToevoegen('${sectionId}')">Annuleer</button>
          </div>
        </div>
      </div>
      <hr class="notitie-sectie-divider">
    `;

    html += `</div>`;
  }

  if (!heeftNotities) {
    container.innerHTML = `
      <div class="card" style="text-align:center;padding:2rem">
        <p style="font-size:2rem;margin-bottom:0.75rem">💬</p>
        <p style="font-weight:600;margin-bottom:0.25rem">Nog geen notities</p>
        <p style="color:var(--text-muted);font-size:0.875rem">Voeg de eerste notitie toe via een onderdeel hierboven of via de knoppen in het plan.</p>
      </div>
      ${html}
    `;
  } else {
    container.innerHTML = html;
  }
}

function toggleToevoegen(sectionId) {
  const form = document.getElementById(`toevoegen-${sectionId}`);
  if (!form) return;
  form.classList.toggle('open');
  if (form.classList.contains('open')) {
    form.querySelector('textarea')?.focus();
  }
}

async function slaToevoegingOp(sectionId) {
  const nameInput = document.getElementById(`toevoegen-naam-${sectionId}`);
  const textInput = document.getElementById(`toevoegen-tekst-${sectionId}`);
  const name = nameInput?.value.trim() || 'Anoniem';
  const text = textInput?.value.trim();
  if (!text) return;

  localStorage.setItem('note_author', name);
  document.querySelectorAll('.note-name-input').forEach(el => el.value = name);

  const btn = document.querySelector(`#toevoegen-${sectionId} .notitie-edit-opslaan`);
  if (btn) { btn.disabled = true; btn.textContent = 'Opslaan...'; }

  try {
    await db.insert({ section_id: sectionId, author: name, text });
  } catch (e) {
    alert('Er ging iets mis. Probeer opnieuw.');
    if (btn) { btn.disabled = false; btn.textContent = 'Opslaan'; }
    return;
  }

  await laadAlleNotities();
  // Ook tellers op andere pagina bijwerken
  renderNotes(sectionId);
}

function bewerkNotitie(noteId, huidigeTekst) {
  const editDiv = document.getElementById(`edit-${noteId}`);
  const tekstDiv = document.getElementById(`tekst-${noteId}`);
  if (!editDiv || !tekstDiv) return;

  // Als al open, sluit
  if (editDiv.innerHTML !== '') {
    editDiv.innerHTML = '';
    tekstDiv.style.display = '';
    return;
  }

  tekstDiv.style.display = 'none';
  editDiv.innerHTML = `
    <textarea rows="4" style="width:100%;border:1px solid #FDE68A;border-radius:8px;padding:0.6rem 0.75rem;font-size:0.875rem;font-family:Inter,sans-serif;resize:vertical;margin-top:0.5rem">${huidigeTekst.replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&amp;/g,'&').replace(/&quot;/g,'"').replace(/<br>/g,'\n')}</textarea>
    <div style="display:flex;gap:0.5rem;margin-top:0.5rem">
      <button class="notitie-edit-opslaan" onclick="slaBewerkinOp('${noteId}', this)">Opslaan</button>
      <button class="notitie-edit-annuleer" onclick="annuleerBewerking('${noteId}')">Annuleer</button>
    </div>
  `;
  editDiv.querySelector('textarea')?.focus();
}

async function slaBewerkinOp(noteId, btn) {
  const editDiv = document.getElementById(`edit-${noteId}`);
  const textarea = editDiv?.querySelector('textarea');
  const text = textarea?.value.trim();
  if (!text) return;

  btn.disabled = true;
  btn.textContent = 'Opslaan...';

  try {
    await db.update(noteId, { text });
  } catch (e) {
    alert('Er ging iets mis. Probeer opnieuw.');
    btn.disabled = false;
    btn.textContent = 'Opslaan';
    return;
  }

  await laadAlleNotities();
}

function annuleerBewerking(noteId) {
  const editDiv = document.getElementById(`edit-${noteId}`);
  const tekstDiv = document.getElementById(`tekst-${noteId}`);
  if (editDiv) editDiv.innerHTML = '';
  if (tekstDiv) tekstDiv.style.display = '';
}

async function verwijderNotitieOverzicht(noteId, sectionId) {
  if (!confirm('Weet je zeker dat je deze notitie wilt verwijderen?')) return;
  try { await db.delete(noteId); } catch (e) { alert('Er ging iets mis.'); return; }
  await laadAlleNotities();
  renderNotes(sectionId);
}

function initAlleNotities() {
  const refreshBtn = document.getElementById('refresh-notes-btn');
  if (refreshBtn) refreshBtn.addEventListener('click', laadAlleNotities);

  // Laad automatisch als de sectie zichtbaar wordt
  const sectie = document.getElementById('allenotities');
  if (sectie) {
    const obs = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting) {
        laadAlleNotities();
        obs.disconnect();
      }
    }, { threshold: 0.1 });
    obs.observe(sectie);
  }
}

// ── HULPFUNCTIES ──
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatDate(iso) {
  return new Date(iso).toLocaleDateString('nl-NL', { day: 'numeric', month: 'long', year: 'numeric' });
}

// ── DASHBOARD ──
async function dbFetch(tabel, params = '') {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${tabel}?select=*${params}`, { headers: HEADERS });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

async function laadDashboard() {
  try {
    // Vragenlijst status (geen created_at in responses)
    const responses = await dbFetch('responses', '');
    const ingevuld = [...new Set((responses || []).map(r => r.author))];
    const vlNr = document.getElementById('dash-vl-nr');
    if (vlNr) {
      vlNr.textContent = ingevuld.length + '/3';
      vlNr.className = 'dash-stat-nr ' + (ingevuld.length === 3 ? 'green' : ingevuld.length > 0 ? 'yellow' : 'red');
    }
  } catch(e) { console.error('Dashboard VL fout:', e); }

  try {
    // Open notities
    const notes = await db.select();
    const openNotes = (notes || []).filter(n => !n.besproken).length;
    const notitiesNr = document.getElementById('dash-notities-nr');
    if (notitiesNr) {
      notitiesNr.textContent = openNotes;
      notitiesNr.className = 'dash-stat-nr ' + (openNotes === 0 ? 'green' : openNotes < 5 ? 'yellow' : 'red');
    }

    // Recente activiteit
    const recentContainer = document.getElementById('dash-recent');
    if (recentContainer) {
      const recentNotes = (notes || []).slice(-5).reverse();
      if (recentNotes.length === 0) {
        recentContainer.innerHTML = '<p style="color:var(--text-muted);font-size:0.875rem">Nog geen notities.</p>';
      } else {
        recentContainer.innerHTML = '<div class="dash-recent-list">' +
          recentNotes.map(n => `
            <div class="dash-recent-item">
              <div class="dash-recent-meta">${escapeHtml(n.author)} · ${formatDate(n.created_at)} · <em>${escapeHtml(SECTIE_LABELS_NAV[n.section_id] || n.section_id)}</em></div>
              <div>${escapeHtml(n.text).substring(0, 80)}${n.text.length > 80 ? '...' : ''}</div>
            </div>`).join('') + '</div>';
      }
    }
  } catch(e) { console.error('Dashboard notities fout:', e); }

  try {
    // Prioriteiten zonder trekker (geen created_at in priorities)
    const prios = await dbFetch('priorities', '');
    const alleIds = ['p1','p2','p3','p4','p5','p6','p7','p8','p9','p10','p11'];
    const metTrekker = (prios || []).filter(p => p.trekker && p.trekker !== '').map(p => p.priority_id);
    const zonderTrekker = alleIds.filter(id => !metTrekker.includes(id)).length;
    const prioNr = document.getElementById('dash-prio-nr');
    if (prioNr) {
      prioNr.textContent = zonderTrekker;
      prioNr.className = 'dash-stat-nr ' + (zonderTrekker === 0 ? 'green' : zonderTrekker < 5 ? 'yellow' : 'red');
    }
  } catch(e) { console.error('Dashboard prio fout:', e); }
}

const SECTIE_LABELS_NAV = {
  dashboard: 'Dashboard', intro: 'Introductie', aanpak: 'Aanpak', visie: 'Visie',
  bronnen: 'Bronnen', situatie: 'Situatie', swot: 'SWOT', ssdu: 'Start/Stop',
  trends: 'Trends', vijfjarenplan: '5-Jarenplan', leeftijden: 'Leeftijden',
  prioriteiten: 'Prioriteiten', vragenlijst: 'Vragenlijst', allenotities: 'Notities',
  'lg-1114': '11–14 jaar', 'lg-1416': '14–16 jaar', 'lg-1618': '16–18 jaar (GAT)',
  'lg-1822': '18–22 jaar', 'lg-2225': '22–25 jaar'
};

function initDashboard() {
  const sectie = document.getElementById('dashboard');
  if (!sectie) return;
  const obs = new IntersectionObserver(entries => {
    if (entries[0].isIntersecting) { laadDashboard(); obs.disconnect(); }
  }, { threshold: 0.1 });
  obs.observe(sectie);
}

// ── PRIORITEITEN EIGENAARSCHAP ──
const TREKKERS = [
  { id: 'Timon', label: 'Ti' },
  { id: 'Leonie', label: 'Le' },
  { id: 'Thijs', label: 'Th' },
  { id: 'Samen', label: '🤝' },
];

const STATUSSEN = ['open', 'loopt', 'klaar'];
const STATUS_LABELS = { open: '📋 Open', loopt: '🔄 Loopt', klaar: '✅ Klaar' };

let prioCache = {};

async function laadPrioriteiten() {
  try {
    const data = await dbFetch('priorities', '');
    prioCache = {};
    (data || []).forEach(p => { prioCache[p.priority_id] = p; });
    document.querySelectorAll('.priority-card[data-pid]').forEach(card => {
      renderPrioOwner(card.dataset.pid);
    });
  } catch(e) { console.error('Prioriteiten fout:', e); }
}

function renderPrioOwner(pid) {
  const row = document.getElementById(`owner-${pid}`);
  if (!row) return;
  const staat = prioCache[pid] || { trekker: '', status: 'open' };
  const trekkerBtns = TREKKERS.map(t =>
    `<button class="trekker-btn ${staat.trekker === t.id ? 'actief' : ''}"
      onclick="setTrekker('${pid}','${t.id}')" title="${t.id}">${t.label}</button>`
  ).join('');
  const nextStatus = STATUSSEN[(STATUSSEN.indexOf(staat.status) + 1) % STATUSSEN.length];
  row.innerHTML = `
    <span class="prio-owner-label">Trekker:</span>
    ${trekkerBtns}
    <button class="status-pill ${staat.status}" onclick="setStatus('${pid}','${nextStatus}')">
      ${STATUS_LABELS[staat.status] || staat.status}
    </button>`;
}

async function opslaanPrio(pid, velden) {
  const huidig = prioCache[pid];
  const nieuw = {
    priority_id: pid,
    trekker: huidig?.trekker || '',
    status: huidig?.status || 'open',
    ...velden,
    updated_at: new Date().toISOString()
  };
  // Upsert via POST met merge-duplicates (werkt voor elke situatie)
  const r = await fetch(`${SUPABASE_URL}/rest/v1/priorities`, {
    method: 'POST',
    headers: { ...HEADERS, 'Prefer': 'return=representation,resolution=merge-duplicates' },
    body: JSON.stringify(nieuw)
  });
  if (!r.ok) throw new Error(await r.text());
  prioCache[pid] = nieuw;
}

async function setTrekker(pid, trekker) {
  const huidig = prioCache[pid];
  const nieuweTrekker = huidig?.trekker === trekker ? '' : trekker;
  try {
    await opslaanPrio(pid, { trekker: nieuweTrekker });
    renderPrioOwner(pid);
    laadDashboard();
  } catch(e) { console.error('Trekker fout:', e); }
}

async function setStatus(pid, status) {
  try {
    await opslaanPrio(pid, { status });
    renderPrioOwner(pid);
  } catch(e) { console.error('Status fout:', e); }
}

function initPrioriteiten() {
  const sectie = document.getElementById('prioriteiten');
  if (!sectie) return;
  const obs = new IntersectionObserver(entries => {
    if (entries[0].isIntersecting) { laadEnRenderPrioriteiten(); obs.disconnect(); }
  }, { threshold: 0.1 });
  obs.observe(sectie);
}

// ── NOTITIES BESPROKEN ──
async function markeerBesproken(noteId, sectionId, huidigeWaarde) {
  try {
    const url = `${SUPABASE_URL}/rest/v1/notes?id=eq.${noteId}`;
    const r = await fetch(url, { method: 'PATCH', headers: HEADERS, body: JSON.stringify({ besproken: !huidigeWaarde }) });
    if (!r.ok) throw new Error(await r.text());
    renderNotes(sectionId);
    laadDashboard();
  } catch(e) { console.error('Besproken fout:', e); }
}

// ── JAAR TIJDLIJN ──
const JAAR_DETAILS = {
  j1: { jaar: '2026/2027', thema: '✨ Ontmoeten — de basis leggen',
    items: [
      'Geloofskern verankeren: elk programma heeft een bewust formatiemoment',
      'Mentorrelaties pilot: 15 jongeren gekoppeld aan een volwassene die meeloopt',
      '#Durfte: talent → Koninkrijk-koppeling expliciet en bewust maken',
      'Jeugdhonk: eerste open avonden als laagdrempelige ontmoetingsplek',
      'Jongeren op zichtbare plekken in de gemeente: voorgaan, leiden, dienen',
      'Overgangsaanpak: persoonlijk gesprek bij 14 en 18 jaar'
    ]
  },
  j2: { jaar: '2027/2028', thema: '🌱 Gevormd worden — mensen die meelopen',
    items: [
      'Mentorrelaties uitbreiden naar 40+ jongeren',
      'Leiderschapspijplijn: jongeren uit #Durfte worden co-leiders',
      'Ouders als geloofspartners: structurele samenwerking thuis + kerk',
      'Discipelschapsgesprekken: kleine groepjes (3-5) die samen lopen met Jezus',
      'Gen Z-zoekers bereiken via jeugdhonk en online aanwezigheid',
      'Eerste meting: worden jongeren écht gevormd of vullen we programma\'s?'
    ]
  },
  j3: { jaar: '2028/2029', thema: '🔥 Meenemen — jongeren die anderen meenemen',
    items: [
      'Jongeren die zelf andere jongeren meenemen in het geloof — peer discipleship',
      'CGK Zwolle missionair: jongeren leven hun geloof in Zwolle',
      'Intergenerationele momenten: generaties leren van en met elkaar',
      'Leiderschapspijplijn levert eerste eigen jeugdleiders op',
      'Jeugdhonk als missionair ankerpunt in de wijk',
      'Discipelschapscultuur geëvalueerd en aangescherpt'
    ]
  },
  j4: { jaar: '2029/2030', thema: '🏗️ Duurzaam — wat we bouwen staat',
    items: [
      'Doorgaande discipelschapsroute 12–25 jaar: bewust, aaneengesloten, overdraagbaar',
      'Programma\'s toetsen: draagt dit bij aan echte vorming? Stoppen wat niet werkt.',
      'Kennis documenteren — niet in hoofden maar overdraagbaar',
      'Tussentijdse evaluatie 5-jarenplan met het team en de jongeren zelf',
      'Vrijwilligers: mensen gevoed door visie, gevormd als discipelen'
    ]
  },
  j5: { jaar: '2030/2031', thema: '🌳 Bloeien — ter eer van God',
    items: [
      'CGK Zwolle: een gemeente waar jongeren worden gevormd als echte volgelingen van Jezus',
      'Jongeren uit 2026 zijn nu leiders van 22-25 jaar — ze nemen anderen mee',
      'Meten: niet hoeveel programma\'s maar hoeveel levens veranderd zijn',
      'Vieren — niet om onszelf maar ter eer van God',
      'Lessen delen via CGJO en andere kerken',
      'Nieuw 5-jarenplan vanuit wat God heeft gedaan'
    ]
  },
};

function toggleJaarDetail(jaarId) {
  const wrap = document.getElementById('jaar-detail-wrap');
  if (!wrap) return;
  const detail = wrap.querySelector('.jaar-tl-detail');
  if (detail && detail.dataset.jid === jaarId) {
    detail.classList.toggle('open');
    return;
  }
  const info = JAAR_DETAILS[jaarId];
  if (!info) return;
  wrap.innerHTML = `
    <div class="jaar-tl-detail open" data-jid="${jaarId}">
      <h4>${info.jaar} — ${info.thema}</h4>
      <ul>${info.items.map(i => `<li>${i}</li>`).join('')}</ul>
    </div>`;
}

// ── ACCORDION ──
function toggleAccordion(id) {
  const body = document.getElementById(id);
  if (!body) return;
  const item = body.closest('.accordion-item');
  item.classList.toggle('open');
}

// ── VRAGENLIJST ──
let vlGekozenRol = null;
let vlHuidigeStap = 0;

// Vragen per sectie — gedeeld + rol-specifiek
const VL_SECTIES = {
  leonie: [
    {
      titel: '✨ Ontmoeten bij 11–15 jaar',
      beschrijving: 'Leonie, jij werkt met de jongste groep — 11 tot 15 jaar. De fundamentele vraag: wanneer ontmoeten jouw jongeren echt God?',
      vragen: [
        { id: 'score', type: 'schaal10', tekst: 'Hoe beoordeel je het jeugdwerk van CGK Zwolle nu als geheel?', labels: ['Moet echt beter', 'Is sterk'] },
        { id: 'l_ontmoeting', type: 'open', tekst: 'Wanneer zie jij dat jongeren van 11–15 jaar echt iets met God ervaren? Beschrijf een concreet moment.', hint: 'Denk aan een dienst, kamp, gesprek of activiteit dat beklijfde' },
        { id: 'l_dun_geloof', type: 'radio', tekst: 'Hoe sterk is het geloof van jouw jongeren gemiddeld?', opties: ['Diep — ze leven echt met Jezus', 'Oppervlakkig — het klinkt goed maar gaat niet ver', 'Onzichtbaar — geloof is nauwelijks zichtbaar in hun leven', 'Wisselend — sterk bij sommigen, nauwelijks bij anderen'] },
        { id: 'l_geloofsgesprek', type: 'schaal5', tekst: 'Hoe makkelijk gaan bij jou echte geloofsgesprekken met jongeren?', labels: ['Heel moeilijk', 'Heel natuurlijk'] },
        { id: 'l_overgang_kinder', type: 'open', tekst: 'Hoe verloopt de overgang van kinderwerk naar jouw groep? Wat gaat er verloren?', hint: '' },
      ]
    },
    {
      titel: '🌱 Gevormd worden — talent & Koninkrijk',
      beschrijving: 'Het hart van #Durfte: talenten inzetten voor Gods Koninkrijk. Hoe zit dat bij 11–15 jaar?',
      vragen: [
        { id: 'l_talent_koninkrijk', type: 'schaal5', tekst: 'In hoeverre zien jouw jongeren hun talent als iets voor Gods Koninkrijk?', labels: ['Dat verbinden ze niet', 'Dat is heel bewust'] },
        { id: 'l_discipelschap_concreet', type: 'open', tekst: 'Hoe ziet discipelschap er concreet uit bij jouw jongeren — niet als theorie, maar in de praktijk van elke week?', hint: '' },
        { id: 'l_ouders_geloof', type: 'open', tekst: 'Welke rol spelen ouders in het geloof van jouw jongeren? Wat zie je?', hint: 'Sticky Faith onderzoek: ouders zijn de krachtigste geloofsvormers' },
      ]
    },
    {
      titel: '🔥 Droom & prioriteit',
      beschrijving: 'Jouw visie op waar het naartoe moet.',
      vragen: [
        { id: 'l_droom', type: 'open', tekst: 'Het is 2031. Jouw jongeren van nu zijn 18–22 jaar. Wat hoop jij dat er van hen geworden is qua geloof?', hint: 'Niet in activiteiten maar in levens — hoe leven ze?' },
        { id: 'l_prioriteit', type: 'radio', tekst: 'Wat is voor jou de grootste prioriteit komend jaar?', opties: ['Echte geloofservaringen creëren (kamp, Texperience, bijbelstudie)', 'Discipelschap concreter maken in #DurfteZijn', 'Ouders bewuster betrekken als geloofspartners', 'Talent → Koninkrijk koppeling sterker maken', 'Betere overgang kinderwerk → jeugdwerk'] },
        { id: 'l_impact', type: 'open', tekst: 'De ene verandering die voor jouw groep het meeste impact zou hebben:', hint: '' },
        { id: 'l_energie', type: 'open', tekst: 'Wat geeft jou energie in dit werk? En wat kost de meeste energie?', hint: '' },
      ]
    }
  ],
  timon: [
    {
      titel: '✨ Ontmoeten — ziet het er bij ons naar uit?',
      beschrijving: 'Timon, jij bent coördinator met overzicht over 14–24 jaar. De centrale vraag voor het hele plan: ontmoeten onze jongeren echt God?',
      vragen: [
        { id: 'score', type: 'schaal10', tekst: 'Hoe beoordeel je het jeugdwerk van CGK Zwolle nu als geheel?', labels: ['Moet echt beter', 'Is sterk'] },
        { id: 't_ontmoeting', type: 'open', tekst: 'Beschrijf een moment waarvan jij dacht: "hier gebeurt het echt" — een moment van echte geloofservaring bij jongeren.', hint: '' },
        { id: 't_dun_geloof', type: 'schaal5', tekst: 'Hoe groot is het risico op dun geloof (Moralistic Therapeutic Deism) bij onze jongeren?', labels: ['Klein risico', 'Groot risico'] },
        { id: 't_discipelschap_kloof', type: 'open', tekst: 'Waar zit de grootste kloof tussen onze visie (discipelschap) en de praktijk van iedere week?', hint: '' },
      ]
    },
    {
      titel: '🌱 Gevormd worden — talent, mentoren, Koninkrijk',
      beschrijving: 'De drie bewegingen vragen om mensen die meelopen. Hoe staat het daar voor bij ons?',
      vragen: [
        { id: 't_durfte_kern', type: 'open', tekst: '#Durfte is jullie sterkste concept. Wanneer is de koppeling talent → Koninkrijk echt zichtbaar? En wanneer niet?', hint: '' },
        { id: 't_mentoren', type: 'schaal5', tekst: 'Hoeveel volwassenen lopen er nu echt persoonlijk mee met een jongere in hun geloofsweg?', labels: ['Bijna niemand', 'Heel veel'] },
        { id: 't_blindspot', type: 'open', tekst: 'Wat zie jij als coördinator dat je collega\'s misschien niet zien?', hint: '' },
        { id: 't_gemeente', type: 'open', tekst: 'Hoe kan de bredere gemeente (volwassenen, kringen, predikanten) meer bij de discipelvorming van jongeren betrokken worden?', hint: '' },
      ]
    },
    {
      titel: '🔥 Meenemen — droom voor Zwolle',
      beschrijving: 'Het einddoel: jongeren die anderen meenemen. Jouw visie hierop.',
      vragen: [
        { id: 't_prioriteit', type: 'checkbox3', tekst: 'Wat zijn jouw top 3 prioriteiten voor dit jaar (vanuit de drie bewegingen)?', opties: ['Geloofskern in elk programma inbouwen (Ontmoeten)', 'Mentorrelaties opstarten — mensen die meelopen (Vormen)', 'Echte geloofservaringen vermenigvuldigen (Ontmoeten)', 'Jongeren zichtbaar als kerk van vandaag (Meenemen)', '#Durfte: talent → Koninkrijk bewust koppelen (Vormen)', 'Gen Z-zoekers bereiken via jeugdhonk (Meenemen)', 'Ouders als geloofspartners activeren (Vormen)'] },
        { id: 't_droom', type: 'open', tekst: 'Het is 2031. CGK Zwolle staat bekend als een gemeente waar jongeren echt worden gevormd als volgelingen van Jezus. Wat is er dan anders dan nu?', hint: '' },
        { id: 't_energie', type: 'open', tekst: 'Wat geeft jou energie in dit werk? En wat kost de meeste energie?', hint: '' },
      ]
    }
  ],
  thijs: [
    {
      titel: '✨ Ontmoeten bij 16–24 jaar',
      beschrijving: 'Thijs, jij werkt in de meest kwetsbare fase — 16 tot 24 jaar. Emerging adulthood. De vraag: ontmoeten ze echt God, of is het een gewoonte?',
      vragen: [
        { id: 'score', type: 'schaal10', tekst: 'Hoe beoordeel je het jeugdwerk van CGK Zwolle nu als geheel?', labels: ['Moet echt beter', 'Is sterk'] },
        { id: 'th_ontmoeting', type: 'open', tekst: 'Wanneer zie jij bij 16–24 jarigen dat geloof echt diep gaat — een moment van echte ontmoeting met God?', hint: '' },
        { id: 'th_dun_geloof', type: 'open', tekst: 'Herken jij bij jouw jongeren het risico op dun geloof — geloof dat eruitziet als christendom maar weinig kost en weinig verandert?', hint: 'Kenda Creasy Dean noemt dit Moralistic Therapeutic Deism' },
        { id: 'th_connect_geloof', type: 'open', tekst: 'Is Connect een plek van echte discipelvorming? Of meer een gezellige Bijbelstudie? Wat zie jij?', hint: '' },
      ]
    },
    {
      titel: '🌱 Gevormd worden — talent voor het Koninkrijk',
      beschrijving: 'Het hart van het plan: 16–24 jarigen die hun talenten inzetten voor Gods Koninkrijk.',
      vragen: [
        { id: 'th_talent', type: 'open', tekst: 'Zie jij 16–24 jarigen hun talenten inzetten voor Gods Koninkrijk? Geef een voorbeeld — of geef eerlijk aan wat er mist.', hint: '' },
        { id: 'th_meelopen', type: 'schaal5', tekst: 'Hoe goed lopen volwassenen persoonlijk mee met jongeren van 16–24 in hun geloofsweg?', labels: ['Bijna niemand', 'Heel veel'] },
        { id: 'th_roeping', type: 'open', tekst: 'Ervaren 16–24 jarigen bij ons een gevoel van roeping — dat God hen gebruikt voor iets groters? Of voelt geloof meer als een extra verplichting?', hint: '' },
      ]
    },
    {
      titel: '🔥 Meenemen — jongeren die anderen meenemen',
      beschrijving: 'Het einddoel van de drie bewegingen: jongeren die andere jongeren meenemen.',
      vragen: [
        { id: 'th_meenemen', type: 'open', tekst: 'Ken jij jongeren van 16–24 die actief andere jongeren meenemen in het geloof? Wat maakt dat zij dat doen?', hint: '' },
        { id: 'th_zwolle', type: 'open', tekst: 'Hoe kunnen jouw jongeren meer missionair zijn in Zwolle — niet als project maar als levensstijl?', hint: '' },
        { id: 'th_prioriteit', type: 'radio', tekst: 'Wat is voor jou de grootste prioriteit komend jaar?', opties: ['Echte geloofservaringen creëren bij 16-24 jaar', 'Discipelschap verdiepen bij 16-18 jaar', 'Jongeren hun talent laten inzetten voor Koninkrijk', 'Connect meer als discipel-gemeenschap vormgeven', 'Jongeren missionaire levensstijl aanleren'] },
        { id: 'th_energie', type: 'open', tekst: 'Wat geeft jou energie in dit werk? En wat kost de meeste energie?', hint: '' },
      ]
    }
  ]
};

const VL_LABELS = {};
['leonie','timon','thijs'].forEach(rol => {
  VL_SECTIES[rol].forEach(s => s.vragen.forEach(v => { VL_LABELS[v.id] = v.tekst; }));
});

function kiesRol(rol) {
  vlGekozenRol = rol;
  ['leonie','timon','thijs'].forEach(r => {
    document.getElementById(`rol-${r}`)?.classList.toggle('selected', r === rol);
  });
}

// Versie van de vragenlijst — verhoog dit als de vragen ingrijpend veranderen
const VL_VERSIE = 'v2';

function vlStap0Verder() {
  if (!vlGekozenRol) { alert('Kies eerst wie jij bent.'); return; }
  const ingevuldeVersie = localStorage.getItem(`vl_ingevuld_${vlGekozenRol}`);
  // Alleen blokkeren als dezelfde versie al is ingevuld
  if (ingevuldeVersie === VL_VERSIE) {
    document.getElementById('vl-formulier').style.display = 'none';
    const naam = vlGekozenRol.charAt(0).toUpperCase() + vlGekozenRol.slice(1);
    document.getElementById('vl-klaar-melding').innerHTML = `
      <div class="vl-klaar-banner">
        <div class="vl-klaar-icon">✅</div>
        <h3>Bedankt, ${naam}!</h3>
        <p style="margin-bottom:1rem">Je hebt de vragenlijst al ingevuld.</p>
        <button onclick="localStorage.removeItem('vl_ingevuld_${vlGekozenRol}');location.reload()" style="background:rgba(255,255,255,0.25);color:white;border:1px solid rgba(255,255,255,0.5);border-radius:8px;padding:0.5rem 1.25rem;font-size:0.875rem;cursor:pointer;font-family:Inter,sans-serif">
          🔄 Opnieuw invullen
        </button>
      </div>`;
    return;
  }
  vlHuidigeStap = 0;
  bouwVragenlijst();
}

function bouwVragenlijst() {
  const secties = VL_SECTIES[vlGekozenRol];
  const namen = { leonie: 'Leonie', timon: 'Timon', thijs: 'Thijs' };
  const naam = namen[vlGekozenRol];

  // Begroeting
  const begroetingen = {
    leonie: `Hey Leonie! Jij werkt het meest met 11–15 jarigen en kent die groep als geen ander. Jouw eerlijke kijk op wat werkt en wat niet, is goud waard voor dit plan. Dit duurt zo'n 10 minuten.`,
    timon: `Hey Timon! Als coördinator zie jij het grote plaatje én de dagelijkse praktijk. Jouw antwoorden vormen de kern van de teamanalyse. Dit duurt zo'n 10 minuten.`,
    thijs: `Hey Thijs! Jij werkt met de fase die het meest kwetsbaar is — 16 tot 24 jaar. Jouw observaties zijn cruciaal voor het plan. Dit duurt zo'n 10 minuten.`
  };

  document.getElementById('vl-begroeting').innerHTML = `
    <h3>${naam}</h3>
    <p>${begroetingen[vlGekozenRol]}</p>`;

  // Stappenbalk
  document.getElementById('vl-stappen-balk').innerHTML = secties.map((s, i) =>
    `<div class="vl-step-tab ${i === 0 ? 'active' : ''}" id="vl-tab-${i}">${i+1}. ${s.titel.replace(/^.+?\s/, '')}</div>`
  ).join('') + `<div class="vl-step-tab" id="vl-tab-${secties.length}">${secties.length+1}. Klaar</div>`;

  // Toon eerste stap
  document.getElementById('vl-stap-0').style.display = 'none';
  document.getElementById('vl-vragen-wrap').style.display = 'block';
  toonStap(0);
}

function toonStap(stap) {
  const secties = VL_SECTIES[vlGekozenRol];
  vlHuidigeStap = stap;

  // Update tabs
  secties.forEach((_, i) => {
    const tab = document.getElementById(`vl-tab-${i}`);
    if (!tab) return;
    tab.classList.remove('active', 'done');
    if (i < stap) tab.classList.add('done');
    if (i === stap) tab.classList.add('active');
  });

  const inhoud = document.getElementById('vl-vragen-inhoud');
  const sectie = secties[stap];

  let html = `<div style="margin-bottom:1.5rem">
    <div style="font-size:0.78rem;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:var(--text-muted);margin-bottom:0.35rem">Stap ${stap+1} van ${secties.length}</div>
    <div style="font-family:'Playfair Display',serif;font-size:1.25rem;font-weight:700;margin-bottom:0.35rem">${sectie.titel}</div>
    <div style="color:var(--text-muted);font-size:0.875rem">${sectie.beschrijving}</div>
  </div>`;

  sectie.vragen.forEach((v, qi) => {
    html += renderVraag(v, qi + 1 + stap * 10);
  });

  html += `<div class="vl-nav-bar">
    ${stap > 0 ? `<button class="vl-knop-terug" onclick="vlTerug()">← Terug</button>` : '<span></span>'}
    <button class="vl-knop-verder ${stap === secties.length - 1 ? 'verstuur' : ''}" onclick="vlVerder()">
      ${stap === secties.length - 1 ? '✓ Versturen' : 'Volgende →'}
    </button>
  </div>`;

  inhoud.innerHTML = html;
  inhoud.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function renderVraag(v, nr) {
  let inputHtml = '';
  if (v.type === 'schaal10') {
    const knoppen = [1,2,3,4,5,6,7,8,9,10].map(n =>
      `<button class="vl-schaal-knop" data-qid="${v.id}" data-val="${n}" onclick="kiesSchaal(this)">${n}</button>`
    ).join('');
    inputHtml = `<div class="vl-schaal-wrap"><div class="vl-schaal-knoppen">${knoppen}</div><div class="vl-schaal-labels"><span>${v.labels[0]}</span><span>${v.labels[1]}</span></div></div>`;
  } else if (v.type === 'schaal5') {
    const knoppen = [1,2,3,4,5].map(n =>
      `<button class="vl-schaal-knop" data-qid="${v.id}" data-val="${n}" onclick="kiesSchaal(this)">${n}</button>`
    ).join('');
    inputHtml = `<div class="vl-schaal-wrap"><div class="vl-schaal-knoppen">${knoppen}</div><div class="vl-schaal-labels"><span>${v.labels[0]}</span><span>${v.labels[1]}</span></div></div>`;
  } else if (v.type === 'radio') {
    const opties = v.opties.map(o =>
      `<label class="vl-optie"><input type="radio" name="${v.id}" value="${o}" onchange="markeerOptie(this)"> ${o}</label>`
    ).join('');
    inputHtml = `<div class="vl-opties">${opties}</div>`;
  } else if (v.type === 'checkbox3') {
    const opties = v.opties.map(o =>
      `<label class="vl-optie"><input type="checkbox" name="${v.id}" value="${o}" onchange="checkMax3(this)"> ${o}</label>`
    ).join('');
    inputHtml = `<div class="vl-opties" id="checkgrp-${v.id}">${opties}</div><div style="font-size:0.78rem;color:var(--text-muted);margin-top:0.35rem" id="teller-${v.id}">0 van 3 geselecteerd</div>`;
  } else if (v.type === 'open') {
    inputHtml = `<textarea class="vl-open-veld" id="open-${v.id}" placeholder="${v.hint || 'Schrijf hier jouw antwoord...'}" rows="3"></textarea>`;
  }
  return `<div class="vl-q-block">
    <div class="vl-q-nr">Vraag ${nr}</div>
    <div class="vl-q-tekst">${v.tekst}</div>
    ${v.hint && v.type !== 'open' ? `<div class="vl-q-hint">${v.hint}</div>` : ''}
    ${inputHtml}
  </div>`;
}

function kiesSchaal(btn) {
  const qid = btn.dataset.qid;
  document.querySelectorAll(`[data-qid="${qid}"]`).forEach(b => b.classList.remove('gekozen'));
  btn.classList.add('gekozen');
}

function markeerOptie(input) {
  const groep = input.closest('.vl-opties');
  if (!groep) return;
  groep.querySelectorAll('.vl-optie').forEach(o => o.classList.remove('gekozen'));
  input.closest('.vl-optie').classList.add('gekozen');
}

function checkMax3(input) {
  const name = input.name;
  const groep = document.getElementById(`checkgrp-${name}`);
  const teller = document.getElementById(`teller-${name}`);
  if (!groep) return;
  const aangevinkt = groep.querySelectorAll('input:checked');
  if (teller) teller.textContent = `${aangevinkt.length} van 3 geselecteerd`;
  if (aangevinkt.length >= 3) {
    groep.querySelectorAll('input:not(:checked)').forEach(cb => cb.disabled = true);
  } else {
    groep.querySelectorAll('input').forEach(cb => { cb.disabled = false; });
  }
  groep.querySelectorAll('.vl-optie').forEach(o => {
    o.classList.toggle('gekozen', o.querySelector('input').checked);
  });
}

function vlHaalAntwoord(v) {
  if (v.type === 'schaal10' || v.type === 'schaal5') {
    const btn = document.querySelector(`[data-qid="${v.id}"].gekozen`);
    return btn ? btn.dataset.val : '';
  }
  if (v.type === 'radio') {
    const el = document.querySelector(`input[name="${v.id}"]:checked`);
    return el ? el.value : '';
  }
  if (v.type === 'checkbox3') {
    return Array.from(document.querySelectorAll(`input[name="${v.id}"]:checked`)).map(e => e.value).join(' | ');
  }
  if (v.type === 'open') {
    const el = document.getElementById(`open-${v.id}`);
    return el ? el.value.trim() : '';
  }
  return '';
}

function vlVerder() {
  const secties = VL_SECTIES[vlGekozenRol];
  if (vlHuidigeStap < secties.length - 1) {
    toonStap(vlHuidigeStap + 1);
  } else {
    vlInsturen();
  }
}

function vlTerug() {
  if (vlHuidigeStap > 0) toonStap(vlHuidigeStap - 1);
  else {
    document.getElementById('vl-vragen-wrap').style.display = 'none';
    document.getElementById('vl-stap-0').style.display = 'block';
  }
}

async function vlInsturen() {
  const namen = { leonie: 'Leonie', timon: 'Timon', thijs: 'Thijs' };
  const naam = namen[vlGekozenRol];
  const secties = VL_SECTIES[vlGekozenRol];

  const knop = document.querySelector('.vl-knop-verder.verstuur');
  if (knop) { knop.disabled = true; knop.textContent = 'Opslaan...'; }

  const antwoorden = [];
  secties.forEach(s => s.vragen.forEach(v => {
    const a = vlHaalAntwoord(v);
    if (a) antwoorden.push({ author: naam, question_id: v.id, answers: a });
  }));

  try {
    for (const a of antwoorden) await dbResponses.insert(a);
    localStorage.setItem(`vl_ingevuld_${vlGekozenRol}`, VL_VERSIE);
    document.getElementById('vl-formulier').style.display = 'none';
    document.getElementById('vl-klaar-melding').innerHTML = `
      <div class="vl-klaar-banner">
        <div class="vl-klaar-icon">🙌</div>
        <h3>Bedankt, ${naam}!</h3>
        <p>Jouw antwoorden zijn opgeslagen. Zodra iedereen heeft ingevuld kan Timon de AI-prompt genereren om het plan verder aan te scherpen.</p>
      </div>`;
  } catch (e) {
    console.error(e);
    alert('Er ging iets mis. Probeer opnieuw.');
    if (knop) { knop.disabled = false; knop.textContent = '✓ Versturen'; }
  }
}

function initVragenlijst() {
  // Check al ingevuld voor alle rollen
  const check = document.getElementById('vl-klaar-melding');
  if (!check) return;
}

function vlNext(stap) { vlVerder(); }
function vlPrev(stap) { vlTerug(); }
function selectScale(btn) { kiesSchaal(btn); }
function initPrioMax() {}

async function laadVragenlijstResultaten() {
  const container = document.getElementById('vl-resultaten-container');
  container.innerHTML = '<p style="color:var(--text-muted);font-size:0.875rem">Laden...</p>';
  let data;
  try { data = await dbFetch('responses', ''); } catch (e) { container.innerHTML = '<p style="color:var(--red)">Fout bij laden.</p>'; return; }
  if (!data || data.length === 0) { container.innerHTML = '<p style="color:var(--text-muted);font-size:0.875rem">Nog geen antwoorden.</p>'; return; }

  const personen = [...new Set(data.map(r => r.author))];
  const grouped = {};
  data.forEach(r => {
    const key = `${r.author}__${r.question_id}`;
    grouped[r.question_id] = grouped[r.question_id] || [];
    if (!grouped[r.question_id].find(x => x.author === r.author)) grouped[r.question_id].push(r);
  });

  let html = `<div style="margin-bottom:1.25rem">
    <p style="font-size:0.85rem;font-weight:600;margin-bottom:0.5rem">Ingevuld door (${personen.length} van 3):</p>
    <div class="vl-personen-list">${personen.map(p=>`<span class="vl-persoon-chip">${escapeHtml(p)}</span>`).join('')}</div>
    ${personen.length < 3 ? `<p style="font-size:0.8rem;color:var(--text-muted);margin-top:0.5rem">Wacht op: ${['Leonie','Timon','Thijs'].filter(n=>!personen.includes(n)).join(', ')}</p>` : ''}
  </div>`;

  for (const [qid, antw] of Object.entries(grouped)) {
    const label = VL_LABELS[qid] || qid;
    html += `<div class="vl-antw-blok">
      <div class="vl-antw-vraag">${escapeHtml(label)}</div>
      ${antw.map(a => `<div class="vl-antw-rij"><span class="vl-antw-naam">${escapeHtml(a.author)}</span> — ${escapeHtml(a.answers || a.answer || '')}</div>`).join('')}
    </div>`;
  }
  container.innerHTML = html;
}

async function genereerPrompt() {
  const container = document.getElementById('vl-prompt-container');
  container.innerHTML = '<p style="color:var(--text-muted);font-size:0.875rem">Genereren...</p>';
  let data;
  try { data = await dbResponses.select(); } catch (e) { container.innerHTML = '<p style="color:var(--red)">Fout.</p>'; return; }
  if (!data || data.length === 0) { container.innerHTML = '<p style="color:var(--text-muted)">Nog geen antwoorden.</p>'; return; }

  const personen = [...new Set(data.map(r => r.author))];
  const perPersoon = {};
  data.forEach(r => {
    perPersoon[r.author] = perPersoon[r.author] || [];
    perPersoon[r.author].push(r);
  });

  let prompt = `TEAMANALYSE — CGK Zwolle Jeugdwerk\n`;
  prompt += `Ingevuld door: ${personen.join(', ')} (${personen.length} van 3 teamleden)\n`;
  prompt += `${'='.repeat(55)}\n\n`;
  prompt += `ACHTERGROND:\nCGK Zwolle heeft ~4900 leden, 50% onder 30 jaar. Het jeugdwerk richt zich op 12-25 jaar. `;
  prompt += `Teamleden: Leonie (11-15 jaar), Timon (14-24 jaar, coördinator), Thijs (16-24 jaar). `;
  prompt += `Grootste knelpunten: uitval na 14 jaar, gat bij 16-18 jaar, vrijwilligerstekort. `;
  prompt += `Sterktes: #DurfteZijn (75% opkomst), #Durfte (talentgericht GTI-model), kamptraditie, jonge gemeente.\n\n`;

  for (const [naam, antwoorden] of Object.entries(perPersoon)) {
    prompt += `── ${naam.toUpperCase()} ──\n`;
    antwoorden.forEach(a => {
      const label = VL_LABELS[a.question_id] || a.question_id;
      prompt += `${label}:\n  → ${a.answers || a.answer || ''}\n\n`;
    });
  }

  prompt += `${'='.repeat(55)}\nVERZOEK:\nAnalyseer de bovenstaande teamantwoorden en:\n`;
  prompt += `1. Benoem wat het team EENS is en waar SPANNING zit\n`;
  prompt += `2. Identificeer BLINDE VLEKKEN die het team niet ziet\n`;
  prompt += `3. Scherp de SWOT-analyse aan met nieuwe inzichten\n`;
  prompt += `4. Pas het PRIORITEITENBORD (Hoog/Middel/Later) aan\n`;
  prompt += `5. Geef 3-5 concrete ACTIEPUNTEN voor het team\n`;
  prompt += `6. Benoem de ONDERLINGE SPANNINGEN die aandacht vragen\n`;

  const promptTekst = prompt;
  container.innerHTML = `
    <div style="margin-top:1.25rem">
      <p style="font-size:0.875rem;font-weight:600;margin-bottom:0.75rem">🤖 Klaar — kopieer en plak in een nieuw gesprek met Claude:</p>
      <div class="vl-prompt-vak">${escapeHtml(promptTekst)}</div>
      <button class="vl-kopie-knop" id="prompt-kopieer-knop">📋 Kopieer prompt</button>
    </div>`;

  document.getElementById('prompt-kopieer-knop').addEventListener('click', () => {
    navigator.clipboard.writeText(promptTekst).then(() => {
      const k = document.getElementById('prompt-kopieer-knop');
      k.textContent = '✓ Gekopieerd!';
      setTimeout(() => k.textContent = '📋 Kopieer prompt', 2000);
    });
  });
}

// ── GLOBALE FUNCTIES (voor onclick in HTML) ──
// ── PRIORITEITENBORD INTERACTIEF ──
const BASE_CARDS = {
  // ── HOOG: dit jaar — ONTMOETEN & VORMEN ──
  p1:  { kolom:'hoog',   tag:'Discipelschap', tagClass:'tag-discipelschap', titel:'Geloofskern in elk programma',
         beschrijving:'Elke avond heeft een formatiemoment: niet informatie maar vorming. Wat betekent het om Jezus te volgen vandaag? Klein, concreet, structureel.' },
  p2:  { kolom:'hoog',   tag:'Ontmoeten',    tagClass:'tag-leiderschap',   titel:'Echte geloofservaringen vermenigvuldigen',
         beschrijving:'Kampen, Texperience, Chosen Connect: dit zijn de momenten waarop jongeren God ontmoeten. Meer van dit — bewuster ingezet op ontmoeting, niet op programma.' },
  p3:  { kolom:'hoog',   tag:'Vorming',      tagClass:'tag-discipelschap', titel:'Mentorrelaties opstarten',
         beschrijving:'Koppel 15 jongeren (16–22) aan een volwassene die niet preekt maar meeloopt. Sticky Faith onderzoek: dit is de sterkste factor voor blijvend geloof.' },
  p4:  { kolom:'hoog',   tag:'Koninkrijk',   tagClass:'tag-jeugdhonk',     titel:'#Durfte: talent → Koninkrijk bewust koppelen',
         beschrijving:'Jongeren ontdekken expliciet: mijn talent doet er toe voor Gods Koninkrijk. Niet als bijproduct maar als hart van het programma. Dit is wat vocation-onderzoek aanwijst.' },
  // ── MIDDEL: dit seizoen — MEENEMEN & BEREIKEN ──
  p5:  { kolom:'middel', tag:'Kerk vandaag', tagClass:'tag-leiderschap',   titel:'Jongeren zichtbaar als kerk van vandaag',
         beschrijving:'Geef jongeren echte, serieuze verantwoordelijkheid: voorgaan in diensten, leiden van kringen, dienen. Niet decoratief — als roeping.' },
  p6:  { kolom:'middel', tag:'Zoekers',      tagClass:'tag-jeugdhonk',     titel:'Gen Z-zoekers bereiken via jeugdhonk',
         beschrijving:'Er zijn jongeren in Zwolle die zoeken maar de weg niet weten. Het jeugdhonk is de laagdrempelige plek waar ze kunnen landen — geen programma, gewoon aanwezigheid.' },
  p7:  { kolom:'middel', tag:'Ouders',       tagClass:'tag-ouders',        titel:'Ouders als geloofspartners activeren',
         beschrijving:'Sticky Faith: ouders zijn de krachtigste geloofsvormers. Niet een ouderavond als beleid maar als echte samenwerking: wat doen we thuis, wat doen we samen?' },
  p8:  { kolom:'middel', tag:'Overgangen',   tagClass:'tag-overgangen',    titel:'Overgangsaanpak 14→16 en 16→18',
         beschrijving:'Bij elke overgang: persoonlijk gesprek + contactpersoon. Niemand valt ongemerkt weg — juist in deze fases bepaalt zich of geloof standhoudt.' },
  // ── LATER: volgend jaar ──
  p9:  { kolom:'later',  tag:'Leiderschap',  tagClass:'tag-leiderschap',   titel:'Leiderschapspijplijn: jongeren opleiden',
         beschrijving:'Jongeren uit #Durfte systematisch opleiden tot leiders via het leiderschapsvierkant. Discipelschap vermenigvuldigt zich als jongeren andere jongeren meenemen.' },
  p10: { kolom:'later',  tag:'Missie',       tagClass:'tag-discipelschap', titel:'CGK Zwolle missionair naar Zwolle',
         beschrijving:'Jongeren die hun geloof leven in de stad. Niet kerk-voor-de-stad als beleid, maar als levensstijl van de volgelingen die we vormen.' },
  p11: { kolom:'later',  tag:'Vrijwilligers', tagClass:'tag-vrijwilligers', titel:'Vrijwilligersaanpak vernieuwen',
         beschrijving:'Van brede oproep naar persoonlijke werving. Flexibele rollen (2–4 uur/maand). Vrijwilligers gevoed door visie, niet door nood — ze zijn deel van de missie.' },
};

let prioriteitenData = {}; // DB data per pid

function renderPrioriteitsKaart(pid, dbData) {
  const base = BASE_CARDS[pid] || {};
  const titel = dbData?.custom_titel || base.titel || '';
  const beschrijving = dbData?.custom_beschrijving || base.beschrijving || '';
  const tag = base.tag || '';
  const tagClass = base.tagClass || 'tag-structuur';

  return `<div class="priority-card" data-pid="${pid}" id="prio-card-${pid}">
    <span class="priority-card-tag ${tagClass}">${tag}</span>
    <h4 id="prio-titel-${pid}">${escapeHtml(titel)}</h4>
    <p id="prio-beschr-${pid}">${escapeHtml(beschrijving)}</p>
    <div class="prio-owner-row" id="owner-${pid}"></div>
    <div class="edit-acties">
      <div style="position:relative;display:inline-block">
        <button class="edit-knop" onclick="toggleKolomPopup('${pid}')">↕ Verplaats</button>
        <div class="kolom-popup" id="kolom-popup-${pid}">
          <button class="kolom-optie" onclick="verplaatsPrioriteit('${pid}','hoog')">🔴 Hoog</button>
          <button class="kolom-optie" onclick="verplaatsPrioriteit('${pid}','middel')">🟡 Middel</button>
          <button class="kolom-optie" onclick="verplaatsPrioriteit('${pid}','later')">⬜ Later</button>
        </div>
      </div>
      <button class="edit-knop" onclick="togglePrioEditForm('${pid}')">✏️ Bewerk</button>
      ${pid.startsWith('nieuw-') ? `<button class="edit-knop danger" onclick="verwijderPrioriteit('${pid}')">🗑️</button>` : ''}
    </div>
    <div class="inline-form" id="prio-form-${pid}">
      <input class="inline-input" id="prio-edit-titel-${pid}" value="${escapeHtml(titel)}" placeholder="Titel">
      <textarea class="inline-textarea" id="prio-edit-beschr-${pid}" placeholder="Beschrijving">${escapeHtml(beschrijving)}</textarea>
      <div class="inline-form-knoppen">
        <button class="inline-opslaan" onclick="slaaPrioOp('${pid}')">Opslaan</button>
        <button class="inline-annuleer" onclick="togglePrioEditForm('${pid}')">Annuleer</button>
      </div>
    </div>
  </div>`;
}

function renderPrioriteitenBord() {
  const kolommen = { hoog: [], middel: [], later: [] };

  // Bestaande kaartjes in juiste kolom plaatsen
  Object.entries(BASE_CARDS).forEach(([pid, base]) => {
    const db = prioriteitenData[pid];
    const kolom = db?.kolom || base.kolom;
    if (kolommen[kolom]) kolommen[kolom].push(pid);
    else kolommen['later'].push(pid);
  });

  // Nieuwe kaartjes uit DB
  Object.entries(prioriteitenData).forEach(([pid, data]) => {
    if (!BASE_CARDS[pid] && pid.startsWith('nieuw-')) {
      const kolom = data.kolom || 'hoog';
      if (kolommen[kolom]) kolommen[kolom].push(pid);
    }
  });

  ['hoog', 'middel', 'later'].forEach(kolom => {
    const container = document.getElementById(`prio-col-${kolom}`);
    if (!container) return;
    container.innerHTML = kolommen[kolom].map(pid =>
      renderPrioriteitsKaart(pid, prioriteitenData[pid])
    ).join('');
    // Render owner rows
    kolommen[kolom].forEach(pid => renderPrioOwner(pid));
  });
}

async function laadEnRenderPrioriteiten() {
  const data = await dbFetch('priorities', '');
  prioriteitenData = {};
  (data || []).forEach(p => { prioriteitenData[p.priority_id] = p; });
  renderPrioriteitenBord();
}

function toggleKolomPopup(pid) {
  document.querySelectorAll('.kolom-popup.open').forEach(p => {
    if (p.id !== `kolom-popup-${pid}`) p.classList.remove('open');
  });
  document.getElementById(`kolom-popup-${pid}`)?.classList.toggle('open');
}

async function verplaatsPrioriteit(pid, kolom) {
  document.getElementById(`kolom-popup-${pid}`)?.classList.remove('open');
  await opslaanPrio(pid, { kolom });
  prioriteitenData[pid] = { ...(prioriteitenData[pid] || {}), priority_id: pid, kolom };
  renderPrioriteitenBord();
}

function togglePrioEditForm(pid) {
  document.getElementById(`prio-form-${pid}`)?.classList.toggle('open');
}

async function slaaPrioOp(pid) {
  const titel = document.getElementById(`prio-edit-titel-${pid}`)?.value.trim() || '';
  const beschrijving = document.getElementById(`prio-edit-beschr-${pid}`)?.value.trim() || '';
  await opslaanPrio(pid, { custom_titel: titel, custom_beschrijving: beschrijving });
  prioriteitenData[pid] = { ...(prioriteitenData[pid] || {}), priority_id: pid, custom_titel: titel, custom_beschrijving: beschrijving };
  renderPrioriteitenBord();
}

function toggleNieuwKaartje(kolom) {
  document.getElementById(`nieuw-form-${kolom}`)?.classList.toggle('open');
}

async function voegNieuwKaartjeToe(kolom) {
  const titel = document.getElementById(`nieuw-titel-${kolom}`)?.value.trim();
  const beschrijving = document.getElementById(`nieuw-beschr-${kolom}`)?.value.trim() || '';
  if (!titel) { alert('Vul een titel in.'); return; }
  const pid = 'nieuw-' + Date.now();
  const r = await fetch(`${SUPABASE_URL}/rest/v1/priorities`, {
    method: 'POST',
    headers: { ...HEADERS, 'Prefer': 'return=representation' },
    body: JSON.stringify({ priority_id: pid, kolom, trekker: '', status: 'open', custom_titel: titel, custom_beschrijving: beschrijving })
  });
  if (!r.ok) { alert('Fout bij opslaan.'); return; }
  prioriteitenData[pid] = { priority_id: pid, kolom, trekker: '', status: 'open', custom_titel: titel, custom_beschrijving: beschrijving };
  document.getElementById(`nieuw-titel-${kolom}`)?.value && (document.getElementById(`nieuw-titel-${kolom}`).value = '');
  document.getElementById(`nieuw-beschr-${kolom}`)?.value && (document.getElementById(`nieuw-beschr-${kolom}`).value = '');
  document.getElementById(`nieuw-form-${kolom}`)?.classList.remove('open');
  renderPrioriteitenBord();
}

async function verwijderPrioriteit(pid) {
  if (!confirm('Dit kaartje verwijderen?')) return;
  await fetch(`${SUPABASE_URL}/rest/v1/priorities?priority_id=eq.${pid}`, { method: 'DELETE', headers: HEADERS });
  delete prioriteitenData[pid];
  renderPrioriteitenBord();
}

// Sluit kolom-popups bij klik buiten
document.addEventListener('click', e => {
  if (!e.target.closest('.kolom-popup') && !e.target.closest('.edit-knop')) {
    document.querySelectorAll('.kolom-popup.open').forEach(p => p.classList.remove('open'));
  }
});

// ── SWOT INTERACTIEF ──
const dbSwot = makeDb('swot_items');

async function laadSwotItems() {
  try {
    const data = await dbSwot.select();
    (data || []).forEach(item => renderSwotItem(item));
  } catch(e) { console.error('SWOT laden:', e); }
}

function renderSwotItem(item) {
  const container = document.getElementById(`swot-dynamic-${item.kwadrant}`);
  if (!container) return;
  const existing = document.getElementById(`swot-item-${item.id}`);
  if (existing) { existing.outerHTML = maakSwotItemHtml(item); return; }
  container.insertAdjacentHTML('beforeend', maakSwotItemHtml(item));
}

function maakSwotItemHtml(item) {
  return `<div class="swot-item-wrap" id="swot-item-${item.id}">
    <button class="swot-aangepakt-btn" onclick="toggleSwotAangepakt('${item.id}',${!!item.aangepakt})" title="${item.aangepakt ? 'Herstel' : 'Markeer als aangepakt'}">
      ${item.aangepakt ? '↩' : '✓'}
    </button>
    <span class="swot-item-tekst ${item.aangepakt ? 'aangepakt' : ''}">${escapeHtml(item.tekst)}</span>
    <button class="swot-delete-btn" onclick="verwijderSwotItem('${item.id}')" title="Verwijder">✕</button>
  </div>`;
}

async function toggleSwotAangepakt(id, huidig) {
  await fetch(`${SUPABASE_URL}/rest/v1/swot_items?id=eq.${id}`, {
    method: 'PATCH', headers: HEADERS, body: JSON.stringify({ aangepakt: !huidig })
  });
  const items = await dbSwot.select(`&id=eq.${id}`);
  if (items?.[0]) { const el = document.getElementById(`swot-item-${id}`); if(el) el.outerHTML = maakSwotItemHtml(items[0]); }
}

async function verwijderSwotItem(id) {
  if (!confirm('Dit item verwijderen?')) return;
  await fetch(`${SUPABASE_URL}/rest/v1/swot_items?id=eq.${id}`, { method: 'DELETE', headers: HEADERS });
  document.getElementById(`swot-item-${id}`)?.remove();
}

async function voegSwotItemToe(kwadrant) {
  const input = document.getElementById(`swot-input-${kwadrant}`);
  const tekst = input?.value.trim();
  if (!tekst) return;
  const r = await dbSwot.insert({ kwadrant, tekst, aangepakt: false });
  if (r?.[0]) renderSwotItem(r[0]);
  if (input) input.value = '';
}

function initSwotInteractief() {
  const sectie = document.getElementById('swot');
  if (!sectie) return;
  const obs = new IntersectionObserver(entries => {
    if (entries[0].isIntersecting) { laadSwotItems(); obs.disconnect(); }
  }, { threshold: 0.1 });
  obs.observe(sectie);
}

// ── LEEFTIJDSOVERZICHT INTERACTIEF ──
const dbLeeftijd = makeDb('leeftijd_overrides'); // geen created_at, gebruik dbFetch
let leeftijdData = {};

async function laadLeeftijdOverrides() {
  try {
    const data = await dbFetch('leeftijd_overrides', '');
    leeftijdData = {};
    (data || []).forEach(r => { leeftijdData[r.programma_id] = r; });
    Object.entries(leeftijdData).forEach(([pid, ovr]) => pasLeeftijdRijAan(pid, ovr));
  } catch(e) { console.error('Leeftijd overrides:', e); }
}

function pasLeeftijdRijAan(pid, ovr) {
  const statusEl = document.querySelector(`[data-leeftijd-status="${pid}"]`);
  const aandachtEl = document.querySelector(`[data-leeftijd-aandacht="${pid}"]`);
  if (statusEl && ovr.status) {
    const icons = { ok: '<span class="status-ok">✅ Goed</span>', warn: '<span class="status-warn">⚠️ Aandacht</span>', alert: '<span class="status-alert">🔴 Urgent</span>' };
    statusEl.innerHTML = (icons[ovr.status] || statusEl.innerHTML);
  }
  if (aandachtEl && ovr.aandachtspunt) aandachtEl.textContent = ovr.aandachtspunt;
}

function toggleLeeftijdEdit(pid) {
  const rij = document.getElementById(`leeftijd-edit-${pid}`);
  if (!rij) return;
  const isOpen = rij.classList.contains('open');
  document.querySelectorAll('.leeftijd-edit-rij.open').forEach(r => r.classList.remove('open'));
  if (!isOpen) rij.classList.add('open');
}

async function slaLeeftijdOp(pid) {
  const status = document.getElementById(`leeftijd-status-${pid}`)?.value;
  const aandachtspunt = document.getElementById(`leeftijd-aandacht-${pid}`)?.value.trim() || '';
  const r = await fetch(`${SUPABASE_URL}/rest/v1/leeftijd_overrides`, {
    method: 'POST',
    headers: { ...HEADERS, 'Prefer': 'return=representation,resolution=merge-duplicates' },
    body: JSON.stringify({ programma_id: pid, status, aandachtspunt, updated_at: new Date().toISOString() })
  });
  if (!r.ok) { alert('Fout bij opslaan.'); return; }
  leeftijdData[pid] = { programma_id: pid, status, aandachtspunt };
  pasLeeftijdRijAan(pid, leeftijdData[pid]);
  document.getElementById(`leeftijd-edit-${pid}`)?.classList.remove('open');
}

function initLeeftijdInteractief() {
  const sectie = document.getElementById('leeftijden');
  if (!sectie) return;
  const obs = new IntersectionObserver(entries => {
    if (entries[0].isIntersecting) { laadLeeftijdOverrides(); obs.disconnect(); }
  }, { threshold: 0.1 });
  obs.observe(sectie);
}

// ── ACCORDION ──
function toggleAccordion(id) {
  const body = document.getElementById(id);
  if (!body) return;
  const item = body.closest('.accordion-item');
  item.classList.toggle('open');
}

// ── GLOBALE FUNCTIES ──
window.toggleAccordion = toggleAccordion;
window.toggleJaarDetail = toggleJaarDetail;
window.setTrekker = setTrekker;
window.setStatus = setStatus;
window.markeerBesproken = markeerBesproken;
window.markeerVerwerkt = markeerVerwerkt;
window.laadDashboard = laadDashboard;
window.kiesRol = kiesRol;
window.vlStap0Verder = vlStap0Verder;
window.vlVerder = vlVerder;
window.vlTerug = vlTerug;
window.kiesSchaal = kiesSchaal;
window.markeerOptie = markeerOptie;
window.checkMax3 = checkMax3;
window.laadVragenlijstResultaten = laadVragenlijstResultaten;
window.genereerPrompt = genereerPrompt;
window.bewerkNotitie = bewerkNotitie;
window.slaBewerkinOp = slaBewerkinOp;
window.annuleerBewerking = annuleerBewerking;
window.verwijderNotitieOverzicht = verwijderNotitieOverzicht;
window.toggleToevoegen = toggleToevoegen;
window.slaToevoegingOp = slaToevoegingOp;
window.deleteNote = deleteNote;
window.toggleKolomPopup = toggleKolomPopup;
window.verplaatsPrioriteit = verplaatsPrioriteit;
window.togglePrioEditForm = togglePrioEditForm;
window.slaaPrioOp = slaaPrioOp;
window.toggleNieuwKaartje = toggleNieuwKaartje;
window.voegNieuwKaartjeToe = voegNieuwKaartjeToe;
window.verwijderPrioriteit = verwijderPrioriteit;
window.voegSwotItemToe = voegSwotItemToe;
window.toggleSwotAangepakt = toggleSwotAangepakt;
window.verwijderSwotItem = verwijderSwotItem;
window.toggleLeeftijdEdit = toggleLeeftijdEdit;
window.slaLeeftijdOp = slaLeeftijdOp;

// ── INIT ──
document.addEventListener('DOMContentLoaded', () => {
  initPin();
  initNav();
  initNotes();
  initAlleNotities();
  initVragenlijst();
  initDashboard();
  initPrioriteiten();
  initSwotInteractief();
  initLeeftijdInteractief();
  document.querySelector('.btn-export')?.addEventListener('click', exportAllNotes);
});
