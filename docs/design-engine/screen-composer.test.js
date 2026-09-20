const assert=require('assert'),S=require('./screen-composer.js');
const pack={id:'PACK-ALPHA',components:{components:[{id:'HEADER',type:'header'},{id:'CARD',type:'card'}]},screens:{screens:[{id:'HOME',title:'Home',instances:[{id:'h',component:'HEADER'},{id:'c',component:'CARD',state:'selected',label:'Open'}]}]}};
const c=S.createScreenComposer(pack);assert.deepEqual(c.screenIds(),['HOME']);const out=c.compose('HOME',{viewport:430});assert.equal(out.pack_id,'PACK-ALPHA');assert.equal(out.viewport,430);assert.equal(out.instances[1].component_id,'CARD');assert.equal(out.instances[1].state,'selected');assert.equal(out.instances[1].props.label,'Open');assert.equal(c.validate('HOME').valid,true);
const broken=S.createScreenComposer({id:'B',components:{components:[]},screens:{screens:[{id:'X',instances:[{id:'x',component:'MISSING'}]}]}});assert.equal(broken.validate('X').valid,false);assert.throws(()=>broken.compose('X'),/Unknown component/);
assert.throws(()=>S.createScreenComposer({components:[{id:'A'},{id:'A'}],screens:[]}),/Duplicate component/);
console.log('V1 GENERIC SCREEN COMPOSER PASS');
