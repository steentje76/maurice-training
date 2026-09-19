const assert=require('assert'),Core=require('./design-engine-core'),S=require('./screen-composer'),V=require('./composition-validation'),R=require('./design-repository'),P=require('./proposal-pipeline'),C=require('./contract-exporter'),F=require('./freeze-readiness');
(async()=>{
 const files={
  'pack.json':{id:'PACK-E2E',name:'Generic E2E',product_identity:'generic-product',assets:{components:'components.json',screens:'screens.json'}},
  'components.json':{components:[{id:'CTA',type:'button',interactive:true}]},
  'screens.json':{screens:[{id:'HOME',title:'Home',instances:[{id:'start',component:'CTA',label:'Start',primary_cta:true,rule_ids:['UX-CTA-001']}]}]}
 };
 const runtime=Core.createDesignPackRuntime({projects:[{id:'generic',status:'ACTIVE',design_pack_manifest:'pack.json'}]},async p=>files[p]);
 const active=await runtime.activate('generic');assert.equal(active.ready,true);assert.equal(active.pack.product_identity,'generic-product');
 const composer=S.createScreenComposer(active.pack),validator=V.createCompositionValidator({rules:[{id:'UX-CTA-001',statement:'single primary'}]}),repository=R.memoryRepository();
 const readinessValidator=F.validateFreezeReadiness;
 const pipeline=P.createProposalPipeline({composer,validator,repository,exporter:C,readinessValidator});
 let proposal=await pipeline.propose({proposalId:'E2E-1',screenId:'HOME',viewport:390,selectedVariant:'A'});assert.equal(proposal.validation.valid,true);
 await pipeline.review('E2E-1','APPROVED','Product Owner');
 const flow={id:'FLOW-E2E',start:'home',goal:'prove generic V1 pipeline',invariants:['ROUTE-E2E'],nodes:[{id:'home',capabilities:['start']}],edges:[]},scenario={id:'S1',name:'E2E',rule_status:'PASS',removed_capabilities:[],capability_coverage:['start'],required_states:['loading','error'],designed_states:['loading','error'],data_bindings:[],components:[],accessibility:{semantic_controls:true,icon_labels:true,keyboard:true,no_color_only:true}},snapshot={baseline_sha:'PINNED-SHA',verified_against_main:'PINNED-SHA',sources:{}},sources={sources:[{id:'SRC-E2E',sha:'SOURCE-SHA'}]};
 const bundle=await pipeline.freeze({proposalId:'E2E-1',flow,scenario,sources,sourceSnapshot:snapshot,selectedBy:'Product Owner',approvedAt:'2026-09-19T18:00:00+02:00',repositoryName:'example/repo'});
 assert.equal(bundle.freeze.status,'DESIGN_FROZEN');assert.equal(bundle.contract.status,'BUILDABLE_FROM_FROZEN_DESIGN');assert.equal(bundle.contract.proposal.id,'E2E-1');assert(bundle.claude_prompt.includes('HARD GATE'));
 const badPack={id:'BAD',components:{components:[{id:'B',interactive:true}]},screens:{screens:[{id:'BAD',instances:[{id:'a',component:'B',primary_cta:true},{id:'b',component:'B',primary_cta:true}]}]}};
 const badRepo=R.memoryRepository(),bad=P.createProposalPipeline({composer:S.createScreenComposer(badPack),validator:V.createCompositionValidator({rules:[]}),repository:badRepo,exporter:C});
 let bp=await bad.propose({proposalId:'BAD-1',screenId:'BAD'});assert.equal(bp.validation.valid,false);await bad.review('BAD-1','APPROVED','PO');await assert.rejects(()=>bad.freeze({proposalId:'BAD-1'}),/PROPOSAL_VALIDATION_BLOCKED/);
 console.log('DESIGN ENGINE V1 FULL E2E RELEASE GATE PASS');
})().catch(e=>{console.error(e);process.exit(1)});
