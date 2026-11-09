'use strict';
// Isolated real PostgreSQL proof. Synthetic data only; no host ports or production.
const {execFileSync}=require('node:child_process');
const path=require('node:path');
const name='tk603-night-proof-'+Date.now();
const root=path.resolve(__dirname,'..');
function docker(args){return execFileSync('docker',args,{encoding:'utf8',stdio:['ignore','pipe','pipe'],timeout:120000});}
let started=false;
try{
 docker(['run','--rm','--detach','--name',name,'--network','none','-e','POSTGRES_PASSWORD=synthetic_only_tk603','postgres:17']);started=true;
 let ready=false;
 for(let n=0;n<45;n++){try{docker(['exec',name,'pg_isready','-U','postgres']);ready=true;break;}catch{Atomics.wait(new Int32Array(new SharedArrayBuffer(4)),0,0,300);}}
 if(!ready)throw Error('PostgreSQL readiness failed');
 docker(['cp',path.join(root,'supabase/migrations/20261107191714_tk504_typed_catalog_fk_stage.sql'),name+':/tmp/tk504-typed-fk-stage.sql']);
 docker(['cp',path.join(root,'tools/tk504-typed-fk-security-smoke.sql'),name+':/tmp/tk504-typed-fk-smoke.sql']);
 const out=docker(['exec',name,'psql','-X','-v','ON_ERROR_STOP=1','-U','postgres','-d','postgres','-f','/tmp/tk504-typed-fk-smoke.sql']);
 if(!/two owners .+ preserved historical row PASS/.test(out)||!out.includes('ROLLBACK'))throw Error('Proof success markers missing');
 const count=docker(['exec',name,'psql','-X','-Atqc',"select count(*) from information_schema.tables where table_schema='auth'",'-U','postgres','-d','postgres']).trim();
 if(count!=='0')throw Error('Rollback left schemas');
 console.log('PASS: real PostgreSQL 17; 582 synthetic aliases; two synthetic JWT owners; RLS CRUD denials; same-UUID retry; revocation preserves history; transaction ROLLBACK; zero auth schema. No real Supabase JWT or production access.');
}catch(e){console.error(e.stderr?.toString()||e.message);process.exitCode=1;}
finally{if(started){try{docker(['stop',name]);console.log('PASS: temporary no-network container removed');}catch(e){console.error('CLEANUP FAILED: '+name);process.exitCode=1;}}}
