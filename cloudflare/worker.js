// Orbista: Reise-Codes prüfen und den Spielstand pro Code speichern (wie NumNum).
// GET /stand/CODE  liest den Spielstand zu einem Code (404, wenn es noch keinen gibt, 403 bei unbekanntem Code).
// PUT /stand/CODE  speichert den Spielstand zu einem Code: {"state": {"orbista.profile": {...}, "orbista.mastery": {...}, "orbista.capitals": {...}, "orbista.map": {...}}, "ts": 1234567890}
// Einrichtung: siehe ANLEITUNG.md

const ERLAUBT = ['https://asimplemanslab.com', 'https://www.asimplemanslab.com', 'https://mbroyer.github.io']; // nur Orbista auf der Website darf den Dienst nutzen
const MAX_STAND = 256 * 1024; // ein Spielstand ist normalerweise nur wenige KB groß
const CODE_RE = /^[A-Z0-9-]{4,24}$/;

function antwort(daten, status, origin) {
  return new Response(JSON.stringify(daten), {
    status: status || 200,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', ...cors(origin) },
  });
}
function cors(origin) {
  return {
    'Access-Control-Allow-Origin': ERLAUBT.includes(origin) ? origin : ERLAUBT[0],
    'Access-Control-Allow-Methods': 'GET, PUT, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
    'Vary': 'Origin',
  };
}
// Variable CODES (z. B. "KOMPASS-4821, ANDEN-1234") erlaubt nur diese Codes.
// Ohne CODES ist kein Code gültig, damit sich niemand einen ausdenken kann.
function codeErlaubt(code, env) {
  if (!CODE_RE.test(code)) return false;
  const liste = String(env.CODES || '').split(/[\s,;]+/).map((c) => c.trim().toUpperCase()).filter(Boolean);
  return liste.includes(code);
}

// Ein Orbista-Stand besteht aus Profil (XP, Serie, Stempel …) und den Karteien Flaggen, Hauptstädte und Landkarte.
function gueltig(st) {
  const p = st['orbista.profile'];
  if (!p || typeof p !== 'object' || typeof p.xp !== 'number') return false;
  return ['orbista.mastery', 'orbista.capitals', 'orbista.map'].every((k) => st[k] === undefined || (st[k] && typeof st[k] === 'object'));
}

async function stand(req, env, origin, code) {
  if (!env.STAND) return antwort({ fehler: 'Speicher ist nicht verbunden (Binding STAND fehlt)' }, 500, origin);
  if (!codeErlaubt(code, env)) return antwort({ fehler: 'unbekannter Code' }, 403, origin);
  const key = 's:' + code;
  if (req.method === 'GET') {
    const wert = await env.STAND.get(key);
    if (!wert) return antwort({ fehler: 'neu' }, 404, origin);
    return new Response(wert, { headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', ...cors(origin) } });
  }
  if (req.method === 'PUT') {
    const text = await req.text();
    if (!text || text.length > MAX_STAND) return antwort({ fehler: 'ungültig' }, 413, origin);
    let d;
    try { d = JSON.parse(text); } catch (e) { return antwort({ fehler: 'ungültig' }, 400, origin); }
    if (!d || typeof d.state !== 'object' || !d.state || !gueltig(d.state)) return antwort({ fehler: 'ungültig' }, 400, origin);
    const ts = Number(d.ts) || Date.now();
    // Ältere Stände (z. B. von einem Gerät, das lange offline war) überschreiben keinen neueren
    const alt = await env.STAND.get(key, 'json');
    if (alt && alt.ts > ts) return antwort({ ok: false, ts: alt.ts }, 409, origin);
    await env.STAND.put(key, JSON.stringify({ state: d.state, ts, gespeichert: Date.now() }));
    return antwort({ ok: true, ts }, 200, origin);
  }
  return antwort({ fehler: 'nicht erlaubt' }, 405, origin);
}

export default {
  async fetch(req, env) {
    const origin = req.headers.get('Origin') || '';
    if (req.method === 'OPTIONS') return new Response(null, { headers: cors(origin) });
    const pfad = new URL(req.url).pathname.replace(/\/+$/, '');
    const m = /^\/stand\/([^/]+)$/.exec(pfad);
    if (m) {
      if (!ERLAUBT.includes(origin)) return antwort({ fehler: 'nicht erlaubt' }, 403, origin);
      return stand(req, env, origin, decodeURIComponent(m[1]).toUpperCase());
    }
    return antwort({ ok: true, dienst: 'Orbista', stand: !!env.STAND, codes: !!env.CODES }, 200, origin);
  },
};
