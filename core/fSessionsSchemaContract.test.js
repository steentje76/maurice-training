/* v4.70.4 — SCHEMA-CONTRACT public.sessions.
 * Koppelt het canonieke kolommanifest (docs/db/sessions.columns.json, geverifieerd tegen productie)
 * aan de repo-migraties, zodat de v565/v566-drift (code schreef kolommen die productie niet had)
 * niet opnieuw ongemerkt kan ontstaan:
 *   M1  elke kolom die een migratie aan public.sessions toevoegt, staat in het manifest;
 *   M2  geen enkele sessions-migratie is nieuwer dan manifest.verifiedThroughMigration
 *       (nieuwe migratie => eerst live uitvoeren + tools/verify-sessions-schema.sql + manifest bijwerken);
 *   M3  de integer-kolommen uit het manifest omvatten watt (normalisatiecontract).
 * De payload-kant (Losse PM5, Losse handmatig, Training-cardio, kracht) wordt in
 * fConcept2FinalizeLifecycle bewezen met een nep-PostgREST die dit manifest afdwingt. */
'use strict';
const fs = require('fs'); const path = require('path');
const ROOT = path.join(__dirname, '..');
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) pass++; else { fail++; console.log('MISLUKT: ' + m); } };
const man = JSON.parse(fs.readFileSync(path.join(ROOT, 'docs/db/sessions.columns.json'), 'utf8'));
const cols = new Set(man.columns.map(c => c.name));
ok(man.table === 'public.sessions' && man.columns.length > 20, 'M0: manifest aanwezig en plausibel');
ok(typeof man.verifiedThroughMigration === 'number', 'M0: verifiedThroughMigration vastgelegd');
ok(fs.existsSync(path.join(ROOT, 'tools/verify-sessions-schema.sql')), 'M0: read-only verificatiequery aanwezig');
function scan(files) {
  const added = {}, touching = [];
  files.forEach(f => {
    const num = Number((f.match(/migratie_v(\d+)\.sql$/) || [])[1]);
    const s = fs.readFileSync(path.join(ROOT, f), 'utf8').replace(/--[^\n]*/g, '');
    const re = /alter\s+table\s+(?:if\s+exists\s+)?(?:only\s+)?(?:public\.)?sessions\b([\s\S]*?);/gi; let m;
    while ((m = re.exec(s))) {
      touching.push(num);
      const cr = /add\s+column\s+(?:if\s+not\s+exists\s+)?"?(\w+)"?/gi; let c;
      while ((c = cr.exec(m[1]))) (added[c[1]] = added[c[1]] || []).push(f);
    }
  });
  return { added, maxTouching: touching.length ? Math.max.apply(null, touching) : 0 };
}
const files = fs.readdirSync(ROOT).filter(f => /^migratie_v\d+\.sql$/.test(f));
const S = scan(files);
Object.keys(S.added).forEach(c => ok(cols.has(c), 'M1: kolom ' + c + ' (' + S.added[c].join(',') + ') staat in het sessions-manifest'));
ok(['intervals_detail', 'protocol_type', 'protocol_value'].every(c => S.added[c]), 'M1: v565/v566-kolommen worden herkend door de scanner');
ok(S.maxTouching <= man.verifiedThroughMigration, 'M2: nieuwste sessions-migratie (v' + S.maxTouching + ') is live geverifieerd in het manifest (t/m v' + man.verifiedThroughMigration + ')');
const intCols = man.columns.filter(c => c.type === 'integer').map(c => c.name);
ok(intCols.indexOf('watt') > -1, 'M3: watt is integer in het contract');
// Sabotage: een nieuwe (niet-geverifieerde) sessions-migratie moet M2 laten falen; een onbekende kolom M1.
{ const tmp = path.join(ROOT, 'migratie_v99999.sql'); let S2 = null;
  try { fs.writeFileSync(tmp, 'ALTER TABLE public.sessions ADD COLUMN IF NOT EXISTS sabotage_kolom text NULL;\n'); S2 = scan(files.concat(['migratie_v99999.sql'])); } finally { try { fs.unlinkSync(tmp); } catch (_) {} }
  ok(S2 && S2.maxTouching > man.verifiedThroughMigration, 'SABOTAGE M2: niet-geverifieerde sessions-migratie wordt gedetecteerd');
  ok(S2 && S2.added.sabotage_kolom && !cols.has('sabotage_kolom'), 'SABOTAGE M1: kolom buiten het manifest wordt gedetecteerd'); }
console.log('\n[sessions schema-contract] RESULTAAT: ' + pass + ' geslaagd, ' + fail + ' mislukt');
process.exit(fail ? 1 : 0);
