import { chromium } from 'playwright-core';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const p = await b.newPage({ viewport: { width: 1500, height: 1100 } });
await p.goto('http://localhost:4198/shapes', { waitUntil: 'networkidle' });
await p.waitForTimeout(900);
await p.getByText('Capa (foto', { exact: false }).first().click();
await p.waitForTimeout(600);
// default (92%)
await p.locator('.editor__scaler').first().screenshot({ path: '/tmp/capa-default.png' });
// encolher para 70% para revelar mais fundo
await p.locator('.tamanho-foto input[type=range]').fill('70'); await p.waitForTimeout(300);
await p.locator('.editor__scaler').first().screenshot({ path: '/tmp/capa-70.png' });
// mudar cor de fundo (2a amostra = laranja) e cor da fonte (branco)
const corFundos = p.locator('.field', { hasText: 'Cor de fundo' }).locator('.swatch');
await corFundos.nth(0).click(); await p.waitForTimeout(200); // laranja
const corFontes = p.locator('.field', { hasText: 'Cor do texto' }).locator('.swatch');
await corFontes.nth(2).click(); await p.waitForTimeout(300); // branco
await p.locator('.editor__scaler').first().screenshot({ path: '/tmp/capa-cores.png' });
await b.close();
