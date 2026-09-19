const assert=require('assert'),C=require('./design-engine-core.js');
(async()=>{
 const registry={projects:[{id:'alpha',name:'Alpha',status:'ACTIVE',design_pack_manifest:'packs/alpha.json'},{id:'beta',status:'INACTIVE',design_pack_manifest:'packs/beta.json'}]};
 const files={'packs/alpha.json':{id:'PACK-ALPHA',name:'Alpha Pack',product_identity:'alpha-product',version:'1',assets:{components:'packs/components.json',screens:'packs/screens.json'}},'packs/components.json':{components:[{id:'A'}]},'packs/screens.json':{screens:[{id:'HOME'}]}};
 const runtime=C.createDesignPackRuntime(registry,async p=>{if(!(p in files))throw Error('not found '+p);return files[p]});
 const active=await runtime.activate('alpha');assert.equal(active.ready,true);assert.equal(active.pack.id,'PACK-ALPHA');assert.equal(active.pack.product_identity,'alpha-product');assert.equal(active.pack.components.components[0].id,'A');assert.equal(active.pack.screens.screens[0].id,'HOME');
 const inactive=await runtime.activate('beta');assert.equal(inactive.ready,false);assert.equal(inactive.reason,'PROJECT_NOT_ACTIVE');
 assert.throws(()=>C.normalizePack({id:'bad',product_identity:'engine',assets:{}},{}),/cannot replace engine identity/);
 assert.throws(()=>C.normalizePack({id:'bad',assets:{components:'missing.json'}},{}),/Missing Design Pack asset/);
 console.log('V1 DESIGN PACK RUNTIME PASS');
})().catch(e=>{console.error(e);process.exit(1)});
