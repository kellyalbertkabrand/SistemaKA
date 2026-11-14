// ============================================================================
// LEADS — contatos que chegam pelas ferramentas do site kellyalbert.com.br.
// Hoje são DUAS, e o painel separa uma da outra pelo campo `ferramenta`:
//   • Teste "O que sua marca entrega × O que seu cliente enxerga"
//     (/valorpercebido) — tem nota, perfil e as 11 respostas;
//   • Formulário "Posicionamento de Marca" (/projetodeposicionamento) —
//     tem tipo de negócio, nº de funcionários e faixa de investimento.
// Quem GRAVA é a Netlify Function `salvar-lead` do site (coleção `leads`
// deste Firestore); aqui o app só LÊ, acompanha o status do contato e guarda
// anotações da KA.
// ============================================================================

import { collection, doc, getDocs, orderBy, query, setDoc, updateDoc } from 'firebase/firestore'
import { db } from './firebase'
import { moverParaLixeira } from './lixeira'

export type StatusLead = 'novo' | 'contatado' | 'inscrito' | 'sem_interesse'

export const STATUS_LEAD: { valor: StatusLead; rotulo: string }[] = [
  { valor: 'novo', rotulo: 'Novo' },
  { valor: 'contatado', rotulo: 'Contatado' },
  { valor: 'inscrito', rotulo: 'Inscrito na aula' },
  { valor: 'sem_interesse', rotulo: 'Sem interesse' },
]

export function rotuloStatusLead(s: string | null | undefined): string {
  return STATUS_LEAD.find((x) => x.valor === s)?.rotulo ?? 'Novo'
}

export type FerramentaLead = 'teste' | 'formulario' | 'newsletter'

export const FERRAMENTAS: { valor: FerramentaLead; rotulo: string }[] = [
  { valor: 'teste', rotulo: 'Teste · Valor Percebido' },
  { valor: 'formulario', rotulo: 'Formulário · Posicionamento' },
  { valor: 'newsletter', rotulo: 'Newsletter · MailerLite' },
]

/** O que vai no campo `ferramenta` de quem veio da lista de e-mails. */
export const FERRAMENTA_NEWSLETTER = 'Newsletter MailerLite'

export function rotuloFerramenta(f: FerramentaLead): string {
  return FERRAMENTAS.find((x) => x.valor === f)?.rotulo ?? ''
}

/**
 * De qual ferramenta do site veio o lead.
 *
 * Reconhece o Formulário pelo nome da ferramenta OU pela origem
 * (/projetodeposicionamento) — duas pistas, porque quem escreve o campo é o
 * site, e um ajuste de texto lá não pode sumir com o lead da tela.
 * ⚠️ Todo o resto cai no TESTE, inclusive os leads ANTIGOS (gravados antes de
 * existir o campo `ferramenta`): o teste era a única ferramenta na época.
 */
export function ferramentaDe(l: Lead): FerramentaLead {
  const texto = `${l.ferramenta ?? ''} ${l.origem ?? ''}`
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
  if (texto.includes('posicionamento')) return 'formulario'
  if (texto.includes('mailerlite') || texto.includes('newsletter')) return 'newsletter'
  return 'teste'
}

/**
 * Pega uma resposta do formulário pelo id ("Q1"…) e, se não achar, pelo texto
 * da pergunta — o id é o combinado, o texto é o seguro contra renumeração.
 */
export function respostaDe(l: Lead, id: string, termoPergunta: string): string {
  const rs = l.respostas ?? []
  const porId = rs.find((r) => (r.id || '').toUpperCase() === id.toUpperCase())
  if (porId?.resposta) return porId.resposta
  const termo = termoPergunta.toLowerCase()
  return rs.find((r) => (r.pergunta || '').toLowerCase().includes(termo))?.resposta ?? ''
}

/** Formulário de Posicionamento: os três campos que a KA usa para qualificar. */
export function tipoNegocio(l: Lead): string {
  return (l.segmento || respostaDe(l, 'Q1', 'tipo do neg')).trim()
}
export function funcionarios(l: Lead): string {
  return respostaDe(l, 'Q2', 'funcion').trim()
}
export function investimento(l: Lead): string {
  return respostaDe(l, 'Q3', 'investimento').trim()
}

export interface RespostaLead {
  id: string
  pergunta: string
  resposta: string
  pontos: number
}

export interface Lead {
  id: string
  criado_em: string
  ferramenta?: string | null
  nome: string
  email?: string | null
  whatsapp?: string | null
  segmento?: string | null
  consentimento?: boolean
  valor_real?: number | null
  valor_percebido?: number | null
  distancia?: number | null
  perfil?: string | null
  respostas?: RespostaLead[]
  origem?: string | null
  utm_source?: string | null
  utm_medium?: string | null
  utm_campaign?: string | null
  status?: StatusLead | null
  nota?: string | null
  excluido_em?: string | null
  // Repetição do teste (a função do site atualiza o lead em vez de criar outro)
  testes?: number | null
  ultimo_teste_em?: string | null
  refez_em?: string | null
  historico?: ResultadoAnterior[] | null
  // Newsletter (MailerLite): engajamento da pessoa na lista de e-mails
  ml_enviados?: number | null
  ml_aberturas?: number | null
  ml_cliques?: number | null
  ml_local?: string | null
  // Preenchidos no app ao juntar registros da mesma pessoa (não vão ao banco)
  ids_extras?: string[]
  primeiro_em?: string
}

export interface ResultadoAnterior {
  data?: string | null
  valor_real?: number | null
  valor_percebido?: number | null
  distancia?: number | null
  perfil?: string | null
  segmento?: string | null
}

// Quando a pessoa fez o teste pela última vez.
export function ultimaAtividade(l: Lead): string {
  return l.ultimo_teste_em || l.criado_em || ''
}

// Junta os registros da MESMA pessoa (mesmo e-mail OU mesmo WhatsApp) numa
// linha só: vale o resultado mais recente, `testes` soma todos e o histórico
// guarda os resultados anteriores. Cobre registros antigos, de antes de a
// função do site passar a atualizar o lead existente.
//
// ⚠️ Junta SEPARADAMENTE por ferramenta: quem fez o teste E preencheu o
// formulário são dois registros da mesma pessoa, mas cada um pertence a uma
// aba. Misturá-los faria o lead do formulário sumir atrás do do teste.
export function agruparLeads(lista: Lead[]): Lead[] {
  const porFerramenta = new Map<FerramentaLead, Lead[]>()
  for (const l of lista) {
    const f = ferramentaDe(l)
    porFerramenta.set(f, [...(porFerramenta.get(f) ?? []), l])
  }
  const saida: Lead[] = []
  porFerramenta.forEach((g) => saida.push(...agruparMesmaFerramenta(g)))
  return saida.sort((a, b) => (ultimaAtividade(b) > ultimaAtividade(a) ? 1 : -1))
}

function agruparMesmaFerramenta(lista: Lead[]): Lead[] {
  const pai = lista.map((_, i) => i)
  const raiz = (i: number): number => (pai[i] === i ? i : (pai[i] = raiz(pai[i])))
  const unir = (a: number, b: number) => { pai[raiz(a)] = raiz(b) }
  const porChave = new Map<string, number>()
  lista.forEach((l, i) => {
    const chaves = [
      l.email ? 'e:' + l.email.trim().toLowerCase() : '',
      (l.whatsapp || '').replace(/\D/g, '').length >= 10 ? 'w:' + (l.whatsapp || '').replace(/\D/g, '') : '',
    ].filter(Boolean)
    for (const c of chaves) {
      const j = porChave.get(c)
      if (j === undefined) porChave.set(c, i)
      else unir(i, j)
    }
  })
  const grupos = new Map<number, Lead[]>()
  lista.forEach((l, i) => {
    const r = raiz(i)
    grupos.set(r, [...(grupos.get(r) ?? []), l])
  })
  const saida: Lead[] = []
  grupos.forEach((g) => {
    g.sort((a, b) => (ultimaAtividade(b) > ultimaAtividade(a) ? 1 : -1))
    const [principal, ...outros] = g
    const historico: ResultadoAnterior[] = [...(principal.historico ?? [])]
    for (const o of outros) {
      historico.push(...(o.historico ?? []))
      historico.push({
        data: ultimaAtividade(o), valor_real: o.valor_real, valor_percebido: o.valor_percebido,
        distancia: o.distancia, perfil: o.perfil, segmento: o.segmento,
      })
    }
    historico.sort((a, b) => ((b.data || '') > (a.data || '') ? 1 : -1))
    const testes = g.reduce((t, l) => t + (typeof l.testes === 'number' && l.testes > 0 ? l.testes : 1), 0)
    const primeiro = g.map((l) => l.criado_em).filter(Boolean).sort()[0] || principal.criado_em
    // status/anotação: os do registro principal; se ele ainda está "novo",
    // aproveita o andamento que a KA já deu num registro antigo.
    const comStatus = g.find((l) => l.status && l.status !== 'novo')
    saida.push({
      ...principal,
      status: principal.status && principal.status !== 'novo' ? principal.status : (comStatus?.status ?? principal.status),
      nota: principal.nota || g.map((l) => l.nota).find(Boolean) || null,
      testes,
      historico,
      ids_extras: outros.map((o) => o.id),
      primeiro_em: primeiro,
    })
  })
  return saida.sort((a, b) => (ultimaAtividade(b) > ultimaAtividade(a) ? 1 : -1))
}

export async function listarLeads(): Promise<Lead[]> {
  const snap = await getDocs(query(collection(db, 'leads'), orderBy('criado_em', 'desc')))
  return snap.docs
    .filter((d) => !d.data().excluido_em)
    .map((d) => ({ id: d.id, ...(d.data() as Omit<Lead, 'id'>) }))
}

// ============================================================================
// IMPORTAR A LISTA DO MAILERLITE
//
// A KA exporta os assinantes ativos no MailerLite e sobe o CSV aqui. São
// pessoas de outra natureza: têm e-mail e engajamento (enviados/aberturas/
// cliques), mas NÃO têm nome, WhatsApp nem resultado de ferramenta — por isso
// vivem numa aba própria.
// ============================================================================

/** Uma linha do CSV do MailerLite, já limpa. */
export interface LinhaMailerLite {
  email: string
  enviados: number
  aberturas: number
  cliques: number
  inscrito_em: string
  local: string
}

/**
 * Lê o CSV exportado pelo MailerLite.
 *
 * Trata campo entre aspas (as datas vêm assim) e acha as colunas pelo
 * CABEÇALHO, não pela posição — se o MailerLite mudar a ordem ou acrescentar
 * uma coluna, a importação continua certa.
 */
export function lerCsvMailerLite(texto: string): LinhaMailerLite[] {
  const linhas = texto.replace(/\r/g, '').split('\n').filter((l) => l.trim())
  if (!linhas.length) return []

  const celulas = (linha: string): string[] => {
    const out: string[] = []
    let atual = ''
    let aspas = false
    for (let i = 0; i < linha.length; i++) {
      const c = linha[i]
      if (c === '"') {
        // "" dentro de aspas é uma aspa de verdade
        if (aspas && linha[i + 1] === '"') { atual += '"'; i++ } else aspas = !aspas
      } else if (c === ',' && !aspas) {
        out.push(atual); atual = ''
      } else atual += c
    }
    out.push(atual)
    return out.map((v) => v.trim())
  }

  const cab = celulas(linhas[0]).map((h) => h.toLowerCase())
  const col = (...nomes: string[]) => {
    for (const n of nomes) {
      const i = cab.findIndex((h) => h === n)
      if (i >= 0) return i
    }
    return -1
  }
  const iEmail = col('subscriber', 'email', 'e-mail')
  const iEnv = col('sent', 'enviados')
  const iAb = col('opens', 'aberturas')
  const iCl = col('clicks', 'cliques')
  const iData = col('subscribed', 'inscrito', 'data')
  const iLocal = col('location', 'local')
  if (iEmail < 0) return []

  const num = (v: string | undefined) => {
    const n = Number((v ?? '').replace(/\D/g, ''))
    return Number.isFinite(n) ? n : 0
  }

  const vistos = new Set<string>()
  const saida: LinhaMailerLite[] = []
  for (const linha of linhas.slice(1)) {
    const c = celulas(linha)
    const email = (c[iEmail] ?? '').toLowerCase()
    if (!email.includes('@') || vistos.has(email)) continue
    vistos.add(email)
    saida.push({
      email,
      enviados: num(c[iEnv]),
      aberturas: num(c[iAb]),
      cliques: num(c[iCl]),
      // "2026-07-27 20:40:40" → "2026-07-27T20:40:40" (ordena e formata igual)
      inscrito_em: (c[iData] ?? '').trim().replace(' ', 'T'),
      local: (c[iLocal] ?? '').trim(),
    })
  }
  return saida
}

/** Id fixo por e-mail: reimportar ATUALIZA em vez de duplicar. */
function idDoAssinante(email: string): string {
  return 'ml-' + email.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

export interface ResultadoImportacao {
  incluidos: number
  atualizados: number
  jaEramLeads: string[]
}

/**
 * Grava os assinantes na coleção `leads`.
 *
 * ⚠️ Idempotente de propósito: o id vem do e-mail, então subir o MESMO arquivo
 * de novo (ou a exportação do mês que vem) atualiza o engajamento em vez de
 * criar cópias. E, ao atualizar, NÃO mexe em `status` nem em `nota` — o
 * andamento que a KA deu continua valendo.
 */
export async function importarMailerLite(linhas: LinhaMailerLite[]): Promise<ResultadoImportacao> {
  const existentes = await listarLeads()
  const porId = new Map(existentes.map((l) => [l.id, l]))
  // Quem já chegou pelo teste/formulário — vale avisar, é gente mais quente.
  const emailsDeFerramenta = new Set(
    existentes
      .filter((l) => ferramentaDe(l) !== 'newsletter' && l.email)
      .map((l) => (l.email as string).toLowerCase()),
  )

  let incluidos = 0
  let atualizados = 0
  const jaEramLeads: string[] = []

  for (const a of linhas) {
    const id = idDoAssinante(a.email)
    const novo = !porId.has(id)
    const dados: Record<string, unknown> = {
      ferramenta: FERRAMENTA_NEWSLETTER,
      origem: 'mailerlite',
      email: a.email,
      ml_enviados: a.enviados,
      ml_aberturas: a.aberturas,
      ml_cliques: a.cliques,
      ml_local: a.local || null,
      atualizado_em: new Date().toISOString(),
    }
    if (novo) {
      // Sem nome no CSV: o e-mail é o que temos, e é honesto mostrá-lo.
      dados.nome = a.email
      dados.criado_em = a.inscrito_em || new Date().toISOString()
      dados.status = 'novo'
      dados.excluido_em = null
    }
    await setDoc(doc(db, 'leads', id), dados, { merge: true })
    if (novo) incluidos++
    else atualizados++
    if (emailsDeFerramenta.has(a.email)) jaEramLeads.push(a.email)
  }
  return { incluidos, atualizados, jaEramLeads }
}

export async function atualizarLead(
  id: string,
  dados: Partial<Pick<Lead, 'status' | 'nota'>>,
): Promise<void> {
  await updateDoc(doc(db, 'leads', id), { ...dados, atualizado_em: new Date().toISOString() })
}

export async function excluirLead(id: string, extras: string[] = []): Promise<void> {
  await Promise.all([id, ...extras].map((x) => moverParaLixeira('leads', x)))
}

/** DD/MM/AAAA HH:MM a partir do ISO (vazio vira "-"). */
function quando(iso: string | null | undefined): string {
  if (!iso) return '-'
  const d = new Date(iso)
  return `${d.toLocaleDateString('pt-BR')} ${d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`
}

/**
 * O RESULTADO INTEIRO da pessoa em texto, para a KA ler, copiar e avaliar
 * (sozinha ou mandando para alguém). Junta o que está espalhado pela ficha:
 * contato, resultado, TODAS as respostas com os pontos, o histórico de quem
 * refez e de onde a pessoa veio.
 *
 * `*asteriscos*` são o negrito do WhatsApp — é para lá que esse texto vai na
 * maioria das vezes; colado em qualquer outro lugar, continua legível.
 */
export function textoDoLead(l: Lead): string {
  const ferr = ferramentaDe(l)
  const form = ferr === 'formulario'
  const news = ferr === 'newsletter'
  const linhas: string[] = []

  linhas.push(`*${l.nome}*`)
  linhas.push(
    news
      ? 'Newsletter: assinante da lista (MailerLite)'
      : form
        ? 'Formulário: Posicionamento de Marca'
        : 'Teste: o que sua marca entrega × o que seu cliente enxerga',
  )
  linhas.push(`${news ? 'Assinante desde' : form ? 'Enviado em' : 'Feito em'} ${quando(ultimaAtividade(l))}`)
  if (!form && !news && (l.testes ?? 1) > 1) {
    linhas.push(`Refez o teste ${l.testes}× · o primeiro em ${quando(l.primeiro_em || l.criado_em)}`)
  }

  // No formulário o segmento É a 1ª resposta, então não se repete aqui.
  const contato = [
    l.whatsapp && `WhatsApp: ${l.whatsapp}`,
    l.email && `E-mail: ${l.email}`,
    !form && !news && l.segmento && `Segmento: ${l.segmento}`,
  ].filter(Boolean) as string[]
  if (contato.length) linhas.push('', '*CONTATO*', ...contato)

  if (news) {
    linhas.push('', '*ENGAJAMENTO NA LISTA*')
    linhas.push(`E-mails enviados: ${l.ml_enviados ?? 0}`)
    linhas.push(`Aberturas: ${l.ml_aberturas ?? 0}`)
    linhas.push(`Cliques: ${l.ml_cliques ?? 0}`)
    if (l.ml_local) linhas.push(`Local: ${l.ml_local}`)
  } else if (!form) {
    linhas.push('', '*RESULTADO*')
    linhas.push(`Valor real (o que a marca entrega): ${l.valor_real ?? '-'}%`)
    linhas.push(`Valor percebido (o que o cliente enxerga): ${l.valor_percebido ?? '-'}%`)
    if (l.distancia != null) linhas.push(`Distância: ${l.distancia} pontos`)
    if (l.perfil) linhas.push(`Perfil: ${l.perfil}`)
  }

  // Respostas: no teste vão em dois blocos com os pontos; no formulário é a
  // pergunta e a resposta, sem pontuação (não existe nota ali).
  const rs = l.respostas ?? []
  if (form) {
    // Se por algum motivo as respostas não vierem, monta pelos campos lidos.
    const itens = rs.length
      ? rs.map((r) => `${r.pergunta}: ${r.resposta || '-'}`)
      : ([
          tipoNegocio(l) && `Tipo do negócio: ${tipoNegocio(l)}`,
          funcionarios(l) && `Número de funcionários: ${funcionarios(l)}`,
          investimento(l) && `Faixa de investimento: ${investimento(l)}`,
        ].filter(Boolean) as string[])
    if (itens.length) linhas.push('', '*RESPOSTAS*', ...itens)
  } else if (!news && rs.length) {
    {
      const num = (r: RespostaLead) => Number((r.id || '').replace(/\D/g, ''))
      const blocos: [string, RespostaLead[]][] = [
        ['Bloco 1 · Valor real', rs.filter((r) => num(r) <= 6)],
        ['Bloco 2 · Valor percebido', rs.filter((r) => num(r) > 6)],
      ]
      linhas.push('', `*RESPOSTAS*${(l.testes ?? 1) > 1 ? ' (do teste mais recente)' : ''}`)
      for (const [titulo, itens] of blocos) {
        if (!itens.length) continue
        linhas.push('', titulo)
        for (const r of itens) {
          linhas.push(`• ${r.pergunta}`, `  ${r.resposta} (${r.pontos} ${r.pontos === 1 ? 'ponto' : 'pontos'})`)
        }
      }
    }
  }

  if (!form && !news && (l.historico ?? []).length) {
    linhas.push('', '*TESTES ANTERIORES*')
    for (const h of l.historico ?? []) {
      linhas.push(
        `${quando(h.data)}: ${h.valor_real ?? '-'}% × ${h.valor_percebido ?? '-'}%` +
          (h.perfil ? ` · ${h.perfil}` : ''),
      )
    }
  }

  const origem = [
    l.origem && `Página: ${l.origem}`,
    l.utm_source && `Origem: ${l.utm_source}`,
    l.utm_medium && `Meio: ${l.utm_medium}`,
    l.utm_campaign && `Campanha: ${l.utm_campaign}`,
  ].filter(Boolean) as string[]
  if (origem.length) linhas.push('', '*DE ONDE VEIO*', ...origem)

  if (l.nota) linhas.push('', '*ANOTAÇÃO*', l.nota)

  return linhas.join('\n')
}

// Mensagem pronta para o primeiro contato no WhatsApp. Muda conforme a
// ferramenta: no teste ela já cita o resultado da pessoa; no formulário, o
// negócio que ela descreveu.
export function mensagemLead(l: Lead): string {
  const primeiro = (l.nome || '').trim().split(/\s+/)[0] || ''
  const partes = [`Oi, ${primeiro}! Aqui é a Kelly Albert.`]

  if (ferramentaDe(l) === 'newsletter') {
    partes.push('Vi que você acompanha os meus e-mails sobre marca.')
    partes.push('Posso te mostrar o que dá para fazer com o posicionamento da sua?')
    return partes.join('\n\n')
  }

  if (ferramentaDe(l) === 'formulario') {
    const negocio = tipoNegocio(l)
    partes.push(
      negocio
        ? `Recebi o seu formulário sobre o posicionamento da sua marca (*${negocio}*).`
        : 'Recebi o seu formulário sobre o posicionamento da sua marca.',
    )
    partes.push('Posso te contar como funciona o trabalho e o que faria sentido no seu caso?')
    return partes.join('\n\n')
  }

  if (l.valor_real != null && l.valor_percebido != null) {
    partes.push(
      `Vi o seu resultado no teste: sua marca entrega *${l.valor_real}%* e o seu cliente enxerga *${l.valor_percebido}%*` +
        (l.perfil ? ` (perfil *${l.perfil}*).` : '.'),
    )
  }
  partes.push('Posso te contar o que dá para fazer para diminuir essa distância?')
  return partes.join('\n\n')
}
