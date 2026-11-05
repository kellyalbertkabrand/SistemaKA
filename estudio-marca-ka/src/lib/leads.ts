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

export async function excluirLead(id: string): Promise<void> {
  await moverParaLixeira('leads', id)
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
