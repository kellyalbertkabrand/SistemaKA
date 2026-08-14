// Pós-build: gera páginas HTML com metadados próprios (Open Graph) para as rotas
// públicas cujo LINK aparece com prévia no WhatsApp/redes. Como o app é um SPA
// (o WhatsApp não roda JavaScript), cada preview precisa de um HTML estático com
// os <meta> certos. O HTML gerado é uma cópia do index.html (mesmos bundles), só
// com título/descrição trocados; o React continua carregando normalmente.
//
// O redirecionamento /formulario/* -> /formulario.html está em public/_redirects.

import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

const dist = resolve('dist')
const index = readFileSync(resolve(dist, 'index.html'), 'utf8')

/** Troca os metadados de preview do HTML por novos valores. */
function comMeta(html, { titulo, descricao }) {
  return html
    .replace(/<title>[\s\S]*?<\/title>/, `<title>${titulo}</title>`)
    .replace(/(<meta name="description" content=")[^"]*(")/, `$1${descricao}$2`)
    .replace(/(<meta property="og:title" content=")[^"]*(")/, `$1${titulo}$2`)
    .replace(/(<meta property="og:description" content=")[^"]*(")/, `$1${descricao}$2`)
    .replace(/(<meta property="og:site_name" content=")[^"]*(")/, `$1Kelly Albert · KA$2`)
    .replace(/(<meta name="twitter:title" content=")[^"]*(")/, `$1${titulo}$2`)
    .replace(/(<meta name="twitter:description" content=")[^"]*(")/, `$1${descricao}$2`)
}

const paginas = [
  {
    arquivo: 'formulario.html',
    titulo: 'IKIGAI Empresarial | Projeto Marca com Essência© · Etapa 01',
    descricao:
      'Preencha esta etapa do seu projeto de marca. Suas respostas ficam salvas ' +
      'automaticamente: pode parar e continuar depois pelo mesmo link.',
  },
]

for (const p of paginas) {
  writeFileSync(resolve(dist, p.arquivo), comMeta(index, p))
  console.log(`gerado dist/${p.arquivo}`)
}
