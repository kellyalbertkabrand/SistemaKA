import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { listarClientes } from '../../lib/api'
import { formatarBRL, formatarData } from '../../lib/gestao'
import type { Cliente } from '../../lib/database.types'
import { linhasFinanceiro, resumoPorQuem, rotuloForma } from '../../lib/financeiro'

// ============================================================================
// FINANCEIRO — visão consolidada de "quanto cada um tem a receber", somando os
// pagamentos do contrato de TODOS os clientes. KA vê tudo; a versão que a VM
// acessa (só o que é dela) entra junto com o login por papel.
// ============================================================================

export function GestaoFinanceiro() {
  const [, setParams] = useSearchParams()
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState<string | null>(null)
  const [filtro, setFiltro] = useState<string>('todos')

  useEffect(() => {
    listarClientes()
      .then((cs) => setClientes(cs))
      .catch((e) => setErro(e instanceof Error ? e.message : String(e)))
      .finally(() => setCarregando(false))
  }, [])

  const linhas = linhasFinanceiro(clientes)
  const resumo = resumoPorQuem(linhas)
  const totalUnico = linhas.reduce((s, l) => s + l.unico, 0)
  const totalMensal = linhas.reduce((s, l) => s + l.mensal, 0)

  const lista = (filtro === 'todos' ? linhas : linhas.filter((l) => l.rotulo === filtro)).sort(
    (a, b) => b.unico + b.mensal - (a.unico + a.mensal),
  )

  return (
    <>
      {erro && <div className="erro-msg">{erro}</div>}
      {carregando && <p style={{ color: 'var(--t-500)', fontSize: '0.85rem' }}>Carregando…</p>}

      {!carregando && linhas.length === 0 && !erro && (
        <div className="card">
          <h3>Ainda não há pagamentos lançados.</h3>
          <p>
            Cadastre os pagamentos na ficha de cada cliente (aba <strong>Clientes</strong> →
            “Pagamentos do contrato”), marcando <strong>quem recebe</strong> (KA, VM Rocks…). O
            total a receber aparece aqui, separado por pessoa.
          </p>
        </div>
      )}

      {!carregando && linhas.length > 0 && (
        <>
          <div className="fin-total">
            Total a receber:{' '}
            <strong>{formatarBRL(totalUnico)}</strong>
            {totalMensal > 0 && <> + <strong>{formatarBRL(totalMensal)}/mês</strong></>}
          </div>

          <div className="fin-cards">
            {resumo.map((r) => (
              <div
                key={r.chave}
                className={`fin-card ${r.chave === 'VM Rocks' ? 'fin-card--vm' : r.chave === 'KA' ? 'fin-card--ka' : ''}`}
              >
                <div className="fin-card__quem">{r.chave}</div>
                <div className="fin-card__valor">{formatarBRL(r.unico)}</div>
                {r.mensal > 0 && <div className="fin-card__mensal">+ {formatarBRL(r.mensal)}/mês</div>}
                <div className="fin-card__qtd">
                  {r.qtd} {r.qtd === 1 ? 'pagamento' : 'pagamentos'}
                </div>
              </div>
            ))}
          </div>

          <div className="chips" style={{ margin: '0.2rem 0 1rem' }}>
            <button className={`chip ${filtro === 'todos' ? 'chip--on' : ''}`} onClick={() => setFiltro('todos')}>
              Todos
            </button>
            {resumo.map((r) => (
              <button
                key={r.chave}
                className={`chip ${filtro === r.chave ? 'chip--on' : ''}`}
                onClick={() => setFiltro(r.chave)}
              >
                {r.chave}
              </button>
            ))}
          </div>

          <p className="fin-dica">Toque num pagamento para editar na ficha do cliente.</p>
          <div className="fin-lista">
            {lista.map((l, i) => (
              <button
                key={`${l.cliente_id}-${i}`}
                className="fin-item fin-item--btn"
                onClick={() => setParams({ aba: 'clientes', cliente: l.cliente_id })}
                title="Editar na ficha do cliente"
              >
                <div className="fin-item__corpo">
                  <div className="fin-item__cliente">{l.cliente_nome}</div>
                  <div className="fin-item__meta">
                    {rotuloForma(l, formatarBRL)} · para <strong>{l.rotulo}</strong>
                    {l.data ? ` · ${formatarData(l.data)}` : ''}
                  </div>
                </div>
                <div className="fin-item__valor">
                  {l.unico > 0 && formatarBRL(l.unico)}
                  {l.mensal > 0 && `${formatarBRL(l.mensal)}/mês`}
                </div>
              </button>
            ))}
          </div>
        </>
      )}
    </>
  )
}
