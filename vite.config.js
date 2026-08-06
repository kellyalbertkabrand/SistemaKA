import { defineConfig } from 'vite';

// Front-end simples (HTML/CSS/JS). O Vite serve o dev e gera a pasta /dist
// que o Netlify publica. As Netlify Functions ficam fora do bundle do Vite.
export default defineConfig({
  server: { port: 5173 },
  build: { outDir: 'dist', emptyOutDir: true },
});
