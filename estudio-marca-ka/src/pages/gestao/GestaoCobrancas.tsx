import { useEffect, useMemo, useState } from 'react'
import type { Cliente, Cobranca, CobrancaStatus } from '../../lib/database.types'
import { listarClientes } from '../../lib/api'
import {
  atualizarCobranca,
  criarCobranca,
  excluirCobranca,
  gerarLinkMercadoPago,
  gerarMensalidades,
  listarCobrancas,
  marcarCobrancaPaga,
  formatarBRL,
  formatarData,
} from '../../lib/gestao'
import { abrirWhatsApp, primeiroNome } from '../../lib/whatsapp'
import { useToast } from '../../components/Toast'

const BADGE_COBRANCA: Record<CobrancaStatus, string> = {
  pendente: 'badge--azul',
  paga: 'badge--verde',
  atrasada: 'badge--vermelho',
  cancelada: 'badge--cinza',
}

// Soma `k` meses a uma data YYYY-MM-DD (para os vencimentos das parcelas).
function somarMeses(iso: string, k: number): string {
  const [y, m, d] = iso.split('-').map(Number)
  const dt = new Date(y, m - 1 + k, d)
  const mm = String(dt.getMonth() + 1).padStart(2, '0')
  const dd = String(dt.getDate()).padStart(2, '0')
  return `${dt.getFullYear()}-${mm}-${dd}`
}

// Cobranças: mensalidades (geradas por mês) + avulsas (de orçamento aprovado).
// O link de pagamento (cartão/boleto/PIX) vem do Mercado Pago via Edge Function.
export function GestaoCobrancas() {
  const { mostrar } = useToast()
  const [lista, setLista] = useState<Cobranca[]>([])
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [erro, setErro] = useState<string | null>(null)
  const [ocupado, setOcupado] = useState<string | null>(null) // id da linha em ação
  const [carregando, setCarregando] = useState(true)
  // Formulário de cobrança avulsa (criar OU editar) — sem window.prompt.
  const [criando, setCriando] = useState(false)
  const [editandoId, setEditandoId] = useState<string | null>(null)
  const [novoCli, setNovoCli] = useState('')
  const [novaDesc, setNovaDesc] = useState('')
  const [novoValor, setNovoValor] = useState('')
  const [novoVenc, setNovoVenc] = useState('')
  const [novaForma, setNovaForma] = useState<'avista' | 'parcelado' | 'mensal'>('avista')
  const [novaVezes, setNovaVezes] = useState('2')
  // Colar link de pagamento (inline, por linha)
  const [linkPara, setLinkPara] = useState<string | null>(null)
  const [linkTemp, setLinkTemp] = useState('')

  const nomeCliente = useMemo(() => {
    const m = new Map(clientes.map((c) => [c.id, c.nome_marca]))
    return (id: string | null) => (id ? (m.get(id) ?? '-') : '-')
  }, [clientes])

  const clientePorId = useMemo(() => new Map(clientes.map((c) => [c.id, c])), [clientes])

  function cobrarWhatsApp(c: Cobranca) {
    const cliente = c.cliente_id ? clientePorId.get(c.cliente_id) : null
    const nome = primeiroNome(cliente?.responsavel ?? cliente?.nome_marca)
    const linhas = [
      `Oi${nome ? `, ${nome}` : ''}! Tudo bem? 😊`,
      '',
      `Segue a cobrança: ${c.descricao}`,
      `Valor: ${formatarBRL(c.valor)} · vencimento: ${formatarData(c.vencimento)}`,
    ]
    if (c.link_pagamento) {
      linhas.push('', `Você pode pagar por aqui (cartão, boleto ou PIX): ${c.link_pagamento}`)
    }
    linhas.push('', 'Qualquer dúvida, me chama! Kelly')
    abrirWhatsApp(
      c.telefone ?? cliente?.telefone,
      linhas.join('\n'),
      cliente ? (cliente.responsavel ?? cliente.nome_marca) : null,
    )
  }

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
    mostrar(texto)
  }

  async function gerarMes() {
    setOcupado('mes')
    setErro(null)
    try {
      const qtd = await gerarMensalidades()
      avisar(
        qtd > 0
          ? `${qtd} mensalidade(s) do mês geradas.`
          : 'Nenhuma mensalidade nova, clientes com cobrança ativa já têm a deste mês (ou não há clientes com mensalidade configurada).',
      )
      await recarregar()
    } catch (e) {
      setErro(e instanceof Error ? e.message : String(e))
    } finally {
      setOcupado(null)
    }
  }

  function abrirNova() {
    if (clientes.length === 0) {
      setErro('Cadastre um cliente primeiro (aba Clientes).')
      return
    }
    setEditandoId(null)
    setNovoCli(clientes[0].id)
    setNovaDesc('')
    setNovoValor('')
    setNovoVenc(new Date().toISOString().slice(0, 10))
    setNovaForma('avista')
    setNovaVezes('2')
    setErro(null)
    setCriando(true)
  }

  function abrirEditar(c: Cobranca) {
    setEditandoId(c.id)
    setNovoCli(c.cliente_id ?? '')
    setNovaDesc(c.descricao)
    setNovoValor(String(c.valor))
    setNovoVenc(c.vencimento)
    setNovaForma(c.tipo === 'mensalidade' ? 'mensal' : 'avista')
    setNovaVezes('2')
    setErro(null)
    setCriando(true)
  }

  function fecharForm() {
    setCriando(false)
    setEditandoId(null)
  }

  async function salvarForm() {
    const cliente = clientes.find((c) => c.id === novoCli)
    const valor = Number(novoValor.replace(',', '.'))
    if (!cliente || !novaDesc.trim() || !valor || valor <= 0 || !novoVenc) {
      setErro('Preencha o cliente, a descrição, um valor maior que zero e o vencimento.')
      return
    }
    // Parcelado → N cobranças (uma por mês); mensal → 1 cobrança de mensalidade.
    const parcelas = novaForma === 'parcelado' ? Math.min(24, Math.max(2, Number(novaVezes) || 2)) : 1
    const tipo = novaForma === 'mensal' ? 'mensalidade' : 'avulsa'
    const descBase = novaDesc.trim()
    setOcupado('nova')
    setErro(null)
    try {
      if (editandoId && parcelas === 1) {
        // Editar uma cobrança simples: só atualiza os campos.
        await atualizarCobranca(editandoId, {
          cliente_id: cliente.id,
          descricao: descBase,
          valor,
          vencimento: novoVenc,
        })
        mostrar('Cobrança atualizada')
      } else {
        // Criar (ou, ao editar em parcelado, vira a 1ª parcela + cria as demais).
        for (let k = 0; k < parcelas; k++) {
          const desc = parcelas > 1 ? `${descBase} (${k + 1}/${parcelas})` : descBase
          const venc = somarMeses(novoVenc, k)
          if (editandoId && k === 0) {
            await atualizarCobranca(editandoId, { cliente_id: cliente.id, descricao: desc, valor, vencimento: venc })
          } else {
            await criarCobranca({
              cliente_id: cliente.id,
              tipo,
              descricao: desc,
              valor,
              vencimento: venc,
              telefone: cliente.telefone ?? null,
            })
          }
        }
        mostrar(
          parcelas > 1
            ? `${parcelas} parcelas criadas (uma por mês)`
            : editandoId
              ? 'Cobrança atualizada'
              : 'Cobrança criada',
        )
      }
      fecharForm()
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
          ', a função "mp-criar-cobranca" precisa estar publicada no Supabase com o segredo ' +
          'MP_ACCESS_TOKEN. Enquanto isso, você pode colar um link manual (botão ao lado).',
      )
    } finally {
      setOcupado(null)
    }
  }

  function abrirColarLink(c: Cobranca) {
    setLinkPara(c.id)
    setLinkTemp(c.link_pagamento ?? '')
  }
  async function salvarColarLink() {
    if (!linkPara) return
    setOcupado(linkPara)
    try {
      await atualizarCobranca(linkPara, { link_pagamento: linkTemp.trim() || null })
      setLinkPara(null)
      mostrar('Link de pagamento salvo')
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
    avisar('Link de pagamento copiado, envie ao cliente.')
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

  async function excluir(c: Cobranca) {
    if (
      !window.confirm(
        `Excluir de vez a cobrança "${c.descricao}"? Ela some do histórico e não dá para ` +
          'recuperar. (Para manter registro, prefira "Cancelar".)',
      )
    )
      return
    setOcupado(c.id)
    try {
      await excluirCobranca(c.id)
      await recarregar()
    } catch (e) {
      setErro(e instanceof Error ? e.message : String(e))
    } finally {
      setOcupado(null)
    }
  }

  const pendentes = lista.filter((c) => c.status === 'pendente' || c.status === 'atrasada')
  const totalPendente = pendentes.reduce((t, c) => t + Number(c.valor), 0)

  const nParcelas = novaForma === 'parcelado' ? Math.min(24, Math.max(2, Number(novaVezes) || 2)) : 1
  const valorNum = Number(novoValor.replace(',', '.')) || 0

  return (
    <>
      <div className="gestao-acoes">
        <button className="btn" disabled={ocupado === 'mes'} onClick={() => void gerarMes()}>
          {ocupado === 'mes' ? 'Gerando…' : 'Gerar mensalidades do mês'}
        </button>
        <button className="btn--voltar" disabled={ocupado === 'nova' || criando} onClick={abrirNova}>
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
      {carregando && <p style={{ color: 'var(--t-500)', fontSize: '0.85rem' }}>Carregando…</p>}

      {criando && (
        <div className="card">
          <h3>{editandoId ? 'Editar cobrança' : 'Nova cobrança avulsa'}</h3>
          <div className="form-grade">
            <div className="field">
              <label>Cliente</label>
              <select value={novoCli} onChange={(e) => setNovoCli(e.target.value)}>
                {clientes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nome_marca}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>Descrição</label>
              <input
                value={novaDesc}
                onChange={(e) => setNovaDesc(e.target.value)}
                placeholder="ex.: Criação de logo"
              />
            </div>
            <div className="field">
              <label>Forma de pagamento</label>
              <select value={novaForma} onChange={(e) => setNovaForma(e.target.value as typeof novaForma)}>
                <option value="avista">À vista</option>
                <option value="parcelado">Parcelado</option>
                <option value="mensal">Cobrança mensal</option>
              </select>
            </div>
            {novaForma === 'parcelado' && (
              <div className="field">
                <label>Em quantas vezes</label>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={2}
                  value={novaVezes}
                  onChange={(e) => setNovaVezes(e.target.value.replace(/\D/g, ''))}
                  placeholder="ex.: 2"
                />
              </div>
            )}
            <div className="field">
              <label>
                {novaForma === 'parcelado'
                  ? 'Valor de cada parcela (R$)'
                  : novaForma === 'mensal'
                    ? 'Valor por mês (R$)'
                    : 'Valor (R$)'}
              </label>
              <input
                type="number"
                inputMode="decimal"
                min={0}
                step="0.01"
                value={novoValor}
                onChange={(e) => setNovoValor(e.target.value)}
                placeholder="ex.: 500"
              />
            </div>
            <div className="field">
              <label>{novaForma === 'parcelado' ? '1º vencimento' : 'Vencimento'}</label>
              <input type="date" value={novoVenc} onChange={(e) => setNovoVenc(e.target.value)} />
            </div>
          </div>

          {novaForma === 'parcelado' && valorNum > 0 && (
            <p style={{ fontSize: '0.8rem', color: 'var(--t-500)', margin: '0.2rem 0 0.4rem' }}>
              {nParcelas}× de {formatarBRL(valorNum)} = <strong>{formatarBRL(nParcelas * valorNum)}</strong>. O
              sistema cria {nParcelas} cobranças, uma por mês a partir do 1º vencimento.
            </p>
          )}

          <p style={{ display: 'flex', gap: '0.6rem', marginTop: '0.2rem' }}>
            <button className="btn" disabled={ocupado === 'nova'} onClick={() => void salvarForm()}>
              {ocupado === 'nova'
                ? 'Salvando…'
                : editandoId
                  ? 'Salvar alterações'
                  : novaForma === 'parcelado'
                    ? 'Criar parcelas'
                    : 'Criar cobrança'}
            </button>
            <button className="btn--voltar" onClick={fecharForm}>
              Cancelar
            </button>
          </p>
        </div>
      )}

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
                  <td className="cel-nome" data-label="Cliente">{nomeCliente(c.cliente_id)}</td>
                  <td data-label="Descrição">
                    {c.descricao}
                    {c.tipo === 'mensalidade' && (
                      <span className="badge badge--dourado" style={{ marginLeft: 6 }}>
                        mensal
                      </span>
                    )}
                  </td>
                  <td className="num" data-label="Valor">{formatarBRL(c.valor)}</td>
                  <td data-label="Vencimento">{formatarData(c.vencimento)}</td>
                  <td data-label="Status">
                    <span className={`badge ${BADGE_COBRANCA[c.status]}`}>{c.status}</span>
                  </td>
                  <td data-label="Pagamento">
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
                        <button
                          className="btn-mini"
                          disabled={ocupado === c.id}
                          onClick={() => abrirEditar(c)}
                        >
                          Editar
                        </button>
                        <button
                          className="btn-mini btn-mini--whats"
                          disabled={ocupado === c.id}
                          onClick={() => cobrarWhatsApp(c)}
                        >
                          WhatsApp
                        </button>
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
                          onClick={() => abrirColarLink(c)}
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
                        {linkPara === c.id && (
                          <div className="colar-link">
                            <input
                              autoFocus
                              value={linkTemp}
                              onChange={(e) => setLinkTemp(e.target.value)}
                              placeholder="Cole aqui o link do Mercado Pago"
                            />
                            <button className="btn-mini" disabled={ocupado === c.id} onClick={() => void salvarColarLink()}>
                              Salvar
                            </button>
                            <button className="btn-mini" onClick={() => setLinkPara(null)}>
                              Cancelar
                            </button>
                          </div>
                        )}
                      </>
                    )}
                    {c.status === 'paga' && c.pago_em && (
                      <span style={{ color: 'var(--t-400)', fontSize: '0.75rem' }}>
                        paga em {formatarData(c.pago_em)}
                      </span>
                    )}
                    <button
                      className="btn-mini btn-mini--perigo"
                      disabled={ocupado === c.id}
                      onClick={() => void excluir(c)}
                    >
                      Excluir
                    </button>
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
