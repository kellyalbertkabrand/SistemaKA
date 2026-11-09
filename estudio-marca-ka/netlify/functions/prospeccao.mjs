// ============================================================================
// FUNÇÃO DE SERVIDOR (Netlify) — PROSPECÇÃO (aba Prospecção do SaaS).
//
// Duas ações, chamadas pelo front com POST { acao, ... }:
//
//  1) acao: "cnpj"   { cnpj }
//     Consulta os DADOS PÚBLICOS da Receita Federal pelo CNPJ (BrasilAPI e,
//     se falhar, Minha Receita — as duas são gratuitas e não pedem chave):
//     porte, capital social, data de abertura, Simples Nacional, CNAE,
//     situação, cidade/UF e sócios. É o que diz o TAMANHO da empresa.
//     (Faturamento NÃO é público no Brasil; porte + Simples + capital social
//     são os melhores sinais disponíveis.)
//
//  2) acao: "buscar" { termo, cidade, pagina? }
//     Busca empresas no GOOGLE MAPS (Places API — Text Search), ex.:
//     "clínica odontológica" em "Porto Alegre". Devolve nome, endereço, site,
//     telefone, nota e nº de avaliações (sinal de movimento/porte).
//     Precisa da variável GOOGLE_PLACES_API_KEY no Netlify.
//
// As chaves ficam SÓ aqui (variáveis de ambiente) — nunca vão para o navegador.
// ============================================================================

const CAMPOS_PLACES = [
  'places.id',
  'places.displayName',
  'places.formattedAddress',
  'places.websiteUri',
  'places.nationalPhoneNumber',
  'places.internationalPhoneNumber',
  'places.rating',
  'places.userRatingCount',
  'places.googleMapsUri',
  'places.primaryTypeDisplayName',
  'places.businessStatus',
  'nextPageToken',
].join(',')

export const handler = async (event) => {
  if (event.httpMethod !== 'POST') return resposta(405, { erro: 'Método não permitido.' })
  let dados = {}
  try {
    dados = JSON.parse(event.body || '{}')
  } catch {
    return resposta(400, { erro: 'Pedido inválido.' })
  }
  try {
    if (dados.acao === 'cnpj') return resposta(200, await consultarCnpj(dados.cnpj))
    if (dados.acao === 'buscar') return resposta(200, await buscarGoogle(dados))
    return resposta(400, { erro: 'Ação desconhecida.' })
  } catch (e) {
    return resposta(200, { erro: e instanceof Error ? e.message : String(e) })
  }
}

// ---- 1) CNPJ ---------------------------------------------------------------

async function consultarCnpj(cnpjBruto) {
  const cnpj = String(cnpjBruto || '').replace(/\D/g, '')
  if (cnpj.length !== 14) throw new Error('CNPJ precisa ter 14 números.')
  const fontes = [
    `https://brasilapi.com.br/api/cnpj/v1/${cnpj}`,
    `https://minhareceita.org/${cnpj}`,
  ]
  let ultimoErro = ''
  for (const url of fontes) {
    try {
      const r = await fetch(url, { headers: { Accept: 'application/json', 'User-Agent': 'EstudioKA/1.0' } })
      if (r.status === 404) throw new Error('CNPJ não encontrado na Receita.')
      if (!r.ok) {
        ultimoErro = `consulta respondeu ${r.status}`
        continue
      }
      return { receita: normalizarReceita(await r.json()) }
    } catch (e) {
      ultimoErro = e instanceof Error ? e.message : String(e)
      if (/não encontrado/.test(ultimoErro)) throw e
    }
  }
  throw new Error(`Não consegui consultar o CNPJ agora (${ultimoErro}). Tente de novo em instantes.`)
}

function normalizarReceita(d) {
  const socios = (d.qsa || []).map((s) => ({
    nome: s.nome_socio || s.nome || '',
    qualificacao: s.qualificacao_socio || s.qualificacao || '',
  }))
  return {
    cnpj: String(d.cnpj || '').replace(/\D/g, ''),
    razao_social: d.razao_social || '',
    nome_fantasia: d.nome_fantasia || '',
    porte: d.porte || d.descricao_porte || '',
    capital_social: typeof d.capital_social === 'number' ? d.capital_social : Number(d.capital_social) || 0,
    abertura: d.data_inicio_atividade || '',
    simples: d.opcao_pelo_simples === true ? true : d.opcao_pelo_simples === false ? false : null,
    mei: d.opcao_pelo_mei === true,
    cnae: [d.cnae_fiscal, d.cnae_fiscal_descricao].filter(Boolean).join(' · '),
    situacao: d.descricao_situacao_cadastral || d.situacao_cadastral || '',
    cidade: d.municipio || '',
    uf: d.uf || '',
    telefone: d.ddd_telefone_1 || '',
    email: d.email || '',
    socios,
  }
}

// ---- 2) Google Maps --------------------------------------------------------

async function buscarGoogle({ termo, cidade, pagina }) {
  const chave = (process.env.GOOGLE_PLACES_API_KEY || '').trim()
  if (!chave) {
    return {
      erro:
        'A busca no Google Maps ainda não está ligada. Crie uma chave da "Places API (New)" no ' +
        'Google Cloud e cadastre no Netlify a variável GOOGLE_PLACES_API_KEY (escopo Functions). ' +
        'Depois é só publicar de novo.',
    }
  }
  const q = [String(termo || '').trim(), cidade ? `em ${String(cidade).trim()}` : ''].filter(Boolean).join(' ')
  if (!q) throw new Error('Diga o que buscar (ex.: clínica odontológica).')
  const corpo = { textQuery: q, languageCode: 'pt-BR', regionCode: 'BR', pageSize: 20 }
  if (pagina) corpo.pageToken = pagina
  const r = await fetch('https://places.googleapis.com/v1/places:searchText', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': chave,
      'X-Goog-FieldMask': CAMPOS_PLACES,
    },
    body: JSON.stringify(corpo),
  })
  const j = await r.json().catch(() => ({}))
  if (!r.ok) throw new Error(j?.error?.message || `Google respondeu ${r.status}.`)
  const empresas = (j.places || [])
    .filter((p) => p.businessStatus !== 'CLOSED_PERMANENTLY')
    .map((p) => {
      const end = p.formattedAddress || ''
      const m = end.match(/,\s*([^,]+?)\s*-\s*([A-Z]{2})\s*,/)
      return {
        place_id: p.id,
        empresa: p.displayName?.text || '',
        endereco: end,
        cidade: m ? m[1] : '',
        uf: m ? m[2] : '',
        site: p.websiteUri || '',
        telefone: p.nationalPhoneNumber || p.internationalPhoneNumber || '',
        rating: p.rating ?? null,
        avaliacoes: p.userRatingCount ?? 0,
        maps_url: p.googleMapsUri || '',
        categoria: p.primaryTypeDisplayName?.text || '',
      }
    })
  return { empresas, proxima: j.nextPageToken || null }
}

function resposta(status, corpo) {
  return {
    statusCode: status,
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify(corpo),
  }
}
