(function(root){
function requireField(v,name){if(!v)throw Error('Design pack '+name+' required');return v}
function resolveProject(registry,projectId){const projects=registry&&registry.projects||[];const p=projects.find(x=>x.id===projectId);if(!p)throw Error('Unknown design project '+projectId);return p}
function resolvePack(registry,projectId){const p=resolveProject(registry,projectId);if(!p.design_pack)return {project:p,available:false,reason:'DESIGN_PACK_NOT_CONFIGURED'};return {project:p,available:true,packId:requireField(p.design_pack,'id'),componentRegistry:p.component_registry||null,screenCompositions:p.screen_compositions||null}}
function assertCoreNeutral(registry){if(!registry||!registry.engine||registry.engine.product_specific!==false)throw Error('Design Engine core must be product-neutral');return true}
const api={resolveProject,resolvePack,assertCoreNeutral};if(typeof module!=='undefined')module.exports=api;root.DesignPack=api;
})(typeof window!=='undefined'?window:globalThis);
