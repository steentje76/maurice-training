/* Trainingskompas offline guides: durable IndexedDB adapter.
 * Stores exercise instructions, NEVER MoveKit video/poster bytes or signed URLs.
 * IndexedDB is origin-scoped and provides no DRM; raw licensed media is
 * deliberately excluded until separate agreement + secure native media gate.
 */
(function(root,factory){
  var api=factory();
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  if(root)root.OfflineMoveKitIndexedDB=api;
})(typeof globalThis!=='undefined'?globalThis:null,function(){
  'use strict';
  function create(options){
    options=options||{};
    var idb=options.indexedDB||(typeof indexedDB!=='undefined'?indexedDB:null);
    var kr=options.IDBKeyRange||(typeof IDBKeyRange!=='undefined'?IDBKeyRange:null);
    var name=options.dbName||'tk-offline-guides-v1';
    if(!idb||!kr)throw new Error('INDEXEDDB_UNAVAILABLE');
    if(!/^tk-offline-guides-[a-z0-9_-]{1,40}$/.test(name))throw new Error('INVALID_DATABASE_NAME');
    var opening=null;
    function open(){
      if(opening)return opening;
      opening=new Promise(function(resolve,reject){
        var req=idb.open(name,1);
        req.onupgradeneeded=function(){
          var db=req.result;
          if(!db.objectStoreNames.contains('packs'))db.createObjectStore('packs',{keyPath:'key'});
        };
        req.onsuccess=function(){resolve(req.result);};
        req.onerror=function(){opening=null;reject(req.error||new Error('INDEXEDDB_OPEN_FAILED'));};
        req.onblocked=function(){opening=null;reject(new Error('INDEXEDDB_BLOCKED'));};
      });
      return opening;
    }
    function run(mode,action){
      return open().then(function(db){
        return new Promise(function(resolve,reject){
          var settled=false,result;
          var tx;
          try{
            tx=db.transaction('packs',mode);
            var store=tx.objectStore('packs');
            action(store,function(v){result=v;},function(e){if(!settled){settled=true;reject(e);}});
          }catch(e){reject(e);return;}
          tx.oncomplete=function(){if(!settled){settled=true;resolve(result);}};
          tx.onerror=tx.onabort=function(){if(!settled){settled=true;reject(tx.error||new Error('INDEXEDDB_TRANSACTION_FAILED'));}};
        });
      });
    }
    return {
      put:function(entry){return run('readwrite',function(s){s.put(entry);});},
      get:function(key){
        return run('readonly',function(s,set,fail){
          var request=s.get(key);
          request.onsuccess=function(){set(request.result||null);};
          request.onerror=function(){fail(request.error||new Error('INDEXEDDB_READ_FAILED'));};
        });
      },
      list:function(prefix){
        return run('readonly',function(s,set,fail){
          var rows=[];
          var req=s.openCursor(kr.bound(prefix,prefix+'\uffff'));
          req.onsuccess=function(){
            var cursor=req.result;
            if(cursor){rows.push(cursor.value);cursor.continue();}
            else set(rows);
          };
          req.onerror=function(){fail(req.error||new Error('INDEXEDDB_CURSOR_FAILED'));};
        });
      },
      delete:function(key){return run('readwrite',function(s){s.delete(key);});},
      close:function(){
        if(!opening)return Promise.resolve();
        return opening.then(function(db){db.close();opening=null;});
      }
    };
  }
  return Object.freeze({create:create});
});