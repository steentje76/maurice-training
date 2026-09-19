(function(root){
function createVisualStudio(initial={}){
 const seed=()=>({order:[...(initial.order||[])],styles:{...(initial.styles||{})}});
 let state={reference:null,activeVariant:'A',variants:{A:seed(),B:seed(),C:seed()}};
 function active(){return state.variants[state.activeVariant]}
 function snapshot(){const a=active();return JSON.parse(JSON.stringify({...state,order:a.order,styles:a.styles}))}
 function loadReference({name,type,dataUrl}){if(!dataUrl||!/^data:image\//.test(dataUrl))throw Error('IMAGE_REFERENCE_REQUIRED');state.reference={name:name||'reference',type:type||'image',dataUrl};return snapshot()}
 function clearReference(){state.reference=null;return snapshot()}
 function setOrder(ids){if(!Array.isArray(ids)||new Set(ids).size!==ids.length)throw Error('UNIQUE_ORDER_REQUIRED');active().order=[...ids];return snapshot()}
 function move(id,toIndex){const a=active(),from=a.order.indexOf(id);if(from<0)throw Error('UNKNOWN_INSTANCE '+id);const next=[...a.order];next.splice(from,1);next.splice(Math.max(0,Math.min(toIndex,next.length)),0,id);a.order=next;return snapshot()}
 function patchStyle(scope,patch){if(!scope)throw Error('STYLE_SCOPE_REQUIRED');const a=active();a.styles[scope]={...(a.styles[scope]||{}),...(patch||{})};return snapshot()}
 function selectVariant(id){if(!['A','B','C'].includes(id))throw Error('UNKNOWN_VARIANT '+id);state.activeVariant=id;return snapshot()}
 function cloneVariant(from,to){if(!state.variants[from]||!state.variants[to])throw Error('UNKNOWN_VARIANT');state.variants[to]=JSON.parse(JSON.stringify(state.variants[from]));return snapshot()}
 function applyToComposition(composition){const a=active(),rank=new Map(a.order.map((id,i)=>[id,i]));const instances=[...(composition.instances||[])].sort((x,y)=>(rank.has(x.id)?rank.get(x.id):1e9)-(rank.has(y.id)?rank.get(y.id):1e9)).map(x=>({...x,visual_style:{...(a.styles.global||{}),...(a.styles[x.id]||{})}}));return {...composition,instances,visual_variant:state.activeVariant,visual_reference:state.reference?{name:state.reference.name,type:state.reference.type}:null,visual_tokens:{...(a.styles.global||{})}}}
 return {snapshot,loadReference,clearReference,setOrder,move,patchStyle,selectVariant,cloneVariant,applyToComposition}
}
const api={createVisualStudio};if(typeof module!=='undefined')module.exports=api;root.DesignVisualStudio=api;
})(typeof window!=='undefined'?window:globalThis);
