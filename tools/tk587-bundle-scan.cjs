'use strict';
/* TK587 release gate: no secrets and no licensed MoveKit sources in a web bundle / APK asset tree.
 * Usage: node tools/tk587-bundle-scan.cjs <dir> [<dir> ...]   exit 1 on any finding
 *        node tools/tk587-bundle-scan.cjs --self-test           proves the gate can fail
 * Plain file scan (no pipes), so SIGPIPE/pipefail or negated commands cannot mask a hit.
 * The literal word "service_role" is allowed (core/observability.js uses it as a redaction key);
 * a real credential is: a JWT whose payload role is service_role, an sb_secret_ key, a live
 * Stripe key, a private key block, or an assigned SUPABASE_SERVICE_ROLE value. */
const fs = require('fs'), path = require('path'), os = require('os');

const TEXT_EXT = /\.(html?|js|cjs|mjs|json|css|txt|xml|properties|map|md)$/i;
const MEDIA_EXT = /\.(mp4|mov|webm|m4v|mkv|avi)$/i;
const LICENSE_NAME = /licen[cs]e/i;
const PATTERNS = [
  ['supabase-secret-key', /\bsb_secret_[A-Za-z0-9_-]{10,}/],
  ['stripe-live-key', /\bsk_live_[A-Za-z0-9]{10,}/],
  ['private-key-block', /-----BEGIN (?:RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----/],
  ['service-role-assignment', /SUPABASE_SERVICE_ROLE(?:_KEY)?\s*[:=]\s*['"`][^'"`\s]{20,}/],
];
const JWT = /\beyJ[A-Za-z0-9_-]{8,}\.(eyJ[A-Za-z0-9_-]{8,})\.[A-Za-z0-9_-]{8,}/g;

function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out); else if (e.isFile()) out.push(p);
  }
  return out;
}
function jwtRole(seg) {
  try { return JSON.parse(Buffer.from(seg.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8')).role || null; }
  catch (_) { return null; }
}
function scan(root) {
  const findings = [];
  for (const f of walk(root)) {
    const rel = path.relative(root, f), base = path.basename(f);
    if (MEDIA_EXT.test(base)) findings.push(['licensed-media-file', rel]);
    if (LICENSE_NAME.test(base)) findings.push(['license-file', rel]);
    if (!TEXT_EXT.test(base)) continue;
    const s = fs.readFileSync(f, 'utf8');
    for (const [id, re] of PATTERNS) if (re.test(s)) findings.push([id, rel]);
    for (const m of s.matchAll(JWT)) if (jwtRole(m[1]) === 'service_role') findings.push(['service-role-jwt', rel]);
  }
  return findings;
}
function selfTest() {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'tk587-scan-'));
  const b64 = o => Buffer.from(JSON.stringify(o)).toString('base64url');
  const fake = (role) => 'eyJ' + b64({ alg: 'HS256' }).slice(3) + '.' + b64({ role, iss: 'x' }) + '.' + 'c2lnbmF0dXJlc2lnbmF0dXJl';
  fs.writeFileSync(path.join(d, 'ok.js'), "const REDACT=['service_role'];const anon='" + fake('anon') + "';");
  if (scan(d).length) throw new Error('self-test: clean fixture flagged ' + JSON.stringify(scan(d)));
  fs.writeFileSync(path.join(d, 'bad.js'), "x='" + fake('service_role') + "'");
  fs.mkdirSync(path.join(d, 'media'));
  fs.writeFileSync(path.join(d, 'media', 'clip.mp4'), '');
  fs.writeFileSync(path.join(d, 'MOVEKIT_LICENSE.txt'), 'x');
  const ids = scan(d).map(x => x[0]).sort();
  for (const need of ['license-file', 'licensed-media-file', 'service-role-jwt'])
    if (!ids.includes(need)) throw new Error('self-test: missed ' + need + ' got ' + ids);
  fs.rmSync(d, { recursive: true, force: true });
  console.log('tk587-bundle-scan self-test PASS (clean fixture clean; service_role JWT, media and license file detected)');
}

if (process.argv[2] === '--self-test') { selfTest(); process.exit(0); }
const roots = process.argv.slice(2);
if (!roots.length) { console.error('usage: tk587-bundle-scan.cjs <dir>...'); process.exit(2); }
let total = 0;
for (const r of roots) {
  if (!fs.existsSync(r) || !fs.statSync(r).isDirectory()) { console.error('not a directory: ' + r); process.exit(2); }
  const f = scan(r); total += f.length;
  f.forEach(([id, rel]) => console.error('FINDING ' + id + ' ' + path.join(r, rel)));
  console.log(r + ': ' + walk(r).length + ' files scanned, ' + f.length + ' findings');
}
process.exit(total ? 1 : 0);
