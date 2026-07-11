import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  orderBy,
  query,
  updateDoc,
} from 'firebase/firestore'
import { db } from './firebase'

// ============================================================================
// ATIVIDADES DA KELLY — painel pessoal.
//
// Junta, num só lugar, as pendências de trabalho (que vêm dos projetos dos
// clientes) com tarefas pessoais que a Kelly adiciona à mão. Tudo separado em
// três categorias: Trabalho, BIA e Pessoal. As atividades manuais ficam na
// coleção `atividades` do Firestore (só a KA vê).
// ============================================================================

export type CategoriaAtividade = 'trabalho' | 'bia' | 'pessoal'

export const CATEGORIAS: CategoriaAtividade[] = ['trabalho', 'bia', 'pessoal']

export const ROTULO_CATEGORIA: Record<CategoriaAtividade, string> = {
  trabalho: 'Trabalho',
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
  criado_em: string
}

const agora = () => new Date().toISOString()

export async function listarAtividades(): Promise<Atividade[]> {
  const snap = await getDocs(query(collection(db, 'atividades'), orderBy('criado_em', 'desc')))
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Atividade, 'id'>) }))
}

export async function criarAtividade(dados: {
  titulo: string
  categoria: CategoriaAtividade
  data: string | null
}): Promise<Atividade> {
  const nova = {
    titulo: dados.titulo.trim(),
    categoria: dados.categoria,
    data: dados.data,
    feito: false,
    criado_em: agora(),
  }
  const ref = await addDoc(collection(db, 'atividades'), nova)
  return { id: ref.id, ...nova }
}

export async function alternarAtividade(id: string, feito: boolean): Promise<void> {
  await updateDoc(doc(db, 'atividades', id), { feito })
}

export async function editarAtividade(
  id: string,
  dados: Partial<Pick<Atividade, 'titulo' | 'categoria' | 'data'>>,
): Promise<void> {
  await updateDoc(doc(db, 'atividades', id), dados)
}

export async function excluirAtividade(id: string): Promise<void> {
  await deleteDoc(doc(db, 'atividades', id))
}

/** Duplica uma atividade (mesmo título/categoria/data, começa como não feita). */
export async function duplicarAtividade(a: Atividade): Promise<Atividade> {
  return criarAtividade({ titulo: a.titulo, categoria: a.categoria, data: a.data })
}
