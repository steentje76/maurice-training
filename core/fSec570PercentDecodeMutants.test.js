/* SEC-570-03A: mutant sensitivity for bounded repeated URL decoding. */
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path'),cp=require('node:child_process');
const source=fs.readFileSync(path.join(__dirname,'localBackup.js'),'utf8');
const mutate=[
 ['one round only','const MAX_URL_DECODE_RONDES=4;','const MAX_URL_DECODE_RONDES=1;'],
 ['no extra layer fail-closed','if(/%[0-9A-Fa-f]{2}/.test(d))return NIET_TE_CONTROLEREN;','if(false)return NIET_TE_CONTROLEREN;'],
 ['no secret checking after decode','if(TEKST_GEHEIM.some(r=>r.test(d))||bevatJwt(d))return true;','if(false)return true;']
];
let tests=0;
function run(p,body){
 const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'tk-sec57003a-mut-'));
 try{
  for(const name of ['localInventory.js','fSec570PercentDecode.test.js'])fs.copyFileSync(path.join(__dirname,name),path.join(tmp,name));
  fs.writeFileSync(path.join(tmp,'localBackup.js'),body);
  const result=cp.spawnSync(process.execPath,[path.join(tmp,'fSec570PercentDecode.test.js')],{cwd:tmp,encoding:'utf8',timeout:120000});
  assert.notEqual(result.status,null,'test timed out: '+p);
  return result.status;
 }finally{fs.rmSync(tmp,{recursive:true,force:true});}
}
assert.equal(run('clean',source),0,'unmodified must pass');tests++;console.log('PASS normal control');
for(const [name,from,to] of mutate){
 assert.equal(source.split(from).length-1,1,name+': exact one mutation anchor required');
 assert.notEqual(run(name,source.replace(from,to)),0,name+': regression suite must reject mutant');
 tests++; console.log('PASS killed mutant '+name);
}
console.log('SEC-570-03A mutation: '+tests+'/'+tests);
