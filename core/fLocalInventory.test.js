/* TK-REL-SEC-26 — bronmanifest en inventarisatieregels (localinventory.v1, fase 3, 19-10-2026).
 *  I1 manifest volledig: elke localStorage-/sessionStorage-sleutel die index.html schrijft of wist, hoort bij een bron;
 *  I2 categorieën: concept, wachtrij, voorkeur, serverkopie en duurzaam blokkeren; toestel en systeem niet;
 *  I3 eigenaar: persoonlijke caches horen bij tk_cache_owner_uid; andere scanner → ANDERE_EIGENAAR; geen eigenaar → EIGENAARLOOS;
 *  I4 oude structuren (maurice_*, tk_wb_saved, globale hardloopsleutel, tk_1rm_*) → herkend, oude_structuur, blokkerend;
 *  I5 onleesbaar: ongeldige JSON, verkeerde structuur, onleesbare wachtrij/opslag → ONLEESBAAR en inventaris onvolledig;
 *  I6 onbekende sleutel of database → ONBEKENDE_BRON; onbekende databaselijst → onvolledig;
 *  I7 wachtrij-items per eigenaar; item zonder eigenaar → EIGENAARLOOS; onzeker item gemarkeerd;
 *  I8 de inlogsessie wordt nooit gelezen (geen tokeninhoud in de uitkomst);
 *  I9 vergelijking met de server: gelijk → HIST_GEKOPPELD (nooit SERVER_VERIFIED); afwijkingen per soort;
 *  I10 deterministisch en hervatbaar: zelfde invoer → zelfde vingerafdrukken; afgeronde, ongewijzigde bronnen overslaan;
 *  I11 samenvatting: aantallen en poortinvoer; alleen compleet bij volledige, voltooide run;
 *  I12 alleen te vergelijken records dragen hun waarde; geen enkel record krijgt SERVER_VERIFIED;
 *  I13 het bronmanifest in docs is gegenereerd uit en gelijk aan het manifest in de code. */
'use strict';
const assert=require('assert'),fs=require('fs'),path=require('path');
const L=require('./localInventory.js');
let n=0;const check=(ok,label)=>{assert(ok,label);n++;console.log('PASS',label);};
const H=L.HIST;
const HTML=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
const ls=o=>Object.assign({tk_cache_owner_uid:'A'},o);
const inv=o=>L.inventariseer(Object.assign({scanner:'A',cacheEigenaar:'A',localStorage:{},sessionStorage:{},wachtrij:[],databases:['maurice_offline','tk_verificatie']},o));
const recs=u=>[].concat(...u.bronnen.map(b=>b.records));
const van=(u,bron)=>recs(u).filter(r=>r.bron===bron);

// I1 — alle sleutels uit de broncode
{ const sleutels=new Set();
  const re=[/localStorage\.(?:setItem|getItem|removeItem)\('([^']+)'/g,/lsSet\('([^']+)'/g,/lsGet\('([^']+)'/g,/tkSchrijfKaart\('([^']+)'/g,/tkLeesKaart\('([^']+)'/g,/initSwitch\('[^']+',\s*'([^']+)'/g];
  re.forEach(r=>{ let m; while((m=r.exec(HTML)))sleutels.add(m[1]); });
  const lijst=HTML.slice(HTML.indexOf('const PERSONAL_CACHE_KEYS=['),HTML.indexOf('];',HTML.indexOf('const PERSONAL_CACHE_KEYS=[')));
  (lijst.match(/'([^']+)'/g)||[]).forEach(x=>sleutels.add(x.slice(1,-1)));
  [/const AUTH_SESSION_KEY='([^']+)'/,/const CACHE_OWNER_KEY='([^']+)'/,/var CYCLUS_OPTIN_KEY='([^']+)'/,/var OPTIN_KEY='([^']+)'/,/var TK_PRODUCT_TELEMETRY_CONSENT_KEY='([^']+)'/,
   /const TK_TRAININGEN_ONBEVESTIGD='([^']+)'/,/TK_VERIFY_DEFECT_KEY='([^']+)'/].forEach(r=>{ const m=HTML.match(r); assert(m,'constante niet gevonden: '+r); sleutels.add(m[1]); });
  const ai=HTML.match(/AI_CONSENT_STORAGE_KEY_BY_PURPOSE = \{([^}]+)\}/); (ai[1].match(/'([^']+)'/g)||[]).forEach(x=>sleutels.add(x.slice(1,-1)));
  // Dynamische sleutels: één voorbeeld per prefix.
  ['tk_running_execution_v1_A','tk_cycling_execution_v1_A','tk_swimming_execution_v1_A','tk_1rm_squat','sel_rowing','maurice_trainings','tk_notif_training'].forEach(k=>sleutels.add(k));
  sleutels.delete('sel_');sleutels.delete('tk_1rm_');sleutels.delete('tk_...'); // prefixen zonder suffix en een commentaarvoorbeeld
  const zonder=[...sleutels].filter(k=>!L.bronVoorSleutel('localStorage',k));
  check(sleutels.size>=50&&zonder.length===0,'I1 alle '+sleutels.size+' localStorage-sleutels uit index.html staan in het manifest'+(zonder.length?(': ontbreekt '+zonder.join(', ')):''));
  const org=fs.readFileSync(path.join(__dirname,'organizationContextRuntime.js'),'utf8').match(/ORG_CONTEXT_PREF_KEY = '([^']+)'/)[1];
  check(!!L.bronVoorSleutel('sessionStorage',org),'I1 sessionStorage-sleutel '+org+' staat in het manifest');
  const dbs=[...HTML.matchAll(/const (OFFLINE_DB_NAME|TK_VERIFY_DB)\s*=\s*'([^']+)'/g)].map(m=>m[2]);
  const dbs2=(HTML.match(/TK_VERIFY_DB='([^']+)'/)||[])[1]; if(dbs2)dbs.push(dbs2);
  const off=(HTML.match(/OFFLINE_DB_NAME\s*=\s*['"]([^'"]+)/)||[])[1]; if(off)dbs.push(off);
  check(dbs.length>=2&&dbs.every(d=>L.BRONNEN.some(b=>b.database===d)),'I1 beide IndexedDB-databases van de app staan in het manifest ('+[...new Set(dbs)].join(', ')+')'); }
// I2
{ const u=inv({localStorage:ls({tk_draft_training:'{"t":"x"}',tk_theme:'dark',tk_coach_style:'kort',tk_atleet:'{"naam":"x"}',tk_gw_log:'[{"a":1}]',tk_ns_migrated:'1'})});
  const st=b=>van(u,b)[0].status;
  check(st('actieve_training')===H.NIET_VERIFIEERBAAR&&L.blokkeert(st('actieve_training')),'I2 lopende training (concept) → niet verifieerbaar, blokkeert');
  check(st('coach_stijl')===H.NIET_VERIFIEERBAAR&&st('atleetprofiel')===H.NIET_VERIFIEERBAAR&&st('begeleide_training_log')===H.NIET_VERIFIEERBAAR,'I2 voorkeur, serverkopie en lokale log blokkeren (een cache is niet automatisch veilig)');
  check(st('thema')===H.NIET_PERSOONLIJK&&st('namespace_migratie')===H.NIET_PERSOONLIJK&&!L.blokkeert(H.NIET_PERSOONLIJK),'I2 toestelinstelling en systeemsleutel → niet persoonlijk, niet blokkerend');
  check(van(u,'atleetprofiel')[0].redenen.indexOf('serverkopie_herstel_onbewezen')>=0,'I2 serverkopie gemarkeerd als "herstel onbewezen"'); }
// I3
{ const data={tk_trainings:'[{"id":"ct1","name":"Push"}]',tk_draft_training:'{"t":"x"}'};
  const a=inv({localStorage:ls(data)}), b=inv({scanner:'B',localStorage:ls(data)}), z=inv({cacheEigenaar:null,localStorage:data});
  check(van(a,'eigen_trainingen')[0].status===H.ONBEKEND&&van(a,'eigen_trainingen')[0].teVergelijken===true,'I3 eigen training van de scanner → te vergelijken met de server');
  check(van(b,'eigen_trainingen')[0].status===H.ANDERE_EIGENAAR&&van(b,'actieve_training')[0].status===H.ANDERE_EIGENAAR&&!van(b,'eigen_trainingen')[0].teVergelijken,'I3 scanner B op een toestel van A → ANDERE_EIGENAAR, niet vergeleken');
  check(van(z,'eigen_trainingen')[0].status===H.EIGENAARLOOS,'I3 geen cache-eigenaar → EIGENAARLOOS');
  const s=inv({localStorage:ls({tk_running_execution_v1_B:'{"state":{}}',tk_running_execution_v1_A:'{"state":{}}'})});
  check(van(s,'hardloop_uitvoering').map(r=>r.eigenaar+':'+r.status).sort().join()==='A:'+H.NIET_VERIFIEERBAAR+',B:'+H.ANDERE_EIGENAAR,'I3 eigenaar uit de sleutel (per gebruiker) bij uitvoeringen'); }
// I4
{ const u=inv({localStorage:ls({maurice_trainings:'[]',tk_wb_saved:'[{"id":"w1"}]',tk_running_execution_v1:'{"state":{}}',tk_1rm_squat:'100'})});
  check(van(u,'namespace_legacy')[0].status===H.EIGENAARLOOS&&van(u,'hardloop_uitvoering_legacy')[0].status===H.EIGENAARLOOS,'I4 oude naamruimte en globale hardloopsleutel → eigenaar onbekend');
  check(van(u,'builder_opgeslagen_legacy')[0].redenen.indexOf('oude_structuur')>=0&&van(u,'eenrm_cache_legacy')[0].redenen.indexOf('oude_structuur')>=0,'I4 oude Builder-opslag en 1RM-cache → oude_structuur');
  check(recs(u).filter(r=>r.redenen.indexOf('oude_structuur')>=0).every(r=>L.blokkeert(r.status)),'I4 oude structuren blokkeren'); }
// I5
{ const u=inv({localStorage:ls({tk_trainings:'{kapot',tk_gw_log:'{"geen":"array"}'})});
  check(van(u,'eigen_trainingen')[0].status===H.ONLEESBAAR&&van(u,'begeleide_training_log')[0].status===H.ONLEESBAAR&&u.volledig===false,'I5 ongeldige JSON en verkeerde structuur → ONLEESBAAR, inventaris onvolledig');
  const w=inv({wachtrij:null}); check(w.volledig===false&&van(w,'offline_wachtrij')[0].status===H.ONLEESBAAR,'I5 onleesbare wachtrij → ONLEESBAAR, onvolledig');
  const l=inv({localStorage:null}); check(l.volledig===false&&recs(l).some(r=>r.status===H.ONLEESBAAR&&r.bron==='localStorage:onleesbaar'),'I5 onleesbare localStorage → onvolledig'); }
// I6
{ const u=inv({localStorage:ls({iets_nieuws:'x'}),databases:['maurice_offline','tk_verificatie','vreemd_db']});
  check(recs(u).filter(r=>r.status===H.ONBEKENDE_BRON).length===2&&L.blokkeert(H.ONBEKENDE_BRON),'I6 onbekende sleutel en onbekende database → ONBEKENDE_BRON, blokkeert');
  check(inv({databases:null}).volledig===false,'I6 databaselijst niet beschikbaar → onvolledig'); }
// I7
{ const u=inv({wachtrij:[{id:1,table:'sessions',method:'POST',body:{id:'s1'},owner_uid:'A'},{id:2,table:'sessions',method:'POST',body:{id:'s2'},owner_uid:'B'},{id:3,table:'x',method:'DELETE',filter:'id=eq.1'},{id:4,table:'sessions',method:'POST',body:{},owner_uid:'A',onzeker:true}]});
  const r=van(u,'offline_wachtrij');
  check(r[0].status===H.WACHTRIJ&&r[1].status===H.ANDERE_EIGENAAR&&r[2].status===H.EIGENAARLOOS&&r[3].redenen.indexOf('onzeker_verzonden')>=0,'I7 wachtrij: eigen → WACHTRIJ, B → ANDERE_EIGENAAR, zonder eigenaar → EIGENAARLOOS, onzeker gemarkeerd'); }
// I8
{ const u=inv({localStorage:ls({tk_auth_session:'{"access_token":"GEHEIM-TOKEN-123","refresh_token":"R-456"}'})});
  const tekst=JSON.stringify(u);
  check(!/GEHEIM-TOKEN|R-456/.test(tekst)&&van(u,'sessie')[0].status===H.NIET_PERSOONLIJK,'I8 inlogsessie: alleen aanwezigheid, nooit de inhoud'); }
// I9
{ const inh=t=>JSON.stringify([t.name,t.exercises]);
  const lok={id:'ct1',name:'Push',exercises:['squat']};
  const srv={id:'ct1',user_id:'A',model:{id:'ct1',name:'Push',exercises:['squat']}};
  const g=L.vergelijkTraining(lok,srv,[],'A',inh);
  check(g.status===H.GEKOPPELD&&g.status!=='SERVER_VERIFIED','I9 identiek → HIST_GEKOPPELD, nooit SERVER_VERIFIED');
  check(L.vergelijkTraining(lok,Object.assign({},srv,{user_id:'B'}),[],'A',inh).status===H.AFWIJKEND,'I9 andere eigenaar → AFWIJKEND');
  check(L.vergelijkTraining(lok,Object.assign({},srv,{model:{name:'Pull',exercises:['squat']}}),[],'A',inh).status===H.AFWIJKEND,'I9 andere inhoud → AFWIJKEND');
  check(L.vergelijkTraining(lok,null,undefined,'A',inh).status===H.NIET_GEVONDEN,'I9 niet zichtbaar → NIET_GEVONDEN');
  check(L.vergelijkTraining(lok,undefined,undefined,'A',inh).status===H.ONBEKEND&&L.vergelijkTraining(lok,srv,undefined,'A',inh).status===H.ONBEKEND,'I9 niet gelezen (ouder of kinderen) → ONBEKEND');
  check(L.vergelijkTraining(lok,Object.assign({},srv,{id:'ct2'}),[],'A',inh).status===H.AFWIJKEND,'I9 ander record-id → AFWIJKEND'); }
// I10
{ const o={localStorage:ls({tk_trainings:'[{"id":"ct1"}]',tk_gw_log:'[1,2]'})};
  const a=inv(o), b=inv(o);
  check(JSON.stringify(a)===JSON.stringify(b),'I10 zelfde invoer → identieke uitkomst (deterministisch)');
  const c=inv({localStorage:ls({tk_trainings:'[{"id":"ct1","name":"x"}]',tk_gw_log:'[1,2]'})});
  const fa=x=>x.bronnen.find(y=>y.id==='eigen_trainingen').vingerafdruk;
  check(fa(a)!==fa(c),'I10 gewijzigde bron → andere vingerafdruk');
  const vg={status:'bezig',bronnen:{eigen_trainingen:{klaar:true,vingerafdruk:fa(a)},begeleide_training_log:{klaar:true,vingerafdruk:'00000000'}}};
  const te=L.bronnenTeVerwerken(vg,a.bronnen).map(x=>x.id);
  check(te.indexOf('eigen_trainingen')<0&&te.indexOf('begeleide_training_log')>=0,'I10 hervatten: afgeronde, ongewijzigde bron overgeslagen; gewijzigde bron opnieuw');
  check(L.bronnenTeVerwerken(Object.assign({},vg,{status:'voltooid'}),a.bronnen).length===a.bronnen.length,'I10 nieuwe run na een voltooide run → alle bronnen'); }
// I11
{ const u=inv({localStorage:ls({tk_theme:'dark',tk_draft_training:'{}',tk_trainings:'[{"id":"ct1"}]'})});
  const r=recs(u).map(x=>x.bron==='eigen_trainingen'?Object.assign({},x,{status:H.GEKOPPELD}):x);
  const s=L.samenvatting(r,{volledig:u.volledig,voortgang:{status:'voltooid'}});
  check(s.geinventariseerd===r.length&&s.overeenkomend===1&&s.geblokkeerd===r.filter(x=>L.blokkeert(x.status)).length&&s.poort.geinventariseerd===true&&s.poort.aantal===s.geblokkeerd,'I11 samenvatting: aantallen en poortinvoer bij een voltooide, volledige run');
  check(L.samenvatting(r,{volledig:u.volledig,voortgang:{status:'bezig'}}).poort.geinventariseerd===false,'I11 onderbroken run → niet geïnventariseerd');
  check(L.samenvatting(r,{volledig:false,voortgang:{status:'voltooid'}}).poort.geinventariseerd===false,'I11 onvolledige inventaris (onleesbare bron) → niet geïnventariseerd');
  check(s.onbekend===0&&L.samenvatting([{status:H.EIGENAARLOOS},{status:H.ONLEESBAAR},{status:H.ONBEKEND},{status:H.ONBEKENDE_BRON}],{}).onbekend===4,'I11 "onbekend" telt eigenaarloos, onleesbaar, niet vergeleken en onbekende bronnen'); }
// I12
{ const u=inv({localStorage:ls({tk_trainings:'[{"id":"ct1","name":"Geheim plan"}]',tk_draft_training:'{"t":"Geheime notitie"}'}),wachtrij:[{id:1,owner_uid:'A',body:{note:'privé'}}]});
  const r=recs(u);
  check(r.filter(x=>'waarde' in x).every(x=>x.teVergelijken)&&!JSON.stringify(r.filter(x=>!x.teVergelijken)).match(/Geheime notitie|privé/),'I12 alleen te vergelijken records dragen hun waarde; overige records alleen een vingerafdruk');
  check(!r.some(x=>x.status==='SERVER_VERIFIED'),'I12 geen enkel historisch record krijgt SERVER_VERIFIED'); }
// I13
{ const r=require('child_process').spawnSync(process.execPath,[path.join(__dirname,'..','tools','inventory-manifest.js'),'--check'],{encoding:'utf8'});
  check(r.status===0,'I13 bronmanifest (docs) is gelijk aan het manifest in de code'+(r.status?(': '+r.stderr):'')); }
console.log('TK-REL-SEC-26: '+n+'/'+n);
