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

import { collection, doc, getDocs, orderBy, query, updateDoc } from 'firebase/firestore'
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

export type FerramentaLead = 'teste' | 'formulario'

export const FERRAMENTAS: { valor: FerramentaLead; rotulo: string }[] = [
  { valor: 'teste', rotulo: 'Teste · Valor Percebido' },
  { valor: 'formulario', rotulo: 'Formulário · Posicionamento' },
]

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

export async function atualizarLead(
  id: string,
  dados: Partial<Pick<Lead, 'status' | 'nota'>>,
): Promise<void> {
  await updateDoc(doc(db, 'leads', id), { ...dados, atualizado_em: new Date().toISOString() })
}

export async function excluirLead(id: string, extras: string[] = []): Promise<void> {
  await Promise.all([id, ...extras].map((x) => moverParaLixeira('leads', x)))
}

// Mensagem pronta para o primeiro contato no WhatsApp. Muda conforme a
// ferramenta: no teste ela já cita o resultado da pessoa; no formulário, o
// negócio que ela descreveu.
export function mensagemLead(l: Lead): string {
  const primeiro = (l.nome || '').trim().split(/\s+/)[0] || ''
  const partes = [`Oi, ${primeiro}! Aqui é a Kelly Albert.`]

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
