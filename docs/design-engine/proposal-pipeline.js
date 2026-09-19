(function(root){
function createProposalPipeline({composer,validator,repository,exporter,readinessValidator=null,productIdentity=null}){
 if(!composer||!validator||!repository||!exporter)throw Error('Composer, validator, repository and exporter required');
 async function propose({proposalId,screenId,viewport,changes={},compositionOverride=null,selectedVariant=null}){
  if(!proposalId)throw Error('proposalId required');
  const composition=compositionOverride||composer.compose(screenId,{viewport});
  const validation=validator.validate(composition);
  const proposal={id:proposalId,status:'PROPOSED',screen_id:screenId,composition,changes,selected_variant:selectedVariant||composition.visual_variant||null,validation};
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
  const readiness=readinessValidator?readinessValidator({proposal,flow,scenario,sources,sourceSnapshot}):{valid:false,issues:[{code:'FREEZE_READINESS_VALIDATOR_REQUIRED',severity:'HARD'}]};
  if(!readiness.valid)throw Error('FREEZE_READINESS_BLOCKED '+(readiness.issues||[]).map(x=>x.code).join(','));
  const validation={...proposal.validation,freeze_ready:true,freeze_readiness:readiness,engine_version:'composition-v1',applicable_rule_ids:(proposal.validation.evidence||[]).map(x=>x.rule_id).filter(Boolean)};
  return exporter.exportBundle({flow,scenario,validation,sources,sourceSnapshot,selectedBy,approvedAt,proposal,repository:repositoryName,branchName,productIdentity});
 }
 return {propose,review,freeze}
}
const api={createProposalPipeline};if(typeof module!=='undefined')module.exports=api;root.DesignProposalPipeline=api;
})(typeof window!=='undefined'?window:globalThis);
