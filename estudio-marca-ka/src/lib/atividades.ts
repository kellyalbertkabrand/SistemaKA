import {
  addDoc,
  collection,
  doc,
  getDocs,
  orderBy,
  query,
  updateDoc,
} from 'firebase/firestore'
import { db } from './firebase'
import { moverParaLixeira } from './lixeira'

// ============================================================================
// ATIVIDADES DA KELLY — painel pessoal.
//
// Junta, num só lugar, as pendências de trabalho (que vêm dos projetos dos
// clientes) com tarefas pessoais que a Kelly adiciona à mão. Tudo separado em
// três categorias: Trabalho, BIA e Pessoal. As atividades manuais ficam na
// coleção `atividades` do Firestore (só a KA vê).
// ============================================================================

// 'cliente' = tarefa que o CLIENTE precisa fazer (a KA cobra dele).
export type CategoriaAtividade = 'trabalho' | 'cliente' | 'bia' | 'pessoal'

export const CATEGORIAS: CategoriaAtividade[] = ['trabalho', 'cliente', 'bia', 'pessoal']

export const ROTULO_CATEGORIA: Record<CategoriaAtividade, string> = {
  trabalho: 'Trabalho',
  cliente: 'Cliente',
  bia: 'BIA',
  pessoal: 'Pessoal',
}

export interface Atividade {
  id: string
  titulo: string
  categoria: CategoriaAtividade
  feito: boolean
  /** Data marcada (YYYY-MM-DD). Opcional. */
  data: string | null
  /** Ordem manual (arrastar). Menor = mais em cima. Ausente = tratado como 0. */
  ordem?: number
  /** Só p/ categoria 'cliente': quem é o cliente a cobrar (para o WhatsApp). */
  cliente_id?: string | null
  cliente_nome?: string | null
  criado_em: string
}

const agora = () => new Date().toISOString()

export async function listarAtividades(): Promise<Atividade[]> {
  const snap = await getDocs(query(collection(db, 'atividades'), orderBy('criado_em', 'desc')))
  return snap.docs
    .filter((d) => !d.data().excluido_em)
    .map((d) => ({ id: d.id, ...(d.data() as Omit<Atividade, 'id'>) }))
}

export async function criarAtividade(dados: {
  titulo: string
  categoria: CategoriaAtividade
  data: string | null
  /** Ordem inicial (opcional): use um valor pequeno para nascer no topo. */
  ordem?: number
  cliente_id?: string | null
  cliente_nome?: string | null
}): Promise<Atividade> {
  const nova = {
    titulo: dados.titulo.trim(),
    categoria: dados.categoria,
    data: dados.data,
    ordem: dados.ordem ?? 0,
    cliente_id: dados.cliente_id ?? null,
    cliente_nome: dados.cliente_nome ?? null,
    feito: false,
    criado_em: agora(),
  }
  const ref = await addDoc(collection(db, 'atividades'), nova)
  return { id: ref.id, ...nova }
}

/** Salva a nova ordem: cada id recebe `ordem` = sua posição na lista. */
export async function reordenarAtividades(ids: string[]): Promise<void> {
  await Promise.all(ids.map((id, i) => updateDoc(doc(db, 'atividades', id), { ordem: i })))
}

export async function alternarAtividade(id: string, feito: boolean): Promise<void> {
  await updateDoc(doc(db, 'atividades', id), { feito })
}

export async function editarAtividade(
  id: string,
  dados: Partial<Pick<Atividade, 'titulo' | 'categoria' | 'data' | 'cliente_id' | 'cliente_nome'>>,
): Promise<void> {
  await updateDoc(doc(db, 'atividades', id), dados)
}

export async function excluirAtividade(id: string): Promise<void> {
  await moverParaLixeira('atividades', id)
}

/** Duplica uma atividade (mesmo título/categoria/data, começa como não feita). */
export async function duplicarAtividade(a: Atividade): Promise<Atividade> {
  return criarAtividade({
    titulo: a.titulo,
    categoria: a.categoria,
    data: a.data,
    cliente_id: a.cliente_id ?? null,
    cliente_nome: a.cliente_nome ?? null,
  })
}
