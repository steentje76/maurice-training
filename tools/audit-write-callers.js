#!/usr/bin/env node
/* Reproduceerbare ruwe inventaris van schrijfaanroepen in index.html (TK-REL-SEC audit 19-10-2026).
 * Alleen-lezen. Geeft per aanroep regel, omsluitende functie, helper en tabel; de classificatie
 * (SAFE / FALSE-SUCCESS / DATA-LOSS / ACCOUNT-RISK / DUPLICATE-RISK / UNKNOWN) is handwerk met bewijs,
 * zie docs/audit/TK_WRITE_CALLER_MATRIX_20261019.md. Gebruik: node tools/audit-write-callers.js [index.html] */
'use strict';
const fs = require('fs'), path = require('path');
const bestand = process.argv[2] || path.join(__dirname, '..', 'index.html');
const regels = fs.readFileSync(bestand, 'utf8').replace(/\r\n/g, '\n').split('\n');
const HELPER = /\b(sbPostQOpgeslagen|sbPostQ|sbPatchQ|sbDelQ|sbRpcQ|sbPostReturning|sbPost|sbPatch|sbDel|sbUpsert|sbRpc)\(\s*'([a-z_]+)'/g;
const FETCH = /fetch\(\s*`\$\{SB_URL\}\/rest\/v1\/([a-z_]+)[^`]*`\s*,\s*\{[^}]*method:\s*'(POST|PATCH|DELETE)'/g;
const uit = []; let functie = null;
regels.forEach((l, i) => {
  const m = l.match(/^\s*(?:async\s+)?function\s+([A-Za-z0-9_$]+)\s*\(/); if (m) functie = m[1];
  if (/^\s*(async\s+)?function\s+sb/.test(l)) return; // definities van de helpers zelf
  let x; HELPER.lastIndex = 0; while ((x = HELPER.exec(l))) uit.push({ regel: i + 1, functie, helper: x[1], doel: x[2] });
  FETCH.lastIndex = 0; while ((x = FETCH.exec(l))) uit.push({ regel: i + 1, functie, helper: 'fetch-' + x[2], doel: x[1] });
});
const telling = {}; uit.forEach(r => { telling[r.helper] = (telling[r.helper] || 0) + 1; });
process.stdout.write(JSON.stringify({ bestand: path.basename(bestand), aantal: uit.length, telling, aanroepen: uit }, null, 1) + '\n');
