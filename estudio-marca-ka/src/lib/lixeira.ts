import { collection, deleteDoc, doc, getDocs, updateDoc } from 'firebase/firestore'
import { db } from './firebase'

// ============================================================================
// LIXEIRA — exclusão reversível ("soft delete"). Em vez de apagar de vez, o
// documento ganha `excluido_em` e some das listas (filtrado no cliente, para
// não quebrar docs antigos sem o campo). Na Lixeira dá para RESTAURAR ou
// ESVAZIAR (apagar de vez). As funções `listar*` de cada área filtram
// `excluido_em`; as `excluir*` chamam `moverParaLixeira`.
// ============================================================================

const agora = () => new Date().toISOString()

// true se o doc está na lixeira (tem excluido_em preenchido).
export function naLixeira(d: { excluido_em?: string | null } | Record<string, unknown>): boolean {
  return !!(d as { excluido_em?: string | null }).excluido_em
}

export async function moverParaLixeira(colecao: string, id: string): Promise<void> {
  await updateDoc(doc(db, colecao, id), { excluido_em: agora() })
}

export async function restaurarItem(colecao: string, id: string): Promise<void> {
  await updateDoc(doc(db, colecao, id), { excluido_em: null })
}

export async function excluirDefinitivo(colecao: string, id: string): Promise<void> {
  await deleteDoc(doc(db, colecao, id))
}

// Como exibir cada tipo de item na Lixeira (rótulo amigável + nome do campo).
const FONTES: { colecao: string; tipo: string; nome: (d: Record<string, unknown>) => string }[] = [
  { colecao: 'clientes', tipo: 'Cliente', nome: (d) => String(d.nome_marca ?? 'Cliente') },
  { colecao: 'projetos', tipo: 'Projeto', nome: (d) => String(d.nome ?? 'Projeto') },
  { colecao: 'orcamentos', tipo: 'Orçamento', nome: (d) => String(d.titulo ?? 'Orçamento') },
  { colecao: 'contratos', tipo: 'Contrato', nome: (d) => String(d.titulo ?? 'Contrato') },
  { colecao: 'cobrancas', tipo: 'Cobrança', nome: (d) => String(d.descricao ?? 'Cobrança') },
  { colecao: 'caixa', tipo: 'Lançamento', nome: (d) => String(d.descricao ?? 'Lançamento') },
  { colecao: 'cuidadoras', tipo: 'Cuidadora', nome: (d) => String(d.nome ?? 'Cuidadora') },
  { colecao: 'atividades', tipo: 'Atividade', nome: (d) => String(d.titulo ?? 'Atividade') },
]

export interface ItemLixeira {
  colecao: string
  id: string
  tipo: string
  nome: string
  excluido_em: string
}

export async function listarLixeira(): Promise<ItemLixeira[]> {
  const out: ItemLixeira[] = []
  await Promise.all(
    FONTES.map(async (f) => {
      const snap = await getDocs(collection(db, f.colecao))
      for (const dd of snap.docs) {
        const d = dd.data() as Record<string, unknown>
        if (d.excluido_em) {
          out.push({
            colecao: f.colecao,
            id: dd.id,
            tipo: f.tipo,
            nome: f.nome(d),
            excluido_em: String(d.excluido_em),
          })
        }
      }
    }),
  )
  return out.sort((a, b) => (a.excluido_em < b.excluido_em ? 1 : -1))
}

// Apaga de vez TODOS os itens que estão na lixeira. Devolve quantos apagou.
export async function esvaziarLixeira(): Promise<number> {
  const itens = await listarLixeira()
  await Promise.all(itens.map((it) => excluirDefinitivo(it.colecao, it.id)))
  return itens.length
}
