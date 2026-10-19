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
      for(const k of Object.keys(value)){ if(BAD_KEY.test(k)){ st.redacted=true; continue; } out[k]=clean(value[k],st,depth+1); }
      return out;
    }
    return value;
  }
  function checkOwner(uid){if(typeof uid!=='string'||uid.length<8||uid.length>128)throw fout('owner_required');}
  // Wachtrij: eigenaar in de payload of in een filter (user_id=eq.X) die niet de exporteur is → niet exporteren.
  const FILTER_EIGENAAR=/(?:^|&)(user_id|owner_uid|p_user_id)=eq\.([^&]*)/g;
  function embeddedOtherOwner(v,owner,depth){
    depth=depth||0;
    if(depth>25)return true;
    if(!v||typeof v!=='object')return false;
    if(Array.isArray(v))return v.some(x=>embeddedOtherOwner(x,owner,depth+1));
    return Object.keys(v).some(k=>{
      const x=v[k];
      if(['user_id','owner_uid','p_user_id'].includes(k)&&x!=null&&String(x)!==owner)return true;
      if(k==='filter'&&typeof x==='string'){ let m; FILTER_EIGENAAR.lastIndex=0; while((m=FILTER_EIGENAAR.exec(x))){ let w=m[2]; try{ w=decodeURIComponent(w); }catch(_){ return true; } if(w!==owner)return true; } }
      return embeddedOtherOwner(x,owner,depth+1);
    });
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
      const st={redacted:false}; let value=raw;
      try{value=JSON.stringify(clean(JSON.parse(raw),st));}catch(e){if(e.code==='nesting_too_deep')throw e; value=raw;}
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
      if(embeddedOtherOwner(item,owner)){omissions.push({source:'offline_queue',reason:'payload_other_owner'});continue;}
      const st={redacted:false}; const value=clean(item,st);
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
