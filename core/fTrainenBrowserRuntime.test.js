/* core/fTrainenBrowserRuntime.test.js
 * PR #229 Runtime Visual Defect Recovery -- Fase 6 (browser runtime test) +
 * Fase 8 (mobile viewports) + Fase 10 (sabotage van de exacte bug).
 *
 * ROOT CAUSE (zelf gevonden, gedocumenteerd): een eerdere versie van
 * s-train-mgr gebruikte ES6-template-literal-syntax (${tkIcon(...)}) direct
 * in STATISCHE HTML-broncode -- niet binnen een daadwerkelijk door JavaScript
 * uitgevoerde template literal (backtick-string). Statische HTML wordt door
 * de browser als tekst geparsed, nooit als JS-code uitgevoerd; ${...} wordt
 * dan nooit geinterpoleerd en verschijnt letterlijk in de DOM. Alle bestaande
 * Node-tests controleerden alleen of de string "tkIcon(" ergens voorkwam --
 * dat was WAAR, maar bewees niet dat de aanroep ook daadwerkelijk werd
 * UITGEVOERD. Dit is exact de "test-gap" die de Product Owner meldde.
 *
 * Deze suite draait de ECHTE index.html in een headless Chromium-browser
 * (Playwright) en inspecteert de resulterende DOM -- geen source-parsing.
 */
'use strict';
const path = require('path');
const ROOT = path.join(__dirname, '..');
let chromium;
try { chromium = require('playwright').chromium; } catch (e) { chromium = null; }

let pass = 0, fail = 0;
const msgs = [];
function ok(cond, label) { if (cond) { pass++; } else { fail++; msgs.push('MISLUKT: ' + label); } }

const VIEWPORTS = [
  { name: '320px (kleinste ondersteunde)', width: 320, height: 700 },
  { name: '360px (veelvoorkomend Android)', width: 360, height: 780 },
  { name: '375px (iPhone SE/8)', width: 375, height: 812 },
  { name: '390px (Product Owner runtime, iPhone 12/13/14)', width: 390, height: 844 },
  { name: '412px (Product Owner runtime, veel Android)', width: 412, height: 892 },
  { name: '430px (grootste ondersteunde)', width: 430, height: 932 }
];

async function loadTrainenDOM(page) {
  await page.goto('file://' + path.join(ROOT, 'index.html'));
  await page.waitForTimeout(600);
  await page.evaluate(() => { if (typeof go === 'function') go('s-train-mgr'); });
  await page.waitForTimeout(300);
  return page.evaluate(() => {
    const el = document.getElementById('s-train-mgr');
    return el ? el.outerHTML : null;
  });
}

(async () => {
  if (!chromium) {
    console.log('fTrainenBrowserRuntime: Playwright/Chromium niet beschikbaar in deze omgeving -- SKIPPED (geen vals-groen: dit telt niet als PASS, zie release-gate-registratie).');
    console.log('Resultaat: 0 geslaagd, 0 mislukt (SKIPPED)');
    process.exit(0);
  }

  const browser = await chromium.launch();

  // ---- Fase 6: browser runtime test op het huidige, referentie-viewport ----
  {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    const jsErrors = [];
    page.on('pageerror', e => jsErrors.push(e.message));
    const html = await loadTrainenDOM(page);

    ok(html !== null, '1: het s-train-mgr-scherm bestaat en is bereikbaar via de echte go()-functie in een echte browser');
    ok(html && !html.includes('${'), '2 (KERN VAN DE REGRESSIE): de gerenderde DOM van s-train-mgr bevat GEEN enkele letterlijke "${" -- de exacte, gemelde runtimefout treedt niet meer op');
    ok(html && !html.includes('tkIcon('), '3: de gerenderde DOM bevat geen letterlijke "tkIcon(" -- alle iconen zijn voorgerenderd tot statische SVG, geen onuitgevoerde functieaanroep zichtbaar als tekst');
    const svgCount = await page.evaluate(() => document.querySelectorAll('#s-train-mgr svg.tk-icon').length);
    ok(svgCount >= 12, '4: minimaal 12 daadwerkelijk gerenderde <svg class="tk-icon">-elementen in de echte DOM (was: 0 werkende iconen, alleen tekst)');
    // JS-fouten die specifiek met deze bug/module te maken hebben (ReferenceError op tkIcon e.d.)
    const relevantErrors = jsErrors.filter(m => /tkIcon|designSystemIcons/i.test(m));
    ok(relevantErrors.length === 0, '5: geen JavaScript-fouten gerelateerd aan tkIcon/designSystemIcons.js (bv. ReferenceError door verkeerde script-volgorde)');

    // Vereiste secties/functionaliteit blijven zichtbaar in de echte DOM.
    ok(html && html.includes('Planning'), '6: "Planning" is zichtbaar in de echte, gerenderde DOM (niet alleen in de bronbestand-tekst)');
    const zichtbareTilesReal = await page.evaluate(() => {
      const startHeader = Array.from(document.querySelectorAll('#s-train-mgr .v43-lbl')).find(el => el.textContent.trim() === 'Start een activiteit');
      if (!startHeader) return -1;
      const container = startHeader.nextElementSibling;
      return container ? container.querySelectorAll('.quick-act').length : -1;
    });
    ok(zichtbareTilesReal === 5, '7: het eerste, primair zichtbare activity-blok bevat in de echte DOM precies 5 tiles (Kracht/Hardlopen/Fietsen/HYROX/Meer) -- niet meer dan het PO-contract toestaat');

    // Aanvullende robuustheidscontrole (eerlijk vastgelegd: bij nader, live
    // onderzoek bleek het "tekst loopt door elkaar"-symptoom dat de Product
    // Owner meldde grotendeels een DIRECT gevolg van dezelfde root cause --
    // de lange, onuitgevoerde ${tkIcon(...)}-tekststring zelf verstoorde de
    // layout, niet een aparte, tweede CSS-bug. Reconstructie van de originele
    // markup mét de icon-fix maar zonder de expliciete display:flex gaf GEEN
    // visuele regressie. De expliciete display:flex is alsnog behouden als
    // robuustere, veiligere implementatie, maar wordt hier niet als bewijs
    // van een aparte bugfix gepresenteerd -- puur als aanvullende controle.
    const jouwTrainingLayout = await page.evaluate(() => {
      const btn = document.querySelector('#s-train-mgr button[onclick*="s-train-mine"]');
      if (!btn) return null;
      const spans = btn.querySelectorAll('span');
      if (spans.length < 2) return null;
      const r1 = spans[0].getBoundingClientRect();
      const r2 = spans[1].getBoundingClientRect();
      return { titleBottom: r1.bottom, subTop: r2.top };
    });
    ok(jouwTrainingLayout && jouwTrainingLayout.subTop >= jouwTrainingLayout.titleBottom - 1,
      '8: titel en subtekst in "Mijn trainingen" staan in de echte, gerenderde DOM onder elkaar (robuustheidscontrole)');

    // Zelf gevonden, derde bugklasse: de Eerstvolgende-training-sectie toonde
    // niets (geen kaart, geen empty state) wanneer window.homeNextT leeg is.
    const emptyStateVisible = await page.evaluate(() => {
      const el = document.getElementById('trainen-plan-empty');
      if (!el) return null;
      return window.getComputedStyle(el).display !== 'none';
    });
    ok(emptyStateVisible === true, '9: wanneer er geen geplande training is (window.homeNextT leeg, zoals in deze niet-ingelogde testcontext), toont de echte DOM de bruikbare empty-state ("Nog geen training gepland") in plaats van een lege sectie');

    // Zelf gevonden, derde bugklasse (herstelsprint 3): "Meer" was met flex-wrap
    // op een eigen regel gewrapt en nam vervolgens de volledige, resterende
    // breedte in (334px vs. 77.5px voor de andere 4 tegels) -- veel dominanter
    // dan de PO-baseline toestaat. Opgelost met CSS Grid (5 gelijke kolommen,
    // robuust tegen marginale breedteverschillen op elke viewport).
    const tileWidths = await page.evaluate(() => {
      const containers = document.querySelectorAll('#s-train-mgr .tk-card.tk-card-l3');
      const activityContainer = Array.from(containers).find(c => c.querySelector('[aria-label="Kracht"]'));
      if (!activityContainer) return null;
      return Array.from(activityContainer.querySelectorAll('.quick-act')).map(t => t.getBoundingClientRect().width);
    });
    ok(tileWidths && tileWidths.length === 5, '10: alle 5 primaire activity-tiles (Kracht/Hardlopen/Fietsen/HYROX/Meer) staan op dezelfde rij in de echte DOM');
    if (tileWidths && tileWidths.length === 5) {
      const maxW = Math.max(...tileWidths), minW = Math.min(...tileWidths);
      ok(maxW - minW < 5, '11: geen enkele tile (incl. "Meer") is visueel dominanter dan de andere -- alle 5 hebben nagenoeg identieke breedte (verschil ' + (maxW - minW).toFixed(1) + 'px), conform het PO-contract "Meer mag niet visueel dominanter zijn"');
    }

    // Visual Fidelity Pass: canonical icon-container-classes (lichte teal, DS-03/05).
    const iconBoxCount = await page.evaluate(() => document.querySelectorAll('#s-train-mgr .tk-icon-box').length);
    ok(iconBoxCount === 11, '12: exact 11 canonical .tk-icon-box-containers (lichte teal icon-achtergrond) aanwezig in de echte DOM -- Jouw training (3) + Start een activiteit (5) + Maken & ontdekken (2) + Terugkijken (1)');

    // Zet echte, gesimuleerde trainingsdata om "Bekijk details" en de tijd/
    // locatie-afwezigheid te kunnen verifieren (v43RenderPlan-outputvorm).
    await page.evaluate(() => {
      window.homeNextT = { id: 'test123', naam: 'Training A', _exCount: 7 };
      window.v43ProgInfo = { naam: 'Kracht', week: 1, fase: 'Anatomische Aanpassing' };
      if (typeof renderV43Train === 'function') renderV43Train();
    });
    await page.waitForTimeout(200);

    // Visual Fidelity Pass: "Bekijk details" is een echte, functionele actie naast "Start training".
    const detailsBtnPresent = await page.evaluate(() => !!document.querySelector('#v43-train-plan .v43-details'));
    ok(detailsBtnPresent, '13: "Bekijk details" is aanwezig als aparte, zichtbare actie naast "Start training" wanneer een training gepland is (echte data gesimuleerd in deze test)');

    // Visual Fidelity Pass: geen fictieve tijd/locatie -- alleen echt beschikbare velden.
    const planText = await page.evaluate(() => document.getElementById('v43-train-plan')?.innerText || '');
    ok(!/\d{2}:\d{2}/.test(planText) && !/Gym|Strength room|Sportschool/i.test(planText),
      '14: geen fictief tijdstip (HH:MM) of locatie getoond op de trainingskaart -- bevestigd tegen het echte databaseschema dat deze velden niet bestaan, geen hardcoded waarde toegevoegd');

    // Micro Alignment Pass: consistente horizontale inner-padding voor de
    // Maken & ontdekken/Terugkijken-rijen (icon-box niet meer tegen de linker
    // kaartrand). Meet de ECHTE, gerenderde posities, niet alleen bron-CSS.
    const rowAlignment = await page.evaluate(() => {
      const containers = document.querySelectorAll('#s-train-mgr .v43-tmt-inset');
      const out = [];
      containers.forEach(c => {
        const cardRect = c.getBoundingClientRect();
        c.querySelectorAll('.row').forEach(r => {
          const box = r.querySelector('.tk-icon-box');
          const ar = r.querySelector('.ar');
          out.push({
            iconLeft: box ? Math.round(box.getBoundingClientRect().left - cardRect.left) : null,
            chevronRight: ar ? Math.round(cardRect.right - ar.getBoundingClientRect().right) : null
          });
        });
      });
      return out;
    });
    ok(rowAlignment.length === 3, '15: exact 3 rijen (Training maken, Oefeningen, Trainingshistorie) hebben de nieuwe, consistente inner-padding-container');
    ok(rowAlignment.every(r => r.iconLeft === 16), '16: alle 3 icon-boxen staan op exact dezelfde, consistente linker afstand (16px) tot de kaartrand -- niet meer tegen de rand aan (was 0px)');
    ok(rowAlignment.every(r => r.chevronRight === 16), '17: alle 3 chevrons staan op exact dezelfde, consistente rechter afstand (16px) tot de kaartrand');

    await page.close();
  }

  // ---- Fase 8: mobiele viewports, geen horizontale overflow/afgesneden content ----
  for (const vp of VIEWPORTS) {
    const page = await browser.newPage({ viewport: { width: vp.width, height: vp.height } });
    await loadTrainenDOM(page);
    const overflow = await page.evaluate(() => {
      const el = document.getElementById('s-train-mgr');
      if (!el) return null;
      return el.scrollWidth > el.clientWidth + 2; // kleine marge voor sub-pixel afronding
    });
    ok(overflow === false, '8 (' + vp.name + '): geen horizontale overflow op het Trainen-scherm bij ' + vp.width + 'px breedte');
    await page.close();
  }

  // ---- Fase 10: sabotage van exact deze bug -- test MOET falen als de fout terugkeert ----
  {
    const fs = require('fs');
    const htmlPath = path.join(ROOT, 'index.html');
    const original = fs.readFileSync(htmlPath, 'utf8');
    const sabotaged = original.replace(
      '<span style="font-size:10.5px">Kracht</span>',
      '${tkIcon(\'kracht\',{size:\'feature\'})}<span style="font-size:10.5px">Kracht</span>'
    );
    if (sabotaged === original) {
      ok(false, '18 (sabotage-setup): kon de sabotage-marker niet vinden -- test-infrastructuur zelf is stuk, geen betrouwbare sabotage uitgevoerd');
    } else {
      // KRITIEK: try/finally garandeert herstel ook als browser.newPage()/
      // loadTrainenDOM()/page.close() een exception gooit (bv. op een tragere
      // of anders-belaste CI-runner) -- anders blijft index.html permanent
      // gesaboteerd en laat elke volgende test in de CI-testloop falen. Zelf
      // gevonden als root cause van een CI-only Quality Gate-failure tijdens
      // de Inzicht v0.1-sprint (de vorige, ongebeschermde variant van dit
      // patroon in de nieuwe fInzichtV01BrowserRuntime.test.js).
      let detecteert = false, page = null;
      try {
        fs.writeFileSync(htmlPath, sabotaged, 'utf8');
        page = await browser.newPage({ viewport: { width: 390, height: 844 } });
        const html = await loadTrainenDOM(page);
        detecteert = html && html.includes('${tkIcon(');
      } finally {
        fs.writeFileSync(htmlPath, original, 'utf8'); // direct herstellen, ongeacht resultaat
        if (page) await page.close().catch(() => {});
      }
      ok(detecteert === true, '18: live sabotage (opnieuw ${tkIcon(...)} in statische HTML geintroduceerd) wordt door deze testsuite gedetecteerd -- bewijst dat de test de exacte bugklasse daadwerkelijk vangt, niet toevallig slaagt');
      const restored = fs.readFileSync(htmlPath, 'utf8');
      ok(restored === original, '18b: index.html is na de sabotage-test byte-identiek hersteld naar de originele, gecorrigeerde staat');
    }
  }

  await browser.close();

  console.log('fTrainenBrowserRuntime: ' + pass + ' geslaagd, ' + fail + ' mislukt');
  if (msgs.length) console.log(msgs.join('\n'));
  console.log('Resultaat: ' + pass + ' geslaagd, ' + fail + ' mislukt');
  process.exit(fail > 0 ? 1 : 0);
})().catch(function (e) {
  console.error('fTrainenBrowserRuntime: onverwachte fout tijdens browser-test:', e.message);
  process.exit(1);
});
