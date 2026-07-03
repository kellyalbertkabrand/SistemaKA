import { chromium } from 'playwright-core';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const p = await b.newPage({ viewport: { width: 1500, height: 1100 } });
await p.goto('http://localhost:4203/shapes', { waitUntil: 'networkidle' });
await p.waitForTimeout(800);
await p.getByText('CTA (acesse', { exact: false }).first().click();
await p.waitForTimeout(600);
const formaBtns = await p.locator('.forma-input .forma-op').all();
console.log('forma buttons:', formaBtns.length);
for (let i=0;i<formaBtns.length;i++){
  await formaBtns[i].click(); await p.waitForTimeout(400);
  await p.locator('.editor__scaler').first().screenshot({ path: `/tmp/cta-forma${i+1}.png` });
}
await b.close();
