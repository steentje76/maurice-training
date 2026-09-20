(function(root){
function createCompositionValidator({rules=[]}={}){
 const ruleIndex=Object.fromEntries((rules.rules||rules||[]).map(r=>[r.id,r]));
 function issue(code,severity,extra={}){return {code,severity,...extra}}
 function validate(composition){
  if(!composition||!Array.isArray(composition.instances))throw Error('Composition required');
  const issues=[],evidence=[];
  const ids=new Set();
  for(const instance of composition.instances){
   if(ids.has(instance.id))issues.push(issue('DUPLICATE_INSTANCE_ID','HARD',{instance_id:instance.id}));
   ids.add(instance.id);
   const p=instance.props||{};
   if(p.interactive===true&&!p.accessible_label&&!p.label)issues.push(issue('A11Y_LABEL_MISSING','HARD',{instance_id:instance.id,rule_id:'UX-A11Y-001'}));
   if(p.primary_cta===true)evidence.push({instance_id:instance.id,rule_id:'UX-CTA-001',kind:'component'});
   if(p.data_binding){
    const b=p.data_binding;
    if(b.ui_calculates===true)issues.push(issue('UI_RECALCULATES','HARD',{instance_id:instance.id,rule_id:'DATA-CALC-001'}));
    if(!b.source)issues.push(issue('DATA_SOURCE_MISSING','HARD',{instance_id:instance.id,rule_id:'SCREEN-PREBUILD-001'}));
    evidence.push({instance_id:instance.id,rule_id:b.rule_id||null,source:b.source||null,kind:'data'});
   }
   for(const id of p.rule_ids||[])evidence.push({instance_id:instance.id,rule_id:id,rule:ruleIndex[id]||null,kind:'rule'});
  }
  const primary=composition.instances.filter(x=>(x.props||{}).primary_cta===true);
  if(primary.length>1)issues.push(issue('MULTIPLE_PRIMARY_CTA','HARD',{count:primary.length,rule_id:'UX-CTA-001'}));
  const hard=issues.filter(x=>x.severity==='HARD');
  return {composition_id:composition.screen_id,pack_id:composition.pack_id,valid:hard.length===0,hard_issue_count:hard.length,issues,evidence};
 }
 return {validate}
}
const api={createCompositionValidator};if(typeof module!=='undefined')module.exports=api;root.DesignCompositionValidation=api;
})(typeof window!=='undefined'?window:globalThis);
