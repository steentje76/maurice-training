/* TK-REL-SEC-29: encrypted, read-only local rescue package.
 * No auto-restore, no account credentials, and NEVER evidence for uninstall. */
(function(root,factory){
  if(typeof module==='object'&&module.exports)module.exports=factory();
  else root.TKLocalBackup=factory();
}(typeof self!=='undefined'?self:this,function(){
  'use strict';
  const FORMAT='tk-local-rescue-encrypted.v1', ITER=210000;
  const BAD_KEY=/^(token|access_token|refresh_token|password|secret|api_key|authorization|id_token|client_secret)$/i;
  const BAD_SOURCE=/(auth_session|access[_-]?token|refresh[_-]?token|credential|oauth|secret)/i;
  const DATA_CATS=new Set(['duurzaam','concept','wachtrij','serverkopie','voorkeur','legacy']);
  function bytes(s){return new TextEncoder().encode(s);}
  function b64(a){let s='';for(const n of a)s+=String.fromCharCode(n);return btoa(s);}
  function unb64(s){if(typeof s!=='string'||s.length>100000000)return null;const raw=atob(s);return Uint8Array.from(raw,c=>c.charCodeAt(0));}
  function clean(value,depth=0){
    if(depth>32)throw Error('nesting_too_deep');
    if(Array.isArray(value))return value.map(v=>clean(v,depth+1));
    if(value&&typeof value==='object'){
      const out={};for(const [k,v] of Object.entries(value)){if(!BAD_KEY.test(k))out[k]=clean(v,depth+1);}
      return out;
    }
    return value;
  }
  function checkOwner(uid){if(typeof uid!=='string'||uid.length<8)throw Error('owner_required');}
  function prepare({owner,cacheOwner,local={},queue=[],manifest=[]}={}){
    checkOwner(owner);
    if(!Array.isArray(manifest)||manifest.length<1||!Array.isArray(queue)||!local||typeof local!=='object')throw Error('snapshot_invalid');
    const entries=[],omissions=[], seen=new Set();
    const sourceFor=k=>{
      let found=null;for(const m of manifest)if(m.opslag==='localStorage'&&(m.sleutel===k||(m.prefix&&k.startsWith(m.prefix)&&k.length>m.prefix.length))&&(!found||(m.sleutel===k)||((m.prefix||'').length>(found.prefix||'').length)))found=m;
      return found;
    };
    for(const [key,raw] of Object.entries(local)){
      const m=sourceFor(key);
      if(!m||!DATA_CATS.has(m.categorie)||m.vorm==='geheim'||BAD_SOURCE.test(key)||BAD_SOURCE.test(m.id||'')){
        if(!m||m&&DATA_CATS.has(m.categorie))omissions.push({source:'unrecognized_local_storage',reason:'not_exported'});
        continue;
      }
      if(m.eigenaar==='cache'&&cacheOwner!==owner){omissions.push({source:m.id,reason:'other_or_unknown_owner'});continue;}
      if(m.eigenaar==='suffix'&&!key.endsWith('_'+owner)){omissions.push({source:m.id,reason:'other_owner'});continue;}
      if(m.eigenaar==='onbekend'||m.eigenaar==='item'){omissions.push({source:m.id,reason:'owner_unknown'});continue;}
      if(m.eigenaar==='geen'){omissions.push({source:m.id,reason:'no_personal_owner'});continue;}
      if(typeof raw!=='string'){omissions.push({source:m.id,reason:'unreadable'});continue;}
      let value=raw;
      try{value=JSON.stringify(clean(JSON.parse(raw)));}catch(e){if(e.message==='nesting_too_deep')throw e;}
      if(seen.has(key))throw Error('duplicate_source');seen.add(key);
      entries.push({storage:'localStorage',key,value,source:m.id});
    }
    for(const q of queue){
      if(!q||q.owner_uid!==owner){omissions.push({source:'offline_queue',reason:'other_or_unknown_owner'});continue;}
      if(!Number.isSafeInteger(q.id)||q.id<0||!q.item||typeof q.item!=='object'){omissions.push({source:'offline_queue',reason:'invalid_queue_item'});continue;}
      entries.push({storage:'offline_queue',key:String(q.id),value:clean(q.item),source:'offline_wachtrij'});
    }
    entries.sort((a,b)=>a.storage.localeCompare(b.storage)||a.key.localeCompare(b.key));
    return {format:'tk-local-rescue-data.v1',owner,created:new Date().toISOString(),entries,
      omissions,complete:false,restoreAllowed:false};
  }
  async function derive(subtle,pass,salt,usages){
    const key=await subtle.importKey('raw',bytes(pass),'PBKDF2',false,['deriveKey']);
    return subtle.deriveKey({name:'PBKDF2',salt,iterations:ITER,hash:'SHA-256'},key,{name:'AES-GCM',length:256},false,usages);
  }
  function passOk(p){if(typeof p!=='string'||p.length<12||p.length>256)throw Error('passphrase_min_12');}
  async function encrypt(data,pass,cryptoObj){
    passOk(pass);
    if(!data||data.format!=='tk-local-rescue-data.v1'||data.complete!==false||data.restoreAllowed!==false)throw Error('invalid_payload');
    const api=cryptoObj||globalThis.crypto;if(!api?.subtle||!api.getRandomValues)throw Error('secure_crypto_unavailable');
    const salt=api.getRandomValues(new Uint8Array(16)),iv=api.getRandomValues(new Uint8Array(12));
    const key=await derive(api.subtle,pass,salt,['encrypt']);
    const ciphertext=await api.subtle.encrypt({name:'AES-GCM',iv,additionalData:bytes(FORMAT)},key,bytes(JSON.stringify(data)));
    return {format:FORMAT,kdf:'PBKDF2-SHA256',iterations:ITER,cipher:'AES-256-GCM',salt:b64(salt),iv:b64(iv),data:b64(new Uint8Array(ciphertext))};
  }
  async function inspect(envelope,pass,cryptoObj){
    passOk(pass);
    if(!envelope||envelope.format!==FORMAT||envelope.kdf!=='PBKDF2-SHA256'||envelope.iterations!==ITER||envelope.cipher!=='AES-256-GCM')throw Error('invalid_envelope');
    const salt=unb64(envelope.salt),iv=unb64(envelope.iv),payload=unb64(envelope.data);
    if(!salt||salt.length!==16||!iv||iv.length!==12||!payload||payload.length<16)throw Error('invalid_ciphertext');
    const api=cryptoObj||globalThis.crypto;if(!api?.subtle)throw Error('secure_crypto_unavailable');
    const key=await derive(api.subtle,pass,salt,['decrypt']);
    let plain;try{plain=await api.subtle.decrypt({name:'AES-GCM',iv,additionalData:bytes(FORMAT)},key,payload);}catch(_){throw Error('wrong_password_or_corrupt_file');}
    let result;try{result=JSON.parse(new TextDecoder().decode(plain));}catch(_){throw Error('invalid_payload');}
    if(!result||result.format!=='tk-local-rescue-data.v1'||typeof result.owner!=='string'||!Array.isArray(result.entries)||!Array.isArray(result.omissions)||result.complete!==false||result.restoreAllowed!==false)throw Error('invalid_payload');
    const unique=new Set();
    for(const item of result.entries){
      if(!item||!['localStorage','offline_queue'].includes(item.storage)||typeof item.key!=='string'||!item.key||!item.source)throw Error('invalid_entry');
      if(item.storage==='localStorage'&&BAD_SOURCE.test(item.key))throw Error('credential_entry_refused');
      const id=item.storage+':'+item.key;if(unique.has(id))throw Error('duplicate_entry');unique.add(id);
    }
    return {owner:result.owner,entries:result.entries.length,excluded:result.omissions.length,
      complete:false,restoreAllowed:false,data:result}; // dry-run only, never writes.
  }
  return {FORMAT,prepare,encrypt,inspect};
}));