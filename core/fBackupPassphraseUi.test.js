'use strict';
const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('node:assert/strict');
const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
const ids=['tk-backup-pass','tk-backup-pass2','tk-backup-check-pass','tk-restore-pass'];
const fields={},events={};
for(const id of ids){
 assert(html.includes('id="'+id+'" type="password"'),'hidden by default: '+id);
 assert(html.includes('aria-controls="'+id+'"'),'button explicitly controls field');
 fields[id]={type:'password',value:'synthetic passphrase'};
 fields[id+'-toggle']={textContent:'Toon wachtzin',setAttribute(k,v){this[k]=v;}};
}
const doc={getElementById:id=>fields[id],addEventListener:(n,f)=>{events[n]=f;},hidden:false};
const ctx={document:doc,window:{addEventListener:(n,f)=>{events[n]=f;}}};
vm.createContext(ctx);
const start=html.indexOf('const TK_BACKUP_WACHTZIN_VELDEN='),end=html.indexOf('let tkBackupBusy=false;',start);
assert(start>=0&&end>start);vm.runInContext(html.slice(start,end),ctx);
for(const id of ids){
 ctx.tkToggleBackupWachtzin(id);assert.equal(fields[id].type,'text');assert.equal(fields[id+'-toggle']['aria-pressed'],'true');
 ctx.tkToggleBackupWachtzin(id);assert.equal(fields[id].type,'password');assert.equal(fields[id].value,'synthetic passphrase');
 ctx.tkToggleBackupWachtzin(id);
}
ctx.tkResetBackupWachtzinnen(false);
for(const id of ids){assert.equal(fields[id].type,'password');assert.equal(fields[id].value,'synthetic passphrase');}
doc.hidden=true;events.visibilitychange();
for(const id of ids){assert.equal(fields[id].value,'');assert.equal(fields[id].type,'password');fields[id].value='another synthetic passphrase';ctx.tkToggleBackupWachtzin(id);}
events.pagehide();
for(const id of ids){assert.equal(fields[id].value,'');assert.equal(fields[id].type,'password');}
assert(html.includes('wachtzin is niet herstelbaar'));
assert(html.includes("if(id==='m-export')tkResetBackupWachtzinnen(true)"));
console.log('Backup passphrase: four fields, accessible toggles, submit concealment, background/pagehide cleanup PASS');
