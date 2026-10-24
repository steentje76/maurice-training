'use strict';
const fs=require('fs'),os=require('os'),path=require('path'),cp=require('child_process'),assert=require('node:assert/strict');
const src=fs.readFileSync(path.join(__dirname,'localBackup.js'),'utf8');
const TEST='fSec570PrefixEscape.test.js';
const mutants=[
 ['G1 decoded prefix guard removed',"}else if(/\\\\u[0-9A-Fa-f]{4}/.test(candidate)){","}else if(false){"],
 ['G1 plain prefix guard removed',"if(/\\\\u[0-9A-Fa-f]{4}/.test(t))return NIET_TE_CONTROLEREN;","if(false)return NIET_TE_CONTROLEREN;"],
 ['G2 Y3 malformed decoded Unicode guard removed',"if(/\\\\u[0-9A-Fa-f]{4}/.test(candidate))return NIET_TE_CONTROLEREN;","if(false)return NIET_TE_CONTROLEREN;"],
 ['G2 malformed plain Unicode guard removed',"return /\\\\u[0-9A-Fa-f]{4}/.test(t)?NIET_TE_CONTROLEREN:null;","return null;"]
];
function run(source){
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'tk-sec57005-'));
 try{
  fs.writeFileSync(path.join(dir,'localBackup.js'),source);
  for(const f of ['localInventory.js',TEST])fs.copyFileSync(path.join(__dirname,f),path.join(dir,f));
  const r=cp.spawnSync(process.execPath,[path.join(dir,TEST)],{encoding:'utf8',timeout:20000});
  if(r.error)throw r.error;
  if(r.status!==0)assert.match(r.stderr,/AssertionError/,'only assertion failures count as killed mutants');
  return r.status;
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
}
assert.equal(run(src),0,'intact control passes');
for(const [label,before,after]of mutants){
 assert.equal(src.split(before).length-1,1,'unique anchor: '+label);
 assert.notEqual(run(src.replace(before,after)),0,label);console.log('KILLED '+label);
}
console.log('SEC-570-05 4/4 mutants killed; intact control passed');
