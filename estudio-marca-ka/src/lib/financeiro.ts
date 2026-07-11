import type { Cliente, PagamentoContrato } from './database.types'

// ============================================================================
// Financeiro — soma "quanto cada um tem a receber" a partir dos pagamentos do
// contrato cadastrados em cada cliente (ficha → Pagamentos do contrato).
// ============================================================================

const QUEM_ROTULOS: Record<string, string> = {
  cliente: 'O cliente',
  ka: 'KA',
  vm: 'VM Rocks',
  outro: 'Personalizado',
}

export function rotuloQuem(p: PagamentoContrato): string {
  if (p.quem === 'outro') return p.quem_outro?.trim() || 'Personalizado'
  return QUEM_ROTULOS[p.quem] ?? p.quem
}

/** Valor único: à vista = valor; parcelado = parcelas × valor; mensalidade não entra. */
export function totalUnicoPagamento(p: PagamentoContrato): number {
  const v = Number(p.valor_parcela) || 0
  if (p.forma === 'mensalidade') return 0
  if (p.forma === 'parcelado') return v * Math.max(1, Number(p.parcelas) || 1)
  return v
}

/** Valor por mês (só quando a forma é mensalidade). */
export function totalMensalPagamento(p: PagamentoContrato): number {
  return p.forma === 'mensalidade' ? Number(p.valor_parcela) || 0 : 0
}

export interface LinhaFinanceiro {
  cliente_id: string
  cliente_nome: string
  quem: string
  rotulo: string
  forma: string
  parcelas: number | null
  valor_parcela: number
  unico: number
  mensal: number
  data: string | null
}

export interface ResumoQuem {
  chave: string
  unico: number
  mensal: number
  qtd: number
}

/** Achata todos os pagamentos de todos os clientes numa lista só. */
export function linhasFinanceiro(clientes: Cliente[]): LinhaFinanceiro[] {
  const out: LinhaFinanceiro[] = []
  for (const c of clientes) {
    for (const p of c.pagamentos_contrato ?? []) {
      const unico = totalUnicoPagamento(p)
      const mensal = totalMensalPagamento(p)
      if (unico === 0 && mensal === 0) continue
      out.push({
        cliente_id: c.id,
        cliente_nome: c.nome_marca,
        quem: p.quem,
        rotulo: rotuloQuem(p),
        forma: p.forma ?? 'avista',
        parcelas: p.parcelas ?? null,
        valor_parcela: Number(p.valor_parcela) || 0,
        unico,
        mensal,
        data: p.data ?? null,
      })
    }
  }
  return out
}

/** Total a receber por quem (KA e VM Rocks primeiro). */
export function resumoPorQuem(linhas: LinhaFinanceiro[]): ResumoQuem[] {
  const map = new Map<string, ResumoQuem>()
  for (const l of linhas) {
    const cur = map.get(l.rotulo) ?? { chave: l.rotulo, unico: 0, mensal: 0, qtd: 0 }
    cur.unico += l.unico
    cur.mensal += l.mensal
    cur.qtd += 1
    map.set(l.rotulo, cur)
  }
  const ordem = (x: string) => (x === 'KA' ? 0 : x === 'VM Rocks' ? 1 : 2)
  return [...map.values()].sort((a, b) => ordem(a.chave) - ordem(b.chave) || a.chave.localeCompare(b.chave))
}

/** Texto curto da forma de um pagamento, para listar. */
export function rotuloForma(l: LinhaFinanceiro, formatarBRL: (v: number) => string): string {
  if (l.forma === 'parcelado') return `${l.parcelas || 1}× de ${formatarBRL(l.valor_parcela)}`
  if (l.forma === 'mensalidade') return 'Mensalidade'
  return 'À vista'
}
