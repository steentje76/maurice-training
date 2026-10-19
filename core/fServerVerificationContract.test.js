/* TK-REL-SEC-10 — contract server-read-after-write (serververify.v1).
 * Alleen SERVER_VERIFIED is bewijs van serveropslag; elke twijfel blokkeert de de-installatie. */
'use strict';
const assert=require('assert'),V=require('./serverVerification.js');
let klaar=false,n=0;
process.on('exit',()=>{if(!klaar){console.error('FAIL niet alle scenario\'s afgerond');process.exitCode=1;}});
const check=(ok,label)=>{assert(ok,label);n++;console.log('PASS',label);};
const S=V.STATUS,BASIS={eigenaar:'A',bron:'supabase:rest:sessions',tijdstip:'2026-10-19T12:00:00Z'};
const VELDEN=[{naam:'reps',type:'number'},{naam:'weight',type:'number'},{naam:'date'}];
const set={id:'s1',user_id:'A',reps:8,weight:'60',date:'2026-10-19'};
const r=(o)=>V.verifyRecord(Object.assign({},BASIS,{verwacht:set,velden:VELDEN},o));

// 1. Volledige, gelijke rij
let x=r({server:{id:'s1',user_id:'A',reps:'8',weight:60.0,date:'2026-10-19',created_at:'x'}});
check(x.status===S.SERVER_VERIFIED&&x.verified_at===BASIS.tijdstip&&x.bron===BASIS.bron&&x.hash_lokaal===x.hash_server,'C1 gelijke inhoud (numeriek genormaliseerd) → SERVER_VERIFIED met tijdstip, bron en gelijke hash');
// 2. Afwijkingen
check(r({server:null}).status===S.MISSING,'C2 rij ontbreekt op server → MISSING');
check(r({}).status===S.UNKNOWN,'C3 niet teruggelezen → UNKNOWN (nooit verified)');
x=r({server:{id:'s1',user_id:'B',reps:8,weight:60,date:'2026-10-19'}});
check(x.status===S.MISMATCH&&x.afwijkingen.indexOf('eigenaar')>=0,'C4 andere eigenaar → MISMATCH(eigenaar)');
x=r({server:{id:'s1',reps:8,weight:60,date:'2026-10-19'}});
check(x.status===S.MISMATCH&&x.afwijkingen.indexOf('eigenaar')>=0,'C5 eigenaar ontbreekt op serverrij → MISMATCH');
x=r({server:{id:'s1',user_id:'A',reps:7,weight:60,date:'2026-10-19'}});
check(x.status===S.MISMATCH&&x.afwijkingen.indexOf('veld:reps')>=0&&x.verified_at===null,'C6 inhoud wijkt af → MISMATCH(veld) zonder verified_at');
x=r({server:{id:'s2',user_id:'A',reps:8,weight:60,date:'2026-10-19'}});
check(x.status===S.MISMATCH&&x.afwijkingen.indexOf('record_id')>=0,'C7 ander record-id → MISMATCH(record_id)');
check(r({server:{id:'s1',user_id:'A',reps:8,weight:'zestig',date:'2026-10-19'}}).status===S.MISMATCH,'C8 niet-numerieke serverwaarde in numeriek veld → MISMATCH');
// 3. Fail-closed invoer
['eigenaar','bron','tijdstip'].forEach(k=>{const o={server:set};o[k]=null;check(r(o).status===S.UNKNOWN,'C9 zonder '+k+' → UNKNOWN');});
check(V.verifyRecord(Object.assign({},BASIS,{verwacht:set,velden:[],server:set})).status===S.UNKNOWN,'C10 zonder te vergelijken velden → UNKNOWN');
check(V.verifyRecord(Object.assign({},BASIS,{verwacht:{reps:8},velden:VELDEN,server:set})).status===S.UNKNOWN,'C11 lokale rij zonder id → UNKNOWN');
// 4. Ouder-kind
const ouder={id:'ct1',user_id:'A',name:'Push'},k1={id:'e1',user_id:'A',sort_order:0},k2={id:'e2',user_id:'A',sort_order:1};
const pc=(o)=>V.verifyParentChildren(Object.assign({},BASIS,{ouder,kinderen:[k1,k2],oudervelden:['name'],kindvelden:[{naam:'sort_order',type:'number'}],serverOuder:ouder,serverKinderen:[k1,k2]},o));
check(pc({}).status===S.SERVER_VERIFIED,'C12 ouder en alle kinderen aanwezig en gelijk → SERVER_VERIFIED');
check(pc({serverKinderen:[k1]}).status===S.MISSING,'C13 ontbrekend kind → MISSING');
check(pc({serverKinderen:[k1,k2,{id:'e3',user_id:'A',sort_order:2}]}).status===S.MISMATCH,'C14 extra serverkind → MISMATCH');
check(pc({serverKinderen:undefined}).status===S.UNKNOWN,'C15 kinderen niet teruggelezen → UNKNOWN');
check(pc({serverOuder:null}).status===S.MISSING,'C16 ouder ontbreekt → MISSING');
check(pc({kinderen:undefined}).status===S.UNKNOWN,'C17 lokale kinderlijst onbekend → UNKNOWN');
// 5. Aggregatie en statusmachine
check(V.aggregate([]).status===S.UNKNOWN,'C18 lege resultaatset → UNKNOWN (lege lijst is geen bewijs)');
check(V.aggregate([{status:S.SERVER_VERIFIED},{status:S.MISSING},{status:S.UNKNOWN}]).status===S.MISSING,'C19 zwaarste status bepaalt groep');
check(V.aggregate([{status:'SERVER_ACCEPTED'}]).status===S.UNKNOWN,'C20 SERVER_ACCEPTED (2xx) is geen verificatie → UNKNOWN');
check(!V.magOvergaan('SENT','SERVER_VERIFIED')&&!V.magOvergaan('QUEUED','SERVER_VERIFIED')&&V.magOvergaan('SERVER_ACCEPTED','SERVER_VERIFIED'),'C21 SERVER_VERIFIED alleen bereikbaar vanuit SERVER_ACCEPTED');
// 6. De-installatiepoort
const ok1=r({server:Object.assign({},set)}),gate=(o)=>V.uninstallGate(Object.assign({inventaris:{volledig:true,onleesbaar:[],ids:['s1']},resultaten:[ok1]},o));
check(gate({}).toegestaan===true,'C22 volledige inventaris, alles SERVER_VERIFIED → toegestaan');
check(gate({inventaris:{volledig:false,onleesbaar:[],ids:['s1']}}).toegestaan===false,'C23 onvolledige inventaris → geweigerd');
check(gate({inventaris:{volledig:true,onleesbaar:['tk_draft_training'],ids:['s1']}}).toegestaan===false,'C24 onleesbare lokale bron → geweigerd');
check(gate({inventaris:{volledig:true,onleesbaar:[],ids:['s1','s9']}}).toegestaan===false,'C25 lokaal id zonder verificatie → geweigerd');
check(gate({resultaten:[r({server:null})]}).toegestaan===false,'C26 MISSING → geweigerd');
check(gate({inventaris:{volledig:true,onleesbaar:[]}}).toegestaan===false,'C27 inventaris zonder id-lijst → geweigerd');
check(V.canoniek({b:1,a:' x '},['b','a'])===V.canoniek({a:'x',b:1},['a','b']),'C28 canonieke vorm onafhankelijk van sleutel- en veldvolgorde');
klaar=true;console.log('TK-REL-SEC-10: '+n+'/'+n);
