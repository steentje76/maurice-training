'use strict';
/* TK-REL-SEC-29 read-only encrypted rescue export; no restoration or data mutation. */
const assert=require('assert');
const {webcrypto}=require('crypto');
const B=require('./localBackup');
const M=require('./localInventory');
let count=0;
function ok(test,label){assert(test,label);count++;console.log('PASS',label);}
async function reject(fn,label){await assert.rejects(fn);count++;console.log('PASS',label);}
const owner='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const other='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
function input(){
  return {owner,cacheOwner:owner,manifest:M.BRONNEN,
    local:{
      'tk_trainings':JSON.stringify([{id:'ct1',name:'Mijn training',access_token:'NO_EXPORT',exercise_targets:[{reps:8}]}]),
      'tk_draft_training':JSON.stringify({t:'Squat',sessionLog:[{reps:5}]}),
      'tk_gw_hist':JSON.stringify({squat:{weight:90}}),
      'tk_auth_session':JSON.stringify({access_token:'SUPER_SECRET'}),
      'tk_cache_owner_uid':owner,
      ['tk_running_execution_v1_'+owner]:JSON.stringify({state:'run'}),
      ['tk_running_execution_v1_'+other]:JSON.stringify({state:'private other'}),
      'tk_wb_saved':JSON.stringify([{id:'old'}]),
      'totally_unknown_key':'other secret local source'
    },
    queue:[{id:5,owner_uid:owner,item:{table:'sessions',method:'POST',body:{reps:5,id:'s1',refresh_token:'REMOVE_ME'}}},
      {id:6,owner_uid:other,item:{table:'sessions',method:'POST',body:{reps:9}}},
      {id:7,owner_uid:owner,item:{table:'sessions',method:'POST',body:{user_id:other,reps:10}}}]};
}
(async()=>{
  const src=input(),before=JSON.stringify(src);
  const b=B.prepare(src);
  ok(b.format==='tk-local-rescue-data.v1'&&b.complete===false&&!b.restoreAllowed,'not deinstall-safe or restorable');
  ok(JSON.stringify(src)===before,'snapshot untouched');
  ok(b.entries.some(e=>e.key==='tk_trainings')&&b.entries.some(e=>e.key==='tk_draft_training'),'durable and draft included');
  ok(b.entries.some(e=>e.storage==='offline_queue'&&e.key==='5'),'owner queue retained');
  ok(!b.entries.some(e=>e.storage==='offline_queue'&&e.key==='6'),'other owner queue excluded');
  ok(!b.entries.some(e=>e.storage==='offline_queue'&&e.key==='7')&&b.omissions.some(x=>x.reason==='payload_other_owner'),'legacy queue item with mismatched payload owner rejected');
  ok(!b.entries.some(e=>e.key==='tk_auth_session'),'authentication session excluded');
  ok(b.entries.some(e=>e.key==='tk_wb_saved'),'legacy Builder data included only when cache owner matches');
  ok(!b.entries.some(e=>e.key==='tk_running_execution_v1_'+other),'other owner running session excluded');
  ok(b.omissions.some(e=>e.source==='unrecognized_local_storage'),'unknown source flagged');
  ok(!JSON.stringify(b).includes('SUPER_SECRET')&&!JSON.stringify(b).includes('NO_EXPORT')&&!JSON.stringify(b).includes('REMOVE_ME'),'nested and top-level tokens stripped');
  const encrypted=await B.encrypt(b,'unique password twelve',webcrypto);
  ok(encrypted.format===B.FORMAT&&!JSON.stringify(encrypted).includes('Squat'),'file ciphertext only');
  const r=await B.inspect(encrypted,'unique password twelve',webcrypto);
  ok(r.entries===b.entries.length&&r.owner===owner&&!r.complete&&!r.restoreAllowed,'decrypt is read-only dry run');
  await reject(()=>B.inspect(encrypted,'wrong password 12',webcrypto),'wrong password rejected');
  await reject(()=>B.inspect({...encrypted,data:encrypted.data.slice(0,-4)+'AAAA'},'unique password twelve',webcrypto),'tampered ciphertext rejected');
  await reject(()=>B.encrypt(b,'too short',webcrypto),'weak passphrase rejected');
  await reject(()=>B.inspect({...encrypted,iterations:1},'unique password twelve',webcrypto),'tampered KDF parameters rejected');
  const forB=B.prepare({...src,owner:other});
  ok(!forB.entries.some(e=>e.key==='tk_trainings'),'other user never gets A cache');
  console.log('fLocalEncryptedBackup: '+count+'/'+count);
})().catch(e=>{console.error(e.stack||e);process.exitCode=1;});