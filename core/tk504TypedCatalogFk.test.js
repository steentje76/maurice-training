'use strict';
// #603. All data below is synthetic. No Supabase write or license content.
const assert=require('node:assert/strict');
const api=require('./tk504TypedCatalogFk');
const id=n=>'TK-'+String(n).padStart(6,'0');
const provider=n=>'provider-'+String(n).padStart(6,'0');
const objects=Array.from({length:582},(_,i)=>{
  const n=i+1;
  const c={catalog_id:id(n),source:{provider:'movekit',provider_id:provider(n)},
    identity:{name:'synthetic-'+n,nl:'Synthetische oefening '+n}};
  if(n>226)c._review={status:'NOT_PUBLISHED',selectable:false};
  return c;
});
const map=new Map(objects.map(c=>[c.catalog_id,c]));
const ecs={byId:i=>map.get(i)||null};
const bound=new Set(Array.from({length:226},(_,i)=>api.fkForCatalog(id(i+1))));
const broker=api.create({catalogService:ecs,
  verifiedBinding:(cid,fk,slug)=>bound.has(fk)&&map.get(cid)?.source.provider_id===slug});
let checks=0;
function ok(v,msg){assert.ok(v,msg);checks++;}
function eq(a,b,msg){assert.deepEqual(a,b,msg);checks++;}
function throws(fn,code){assert.throws(fn,e=>e.code===code);checks++;}
function select(n){
 const c=map.get(id(n));return {id:id(n),_catalog:true,catalog_id:id(n),
   source:{provider:'movekit',provider_id:c.source.provider_id},name:c.identity.nl};
}
eq(api.KIND,'movekit-catalog-v1');
eq(api.MAX,582);
eq(api.fkForCatalog('TK-000227'),'TKC-000227');
eq(api.catalogForFk('TKC-000227'),'TK-000227');
eq(api.catalogForFk('TK-000227'),null);
eq(api.catalogForFk('TKC-999999'),null);
eq(api.parseCatalogId('TK-000583'),null);
throws(()=>api.fkForCatalog('TK-000583'),'INVALID_CATALOG_ID');
throws(()=>api.fkForCatalog('TK-000000'),'INVALID_CATALOG_ID');
const allIds=objects.map(c=>c.catalog_id);
const allAliases=api.planBindings(allIds,[]);
eq(allAliases.length,582);
eq(new Set(allAliases.map(x=>x.fkId)).size,582);
ok(allAliases.every((x,i)=>x.catalogId===id(i+1)&&x.fkId==='TKC-'+id(i+1).slice(3)),
   'alias is a unique typed namespace, never a bare catalog ID');
const personalCollision={id:id(38),name:'Eigen oefening met TK-ID',scope:'personal'};
const forgedPersonal={...personalCollision,_catalog:true,catalog_id:id(38)};
eq(broker.resolveSelection(personalCollision),null);
eq(broker.resolveSelection(forgedPersonal),null);
eq(broker.resolveSelection({id:id(38),catalog_id:id(38)}),null);
eq(broker.resolveSelection({...select(38),source:{provider:'other',provider_id:provider(38)}}),null);
eq(broker.resolveSelection({...select(38),source:{provider:'movekit',provider_id:'not-the-real-source'}}),null);
eq(broker.resolveSelection({id:id(38),_catalog:true,catalog_id:id(39)}),null);
ok(broker.resolveSelection(select(38))?.fkId==='TKC-000038');
eq(broker.resolveSelection(select(227)),null); // not published despite owner content approval
eq(broker.resolveSelection(select(582)),null);
throws(()=>broker.prepareSessionRow(select(227),{exercise_id:id(227)}),'NOT_CANONICAL_SELECTION');
throws(()=>broker.prepareSessionRow(forgedPersonal,{exercise_id:id(38)}),'NOT_CANONICAL_SELECTION');
const original=Object.freeze({id:'synthetic-row-1',exercise_id:id(38),
  note:'private training note A',sets:3,reps:8,weight:77.5,training_instance_id:'instance-1'});
const changed=broker.prepareSessionRow(select(38),original);
eq(changed.exercise_id,'TKC-000038');
eq(changed.note,original.note);
eq(changed.id,original.id);
eq(changed.training_instance_id,original.training_instance_id);
eq(original.exercise_id,id(38)); // no caller mutation
throws(()=>broker.prepareSessionRow(select(38),{...original,exercise_id:id(39)}),
  'SESSION_IDENTITY_MISMATCH');
throws(()=>broker.prepareSessionRow(select(38),null),'SESSION_IDENTITY_MISMATCH');
const ownerB=broker.prepareSessionRow(select(38),
 {id:'synthetic-row-B',exercise_id:id(38),note:'private note B',user_id:'user-B'});
eq(ownerB.exercise_id,changed.exercise_id); // global FK alias reused, not another personal row
eq(ownerB.note,'private note B');
eq(changed.note,'private training note A');
const historic=broker.resolveHistoryRow({exercise_id:'TKC-000038',note:'already saved'});
eq(historic.catalog_id,id(38));
eq(historic.session.note,'already saved');
eq(historic.identity.nl,'Synthetische oefening 38');
eq(broker.resolveHistoryRow({exercise_id:id(38),scope:'personal'}),null);
eq(broker.resolveHistoryRow({exercise_id:'TKC-000227'}),null);
eq(broker.resolveHistoryRow({exercise_id:'TKC-000583'}),null);
eq(broker.resolveHistoryRow({exercise_id:'unknown'}),null);
throws(()=>api.planBindings([id(227),id(227)],[]),'INVALID_OR_DUPLICATE_CATALOG_ID');
throws(()=>api.planBindings([id(227)],['TKC-000227']),'RESERVED_FK_COLLISION');
throws(()=>api.planBindings([id(583)],[]),'INVALID_OR_DUPLICATE_CATALOG_ID');
throws(()=>api.planBindings('not-an-array',[]),'INVALID_BINDING_PLAN');
const pending=map.get(id(227));
delete pending._review;
const pendingSelection=select(227);
ok(broker.resolveSelection(pendingSelection));
throws(()=>broker.prepareSessionRow(pendingSelection,{exercise_id:id(227)}),'CATALOG_FK_UNVERIFIED');
eq(broker.resolveHistoryRow({exercise_id:'TKC-000227'}),null);
bound.add('TKC-000227'); // simulates an independently verified DB seed/release
const published=broker.prepareSessionRow(pendingSelection,{exercise_id:id(227),reps:8});
eq(published.exercise_id,'TKC-000227');
eq(broker.resolveHistoryRow({exercise_id:'TKC-000227'}).catalog_id,id(227));
ok(Object.isFrozen(published));
ok(Object.isFrozen(broker.resolveSelection(select(1))));
const mockDbIds=['TK-000038','TK-000019','legacy','user-exercise-1'];
const safe=api.planBindings(allIds,mockDbIds);
eq(safe.length,582);
console.log('TK504 typed catalog FK contract: '+checks+' assertions PASS; 582 aliases, personal collisions, history, offline idempotent keys, two owners, release deny-by-default');
