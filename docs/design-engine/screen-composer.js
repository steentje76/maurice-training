(function(root){
function indexById(items,label){const out={};for(const x of items||[]){if(!x||!x.id)throw Error(label+' item id required');if(out[x.id])throw Error('Duplicate '+label+' '+x.id);out[x.id]=x}return out}
function createScreenComposer(pack){
 if(!pack)throw Error('Design Pack required');
 const components=indexById((pack.components&&pack.components.components)||pack.components||[],'component');
 const screens=indexById((pack.screens&&pack.screens.screens)||pack.screens||[],'screen');
 function compose(screenId,options={}){
  const screen=screens[screenId];if(!screen)throw Error('Unknown screen '+screenId);
  const viewport=options.viewport||390,instances=(screen.instances||[]).map(instance=>{
   const component=components[instance.component];if(!component)throw Error('Unknown component '+instance.component+' in '+screenId);
   return {id:instance.id,component_id:component.id,type:component.type||null,props:{...component,...instance},state:instance.state||'default'}
  });
  return {pack_id:pack.id||pack.product_identity||'unknown',screen_id:screen.id,title:screen.title||screen.id,viewport,instances};
 }
 function validate(screenId){try{const composition=compose(screenId);return {valid:true,screen_id:screenId,instance_count:composition.instances.length}}catch(error){return {valid:false,screen_id:screenId,error:error.message}}}
 return {screenIds:()=>Object.keys(screens),compose,validate}
}
const api={createScreenComposer};if(typeof module!=='undefined')module.exports=api;root.DesignScreenComposer=api;
})(typeof window!=='undefined'?window:globalThis);
