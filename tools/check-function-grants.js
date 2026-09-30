#!/usr/bin/env node
/* tools/check-function-grants.js — F-SEC-010 CI-guard voor functierechten in migraties.
 *
 * Geldt voor migratie_vNNN.sql met NNN > BASELINE_VERSION (575); oudere migraties zijn vóór deze guard
 * geschreven en live gecontroleerd in de F-SEC-audits. Regels per migratie:
 *  R1  elke `create [or replace] function <naam>(` heeft in hetzelfde bestand een expliciete
 *      `grant`/`revoke ... on function <naam>(`-regel (toegangsrechten zijn een bewuste keuze, nooit een default);
 *  R2  SECURITY DEFINER-functies hebben een expliciete `set search_path`;
 *  R3  SECURITY DEFINER-functies hebben een expliciete `revoke ... on function <naam>(...) from ...` die zowel
 *      PUBLIC als anon noemt;
 *  R4  SECURITY DEFINER-functies worden nooit aan anon of PUBLIC verleend, tenzij het bestand de marker
 *      `-- tk-security-allow-anon-execute: <naam>` bevat (bewuste, reviewbare uitzondering);
 *  R5  geen `alter default privileges ... grant execute on functions to anon|authenticated|public` in schema
 *      public en geen globale PUBLIC-grant (drift terugzetten).
 * Exporteert checkMigration()/checkRepo() voor tests; als CLI exit 1 bij overtredingen. */
'use strict';
const fs = require('fs'); const path = require('path');
const BASELINE_VERSION = 575;

function stripComments(sql) { return sql.split('\n').map(l => l.replace(/--.*$/, '')).join('\n'); }
function bodyFree(sql) { return sql.replace(/\$([A-Za-z_]*)\$[\s\S]*?\$\1\$/g, ' '); }
function norm(name) { const n = name.replace(/"/g, '').toLowerCase(); return n.indexOf('.') === -1 ? 'public.' + n : n; }
function esc(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

function checkMigration(file, raw) {
  const errors = [];
  const sqlNoBodies = bodyFree(stripComments(raw));
  const markers = (raw.match(/--\s*tk-security-allow-anon-execute:\s*([A-Za-z0-9_."]+)/g) || []).map(m => norm(m.split(':')[1].trim()));
  // functie-headers: van 'create function' tot aan het begin van de body ($...$) of 'as'
  const re = /create\s+(?:or\s+replace\s+)?function\s+([A-Za-z0-9_."]+(?:\.[A-Za-z0-9_."]+)?)\s*\(([\s\S]*?)\$[A-Za-z_]*\$/gi;
  const src = stripComments(raw); let m;
  while ((m = re.exec(src))) {
    const name = norm(m[1]); const header = m[0].toLowerCase();
    const short = name.replace(/^public\./, '');
    const onFn = '(?:public\\.)?' + esc(short) + '\\s*\\(';
    const privRe = new RegExp('(grant|revoke)\\s[^;]*?\\bon\\s+function\\s+' + onFn, 'i');
    if (!privRe.test(sqlNoBodies)) errors.push(file + ': R1 ' + name + ' heeft geen expliciete grant/revoke op de functie');
    if (/security\s+definer/.test(header)) {
      if (!/set\s+search_path/.test(header)) errors.push(file + ': R2 SECURITY DEFINER ' + name + ' zonder expliciete set search_path');
      const revokes = sqlNoBodies.match(new RegExp('revoke\\s[^;]*?\\bon\\s+function\\s+' + onFn + '[^;]*;', 'gi')) || [];
      const coversPublicAnon = revokes.some(r => /\bfrom\b[^;]*\bpublic\b/i.test(r) && /\bfrom\b[^;]*\banon\b/i.test(r));
      if (!coversPublicAnon) errors.push(file + ': R3 SECURITY DEFINER ' + name + ' zonder expliciete revoke van PUBLIC en anon');
      const grants = sqlNoBodies.match(new RegExp('grant\\s[^;]*?\\bon\\s+function\\s+' + onFn + '[^;]*;', 'gi')) || [];
      const toAnon = grants.some(g => /\bto\b[^;]*\b(anon|public)\b/i.test(g));
      if (toAnon && markers.indexOf(name) === -1) errors.push(file + ': R4 SECURITY DEFINER ' + name + ' verleend aan anon/PUBLIC zonder allow-marker');
    }
  }
  const adp = sqlNoBodies.match(/alter\s+default\s+privileges[^;]*;/gi) || [];
  adp.forEach(stmt => {
    const s = stmt.toLowerCase();
    if (/\bgrant\b[^;]*\bon\s+functions\b/.test(s) && /\bto\b[^;]*\b(anon|authenticated|public)\b/.test(s)) {
      const inPublic = /in\s+schema\s+public\b/.test(s), global = !/in\s+schema\b/.test(s);
      if (inPublic || (global && /\bto\b[^;]*\bpublic\b/.test(s))) errors.push(file + ': R5 default function EXECUTE opnieuw verbreed: ' + stmt.replace(/\s+/g, ' ').trim());
    }
  });
  return errors;
}

function migrationVersion(f) { const m = /^migratie_v(\d+)\.sql$/.exec(f); return m ? Number(m[1]) : null; }
function checkRepo(root) {
  const files = fs.readdirSync(root).filter(f => { const v = migrationVersion(f); return v !== null && v > BASELINE_VERSION; }).sort();
  const errors = [];
  files.forEach(f => { errors.push.apply(errors, checkMigration(f, fs.readFileSync(path.join(root, f), 'utf8'))); });
  return { files, errors };
}
module.exports = { checkMigration, checkRepo, BASELINE_VERSION };
if (require.main === module) {
  const r = checkRepo(path.join(__dirname, '..'));
  if (r.errors.length) { console.log('🔴 Function-grants guard: ' + r.errors.length + ' overtreding(en)'); r.errors.forEach(e => console.log('  - ' + e)); process.exit(1); }
  console.log('🟢 Function-grants guard: ' + r.files.length + ' migratie(s) na v' + BASELINE_VERSION + ' gecontroleerd, 0 overtredingen');
}
