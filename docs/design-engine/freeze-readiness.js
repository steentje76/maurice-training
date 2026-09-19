(function(root){
function validateFreezeReadiness({proposal,flow,scenario,sources,sourceSnapshot}={}){
 const issues=[],hard=(code,detail)=>issues.push({code,severity:'HARD',detail});
 const src=Array.isArray(sources)?sources:(sources&&sources.sources)||[];
 if(!sourceSnapshot||!sourceSnapshot.baseline_sha)hard('SOURCE_PIN_MISSING');
 if(!src.length||src.some(x=>!x.sha))hard('SOURCE_SHA_MISSING');
 const required=(scenario&&scenario.required_states)||[],designed=new Set((scenario&&scenario.designed_states)||[]);
 const missingStates=required.filter(x=>!designed.has(x));if(missingStates.length)hard('REQUIRED_STATES_MISSING',missingStates);
 const a=(scenario&&scenario.accessibility)||{};if(!a.semantic_controls||!a.icon_labels||!a.keyboard||!a.no_color_only)hard('ACCESSIBILITY_CONTRACT_INCOMPLETE');
 const removed=(scenario&&scenario.removed_capabilities)||[];if(removed.length)hard('CAPABILITY_PRESERVATION_FAILED',removed);
 const coverage=new Set((scenario&&scenario.capability_coverage)||[]),requiredCaps=[...new Set(((flow&&flow.nodes)||[]).flatMap(n=>n.capabilities||[]))],missingCaps=requiredCaps.filter(x=>!coverage.has(x));if(missingCaps.length)hard('CAPABILITY_COVERAGE_MISSING',missingCaps);
 if(!flow||!flow.start||!flow.goal||!Array.isArray(flow.invariants)||!flow.invariants.length)hard('ROUTE_FLOW_INVARIANTS_MISSING');
 if(!proposal||!proposal.selected_variant)hard('SELECTED_VARIANT_REQUIRED');
 return {valid:issues.length===0,issues,checks:{source_pin:!issues.some(x=>x.code.startsWith('SOURCE_')),required_states:!issues.some(x=>x.code==='REQUIRED_STATES_MISSING'),accessibility:!issues.some(x=>x.code==='ACCESSIBILITY_CONTRACT_INCOMPLETE'),capability_preservation:!issues.some(x=>x.code.startsWith('CAPABILITY_')),route_flow:!issues.some(x=>x.code==='ROUTE_FLOW_INVARIANTS_MISSING'),selected_variant:!issues.some(x=>x.code==='SELECTED_VARIANT_REQUIRED')}}
}
const api={validateFreezeReadiness};if(typeof module!=='undefined')module.exports=api;root.DesignFreezeReadiness=api;
})(typeof window!=='undefined'?window:globalThis);
