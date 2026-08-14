import { useMemo, useState } from 'react'
import type { Cliente, Cobranca } from '../../lib/database.types'
import { formatarBRL, formatarData, statusEfetivo } from '../../lib/gestao'
import { somarDinheiro, arredondar, hojeLocal } from '../../lib/ui'
import { lancamentoRealizado, type Lancamento } from '../../lib/caixa'
import { DesempenhoSite } from './DesempenhoSite'

// ============================================================================
// RELATÓRIOS FINANCEIROS — escolhe um período e gera um relatório (recebido,
// saídas, saldo, a receber, por cliente e KA×Pessoal). Imprime em PDF pelo
// navegador (@media print esconde os controles) e exporta CSV.
// ============================================================================

// Primeiro e último dia (YYYY-MM-DD, local) de um mês (ano, mês 1-12).
function primeiroDia(ano: number, mes: number): string {
  return `${ano}-${String(mes).padStart(2, '0')}-01`
}
function ultimoDia(ano: number, mes: number): string {
  const d = new Date(ano, mes, 0).getDate()
  return `${ano}-${String(mes).padStart(2, '0')}-${String(d).padStart(2, '0')}`
}

// Uma linha de movimentação realizada no período.
interface Realizado {
  data: string
  tipo: 'entrada' | 'saida'
  descricao: string
  cliente: string
  escopo: 'ka' | 'pessoal'
  valor: number
}

export function RelatorioFinanceiro({
  cobrancas,
  lancamentos,
  clientes,
}: {
  cobrancas: Cobranca[]
  lancamentos: Lancamento[]
  clientes: Cliente[]
}) {
  const agora = new Date()
  const [tipo, setTipo] = useState<'financeiro' | 'site'>('financeiro')
  const [ini, setIni] = useState(primeiroDia(agora.getFullYear(), agora.getMonth() + 1))
  const [fim, setFim] = useState(ultimoDia(agora.getFullYear(), agora.getMonth() + 1))
  const [rotuloPeriodo, setRotuloPeriodo] = useState('Este mês')

  const nomeCliente = useMemo(() => {
    const m = new Map(clientes.map((c) => [c.id, c.nome_marca]))
    return (id: string | null) => (id ? (m.get(id) ?? '—') : '—')
  }, [clientes])

  function preset(qual: 'mes' | 'passado' | 'ano') {
    const y = agora.getFullYear()
    const m = agora.getMonth() + 1
    if (qual === 'mes') {
      setIni(primeiroDia(y, m))
      setFim(ultimoDia(y, m))
      setRotuloPeriodo('Este mês')
    } else if (qual === 'passado') {
      const py = m === 1 ? y - 1 : y
      const pm = m === 1 ? 12 : m - 1
      setIni(primeiroDia(py, pm))
      setFim(ultimoDia(py, pm))
      setRotuloPeriodo('Mês passado')
    } else {
      setIni(`${y}-01-01`)
      setFim(`${y}-12-31`)
      setRotuloPeriodo(`Ano ${y}`)
    }
  }

  const noPeriodo = (data: string | null | undefined) => {
    const d = (data ?? '').slice(0, 10)
    return d >= ini && d <= fim
  }

  // ---- Realizado (o que efetivamente entrou/saiu no período) ----
  const realizado = useMemo<Realizado[]>(() => {
    const linhas: Realizado[] = []
    // Cobranças PAGAS no período → entradas (sempre KA/negócio).
    for (const c of cobrancas) {
      if (c.status === 'paga' && noPeriodo(c.pago_em ?? c.vencimento)) {
        linhas.push({
          data: (c.pago_em ?? c.vencimento ?? '').slice(0, 10),
          tipo: 'entrada',
          descricao: c.descricao,
          cliente: nomeCliente(c.cliente_id),
          escopo: 'ka',
          valor: Number(c.valor || 0),
        })
      }
    }
    // Lançamentos à mão no período — só os REALIZADOS (entrada recebida,
    // saída paga). Entradas "a receber" e contas "a pagar" ainda não mexeram
    // no caixa, então não entram no relatório de realizado.
    for (const l of lancamentos) {
      if (lancamentoRealizado(l) && noPeriodo(l.data)) {
        linhas.push({
          data: l.data,
          tipo: l.tipo,
          descricao: l.descricao,
          cliente: '—',
          escopo: l.escopo ?? 'ka',
          valor: Number(l.valor || 0),
        })
      }
    }
    return linhas.sort((a, b) => (a.data < b.data ? -1 : a.data > b.data ? 1 : 0))
  }, [cobrancas, lancamentos, ini, fim, nomeCliente])

  const entradas = realizado.filter((r) => r.tipo === 'entrada')
  const saidas = realizado.filter((r) => r.tipo === 'saida')
  const totalEntradas = somarDinheiro(entradas.map((r) => r.valor))
  const totalSaidas = somarDinheiro(saidas.map((r) => r.valor))
  const saldoPeriodo = arredondar(totalEntradas - totalSaidas)

  const entradaKA = somarDinheiro(entradas.filter((r) => r.escopo === 'ka').map((r) => r.valor))
  const entradaPessoal = somarDinheiro(entradas.filter((r) => r.escopo === 'pessoal').map((r) => r.valor))
  const saidaKA = somarDinheiro(saidas.filter((r) => r.escopo === 'ka').map((r) => r.valor))
  const saidaPessoal = somarDinheiro(saidas.filter((r) => r.escopo === 'pessoal').map((r) => r.valor))

  // Recebido por cliente (só cobranças).
  const recebidoPorCliente = useMemo(() => {
    const m = new Map<string, number>()
    for (const r of entradas) {
      if (r.cliente === '—') continue
      m.set(r.cliente, arredondar((m.get(r.cliente) ?? 0) + r.valor))
    }
    return [...m.entries()].map(([cliente, valor]) => ({ cliente, valor })).sort((a, b) => b.valor - a.valor)
  }, [entradas])

  // A receber (cobranças em aberto vencendo no período).
  const aReceber = cobrancas.filter((c) => {
    const s = statusEfetivo(c)
    return (s === 'pendente' || s === 'atrasada') && noPeriodo(c.vencimento)
  })
  const totalAReceber = somarDinheiro(aReceber.map((c) => Number(c.valor || 0)))
  const atrasadas = aReceber.filter((c) => statusEfetivo(c) === 'atrasada')
  const totalAtrasado = somarDinheiro(atrasadas.map((c) => Number(c.valor || 0)))

  // ---- Exportar CSV ----
  function baixarCSV() {
    const cab = ['Data', 'Tipo', 'Descrição', 'Cliente', 'Escopo', 'Valor']
    const linhas = realizado.map((r) => [
      formatarData(r.data),
      r.tipo === 'entrada' ? 'Entrada' : 'Saída',
      r.descricao,
      r.cliente,
      r.escopo === 'pessoal' ? 'Pessoal' : 'KA',
      String(r.valor).replace('.', ','),
    ])
    const esc = (v: string) => `"${String(v).replace(/"/g, '""')}"`
    const csv = [cab, ...linhas].map((l) => l.map(esc).join(';')).join('\r\n')
    // BOM para o Excel abrir com acentos certos.
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `relatorio-financeiro-${ini}-a-${fim}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  return (
    <div className="relatorio">
      <div className="seg seg--rel nao-imprimir">
        <button className={tipo === 'financeiro' ? 'seg__on' : ''} onClick={() => setTipo('financeiro')}>
          Financeiro
        </button>
        <button className={tipo === 'site' ? 'seg__on' : ''} onClick={() => setTipo('site')}>
          Desempenho do site
        </button>
      </div>

      {tipo === 'site' && <DesempenhoSite cobrancas={cobrancas} />}

      {tipo === 'financeiro' && (
        <>
      {/* Controles (não vão para o PDF) */}
      <div className="rel-controles nao-imprimir">
        <div className="chips">
          <button className="chip" onClick={() => preset('mes')}>
            Este mês
          </button>
          <button className="chip" onClick={() => preset('passado')}>
            Mês passado
          </button>
          <button className="chip" onClick={() => preset('ano')}>
            Este ano
          </button>
        </div>
        <div className="rel-datas">
          <label>
            De
            <input type="date" value={ini} onChange={(e) => { setIni(e.target.value); setRotuloPeriodo('Personalizado') }} />
          </label>
          <label>
            Até
            <input type="date" value={fim} onChange={(e) => { setFim(e.target.value); setRotuloPeriodo('Personalizado') }} />
          </label>
        </div>
        <div className="rel-acoes">
          <button className="btn" onClick={() => window.print()}>
            Imprimir / Salvar PDF
          </button>
          <button className="btn--ghost" onClick={baixarCSV}>
            Baixar CSV
          </button>
        </div>
      </div>

      {/* Cabeçalho do relatório (aparece no PDF) */}
      <div className="rel-doc">
        <div className="rel-doc__head">
          <div className="eyebrow">KA · Inteligência para Marcas</div>
          <h1>Relatório financeiro</h1>
          <div className="rel-doc__periodo">
            {rotuloPeriodo} · {formatarData(ini)} a {formatarData(fim)} · gerado em {formatarData(hojeLocal())}
          </div>
        </div>

        {/* Resumo em cards */}
        <div className="fin-cards">
          <div className="fin-card fin-card--entrada">
            <div className="fin-card__quem">Recebido</div>
            <div className="fin-card__valor">{formatarBRL(totalEntradas)}</div>
            <div className="fin-card__qtd">{entradas.length} entrada(s)</div>
          </div>
          <div className="fin-card fin-card--saida">
            <div className="fin-card__quem">Saídas</div>
            <div className="fin-card__valor">{formatarBRL(totalSaidas)}</div>
            <div className="fin-card__qtd">{saidas.length} saída(s)</div>
          </div>
          <div className="fin-card fin-card--saldo">
            <div className="fin-card__quem">Saldo do período</div>
            <div className="fin-card__valor">{formatarBRL(saldoPeriodo)}</div>
            <div className="fin-card__qtd">recebido − saídas</div>
          </div>
          <div className="fin-card fin-card--receber">
            <div className="fin-card__quem">A receber (vence no período)</div>
            <div className="fin-card__valor">{formatarBRL(totalAReceber)}</div>
            <div className="fin-card__qtd">
              {aReceber.length} em aberto{totalAtrasado > 0 ? ` · ${formatarBRL(totalAtrasado)} atrasado` : ''}
            </div>
          </div>
        </div>

        {/* KA vs Pessoal */}
        <section className="rel-secao">
          <h3 className="fin-secao__tit">Por escopo</h3>
          <table className="rel-tabela">
            <thead>
              <tr>
                <th></th>
                <th>KA (negócio)</th>
                <th>Pessoal</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Recebido</td>
                <td>{formatarBRL(entradaKA)}</td>
                <td>{formatarBRL(entradaPessoal)}</td>
                <td>{formatarBRL(totalEntradas)}</td>
              </tr>
              <tr>
                <td>Saídas</td>
                <td>{formatarBRL(saidaKA)}</td>
                <td>{formatarBRL(saidaPessoal)}</td>
                <td>{formatarBRL(totalSaidas)}</td>
              </tr>
            </tbody>
          </table>
        </section>

        {/* Recebido por cliente */}
        {recebidoPorCliente.length > 0 && (
          <section className="rel-secao">
            <h3 className="fin-secao__tit">Recebido por cliente</h3>
            <table className="rel-tabela">
              <tbody>
                {recebidoPorCliente.map((r) => (
                  <tr key={r.cliente}>
                    <td>{r.cliente}</td>
                    <td className="rel-num">{formatarBRL(r.valor)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )}

        {/* A receber no período */}
        {aReceber.length > 0 && (
          <section className="rel-secao">
            <h3 className="fin-secao__tit">A receber (vencendo no período)</h3>
            <table className="rel-tabela">
              <tbody>
                {aReceber
                  .slice()
                  .sort((a, b) => (a.vencimento < b.vencimento ? -1 : 1))
                  .map((c) => (
                    <tr key={c.id}>
                      <td>
                        {nomeCliente(c.cliente_id)} — {c.descricao}
                        {statusEfetivo(c) === 'atrasada' ? ' (atrasada)' : ''}
                      </td>
                      <td className="rel-vence">{formatarData(c.vencimento)}</td>
                      <td className="rel-num">{formatarBRL(c.valor)}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </section>
        )}

        {/* Movimentações do período */}
        <section className="rel-secao">
          <h3 className="fin-secao__tit">Movimentações do período</h3>
          {realizado.length === 0 ? (
            <p className="ativ-vazio">Nenhuma movimentação neste período.</p>
          ) : (
            <table className="rel-tabela">
              <thead>
                <tr>
                  <th>Data</th>
                  <th>Descrição</th>
                  <th>Escopo</th>
                  <th className="rel-num">Valor</th>
                </tr>
              </thead>
              <tbody>
                {realizado.map((r, i) => (
                  <tr key={i}>
                    <td>{formatarData(r.data)}</td>
                    <td>
                      {r.descricao}
                      {r.cliente !== '—' ? ` · ${r.cliente}` : ''}
                    </td>
                    <td>{r.escopo === 'pessoal' ? 'Pessoal' : 'KA'}</td>
                    <td className={`rel-num ${r.tipo === 'entrada' ? 'rel-mais' : 'rel-menos'}`}>
                      {r.tipo === 'entrada' ? '+ ' : '− '}
                      {formatarBRL(r.valor)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        <div className="rel-doc__rodape">KA | Inteligência para Marcas · Kelly Albert</div>
      </div>
        </>
      )}
    </div>
  )
}
