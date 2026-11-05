/* SEC-570-04: mutation sensitivity for F1, F2 and F4, using disposable modules only. */
'use strict';
const fs=require('fs'),os=require('os'),path=require('path'),cp=require('child_process'),assert=require('node:assert/strict');
const src=fs.readFileSync(path.join(__dirname,'localBackup.js'),'utf8');
const TEST='fSec57004Regression.test.js';
const mutants=[
 ['F1 decoded JSON not deeply checked','const result=geheimIn(p,st,depth+1,true);','const result=null;'],
 ['F2 credential variants disabled',"function variantCredentialKey(k){return typeof k==='string'&&CREDENTIAL_VARIANT.test(k.replace(/[^a-z0-9]/gi,'').toLowerCase());}","function variantCredentialKey(k){return false;}"],
 ['F4 filter value double-decoded',"const k=i<0?deel:deel.slice(0,i), w=i<0?'':deel.slice(i+1);","const k=i<0?deel:deel.slice(0,i), w=i<0?'':decodeURIComponent(deel.slice(i+1));"]
];
function check(source) {
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'tk-sec57004-'));
 try{
  fs.writeFileSync(path.join(dir,'localBackup.js'),source);
  for(const f of ['localInventory.js',TEST])fs.copyFileSync(path.join(__dirname,f),path.join(dir,f));
  const run=cp.spawnSync(process.execPath,[path.join(dir,TEST)],{cwd:dir,encoding:'utf8',timeout:120000});
  if(run.error)throw run.error;
  return run.status;
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
}
assert.equal(check(src),0,'intact control must pass');
let pass=1;console.log('PASS M0 unmutated control');
for(const [label,before,after] of mutants){
 assert.equal(src.split(before).length-1,1,'mutation anchor exactly once: '+label);
 assert.notEqual(check(src.replace(before,after)),0,'mutant must be killed: '+label);
 pass++;console.log('PASS mutant killed: '+label);
}
console.log('SEC-570-04 mutants '+pass+'/'+pass);
