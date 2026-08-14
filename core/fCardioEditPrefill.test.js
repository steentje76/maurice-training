/* P0 (14-08) — Cardio-edit in Logboek: gestructureerde velden terugvullen uit sessie-kolommen.
 * Bug: bij het bewerken van een roeisessie was alleen de notitie ("split:1:55") gevuld, niet de
 * velden erboven (afstand/tijd/watt/split). Deze test verifieert de reverse-mapping (rowMap →
 * DOM-veld) tegen de ECHTE CARDIO_TYPES-definitie uit index.html, inclusief het uit de notitie
 * extraheren van de split en het schoonhouden van het notitieveld (geen dubbel bij hersave).
 * Draai: node core/fCardioEditPrefill.test.js
 */
const fs = require('fs');
const path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

// ── extraheer de ECHTE CARDIO_TYPES-definitie ──
const startTok = 'const CARDIO_TYPES = {';
const s = html.indexOf(startTok);
if (s < 0) throw new Error('CARDIO_TYPES niet gevonden');
let depth = 0, end = -1;
for (let j = html.indexOf('{', s); j < html.length; j++){
  const ch = html[j];
  if (ch === '{') depth++; else if (ch === '}'){ depth--; if (depth === 0){ end = j; break; } }
}
const objStart = html.indexOf('{', s);
const CARDIO_TYPES = eval('(' + html.slice(objStart, end + 1) + ')');

// ── reverse-prefill: IDENTIEK aan de logica in renderEditSessFields ──
// Simuleert de DOM met een platte map { 'es-<field>': value } en het notitieveld apart.
function prefillCardioEdit(cardioType, session){
  const cfg = CARDIO_TYPES[cardioType];
  const dom = {}; // fieldId -> value
  const rawNote = String(session.note || '');
  let extractedAny = false;
  (cfg.fields || []).forEach(fld => {
    const m = cfg.rowMap && cfg.rowMap[fld];
    if (!m) return;
    if (m.col === 'extraNote'){
      if (typeof m.template !== 'function') return;
      const SENT = '';
      let probe; try { probe = String(m.template(SENT, {machine:''})); } catch(_){ return; }
      const parts = probe.split(SENT); if (parts.length !== 2) return;
      const esc = x => x.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const re = new RegExp(esc(parts[0].trim()) + '\\s*([^·|]*?)\\s*' + esc(parts[1].trim()) + '(?=\\s*(?:·|\\||$))', 'i');
      const mm = rawNote.match(re);
      if (mm && mm[1] != null && mm[1].trim() !== ''){ dom['es-'+fld] = mm[1].trim(); extractedAny = true; }
    } else {
      let v = session[m.col];
      if (v == null || v === '') return;
      if (typeof m.transform === 'function' && m.col === 'distance' && /_km$/.test(fld)) v = Math.round((Number(v)/1000)*1000)/1000;
      dom['es-'+fld] = v;
    }
  });
  let noteOut = rawNote;
  if (extractedAny){ const idx = rawNote.lastIndexOf(' · '); noteOut = idx >= 0 ? rawNote.slice(0, idx).trim() : ''; }
  return { dom, note: noteOut };
}

let pass = 0, fail = 0;
function eq(a, b, m){ if (a === b) pass++; else { fail++; console.log('  ✗ ' + m + ' (verwacht ' + JSON.stringify(b) + ', kreeg ' + JSON.stringify(a) + ')'); } }

// ── 1. De exacte bug-case: roeisessie, note="split:1:55", geen gebruikersnotitie ──
let r = prefillCardioEdit('rowing', { distance:1000, time_str:'3:50', watt:230, stroke_rate:28, rpe:7, note:'split:1:55' });
eq(r.dom['es-dist'], 1000, 'rowing: afstand 1000 teruggevuld');
eq(r.dom['es-time'], '3:50', 'rowing: tijd 3:50 teruggevuld');
eq(r.dom['es-watt'], 230, 'rowing: watt 230 teruggevuld');
eq(r.dom['es-stroke'], 28, 'rowing: slag/min 28 teruggevuld');
eq(r.dom['es-rpe'], 7, 'rowing: rpe 7 teruggevuld');
eq(r.dom['es-split'], '1:55', 'rowing: split 1:55 uit notitie geëxtraheerd (KERN-BUG)');
eq(r.note, '', 'rowing: notitieveld leeg (alleen split → geen vrije notitie, geen dubbel bij hersave)');

// ── 2. Notitie met vrije tekst + split: alleen vrije tekst blijft in notitieveld ──
r = prefillCardioEdit('rowing', { distance:2000, time_str:'7:20', note:'Voelde goed · split:1:50' });
eq(r.dom['es-dist'], 2000, 'rowing2: afstand 2000');
eq(r.dom['es-split'], '1:50', 'rowing2: split 1:50 geëxtraheerd');
eq(r.note, 'Voelde goed', 'rowing2: vrije notitie "Voelde goed" behouden, split gestript');

// ── 3. Machine-prefix in notitie: split correct ondanks machinenaam ervoor ──
r = prefillCardioEdit('rowing', { distance:500, note:'Concept2 split:1:48' });
eq(r.dom['es-split'], '1:48', 'rowing3: split geëxtraheerd ondanks machine-prefix');

// ── 4. Geen split in notitie (leeg): split-veld blijft ongezet, notitie ongemoeid ──
r = prefillCardioEdit('rowing', { distance:1000, note:'' });
eq(r.dom['es-split'], undefined, 'rowing4: geen split → veld niet gezet');
eq(r.note, '', 'rowing4: lege notitie blijft leeg');

// ── 5. Hardlopen: dist_km reverse (meters → km) ──
r = prefillCardioEdit('running', { distance:5000, time_str:'25:00', hr_avg:150, rpe:6, note:'' });
eq(r.dom['es-dist_km'], 5, 'running: 5000m → 5 km (reverse transform)');
eq(r.dom['es-time'], '25:00', 'running: tijd 25:00');
eq(r.dom['es-hr'], 150, 'running: hartslag 150');

// ── 6. Stairmaster: floors uit extraNote ("X floors") ──
r = prefillCardioEdit('stairmaster', { time_str:'20:00', calories:180, rpe:6, note:'42 floors' });
eq(r.dom['es-floors'], '42', 'stairmaster: floors 42 uit notitie geëxtraheerd');
eq(r.dom['es-cals'], 180, 'stairmaster: calorieën 180');
eq(r.note, '', 'stairmaster: notitie leeg na floors-extractie');

console.log('\nCardio-edit prefill: RESULTAAT: ' + pass + ' geslaagd, ' + fail + ' mislukt');
process.exit(fail ? 1 : 0);
