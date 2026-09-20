const fs=require('fs'),assert=require('assert');const html=fs.readFileSync(__dirname+'/index.html','utf8');
for(const s of ['id="directFontSize"','id="directFontWeight"','id="directTextAlign"','id="directTouchOrder"','moveSelectedVisualTile(-1)','moveSelectedVisualTile(1)',"font-size:'+v.fontSize+'px","text-align:'+v.textAlign+';"])assert(html.includes(s),'missing '+s);
assert(html.includes("['radius','spacing','elevation','fontSize','fontWeight'].includes(key)"),'numeric typography style handling missing');
assert(html.includes("visualStudio.snapshot().order.includes(selectedComponentId)"),'touch reorder must only show for reorderable tiles');
console.log('TYPOGRAPHY + TOUCH ORDER V1 UI GATE PASS');
