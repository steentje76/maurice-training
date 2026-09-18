'use strict';
const fs=require('fs'), path=require('path');
const root=path.resolve(__dirname,'..');
const read=p=>JSON.parse(fs.readFileSync(path.join(root,p),'utf8'));
let errors=[], warnings=[];
const reg=read('docs/ux/registry/UX_SCREEN_REGISTRY.json');
if(reg.schema_version!=='1.0') errors.push('UXE-001 schema_version must be 1.0');
const ids=new Set();
for(const s of reg.screens||[]){
 if(!/^TK-UX-[A-Z]+-\d{3}[A-Z]?$/.test(s.id||'')) errors.push('UXE-002 invalid id '+s.id);
 if(ids.has(s.id)) errors.push('UXE-003 duplicate id '+s.id); ids.add(s.id);
 for(const k of ['name','domain','status','change_mode','route','interactions','states','components','acceptance']) if(s[k]===undefined) errors.push('UXE-004 '+s.id+' missing '+k);
 if(!s.route||!s.route.screen_id) errors.push('UXE-005 '+s.id+' missing route.screen_id');
 if(!Array.isArray(s.states)||!s.states.includes('normal')) errors.push('UXE-006 '+s.id+' must define normal state');
 if(!Array.isArray(s.acceptance)||!s.acceptance.length) errors.push('UXE-007 '+s.id+' missing acceptance');
 if(['UX_SPEC_READY','IMPLEMENTED_UNPROVEN','UX_PROVEN'].includes(s.status)){
   if(!s.interactions.length) errors.push('UXE-008 '+s.id+' ready/proven without interactions');
   if(!s.components.length) errors.push('UXE-009 '+s.id+' ready/proven without components');
 }
 for(const a of s.interactions||[]){
   if(!a.element_id||!a.trigger||!a.effect) errors.push('UXE-010 '+s.id+' incomplete interaction');
   if(/navigate|open screen|go to/i.test(a.effect||'') && !a.destination) errors.push('UXE-011 '+s.id+' navigation interaction lacks destination: '+a.element_id);
 }
 if(s.mockup_id && !/^TK-MU-[A-Z]+-\d{3}[A-Z]?$/.test(s.mockup_id)) errors.push('UXE-012 '+s.id+' invalid mockup id');
}
for(const p of ['docs/ux/engine/UX_ENGINE_CONTRACT.md','docs/ux/engine/UX_ACCEPTANCE_CONTRACT.md','docs/ux/registry/UX_COMPONENT_REGISTRY.json','docs/ux/registry/UX_FLOW_REGISTRY.json','docs/ux/registry/UX_PATTERN_REGISTRY.json']) if(!fs.existsSync(path.join(root,p))) errors.push('UXE-013 missing '+p);
if(warnings.length) console.warn(warnings.join('\n'));
if(errors.length){console.error(errors.join('\n'));process.exit(1)}
console.log('UX Design Engine registry validation: PASS ('+(reg.screens||[]).length+' screen records)');
