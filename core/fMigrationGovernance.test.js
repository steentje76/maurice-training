/* fMigrationGovernance.test.js — MS-F13-02 regressietest. */
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');

let pass = 0, fail = 0;
const msgs = [];
function ok(cond, label) { if (cond) { pass++; } else { fail++; msgs.push('MISLUKT: ' + label); } }

const migratieBestanden = fs.readdirSync(ROOT).filter(function (f) {
  return /^migratie_v\d+\.sql$/.test(f);
});

ok(migratieBestanden.length >= 46, 'A1: minimaal 46 migratiebestanden gevonden (huidige keten intact)');

function stripSqlComments(sql) {
  return sql.split('\n').map(function (regel) {
    var idx = regel.indexOf('--');
    return idx === -1 ? regel : regel.slice(0, idx);
  }).join('\n');
}

var destructievePatronen = [
  /drop\s+table\s+if\s+exists\s+public\.(users|organizations|memberships|billing_events|hrv_log|sessions|training_instances)\b/i,
  /truncate\s+table/i,
  /delete\s+from\s+public\.\w+\s*;/i
];

var gevondenProblemen = [];
migratieBestanden.forEach(function (bestand) {
  var sql = fs.readFileSync(path.join(ROOT, bestand), 'utf8');
  var codeOnly = stripSqlComments(sql);
  destructievePatronen.forEach(function (patroon) {
    if (patroon.test(codeOnly)) {
      gevondenProblemen.push(bestand + ' matcht ' + patroon);
    }
  });
});

ok(gevondenProblemen.length === 0, 'B1: geen enkele migratie bevat een daadwerkelijk uitgevoerde destructieve operatie op kernstabellen. ' + (gevondenProblemen.length ? 'Gevonden: ' + gevondenProblemen.join('; ') : ''));

{
  const v501 = fs.readFileSync(path.join(ROOT, 'migratie_v501.sql'), 'utf8');
  ok(v501.includes('ROLLBACK') && v501.includes('DROP TABLE IF EXISTS'),
    'C1: het bestaande, gedocumenteerde ROLLBACK-commentaarpatroon in migratie_v501.sql is nog aanwezig');
  const codeOnly501 = stripSqlComments(v501);
  ok(!codeOnly501.match(/drop\s+table/i),
    'C2: de ROLLBACK-instructie in migratie_v501.sql staat uitsluitend in commentaar, wordt nooit daadwerkelijk uitgevoerd');
}

{
  const recente = ['migratie_v520.sql', 'migratie_v521.sql', 'migratie_v522.sql', 'migratie_v523.sql', 'migratie_v524.sql'];
  recente.forEach(function (bestand) {
    var pad = path.join(ROOT, bestand);
    if (fs.existsSync(pad)) {
      var sql = fs.readFileSync(pad, 'utf8');
      var heeftAddColumn = /add column/i.test(sql);
      var heeftCreateTable = /create table/i.test(sql);
      if (heeftAddColumn) ok(/add column if not exists/i.test(sql), 'D: ' + bestand + ' gebruikt "ADD COLUMN IF NOT EXISTS" (idempotent)');
      if (heeftCreateTable) ok(/create table if not exists/i.test(sql), 'D: ' + bestand + ' gebruikt "CREATE TABLE IF NOT EXISTS" (idempotent)');
    }
  });
}

console.log('fMigrationGovernance: ' + pass + ' geslaagd, ' + fail + ' mislukt');
if (msgs.length) console.log(msgs.join('\n'));
console.log('Resultaat: ' + pass + ' geslaagd, ' + fail + ' mislukt');
process.exit(fail > 0 ? 1 : 0);
