'use strict';
// TK504/TK603/TK614: files must match actual previously applied Supabase version+SQL.
// Static, fail-closed release check. DOES NOT query, mutate, repair or migrate any DB.
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..');
const migrations=[
['20261103155325_tk504_movekit_v2_media_grants.sql','20261107191701_tk504_movekit_v2_media_grants.sql','7e94ebf215ef3f9b207d760b11b14ef9c58872d5940105030d7b645898bdf0d7',1970],
['20261106110000_tk504_typed_catalog_fk_stage.sql','20261107191714_tk504_typed_catalog_fk_stage.sql','9eaa87433a06d654a96142be452987a8be9bcb7561a9bd76ff8aab00700cf278',9235],
['20261106161000_tk504_published_catalog_stage.sql','20261107191721_tk504_published_catalog_stage.sql','c9f09a44096b236d7f20a2a7bc2f781f6221cc5b9383351f24289767fdfe8d5a',3980],
['20261107154937_tk603_reserved_scope_provisioning_stage.sql','20261107191728_tk603_reserved_scope_provisioning_stage.sql','98eb2e9528ff497c87d71456378f500acafd5ed790d82d258f745effa6574c79',3427],
['20261108120000_tk614_admin_release_audit_stage.sql','20261108223504_tk614_admin_release_audit_stage.sql','3fdd2d58bbe733cad4cca09c20272843126779160ec1f3546d12b7059c90db89',4594],
];
const hash=x=>crypto.createHash('sha256').update(x).digest('hex');
let checks=0;const ok=(v,m)=>{assert.ok(v,m);checks++};const eq=(a,b,m)=>{assert.strictEqual(a,b,m);checks++};
const dir=path.join(root,'supabase','migrations');
for(const [oldname,newname,canonicalsha,chars] of migrations){
ok(!fs.existsSync(path.join(dir,oldname)),'obsolete name must not replay '+oldname);
ok(fs.existsSync(path.join(dir,newname)),'live version migration exists '+newname);
const src=fs.readFileSync(path.join(dir,newname),'utf8');
const lf=src.replace(/\r\n/g,'\n');
eq(lf.length,chars,'applied SQL character length '+newname);
eq(hash(lf),canonicalsha,'byte-exact match to live Supabase statements (LF) '+newname);
}
// Read source files and reject stale references; do not touch or check private data.
let scanned=0;
for(const part of ['core','tools','docs']){
 const stack=[path.join(root,part)];
 while(stack.length){
   const dir=stack.pop();
   for(const d of fs.readdirSync(dir,{withFileTypes:true})){
     const p=path.join(dir,d.name);
     if(d.isDirectory()){if(!['node_modules','.git','dist','build','coverage'].includes(d.name))stack.push(p);continue;}
     if(!/\.(?:js|cjs|mjs|md|ps1|json)$/.test(d.name))continue;
     const rel=path.relative(root,p).replace(/\\/g,'/');
     // The reconciliation evidence/test intentionally mentions the OBSOLETE versions as historical facts.
     if(['core/tk614MigrationLedgerAlignment.test.js','docs/TK614_MIGRATION_LEDGER_ALIGNMENT_20261109.md'].includes(rel))continue;
     const source=fs.readFileSync(p,'utf8');scanned++;
     for(const [oldname] of migrations)ok(!source.includes(oldname),'old applied migration reference in '+rel);
   }
 }
}
ok(scanned>75,'source scan covered tests, docs and tools');
const R=require('../tools/tk614_original226_admin_release.cjs');
const G=require('../docs/generated/MOVEKIT_V2_RELEASE_GATES.json');
eq(R.activationBlockers(G).length,0,'metadata fingerprint pin unchanged; still NOT an owner signature');
eq(R.original226ReleaseRecordProblems(G).length,0,'owner FK identity evidence preserved');
eq(G.released_batches.length,15,'media scope remains 15 batches');
eq(G.entries.length,1164,'media scope remains 1164 entries');
const doc=fs.readFileSync(path.join(root,'docs','TK614_MIGRATION_LEDGER_ALIGNMENT_20261109.md'),'utf8');
ok(doc.includes('20261107191701')&&doc.includes('20261108223504'),'ledger report includes first/last applied versions');
console.log('TK504/TK603/TK614 live migration alignment: '+checks+' assertions PASS; '+scanned+' source files scanned, 5/5 SQL hashes, zero DB writes');
