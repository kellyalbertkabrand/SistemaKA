import { addDoc, collection, doc, getDocs, orderBy, query, updateDoc } from 'firebase/firestore'
import { db } from './firebase'
import { moverParaLixeira } from './lixeira'

// ============================================================================
// CAIXA — gestor financeiro PESSOAL da KA: entradas e saídas lançadas à mão.
// Junto com as cobranças (aba Cobranças), forma o fluxo de caixa: cobrança
// PAGA vira uma entrada automática; aqui a KA acrescenta outras entradas
// (ex.: um trabalho fora do sistema) e as saídas (despesas).
// ============================================================================

export type TipoLancamento = 'entrada' | 'saida'
// Escopo do dinheiro: da KA (negócio de design) ou pessoal da Kelly.
export type EscopoLancamento = 'ka' | 'pessoal'

export interface Lancamento {
  id: string
  tipo: TipoLancamento
  descricao: string
  valor: number
  data: string // YYYY-MM-DD
  escopo?: EscopoLancamento | null
  // Só p/ ENTRADAS: já foi recebida (entra em Entradas/saldo) ou ainda é
  // "a receber" (entra em A receber). Ausente/true = recebida (compatível com
  // os lançamentos antigos, que eram sempre realizados).
  recebido?: boolean | null
  categoria?: string | null
  criado_em: string
}

const agora = () => new Date().toISOString()

export async function listarLancamentos(): Promise<Lancamento[]> {
  const snap = await getDocs(query(collection(db, 'caixa'), orderBy('data', 'desc')))
  return snap.docs
    .filter((d) => !d.data().excluido_em)
    .map((d) => ({ id: d.id, ...(d.data() as Omit<Lancamento, 'id'>) }))
}

export async function criarLancamento(
  dados: Omit<Lancamento, 'id' | 'criado_em'>,
): Promise<Lancamento> {
  const novo = { ...dados, criado_em: agora() }
  const ref = await addDoc(collection(db, 'caixa'), novo)
  return { id: ref.id, ...novo }
}

export async function atualizarLancamento(
  id: string,
  dados: Partial<Omit<Lancamento, 'id' | 'criado_em'>>,
): Promise<void> {
  await updateDoc(doc(db, 'caixa', id), dados)
}

export async function excluirLancamento(id: string): Promise<void> {
  await moverParaLixeira('caixa', id)
}
