/* TK-REL-SEC-06: no "saved"/"deleted" UI after failed PATCH/DELETE.
 * Executes the actual nutrition UI functions extracted from production index.html. */
'use strict';
const fs=require('fs'),vm=require('vm'),path=require('path'),assert=require('assert');
const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
const grab=(a,b)=>{const i=html.indexOf(a),j=html.indexOf(b,i+a.length);assert(i>=0&&j>i,a);return html.slice(i,j);};
const supp=(html.match(/async function voedingDeleteSupplementLog\(logId\)\{[^\r\n]+/ )||[])[0];
assert(supp,'supplement-delete production function missing');
const src=[
 grab('async function voedingRemoveMealItemConfirmed(itemId){','/* == CONCEPT B / UX-04:'),
 grab('async function voedingSaveItemEdit(){','function voedingDeleteMeal(mealId){'),
 grab('async function voedingDeleteMealConfirmed(mealId){','/* SCREEN 8 — Supplement toevoegen. */'),
 supp
].join('\n');
let complete=false,n=0;
process.on('exit',()=>{if(!complete){console.error('FAIL test suite did not finish');process.exitCode=1;}});
function check(cond,label){assert(cond,label);n++;}
function sandbox({stored=true}={}){
 const toasts=[],routes=[],calls=[];let detail=0,history=0,busyDone=0;
 const errEl={style:{display:'none'},textContent:''};
 const ctx={
   console,voedingEditingItem:{itemId:'meal-item-1',pendingResult:{status:'valid'},pendingQty:2,pendingUnit:'g'},
   voedingOpenMealDetailId:'meal-1',
   document:{getElementById:()=>errEl,querySelector:()=>({})},
   NutritionIngestService:{buildNutrientSnapshot:()=>({calories:8})},
   voedingWithBusy:()=>()=>{busyDone++;},
   sbDelQ:async(t,f)=>{calls.push([t,f]);return stored;},
   sbPatchQ:async(t,f,d)=>{calls.push([t,f,d]);return stored;},
   toast:s=>toasts.push(s),go:s=>routes.push(s),
   renderVoedingMaaltijdDetail:()=>{detail++;},
   voedingRenderSupplementHistory:()=>{history++;}
 };
 vm.createContext(ctx);vm.runInContext(src,ctx);
 return {ctx,toasts,routes,calls,errEl,get detail(){return detail;},get history(){return history;},get busyDone(){return busyDone;}};
}
async function main(){
 for(const stored of [false,true]){
   const item=sandbox({stored});await item.ctx.voedingRemoveMealItemConfirmed('meal-item-1');
   check(item.toasts.includes('Verwijderd')===stored,'item delete toast only after storage '+stored);
   check(item.detail===1,'item detail refresh retains canonical re-read '+stored);
   const edit=sandbox({stored});await edit.ctx.voedingSaveItemEdit();
   check(edit.toasts.includes('Wijzigingen opgeslagen')===stored,'edit success toast only after storage '+stored);
   check((edit.ctx.voedingEditingItem===null)===stored,'failed edit retains unsaved quantity '+stored);
   check(edit.errEl.style.display===(stored?'none':'block'),'failed edit shows error '+stored);
   check(edit.busyDone===1,'busy button always restored '+stored);
   const meal=sandbox({stored});await meal.ctx.voedingDeleteMealConfirmed('meal-1');
   check(meal.routes.includes('s-voeding-maaltijden')===stored,'failed meal delete stays in current screen '+stored);
   check(meal.calls.length===(stored?2:1),'failed child delete must stop before deleting parent '+stored);
   const supl=sandbox({stored});await supl.ctx.voedingDeleteSupplementLog('supp-1');
   check(supl.history===(stored?1:0),'supplement history only refreshes on saved deletion '+stored);
   check(supl.toasts.includes('Verwijderen mislukt. Controleer je verbinding en probeer opnieuw.')===!stored,'supplement error shown on false return '+stored);
 }
 complete=true;console.log('TK-REL-SEC-06:',n+'/'+n,'assertions');
}
main().catch(e=>{console.error(e);process.exitCode=1;});
