const {test,expect}=require('@playwright/test');
test('mobile project launcher opens TK Design Pack inside Design Engine',async({page})=>{
 await page.setViewportSize({width:390,height:844});
 await page.goto('http://127.0.0.1:4173/');
 await expect(page.locator('#projectHome')).toBeVisible();
 await page.locator('#projectHome .projectCard:not([disabled])').click();
 await expect(page.locator('#projectHome')).toBeHidden();
 await expect(page.locator('#visualStudio')).toBeVisible();
 await expect.poll(()=>page.evaluate(()=>sessionStorage.getItem('design-engine-project'))).toBe('trainingskompas');
 await page.locator('#labBtn').click();
 await expect(page.locator('#labPanel')).toHaveClass(/open/);
 await page.locator('#governanceBtn').click();
 await expect(page.locator('#governancePanel')).toHaveClass(/open/);
 await expect.poll(()=>page.evaluate(()=>window.designRuntimeError?String(window.designRuntimeError):null)).toBe(null);
 await expect(page.locator('body')).not.toContainText('Inloggen bij Trainingskompas');
});
