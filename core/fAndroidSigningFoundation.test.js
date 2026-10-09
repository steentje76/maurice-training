/* Sprint 7 Track A — Android Signing Foundation (ADR-ANDROID-SIGNING-001).
 *
 * Bewaakt dat:
 *  - de repository en de workflows geen sleutelmateriaal bevatten of kunnen lekken (preflight-script);
 *  - de debug-workflow de publieke certificaatvingerafdruk vastlegt en eerlijk meldt dat een
 *    CI-debug-APK NIET updatebaar is;
 *  - de interne workflow alleen via de beschermde environment tekent, de keystore alleen in
 *    $RUNNER_TEMP zet en altijd opruimt, en weigert zonder vastgestelde vingerafdruk;
 *  - tools/android-verify-cert.sh de juiste exitcodes geeft (0 gelijk, 1 afwijkend, 2 niet vastgesteld).
 * Geen netwerk, geen Android SDK nodig (apksigner wordt gesimuleerd).
 */
'use strict';
const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawnSync } = require('child_process');
const ROOT = path.join(__dirname, '..');

let pass = 0, fail = 0;
const msgs = [];
function ok(c, l) { if (c) pass++; else { fail++; msgs.push('MISLUKT: ' + l); } }
const lees = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const heeftBash = spawnSync('bash', ['-c', 'exit 0']).status === 0;

// ── 1. Preflight-script ──
if (heeftBash) {
  const r = spawnSync('bash', [path.join(ROOT, 'tools/android-signing-preflight.sh')], { cwd: ROOT, encoding: 'utf8' });
  ok(r.status === 0 && /SIGNING-PREFLIGHT: OK/.test(r.stdout), 'preflight: repository en workflows schoon (' + (r.stdout || '').trim().split('\n').slice(-3).join(' | ') + ')');
} else { ok(true, 'preflight: SKIP (geen bash)'); }

// ── 2. Debug-workflow ──
const DBG = lees('.github/workflows/android-debug-apk.yml');
ok(/id: signing[\s\S]*tools\/android-verify-cert\.sh "\$APK"/.test(DBG), 'debug: vingerafdruk wordt na de build vastgelegd');
ok(/cert_sha256: \$\{\{ steps\.signing\.outputs\.cert_sha256 \}\}/.test(DBG), 'debug: vingerafdruk is job-output');
ok(/Certificaat SHA-256: \$\{CERT_SHA256\}/.test(DBG) && /NIET bijwerken/.test(DBG), 'debug: release-notes noemen vingerafdruk en "niet updatebaar"');
ok(/\.signing\.txt/.test(DBG), 'debug: signingrapport (publiek) bij de artefacten');
ok(!/secrets\./.test(DBG), 'debug: gebruikt geen secrets');

// ── 3. Interne workflow ──
const INT = lees('.github/workflows/android-internal-apk.yml');
const buildJob = INT.slice(INT.indexOf('\n  build-internal:'));
const dryJob = INT.slice(INT.indexOf('\n  pipeline-dryrun:'), INT.indexOf('\n  build-internal:'));
ok(/environment: android-internal/.test(buildJob), 'intern: signing alleen via beschermde environment');
ok(/if: \$\{\{ github\.event_name == 'workflow_dispatch' \}\}/.test(buildJob), 'intern: echte signing alleen handmatig');
ok(/printf '%s' "\$KS_B64" \| base64 -d > "\$RUNNER_TEMP\/tk-internal\.jks"/.test(buildJob), 'intern: keystore alleen in RUNNER_TEMP');
ok(/if: \$\{\{ always\(\) \}\}\n\s+run: rm -f "\$RUNNER_TEMP\/tk-internal\.jks"/.test(buildJob), 'intern: keystore wordt altijd verwijderd');
ok(/--ks-pass env:KS_PASS/.test(buildJob) && /--key-pass env:KEY_PASS/.test(buildJob) && !/--ks-pass pass:/.test(INT), 'intern: wachtwoorden via env, nooit op de opdrachtregel');
ok(/android-verify-cert\.sh dist\/app-internal\.apk android\/signing\/INTERNAL_CERT_SHA256/.test(buildJob), 'intern: vingerafdruk moet gelijk zijn aan de vastgelegde');
ok(/INTERNAL_CERT_SHA256 is nog niet vastgesteld/.test(buildJob) && /Signing-secrets ontbreken/.test(buildJob), 'intern: stopt met PO-melding zonder secrets of vingerafdruk');
const uploadPad = (buildJob.split('upload-artifact@v4')[1] || '').split('retention-days')[0];
ok(/dist\//.test(uploadPad) && !/RUNNER_TEMP|\.jks|\.keystore/.test(uploadPad), 'intern: artefact bevat alleen dist/');
ok(!/TK_KEYSTORE_/.test(INT), 'intern: raakt de Play-upload-sleutel (TK_KEYSTORE_*) niet');
ok(!/upload-artifact/.test(dryJob) && !/secrets\./.test(dryJob), 'dry run: geen upload, geen secrets');
ok(/::add-mask::\$PW/.test(dryJob) && /rm -f "\$RUNNER_TEMP\/tk-internal\.jks"/.test(dryJob), 'dry run: wegwerpsleutel gemaskeerd en opgeruimd');
ok(/test "\$rc" -ne 0/.test(dryJob), 'dry run: een wegwerpsleutel mag nooit als "updatebaar" slagen');

// ── 4. Gradle en vingerafdrukbestand ──
const GR = lees('android/app/build.gradle');
ok(/applicationId "com\.trainingskompas\.app"/.test(GR), 'gradle: applicationId ongewijzigd');
ok(!/signingConfig signingConfigs\.debug/.test(GR), 'gradle: release valt nooit terug op de debugsleutel');
const FP = lees('android/signing/INTERNAL_CERT_SHA256').split('\n').filter((l) => l.trim() && !/^\s*#/.test(l))[0].trim();
ok(/^(NOG_NIET_VASTGESTELD|[0-9a-f]{64})$/.test(FP), 'vingerafdrukbestand: placeholder of 64 hex');
ok(/^android\/keystore\.properties$/m.test(lees('.gitignore')) && /^\*\.jks$/m.test(lees('.gitignore')), '.gitignore dekt keystores af');

// ── 5. android-verify-cert.sh (apksigner gesimuleerd) ──
if (heeftBash) {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'tksign-'));
  const apk = path.join(tmp, 'x.apk'); fs.writeFileSync(apk, 'x');
  const hex = 'ab'.repeat(32);
  const fake = path.join(tmp, 'apksigner');
  fs.writeFileSync(fake, '#!/usr/bin/env bash\necho "Verifies"\necho "Signer #1 certificate DN: CN=Test"\necho "Signer #1 certificate SHA-256 digest: ' + hex + '"\n'); fs.chmodSync(fake, 0o755);
  const run = (verwacht) => {
    const args = [path.join(ROOT, 'tools/android-verify-cert.sh'), apk]; if (verwacht) args.push(verwacht);
    return spawnSync('bash', args, { encoding: 'utf8', env: Object.assign({}, process.env, { APKSIGNER: fake, GITHUB_OUTPUT: '' }) });
  };
  const fpGelijk = path.join(tmp, 'gelijk'); fs.writeFileSync(fpGelijk, '# c\n' + hex + '\n');
  const fpAnders = path.join(tmp, 'anders'); fs.writeFileSync(fpAnders, 'cd'.repeat(32) + '\n');
  const fpLeeg = path.join(tmp, 'leeg'); fs.writeFileSync(fpLeeg, '# c\nNOG_NIET_VASTGESTELD\n');
  const r0 = run(null), r1 = run(fpGelijk), r2 = run(fpAnders), r3 = run(fpLeeg);
  ok(r0.status === 0 && r0.stdout.indexOf('cert_sha256=' + hex) >= 0, 'verify-cert: toont vingerafdruk');
  ok(r1.status === 0 && /updatebaar/.test(r1.stdout), 'verify-cert: gelijk → 0');
  ok(r2.status === 1 && /NIET bijwerken/.test(r2.stdout), 'verify-cert: afwijkend → 1');
  ok(r3.status === 2 && /nog geen interne certificaatvingerafdruk/.test(r3.stdout), 'verify-cert: niet vastgesteld → 2');
  fs.rmSync(tmp, { recursive: true, force: true });
} else { ok(true, 'verify-cert: SKIP (geen bash)'); }

msgs.forEach((m) => console.log(m));
console.log('fAndroidSigningFoundation: ' + pass + ' geslaagd, ' + fail + ' mislukt');
console.log('Resultaat: ' + pass + ' geslaagd, ' + fail + ' mislukt');
process.exit(fail ? 1 : 0);
