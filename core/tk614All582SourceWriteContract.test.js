'use strict';
/**
 * TK614 - all 582 source-qualified catalog to session mapping regression.
 * Actual index.html functions are executed with synthetic catalog additions and
 * synthetic authenticated RPC outcomes. No cloud/API calls, no private media.
 * This verifies the entire original 226 plus the already-bound 356, including
 * legacy ID collision and no-fallback semantics. Not production acceptance.
 */
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.resolve(__dirname,'..');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const published=JSON.parse(fs.readFileSync(path.join(root,'exercise-catalog.json'),'utf8'));
assert.equal(published.count,226);
assert.equal(published.catalog.length,226);
const pad=n=>String(n).padStart(6,'0');
const id=n=>'TK-'+pad(n);
const fk=n=>'TKC-'+pad(n);
const newer=Array.from({length:356},(_,i)=>{
 const n=227+i;
 return {catalog_id:id(n),source:{provider:'movekit',provider_id:'synthetic-provider-'+pad(n)},
   identity:{name:'Synthetisch '+n,nl:'Synthetische oefening '+n,primary:[],secondary:[],equipment:[]}};
});
const catalog=published.catalog.concat(newer);
const byId=new Map(catalog.map(x=>[x.catalog_id,x]));
assert.equal(catalog.length,582);
assert.equal(byId.size,582);
const providers=new Set(catalog.map(x=>x.source.provider_id));
assert.equal(providers.size,582);
let owner='synthetic-owner-A';
let online=true;
const reviewed=new Set(Array.from({length:356},(_,i)=>id(i+227)));
let networkCalls=0,pass=0;
const check=(cond,label)=>{assert.ok(cond,label);pass++;};
const eq=(actual,expected,label)=>{assert.equal(actual,expected,label);pass++;};
const ecs={byId:key=>byId.get(key)||null,all:()=>catalog,count:()=>582};
const collisionIds=[38,19,63,188,5,6,7,8,9,10,11,12,13,14,15,16,17,18,20,21,22,23,24];
assert.equal(new Set(collisionIds).size,23);
const legacy=collisionIds.map((n,i)=>({id:id(n),scope:i<7?'global':'personal',
 name:'SYNTHETIC_LEGACY_'+pad(n),user_id:'unrelated-owner',active:true}));
const sandbox=vm.createContext({
 console,ExerciseCatalogService:ecs,exercises:legacy,
 TK504_TYPED_FK_SESSION_RELEASE:true,
 navigator:{get onLine(){return online;}},
 tkEigenaarUid:()=>owner,
 _exPickerPoolCache:null,_exPickerPoolKey:'',
 sbRpc:async(name,params)=>{
  networkCalls++;
  if(name!=='tk504_resolve_catalog_fk')throw Error('unexpected RPC');
  const c=byId.get(params.p_catalog_id);
  return c&&c.source.provider_id===params.p_provider_id&&reviewed.has(params.p_catalog_id)
   ?'TKC-'+params.p_catalog_id.slice(3):null;
 }
});
function extract(name){
 const start=new RegExp('(?:async\\s+)?function\\s+'+name+'\\s*\\(').exec(html);
 assert(start,'missing index.html function '+name);
 const b=html.indexOf('{',start.index);
 let depth=0;
 for(let i=b;i<html.length;i++){
  if(html[i]==='{')depth++;
  if(html[i]==='}'&&--depth===0)return html.slice(start.index,i+1);
 }
 throw Error('unbalanced function '+name);
}
const names=['tk504CatalogSourceRefFromCatalog','tk504CatalogSourceRefFromSelection',
 'tk603CatalogRefFromPickerSelection','tk504ValidateCatalogSourceRef',
 'tk504VerifySessionBinding','tk504RewriteVerifiedSessionRow','catalogToPickerEx',
 'exPickerPool','resolvePickerEx'];
for(const name of names)vm.runInContext(extract(name),sandbox,{timeout:5000});
const pool=sandbox.exPickerPool();
eq(pool.length,605,'582 catalog tiles remain separate from 23 colliding legacy rows');
eq(pool.filter(e=>e._catalog===true).length,582,'exact 582 catalog tiles');
eq(pool.filter(e=>Object.prototype.hasOwnProperty.call(e,'scope')).length,23,'no personal/global legacy reclassification');
for(const c of catalog){
 const tile=sandbox.resolvePickerEx(c.catalog_id,'catalog');
 check(tile&&tile._catalog===true&&tile.catalog_id===c.catalog_id,'catalog tile '+c.catalog_id);
 const ref=sandbox.tk603CatalogRefFromPickerSelection(tile);
 check(ref&&ref.catalog_id===c.catalog_id&&ref.provider_id===c.source.provider_id,'source ref '+c.catalog_id);
 check(sandbox.tk504ValidateCatalogSourceRef(c.catalog_id,ref),'source canonical '+c.catalog_id);
}
for(const x of legacy){
 const personal=sandbox.resolvePickerEx(x.id,'auto');
 eq(personal.name,x.name,'legacy default remains legacy '+x.id);
 eq(sandbox.tk603CatalogRefFromPickerSelection(personal),null,'legacy cannot claim catalog '+x.id);
 const forged={...x,_catalog:true,catalog_id:x.id};
 eq(sandbox.tk603CatalogRefFromPickerSelection(forged),null,'forged source ignored '+x.id);
}
(async()=>{
 for(let n=1;n<=226;n++){
  const tile=sandbox.resolvePickerEx(id(n),'catalog');
  const ref=sandbox.tk603CatalogRefFromPickerSelection(tile);
  await assert.rejects(sandbox.tk504VerifySessionBinding({id:id(n),tk504_catalog_ref:ref}),
   /tk504_catalog_fk_unverified/,'unreviewed original must fail '+id(n));
  pass++;
 }
 for(let n=227;n<=582;n++){
  const tile=sandbox.resolvePickerEx(id(n),'catalog');
  const ref=sandbox.tk603CatalogRefFromPickerSelection(tile);
  const bound=await sandbox.tk504VerifySessionBinding({id:id(n),tk504_catalog_ref:ref});
  eq(bound.fk_id,fk(n),'already-bound 356 '+id(n));
 }
 for(let n=1;n<=226;n++)reviewed.add(id(n)); // SYNTHETIC post-approval only, never DB
 eq(reviewed.size,582,'all 582 synthetically bound');
 for(let n=1;n<=582;n++){
  const tile=sandbox.resolvePickerEx(id(n),'catalog');
  const ref=sandbox.tk603CatalogRefFromPickerSelection(tile);
  const bound=await sandbox.tk504VerifySessionBinding({id:id(n),tk504_catalog_ref:ref});
  eq(bound.fk_id,fk(n),'verified FK '+id(n));
  eq(bound.owner_uid,'synthetic-owner-A','owner A '+id(n));
  const input={id:'synthetic-uuid-'+pad(n),exercise_id:id(n),
    note:'Keep original private note',sets_detail:[{kg:12.5,reps:10}],
    training_instance_id:'synthetic-instance-1'};
  const result=sandbox.tk504RewriteVerifiedSessionRow(input,bound);
  eq(result.exercise_id,fk(n),'rewrite '+id(n));
  eq(result.id,input.id,'UUID retained '+id(n));
  eq(result.note,input.note,'note retained '+id(n));
  eq(result.sets_detail,input.sets_detail,'set details identity '+id(n));
  eq(result.training_instance_id,input.training_instance_id,'instance retained '+id(n));
  eq(input.exercise_id,id(n),'original preserved '+id(n));
 }
 const selected=sandbox.resolvePickerEx(id(63),'catalog');
 const goodRef=sandbox.tk603CatalogRefFromPickerSelection(selected);
 const badRef={...goodRef,provider_id:'forged-provider'};
 await assert.rejects(sandbox.tk504VerifySessionBinding({id:id(63),tk504_catalog_ref:badRef}),
   /tk504_catalog_provenance_invalid/);
 pass++;
 reviewed.delete(id(188));
 await assert.rejects(sandbox.tk504VerifySessionBinding({id:id(188),tk504_catalog_ref:sandbox.tk603CatalogRefFromPickerSelection(sandbox.resolvePickerEx(id(188),'catalog'))}),
   /tk504_catalog_fk_unverified/);
 pass++;
 reviewed.add(id(188));
 const aBinding=await sandbox.tk504VerifySessionBinding({id:id(188),
   tk504_catalog_ref:sandbox.tk603CatalogRefFromPickerSelection(sandbox.resolvePickerEx(id(188),'catalog'))});
 owner='synthetic-owner-B';
 assert.throws(()=>sandbox.tk504RewriteVerifiedSessionRow({exercise_id:id(188)},aBinding),
   /tk504_session_fk_mapping_denied/);
 pass++;
 owner='synthetic-owner-A';
 online=false;
 await assert.rejects(sandbox.tk504VerifySessionBinding({id:id(63),
   tk504_catalog_ref:goodRef}),/tk504_typed_fk_offline_unverified/);
 pass++;
 online=true;
 check(networkCalls>=582,'RPC used, never inferred from ID alone');
 console.log('TK614 all-582 real app source/write contract: '+pass+
  ' assertions PASS; 226 initially blocked, 356 initially allowed, 582 synthetic verified; 23 legacy collisions safe; 0 cloud writes');
})().catch(e=>{console.error(e);process.exitCode=1});
