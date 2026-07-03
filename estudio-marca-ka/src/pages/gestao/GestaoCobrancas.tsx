import { useEffect, useMemo, useState } from 'react'
import type { Cliente, Cobranca, CobrancaStatus } from '../../lib/database.types'
import { listarClientes } from '../../lib/api'
import {
  atualizarCobranca,
  criarCobranca,
  gerarLinkMercadoPago,
  gerarMensalidades,
  listarCobrancas,
  marcarCobrancaPaga,
  formatarBRL,
  formatarData,
} from '../../lib/gestao'

const BADGE_COBRANCA: Record<CobrancaStatus, string> = {
  pendente: 'badge--azul',
  paga: 'badge--verde',
  atrasada: 'badge--vermelho',
  cancelada: 'badge--cinza',
}

// Cobranças: mensalidades (geradas por mês) + avulsas (de orçamento aprovado).
// O link de pagamento (cartão/boleto/PIX) vem do Mercado Pago via Edge Function.
export function GestaoCobrancas() {
  const [lista, setLista] = useState<Cobranca[]>([])
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [erro, setErro] = useState<string | null>(null)
  const [msg, setMsg] = useState<string | null>(null)
  const [ocupado, setOcupado] = useState<string | null>(null) // id da linha em ação
  const [carregando, setCarregando] = useState(true)

  const nomeCliente = useMemo(() => {
    const m = new Map(clientes.map((c) => [c.id, c.nome_marca]))
    return (id: string | null) => (id ? (m.get(id) ?? '—') : '—')
  }, [clientes])

  async function recarregar() {
    try {
      setCarregando(true)
      const [co, cl] = await Promise.all([listarCobrancas(), listarClientes()])
      setLista(co)
      setClientes(cl)
      setErro(null)
    } catch (e) {
      setErro(e instanceof Error ? e.message : String(e))
    } finally {
      setCarregando(false)
    }
  }

  useEffect(() => {
    void recarregar()
  }, [])

  function avisar(texto: string) {
    setMsg(texto)
    setTimeout(() => setMsg(null), 4500)
  }

  async function gerarMes() {
    setOcupado('mes')
    setErro(null)
    try {
      const qtd = await gerarMensalidades()
      avisar(
        qtd > 0
          ? `${qtd} mensalidade(s) do mês geradas.`
          : 'Nenhuma mensalidade nova — clientes com cobrança ativa já têm a deste mês (ou não há clientes com mensalidade configurada).',
      )
      await recarregar()
    } catch (e) {
      setErro(e instanceof Error ? e.message : String(e))
    } finally {
      setOcupado(null)
    }
  }

  async function novaAvulsa() {
    if (clientes.length === 0) {
      setErro('Cadastre um cliente primeiro (aba Clientes).')
      return
    }
    const nomes = clientes.map((c, i) => `${i + 1} - ${c.nome_marca}`).join('\n')
    const escolha = window.prompt(`Cobrança para qual cliente?\n${nomes}\n\nDigite o número:`)
    const cliente = clientes[Number(escolha) - 1]
    if (!cliente) return
    const descricao = window.prompt('Descrição da cobrança:')
    if (!descricao?.trim()) return
    const valor = Number(window.prompt('Valor (R$):')?.replace(',', '.'))
    if (!valor || valor <= 0) return
    const venc = window.prompt('Vencimento (AAAA-MM-DD):', new Date().toISOString().slice(0, 10))
    if (!venc) return
    setOcupado('nova')
    try {
      await criarCobranca({
        cliente_id: cliente.id,
        tipo: 'avulsa',
        descricao: descricao.trim(),
        valor,
        vencimento: venc,
      })
      await recarregar()
    } catch (e) {
      setErro(e instanceof Error ? e.message : String(e))
    } finally {
      setOcupado(null)
    }
  }

  async function gerarLink(c: Cobranca) {
    setOcupado(c.id)
    setErro(null)
    try {
      await gerarLinkMercadoPago(c.id)
      avisar('Link de pagamento gerado no Mercado Pago.')
      await recarregar()
    } catch (e) {
      setErro(
        (e instanceof Error ? e.message : String(e)) +
          ' — a função "mp-criar-cobranca" precisa estar publicada no Supabase com o segredo ' +
          'MP_ACCESS_TOKEN. Enquanto isso, você pode colar um link manual (botão ao lado).',
      )
    } finally {
      setOcupado(null)
    }
  }

  async function colarLink(c: Cobranca) {
    const link = window.prompt(
      'Cole o link de pagamento (Mercado Pago → Cobrar → Link de pagamento):',
      c.link_pagamento ?? '',
    )
    if (link === null) return
    setOcupado(c.id)
    try {
      await atualizarCobranca(c.id, { link_pagamento: link.trim() || null })
      await recarregar()
    } catch (e) {
      setErro(e instanceof Error ? e.message : String(e))
    } finally {
      setOcupado(null)
    }
  }

  async function copiarLink(c: Cobranca) {
    if (!c.link_pagamento) return
    await navigator.clipboard.writeText(c.link_pagamento)
    avisar('Link de pagamento copiado — envie ao cliente.')
  }

  async function marcarPaga(c: Cobranca) {
    setOcupado(c.id)
    try {
      await marcarCobrancaPaga(c.id)
      await recarregar()
    } catch (e) {
      setErro(e instanceof Error ? e.message : String(e))
    } finally {
      setOcupado(null)
    }
  }

  async function cancelar(c: Cobranca) {
    if (!window.confirm(`Cancelar a cobrança "${c.descricao}"?`)) return
    setOcupado(c.id)
    try {
      await atualizarCobranca(c.id, { status: 'cancelada' })
      await recarregar()
    } catch (e) {
      setErro(e instanceof Error ? e.message : String(e))
    } finally {
      setOcupado(null)
    }
  }

  const pendentes = lista.filter((c) => c.status === 'pendente' || c.status === 'atrasada')
  const totalPendente = pendentes.reduce((t, c) => t + Number(c.valor), 0)

  return (
    <>
      <div className="gestao-acoes">
        <button className="btn" disabled={ocupado === 'mes'} onClick={() => void gerarMes()}>
          {ocupado === 'mes' ? 'Gerando…' : 'Gerar mensalidades do mês'}
        </button>
        <button className="btn--voltar" disabled={ocupado === 'nova'} onClick={() => void novaAvulsa()}>
          + Cobrança avulsa
        </button>
        <span className="espaco" />
        {pendentes.length > 0 && (
          <span style={{ fontSize: '0.8rem', color: 'var(--t-500)' }}>
            {pendentes.length} pendente(s) · {formatarBRL(totalPendente)}
          </span>
        )}
      </div>

      {erro && <div className="erro-msg">{erro}</div>}
      {msg && <div className="nota">{msg}</div>}
      {carregando && <p style={{ color: 'var(--t-500)', fontSize: '0.85rem' }}>Carregando…</p>}

      {!carregando && lista.length === 0 && !erro && (
        <div className="card">
          <h3>Nenhuma cobrança ainda.</h3>
          <p>
            Configure a mensalidade dos clientes (aba Clientes → ficha → Cobrança) e clique em
            “Gerar mensalidades do mês”. Cobranças avulsas nascem de orçamentos aprovados, ou pelo
            botão “+ Cobrança avulsa”.
          </p>
        </div>
      )}

      {lista.length > 0 && (
        <div className="tabela-wrap">
          <table className="tabela">
            <thead>
              <tr>
                <th>Cliente</th>
                <th>Descrição</th>
                <th>Valor</th>
                <th>Vencimento</th>
                <th>Status</th>
                <th>Pagamento</th>
                <th className="acoes"></th>
              </tr>
            </thead>
            <tbody>
              {lista.map((c) => (
                <tr key={c.id}>
                  <td>{nomeCliente(c.cliente_id)}</td>
                  <td>
                    {c.descricao}
                    {c.tipo === 'mensalidade' && (
                      <span className="badge badge--dourado" style={{ marginLeft: 6 }}>
                        mensal
                      </span>
                    )}
                  </td>
                  <td className="num">{formatarBRL(c.valor)}</td>
                  <td>{formatarData(c.vencimento)}</td>
                  <td>
                    <span className={`badge ${BADGE_COBRANCA[c.status]}`}>{c.status}</span>
                  </td>
                  <td>
                    {c.link_pagamento ? (
                      <button className="btn-mini" onClick={() => void copiarLink(c)}>
                        Copiar link
                      </button>
                    ) : (
                      <span style={{ color: 'var(--t-400)', fontSize: '0.75rem' }}>sem link</span>
                    )}
                  </td>
                  <td className="acoes">
                    {c.status !== 'paga' && c.status !== 'cancelada' && (
                      <>
                        {!c.link_pagamento && (
                          <button
                            className="btn-mini"
                            disabled={ocupado === c.id}
                            onClick={() => void gerarLink(c)}
                          >
                            Gerar boleto/cartão
                          </button>
                        )}
                        <button
                          className="btn-mini"
                          disabled={ocupado === c.id}
                          onClick={() => void colarLink(c)}
                        >
                          Colar link
                        </button>
                        <button
                          className="btn-mini"
                          disabled={ocupado === c.id}
                          onClick={() => void marcarPaga(c)}
                        >
                          Marcar paga
                        </button>
                        <button
                          className="btn-mini btn-mini--perigo"
                          disabled={ocupado === c.id}
                          onClick={() => void cancelar(c)}
                        >
                          Cancelar
                        </button>
                      </>
                    )}
                    {c.status === 'paga' && c.pago_em && (
                      <span style={{ color: 'var(--t-400)', fontSize: '0.75rem' }}>
                        paga em {formatarData(c.pago_em)}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  )
}
