import { supabase } from './supabase'
import type {
  Cliente,
  ClienteStatus,
  Grafismo,
  GrafismoTipo,
  KitMarca,
  Usuario,
} from './database.types'

// ============================================================================
// Camada de acesso a dados (admin). Toda leitura/escrita passa pela RLS do
// Supabase — o admin enxerga tudo; o cliente, só o próprio cliente_id.
// ============================================================================

// ---- Clientes --------------------------------------------------------------

export async function listarClientes(): Promise<Cliente[]> {
  const { data, error } = await supabase
    .from('clientes')
    .select('*')
    .order('criado_em', { ascending: false })
  if (error) throw new Error(error.message)
  return (data ?? []) as Cliente[]
}

export async function obterCliente(id: string): Promise<Cliente | null> {
  const { data, error } = await supabase
    .from('clientes')
    .select('*')
    .eq('id', id)
    .maybeSingle()
  if (error) throw new Error(error.message)
  return (data as Cliente) ?? null
}

export type NovoCliente = Pick<
  Cliente,
  'nome_marca' | 'instagram_handle' | 'segmento' | 'site'
> & { status?: ClienteStatus }

export async function criarCliente(dados: NovoCliente): Promise<Cliente> {
  const { data, error } = await supabase
    .from('clientes')
    .insert(dados)
    .select('*')
    .single()
  if (error) throw new Error(error.message)
  return data as Cliente
}

export async function atualizarCliente(
  id: string,
  dados: Partial<NovoCliente>,
): Promise<Cliente> {
  const { data, error } = await supabase
    .from('clientes')
    .update(dados)
    .eq('id', id)
    .select('*')
    .single()
  if (error) throw new Error(error.message)
  return data as Cliente
}

export async function definirStatusCliente(
  id: string,
  status: ClienteStatus,
): Promise<void> {
  const { error } = await supabase.from('clientes').update({ status }).eq('id', id)
  if (error) throw new Error(error.message)
}

// ---- Kit de Marca (1:1 com cliente) ---------------------------------------

export async function obterKit(clienteId: string): Promise<KitMarca | null> {
  const { data, error } = await supabase
    .from('kit_marca')
    .select('*')
    .eq('cliente_id', clienteId)
    .maybeSingle()
  if (error) throw new Error(error.message)
  return (data as KitMarca) ?? null
}

// Upsert (cliente_id é a PK). `atualizado_em` é carimbado aqui.
export async function salvarKit(kit: Partial<KitMarca> & { cliente_id: string }) {
  const payload = { ...kit, atualizado_em: new Date().toISOString() }
  const { data, error } = await supabase
    .from('kit_marca')
    .upsert(payload, { onConflict: 'cliente_id' })
    .select('*')
    .single()
  if (error) throw new Error(error.message)
  return data as KitMarca
}

// ---- Grafismos (N por cliente) --------------------------------------------

export async function listarGrafismos(clienteId: string): Promise<Grafismo[]> {
  const { data, error } = await supabase
    .from('grafismos')
    .select('*')
    .eq('cliente_id', clienteId)
    .order('criado_em', { ascending: false })
  if (error) throw new Error(error.message)
  return (data ?? []) as Grafismo[]
}

export async function adicionarGrafismo(
  clienteId: string,
  arquivoUrl: string,
  tipo: GrafismoTipo,
): Promise<Grafismo> {
  const { data, error } = await supabase
    .from('grafismos')
    .insert({ cliente_id: clienteId, arquivo_url: arquivoUrl, tipo })
    .select('*')
    .single()
  if (error) throw new Error(error.message)
  return data as Grafismo
}

export async function removerGrafismo(id: string): Promise<void> {
  const { error } = await supabase.from('grafismos').delete().eq('id', id)
  if (error) throw new Error(error.message)
}

// ---- Acesso (usuarios) -----------------------------------------------------

// Usuários já vinculados a este cliente.
export async function listarUsuariosDoCliente(clienteId: string): Promise<Usuario[]> {
  const { data, error } = await supabase
    .from('usuarios')
    .select('*')
    .eq('cliente_id', clienteId)
    .order('criado_em', { ascending: true })
  if (error) throw new Error(error.message)
  return (data ?? []) as Usuario[]
}

// Usuários "cliente" ainda sem cliente vinculado (candidatos a vincular).
export async function listarUsuariosSemVinculo(): Promise<Usuario[]> {
  const { data, error } = await supabase
    .from('usuarios')
    .select('*')
    .eq('papel', 'cliente')
    .is('cliente_id', null)
    .order('criado_em', { ascending: true })
  if (error) throw new Error(error.message)
  return (data ?? []) as Usuario[]
}

export async function vincularUsuario(usuarioId: string, clienteId: string): Promise<void> {
  const { error } = await supabase
    .from('usuarios')
    .update({ cliente_id: clienteId, papel: 'cliente' })
    .eq('id', usuarioId)
  if (error) throw new Error(error.message)
}

export async function desvincularUsuario(usuarioId: string): Promise<void> {
  const { error } = await supabase
    .from('usuarios')
    .update({ cliente_id: null })
    .eq('id', usuarioId)
  if (error) throw new Error(error.message)
}
