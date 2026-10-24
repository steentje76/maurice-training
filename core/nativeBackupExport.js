/* ==========================================================================
 * TrainingKompas — NATIVE EXPORT VAN DE VERSLEUTELDE REDDINGSKOPIE (TK-REL-SEC-33)
 * --------------------------------------------------------------------------
 * Orkestreert de Android-plugin TkBestandOpslaan (Storage Access Framework). Krijgt uitsluitend de AL VERSLEUTELDE
 * envelop (JSON-tekst, ASCII) en schrijft die in begrensde delen. Geen wachtzin, geen onversleutelde gegevens over de
 * bridge. Eindstatussen (contract):
 *   CANCELLED          de sporter koos geen locatie
 *   WRITE_FAILED       openen, schrijven, sluiten of de bridge faalde (ook: opslag vol, te groot)
 *   READ_FAILED        teruglezen faalde
 *   MISMATCH           teruggelezen grootte of SHA-256 wijkt af van wat geschreven moest worden
 *   ACCOUNT_CHANGED    een ander account is ingelogd vóór of na de native stap
 *   VERIFIED_READBACK  geschreven, gesloten, gesynchroniseerd, volledig teruggelezen en gelijk (grootte + SHA-256)
 * Alleen VERIFIED_READBACK is een geslaagde opslag. Bij elke andere uitkomst wordt het aangemaakte document
 * verwijderd (best effort) en wordt gemeld of dat lukte.
 * ========================================================================== */
(function(root,factory){
  if(typeof module==='object'&&module.exports)module.exports=factory();
  else root.TKNativeExport=factory();
}(typeof self!=='undefined'?self:this,function(){
  'use strict';
  const S={CANCELLED:'CANCELLED',WRITE_FAILED:'WRITE_FAILED',READ_FAILED:'READ_FAILED',MISMATCH:'MISMATCH',ACCOUNT_CHANGED:'ACCOUNT_CHANGED',VERIFIED_READBACK:'VERIFIED_READBACK'};
  const DEEL=256*1024;                 // tekens per bridge-aanroep (≤ MAX_DEEL van de plugin, 512 KiB)
  const MAX_TOTAAL=32*1024*1024;       // zelfde bovengrens als TkExportSessie.MAX_TOTAAL
  const ENVELOP_BEGIN='{"format":"tk-local-rescue-encrypted.v1",';
  const NAAM=/^[A-Za-z0-9._-]{1,96}\.tkbackup$/;
  const EIND=[S.CANCELLED,S.WRITE_FAILED,S.READ_FAILED,S.MISMATCH,S.ACCOUNT_CHANGED,S.VERIFIED_READBACK];
  function uit(status,o){ return Object.assign({status:status,geslaagd:status===S.VERIFIED_READBACK},o||{}); }
  function isAscii(t){ for(let i=0;i<t.length;i++){ const c=t.charCodeAt(i); if(c>0x7e||(c<0x20&&c!==10&&c!==13&&c!==9))return false; } return true; }
  async function sha256Hex(tekst,subtle){ const d=await subtle.digest('SHA-256',new TextEncoder().encode(tekst)); return Array.from(new Uint8Array(d)).map(b=>('0'+b.toString(16)).slice(-2)).join(''); }

  /* exporteer({ plugin, tekst, naam, eigenaarGelijk:()=>boolean, subtle, maxGrootte, deel })
   *  plugin: Capacitor-plugin (start/schrijf/voltooi/afbreken/afronden). tekst: JSON.stringify(envelop).
   *  eigenaarGelijk: wordt vóór de start, tussen de delen en na terugkomst gecontroleerd. */
  async function exporteer(o){
    const p=o&&o.plugin, tekst=o&&o.tekst, eigen=(o&&typeof o.eigenaarGelijk==='function')?o.eigenaarGelijk:()=>false;
    const max=Math.min((o&&o.maxGrootte)||MAX_TOTAAL,MAX_TOTAAL), deel=Math.min((o&&o.deel)||DEEL,DEEL);
    if(!p||typeof p.start!=='function'||typeof p.schrijf!=='function'||typeof p.voltooi!=='function'||typeof p.afbreken!=='function')return uit(S.WRITE_FAILED,{reden:'plugin_ontbreekt'});
    if(typeof tekst!=='string'||!tekst.length)return uit(S.WRITE_FAILED,{reden:'geen_inhoud'});
    if(tekst.length>max)return uit(S.WRITE_FAILED,{reden:'te_groot'});
    if(tekst.indexOf(ENVELOP_BEGIN)!==0||!isAscii(tekst))return uit(S.WRITE_FAILED,{reden:'geen_versleutelde_envelop'});
    if(typeof o.naam!=='string'||!NAAM.test(o.naam))return uit(S.WRITE_FAILED,{reden:'ongeldige_naam'});
    if(!o.subtle)return uit(S.WRITE_FAILED,{reden:'crypto_ontbreekt'});
    let sha; try{ sha=await sha256Hex(tekst,o.subtle); }catch(_){ return uit(S.WRITE_FAILED,{reden:'crypto_ontbreekt'}); }
    if(!eigen())return uit(S.ACCOUNT_CHANGED,{reden:'voor_start'});
    let sessie=null;
    const breekAf=async function(status,reden){
      let verwijderd=false;
      if(sessie){ try{ const r=await p.afbreken({sessie,status}); verwijderd=!!(r&&r.verwijderd===true); }catch(_){ verwijderd=false; } }
      return uit(status,{reden,verwijderd,documentAangemaakt:true});
    };
    let st;
    try{ st=await p.start({naam:o.naam,grootte:tekst.length,sha256:sha}); }catch(_){ return uit(S.WRITE_FAILED,{reden:'bridge'}); }
    if(!st||st.status===S.CANCELLED)return uit(S.CANCELLED,{verwijderd:false});
    if(st.status!=='GEOPEND'||typeof st.sessie!=='string'||!st.sessie)return uit(EIND.indexOf(st&&st.status)>=0&&st.status!==S.VERIFIED_READBACK?st.status:S.WRITE_FAILED,{reden:(st&&st.reden)||'start',verwijderd:!!(st&&st.verwijderd),documentAangemaakt:false});
    sessie=st.sessie;
    const naamOpgeslagen=(typeof st.naam==='string'&&st.naam.length<=255)?st.naam:null;
    for(let i=0,index=0;i<tekst.length;i+=deel,index++){
      if(!eigen())return breekAf(S.ACCOUNT_CHANGED,'tijdens_schrijven');
      let r; try{ r=await p.schrijf({sessie,index,data:tekst.slice(i,i+deel)}); }catch(_){ return breekAf(S.WRITE_FAILED,'bridge'); }
      if(!r||r.status!=='DEEL_OK'){ const s=(r&&EIND.indexOf(r.status)>=0&&r.status!==S.VERIFIED_READBACK)?r.status:S.WRITE_FAILED; sessie=null; return uit(s,{reden:(r&&r.reden)||'schrijven',verwijderd:!!(r&&r.verwijderd),documentAangemaakt:true}); }
    }
    if(!eigen())return breekAf(S.ACCOUNT_CHANGED,'voor_voltooien');
    let v; try{ v=await p.voltooi({sessie}); }catch(_){ return breekAf(S.READ_FAILED,'bridge'); }
    if(!v||v.status!==S.VERIFIED_READBACK){ const s=(v&&EIND.indexOf(v.status)>=0)?v.status:S.WRITE_FAILED; sessie=null; return uit(s===S.VERIFIED_READBACK?S.WRITE_FAILED:s,{reden:(v&&v.reden)||'voltooien',verwijderd:!!(v&&v.verwijderd),documentAangemaakt:true}); }
    // Native uitkomst zelf controleren: grootte en SHA-256 moeten exact overeenkomen met wat de webkant berekende.
    if(v.grootte!==tekst.length||v.sha256!==sha)return breekAf(S.MISMATCH,'native_uitkomst_wijkt_af');
    if(!eigen())return breekAf(S.ACCOUNT_CHANGED,'na_terugkomst');
    try{ if(typeof p.afronden==='function')await p.afronden({sessie}); }catch(_){}
    return uit(S.VERIFIED_READBACK,{documentAangemaakt:true,naam:(typeof v.naam==='string'&&v.naam.length<=255)?v.naam:naamOpgeslagen,grootte:v.grootte,sha256:sha});
  }
  return {STATUS:S,DEEL,MAX_TOTAAL,ENVELOP_BEGIN,exporteer,sha256Hex};
}));
