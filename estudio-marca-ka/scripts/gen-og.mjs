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

/**
 * Troca um <meta> pelo nome do atributo. O `\s+` é essencial: no index.html os
 * atributos ficam em LINHAS separadas (`<meta\n  name="description"\n
 * content="…" />`), e um regex sem isso não casa — era por isso que a DESCRIÇÃO
 * da prévia continuava a genérica do app (só o título trocava).
 */
function trocarMeta(html, attr, nome, valor) {
  const re = new RegExp(`(<meta\\s+${attr}="${nome}"\\s+content=")[^"]*(")`, 'i')
  return html.replace(re, `$1${valor}$2`)
}

/** Troca os metadados de preview do HTML por novos valores. */
function comMeta(html, { titulo, descricao }) {
  let saida = html.replace(/<title>[\s\S]*?<\/title>/, `<title>${titulo}</title>`)
  saida = trocarMeta(saida, 'name', 'description', descricao)
  saida = trocarMeta(saida, 'property', 'og:title', titulo)
  saida = trocarMeta(saida, 'property', 'og:description', descricao)
  saida = trocarMeta(saida, 'property', 'og:site_name', 'Kelly Albert · KA')
  saida = trocarMeta(saida, 'name', 'twitter:title', titulo)
  saida = trocarMeta(saida, 'name', 'twitter:description', descricao)
  return saida
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
