/* Trainingskompas UX Design Lab v2.3 — Design Freeze + Claude Contract Exporter */
(function(root,factory){const api=factory();if(typeof module==="object"&&module.exports)module.exports=api;else root.TKContract=api;})(typeof globalThis!=="undefined"?globalThis:this,function(){"use strict";
function clone(x){return JSON.parse(JSON.stringify(x));}
function stable(x){if(Array.isArray(x))return x.map(stable);if(x&&typeof x==="object")return Object.fromEntries(Object.keys(x).sort().map(k=>[k,stable(x[k])]));return x;}
function canonical(x){return JSON.stringify(stable(x));}
function fnv1a(s){let h=2166136261;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619);}return ("00000000"+(h>>>0).toString(16)).slice(-8);}
function assertFreezeReady(validation){if(!validation)throw new Error("VALIDATION_REQUIRED");if(!validation.freeze_ready){const e=new Error("DESIGN_FREEZE_BLOCKED");e.details={hard_issue_count:validation.hard_issue_count,hard_conflict_count:validation.hard_conflict_count,source_invalidation:validation.source_invalidation};throw e;}}
function createFreeze({flow,scenario,validation,sources,sourceSnapshot,selectedBy,approvedAt,notes}){assertFreezeReady(validation);if(!selectedBy)throw new Error("PO_SELECTION_REQUIRED");if(!approvedAt)throw new Error("APPROVAL_TIMESTAMP_REQUIRED");const payload={schema_version:"2.3",status:"DESIGN_FROZEN",flow_id:flow.id,scenario_id:scenario.id,scenario_name:scenario.name,selected_by:selectedBy,approved_at:approvedAt,baseline_main_sha:sourceSnapshot.verified_against_main,source_snapshot:clone(sourceSnapshot.sources),rule_ids:clone(validation.applicable_rule_ids),route_invariants:clone(flow.invariants||[]),capability_coverage:clone(scenario.capability_coverage||[]),required_states:clone(scenario.required_states||[]),designed_states:clone(scenario.designed_states||[]),data_bindings:clone(scenario.data_bindings||[]),components:clone(scenario.components||[]),accessibility:clone(scenario.accessibility||{}),validation:{engine_version:validation.engine_version,hard_issue_count:validation.hard_issue_count,hard_conflict_count:validation.hard_conflict_count,route_pass:validation.route_pass,evidence_pass:validation.evidence_pass,capability_pass:validation.capability_pass,state_pass:validation.state_pass,a11y_pass:validation.a11y_pass,source_pass:validation.source_pass,coverage_pass:validation.coverage_pass},notes:notes||null};payload.freeze_id="TK-FREEZE-"+flow.id+"-"+scenario.id+"-"+fnv1a(canonical(payload));payload.integrity=fnv1a(canonical(payload));return payload;}
function verifyFreeze(freeze,currentSnapshot){const copy=clone(freeze),expected=copy.integrity;delete copy.integrity;const integrity=fnv1a(canonical(copy));const changed=[];if(currentSnapshot){for(const [id,sha] of Object.entries(freeze.source_snapshot||{}))if(currentSnapshot.sources[id]!==sha)changed.push(id);if(currentSnapshot.verified_against_main!==freeze.baseline_main_sha)changed.push("MAIN_SHA");}return {integrity_pass:integrity===expected,source_pass:changed.length===0,changed_sources:changed,valid:integrity===expected&&changed.length===0};}
function acceptance(flow,scenario){return [
"Implementation preserves every capability in capability_coverage.",
"All route invariants pass, including Android/visible Back parity and protected active-training state.",
"All required_states have explicit runtime behavior and no required state is silently collapsed into happy-path UI.",
"UI consumes canonical data bindings and performs no metric recalculation; UNKNOWN is never rendered as zero/GREEN.",
"Canonical components are reused as declared; no unapproved competing PRIMARY CTA is introduced.",
"Accessibility contract passes: semantic controls, icon labels, keyboard behavior and no color-only meaning.",
"Responsive validation passes at 320/360/375/390/412/430 px with no horizontal overflow.",
"Visual/runtime implementation is compared against this frozen scenario; functional omission is not removal.",
"Source snapshot remains current at implementation and acceptance time."
];}
function createContract({freeze,flow,scenario,repository,branchName}){const checks=acceptance(flow,scenario);const contract={schema_version:"2.3",contract_id:"TK-CONTRACT-"+freeze.freeze_id.replace("TK-FREEZE-",""),status:"BUILDABLE_FROM_FROZEN_DESIGN",freeze_id:freeze.freeze_id,repository,baseline_main_sha:freeze.baseline_main_sha,target_branch:branchName||("feature/implement-"+flow.id.toLowerCase()+"-"+scenario.id.toLowerCase()),scope:{flow_id:flow.id,scenario_id:scenario.id,goal:flow.goal,nodes:clone(flow.nodes),edges:clone(flow.edges)},must_preserve:clone(freeze.capability_coverage),rules:clone(freeze.rule_ids),route_invariants:clone(freeze.route_invariants),states:{required:clone(freeze.required_states),designed:clone(freeze.designed_states)},data_bindings:clone(freeze.data_bindings),components:clone(freeze.components),accessibility:clone(freeze.accessibility),source_snapshot:clone(freeze.source_snapshot),forbidden:["Do not make new UX decisions outside this contract.","Do not remove existing capabilities because they are absent from a visual mockup.","Do not recalculate canonical metrics in UI/AI.","Do not invent missing data or reinterpret UNKNOWN as zero/GREEN.","Do not silently resolve rule/source conflicts.","Do not change protected business/calculation/decision logic unless separately authorized."],acceptance_tests:checks,delivery:["Implement only against baseline_main_sha or stop if main drifted.","Run repository quality gates and relevant browser/runtime tests.","Provide changed-file list and prove capability/state/route preservation.","Provide responsive/visual evidence for required viewports.","Report any contract ambiguity as BLOCKED; do not improvise."]};contract.integrity=fnv1a(canonical(contract));return contract;}
function claudePrompt(contract){return `TRAININGSKOMPAS — IMPLEMENT FROZEN UX CONTRACT

CONTRACT: ${contract.contract_id}
FREEZE: ${contract.freeze_id}
BASELINE MAIN: ${contract.baseline_main_sha}
TARGET BRANCH: ${contract.target_branch}

HARD GATE
1. Verify current main equals BASELINE MAIN. If not: HARD STOP.
2. Verify source snapshot and contract integrity are unchanged.
3. Implement exactly this frozen contract. Do not make autonomous UX decisions.
4. Preserve every capability, state, route invariant, data contract and accessibility requirement.
5. Reuse declared canonical components before creating anything new.
6. Calculation/Context/Decision/Evidence remain source of truth. UI/AI may not recalculate or invent.
7. Any ambiguity, missing source, unresolved HARD conflict or required deviation => HARD STOP and report.

SCOPE
Flow: ${contract.scope.flow_id}
Scenario: ${contract.scope.scenario_id}
Goal: ${contract.scope.goal}

MUST PRESERVE
${contract.must_preserve.map(x=>"- "+x).join("\n")}

ROUTE INVARIANTS
${contract.route_invariants.map(x=>"- "+x).join("\n")}

REQUIRED STATES
${contract.states.required.map(x=>"- "+x).join("\n")}

FORBIDDEN
${contract.forbidden.map(x=>"- "+x).join("\n")}

ACCEPTANCE
${contract.acceptance_tests.map((x,i)=>(i+1)+". "+x).join("\n")}

DELIVERY
${contract.delivery.map(x=>"- "+x).join("\n")}

Machine-readable contract is authoritative for exact nodes, edges, components, data bindings, rule IDs and source SHAs.`;}
function exportBundle(args){const freeze=createFreeze(args);const contract=createContract({freeze,flow:args.flow,scenario:args.scenario,repository:args.repository,branchName:args.branchName});return {freeze,contract,claude_prompt:claudePrompt(contract)};}
return {canonical,fnv1a,assertFreezeReady,createFreeze,verifyFreeze,createContract,claudePrompt,exportBundle};});
