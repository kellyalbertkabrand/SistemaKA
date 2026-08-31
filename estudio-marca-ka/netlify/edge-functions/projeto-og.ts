// ============================================================================
// PRÉVIA DO LINK DO PROJETO (WhatsApp, Instagram, LinkedIn…)
//
// O app é um SPA: o WhatsApp não roda JavaScript, então ele lê só o HTML que
// chega do servidor. Sem isso, todo link de projeto aparecia com o título
// genérico do app ("Sistema Visual de Publicações da Marca · KA").
//
// Esta função roda NA BORDA (antes de servir a página) e troca o título e a
// descrição do HTML pelo nome do cliente daquele projeto:
//
//     Painel de Controle de Projeto · Boba Joy
//
// De onde vem o nome, em ordem: o campo `cliente_nome` do projeto (consulta
// pública no Firestore, a mesma que a página do cliente faz) e, se a consulta
// falhar ou demorar, o próprio apelido da URL ("boba-joy" → "Boba Joy").
// Nunca quebra a página: em qualquer erro, devolve o HTML original.
// ============================================================================

import type { Config, Context } from 'https://edge.netlify.com'

const PROJETO_FIREBASE = 'estudio-de-marcas-ka'
// Chave pública da config web do Firebase (identifica o projeto; não é segredo
// — a segurança vem das regras do Firestore).
const API_KEY = 'AIzaSyB0wvONtPSbE8dleIYlzmWxeylVxfkZGm0'
const REST = `https://firestore.googleapis.com/v1/projects/${PROJETO_FIREBASE}/databases/(default)/documents:runQuery?key=${API_KEY}`

const TITULO_BASE = 'Painel de Controle de Projeto'
const DESCRICAO =
  'Acompanhe em tempo real cada etapa do seu projeto de marca com a KA | ' +
  'Inteligência para Marcas.'

/** "boba-joy" → "Boba Joy" (reserva, quando a consulta não responde). */
function nomeDoApelido(param: string): string {
  const semCodigo = param.replace(/-[0-9a-f]{16,}$/i, '')
  return semCodigo
    .split('-')
    .filter(Boolean)
    .map((p) => (p.length > 2 ? p[0].toUpperCase() + p.slice(1) : p))
    .join(' ')
    .trim()
}

/** Busca o nome do cliente pelo que veio na URL (apelido ou código antigo). */
async function nomeDoCliente(param: string, sinal: AbortSignal): Promise<string | null> {
  const consulta = (campo: string, valor: string) => ({
    structuredQuery: {
      from: [{ collectionId: 'projetos' }],
      where: {
        fieldFilter: {
          field: { fieldPath: campo },
          op: 'EQUAL',
          value: { stringValue: valor },
        },
      },
      select: { fields: [{ fieldPath: 'cliente_nome' }, { fieldPath: 'nome' }] },
      limit: 1,
    },
  })

  // Aceita os três formatos de link: /boba-joy, /boba-joy-<código> e /<código>.
  const corte = param.lastIndexOf('-')
  const tentativas = [
    consulta('slug', param),
    consulta('token', param),
    ...(corte > 0 ? [consulta('token', param.slice(corte + 1))] : []),
  ]

  for (const body of tentativas) {
    const r = await fetch(REST, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
      signal: sinal,
    })
    if (!r.ok) continue
    const dados = await r.json()
    const campos = Array.isArray(dados) ? dados[0]?.document?.fields : null
    if (!campos) continue
    const nome = campos.cliente_nome?.stringValue || campos.nome?.stringValue
    if (nome) return String(nome)
  }
  return null
}

function escapar(v: string): string {
  return v.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

/**
 * Troca um <meta> pelo nome do atributo. O `\s+` é essencial: no index.html os
 * atributos ficam em LINHAS separadas (`<meta\n name="description"\n
 * content="…" />`), e um regex sem isso simplesmente não casa — foi o que fazia
 * a descrição continuar genérica na prévia.
 */
function trocarMeta(html: string, attr: string, nome: string, valor: string): string {
  const re = new RegExp(`(<meta\\s+${attr}="${nome}"\\s+content=")[^"]*(")`, 'i')
  return html.replace(re, `$1${valor}$2`)
}

/** Troca os metadados de prévia do HTML. */
function comMeta(html: string, titulo: string, descricao: string): string {
  const t = escapar(titulo)
  const d = escapar(descricao)
  let saida = html.replace(/<title>[\s\S]*?<\/title>/, `<title>${t}</title>`)
  saida = trocarMeta(saida, 'name', 'description', d)
  saida = trocarMeta(saida, 'property', 'og:title', t)
  saida = trocarMeta(saida, 'property', 'og:description', d)
  saida = trocarMeta(saida, 'property', 'og:site_name', 'Kelly Albert · KA')
  saida = trocarMeta(saida, 'name', 'twitter:title', t)
  saida = trocarMeta(saida, 'name', 'twitter:description', d)
  return saida
}

export default async (request: Request, context: Context) => {
  const resposta = await context.next()
  // Só mexe em página HTML (não em bundle, imagem ou fonte).
  if (!(resposta.headers.get('content-type') || '').includes('text/html')) return resposta

  try {
    const caminho = new URL(request.url).pathname
    const param = decodeURIComponent(caminho.replace(/^\/projeto\/?/, '').replace(/\/+$/, ''))
    if (!param) return resposta

    // A prévia não pode segurar a página: 2,5s e segue com o nome do apelido.
    const relogio = new AbortController()
    const limite = setTimeout(() => relogio.abort(), 2500)
    let cliente: string | null = null
    try {
      cliente = await nomeDoCliente(param, relogio.signal)
    } catch {
      /* sem rede/tempo esgotado: usa o apelido da URL */
    } finally {
      clearTimeout(limite)
    }
    const nome = cliente || nomeDoApelido(param)
    const titulo = nome ? `${TITULO_BASE} · ${nome}` : TITULO_BASE

    const html = await resposta.text()
    return new Response(comMeta(html, titulo, DESCRICAO), {
      status: resposta.status,
      headers: resposta.headers,
    })
  } catch {
    // Qualquer imprevisto: entrega a página como veio.
    return resposta
  }
}

export const config: Config = { path: '/projeto/*' }
