#!/usr/bin/env node
/* Reproduceerbare statuscontrole van de schrijfaanroep-matrix (TK-REL-SEC audit, bijgewerkt 19-10-2026).
 * Alleen-lezen. Koppelt elke matrixrij (docs/audit/TK_WRITE_CALLER_MATRIX_20261019.json) aan de aanroepen die
 * tools/audit-write-callers.js nu in index.html vindt (eerst zelfde functie, tabel en helper; daarna tabel en helper in
 * volgorde van voorkomen) en telt
 * de status per prioriteit. Meldt ook aanroepen die de matrix niet kent (nieuw sinds de classificatie).
 * Gebruik: node tools/audit-matrix-status.js [--md]   (--md: Markdown-tabellen voor het matrixdocument) */
'use strict';
const fs = require('fs'), path = require('path'), cp = require('child_process');
const ROOT = path.join(__dirname, '..');
const rows = JSON.parse(fs.readFileSync(path.join(ROOT, 'docs/audit/TK_WRITE_CALLER_MATRIX_20261019.json'), 'utf8'));
const inv = JSON.parse(cp.execFileSync(process.execPath, [path.join(__dirname, 'audit-write-callers.js')], { maxBuffer: 1 << 26 }).toString()).aanroepen;
const REGELS = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8').replace(/\r\n/g, '\n').split('\n');
// Commentaarregels zijn geen aanroep (de oorspronkelijke classificatie sloot ze ook handmatig uit).
// Een regel telt als commentaar als hij met // of * begint of binnen een /* ... */-blok valt (eenvoudige scan).
const inBlok = []; let blok = false;
REGELS.forEach((l, i) => { const t = l.trim(); inBlok[i] = blok || /^(\/\/|\*|\/\*)/.test(t);
  if (!blok && t.indexOf('/*') === 0 && t.indexOf('*/') < 0) blok = true; else if (blok && l.indexOf('*/') >= 0) blok = false; });
const echt = inv.filter(a => !inBlok[a.regel - 1]);
const helperVan = h => String(h).replace(/^fetch /, 'fetch-');
// Koppelen in twee rondes: eerst exact (functie, tabel, helper); daarna wat overblijft per (tabel, helper) in volgorde
// van voorkomen (functienamen in de inventaris volgen de dichtstbijzijnde function-declaratie en wijken bij geneste
// functies af van de handmatige classificatie).
const doelVan = r => String(r.target).split(' ')[0];
const gebruikt = new Set();
const gesorteerd = rows.slice().sort((a, b) => a.line - b.line);
// helper_HEAD: de helper is sinds de classificatie bewust gewijzigd ('verwijderd' = aanroep bestaat niet meer).
const helperNu = r => helperVan(r.helper_HEAD || r.helper);
gesorteerd.forEach(r => {
  if (r.helper_HEAD === 'verwijderd') { r._head = 'verwijderd'; return; }
  const a = echt.find(x => !gebruikt.has(x) && x.functie === r.function && x.doel === doelVan(r) && x.helper === helperNu(r));
  if (a) { gebruikt.add(a); r._head = a.regel; } else r._head = null;
});
gesorteerd.filter(r => r._head === null).forEach(r => {
  const a = echt.find(x => !gebruikt.has(x) && x.doel === doelVan(r) && x.helper === helperNu(r));
  if (a) { gebruikt.add(a); r._head = a.regel; }
});
const verwijderd = rows.filter(r => r._head === 'verwijderd').length;
const gekoppeld = rows.filter(r => r._head !== null && r._head !== 'verwijderd').length, wrapper = rows.length - gekoppeld - verwijderd;
const nieuw = echt.filter(a => !gebruikt.has(a)).sort((a, b) => a.regel - b.regel);
const PRIO = ['P0', 'P1', 'P2', 'P3'], STATUS = ['opgelost', 'deels', 'open', 'geen defect'];
const telling = {}; rows.forEach(r => { const k = r.priority + '|' + (r.status || 'onbekend'); telling[k] = (telling[k] || 0) + 1; });
const klasse = {}; rows.forEach(r => { klasse[r.class] = (klasse[r.class] || 0) + 1; });
if (process.argv.includes('--md')) {
  const o = [];
  o.push('| Prio | ' + STATUS.join(' | ') + ' | Totaal |', '|---|' + STATUS.map(() => '---').join('|') + '|---|');
  PRIO.forEach(p => { const v = STATUS.map(s => telling[p + '|' + s] || 0); o.push('| ' + p + ' | ' + v.join(' | ') + ' | ' + v.reduce((a, b) => a + b, 0) + ' |'); });
  o.push('', 'Rijen: ' + rows.length + '. Aanroep bestaat niet meer: ' + verwijderd + '. Gekoppeld aan een aanroep in de huidige index.html (zelfde tabel en helper, in volgorde): ' + gekoppeld + '; niet door de ruwe inventaris gezien (wrapper zoals writeSessionRow/upsertWeightLog, of helper gewijzigd): ' + wrapper + '. Aanroepen in index.html zonder matrixrij: ' + nieuw.length + '.');
  if (nieuw.length) { o.push('', '| Regel (HEAD) | Functie | Helper | Tabel |', '|---|---|---|---|'); nieuw.forEach(a => o.push('| ' + a.regel + ' | ' + a.functie + ' | ' + a.helper + ' | ' + a.doel + ' |')); }
  o.push('', '| Regel (HEAD) | Prio | Functie | Helper | Tabel | Klasse | Status | Herstel | Rest |', '|---|---|---|---|---|---|---|---|---|');
  rows.filter(r => r.status !== 'geen defect').sort((a, b) => PRIO.indexOf(a.priority) - PRIO.indexOf(b.priority) || (a._head || 0) - (b._head || 0)).forEach(r => {
    const kl = r.class + (r.secondary ? ' / ' + r.secondary : '');
    const fx = Array.isArray(r.fixedIn) ? r.fixedIn.map(x => '`' + x + '`').join(', ') : (r.fixedIn || '');
    const rest = [r.herclassificatie ? 'Herclassificatie: ' + r.herclassificatie : '', r.rest || ''].filter(Boolean).join(' ').replace(/\|/g, '/');
    o.push('| ' + (r._head || '—') + ' | ' + r.priority + ' | ' + r.function + ' | ' + r.helper + ' | ' + r.target + ' | ' + kl + ' | ' + r.status + ' | ' + fx + ' | ' + rest + ' |');
  });
  process.stdout.write(o.join('\n') + '\n');
} else {
  process.stdout.write(JSON.stringify({ rijen: rows.length, gekoppeld, verwijderd, wrapper, nieuw: nieuw.length, nieuweAanroepen: nieuw, klasse, telling }, null, 1) + '\n');
}
