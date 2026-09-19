(function(root){
function createVisualStudio(initial={}){
 let state={reference:null,order:[...(initial.order||[])],styles:{...(initial.styles||{})}};
 function snapshot(){return JSON.parse(JSON.stringify(state))}
 function loadReference({name,type,dataUrl}){if(!dataUrl||!/^data:image\//.test(dataUrl))throw Error('IMAGE_REFERENCE_REQUIRED');state.reference={name:name||'reference',type:type||'image',dataUrl};return snapshot()}
 function clearReference(){state.reference=null;return snapshot()}
 function setOrder(ids){if(!Array.isArray(ids)||new Set(ids).size!==ids.length)throw Error('UNIQUE_ORDER_REQUIRED');state.order=[...ids];return snapshot()}
 function move(id,toIndex){const from=state.order.indexOf(id);if(from<0)throw Error('UNKNOWN_INSTANCE '+id);const next=[...state.order];next.splice(from,1);next.splice(Math.max(0,Math.min(toIndex,next.length)),0,id);state.order=next;return snapshot()}
 function patchStyle(scope,patch){if(!scope)throw Error('STYLE_SCOPE_REQUIRED');state.styles[scope]={...(state.styles[scope]||{}),...(patch||{})};return snapshot()}
 function applyToComposition(composition){const rank=new Map(state.order.map((id,i)=>[id,i]));const instances=[...(composition.instances||[])].sort((a,b)=>(rank.has(a.id)?rank.get(a.id):1e9)-(rank.has(b.id)?rank.get(b.id):1e9)).map(x=>({...x,visual_style:{...(state.styles.global||{}),...(state.styles[x.id]||{})}}));return {...composition,instances,visual_reference:state.reference?{name:state.reference.name,type:state.reference.type}:null,visual_tokens:{...(state.styles.global||{})}}}
 return {snapshot,loadReference,clearReference,setOrder,move,patchStyle,applyToComposition}
}
const api={createVisualStudio};if(typeof module!=='undefined')module.exports=api;root.DesignVisualStudio=api;
})(typeof window!=='undefined'?window:globalThis);
