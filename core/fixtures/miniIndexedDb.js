/* Minimale, asynchrone IndexedDB-nabootsing voor node-tests (19-10-2026). Dekt precies wat de app gebruikt:
 * open (onupgradeneeded/onsuccess/onerror/onblocked), objectStoreNames.contains, createObjectStore(keyPath,
 * autoIncrement), transaction(store, mode) met oncomplete/onerror/onabort, store.get/put/add/delete/getAll/openCursor
 * (cursor.value/update/continue). Gedrag zoals de echte API: verzoeken lossen asynchroon op, de transactie voltooit
 * nadat alle verzoeken klaar zijn. Foutinjectie: fouten.open (open faalt), fouten.abortBijSchrijven (transactie
 * breekt af bij commit), fouten.blocked, fouten.gooitBijPut (put gooit synchroon, zoals QuotaExceededError); tx.abort(). De echte browser-API wordt apart getest in Chromium. */
'use strict';
function maakIndexedDb(fouten){
  fouten=fouten||{};
  const dbs={}; // naam -> {versie, stores:{naam:{keyPath,autoInc,seq,rijen:Map}}}
  const kloon=v=>v===undefined?undefined:JSON.parse(JSON.stringify(v));
  const later=fn=>setTimeout(fn,0);
  function Tx(db,namen,mode){
    const tx={oncomplete:null,onerror:null,onabort:null,_open:0,_klaar:false,_geschreven:false,error:null};
    // Transacties op dezelfde database lopen na elkaar (zoals readwrite-transacties op één store in de echte API).
    const start=db._laatste||Promise.resolve(); let klaarMelden; db._laatste=new Promise(r=>{klaarMelden=r;});
    // tx.abort(): wijzigingen terugdraaien en onabort melden (zoals de echte API), ook als er nog verzoeken openstaan.
    tx.abort=function(){ if(tx._klaar)throw new Error('InvalidStateError'); tx._klaar=true; tx._afgebroken=true; tx.error=new Error('AbortError');
      later(()=>{ for(const n of namen)db.stores[n].rijen=tx._backup[n]; tx.onabort&&tx.onabort(); klaarMelden(); }); };
    const afronden=()=>{ if(tx._klaar||tx._open>0)return; tx._klaar=true;
      later(()=>{ if(tx._geschreven&&fouten.abortBijSchrijven){ tx.error=new Error('AbortError'); for(const n of namen)db.stores[n].rijen=tx._backup[n]; tx.onabort&&tx.onabort(); } else tx.oncomplete&&tx.oncomplete(); klaarMelden(); }); };
    start.then(()=>{ tx._backup={}; for(const n of namen)tx._backup[n]=new Map([...db.stores[n].rijen].map(([k,v])=>[k,kloon(v)])); });
    const req=(werk)=>{ const r={onsuccess:null,onerror:null,result:undefined,error:null}; tx._open++;
      start.then(()=>later(()=>{ if(tx._afgebroken){ tx._open--; return; } try{ r.result=werk(); r.onsuccess&&r.onsuccess({target:r}); }catch(e){ r.error=e; r.onerror&&r.onerror({target:r}); tx.error=e; tx.onerror&&tx.onerror(); }
        tx._open--; later(afronden); })); return r; };
    tx.objectStore=function(n){
      const s=db.stores[n]; if(!s)throw new Error('NotFoundError: '+n);
      const sleutel=v=>{ if(s.keyPath)return v[s.keyPath]; };
      const schrijf=()=>{ if(mode!=='readwrite')throw new Error('ReadOnlyError'); tx._geschreven=true; };
      return {
        get:k=>req(()=>kloon(s.rijen.get(k))),
        getAll:()=>req(()=>[...s.rijen.keys()].sort().map(k=>kloon(s.rijen.get(k)))),
        put:v=>{ if(fouten.gooitBijPut)throw new Error('QuotaExceededError'); return req(()=>{ schrijf(); let k=sleutel(v); if(k===undefined&&s.autoInc){k=++s.seq;v=Object.assign({},v,{[s.keyPath]:k});} s.rijen.set(k,kloon(v)); return k; }); },
        add:v=>req(()=>{ schrijf(); let k=sleutel(v); if(k===undefined&&s.autoInc){k=++s.seq;v=Object.assign({},v,{[s.keyPath]:k});} if(s.rijen.has(k))throw new Error('ConstraintError'); s.rijen.set(k,kloon(v)); return k; }),
        delete:k=>req(()=>{ schrijf(); s.rijen.delete(k); }),
        openCursor:()=>{ let keys=null; let i=0; const r={onsuccess:null,onerror:null,result:null}; tx._open++;
          const stap=()=>later(()=>{ if(keys===null)keys=[...s.rijen.keys()].sort(); if(i>=keys.length){ r.result=null; r.onsuccess&&r.onsuccess({target:r}); tx._open--; later(afronden); return; }
            const k=keys[i]; r.result={value:kloon(s.rijen.get(k)),update:v=>{ schrijf(); s.rijen.set(k,kloon(v)); return {}; },continue:()=>{ i++; stap(); }};
            r.onsuccess&&r.onsuccess({target:r}); });
          start.then(stap); return r; }
      };
    };
    start.then(()=>later(afronden));
    return tx;
  }
  return {
    _dbs:dbs,
    open(naam,versie){
      const r={onsuccess:null,onerror:null,onupgradeneeded:null,onblocked:null,result:null,error:null};
      later(()=>{
        if(fouten.open){ r.error=new Error('open_mislukt'); r.onerror&&r.onerror(); return; }
        if(fouten.blocked){ r.onblocked&&r.onblocked(); return; }
        let db=dbs[naam]; const nieuw=!db; if(!db)db=dbs[naam]={versie:0,stores:{}};
        const api={ objectStoreNames:{contains:n=>!!db.stores[n]},
          createObjectStore:(n,o)=>{ db.stores[n]={keyPath:o&&o.keyPath,autoInc:!!(o&&o.autoIncrement),seq:0,rijen:new Map()}; },
          transaction:(n,mode)=>Tx(db,Array.isArray(n)?n:[n],mode), close(){} };
        r.result=api;
        if(nieuw||versie>db.versie){ db.versie=versie||1; r.onupgradeneeded&&r.onupgradeneeded(); }
        r.onsuccess&&r.onsuccess();
      });
      return r;
    }
  };
}
module.exports={maakIndexedDb};
