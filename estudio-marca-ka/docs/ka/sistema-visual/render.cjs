// Renderiza cada slide do manifest.json em PNG 1080×1350 (2×, alta resolução).
// Requer playwright-core + o Chromium do ambiente. Uso: node render.js
const fs = require('fs');
const path = require('path');

// Resolve o chromium: variável de ambiente, o do Playwright do ambiente remoto,
// ou o baixado por `npx playwright install chromium`.
function acharChrome() {
  if (process.env.CHROME_PATH && fs.existsSync(process.env.CHROME_PATH)) return process.env.CHROME_PATH;
  const bases = ['/opt/pw-browsers', path.join(process.env.HOME || '', '.cache/ms-playwright')];
  for (const b of bases) {
    try {
      for (const d of fs.readdirSync(b)) {
        if (!d.startsWith('chromium')) continue;
        for (const rel of ['chrome-linux/chrome', 'chrome-linux/headless_shell', 'chrome-mac/Chromium.app/Contents/MacOS/Chromium']) {
          const p = path.join(b, d, rel);
          if (fs.existsSync(p)) return p;
        }
      }
    } catch (_) {}
  }
  return undefined; // deixa o playwright usar o padrão
}

(async () => {
  let chromium;
  try { ({ chromium } = require('playwright-core')); }
  catch (_) { ({ chromium } = require('playwright')); }

  const manifest = JSON.parse(fs.readFileSync(path.join(__dirname, 'manifest.json')));
  const exe = acharChrome();
  const browser = await chromium.launch({ executablePath: exe, args: ['--no-sandbox', '--allow-file-access-from-files'] });
  for (const s of manifest) {
    const page = await browser.newPage({ viewport: { width: 1080, height: 1350 }, deviceScaleFactor: 2 });
    fs.mkdirSync(path.dirname(s.out), { recursive: true });
    await page.goto('file://' + s.html, { waitUntil: 'networkidle' });
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(120);
    const el = await page.$('.ka-card') || await page.$('.ka-fb');
    await el.screenshot({ path: s.out });
    await page.close();
    console.log('render', s.name);
  }
  await browser.close();
  console.log('OK →', manifest.length, 'PNG em out/');
})().catch(e => { console.error(e); process.exit(1); });
