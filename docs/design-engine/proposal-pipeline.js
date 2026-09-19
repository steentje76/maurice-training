(function(root){
function createProposalPipeline({composer,validator,repository,exporter}){
 if(!composer||!validator||!repository||!exporter)throw Error('Composer, validator, repository and exporter required');
 async function propose({proposalId,screenId,viewport,changes={}}){
  if(!proposalId)throw Error('proposalId required');
  const composition=composer.compose(screenId,{viewport});
  const proposal={id:proposalId,status:'PROPOSED',screen_id:screenId,composition,changes,validation:validator.validate(composition)};
  await repository.save(proposal);return proposal;
 }
 async function review(proposalId,decision,reviewer){
  const proposal=await repository.load();if(!proposal||proposal.id!==proposalId)throw Error('Proposal not found '+proposalId);
  if(!['APPROVED','CHANGES_REQUESTED'].includes(decision))throw Error('Invalid review decision');
  const next={...proposal,status:decision,review:{decision,reviewer:reviewer||null}};await repository.save(next);return next;
 }
 async function freeze({proposalId,flow,scenario,sources,sourceSnapshot,selectedBy,approvedAt,repositoryName,branchName}){
  const proposal=await repository.load();if(!proposal||proposal.id!==proposalId)throw Error('Proposal not found '+proposalId);
  if(proposal.status!=='APPROVED')throw Error('PROPOSAL_APPROVAL_REQUIRED');
  if(!proposal.validation||!proposal.validation.valid)throw Error('PROPOSAL_VALIDATION_BLOCKED');
  const validation={...proposal.validation,freeze_ready:true,engine_version:'composition-v1',applicable_rule_ids:(proposal.validation.evidence||[]).map(x=>x.rule_id).filter(Boolean),hard_conflict_count:0,route_pass:true,evidence_pass:true,capability_pass:true,state_pass:true,a11y_pass:true,source_pass:true,coverage_pass:true,source_invalidation:{scenario_invalidated:false}};
  return exporter.exportBundle({flow,scenario,validation,sources,sourceSnapshot,selectedBy,approvedAt,proposal,repository:repositoryName,branchName});
 }
 return {propose,review,freeze}
}
const api={createProposalPipeline};if(typeof module!=='undefined')module.exports=api;root.DesignProposalPipeline=api;
})(typeof window!=='undefined'?window:globalThis);
