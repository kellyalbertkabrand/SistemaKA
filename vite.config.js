import { defineConfig, loadEnv } from 'vite';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

// Front-end simples (HTML/CSS/JS). O Vite serve o dev e gera a pasta /dist
// que o Netlify publica. As Netlify Functions ficam fora do bundle do Vite.
//
// Multi-cliente: VITE_CLIENTE escolhe a pasta clientes/<id>/ (marca, logo,
// ícones). Sem a variável, usa "schramm". Cada cliente tem o próprio site no
// Netlify e o próprio projeto Firebase (banco de dados separado).
export default defineConfig(async ({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_');
  const cliente = (env.VITE_CLIENTE || 'schramm').trim();
  const dir = resolve(__dirname, 'clientes', cliente);
  if (!existsSync(resolve(dir, 'config.js'))) {
    throw new Error(`VITE_CLIENTE="${cliente}": pasta clientes/${cliente}/config.js não encontrada.`);
  }
  const marca = (await import(pathToFileURL(resolve(dir, 'config.js')).href)).default;

  return {
    server: { port: 5173 },
    build: { outDir: 'dist', emptyOutDir: true },
    // Ícones e manifest do app vêm da pasta do cliente.
    publicDir: resolve(dir, 'public'),
    resolve: { alias: { '@cliente': dir } },
    plugins: [marcaNoHtml(marca)],
  };
});

// Aplica a marca no index.html: título, cor do navegador e as variáveis de cor
// do CSS (injetadas depois do styles.css, então sobrescrevem o padrão).
function marcaNoHtml(marca) {
  const c = marca.cores || {};
  const rgb = (hex) => {
    const h = String(hex || '').replace('#', '');
    const n = parseInt(h.length === 3 ? h.split('').map((x) => x + x).join('') : h, 16);
    return `${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}`;
  };
  const vars = [
    c.acento && `--acento: ${c.acento}; --acento-rgb: ${rgb(c.acento)};`,
    c.acentoEscuro && `--acento-escuro: ${c.acentoEscuro}; --acento-escuro-rgb: ${rgb(c.acentoEscuro)};`,
    c.acentoTint && `--acento-tint: ${c.acentoTint};`,
    c.fundo && `--bg: ${c.fundo};`,
  ].filter(Boolean).join(' ');
  const escHtml = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
  return {
    name: 'marca-cliente',
    transformIndexHtml(html) {
      return html
        .replaceAll('%MARCA_TITULO%', escHtml(marca.tituloApp || marca.nome))
        .replaceAll('%MARCA_COR%', escHtml(c.acento || '#c65a2e'))
        .replace('</head>', `  <style id="marca-cores">:root { ${vars} }</style>\n  </head>`);
    },
  };
}
