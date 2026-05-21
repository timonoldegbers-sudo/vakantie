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
