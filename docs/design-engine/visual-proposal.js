(function(root){
function createVisualProposalInput({studio,composition}={}){
 if(!studio||!composition)throw Error('VISUAL_PROPOSAL_INPUT_REQUIRED');
 const state=studio.snapshot();
 if(!state.selectedVariant)throw Error('VISUAL_VARIANT_SELECTION_REQUIRED');
 const selectedVariant=state.selectedVariant;
 const transformed=studio.applySelectedToComposition(composition);
 return {composition:transformed,selectedVariant,visualDiff:studio.variantDiff('A',selectedVariant),visualReference:state.reference?{name:state.reference.name,type:state.reference.type}:null};
}
const api={createVisualProposalInput};if(typeof module!=='undefined')module.exports=api;root.DesignVisualProposal=api;
})(typeof window!=='undefined'?window:globalThis);
