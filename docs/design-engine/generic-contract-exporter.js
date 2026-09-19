(function(root){
function createGenericContractExporter({engineName='Design Engine',idPrefix='DESIGN'}={}){
 function clone(x){return JSON.parse(JSON.stringify(x))}
 function stable(x){if(Array.isArray(x))return x.map(stable);if(x&&typeof x==='object')return Object.fromEntries(Object.keys(x).sort().map(k=>[k,stable(x[k])]));return x}
 function canonical(x){return JSON.stringify(stable(x))}
 function fnv1a(s){let h=2166136261;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619)}return ('00000000'+(h>>>0).toString(16)).slice(-8)}
 function createFreeze({flow,scenario,validation,sourceSnapshot,selectedBy,approvedAt,proposal,productIdentity='generic-product'}){
  if(!validation||!validation.freeze_ready)throw Error('DESIGN_FREEZE_BLOCKED');if(!selectedBy)throw Error('PO_SELECTION_REQUIRED');if(!approvedAt)throw Error('APPROVAL_TIMESTAMP_REQUIRED');
  const payload={schema_version:'1.0',engine:engineName,product_identity:productIdentity,status:'DESIGN_FROZEN',flow_id:flow.id,scenario_id:scenario.id,selected_by:selectedBy,approved_at:approvedAt,baseline_main_sha:sourceSnapshot.verified_against_main,source_snapshot:clone(sourceSnapshot.sources||{}),route_invariants:clone(flow.invariants||[]),capability_coverage:clone(scenario.capability_coverage||[]),required_states:clone(scenario.required_states||[]),designed_states:clone(scenario.designed_states||[]),accessibility:clone(scenario.accessibility||{}),proposal:proposal?clone(proposal):null,validation:clone(validation)};
  payload.freeze_id=idPrefix+'-FREEZE-'+fnv1a(canonical(payload));payload.integrity=fnv1a(canonical(payload));return payload
 }
 function createContract({freeze,flow,scenario,repository,branchName}){
  const contract={schema_version:'1.0',engine:engineName,product_identity:freeze.product_identity,status:'BUILDABLE_FROM_FROZEN_DESIGN',freeze_id:freeze.freeze_id,repository,baseline_main_sha:freeze.baseline_main_sha,target_branch:branchName||('feature/implement-'+flow.id.toLowerCase()+'-'+scenario.id.toLowerCase()),scope:{flow_id:flow.id,scenario_id:scenario.id,goal:flow.goal,nodes:clone(flow.nodes||[]),edges:clone(flow.edges||[])},must_preserve:clone(freeze.capability_coverage),route_invariants:clone(freeze.route_invariants),states:{required:clone(freeze.required_states),designed:clone(freeze.designed_states)},accessibility:clone(freeze.accessibility),proposal:clone(freeze.proposal),source_snapshot:clone(freeze.source_snapshot)};
  contract.contract_id=idPrefix+'-CONTRACT-'+fnv1a(canonical(contract));contract.integrity=fnv1a(canonical(contract));return contract
 }
 function implementationPrompt(contract){return `${engineName.toUpperCase()} — IMPLEMENT FROZEN UX CONTRACT\n\nCONTRACT: ${contract.contract_id}\nFREEZE: ${contract.freeze_id}\nPRODUCT: ${contract.product_identity}\nBASELINE MAIN: ${contract.baseline_main_sha}\n\nHARD GATE\nVerify baseline, source snapshot and contract integrity before implementation. Preserve all declared capabilities, states, route invariants and accessibility requirements. Do not invent product rules or data.`}
 function exportBundle(args){const freeze=createFreeze(args),contract=createContract({freeze,flow:args.flow,scenario:args.scenario,repository:args.repository,branchName:args.branchName});return {freeze,contract,claude_prompt:implementationPrompt(contract)}}
 return {canonical,fnv1a,createFreeze,createContract,implementationPrompt,exportBundle}
}
const api={createGenericContractExporter};if(typeof module!=='undefined')module.exports=api;root.DesignContractExporter=api;
})(typeof window!=='undefined'?window:globalThis);
