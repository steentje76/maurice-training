'use strict';
// #603: actual stable UUID helper. A network acknowledgement may be lost AFTER
// server COMMIT; repeat the SAME session UUID on retry, never invent a new FK.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
const start=html.indexOf('function tk504StableSessionId(');
assert(start>0,'production helper missing');
let braces=0,end=-1;
for(let i=html.indexOf('{',start);i<html.length;i++){
 if(html[i]==='{')braces++;
 if(html[i]==='}'&&--braces===0){end=i;break;}
}
assert(end>start);
const fn=html.slice(start,end+1);
let generated=0;
const s=vm.createContext({newClientRowId:()=>(
 '00000000-0000-4000-8000-'+String(++generated).padStart(12,'0'))});
vm.runInContext(fn,s);
let n=0;function eq(a,b,name){assert.equal(a,b,name);n++;}
const log={sets:[{kg:35,reps:8}]},another={sets:[{kg:45,reps:6}]};
const first=s.tk504StableSessionId(log);
eq(first,'00000000-0000-4000-8000-000000000001','first canonical UUID');
eq(s.tk504StableSessionId(log),first,'same sessionLog retains UUID on retry');
eq(generated,1,'no new UUID on retry');
eq(s.tk504StableSessionId(another),'00000000-0000-4000-8000-000000000002','different workout has different UUID');
assert.throws(()=>s.tk504StableSessionId(null),/tk504_missing_session_log/);n++;
assert.throws(()=>s.tk504StableSessionId({_tk504StableSessionId:'abc'}),/tk504_invalid_session_uuid/);n++;
s.newClientRowId=()=> 'row-fallback-non-uuid';
assert.throws(()=>s.tk504StableSessionId({}),/tk504_uuid_unavailable/);n++;
assert.match(html,/if\(_soS\.tk504_binding\)row\.id=tk504StableSessionId\(l\)/);
n++;
assert.match(html,/\.\.\.\(_so\.tk504_binding\?\{id:tk504StableSessionId\(l\)\}:\{\}\)/);
n++;
assert.match(html,/row\.id=tk504StableSessionId\(sessionLog\[LOS_DOMID\]/);
n++;
assert.match(html,/const TK504_TYPED_FK_SESSION_RELEASE = false;/);
n++;
console.log('TK603 typed FK stable UUID: '+n+' real-code assertions PASS; only catalog bound branches assign stable id');
