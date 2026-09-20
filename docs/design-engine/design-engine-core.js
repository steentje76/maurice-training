(function(root){
function required(value,message){if(value===undefined||value===null||value==='')throw Error(message);return value}
function normalizePack(manifest,assets){
 required(manifest,'Design Pack manifest required');
 required(manifest.id,'Design Pack id required');
 if(manifest.product_identity==='engine')throw Error('Product identity cannot replace engine identity');
 const pack={id:manifest.id,name:manifest.name||manifest.id,version:manifest.version||'1',product_identity:manifest.product_identity||manifest.id,manifest};
 const map=manifest.assets||{};
 for(const [key,path] of Object.entries(map)){if(!(path in assets))throw Error('Missing Design Pack asset '+path);pack[key]=assets[path]}
 return pack
}
function createDesignPackRuntime(registry,loadJson){
 if(!registry||!Array.isArray(registry.projects))throw Error('Project registry required');
 async function activate(id){
  const project=registry.projects.find(p=>p.id===id);
  if(!project)throw Error('Unknown project '+id);
  if(project.status!=='ACTIVE')return {project,ready:false,reason:'PROJECT_NOT_ACTIVE'};
  const manifestPath=project.design_pack_manifest;
  if(manifestPath){
   const manifest=await loadJson(manifestPath),assets={};
   for(const path of Object.values(manifest.assets||{}))assets[path]=await loadJson(path);
   return {project,pack:normalizePack(manifest,assets),ready:true}
  }
  const pack={id:project.id,name:project.name||project.id,product_identity:project.id,project};
  if(project.component_registry)pack.components=await loadJson(project.component_registry);
  if(project.screen_compositions)pack.screens=await loadJson(project.screen_compositions);
  return {project,pack,ready:true,legacy_manifest:true}
 }
 return {projectIds:()=>registry.projects.map(p=>p.id),getProject:id=>registry.projects.find(p=>p.id===id),activate}
}
const api={createProjectRuntime:createDesignPackRuntime,createDesignPackRuntime,normalizePack};if(typeof module!=='undefined')module.exports=api;root.DesignEngineCore=api;
})(typeof window!=='undefined'?window:globalThis);
