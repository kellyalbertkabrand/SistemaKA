import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  updateDoc,
  where,
} from 'firebase/firestore'
import { db } from './firebase'
import type {
  Cliente,
  ClienteStatus,
  Grafismo,
  GrafismoTipo,
  KitMarca,
  Usuario,
} from './database.types'

// ============================================================================
// Camada de acesso a dados (admin) — agora no Firebase/Firestore.
// Antes era Supabase; a interface pública (nomes/assinaturas) foi mantida para
// as telas continuarem funcionando sem alteração.
// As coleções seguem os mesmos nomes das antigas tabelas.
// ============================================================================

const agora = () => new Date().toISOString()

/** Converte um DocumentSnapshot do Firestore no nosso formato { id, ...campos }. */
function comId<T>(id: string, data: Record<string, unknown>): T {
  return { id, ...data } as T
}

/** Remove chaves com `undefined` (o Firestore não aceita `undefined`). */
function limpar<T extends Record<string, unknown>>(obj: T): T {
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(obj)) if (v !== undefined) out[k] = v
  return out as T
}

// ---- Clientes --------------------------------------------------------------

export async function listarClientes(): Promise<Cliente[]> {
  const snap = await getDocs(query(collection(db, 'clientes'), orderBy('criado_em', 'desc')))
  return snap.docs.filter((d) => !d.data().excluido_em).map((d) => comId<Cliente>(d.id, d.data()))
}

export async function obterCliente(id: string): Promise<Cliente | null> {
  const d = await getDoc(doc(db, 'clientes', id))
  return d.exists() ? comId<Cliente>(d.id, d.data()) : null
}

export type NovoCliente = Pick<
  Cliente,
  'nome_marca' | 'instagram_handle' | 'segmento' | 'site'
> & { status?: ClienteStatus }

export async function criarCliente(dados: NovoCliente): Promise<Cliente> {
  const novo = limpar({
    nome_marca: dados.nome_marca,
    instagram_handle: dados.instagram_handle ?? null,
    segmento: dados.segmento ?? null,
    site: dados.site ?? null,
    status: dados.status ?? 'ativo',
    slug: null,
    responsavel: null,
    email_contato: null,
    telefone: null,
    endereco: null,
    cidade: null,
    observacoes: null,
    email_cobranca: null,
    documento: null,
    valor_mensalidade: null,
    dia_vencimento: 10,
    cobranca_ativa: false,
    criado_em: agora(),
  })
  const ref = await addDoc(collection(db, 'clientes'), novo)
  return comId<Cliente>(ref.id, novo)
}

export async function atualizarCliente(
  id: string,
  dados: Partial<NovoCliente>,
): Promise<Cliente> {
  await updateDoc(doc(db, 'clientes', id), limpar({ ...dados }))
  const atualizado = await obterCliente(id)
  if (!atualizado) throw new Error('Cliente não encontrado após atualizar.')
  return atualizado
}

export async function definirStatusCliente(
  id: string,
  status: ClienteStatus,
): Promise<void> {
  await updateDoc(doc(db, 'clientes', id), { status })
}

// ---- Kit de Marca (1:1 com cliente) ---------------------------------------
// Guardado como documento em `kit_marca` cujo id É o cliente_id.

export async function obterKit(clienteId: string): Promise<KitMarca | null> {
  const d = await getDoc(doc(db, 'kit_marca', clienteId))
  return d.exists() ? (d.data() as KitMarca) : null
}

export async function salvarKit(kit: Partial<KitMarca> & { cliente_id: string }) {
  const payload = limpar({ ...kit, atualizado_em: agora() })
  await updateDoc(doc(db, 'kit_marca', kit.cliente_id), payload).catch(async () => {
    // ainda não existe → cria com o id = cliente_id
    const { setDoc } = await import('firebase/firestore')
    await setDoc(doc(db, 'kit_marca', kit.cliente_id), payload)
  })
  return payload as KitMarca
}

// ---- Grafismos (N por cliente) --------------------------------------------

export async function listarGrafismos(clienteId: string): Promise<Grafismo[]> {
  const snap = await getDocs(
    query(collection(db, 'grafismos'), where('cliente_id', '==', clienteId)),
  )
  return snap.docs
    .map((d) => comId<Grafismo>(d.id, d.data()))
    .sort((a, b) => (a.criado_em < b.criado_em ? 1 : -1))
}

export async function adicionarGrafismo(
  clienteId: string,
  arquivoUrl: string,
  tipo: GrafismoTipo,
): Promise<Grafismo> {
  const novo = { cliente_id: clienteId, arquivo_url: arquivoUrl, tipo, criado_em: agora() }
  const ref = await addDoc(collection(db, 'grafismos'), novo)
  return comId<Grafismo>(ref.id, novo)
}

export async function removerGrafismo(id: string): Promise<void> {
  await deleteDoc(doc(db, 'grafismos', id))
}

// ---- Acesso (usuarios) -----------------------------------------------------
// Documentos em `usuarios` cujo id é o uid do Firebase Auth.

export async function listarUsuariosDoCliente(clienteId: string): Promise<Usuario[]> {
  const snap = await getDocs(
    query(collection(db, 'usuarios'), where('cliente_id', '==', clienteId)),
  )
  return snap.docs
    .map((d) => comId<Usuario>(d.id, d.data()))
    .sort((a, b) => (a.criado_em > b.criado_em ? 1 : -1))
}

export async function listarUsuariosSemVinculo(): Promise<Usuario[]> {
  const snap = await getDocs(
    query(collection(db, 'usuarios'), where('cliente_id', '==', null)),
  )
  return snap.docs
    .map((d) => comId<Usuario>(d.id, d.data()))
    .filter((u) => u.papel === 'cliente')
    .sort((a, b) => (a.criado_em > b.criado_em ? 1 : -1))
}

export async function vincularUsuario(usuarioId: string, clienteId: string): Promise<void> {
  await updateDoc(doc(db, 'usuarios', usuarioId), { cliente_id: clienteId, papel: 'cliente' })
}

export async function desvincularUsuario(usuarioId: string): Promise<void> {
  await updateDoc(doc(db, 'usuarios', usuarioId), { cliente_id: null })
}
