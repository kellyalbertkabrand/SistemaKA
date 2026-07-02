import { supabase } from './supabase'

// Bucket público do Storage onde ficam logos, fontes e grafismos dos clientes.
// Crie-o no painel do Supabase (Storage → New bucket → "kits", marque "Public").
export const BUCKET = 'kits'

/**
 * Envia um arquivo para o Storage e devolve a URL pública.
 * O caminho é organizado por cliente: `<clienteId>/<pasta>/<uuid>.<ext>`.
 */
export async function uploadArquivo(
  clienteId: string,
  pasta: string,
  file: File,
): Promise<string> {
  const ext = file.name.includes('.') ? file.name.split('.').pop() : 'bin'
  const nome = `${crypto.randomUUID()}.${ext}`
  const path = `${clienteId}/${pasta}/${nome}`

  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    cacheControl: '3600',
    upsert: false,
  })
  if (error) throw new Error(`Falha no upload: ${error.message}`)

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path)
  return data.publicUrl
}
