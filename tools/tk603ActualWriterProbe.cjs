'use strict';
// Actual extracted app builder/RPC/HTTP/session writer against isolated real services.
// DOM, FIFO dependency discovery and timeout scheduling are adapters, not browser acceptance.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),crypto=require('node:crypto');
module.exports=async function probe({root,rest,A,B,query,sql,assert}){
 const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
 const sourceHash=crypto.createHash('sha256').update(html).digest('hex');
 function take(name){const m=new RegExp('(?:async\\s+)?function\\s+'+name+'\\s*\\(').exec(html);if(!m)throw Error('missing actual app '+name);for(let e=html.indexOf('}',m.index);e>=0;e=html.indexOf('}',e+1)){const s=html.slice(m.index,e+1);try{new vm.Script(s);return s;}catch{}}throw Error(name);}
 const catalog=JSON.parse(html.match(/^const EX_CATALOG = (\{.*\});?\s*$/m)[1]).catalog;
 const item=catalog.find(c=>c.catalog_id==='TK-000038');if(!item)throw Error('missing published fixture identity');
 const escaped=item.source.provider_id.replace(/'/g,"''"),uuid=crypto.randomUUID();
 const funcs=['sbFetch','sbRpc','tkNormalizeSessionsRow','tkSchrijfUitkomst','sbPostQ','tk504CatalogSourceRefFromCatalog','tk504CatalogSourceRefFromSelection','tk504ValidateCatalogSourceRef','tk504VerifySessionBinding','tk504RewriteVerifiedSessionRow','writeSessionRow','buildStrengthSessionRow'];
 const sessions=[];let queue=0,rpcs=0,dropAck=true;
 function app(user){
  const c=vm.createContext({console,Date,Math,JSON,Object,Array,Number,parseFloat,parseInt,isFinite,crypto,
   SB_URL:rest,SB_H:{Authorization:'Bearer '+user.token,'Content-Type':'application/json'},authSession:{user:{id:user.id}},
   tkEigenaarUid:()=>user.id,TK504_TYPED_FK_SESSION_RELEASE:true,navigator:{onLine:true},
   ExerciseCatalogService:{byId:id=>catalog.find(c=>c.catalog_id===id)||null},
   IDEMPOTENT_TABELLEN_MET_CLIENT_ID:{sessions:true},TK_IDEMPOTENT_ZONDER_UPDATE:{},
   TK_WACHTRIJ_OUDERS:{sessions:true},tkWachtrijHeeftOuder:async()=>false,
   offlineQueueAdd:async()=>{queue++;return true;},updateOfflineBadge:()=>{},tkLogSchrijf:()=>{},tkFoutcode:()=>null,
   sbRetryable:n=>n===401||n===429||n>=500,tkMetTimeout:async p=>await p,TK_SCHRIJF_TIMEOUT_MS:10000,
   newClientRowId:()=>crypto.randomUUID(),
   fetch:async(url,opts)=>{
    const target=new URL(url);if(target.origin!==new URL(rest).origin||!target.pathname.startsWith('/rest/v1/'))throw Error('non-local request denied');
    target.pathname=target.pathname.slice('/rest/v1'.length);
    const response=await fetch(target,{...opts,signal:AbortSignal.timeout(10000)});
    if(target.pathname.includes('/rpc/'))rpcs++;
    if(target.pathname==='/sessions'&&opts.method==='POST'){
     sessions.push({body:JSON.parse(opts.body),prefer:opts.headers.Prefer});
     if(dropAck&&response.ok){dropAck=false;await response.text();throw Error('synthetic ACK loss AFTER real server committed');}
    }
    return response;
   }});
  vm.runInContext(funcs.map(take).join('\n'),c);return c;
 }
 sql("update public.movekit_catalog_fk_bindings set provider_id='"+escaped+"' where catalog_id='TK-000038';");
 try{
  let c=app(A);
  const raw=c.buildStrengthSessionRow('TK-000038',[{kg:42.5,effKg:42.5,reps:8,rpe:8}],{date:'2026-11-07',training_type:null,note:'actual builder synthetic probe',instanceId:null}).row;
  raw.id=uuid;const serialized=JSON.stringify(raw),ref=c.tk504CatalogSourceRefFromSelection('TK-000038');
  let binding=await c.tk504VerifySessionBinding({id:'TK-000038',tk504_catalog_ref:ref});
  assert(binding.owner_uid===A.id&&binding.fk_id==='TKC-000038','actual app provenance and RPC obtain real owner A typed binding');
  const opts={tk504_binding:binding};assert(await c.writeSessionRow(raw,opts)===false&&opts.status==='failed','actual sbPostQ reports lost acknowledgement as failed');
  let r=await query('/sessions?id=eq.'+uuid,A);
  assert(r.status===200&&r.data.length===1&&r.data[0].weight===42.5&&r.data[0].reps===8,'unmodified actual strength-builder payload committed before lost ACK, no synthetic date injection');
  // Fresh JS VM, same durable bytes. No retained binding or global writer state.
  c=app(A);binding=await c.tk504VerifySessionBinding({id:'TK-000038',tk504_catalog_ref:ref});
  assert(await c.writeSessionRow(JSON.parse(serialized),{tk504_binding:binding})===true,'fresh app writer VM reauthorizes and confirms same UUID retry through real PostgREST');
  r=await query('/sessions?id=eq.'+uuid,A);
  assert(r.status===200&&r.data.length===1&&r.data[0].user_id===A.id&&r.data[0].exercise_id==='TKC-000038'&&r.data[0].sets_detail[0].kg===42.5,'real retry preserves one own typed row and original set details');
  assert(JSON.stringify(sessions[0].body)===JSON.stringify(sessions[1].body)&&sessions.every(x=>x.prefer.includes('merge-duplicates')),'actual sbFetch emits identical replay payload and canonical idempotent Prefer header');
  c=app(B);binding=await c.tk504VerifySessionBinding({id:'TK-000038',tk504_catalog_ref:ref});
  const denied=await c.writeSessionRow(JSON.parse(serialized),{tk504_binding:binding,detail:true});
  assert(denied&&denied.ok===false&&denied.status==='rejected'&&denied.http===403,'actual writer with independent B JWT receives exact HTTP 403 for A UUID replay');
  r=await query('/sessions?id=eq.'+uuid,A);
  assert(r.status===200&&r.data.length===1&&r.data[0].user_id===A.id&&r.data[0].weight===42.5,'denied real B replay preserves original A payload');
  assert(crypto.createHash('sha256').update(fs.readFileSync(path.join(root,'index.html'),'utf8')).digest('hex')===sourceHash,'actual extracted writer source unchanged during probe; SHA256 '+sourceHash);
  assert(queue===0&&rpcs===3,'each VM independently resolves binding and no typed failure enters offline queue');
 }finally{
  await query('/sessions?id=eq.'+uuid,A,'DELETE',undefined,'return=representation');
  sql("update public.movekit_catalog_fk_bindings set provider_id='synthetic-vendor-000038' where catalog_id='TK-000038';");
 }
};
