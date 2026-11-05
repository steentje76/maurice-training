/* TK-REL-SEC-29: encrypted, read-only local rescue package.
 * No auto-restore, no account credentials, and NEVER evidence for uninstall.
 *
 * TK-REL-SEC-30 (onafhankelijke acceptatie, 19-10-2026):
 *  - nieuwe bestanden: PBKDF2-SHA256 met 600.000 iteraties (OWASP 2023); bestaande v1-bestanden (210.000) blijven
 *    leesbaar; elke andere waarde wordt geweigerd;
 *  - envelop: exact de bekende velden, strikte base64 en groottegrenzen VÓÓR sleutelafleiding of ontsleuteling;
 *  - inhoud na ontsleutelen strikt gevalideerd (eigenaar, datum, aantallen, sleutel/bron tegen het manifest,
 *    waardetypen en -groottes); dezelfde validatie geldt vóór het versleutelen;
 *  - getrouwheid: verwijderde geheimvelden (redacted) en niet byte-gelijke waarden (normalized) worden per item
 *    gemarkeerd; "__proto__" in gebruikersdata blijft data (objecten zonder prototype);
 *  - wachtrij: echte (platte) wachtrijrecords worden gelezen; filters op de user_id van een ander en
 *    credential-tabellen komen niet in de kopie;
 *  - onbekende bronnen worden herkenbaar overgeslagen (vingerafdruk van de sleutelnaam, nooit de inhoud). */
(function(root,factory){
  if(typeof module==='object'&&module.exports)module.exports=factory(require('./localInventory.js'));
  else root.TKLocalBackup=factory(root.LocalInventoryCore);
}(typeof self!=='undefined'?self:this,function(INV){
  'use strict';
  const FORMAT='tk-local-rescue-encrypted.v1', DATA_FORMAT='tk-local-rescue-data.v1';
  const ITER=600000, ITER_V1=210000, ITER_TOEGESTAAN=[ITER_V1,ITER];
  const MAX_BESTAND=24*1024*1024;              // gekozen bestand (bytes)
  const MAX_CIPHERTEXT=16*1024*1024;           // ontsleutelde inhoud ≤ 16 MB (localStorage is enkele MB's)
  const MAX_DATA_B64=Math.ceil((MAX_CIPHERTEXT+16)/3)*4;
  const MAX_ITEMS=20000, MAX_SLEUTEL=256, MAX_WAARDE=8*1024*1024, MAX_OMISSIES=20000;
  const ENVELOP_VELDEN=['format','kdf','iterations','cipher','salt','iv','data'];
  const DATA_VELDEN=['format','owner','created','entries','omissions','complete','restoreAllowed'];
  const ENTRY_VELDEN=['storage','key','value','source','redacted','normalized'];
  const BAD_KEY=/^(token|access_token|refresh_token|id_token|session_token|password|passwd|passphrase|wachtwoord|secret|client_secret|api_key|apikey|api-key|private_key|authorization|cookie|token_hash)$/i;
  const BAD_SOURCE=/(auth_session|access[_-]?token|refresh[_-]?token|credential|oauth|secret)/i;
  // SEC-570-04/F2: normalize casing and separators for credential-like keys.
  const CREDENTIAL_VARIANT=/(token|secret|password|passwd|passphrase|wachtwoord|apikey|privatekey|jwt|authorization|cookie)/;
  function variantCredentialKey(k){return typeof k==='string'&&CREDENTIAL_VARIANT.test(k.replace(/[^a-z0-9]/gi,'').toLowerCase());}
  // Tabellen waarvan een wachtrij-item credential-materiaal bevat (geheim of afgeleid): nooit in de kopie.
  const CREDENTIAL_TABELLEN=['calendar_feed_tokens','wearable_connections','wearable_oauth_state','external_connections'];
  const DATA_CATS=new Set(['duurzaam','concept','wachtrij','serverkopie','voorkeur','legacy']);
  const METHODS=['POST','PATCH','DELETE','RPC'];
  function fout(code){ const e=new Error(code); e.code=code; return e; }
  function bytes(s){return new TextEncoder().encode(s);}
  function b64(a){let s='';for(const n of a)s+=String.fromCharCode(n);return btoa(s);}
  const B64=/^[A-Za-z0-9+/]*={0,2}$/;
  function unb64(s,max){
    if(typeof s!=='string'||s.length>max||s.length%4!==0||!B64.test(s))return null;
    let raw; try{ raw=atob(s); }catch(_){ return null; }
    return Uint8Array.from(raw,c=>c.charCodeAt(0));
  }
  function fnv(t){ let h=0x811c9dc5; const s=String(t); for(let i=0;i<s.length;i++){ h^=s.charCodeAt(i); h=Math.imul(h,0x01000193)>>>0; } return ('00000000'+h.toString(16)).slice(-8); }
  // Geheimvelden weghalen; objecten zonder prototype zodat "__proto__" gewone data blijft.
  function clean(value,st,depth){
    depth=depth||0;
    if(depth>32)throw fout('nesting_too_deep');
    if(Array.isArray(value))return value.map(v=>clean(v,st,depth+1));
    if(value&&typeof value==='object'){
      const out=Object.create(null);
      for(const k of Object.keys(value)){ if(BAD_KEY.test(k)||(!BAD_SOURCE.test(k)&&variantCredentialKey(k))){ st.redacted=true; continue; } out[k]=clean(value[k],st,depth+1); }
      return out;
    }
    return value;
  }
  // SEC-570-03 (heracceptatie PR #573): clean() verwijdert credentialvelden alleen uit objecten; een tekstwaarde
  // (bv. een JSON-tekst met "refresh_token") bleef ongemoeid. geheimIn() doorzoekt een al geschoonde waarde op
  // credentialmateriaal dat clean() niet betrouwbaar kan verwijderen zonder de tekst semantisch te wijzigen:
  //  - tekst die een credentialsleutel (BAD_KEY) of -bron (BAD_SOURCE) als sleutel noemt ("…_token": / =), ook met
  //    escapes (\"), percent-codering, een JWT of een Bearer-token;
  //  - JSON-tekst (begrensd geparsed, ook genest en dubbel gecodeerd) met zo'n sleutel of een credentialtabel;
  //  - objectsleutels die op BAD_SOURCE lijken (clean() verwijdert alleen exacte BAD_KEY-namen) en RPC-namen.
  // Begrensd: diepte ≤ 25, per tekst ≤ MAX_WAARDE, totaal te doorzoeken tekst ≤ MAX_SCAN per item. Ongeldige JSON
  // met \u-escapes, overschreden grenzen of te diepe nesting zijn niet te controleren. De aanroeper slaat het
  // item dan over met een herkenbare reden; er wordt nooit tekst herschreven. Uitkomst: null of de reden.
  // Alle patronen zijn lineair (ReDoS): begrensde kwantoren, geen onbegrensde tekenklasse vóór een vaste tekst.
  const GEHEIM_SLEUTELS=BAD_KEY.source.replace(/^\^\(|\)\$$/g,'');
  const TEKST_SLEUTEL=new RegExp('(?:^|[^A-Za-z0-9_])\\\\{0,8}["\']?(?:'+GEHEIM_SLEUTELS+')\\\\{0,8}["\']?\\s{0,8}[:=]','i');
  const TEKST_BRON=new RegExp(BAD_SOURCE.source+'[A-Za-z0-9_-]{0,64}\\\\{0,8}["\']?\\s{0,8}[:=]','i');
  const TEKST_BEARER=/\bBearer\s{1,8}[A-Za-z0-9._~+\/=-]{16}/i;
  const TEKST_GEHEIM=[TEKST_SLEUTEL,TEKST_BRON,TEKST_BEARER];
  // JWT: drie base64url-delen van ≥ 8 tekens, het eerste beginnend met "eyJ". Lineair: maximale reeksen van
  // base64url-tekens en punten (zonder terugzoeken), daarna per reeks een eenvoudige controle.
  const RUN_JWT=/[A-Za-z0-9_.-]+/g;
  function bevatJwt(s){
    RUN_JWT.lastIndex=0; let m;
    while((m=RUN_JWT.exec(s))){
      const d=m[0].split('.');
      for(let i=0;i+2<d.length;i++)if(d[i].length>=8&&d[i].indexOf('eyJ')>=0&&d[i+1].length>=8&&d[i+2].length>=8)return true;
    }
    return false;
  }
  const MAX_SCAN=2*MAX_WAARDE;
  const IN_TEKST='credential_in_text', CRED='credential_material', NIET_TE_CONTROLEREN='payload_unverifiable';
  // SEC-570-03A: %25 encodes the percent sign of the next %XX.
  // Check every layer with bounded, linear scans. On excess layers: fail closed.
  const MAX_URL_DECODE_RONDES=4;
  function tekstNoemtGeheim(s){
    if(TEKST_GEHEIM.some(r=>r.test(s))||bevatJwt(s))return true;
    if(/%[0-9A-Fa-f]{2}/.test(s)){
      let d=s;
      for(let n=0;n<MAX_URL_DECODE_RONDES;n++){
        const next=d.replace(/%([0-9A-Fa-f]{2})/g,(_,h)=>String.fromCharCode(parseInt(h,16)));
        if(next===d)break;
        d=next;
        if(TEKST_GEHEIM.some(r=>r.test(d))||bevatJwt(d))return true;
      }
      if(/%[0-9A-Fa-f]{2}/.test(d))return NIET_TE_CONTROLEREN;
    }
    return false;
  }
  function geheimIn(v,st,depth,inTekst){
    depth=depth||0;
    if(depth>25)return NIET_TE_CONTROLEREN;
    if(typeof v==='string'){
      if(v.length>MAX_WAARDE||(st.scan=(st.scan||0)+v.length)>MAX_SCAN)return NIET_TE_CONTROLEREN;
      const tekstControle=tekstNoemtGeheim(v);
      if(tekstControle)return tekstControle===NIET_TE_CONTROLEREN?NIET_TE_CONTROLEREN:IN_TEKST;
      // SEC-570-04/F1: parse JSON on every bounded URL-decoded layer.
      // Scanning only regex misses JSON \u-escaped credential keys.
      if(/%[0-9A-Fa-f]{2}/.test(v)){
        let decoded=v;
        for(let round=0;round<MAX_URL_DECODE_RONDES;round++){
          const next=decoded.replace(/%([0-9A-Fa-f]{2})/g,(_,h)=>String.fromCharCode(parseInt(h,16)));
          if(next===decoded)break;
          decoded=next;
          if(decoded.length>MAX_WAARDE||(st.scan+=decoded.length)>MAX_SCAN)return NIET_TE_CONTROLEREN;
          const candidate=decoded.trim();
          if(candidate[0]==='{'||candidate[0]==='['||candidate[0]==='"'){
            let p;
            try{p=JSON.parse(candidate);}catch(_){
              if(/\\u[0-9A-Fa-f]{4}/.test(candidate))return NIET_TE_CONTROLEREN;
              continue;
            }
            const result=geheimIn(p,st,depth+1,true);
            if(result)return result;
          }
        }
      }
      const t=v.trim();
      if(t[0]==='{'||t[0]==='['||t[0]==='"'){
        let p; try{ p=JSON.parse(t); }catch(_){ return /\\u[0-9A-Fa-f]{4}/.test(t)?NIET_TE_CONTROLEREN:null; }
        return geheimIn(p,st,depth+1,true);
      }
      return null;
    }
    if(!v||typeof v!=='object')return null;
    if(Array.isArray(v)){ for(const x of v){ const r=geheimIn(x,st,depth+1,inTekst); if(r)return r; } return null; }
    for(const k of Object.keys(v)){
      const x=v[k];
      if(BAD_KEY.test(k)||BAD_SOURCE.test(k))return inTekst?IN_TEKST:CRED;
      if(variantCredentialKey(k))return inTekst?IN_TEKST:CRED;
      if(k==='table'&&typeof x==='string'&&CREDENTIAL_TABELLEN.indexOf(x)>=0)return inTekst?IN_TEKST:CRED;
      if(k==='function'&&typeof x==='string'&&BAD_SOURCE.test(x))return CRED;
      const r=geheimIn(x,st,depth+1,inTekst); if(r)return r;
    }
    return null;
  }
  function checkOwner(uid){if(typeof uid!=='string'||uid.length<8||uid.length>128)throw fout('owner_required');}
  // Wachtrij: eigenaar in de payload of in een filter (user_id=eq.X) die niet de exporteur is → niet exporteren.
  // SEC-570-02 (heracceptatie PR #570): ook tekstwaarden worden gecontroleerd. Een tekst die JSON is, wordt (begrensd)
  // geparsed en met dezelfde regels doorzocht, ook genest en dubbel gecodeerd. Een tekst die een eigenaarskolom noemt
  // maar niet te controleren is (ongeldige JSON, ander filterpatroon), telt als onverifieerbaar en wordt overgeslagen.
  // Een eigenaarsveld moet exact de tekst van de exporteur zijn (geen String() van arrays/objecten/getallen).
  // Uitkomst: null (geen andere eigenaar gevonden) of de reden om over te slaan.
  const EIGENAAR_SLEUTEL=/^(user_id|owner_uid|p_user_id)$/i;
  const NOEMT_EIGENAAR=/(?:^|[^A-Za-z0-9_])(user_id|owner_uid|p_user_id)(?:[^A-Za-z0-9_]|$)/i;
  const ANDERE='payload_other_owner', ONVERIFIEERBAAR='payload_unverifiable';
  function filterEigenaar(f,owner){
    let decoded=f;
    for(let n=0;n<MAX_URL_DECODE_RONDES;n++){
      if(!/%[0-9A-Fa-f]{2}/.test(decoded))break;
      decoded=decoded.replace(/%([0-9A-Fa-f]{2})/g,(_,h)=>String.fromCharCode(parseInt(h,16)));
    }
    if(/%[0-9A-Fa-f]{2}/.test(decoded))return ONVERIFIEERBAAR;
    for(const deel of decoded.split('&')){
      if(!deel)continue;
      // SEC-570-04/F4: percent decode of the whole filter has already happened.
      // A second URI decode would reject a safe literal percent (e.g. 100%25).
      const i=deel.indexOf('=');
      const k=i<0?deel:deel.slice(0,i), w=i<0?'':deel.slice(i+1);
      if(EIGENAAR_SLEUTEL.test(k)){ if(w!=='eq.'+owner)return ANDERE; continue; }
      // Eigenaarskolom elders in het filter (or=(user_id.eq.X), not.user_id…): niet eenduidig te controleren.
      if(NOEMT_EIGENAAR.test(k)||NOEMT_EIGENAAR.test(w))return ONVERIFIEERBAAR;
    }
    return null;
  }
  function tekstEigenaar(s,owner,depth){
    if(s.length>MAX_WAARDE)return ONVERIFIEERBAAR;
    let decoded=s;
    for(let n=0;n<=MAX_URL_DECODE_RONDES;n++){
      const t=decoded.trim();
      if(t[0]==='{'||t[0]==='['||t[0]==='\"'){
        let p,parsed=false;
        try{p=JSON.parse(t);parsed=true;}catch(_){if(NOEMT_EIGENAAR.test(decoded))return ONVERIFIEERBAAR;}
        if(parsed){const r=embeddedOtherOwner(p,owner,depth+1);if(r)return r;}
      }else if(NOEMT_EIGENAAR.test(decoded))return ONVERIFIEERBAAR;
      if(!/%[0-9A-Fa-f]{2}/.test(decoded))return null;
      if(n===MAX_URL_DECODE_RONDES)return ONVERIFIEERBAAR;
      decoded=decoded.replace(/%([0-9A-Fa-f]{2})/g,(_,h)=>String.fromCharCode(parseInt(h,16)));
    }
    return null;
  }
  function embeddedOtherOwner(v,owner,depth){
    depth=depth||0;
    if(depth>25)return ONVERIFIEERBAAR;
    if(typeof v==='string')return tekstEigenaar(v,owner,depth);
    if(!v||typeof v!=='object')return null;
    if(Array.isArray(v)){ for(const x of v){ const r=embeddedOtherOwner(x,owner,depth+1); if(r)return r; } return null; }
    for(const k of Object.keys(v)){
      const x=v[k];
      if(EIGENAAR_SLEUTEL.test(k)){ if(x!=null&&x!==owner)return ANDERE; continue; }
      if(NOEMT_EIGENAAR.test(k)&&x!=null&&typeof x!=='object'&&x!==owner)return ONVERIFIEERBAAR;
      if(k==='filter'&&typeof x==='string'){ const r=filterEigenaar(x,owner); if(r)return r; continue; }
      const r=embeddedOtherOwner(x,owner,depth+1); if(r)return r;
    }
    return null;
  }
  function bronVoor(manifest,k){
    let found=null;
    for(const m of manifest)if(m.opslag==='localStorage'&&(m.sleutel===k||(m.prefix&&k.startsWith(m.prefix)&&k.length>m.prefix.length))&&(!found||(m.sleutel===k)||((m.prefix||'').length>(found.prefix||'').length)))found=m;
    return found;
  }
  function prepare({owner,cacheOwner,local={},queue=[],manifest=[]}={}){
    checkOwner(owner);
    if(!Array.isArray(manifest)||manifest.length<1||!Array.isArray(queue)||!local||typeof local!=='object')throw fout('snapshot_invalid');
    const entries=[],omissions=[], seen=new Set();
    for(const key of Object.keys(local)){
      const raw=local[key], m=bronVoor(manifest,key);
      if(!m||!DATA_CATS.has(m.categorie)||m.vorm==='geheim'||BAD_SOURCE.test(key)||BAD_SOURCE.test(m.id||'')){
        if(!m)omissions.push({source:'unrecognized_local_storage',reason:'not_exported',key_fingerprint:fnv(key)});
        else if(DATA_CATS.has(m.categorie))omissions.push({source:m.id,reason:'credential_material'});
        continue;
      }
      if(m.eigenaar==='cache'&&cacheOwner!==owner){omissions.push({source:m.id,reason:'other_or_unknown_owner'});continue;}
      if(m.eigenaar==='suffix'&&!key.endsWith('_'+owner)){omissions.push({source:m.id,reason:'other_owner'});continue;}
      if(m.eigenaar==='onbekend'||m.eigenaar==='item'){omissions.push({source:m.id,reason:'owner_unknown'});continue;}
      if(m.eigenaar==='geen'){omissions.push({source:m.id,reason:'no_personal_owner'});continue;}
      if(typeof raw!=='string'){omissions.push({source:m.id,reason:'unreadable'});continue;}
      if(raw.length>MAX_WAARDE){omissions.push({source:m.id,reason:'too_large'});continue;}
      const st={redacted:false}; let value=raw, geschoond, geparsed=false;
      try{geschoond=clean(JSON.parse(raw),st); geparsed=true; value=JSON.stringify(geschoond);}catch(e){if(e.code==='nesting_too_deep')throw e; value=raw;}
      // SEC-570-03: credentialmateriaal dat clean() niet kan verwijderen (in tekst of JSON-tekst): bron overslaan.
      const geheimL=geheimIn(geparsed?geschoond:raw,{},0,false);
      if(geheimL){omissions.push({source:m.id,reason:geheimL});continue;}
      if(seen.has(key))throw fout('duplicate_source');seen.add(key);
      const e={storage:'localStorage',key,value,source:m.id};
      if(st.redacted)e.redacted=true;
      if(value!==raw)e.normalized=true;
      entries.push(e);
    }
    // TK-REL-SEC-30: de echte wachtrijstore (maurice_offline/queue) bewaart PLATTE records {id, table, method, filter,
    // body, function, args, resolution, onzeker, ts, owner_uid} (offlineQueueAdd). De eerdere versie verwachtte een
    // genest 'item' en sloeg daardoor elk echt wachtrij-item over. De inhoud is het record zonder id/ts/owner_uid.
    for(const q of queue){
      if(!q||typeof q!=='object'||q.owner_uid!==owner){omissions.push({source:'offline_queue',reason:'other_or_unknown_owner'});continue;}
      const item=Object.create(null); for(const k of Object.keys(q)){ if(k!=='id'&&k!=='ts'&&k!=='owner_uid')item[k]=q[k]; }
      if(!Number.isSafeInteger(q.id)||q.id<0||(typeof item.table!=='string'&&typeof item.function!=='string')||METHODS.indexOf(item.method)<0){omissions.push({source:'offline_queue',reason:'invalid_queue_item'});continue;}
      if(CREDENTIAL_TABELLEN.indexOf(item.table)>=0){omissions.push({source:'offline_queue',reason:'credential_material'});continue;}
      // SEC-570-02: offlineQueueAdd bewaart body/args altijd als object of array en filter als tekst. Een ander type
      // (bv. een JSON-tekst als body: legacy of beschadigd) is geen productievorm: herkenbaar overslaan. Het
      // wachtrijrecord zelf blijft onaangeroerd in maurice_offline/queue; prepare() leest alleen.
      if((item.body!=null&&typeof item.body!=='object')||(item.args!=null&&typeof item.args!=='object')||(item.filter!=null&&typeof item.filter!=='string')){omissions.push({source:'offline_queue',reason:'unexpected_payload_type'});continue;}
      const anders=embeddedOtherOwner(item,owner);
      if(anders){omissions.push({source:'offline_queue',reason:anders});continue;}
      const st={redacted:false}; const value=clean(item,st);
      // SEC-570-03: credentialmateriaal dat clean() niet kan verwijderen: item overslaan, de wachtrij blijft intact.
      const geheimQ=geheimIn(value,{},0,false);
      if(geheimQ){omissions.push({source:'offline_queue',reason:geheimQ});continue;}
      const e={storage:'offline_queue',key:String(q.id),value,source:'offline_wachtrij'}; if(st.redacted)e.redacted=true;
      entries.push(e);
    }
    entries.sort((a,b)=>a.storage.localeCompare(b.storage)||a.key.localeCompare(b.key));
    const data={format:DATA_FORMAT,owner,created:new Date().toISOString(),entries:JSON.parse(JSON.stringify(entries)),
      omissions,complete:false,restoreAllowed:false};
    valideer(data,manifest);
    return data;
  }
  function eigenVelden(o,toegestaan){ return !!o&&typeof o==='object'&&!Array.isArray(o)&&Object.keys(o).every(k=>toegestaan.indexOf(k)>=0); }
  // Strikte inhoudsvalidatie: dezelfde regels vóór versleutelen en na ontsleutelen.
  function valideer(d,manifest){
    const man=manifest||(INV&&INV.BRONNEN);
    if(!Array.isArray(man)||!man.length)throw fout('manifest_missing');
    if(!eigenVelden(d,DATA_VELDEN)||d.format!==DATA_FORMAT)throw fout('invalid_payload');
    if(typeof d.owner!=='string'||d.owner.length<8||d.owner.length>128)throw fout('invalid_owner');
    if(typeof d.created!=='string'||!/^\d{4}-\d{2}-\d{2}T/.test(d.created)||!isFinite(Date.parse(d.created)))throw fout('invalid_created');
    if(d.complete!==false||d.restoreAllowed!==false)throw fout('invalid_payload');
    if(!Array.isArray(d.entries)||d.entries.length>MAX_ITEMS)throw fout('too_many_entries');
    if(!Array.isArray(d.omissions)||d.omissions.length>MAX_OMISSIES)throw fout('invalid_omissions');
    for(const o of d.omissions){ if(!o||typeof o!=='object'||Array.isArray(o)||typeof o.source!=='string'||typeof o.reason!=='string'||o.source.length>MAX_SLEUTEL||o.reason.length>64)throw fout('invalid_omissions'); }
    const uniek=new Set();
    for(const it of d.entries){
      if(!eigenVelden(it,ENTRY_VELDEN))throw fout('invalid_entry');
      if(typeof it.key!=='string'||!it.key||it.key.length>MAX_SLEUTEL||typeof it.source!=='string')throw fout('invalid_entry');
      if(('redacted' in it&&it.redacted!==true)||('normalized' in it&&it.normalized!==true))throw fout('invalid_entry');
      if(it.storage==='localStorage'){
        if(BAD_SOURCE.test(it.key))throw fout('credential_entry_refused');
        const b=bronVoor(man,it.key);
        if(!b||b.id!==it.source||!DATA_CATS.has(b.categorie)||b.vorm==='geheim')throw fout('unknown_source');
        if(typeof it.value!=='string'||it.value.length>MAX_WAARDE)throw fout('invalid_value');
      }else if(it.storage==='offline_queue'){
        if(!/^\d{1,15}$/.test(it.key)||it.source!=='offline_wachtrij')throw fout('invalid_entry');
        const v=it.value;
        if(!v||typeof v!=='object'||Array.isArray(v)||(typeof v.table!=='string'&&typeof v.function!=='string')||METHODS.indexOf(v.method)<0)throw fout('invalid_value');
        if(typeof v.table==='string'&&(v.table.length>64||CREDENTIAL_TABELLEN.indexOf(v.table)>=0))throw fout('credential_entry_refused');
      }else throw fout('invalid_entry');
      const id=it.storage+':'+it.key; if(uniek.has(id))throw fout('duplicate_entry'); uniek.add(id);
    }
    return true;
  }
  async function derive(subtle,pass,salt,iter,usages){
    const key=await subtle.importKey('raw',bytes(pass),'PBKDF2',false,['deriveKey']);
    return subtle.deriveKey({name:'PBKDF2',salt,iterations:iter,hash:'SHA-256'},key,{name:'AES-GCM',length:256},false,usages);
  }
  function passOk(p){if(typeof p!=='string'||p.length<12||p.length>256)throw fout('passphrase_min_12');}
  async function encrypt(data,pass,cryptoObj){
    passOk(pass);
    if(!data||data.format!==DATA_FORMAT||data.complete!==false||data.restoreAllowed!==false)throw fout('invalid_payload');
    valideer(data);
    const api=cryptoObj||globalThis.crypto;if(!api||!api.subtle||!api.getRandomValues)throw fout('secure_crypto_unavailable');
    const plain=bytes(JSON.stringify(data)); if(plain.length>MAX_CIPHERTEXT)throw fout('too_large');
    const salt=api.getRandomValues(new Uint8Array(16)),iv=api.getRandomValues(new Uint8Array(12));
    const key=await derive(api.subtle,pass,salt,ITER,['encrypt']);
    const ciphertext=await api.subtle.encrypt({name:'AES-GCM',iv,additionalData:bytes(FORMAT)},key,plain);
    return {format:FORMAT,kdf:'PBKDF2-SHA256',iterations:ITER,cipher:'AES-256-GCM',salt:b64(salt),iv:b64(iv),data:b64(new Uint8Array(ciphertext))};
  }
  // Envelop controleren zonder iets te ontsleutelen (goedkoop, vóór sleutelafleiding).
  function controleerEnvelop(envelope){
    if(!eigenVelden(envelope,ENVELOP_VELDEN)||Object.keys(envelope).length!==ENVELOP_VELDEN.length)throw fout('invalid_envelope');
    if(envelope.format!==FORMAT||envelope.kdf!=='PBKDF2-SHA256'||envelope.cipher!=='AES-256-GCM'||ITER_TOEGESTAAN.indexOf(envelope.iterations)<0)throw fout('invalid_envelope');
    const salt=unb64(envelope.salt,32),iv=unb64(envelope.iv,24),payload=unb64(envelope.data,MAX_DATA_B64);
    if(!salt||salt.length!==16||!iv||iv.length!==12||!payload||payload.length<16||payload.length>MAX_CIPHERTEXT+16)throw fout('invalid_ciphertext');
    return {salt,iv,payload};
  }
  async function inspect(envelope,pass,cryptoObj){
    passOk(pass);
    const {salt,iv,payload}=controleerEnvelop(envelope);
    const api=cryptoObj||globalThis.crypto;if(!api||!api.subtle)throw fout('secure_crypto_unavailable');
    const key=await derive(api.subtle,pass,salt,envelope.iterations,['decrypt']);
    let plain;try{plain=await api.subtle.decrypt({name:'AES-GCM',iv,additionalData:bytes(FORMAT)},key,payload);}catch(_){throw fout('wrong_password_or_corrupt_file');}
    let result;try{result=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(plain));}catch(_){throw fout('invalid_payload');}
    valideer(result);
    return {owner:result.owner,entries:result.entries.length,excluded:result.omissions.length,
      complete:false,restoreAllowed:false,iterations:envelope.iterations,legacyKdf:envelope.iterations<ITER,data:result}; // dry-run only, never writes.
  }
  return {FORMAT,DATA_FORMAT,ITERATIES:ITER,ITERATIES_V1:ITER_V1,MAX_BESTAND,MAX_ITEMS,prepare,encrypt,inspect,valideer,controleerEnvelop,vingerafdruk:fnv};
}));
