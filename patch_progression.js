/* F3.2/F3.7 ProgressionCore-wiring — CRLF-safe, guarded, additive. utf8. */
const fs = require('fs');
const FILE = process.argv[2] || 'index.html';
let src = fs.readFileSync(FILE, 'utf8');
const CRLF = '\r\n';
let ops = 0;
function once(find) { if (src.split(find).length - 1 !== 1) throw new Error('NIET UNIEK/GEVONDEN: ' + find.slice(0, 50)); }

// 1) script-include na core/cardio.js
const inc = '<script src="core/cardio.js"></script>';
once(inc); src = src.replace(inc, inc + CRLF + '<script src="core/progression.js"></script>'); ops++;

// 2) helper-functies vóór renderSessionSummaryContent (guarded, presentatie-only, backtick-vrij)
const anchor = 'function renderSessionSummaryContent(t){';
once(anchor);
const helpers = [
  '// F3.2/F3.7 — deterministische cardio-vergelijking in de post-workout summary.',
  '// PRESENTATIE ONLY (geen actual-write): getallen via CardioCore, vergelijking via ProgressionCore.',
  'function cardioPerfFromSession(s, cardioType){',
  '  if(!s || typeof CardioCore===\'undefined\') return null;',
  '  var cfg = (typeof CARDIO_TYPES!==\'undefined\') ? CARDIO_TYPES[cardioType] : null;',
  '  var durationSec = s.time_str ? CardioCore.parseTime(s.time_str) : null;',
  '  var distance = (s.distance!=null && s.distance!=="") ? Number(s.distance) : null;',
  '  var basis = (cfg && cfg.calc && cfg.calc.basis) ? cfg.calc.basis : null;',
  '  var splitSec = (distance && durationSec && basis) ? CardioCore.splitFromDistTime(distance, durationSec, basis) : null;',
  '  var watts = (s.watt!=null && s.watt!=="") ? Number(s.watt) : null;',
  '  var calories = (s.calories!=null && s.calories!=="") ? Number(s.calories) : null;',
  '  var calPerMin = (calories!=null && durationSec) ? (calories/(durationSec/60)) : null;',
  '  var key = s.exercise_id + \'@\' + (distance!=null ? distance : (cardioType===\'assaultbike\'?\'cal\':\'\'));',
  '  return { key:key, date:s.date, durationSec:durationSec, splitSec:splitSec, watts:watts, calPerMin:calPerMin, calories:calories };',
  '}',
  'function cardioProgressionMetrics(cardioType){',
  '  if(cardioType===\'assaultbike\') return [ {field:\'calPerMin\',dir:\'max\'}, {field:\'watts\',dir:\'max\'} ];',
  '  return [ {field:\'durationSec\',dir:\'min\'}, {field:\'splitSec\',dir:\'min\'}, {field:\'watts\',dir:\'max\'} ];',
  '}',
  '// Guarded, fire-and-forget: verrijkt de reeds-getoonde summary met een vergelijkingszin per cardio-oefening.',
  '// Faalt stil -> de basis-summary blijft altijd exact staan.',
  'async function enhanceSummaryProgression(list){',
  '  try{',
  '    if(typeof ProgressionCore===\'undefined\' || typeof sbGet!==\'function\' || typeof CardioCore===\'undefined\' || typeof cardioDataToRow!==\'function\') return;',
  '    var cardioExs = (list||[]).filter(function(ex){ var l=sessionLog[ex.id]; return l && l.cardio && CARDIO_TYPES[l.cardio.type]; });',
  '    if(!cardioExs.length) return;',
  '    var ids = cardioExs.map(function(ex){return encodeURIComponent(ex.id);});',
  '    var hist=[];',
  '    try{ hist = await sbGet(\'sessions\',\'&exercise_id=in.(\'+ids.join(\',\')+\')&order=date.desc,created_at.desc&limit=300\'); }catch(e){ return; }',
  '    cardioExs.forEach(function(ex){',
  '      try{',
  '        var l=sessionLog[ex.id], type=l.cardio.type;',
  '        var curRow=cardioDataToRow(type, l.cardio); curRow.exercise_id=ex.id; curRow.date=\'9999-99-99\';',
  '        var curPerf=cardioPerfFromSession(curRow, type); if(!curPerf) return;',
  '        var histPerfs=(hist||[]).filter(function(s){return s.exercise_id===ex.id;}).map(function(s){return cardioPerfFromSession(s,type);}).filter(Boolean);',
  '        var comp=ProgressionCore.comparableHistory(histPerfs, curPerf.key);',
  '        var el=document.getElementById(\'sumex-\'+ex.id); if(!el) return;',
  '        var line=null;',
  '        if(!comp.length){ line=\'Eerste registratie — vanaf nu volgen we je progressie.\'; }',
  '        else {',
  '          var prev=ProgressionCore.comparablePrevious(histPerfs, curPerf.key);',
  '          if(prev){',
  '            var rep=ProgressionCore.deltaReport(curPerf, prev, cardioProgressionMetrics(type));',
  '            var primary=(type===\'assaultbike\')?rep.calPerMin:rep.splitSec;',
  '            if(primary && primary.better===true) line=\'↑ Sterker dan je vorige vergelijkbare training.\';',
  '            else if(primary && primary.better===false) line=\'Iets rustiger dan vorige keer — ook prima.\';',
  '            else if(primary && primary.better===null && primary.delta===0) line=\'Gelijk aan vorige keer.\';',
  '          }',
  '        }',
  '        if(line){ var c=(line.charAt(0)===\'\\u2191\')?\'#2e7d32\':\'var(--g4)\'; el.insertAdjacentHTML(\'beforeend\', \'<div style="font-size:11px;margin-top:3px;color:\'+c+\'">\'+line+\'</div>\'); }',
  '      }catch(e){}',
  '    });',
  '  }catch(e){}',
  '}',
  ''
].join(CRLF);
src = src.replace(anchor, helpers + anchor); ops++;

// 3) card krijgt een id + guarded enhancement-aanroep (minimale, additieve edits)
const cardFind = 'if(det)html+=`<div style="padding:8px 0;border-bottom:1px solid var(--g2)"><div style="font-size:13px;font-weight:700;color:var(--dark)">${ex.naam}</div>';
once(cardFind);
src = src.replace(cardFind, 'if(det)html+=`<div id="sumex-${ex.id}" style="padding:8px 0;border-bottom:1px solid var(--g2)"><div style="font-size:13px;font-weight:700;color:var(--dark)">${ex.naam}</div>'); ops++;

const openFind = "  document.getElementById('session-end-content').innerHTML=html;\r\n  openModal('m-session-end');";
once(openFind);
src = src.replace(openFind, openFind + CRLF + "  try{ enhanceSummaryProgression(list); }catch(e){} /* F3.2 guarded progressie-verrijking */"); ops++;

fs.writeFileSync(FILE, src, 'utf8');
console.log('TOTAL OPS: ' + ops + ' (expected 4)');
if (ops !== 4) { console.error('ASSERT FAIL'); process.exit(1); }
