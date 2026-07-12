import { useEffect, useState } from 'react'
import { listarClientes } from '../../lib/api'
import { listarCobrancas } from '../../lib/gestao'
import { listarLancamentos, type Lancamento } from '../../lib/caixa'
import type { Cliente, Cobranca } from '../../lib/database.types'
import { RelatorioFinanceiro } from './RelatorioFinanceiro'

// Aba dedicada de RELATÓRIOS: carrega clientes + cobranças + lançamentos do
// caixa e entrega ao RelatorioFinanceiro (que tem os sub-relatórios
// "Financeiro" e "Desempenho do site").
export function GestaoRelatorios() {
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [cobrancas, setCobrancas] = useState<Cobranca[]>([])
  const [lancamentos, setLancamentos] = useState<Lancamento[]>([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState<string | null>(null)

  useEffect(() => {
    Promise.all([listarClientes(), listarCobrancas(), listarLancamentos()])
      .then(([cs, cb, lc]) => {
        setClientes(cs)
        setCobrancas(cb)
        setLancamentos(lc)
        setErro(null)
      })
      .catch((e) => setErro(e instanceof Error ? e.message : String(e)))
      .finally(() => setCarregando(false))
  }, [])

  if (erro) return <div className="erro-msg" role="alert">{erro}</div>
  if (carregando) return <p style={{ color: 'var(--t-500)', fontSize: '0.85rem' }}>Carregando…</p>

  return <RelatorioFinanceiro cobrancas={cobrancas} lancamentos={lancamentos} clientes={clientes} />
}
