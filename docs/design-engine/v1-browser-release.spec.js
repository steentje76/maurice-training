const {test,expect}=require('@playwright/test');
const BASE='http://127.0.0.1:4173/';
async function openEngine(page){await page.setViewportSize({width:390,height:844});await page.goto(BASE);await page.locator('#projectHome .projectCard:not([disabled])').click();await expect(page.locator('#workspace')).toBeVisible();await expect.poll(()=>page.evaluate(()=>window.designRuntimeError?String(window.designRuntimeError):null)).toBe(null)}
test('V1 browser release: selected visual proposal freezes and exports generic contract',async({page})=>{
 await openEngine(page);
 await page.getByRole('button',{name:'Proposal',exact:true}).click();
 await page.getByRole('button',{name:'Kies voorstel'}).nth(1).click();
 await page.locator('#governanceBtn').click();
 await page.locator('#freezeBtn').click();
 await expect.poll(()=>page.locator('#contractOut').inputValue()).toContain('DESIGN-FREEZE-');
 await expect(page.locator('#exportBtn')).toBeEnabled();
 await page.locator('#exportBtn').click();
 const out=await page.locator('#contractOut').inputValue();
 expect(out).toContain('IMPLEMENT FROZEN UX CONTRACT');
 expect(out).toContain('DESIGN-CONTRACT-');
 expect(out).toContain('"product_identity": "trainingskompas"');
 expect(out).not.toContain('TK-CONTRACT-');
});
test('V1 browser release: freeze fails closed without explicit visual selection',async({page})=>{
 await openEngine(page);
 await page.getByRole('button',{name:'Proposal',exact:true}).click();
 await page.locator('#governanceBtn').click();
 await page.locator('#freezeBtn').click();
 await expect.poll(()=>page.locator('#contractOut').inputValue()).toContain('VISUAL_VARIANT_SELECTION_REQUIRED');
 await expect(page.locator('#exportBtn')).toBeDisabled();
});
