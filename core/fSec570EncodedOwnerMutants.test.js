/* SEC-570-03B: mutation tests for owner isolation across multiple URL encodings. */
'use strict';
const fs=require('fs'),os=require('os'),path=require('path'),assert=require('assert'),cp=require('child_process');
const source=fs.readFileSync(path.join(__dirname,'localBackup.js'),'utf8');
const test='fSec570EncodedOwner.test.js';
const mutants=[
 ['encoded filter bypass','for(const deel of decoded.split(\'&\')){','for(const deel of f.split(\'&\')){'],
 ['ignore decoded JSON owner','if(parsed){const r=embeddedOtherOwner(p,owner,depth+1);if(r)return r;}','if(parsed){/* intentionally disabled */}'],
];
const run=(s)=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'tk-encoded-owner-'));
 try{
  fs.writeFileSync(path.join(dir,'localBackup.js'),s);
  for(const file of ['localInventory.js',test])fs.copyFileSync(path.join(__dirname,file),path.join(dir,file));
  const r=cp.spawnSync(process.execPath,[path.join(dir,test)],{cwd:dir,encoding:'utf8',timeout:120000});
  assert.notEqual(r.status,null,'test timed out');
  return r.status;
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
};
assert.equal(run(source),0,'unmutated controls must pass');let n=1;
for(const [name,from,to] of mutants){
 assert.equal(source.split(from).length-1,1,'mutation anchor missing '+name);
 assert.notEqual(run(source.replace(from,to)),0,'live mutant '+name);
 console.log('PASS killed '+name);n++;
}
console.log('SEC-570-03B mutants: '+n+'/'+n);
