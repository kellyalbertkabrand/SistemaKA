// Rótulos amigáveis para os status crus do banco. Antes cada badge mostrava o
// valor do enum em minúsculo ("andamento", "rascunho", "atrasada"…); aqui vira
// texto legível e com a inicial maiúscula, igual em todas as telas.

const ORCAMENTO: Record<string, string> = {
  rascunho: 'Rascunho',
  enviado: 'Enviado',
  aprovado: 'Aprovado',
  recusado: 'Recusado',
  expirado: 'Expirado',
}
const CONTRATO: Record<string, string> = {
  rascunho: 'Rascunho',
  enviado: 'Enviado',
  assinado: 'Assinado',
  cancelado: 'Cancelado',
}
const COBRANCA: Record<string, string> = {
  pendente: 'Pendente',
  paga: 'Paga',
  atrasada: 'Atrasada',
  cancelada: 'Cancelada',
}
const CLIENTE: Record<string, string> = {
  ativo: 'Ativo',
  pausado: 'Pausado',
}
const CUIDADORA: Record<string, string> = {
  pendente: 'Pendente',
  ativa: 'Ativa',
  inativa: 'Inativa',
}
const PROJETO: Record<string, string> = {
  ativo: 'Ativo',
  pausado: 'Pausado',
  concluido: 'Concluído',
}

const MAPAS = {
  orcamento: ORCAMENTO,
  contrato: CONTRATO,
  cobranca: COBRANCA,
  cliente: CLIENTE,
  cuidadora: CUIDADORA,
  projeto: PROJETO,
} as const

export type TipoStatus = keyof typeof MAPAS

// Devolve o rótulo amigável; se não conhecer o valor, capitaliza o cru.
export function rotuloStatus(tipo: TipoStatus, valor: string | null | undefined): string {
  if (!valor) return '—'
  const mapa = MAPAS[tipo]
  return mapa[valor] ?? valor.charAt(0).toUpperCase() + valor.slice(1)
}
