// ============================================================================
// LEADS — contatos que chegam pelas ferramentas do site kellyalbert.com.br
// (hoje: o Teste "O que sua marca entrega × O que seu cliente enxerga", em
// /valorpercebido). Quem GRAVA é a Netlify Function `salvar-lead` do site
// (coleção `leads` deste Firestore); aqui o app só LÊ, acompanha o status do
// contato e guarda anotações da KA.
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
export function agruparLeads(lista: Lead[]): Lead[] {
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

// Mensagem pronta para o primeiro contato no WhatsApp, a partir do resultado.
export function mensagemLead(l: Lead): string {
  const primeiro = (l.nome || '').trim().split(/\s+/)[0] || ''
  const partes = [`Oi, ${primeiro}! Aqui é a Kelly Albert.`]
  if (l.valor_real != null && l.valor_percebido != null) {
    partes.push(
      `Vi o seu resultado no teste: sua marca entrega *${l.valor_real}%* e o seu cliente enxerga *${l.valor_percebido}%*` +
        (l.perfil ? ` (perfil *${l.perfil}*).` : '.'),
    )
  }
  partes.push('Posso te contar o que dá para fazer para diminuir essa distância?')
  return partes.join('\n\n')
}
