const {test,expect}=require('@playwright/test');
const BASE='http://127.0.0.1:4173/';
async function openEngine(page){
 await page.setViewportSize({width:390,height:844});
 await page.goto(BASE);
 await page.locator('#projectHome .projectCard:not([disabled])').click();
 await expect(page.locator('#visualStudio')).toBeVisible();
 await expect.poll(()=>page.evaluate(()=>window.designRuntimeError?String(window.designRuntimeError):null)).toBe(null);
}
async function enterProposalMode(page){
 await page.getByRole('button',{name:'Proposal',exact:true}).click();
}

test('Scenario 1: visual-first mobile opening at 390x844, no overflow, audit not dominant',async({page})=>{
 await openEngine(page);
 await expect(page.locator('#single')).toBeVisible();
 await expect(page.locator('#auditSecondary')).not.toHaveClass(/\bon\b/);
 const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth);
 expect(overflow).toBeLessThanOrEqual(1);
});

test('Scenario 3: direct pointer reorder in canvas changes active-variant order, Eerder/Later fallback still works',async({page})=>{
 await openEngine(page);
 await enterProposalMode(page);
 const before=await page.locator('#variantCompare .variantCard').first().locator('.miniOrder').textContent();
 expect(before).toContain('my-training');
 const source=page.locator('#screen [data-component-instance="my-training"]');
 const target=page.locator('#screen [data-component-instance="planning"]');
 const sBox=await source.boundingBox(),tBox=await target.boundingBox();
 await page.mouse.move(sBox.x+sBox.width/2,sBox.y+sBox.height/2);
 await page.mouse.down();
 await page.mouse.move(sBox.x+sBox.width/2+20,sBox.y+sBox.height/2,{steps:5});
 await page.mouse.move(tBox.x+tBox.width/2,tBox.y+tBox.height/2,{steps:10});
 await page.mouse.up();
 await expect.poll(()=>page.locator('#variantCompare .variantCard').first().locator('.miniOrder').textContent(),{timeout:10000}).not.toBe(before);
 const afterDrag=await page.locator('#variantCompare .variantCard').first().locator('.miniOrder').textContent();
 expect(afterDrag).not.toContain('my-training → programs → planning');
 await page.locator('#tileOrder button[aria-label$="omhoog"]:not([disabled])').first().click();
 await expect(page.locator('#tileOrder')).toBeVisible();
});

test('Scenario 4: A/B/C variant isolation — editing active variant B never mutates A or C',async({page})=>{
 await openEngine(page);
 await enterProposalMode(page);
 await page.locator('#variantB').click();
 const aBefore=await page.locator('#variantCompare .variantCard').nth(0).locator('.miniOrder').textContent();
 const bBefore=await page.locator('#variantCompare .variantCard').nth(1).locator('.miniOrder').textContent();
 const cBefore=await page.locator('#variantCompare .variantCard').nth(2).locator('.miniOrder').textContent();
 const source=page.locator('#screen [data-component-instance="programs"]');
 const target=page.locator('#screen [data-component-instance="my-training"]');
 const sBox=await source.boundingBox(),tBox=await target.boundingBox();
 await page.mouse.move(sBox.x+sBox.width/2,sBox.y+sBox.height/2);
 await page.mouse.down();
 await page.mouse.move(sBox.x+sBox.width/2+20,sBox.y+sBox.height/2,{steps:5});
 await page.mouse.move(tBox.x+tBox.width/2,tBox.y+tBox.height/2,{steps:10});
 await page.mouse.up();
 await expect.poll(()=>page.locator('#variantCompare .variantCard').nth(1).locator('.miniOrder').textContent(),{timeout:10000}).not.toBe(bBefore);
 const aAfter=await page.locator('#variantCompare .variantCard').nth(0).locator('.miniOrder').textContent();
 const cAfter=await page.locator('#variantCompare .variantCard').nth(2).locator('.miniOrder').textContent();
 expect(aAfter).toBe(aBefore);
 expect(cAfter).toBe(cBefore);
});

test('Scenario 5: selected variant stays bound after switching active variant; freeze uses selected, not active',async({page})=>{
 await openEngine(page);
 await enterProposalMode(page);
 await page.getByRole('button',{name:'Kies voorstel'}).nth(1).click();
 await expect(page.locator('#toolbarVariantChip')).toContainText('Voorstel: B');
 await page.locator('#variantC').click();
 await expect(page.locator('#toolbarVariantChip')).toContainText('Actief: C');
 await expect(page.locator('#toolbarVariantChip')).toContainText('Voorstel: B');
 await page.locator('#governanceBtn').click();
 await page.locator('#freezeBtn').click();
 await expect.poll(()=>page.locator('#contractOut').inputValue(),{timeout:10000}).toContain('DESIGN-FREEZE-');
 const out=await page.locator('#contractOut').inputValue();
 const parsed=JSON.parse(out);
 expect(parsed.proposal.selected_variant||parsed.proposal.selectedVariant).toBe('B');
});

test('Scenario 6: Audit & bewijs remains fully reachable alongside the visual-first workspace',async({page})=>{
 await openEngine(page);
 await page.locator('#studioModeAudit').click();
 await expect(page.locator('#auditSecondary')).toHaveClass(/\bon\b/);
 await expect(page.locator('#workspace')).toBeVisible();
 await expect(page.locator('#sourceHealth')).toBeVisible();
 await expect(page.locator('#stateExplorer')).toBeVisible();
 await expect(page.locator('#evidence')).toBeVisible();
 await page.locator('#studioModeDesign').click();
 await expect(page.locator('#auditSecondary')).not.toHaveClass(/\bon\b/);
});

test('Scenario 7: fail-closed freeze is unaffected by direct-manipulation reorder without an explicit selected variant',async({page})=>{
 await openEngine(page);
 await enterProposalMode(page);
 const source=page.locator('#screen [data-component-instance="my-training"]');
 const target=page.locator('#screen [data-component-instance="planning"]');
 const sBox=await source.boundingBox(),tBox=await target.boundingBox();
 await page.mouse.move(sBox.x+sBox.width/2,sBox.y+sBox.height/2);
 await page.mouse.down();
 await page.mouse.move(tBox.x+tBox.width/2,tBox.y+tBox.height/2,{steps:10});
 await page.mouse.up();
 await page.locator('#governanceBtn').click();
 await page.locator('#freezeBtn').click();
 await expect.poll(()=>page.locator('#contractOut').inputValue(),{timeout:10000}).toContain('VISUAL_VARIANT_SELECTION_REQUIRED');
 await expect(page.locator('#exportBtn')).toBeDisabled();
});

test('Direct-manipulation drag suppresses the trailing click so it does not toggle selection a second time',async({page})=>{
 await openEngine(page);
 await enterProposalMode(page);
 const source=page.locator('#screen [data-component-instance="my-training"]');
 const target=page.locator('#screen [data-component-instance="planning"]');
 const sBox=await source.boundingBox(),tBox=await target.boundingBox();
 await page.mouse.move(sBox.x+sBox.width/2,sBox.y+sBox.height/2);
 await page.mouse.down();
 await page.mouse.move(tBox.x+tBox.width/2,tBox.y+tBox.height/2,{steps:10});
 await page.mouse.up();
 await expect(page.locator('#toolbarSelectionChip')).toContainText('my-training');
 await expect(page.locator('#screen [data-component-instance="my-training"].selectedComponent')).toHaveCount(1);
});
