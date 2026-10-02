const fs=require('fs'),assert=require('assert');
const html=fs.readFileSync(__dirname+'/index.html','utf8');
require('./test-version').requireUxLabVersion(html,2,38);

function ok(x,m){assert(x,m)}

// P0-B: direct pointer-based reorder in the phone canvas, additive to the existing
// Eerder/Later fallback and the sidebar HTML5 drag list — none of it removed.
for(const s of [
 'function canvasPointerDown(',
 'function canvasPointerMove(',
 'function canvasPointerUp(',
 'function reorderableTarget(',
 'function bindDirectManipulation(',
 "single.addEventListener('pointerdown',canvasPointerDown)",
 "document.addEventListener('pointermove',canvasPointerMove)",
 "document.addEventListener('pointerup',canvasPointerUp)",
 "document.addEventListener('pointercancel',canvasPointerUp)",
 'bindDirectManipulation()',
 // fallback and legacy sidebar drag must still exist
 'moveSelectedVisualTile(-1)',
 'moveSelectedVisualTile(1)',
 'function visualDragStart(',
 'function visualDrop(',
])ok(html.includes(s),'missing '+s);

// the new pointer path must reuse the existing generic state engine (visualStudio.move),
// never a second/parallel order model
ok(html.includes('visualStudio.move(ptrDragId,toIndex)'),'pointer reorder must call the existing visualStudio.move API');
ok(!/ptrOrder\s*=/.test(html),'pointer reorder must not introduce a second order/state model');

// click-suppression so a drag never also toggles selection via the underlying click
for(const s of ['function canvasClickCapture(','ptrSuppressClick'])ok(html.includes(s),'missing '+s);

// P0-C: Style Studio v2 — global color tokens additive to existing radius/spacing,
// explicit inheritance explanation, reusing the existing generic patchStyle('global',...) API
for(const s of [
 'function setVisualColorToken(',
 'function resetVisualGlobalStyle(',
 "setVisualColorToken('background',this.value)",
 "setVisualColorToken('text',this.value)",
 "setVisualColorToken('accent',this.value)",
 'class="inheritNote"',
])ok(html.includes(s),'missing '+s);
ok(html.includes("visualStudio.patchStyle('global',{[key]:value})"),'global color tokens must reuse the existing generic patchStyle API');

// P1-D: compact visual toolbar context chips (variant + selection), reusing existing render()
for(const s of ['id="toolbarVariantChip"','id="toolbarSelectionChip"',"document.getElementById('toolbarVariantChip')"])ok(html.includes(s),'missing '+s);

// P2: active Design Pack identity binding — no hardcoded 'trainingskompas' literal left
// on the pipeline init; falls back safely without an architecture rewrite
ok(!html.includes("productIdentity:'trainingskompas'"),'productIdentity must no longer be hardcoded to the TK literal');
ok(html.includes('window.designActivePack&&window.designActivePack.product_identity'),'productIdentity must bind from the active Design Pack context');
ok(html.includes('window.designActivePack=active.pack'),'active Design Pack must be exposed for identity binding');

console.log('DIRECT MANIPULATION V2 / STYLE STUDIO V2 / TOOLBAR / IDENTITY BINDING GATE PASS');
