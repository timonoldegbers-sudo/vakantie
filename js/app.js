// Gedeelde state & helpers

const VERTREKDATUM = new Date('2027-04-28T06:00:00');
const LOCATIE = { lat: 37.1205, lng: -8.5204, naam: 'Villa Cocheira, Ferragudo, Algarve, Portugal' };

const DEFAULT_DEELNEMERS = [
  { naam: 'Leo',     foto: null },
  { naam: 'Anneke',  foto: null },
  { naam: 'Jasper',  foto: null },
  { naam: 'Megan',   foto: null },
  { naam: 'Luuk',    foto: null },
  { naam: 'Yara',    foto: null },
  { naam: 'Baby 👶', foto: null },
  { naam: 'Lotte',   foto: null },
  { naam: 'Chris',   foto: null },
  { naam: 'Timon',   foto: null },
  { naam: 'Jasmijn', foto: null },
  { naam: 'Eden',    foto: null },
  { naam: 'Job',     foto: null },
  { naam: 'Ymke',    foto: null },
];

const BIJBELSE_QUOTES = [
  { tekst: 'Ik hef mijn ogen op naar de bergen — vanwaar zal mijn hulp komen?', ref: 'Psalm 121:1' },
  { tekst: 'Hij laat mij neerliggen in grazige weiden; Hij voert mij naar rustige wateren.', ref: 'Psalm 23:2' },
  { tekst: 'Hoe schoon zijn uw tenten, o Jakob, uw woningen, o Israël!', ref: 'Numeri 24:5' },
  { tekst: 'Ga, eet uw brood met vreugde en drink uw wijn met een blij hart.', ref: 'Prediker 9:7' },
  { tekst: 'De hemel verkondigt Gods eer, het uitspansel verkondigt het werk van zijn handen.', ref: 'Psalm 19:1' },
  { tekst: 'Proef en zie dat de HEER goed is; gelukkig de mens die bij Hem schuilt.', ref: 'Psalm 34:8' },
  { tekst: 'Want bergen mogen wijken en heuvels wankelen, maar mijn goedertierenheid zal van u niet wijken.', ref: 'Jesaja 54:10' },
  { tekst: 'Dit is de dag die de HEER heeft gemaakt; wij zullen ons verheugen en verblijd zijn.', ref: 'Psalm 118:24' },
  { tekst: 'Kom bij Mij, allen die vermoeid en belast bent, en Ik zal u rust geven.', ref: 'Mattheüs 11:28' },
  { tekst: 'De aarde is des HEREN en de volheid ervan, de wereld en wie daarin wonen.', ref: 'Psalm 24:1' },
  { tekst: 'Uw woord is een lamp voor mijn voet en een licht op mijn pad.', ref: 'Psalm 119:105' },
  { tekst: 'Moge de God van de hoop u vervullen met alle vreugde en vrede.', ref: 'Romeinen 15:13' },
  { tekst: 'Zie de vogels in de lucht: zij zaaien niet en maaien niet, toch voedt uw hemelse Vader ze.', ref: 'Mattheüs 6:26' },
  { tekst: 'Hij die berg en dal vormt, wind en gedachte schept — HEER, God van de heerscharen is zijn naam.', ref: 'Amos 4:13' },
];

function getDagelijkseQuote() {
  const dag = new Date().getDate();
  return BIJBELSE_QUOTES[dag % BIJBELSE_QUOTES.length];
}

// ── PUSH MELDINGEN ──────────────────────────────────────────

const VAPID_PUBLIC_KEY = 'BOd9X_MkloxrsmOBxsFaK6MIlWQCkUytYF1JARkpLkV4oN4TSadats1lZGJNgZ8eFmVa17GZylp27_oe1eRsJo4';

function urlBase64ToUint8Array(b64) {
  const pad = '='.repeat((4 - b64.length % 4) % 4);
  const base64 = (b64 + pad).replace(/-/g, '+').replace(/_/g, '/');
  return new Uint8Array([...atob(base64)].map(c => c.charCodeAt(0)));
}

async function abonneerOpPush() {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return false;
  try {
    const reg = await navigator.serviceWorker.register('/sw.js');
    await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
    });
    const j = sub.toJSON();
    await db.from('push_subscriptions').upsert(
      { endpoint: j.endpoint, p256dh: j.keys.p256dh, auth: j.keys.auth },
      { onConflict: 'endpoint' }
    );
    return true;
  } catch (err) {
    console.warn('Push abonnement mislukt:', err);
    return false;
  }
}

async function stuurPushMelding(titel, bericht, url = '/') {
  try {
    await fetch(`${SUPABASE_URL}/functions/v1/send-push`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({ titel, bericht, url }),
    });
  } catch { /* stil falen — melding is niet kritiek */ }
}

function toonMeldingBanner() {
  if (!('Notification' in window)) return;
  if (Notification.permission !== 'default') return;
  if (localStorage.getItem('vakantie_push_nee')) return;

  setTimeout(() => {
    const banner = document.createElement('div');
    banner.id = 'push-banner';
    banner.innerHTML = `
      <span style="font-size:1.5rem;flex-shrink:0;">🔔</span>
      <div style="flex:1;min-width:0;">
        <div style="font-weight:700;font-size:0.88rem;color:#2D3748;">Meldingen aan?</div>
        <div style="font-size:0.75rem;color:#718096;margin-top:0.1rem;">Seintje bij nieuwe foto's of activiteiten</div>
      </div>
      <button id="push-ja" style="background:#D95F52;color:white;border:none;border-radius:8px;padding:0.45rem 1rem;font-weight:700;font-size:0.82rem;cursor:pointer;font-family:Inter,sans-serif;flex-shrink:0;">Ja!</button>
      <button id="push-nee" style="background:none;border:none;color:#718096;font-size:1.2rem;cursor:pointer;padding:0.25rem;line-height:1;flex-shrink:0;">✕</button>
    `;
    Object.assign(banner.style, {
      position: 'fixed',
      bottom: 'calc(var(--mob-nav-h) + 0.75rem)',
      left: '1rem', right: '1rem',
      background: 'white',
      borderRadius: '14px',
      padding: '0.9rem 1rem',
      boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
      zIndex: '499',
      border: '1.5px solid #D95F52',
      display: 'flex',
      alignItems: 'center',
      gap: '0.75rem',
      fontFamily: 'Inter, sans-serif',
      animation: 'pushSlideUp 0.35s ease',
    });
    document.body.appendChild(banner);

    document.getElementById('push-ja').addEventListener('click', async () => {
      banner.remove();
      const toestemming = await Notification.requestPermission();
      if (toestemming === 'granted') {
        await abonneerOpPush();
        new Notification('Gelukt! 🎉', { body: 'Je krijgt voortaan een seintje bij nieuws.', icon: '/icons/icon.svg' });
      }
    });
    document.getElementById('push-nee').addEventListener('click', () => {
      banner.remove();
      localStorage.setItem('vakantie_push_nee', '1');
    });
  }, 2500);
}

// Supabase client (config.js moet voor app.js geladen worden)
const db = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Upload foto naar Supabase Storage, geeft publieke URL terug
async function uploadFoto(map, file) {
  const ext = file.name.split('.').pop();
  const pad = `${map}/${Date.now()}.${ext}`;
  const { error } = await db.storage.from('fotos').upload(pad, file);
  if (error) throw error;
  return db.storage.from('fotos').getPublicUrl(pad).data.publicUrl;
}

// Alleen voor weercache (localStorage is prima voor tijdelijke data)
function saveData(key, data) {
  localStorage.setItem('vakantie_' + key, JSON.stringify(data));
}
function loadData(key, fallback = null) {
  const raw = localStorage.getItem('vakantie_' + key);
  return raw ? JSON.parse(raw) : fallback;
}

function weerIcon(code) {
  if (code === 0) return '☀️';
  if (code <= 2) return '⛅';
  if (code === 3) return '☁️';
  if (code <= 49) return '🌫️';
  if (code <= 67) return '🌧️';
  if (code <= 77) return '❄️';
  if (code <= 82) return '🌦️';
  if (code <= 99) return '⛈️';
  return '🌤️';
}

// Unieke sessie-ID per apparaat (voor emoji-reacties)
function getSessieId() {
  let id = localStorage.getItem('vakantie_sessie_id');
  if (!id) {
    id = 'sess_' + Math.random().toString(36).slice(2) + Date.now().toString(36);
    localStorage.setItem('vakantie_sessie_id', id);
  }
  return id;
}

function formatDatum(dateStr) {
  const d = new Date(dateStr);
  const dagen = ['zo', 'ma', 'di', 'wo', 'do', 'vr', 'za'];
  return { dag: dagen[d.getDay()], datum: `${d.getDate()}/${d.getMonth() + 1}` };
}
