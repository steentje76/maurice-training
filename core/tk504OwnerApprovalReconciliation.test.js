'use strict';
// Release gate: the already approved 356 Dutch display fields are pinned to
// 15 existing owner-review hashes. Never reinterpret content approval as a
// media, training, production, or database-write authorization.
const {spawnSync}=require('node:child_process');
const path=require('node:path');
const assert=require('node:assert/strict');
const py=process.platform==='win32'?'python':'python3';
const script=path.join(__dirname,'..','tools','test_tk504_owner_approval_reconcile.py');
const result=spawnSync(py,[script],{
  cwd:path.join(__dirname,'..'),encoding:'utf8',timeout:120000,
  env:{...process.env,PYTHONDONTWRITEBYTECODE:'1'}
});
assert.ifError(result.error);
assert.equal(result.status,0,(result.stderr||'')+'\n'+(result.stdout||''));
assert.match(result.stdout,/deterministic synthetic assertions PASS/);
console.log(result.stdout.trim());
