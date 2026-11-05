/* TK-REL-SEC-32 — betrouwbare inhoudsvergelijking in de herstelpreview (20-10-2026).
 * Oorzaak: canon() bouwde gewone objecten ({}), waardoor een eigen veld "__proto__" het prototype werd en uit de
 * vergelijking verdween; en gelijkheid werd beslist op een 32-bits FNV-vingerafdruk (botsingen mogelijk).
 *  C1 zelfde id, andere "__proto__"-inhoud → CONFLICT; geen prototypevervuiling;
 *  C2 twee verschillende records met dezelfde FNV-32-uitkomst → nooit BESTAAT_AL (map, eigen training, log, wachtrij);
 *  C3 identieke records met andere veldvolgorde → BESTAAT_AL;
 *  C4 geneste objecten en arrays: gelijk → BESTAAT_AL; andere volgorde in een array of ander genest veld → CONFLICT;
 *  C5 verschillen in getal, string, getal-als-tekst, null en ontbrekend veld → CONFLICT; 1 en 1.0 (zelfde JSON-getal) gelijk;
 *  C6 "al op de server" voor wachtrij-inserts gebruikt dezelfde volledige vergelijking ("__proto__"-verschil → afwijkend);
 *  C7 app: accountwissel tijdens de preview → gestopt; C8 app: herhaalde preview → identiek plan, opslag byte-gelijk;
 *  C9 de vingerafdruk blijft alleen ondersteunend (staat in het plan, beslist niets). */
'use strict';
const assert=require('assert');
const {webcrypto}=require('crypto');
const INV=require('./localInventory.js'), B=require('./localBackup.js'), RP=require('./restorePreview.js');
const {maak,fn,grab,db,koppel,HTML}=require('./fixtures/schrijfHarnas');
const {maakIndexedDb}=require('./fixtures/miniIndexedDb');
let n=0;
const RED=!!process.env.TK_RED;
const check=(ok,label)=>{ if(RED){ n++; console.log(ok?'PASS':'RED ',label); return; } assert(ok,label);n++;console.log('PASS',label);};
const stap=async(f)=>{ try{ await f(); }catch(e){ if(!RED)throw e; console.log('RED  (scenario afgebroken: '+String(e&&e.message||e).slice(0,90)+')'); } };
const UA='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', UB='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', PASS='een lange wachtzin voor test';
const fnv=INV.vingerafdruk;
// Zoek twee verschillende strings s1 ≠ s2 waarvoor fnv(prefix+JSON(s)+suffix) gelijk is (verjaardagsparadox, ~2^16 pogingen).
function botsing(maak){ const gezien=new Map(); for(let i=0;i<2000000;i++){ const s=((i*2654435761)>>>0).toString(36)+'-'+i.toString(36); const h=fnv(maak(s)); if(gezien.has(h))return [gezien.get(h),s]; gezien.set(h,s); } throw new Error('geen botsing'); }
const data=(entries,omissions)=>({format:'tk-local-rescue-data.v1',owner:UA,created:'2026-10-20T08:00:00.000Z',entries,omissions:omissions||[],complete:false,restoreAllowed:false});
const ls=(key,value,source)=>({storage:'localStorage',key,value,source});
const status=(uit,bron,rs)=>((uit.records||[]).find(r=>r.bron===bron&&(!rs||r.record_sleutel===rs))||{}).status;
const run=(entries,lokaal,extra)=>RP.classificeer(Object.assign({data:data(entries),scanner:UA,lokaal:Object.assign({cacheEigenaar:UA,wachtrij:[]},lokaal||{})},extra||{}));
const hist=(obj)=>JSON.stringify(obj);

(async()=>{
  // C1
  await stap(async()=>{ const lok='[{"id":"ct1","name":"Push","__proto__":{"zwaar":1}}]', kop='[{"id":"ct1","name":"Push","__proto__":{"zwaar":2}}]';
    const u=run([ls('tk_trainings',kop,'eigen_trainingen')],{localStorage:{tk_trainings:lok}});
    check(status(u,'eigen_trainingen','id:ct1')==='CONFLICT','C1 zelfde id, andere "__proto__"-inhoud → CONFLICT');
    const u2=run([ls('tk_trainings',lok,'eigen_trainingen')],{localStorage:{tk_trainings:lok}});
    check(status(u2,'eigen_trainingen','id:ct1')==='BESTAAT_AL','C1 zelfde "__proto__"-inhoud → BESTAAT_AL');
    const u3=run([ls('tk_trainings','[{"id":"ct1","name":"Push","__proto__":{}}]','eigen_trainingen')],{localStorage:{tk_trainings:'[{"id":"ct1","name":"Push"}]'}});
    check(status(u3,'eigen_trainingen','id:ct1')==='CONFLICT','C1 veld "__proto__" aanwezig versus ontbrekend → CONFLICT');
    check(({}).zwaar===undefined&&Object.prototype.zwaar===undefined,'C1 geen prototypevervuiling'); });
  // C2
  await stap(async()=>{ const [s1,s2]=botsing(s=>'{"note":'+JSON.stringify(s)+'}');
    check(s1!==s2&&fnv('{"note":'+JSON.stringify(s1)+'}')===fnv('{"note":'+JSON.stringify(s2)+'}'),'C2 FNV-32-botsing gevonden ('+s1+' / '+s2+')');
    const u=run([ls('tk_gw_hist',hist({squat:{note:s2}}),'begeleide_training_historie')],{localStorage:{tk_gw_hist:hist({squat:{note:s1}})}});
    check(status(u,'begeleide_training_historie','sleutel:squat')==='CONFLICT','C2 map: zelfde sleutel, andere inhoud met gelijke FNV-32 → CONFLICT, niet BESTAAT_AL');
    const [t1,t2]=botsing(s=>'{"id":"ct1","name":'+JSON.stringify(s)+'}');
    const u2=run([ls('tk_trainings',JSON.stringify([{id:'ct1',name:t2}]),'eigen_trainingen')],{localStorage:{tk_trainings:JSON.stringify([{id:'ct1',name:t1}])}});
    check(status(u2,'eigen_trainingen','id:ct1')==='CONFLICT','C2 eigen training: FNV-32-botsing → CONFLICT');
    const [g1,g2]=botsing(s=>'{"titel":'+JSON.stringify(s)+'}');
    const u3=run([ls('tk_gw_log',JSON.stringify([{titel:g2}]),'begeleide_training_log')],{localStorage:{tk_gw_log:JSON.stringify([{titel:g1}])}});
    check(u3.records.filter(r=>r.bron==='begeleide_training_log').every(r=>r.status!=='BESTAAT_AL'),'C2 log (identiteit op inhoud): botsing → niet BESTAAT_AL');
    const u3b=run([ls('tk_gw_log',JSON.stringify([{titel:g1}]),'begeleide_training_log')],{localStorage:{tk_gw_log:JSON.stringify([{titel:g2},{titel:g1}])}});
    check(u3b.records.filter(r=>r.bron==='begeleide_training_log').every(r=>r.status==='BESTAAT_AL'),'C2 log: identieke regel (ook naast een botsende regel) → BESTAAT_AL');
    const [q1,q2]=botsing(s=>'{"body":{"naam":'+JSON.stringify(s)+'},"filter":"id=eq.4","method":"PATCH","table":"goals"}');
    const u4=run([{storage:'offline_queue',key:'1',value:{table:'goals',method:'PATCH',filter:'id=eq.4',body:{naam:q2}},source:'offline_wachtrij'}],
      {wachtrij:[{id:9,owner_uid:UA,ts:1,table:'goals',method:'PATCH',filter:'id=eq.4',body:{naam:q1}}]});
    check(u4.records.every(r=>r.status!=='BESTAAT_AL'),'C2 wachtrij: botsing → niet BESTAAT_AL'); });
  // C3
  await stap(async()=>{ const u=run([ls('tk_trainings','[{"name":"Push","id":"ct1","exercises":["a"]}]','eigen_trainingen'),ls('tk_gw_hist','{"squat":{"reps":5,"weight":80}}','begeleide_training_historie')],
      {localStorage:{tk_trainings:'[{"id":"ct1","exercises":["a"],"name":"Push"}]',tk_gw_hist:'{"squat":{"weight":80,"reps":5}}'}});
    check(status(u,'eigen_trainingen','id:ct1')==='BESTAAT_AL'&&status(u,'begeleide_training_historie','sleutel:squat')==='BESTAAT_AL','C3 andere veldvolgorde → BESTAAT_AL'); });
  // C4
  await stap(async()=>{ const basis={id:'ct1',targets:[{ex:'a',sets:[{kg:60,reps:[5,5]}]},{ex:'b'}],meta:{sel:{doel:'kracht',dagen:[1,3]}}};
    const lok=JSON.stringify([basis]);
    const v=x=>status(run([ls('tk_trainings',JSON.stringify([x]),'eigen_trainingen')],{localStorage:{tk_trainings:lok}}),'eigen_trainingen','id:ct1');
    check(v(JSON.parse(lok)[0])==='BESTAAT_AL','C4 geneste objecten en arrays gelijk → BESTAAT_AL');
    const ander=JSON.parse(lok)[0]; ander.targets.reverse(); check(v(ander)==='CONFLICT','C4 andere volgorde in een array → CONFLICT');
    const diep=JSON.parse(lok)[0]; diep.targets[0].sets[0].reps=[5,6]; check(v(diep)==='CONFLICT','C4 verschil diep genest → CONFLICT');
    const m=JSON.parse(lok)[0]; m.meta.sel.dagen=[1,3,null]; check(v(m)==='CONFLICT','C4 extra null in een array → CONFLICT'); });
  // C5
  await stap(async()=>{ const lok={id:'ct1',kg:60,naam:'Push',noot:null};
    const v=x=>status(run([ls('tk_trainings',JSON.stringify([x]),'eigen_trainingen')],{localStorage:{tk_trainings:JSON.stringify([lok])}}),'eigen_trainingen','id:ct1');
    check(v(Object.assign({},lok,{kg:61}))==='CONFLICT','C5 ander getal → CONFLICT');
    check(v(Object.assign({},lok,{kg:'60'}))==='CONFLICT','C5 getal versus getal-als-tekst → CONFLICT');
    check(v(Object.assign({},lok,{naam:'push'}))==='CONFLICT','C5 andere string (hoofdletter) → CONFLICT');
    const zonder=Object.assign({},lok); delete zonder.noot; check(v(zonder)==='CONFLICT','C5 null versus ontbrekend veld → CONFLICT');
    check(v(Object.assign({},lok,{noot:false}))==='CONFLICT','C5 null versus false → CONFLICT');
    check(status(run([ls('tk_trainings','[{"id":"ct1","kg":60.0,"naam":"Push","noot":null}]','eigen_trainingen')],{localStorage:{tk_trainings:JSON.stringify([lok])}}),'eigen_trainingen','id:ct1')==='BESTAAT_AL','C5 60 en 60.0 (zelfde JSON-getal) → BESTAAT_AL'); });
  // C6
  await stap(async()=>{ const body=JSON.parse('{"id":"m1","meal_type":"ontbijt","meta":{"__proto__":{"a":1}}}');
    const srvRij=JSON.parse('{"id":"m1","user_id":"'+UA+'","meal_type":"ontbijt","meta":{"__proto__":{"a":2}}}');
    const u=run([{storage:'offline_queue',key:'1',value:{table:'nutrition_meals',method:'POST',body},source:'offline_wachtrij'}],{},{server:{'nutrition_meals:m1':srvRij}});
    check(u.records[0].op_server==='nee'||u.records[0].op_server==='afwijkend','C6 "al op de server": "__proto__"-verschil in de serverrij → niet "ja"');
    const gelijk=JSON.parse('{"id":"m1","user_id":"'+UA+'","meal_type":"ontbijt","meta":{"__proto__":{"a":1}}}');
    check(run([{storage:'offline_queue',key:'1',value:{table:'nutrition_meals',method:'POST',body},source:'offline_wachtrij'}],{},{server:{'nutrition_meals:m1':gelijk}}).records[0].op_server==='ja','C6 identieke serverrij → "ja"');
    const [w1,w2]=botsing(x=>JSON.stringify(x));
    const u2=run([{storage:'offline_queue',key:'1',value:{table:'nutrition_meals',method:'POST',body:{id:'m2',meal_type:w2}},source:'offline_wachtrij'}],{},{server:{'nutrition_meals:m2':{id:'m2',user_id:UA,meal_type:w1}}});
    check(u2.records[0].op_server!=='ja','C6 serverrij met een waarde die dezelfde FNV-32 geeft → niet "ja"'); });
  // C9
  await stap(async()=>{ const u=run([ls('tk_coach_style','kort','coach_stijl')],{localStorage:{tk_coach_style:'kort'}});
    const r=u.records[0]; check(typeof r.vingerafdruk==='string'&&r.vingerafdruk.length===8&&r.status==='BESTAAT_AL','C9 vingerafdruk blijft als ondersteunende aanduiding in het plan'); });
  // C7–C8 (app, echte blokken)
  await stap(async()=>{
    const BLOK2=grab('// SERVER READ-AFTER-WRITE, FASE 2','// HISTORISCHE INVENTARIS EN BASISMETING, FASE 3');
    const BLOKP=grab('// TK-REL-SEC-31: HERSTELPREVIEW','async function exportJSON(){');
    const HULP=[fn('function tkTrainingOefendoelen('),fn('function tkTrainingInhoud('),fn('function tkTrainingVanServer(')].join('\n');
    const m=new Map(Object.entries({tk_cache_owner_uid:UA,tk_trainings:'[{"id":"ct1","name":"Push","__proto__":{"x":1}}]'}));
    const opslag={get length(){return m.size;},key:i=>[...m.keys()][i]===undefined?null:[...m.keys()][i],getItem:k=>m.has(k)?m.get(k):null,setItem:(k,v)=>{m.set(k,String(v));},removeItem:k=>{m.delete(k);}};
    const h=maak({extraSrc:HULP+'\n'+BLOK2+'\n'+BLOKP,login:null,ctx:{indexedDB:maakIndexedDb(),localStorage:opslag,ServerVerificationCore:require('./serverVerification.js'),
      LocalInventoryCore:INV,TKLocalBackup:B,TKRestorePreview:RP,CACHE_OWNER_KEY:'tk_cache_owner_uid',escHtml:x=>String(x),TextEncoder,TextDecoder}});
    h.ctx.window.crypto=webcrypto;
    const login=uid=>{ h.ctx.authSession=uid?{user:{id:uid},access_token:'t'+uid[0]}:null; h.ctx.SB_H.Authorization=uid?'Bearer t'+uid[0]:'Bearer anon'; };
    login(UA); const d=db(); koppel(h,d);
    const kop=B.prepare({owner:UA,cacheOwner:UA,manifest:INV.BRONNEN,local:{tk_trainings:'[{"id":"ct1","name":"Push","__proto__":{"x":2}}]'},queue:[]});
    const tekst=JSON.stringify(await B.encrypt(kop,PASS,webcrypto));
    const bestand={size:tekst.length,text:async()=>tekst};
    const voor=JSON.stringify([...m.entries()]);
    const u1=await h.ctx.tkHerstelPreview(bestand,PASS), u2=await h.ctx.tkHerstelPreview(bestand,PASS);
    check(u1.ok&&status(u1.plan,'eigen_trainingen','id:ct1')==='CONFLICT','C8 app: "__proto__"-verschil → CONFLICT in de echte preview');
    check(JSON.stringify(u1.plan)===JSON.stringify(u2.plan)&&JSON.stringify([...m.entries()])===voor&&h.st.req.every(r=>r.method==='GET'),'C8 herhaalde preview: identiek plan, opslag byte-gelijk, alleen GET');
    h.net.voor=req=>{ if(req.method==='GET')login(UB); };
    const u3=await h.ctx.tkHerstelPreview(bestand,PASS); h.net.voor=null;
    check(u3.ok===false&&u3.reden==='account_gewisseld','C7 accountwissel tijdens de preview → gestopt'); });
  console.log('TK-REL-SEC-32: '+n+'/'+n);
})().catch(e=>{console.error('FAIL',e&&e.stack||e);process.exitCode=1;});
