/* ==========================================================================
 * TrainingKompas — HERSTELPREVIEW  (restorepreview.v1, fase 4B, TK-REL-SEC-31)
 * --------------------------------------------------------------------------
 * Bepaalt voor een ontsleutelde, gevalideerde reddingskopie (TKLocalBackup.inspect) per record wat een LATERE,
 * afzonderlijk geautoriseerde herstelprocedure zou kunnen doen. Zuivere functies: geen opslag, geen netwerk, geen
 * DOM, geen klok. Er wordt niets teruggezet; HERSTELBAAR is géén toestemming tot herstellen.
 *
 * Statussen per record:
 *   HERSTELBAAR       technisch geschikt voor een latere herstelprocedure (identiteit, eigenaar en bron bekend,
 *                     lokaal afwezig)
 *   BESTAAT_AL        hetzelfde record (zelfde identiteit en inhoud) staat al lokaal
 *   CONFLICT          zelfde identiteit lokaal, afwijkende inhoud
 *   ANDER_ACCOUNT     eigenaar in het record (sleutel of payload) is niet het ingelogde account
 *   ONBEKEND          identiteit, bron, inhoud of ouder onvoldoende vast te stellen
 *   NIET_ONDERSTEUND  dit type kan nog niet veilig worden teruggezet
 * Daarnaast per record 'op_server' (ja / nee / onbekend) voor gegevens die al op Supabase staan; 'nee' is nooit
 * definitief (RLS).
 * Het plan bevat geen inhoud en geen credentials: alleen bron, aantallen, identiteitssleutels, vingerafdrukken,
 * statussen en redenen.
 * ========================================================================== */
(function(root,factory){
  if(typeof module==='object'&&module.exports)module.exports=factory(require('./localInventory.js'));
  else root.TKRestorePreview=factory(root.LocalInventoryCore);
}(typeof self!=='undefined'?self:this,function(INV){
  'use strict';
  const VERSIE='restorepreview.v1';
  const S={HERSTELBAAR:'HERSTELBAAR',BESTAAT_AL:'BESTAAT_AL',CONFLICT:'CONFLICT',ANDER_ACCOUNT:'ANDER_ACCOUNT',ONBEKEND:'ONBEKEND',NIET_ONDERSTEUND:'NIET_ONDERSTEUND'};
  const MELDING='Dit is alleen een controle. Er worden geen gegevens teruggezet.';
  // Welke bronnen een latere herstelprocedure zou kunnen ondersteunen. Concepten (een lopende training van toen),
  // serverkopieën (opnieuw van de server te halen) en oude structuren worden niet teruggezet.
  const ONDERSTEUND={eigen_trainingen:true,trainingen_onbevestigd:true,begeleide_training_log:true,begeleide_training_historie:true,offline_wachtrij:true};
  const ONDERSTEUNDE_CATEGORIE={voorkeur:true};
  // Ouderregels voor wachtrij-items die gecontroleerd kunnen worden (catalogusouders zoals exercises/products niet).
  const OUDERS={sessions:[['training_instance_id','training_instances']],custom_training_exercises:[['custom_training_id','custom_trainings']],
    nutrition_meal_items:[['meal_id','nutrition_meals']],activity_laps:[['activity_id','activities']]};
  // Tabellen waarvan een POST met client-id (body.id) of natuurlijke sleutel idempotent opnieuw kan worden verstuurd.
  const IDEMPOTENT_NATUURLIJK={activity_laps:true,exercise_goals:true};
  function leeg(v){ return v===null||v===undefined; }
  function canon(v){ if(leeg(v))return null; if(Array.isArray(v))return v.map(canon); if(typeof v==='object'){ const o={}; Object.keys(v).sort().forEach(k=>{ if(v[k]!==undefined)o[k]=canon(v[k]); }); return o; } return v; }
  const vf=x=>INV.vingerafdruk(JSON.stringify(canon(x)));
  function parse(raw){ try{ return {ok:true,v:JSON.parse(raw)}; }catch(_){ return {ok:false}; } }
  function eigenaarIn(v,uid,d){ d=d||0; if(d>25||!v||typeof v!=='object')return false; if(Array.isArray(v))return v.some(x=>eigenaarIn(x,uid,d+1));
    return Object.keys(v).some(k=>(['user_id','owner_uid','p_user_id'].indexOf(k)>=0&&!leeg(v[k])&&String(v[k])!==uid)||eigenaarIn(v[k],uid,d+1)); }
  function filterEigenaarAnders(f,uid){ if(typeof f!=='string')return false; const re=/(?:^|&)(user_id|owner_uid|p_user_id)=eq\.([^&]*)/g; let m; while((m=re.exec(f))){ let w=m[2]; try{ w=decodeURIComponent(w); }catch(_){ return true; } if(w!==uid)return true; } return false; }
  // Records uit één localStorage-item volgens de vorm in het manifest. identiteit: 'id' | 'inhoud' | 'sleutel' | 'geheel'.
  function splits(bron,key,raw){
    if(bron.vorm==='tekst')return {ok:true,recs:[{rs:key,identiteit:'geheel',waarde:raw}]};
    const p=parse(raw); if(!p.ok)return {ok:false};
    const v=p.v;
    if(bron.vorm==='array'||bron.vorm==='ids'){
      if(!Array.isArray(v))return {ok:false};
      return {ok:true,recs:v.map(function(el){
        if(bron.vorm==='ids')return {rs:'id:'+String(el),identiteit:'id',waarde:el};
        if(bron.identiteit==='id')return (el&&typeof el==='object'&&!leeg(el.id)&&el.id!=='')?{rs:'id:'+String(el.id),identiteit:'id',waarde:el}:{rs:'zonder-id:'+vf(el),identiteit:'onbekend',waarde:el};
        return {rs:'inhoud:'+vf(el),identiteit:'inhoud',waarde:el};
      })};
    }
    if(bron.vorm==='map'){ if(!v||typeof v!=='object'||Array.isArray(v))return {ok:false}; return {ok:true,recs:Object.keys(v).sort().map(k=>({rs:'sleutel:'+k,identiteit:'sleutel',waarde:v[k]}))}; }
    return {ok:true,recs:[{rs:key,identiteit:'geheel',waarde:v}]};
  }
  // Lokale index per bron: record_sleutel → vingerafdruk (alleen leesbare bronnen van de scanner).
  function lokaleIndex(local,scanner,cacheOwner){
    const idx={}, onleesbaar={};
    Object.keys(local||{}).forEach(function(key){
      const bron=INV.bronVoorSleutel('localStorage',key); if(!bron)return;
      if(bron.eigenaar==='cache'&&cacheOwner!==scanner)return;
      if(bron.eigenaar==='suffix'&&!key.endsWith('_'+scanner))return;
      const raw=local[key]; if(typeof raw!=='string')return;
      const sp=splits(bron,key,raw); const id=bron.id+'|'+key;
      if(!sp.ok){ onleesbaar[id]=true; return; }
      idx[id]=idx[id]||{}; sp.recs.forEach(r=>{ idx[id][r.rs]=(r.identiteit==='geheel'&&bron.vorm==='tekst')?vf(r.waarde):vf(r.waarde); });
    });
    return {idx,onleesbaar};
  }
  function wachtrijInhoud(it){ return {table:it.table,method:it.method,filter:it.filter,body:it.body,function:it.function,args:it.args,resolution:it.resolution}; }
  function wachtrijIdentiteit(it){
    if(it.method==='POST'&&it.body&&!Array.isArray(it.body)&&!leeg(it.body.id)&&typeof it.table==='string')return it.table+':'+String(it.body.id);
    return null;
  }

  /* classificeer({ data, scanner, lokaal:{localStorage, wachtrij:[]|null, cacheEigenaar}, server:{'tabel:id': rij|null|undefined},
   *               bestand:{iterations, legacyKdf} })
   *  data: uitkomst van TKLocalBackup.inspect().data (al gevalideerd). Eigenaar ≠ scanner → fail-closed, geen records. */
  function classificeer(inv){
    const i=inv||{}, d=i.data, uid=leeg(i.scanner)?null:String(i.scanner);
    if(!d||!Array.isArray(d.entries)||!uid)return {ok:false,reden:'ongeldige_invoer'};
    if(d.owner!==uid)return {ok:false,reden:'ander_account'}; // geen inhoud of aantallen van een ander account tonen
    const lok=i.lokaal||{}, srv=i.server||{};
    const L=lokaleIndex(lok.localStorage||{},uid,lok.cacheEigenaar);
    const lokaleWachtrij=Array.isArray(lok.wachtrij)?lok.wachtrij.filter(q=>q&&q.owner_uid===uid):null;
    const lokQ={inhoud:{},identiteit:{}};
    (lokaleWachtrij||[]).forEach(function(q){ const it={}; Object.keys(q).forEach(k=>{ if(k!=='id'&&k!=='ts'&&k!=='owner_uid')it[k]=q[k]; });
      lokQ.inhoud[vf(wachtrijInhoud(it))]=true; const ident=wachtrijIdentiteit(it); if(ident)lokQ.identiteit[ident]=vf(wachtrijInhoud(it)); });
    // Bekende ouders: in het bestand, in de lokale wachtrij, in de lokale eigen trainingen of zichtbaar op de server.
    const ouders={};
    d.entries.forEach(function(e){ if(e.storage==='offline_queue'){ const ident=wachtrijIdentiteit(e.value); if(ident)ouders[ident]='bestand'; }
      if(e.storage==='localStorage'&&e.source==='eigen_trainingen'){ const p=parse(e.value); if(p.ok&&Array.isArray(p.v))p.v.forEach(t=>{ if(t&&!leeg(t.id))ouders['custom_trainings:'+t.id]='bestand'; }); } });
    Object.keys(lokQ.identiteit).forEach(k=>{ ouders[k]=ouders[k]||'lokaal'; });
    Object.keys(L.idx).forEach(id=>{ if(id.indexOf('eigen_trainingen|')===0)Object.keys(L.idx[id]).forEach(rs=>{ if(rs.indexOf('id:')===0)ouders['custom_trainings:'+rs.slice(3)]=ouders['custom_trainings:'+rs.slice(3)]||'lokaal'; }); });
    Object.keys(srv).forEach(k=>{ const r=srv[k]; if(r&&typeof r==='object'&&!leeg(r.user_id)&&String(r.user_id)===uid)ouders[k]=ouders[k]||'server'; });
    const opServer=function(k,lokaalWaarde,vergelijk){
      if(!(k in srv)||srv[k]===undefined)return 'onbekend';
      const r=srv[k]; if(r===null)return 'nee';
      if(r&&!leeg(r.user_id)&&String(r.user_id)!==uid)return 'nee';
      if(typeof vergelijk==='function')return vergelijk(r,lokaalWaarde)?'ja':'afwijkend';
      return 'ja';
    };
    const records=[];
    const push=function(r){ r.redenen=r.redenen||[]; records.push(r); };
    d.entries.forEach(function(e){
      if(e.storage==='localStorage'){
        const bron=INV.bronVoorSleutel('localStorage',e.key);
        if(!bron||bron.id!==e.source){ push({bron:e.source,record_sleutel:'*',status:S.ONBEKEND,redenen:['bron_onbekend'],vingerafdruk:null,op_server:'onbekend'}); return; }
        if(bron.eigenaar==='suffix'&&!e.key.endsWith('_'+uid)){ push({bron:bron.id,record_sleutel:'*',status:S.ANDER_ACCOUNT,redenen:['sleutel_van_ander_account'],vingerafdruk:null,op_server:'onbekend'}); return; }
        const sp=splits(bron,e.key,e.value);
        if(!sp.ok){ push({bron:bron.id,record_sleutel:'*',status:S.ONBEKEND,redenen:['inhoud_onleesbaar'],vingerafdruk:INV.vingerafdruk(e.value),op_server:'onbekend'}); return; }
        const lokId=bron.id+'|'+e.key, lokIdx=L.idx[lokId]||null, lokOnleesbaar=!!L.onleesbaar[lokId];
        sp.recs.forEach(function(r){
          const v=vf(r.waarde), red=[];
          if(e.redacted)red.push('velden_weggelaten_in_kopie');
          let st;
          let srvStatus='onbekend';
          if(bron.id==='eigen_trainingen'&&r.identiteit==='id'){
            srvStatus=opServer('custom_trainings:'+String(r.waarde.id),r.waarde,typeof i.trainingGelijk==='function'?i.trainingGelijk:null);
          }
          if(eigenaarIn(r.waarde,uid)){ st=S.ANDER_ACCOUNT; red.push('eigenaar_in_inhoud'); }
          else if(!(ONDERSTEUND[bron.id]||ONDERSTEUNDE_CATEGORIE[bron.categorie])){ st=S.NIET_ONDERSTEUND; red.push('type_niet_ondersteund:'+bron.categorie); }
          else if(e.redacted){ st=S.ONBEKEND; }
          else if(r.identiteit==='onbekend'){ st=S.ONBEKEND; red.push('geen_identiteit'); }
          else if(lokOnleesbaar){ st=S.ONBEKEND; red.push('lokale_bron_onleesbaar'); }
          else if(lokIdx&&lokIdx[r.rs]!==undefined){ st=(lokIdx[r.rs]===v)?S.BESTAAT_AL:S.CONFLICT; if(st===S.CONFLICT)red.push('lokaal_andere_inhoud'); }
          else st=S.HERSTELBAAR;
          // Afhankelijkheid: een markering "alleen op dit toestel" zonder de training zelf.
          if(bron.id==='trainingen_onbevestigd'&&st===S.HERSTELBAAR&&!ouders['custom_trainings:'+String(r.waarde)]){ st=S.ONBEKEND; red.push('ouder_ontbreekt'); }
          if(bron.id==='eigen_trainingen'&&(srvStatus==='ja'))red.push('al_op_server');
          push({bron:bron.id,record_sleutel:r.rs,status:st,redenen:red,vingerafdruk:v,op_server:srvStatus,categorie:bron.categorie,identiteit:r.identiteit});
        });
        return;
      }
      // Wachtrij-item
      const it=e.value, inh=wachtrijInhoud(it), v=vf(inh), ident=wachtrijIdentiteit(it), red=[];
      const rs=ident?('wachtrij:'+ident):('wachtrij-inhoud:'+v);
      let st, srvStatus='onbekend';
      if(ident)srvStatus=opServer(ident,it.body,function(row,body){ return Object.keys(body||{}).filter(k=>k!=='user_id').every(k=>JSON.stringify(canon(row[k]))===JSON.stringify(canon(body[k]))); });
      if(eigenaarIn(it,uid)||filterEigenaarAnders(it.filter,uid)){ st=S.ANDER_ACCOUNT; red.push('eigenaar_in_inhoud'); }
      else if(e.redacted){ st=S.ONBEKEND; red.push('velden_weggelaten_in_kopie'); }
      else if(lokaleWachtrij===null){ st=S.ONBEKEND; red.push('lokale_wachtrij_onleesbaar'); }
      else if(lokQ.inhoud[v]){ st=S.BESTAAT_AL; }
      else if(ident&&lokQ.identiteit[ident]){ st=S.CONFLICT; red.push('lokaal_andere_inhoud'); }
      else if(it.method==='POST'&&!ident&&!IDEMPOTENT_NATUURLIJK[it.table]){ st=S.NIET_ONDERSTEUND; red.push('niet_idempotent_dubbel_risico'); }
      else if(it.method==='RPC'){ st=S.NIET_ONDERSTEUND; red.push('rpc_niet_ondersteund'); }
      else st=S.HERSTELBAAR;
      // Ouder-kind: een kind waarvan de ouder nergens aantoonbaar bestaat, is niet zonder meer herstelbaar.
      const regels=(it.method==='POST'&&it.body)?(OUDERS[it.table]||[]):[];
      const deps=[];
      regels.forEach(function(p){ if(!leeg(it.body[p[0]])){ const ok=p[1]+':'+String(it.body[p[0]]); deps.push(ok); if(!ouders[ok]&&(st===S.HERSTELBAAR||st===S.BESTAAT_AL)){ if(st===S.HERSTELBAAR)st=S.ONBEKEND; red.push('ouder_ontbreekt:'+p[1]); } } });
      if(srvStatus==='ja')red.push('al_op_server');
      push({bron:'offline_wachtrij',record_sleutel:rs,status:st,redenen:red,vingerafdruk:v,op_server:srvStatus,categorie:'wachtrij',identiteit:ident?'id':'inhoud',
        tabel:typeof it.table==='string'?it.table:null,methode:it.method||null,afhankelijk_van:deps});
    });
    records.sort((a,b)=>(a.bron<b.bron?-1:a.bron>b.bron?1:(a.record_sleutel<b.record_sleutel?-1:a.record_sleutel>b.record_sleutel?1:0)));
    return {ok:true,records};
  }

  /* plan(uitkomst, meta): deterministisch concept-herstelplan zonder inhoud. Nooit uitvoerbaar. */
  function plan(uit,meta){
    const m=meta||{}, recs=(uit&&uit.records)||[];
    const telling={}; Object.keys(S).forEach(k=>{ telling[S[k]]=0; }); recs.forEach(r=>{ telling[r.status]++; });
    const perBron={};
    recs.forEach(function(r){
      const b=perBron[r.bron]=perBron[r.bron]||{bron:r.bron,categorie:r.categorie||null,datatype:null,aantal:0,per_status:{},eigenaar:m.eigenaar||null,
        identiteitscontrole:{},verwachte_conflicten:0,afhankelijkheden:[],overslaan:0,nader_onderzoek:0,al_op_server:0,alleen_lokaal:0};
      b.aantal++; b.per_status[r.status]=(b.per_status[r.status]||0)+1; b.identiteitscontrole[r.identiteit||'onbekend']=(b.identiteitscontrole[r.identiteit||'onbekend']||0)+1;
      if(r.status===S.CONFLICT)b.verwachte_conflicten++;
      if(r.status===S.BESTAAT_AL||r.status===S.NIET_ONDERSTEUND||r.status===S.ANDER_ACCOUNT||r.op_server==='ja')b.overslaan++;
      if(r.status===S.ONBEKEND||r.status===S.CONFLICT)b.nader_onderzoek++;
      if(r.op_server==='ja')b.al_op_server++;
      else if(r.status===S.HERSTELBAAR)b.alleen_lokaal++;
      (r.afhankelijk_van||[]).forEach(dp=>{ const t=dp.split(':')[0]; if(b.afhankelijkheden.indexOf(t)<0)b.afhankelijkheden.push(t); });
    });
    const bron=Object.keys(perBron).sort().map(k=>{ const b=perBron[k]; b.afhankelijkheden.sort();
      const def=INV.BRONNEN.filter(x=>x.id===k)[0]; b.datatype=def?def.vorm:(k==='offline_wachtrij'?'wachtrij':null);
      if(k==='trainingen_onbevestigd'&&b.afhankelijkheden.indexOf('custom_trainings')<0)b.afhankelijkheden.push('custom_trainings');
      return b; });
    const omis={}; (m.omissions||[]).forEach(o=>{ const k=(o&&o.reason)||'onbekend'; omis[k]=(omis[k]||0)+1; });
    return {versie:VERSIE,melding:MELDING,herstel_toegestaan:false,
      bestand:{formaat:m.formaat||null,aangemaakt:m.aangemaakt||null,iteraties:m.iteraties||null,oude_sleutelafleiding:!!m.legacyKdf,
        volledig:false,records:recs.length,overgeslagen_bij_export:(m.omissions||[]).length,overgeslagen_per_reden:omis,eigenaar_klopt:true},
      telling,bronnen:bron,
      records:recs.map(r=>({bron:r.bron,record_sleutel:r.record_sleutel,status:r.status,op_server:r.op_server,redenen:r.redenen.slice().sort(),vingerafdruk:r.vingerafdruk,
        tabel:r.tabel||undefined,methode:r.methode||undefined,afhankelijk_van:(r.afhankelijk_van&&r.afhankelijk_van.length)?r.afhankelijk_van.slice().sort():undefined}))};
  }
  return {VERSIE,STATUS:S,MELDING,classificeer,plan};
}));
