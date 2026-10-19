/* TK-REL-SEC-21 — verharding van het verificatiecontract serververify.v1 (fase 2, 19-10-2026).
 * Identiteit van een verificatie = tabel + record-id + eigenaar + lokale revisie. Een ontbrekend resultaat of een
 * onvolledige inventaris is nooit "veilig".
 *  H1 twee records in verschillende tabellen met dezelfde id, slechts één geverifieerd → geweigerd;
 *  H2 twee gebruikers met dezelfde record-id, alleen die van B geverifieerd → A's record geweigerd;
 *  H3 leeg, ontbrekend of defect register → geweigerd;
 *  H4 lokale gegevens van vóór het register (historie niet geïnventariseerd of > 0) → geweigerd;
 *  H5 eerder geverifieerde rij daarna lokaal gewijzigd (nieuwe revisie) → oude verificatie telt niet;
 *  H6 RLS/leesfout: niet zichtbaar = MISSING maar nooit definitief, leesfout = UNKNOWN; nooit SERVER_VERIFIED;
 *  H7 inhoudsvergelijking: Postgres-tijdstempel (+00:00) en numeric als getal zijn gelijk aan de lokale vorm;
 *     een echte afwijking blijft MISMATCH;
 *  H8 ouder-kind met kinderen zonder eigen eigenaarsveld (laps, maaltijdregels): alleen geverifieerd als de ouder
 *     geverifieerd is; onverwacht serverkind → MISMATCH; samengestelde kindsleutel (activity_id + lap_index);
 *  H9 een DELETE als laatste lokale write: afwezig = bevestigd, nog aanwezig = MISMATCH;
 *  H10 meerdere uitkomsten voor één identiteit: de zwaarste telt (geen gunstige keuze);
 *  H11 tabel zonder eigenaarsveld: alleen geverifieerd als de eigenaar via de ouder bewezen is;
 *  H12 registeritem met onvolledige identiteit (geen revisie of eigenaar) → reden identiteit_onvolledig. */
'use strict';
const assert=require('assert'),V=require('./serverVerification.js');
let klaar=false,n=0;
process.on('exit',()=>{if(!klaar){console.error('FAIL niet alle scenario\'s afgerond');process.exitCode=1;}});
const check=(ok,label)=>{assert(ok,label);n++;console.log('PASS',label);};
const S=V.STATUS,T='2026-10-19T12:00:00Z';
const vr=(o)=>V.verifyRecord(Object.assign({eigenaar:'A',bron:'test',tijdstip:T,velden:['naam'],revisie:1},o));
const beoordeel=(o)=>(typeof V.beoordeelRegister==='function')
  ?V.beoordeelRegister(Object.assign({register:{aanwezig:true,defect:false,items:[]},resultaten:[],historisch:{geinventariseerd:true,aantal:0},onleesbaar:[]},o))
  :V.uninstallGate({inventaris:{volledig:true,onleesbaar:o.onleesbaar||[],ids:((o.register&&o.register.items)||[]).map(x=>x.record_id)},resultaten:o.resultaten||[]});

// H1
{ const ok=vr({tabel:'custom_trainings',verwacht:{id:'x1',naam:'Push'},server:{id:'x1',user_id:'A',naam:'Push'}});
  const g=beoordeel({register:{aanwezig:true,defect:false,items:[{tabel:'custom_trainings',record_id:'x1',eigenaar:'A',revisie:1},{tabel:'sessions',record_id:'x1',eigenaar:'A',revisie:1}]},resultaten:[ok]});
  check(ok.status===S.SERVER_VERIFIED&&g.toegestaan===false,'H1 zelfde id in twee tabellen, één geverifieerd → geweigerd'); }
// H2
{ const okB=vr({tabel:'sessions',eigenaar:'B',verwacht:{id:'s1',naam:'x'},server:{id:'s1',user_id:'B',naam:'x'}});
  const g=beoordeel({register:{aanwezig:true,defect:false,items:[{tabel:'sessions',record_id:'s1',eigenaar:'A',revisie:1}]},resultaten:[okB]});
  check(okB.status===S.SERVER_VERIFIED&&g.toegestaan===false,'H2 zelfde record-id bij gebruiker B geverifieerd → A\'s record blijft geweigerd'); }
// H3
{ check(beoordeel({register:{aanwezig:true,defect:false,items:[]}}).toegestaan===false,'H3 leeg register → nooit veilig');
  check(beoordeel({register:{aanwezig:false,items:null}}).toegestaan===false,'H3 ontbrekend register → geweigerd');
  const ok=vr({tabel:'sessions',verwacht:{id:'s1',naam:'x'},server:{id:'s1',user_id:'A',naam:'x'}});
  check(beoordeel({register:{aanwezig:true,defect:true,items:[{tabel:'sessions',record_id:'s1',eigenaar:'A',revisie:1}]},resultaten:[ok]}).toegestaan===false,'H3 defect register (opslagfout bij registreren) → geweigerd, ook als alles wat er staat geverifieerd is');
  check(beoordeel({register:{aanwezig:true,defect:false,items:[{tabel:'sessions',record_id:'s1',eigenaar:'A'}]},resultaten:[ok]}).toegestaan===false,'H3 registeritem zonder revisie → geweigerd'); }
// H4
{ const ok=vr({tabel:'sessions',verwacht:{id:'s1',naam:'x'},server:{id:'s1',user_id:'A',naam:'x'}});
  const items=[{tabel:'sessions',record_id:'s1',eigenaar:'A',revisie:1}];
  check(beoordeel({register:{aanwezig:true,defect:false,items},resultaten:[ok],historisch:{geinventariseerd:false,aantal:0}}).toegestaan===false,'H4 historie niet geïnventariseerd → geweigerd');
  check(beoordeel({register:{aanwezig:true,defect:false,items},resultaten:[ok],historisch:{geinventariseerd:true,aantal:3}}).toegestaan===false,'H4 3 lokale gegevens van vóór het register → geweigerd');
  check(beoordeel({register:{aanwezig:true,defect:false,items},resultaten:[ok],historisch:{geinventariseerd:true}}).toegestaan===false,'H4 aantal historische gegevens onbekend → geweigerd'); }
// H5
{ const oud=vr({tabel:'sessions',revisie:1,verwacht:{id:'s1',naam:'x'},server:{id:'s1',user_id:'A',naam:'x'}});
  const g=beoordeel({register:{aanwezig:true,defect:false,items:[{tabel:'sessions',record_id:'s1',eigenaar:'A',revisie:2}]},resultaten:[oud]});
  check(oud.status===S.SERVER_VERIFIED&&g.toegestaan===false&&g.per&&g.per[0].status==='VEROUDERD','H5 lokaal gewijzigd na verificatie (revisie 2): verificatie van revisie 1 telt niet (VEROUDERD)'); }
// H6
{ const miss=vr({tabel:'sessions',verwacht:{id:'s1',naam:'x'},server:null});
  const unk=vr({tabel:'sessions',verwacht:{id:'s1',naam:'x'}});
  check(miss.status===S.MISSING&&miss.definitief===false&&miss.afwijkingen.indexOf('niet_zichtbaar_voor_eigenaar')>=0,'H6 niet zichtbaar (RLS of andere eigenaar) → MISSING, niet definitief');
  check(unk.status===S.UNKNOWN&&unk.verified_at===null,'H6 leesfout (niet teruggelezen) → UNKNOWN');
  const g=beoordeel({register:{aanwezig:true,defect:false,items:[{tabel:'sessions',record_id:'s1',eigenaar:'A',revisie:1}]},resultaten:[miss,unk]});
  check(g.toegestaan===false,'H6 MISSING of UNKNOWN → geweigerd'); }
// H7
{ const v={id:'a1',recorded_at:'2026-10-19T10:00:00.000Z',distance_meters:5000,rpe:'7',sets_detail:[{kg:'60',reps:8}],note:'x'};
  const srv={id:'a1',user_id:'A',recorded_at:'2026-10-19T10:00:00+00:00',distance_meters:5000.0,rpe:7,sets_detail:[{reps:8,kg:'60'}],note:'x'};
  const velden=['recorded_at','distance_meters','rpe','sets_detail','note'];
  check(vr({tabel:'activities',verwacht:v,server:srv,velden}).status===S.SERVER_VERIFIED,'H7 Postgres-tijdstempel (+00:00), numeric als getal en jsonb-sleutelvolgorde → gelijk');
  const anders=vr({tabel:'activities',verwacht:v,server:Object.assign({},srv,{recorded_at:'2026-10-19T10:00:01+00:00'}),velden});
  check(anders.status===S.MISMATCH&&anders.afwijkingen.indexOf('veld:recorded_at')>=0,'H7 één seconde verschil → MISMATCH');
  check(vr({tabel:'activities',verwacht:v,server:Object.assign({},srv,{rpe:'zeven'}),velden}).status===S.MISMATCH,'H7 niet-numerieke serverwaarde tegen getal → MISMATCH'); }
// H8
{ const ouder={id:'act1',sport:'running'},laps=[{activity_id:'act1',lap_index:0,duration_seconds:300},{activity_id:'act1',lap_index:1,duration_seconds:290}];
  const basis={eigenaar:'A',bron:'test',tijdstip:T,oudertabel:'activities',kindtabel:'activity_laps',ouderRevisie:1,kindRevisies:[1,1],
    oudervelden:['sport'],kindvelden:['duration_seconds'],kindSleutelVelden:['activity_id','lap_index'],kindEigenaarVeld:null};
  const pc=(o)=>V.verifyParentChildren(Object.assign({},basis,{ouder,kinderen:laps,serverOuder:{id:'act1',user_id:'A',sport:'running'},
    serverKinderen:[{id:'u1',activity_id:'act1',lap_index:0,duration_seconds:300},{id:'u2',activity_id:'act1',lap_index:1,duration_seconds:290}]},o));
  check(pc({}).status===S.SERVER_VERIFIED&&pc({}).kinderen[1].record_id==='act1:1','H8 laps met samengestelde sleutel en eigenaar via de ouder → geverifieerd');
  check(pc({serverOuder:{id:'act1',user_id:'B',sport:'running'}}).kinderen.every(k=>k.status!==S.SERVER_VERIFIED),'H8 ouder van een andere eigenaar → kinderen zonder eigenaarsveld niet geverifieerd');
  check(pc({serverKinderen:[{activity_id:'act1',lap_index:0,duration_seconds:300}]}).status===S.MISSING,'H8 ontbrekende lap → MISSING');
  check(pc({serverKinderen:[{activity_id:'act1',lap_index:0,duration_seconds:300},{activity_id:'act1',lap_index:1,duration_seconds:290},{activity_id:'act1',lap_index:2,duration_seconds:10}]}).status===S.MISMATCH,'H8 onverwachte lap op de server → MISMATCH');
  check(pc({serverKinderen:undefined}).status===S.UNKNOWN,'H8 kinderen niet gelezen → UNKNOWN'); }
// H9
{ check(vr({tabel:'sessions',verwacht:{id:'s1'},velden:[],verwijderd:true,server:null}).status===S.SERVER_VERIFIED,'H9 verwijderd en afwezig → bevestigd');
  check(vr({tabel:'sessions',verwacht:{id:'s1'},velden:[],verwijderd:true,server:{id:'s1',user_id:'A'}}).status===S.MISMATCH,'H9 verwijderd maar nog aanwezig → MISMATCH');
  check(vr({tabel:'sessions',verwacht:{id:'s1'},velden:[],verwijderd:true}).status===S.UNKNOWN,'H9 verwijderd, niet gelezen → UNKNOWN'); }
// H10
{ const ok=vr({tabel:'sessions',verwacht:{id:'s1',naam:'x'},server:{id:'s1',user_id:'A',naam:'x'}});
  const mm=vr({tabel:'sessions',verwacht:{id:'s1',naam:'x'},server:{id:'s1',user_id:'A',naam:'y'}});
  check(beoordeel({register:{aanwezig:true,defect:false,items:[{tabel:'sessions',record_id:'s1',eigenaar:'A',revisie:1}]},resultaten:[ok,mm]}).toegestaan===false,'H10 tegenstrijdige uitkomsten voor één identiteit → de zwaarste telt');
  check(beoordeel({register:{aanwezig:true,defect:false,items:[{tabel:'sessions',record_id:'s1',eigenaar:'A',revisie:1}]},resultaten:[ok]}).toegestaan===true,'H10 één geldige uitkomst voor exact deze identiteit en volledige historie → toegestaan (positieve controle)'); }
// H11
{ const basis={tabel:'nutrition_meal_items',eigenaarVeld:null,verwacht:{id:'i1',naam:'x'},server:{id:'i1',meal_id:'m1',naam:'x'}};
  const zonder=vr(basis);
  check(zonder.status!==S.SERVER_VERIFIED,'H11 geen eigenaarsveld en eigenaar niet via de ouder bewezen → niet geverifieerd');
  check(vr(Object.assign({},basis,{eigenaarViaOuder:true})).status===S.SERVER_VERIFIED,'H11 eigenaar via de ouder bewezen → geverifieerd (positieve controle)'); }
// H12
{ const ok=vr({tabel:'sessions',verwacht:{id:'s1',naam:'x'},server:{id:'s1',user_id:'A',naam:'x'}});
  const r1=beoordeel({register:{aanwezig:true,defect:false,items:[{tabel:'sessions',record_id:'s1',eigenaar:'A'}]},resultaten:[ok]});
  const r2=beoordeel({register:{aanwezig:true,defect:false,items:[{tabel:'sessions',record_id:'s1',revisie:1}]},resultaten:[ok]});
  check(r1.toegestaan===false&&(r1.redenen||[]).indexOf('identiteit_onvolledig')>=0,'H12 registeritem zonder revisie → identiteit_onvolledig');
  check(r2.toegestaan===false&&(r2.redenen||[]).indexOf('identiteit_onvolledig')>=0,'H12 registeritem zonder eigenaar → identiteit_onvolledig'); }
klaar=true;console.log('TK-REL-SEC-21: '+n+'/'+n);
