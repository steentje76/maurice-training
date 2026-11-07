/* TK504 private media UX — short-lived, owner-scoped ticket reuse only.
 * No file bytes, offline cache, localStorage, IndexedDB, service-worker cache
 * or persistent signed URLs. The broker always decides entitlement.
 */
(function(root,factory){
  const api=factory();
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  if(root)root.TK504EphemeralMediaSession=api;
})(typeof globalThis!=='undefined'?globalThis:null,function(){
  'use strict';
  const CID=/^TK-\d{6}$/;
  function err(code){const e=new Error(code);e.code=code;return e;}
  function create({ownerProvider,now=Date.now,maxEntries=60}={}){
    if(typeof ownerProvider!=='function'||typeof now!=='function'||
       !Number.isInteger(maxEntries)||maxEntries<2||maxEntries>100)
      throw err('CACHE_NOT_CONFIGURED');
    let generation=0,owner=ownerProvider();
    const tickets=new Map();
    function invalidate(){generation++;tickets.clear();}
    function currentOwner(){
      const next=ownerProvider();
      if(owner!==next){owner=next;invalidate();}
      return next;
    }
    function put(key,entry){
      tickets.delete(key);
      tickets.set(key,entry);
      while(tickets.size>maxEntries)tickets.delete(tickets.keys().next().value);
    }
    async function signed(catalogId,type,signer,force=false){
      if(!CID.test(catalogId)||(type!=='video'&&type!=='poster')||
         typeof signer!=='function')throw err('INVALID_REQUEST');
      const uid=currentOwner();
      if(!uid)throw err('AUTH_REQUIRED');
      const key=uid+'|'+catalogId+'|'+type;
      const cached=tickets.get(key);
      if(!force&&cached){
        if(cached.ticket&&Number.isFinite(cached.ticket.expiresAt)&&
           cached.ticket.expiresAt>now()+5000)return cached.ticket;
        if(cached.promise)return cached.promise;
      }
      tickets.delete(key);
      const g=generation;
      const entry={ticket:null,promise:null};
      const job=Promise.resolve().then(signer).then(ticket=>{
        if(g!==generation||currentOwner()!==uid)throw err('STALE_ACCOUNT');
        if(!ticket||ticket.catalogId!==catalogId||ticket.type!==type||
           typeof ticket.url!=='string'||!ticket.url.startsWith('https://')||
           !Number.isFinite(ticket.expiresAt))
          throw err('INVALID_SIGNED_TICKET');
        if(tickets.get(key)===entry&&ticket.expiresAt>now()+5000){
          entry.ticket=ticket;entry.promise=null;
        }else if(tickets.get(key)===entry)tickets.delete(key);
        return ticket;
      },cause=>{
        if(tickets.get(key)===entry)tickets.delete(key);
        throw cause;
      });
      entry.promise=job;
      put(key,entry);
      return job;
    }
    return Object.freeze({signed,invalidate,currentOwner,rawMediaBytesCached:false,
      offlineDownloadReleased:false});
  }
  function queue({maxActive=4}={}){
    if(!Number.isInteger(maxActive)||maxActive<1||maxActive>8)
      throw err('INVALID_CONCURRENCY');
    let active=0,items=[];
    function pump(){
      while(active<maxActive&&items.length){
        const job=items.shift();
        if(!job.valid()){job.reject(err('STALE_VIEW'));continue;}
        active++;
        Promise.resolve().then(job.run).then(job.resolve,job.reject).finally(()=>{
          active--;pump();
        });
      }
    }
    function schedule(run,valid=()=>true){
      if(typeof run!=='function'||typeof valid!=='function')
        return Promise.reject(err('INVALID_JOB'));
      return new Promise((resolve,reject)=>{
        items.push({run,valid,resolve,reject});
        pump();
      });
    }
    return Object.freeze({schedule});
  }
  return Object.freeze({create,queue});
});
