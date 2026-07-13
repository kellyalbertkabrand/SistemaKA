import { Fragment, useEffect, useMemo, useState } from 'react'
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
  statusEfetivo,
  formatarBRL,
  formatarData,
} from '../../lib/gestao'
import { abrirWhatsApp, primeiroNome } from '../../lib/whatsapp'
import { confirmar } from '../../lib/confirmar'
import { useToast } from '../../components/Toast'
import { autoAltura, parseValorBR, somarDinheiro, hojeLocal } from '../../lib/ui'
import { rotuloStatus } from '../../lib/rotulos'
import { Busca, normalizar } from '../../components/Busca'

const BADGE_COBRANCA: Record<CobrancaStatus, string> = {
  pendente: 'badge--azul',
  paga: 'badge--verde',
  atrasada: 'badge--vermelho',
  cancelada: 'badge--cinza',
}

// Soma `k` meses a uma data YYYY-MM-DD (para os vencimentos das parcelas).
// Faz o "clamp" do dia: se o dia não existe no mês alvo (ex.: 31/01 + 1 mês),
// usa o último dia do mês (28/02) em vez de rolar para março.
function somarMeses(iso: string, k: number): string {
  const [y, m, d] = iso.split('-').map(Number)
  const alvoMes = m - 1 + k
  const ultimoDia = new Date(y, alvoMes + 1, 0).getDate() // dia 0 do mês seguinte = último do alvo
  const dt = new Date(y, alvoMes, Math.min(d, ultimoDia))
  const mm = String(dt.getMonth() + 1).padStart(2, '0')
  const dd = String(dt.getDate()).padStart(2, '0')
  return `${dt.getFullYear()}-${mm}-${dd}`
}

// "2026-07" → "Julho de 2026" (cabeçalho dos grupos por mês).
function rotuloMes(chave: string): string {
  const [y, m] = chave.split('-')
  if (!y || !m) return 'Sem vencimento'
  return new Date(Number(y), Number(m) - 1, 1)
    .toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
    .replace(/^./, (c) => c.toUpperCase())
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
  const [busca, setBusca] = useState('')
  const [filtroStatus, setFiltroStatus] = useState<'todos' | CobrancaStatus>('todos')
  const [agrupar, setAgrupar] = useState<'mes' | 'cliente'>('mes')
  // Formulário de cobrança avulsa (criar OU editar) — sem window.prompt.
  const [criando, setCriando] = useState(false)
  const [editandoId, setEditandoId] = useState<string | null>(null)
  const [novoCli, setNovoCli] = useState('')
  const [novaDesc, setNovaDesc] = useState('')
  const [novoValor, setNovoValor] = useState('')
  const [novoVenc, setNovoVenc] = useState('')
  const [novaForma, setNovaForma] = useState<'avista' | 'parcelado' | 'mensal'>('avista')
  const [novaVezes, setNovaVezes] = useState('2')
  // VM Rocks participa desta cobrança? (aparece na visão financeira dela)
  const [novaVM, setNovaVM] = useState(false)
  const [novoValorVM, setNovoValorVM] = useState('')
  // Colar link de pagamento (inline, por linha)
  const [linkPara, setLinkPara] = useState<string | null>(null)
  const [linkTemp, setLinkTemp] = useState('')
  // Marcar como paga: escolher a DATA do pagamento (inline, por linha)
  const [pagarPara, setPagarPara] = useState<string | null>(null)
  const [pagarData, setPagarData] = useState('')

  const nomeCliente = useMemo(() => {
    const m = new Map(clientes.map((c) => [c.id, c.nome_marca]))
    return (id: string | null) => (id ? (m.get(id) ?? '-') : '-')
  }, [clientes])

  const clientePorId = useMemo(() => new Map(clientes.map((c) => [c.id, c])), [clientes])

  const listaFiltrada = useMemo(() => {
    const q = normalizar(busca).trim()
    return lista.filter((c) => {
      if (filtroStatus !== 'todos' && statusEfetivo(c) !== filtroStatus) return false
      if (q && !normalizar(`${nomeCliente(c.cliente_id)} ${c.descricao ?? ''}`).includes(q)) return false
      return true
    })
  }, [lista, busca, filtroStatus, nomeCliente])

  // Contagem por status (usando o status efetivo, com "atrasada" derivada).
  const contagem = useMemo(() => {
    const c = { pendente: 0, atrasada: 0, paga: 0, cancelada: 0 } as Record<CobrancaStatus, number>
    for (const cb of lista) c[statusEfetivo(cb)]++
    return c
  }, [lista])

  // Agrupa as cobranças (por MÊS do vencimento ou por CLIENTE) para dar
  // hierarquia visual — antes era uma tabela onde tudo parecia igual.
  const grupos = useMemo(() => {
    const map = new Map<string, { chave: string; rotulo: string; ordem: string; itens: Cobranca[] }>()
    for (const c of listaFiltrada) {
      let chave: string, rotulo: string, ordem: string
      if (agrupar === 'cliente') {
        chave = c.cliente_id ?? 'sem'
        rotulo = nomeCliente(c.cliente_id)
        ordem = normalizar(rotulo || 'zzz')
      } else {
        chave = (c.vencimento || '').slice(0, 7) || 'sem'
        rotulo = chave === 'sem' ? 'Sem vencimento' : rotuloMes(chave)
        ordem = chave === 'sem' ? '9999' : chave
      }
      const cur = map.get(chave) ?? { chave, rotulo, ordem, itens: [] }
      cur.itens.push(c)
      map.set(chave, cur)
    }
    const arr = [...map.values()].sort((a, b) => (a.ordem < b.ordem ? -1 : a.ordem > b.ordem ? 1 : 0))
    for (const g of arr) {
      g.itens.sort((a, b) => ((a.vencimento || '') < (b.vencimento || '') ? -1 : 1))
    }
    return arr
  }, [listaFiltrada, agrupar, nomeCliente])

  // Total ainda em aberto (pendente/atrasada) de um grupo.
  const totalEmAberto = (itens: Cobranca[]) =>
    somarDinheiro(
      itens
        .filter((c) => {
          const s = statusEfetivo(c)
          return s === 'pendente' || s === 'atrasada'
        })
        .map((c) => Number(c.valor)),
    )

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
      // O telefone atual da ficha vem primeiro; `||` garante que vazio/nulo
      // caia para o próximo (o `??` deixava passar string vazia antiga).
      cliente?.telefone || c.telefone,
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
    setNovaVM(false)
    setNovoValorVM('')
    setErro(null)
    setCriando(true)
  }

  function abrirEditar(c: Cobranca) {
    setEditandoId(c.id)
    // Se a cobrança está sem cliente (ou o id não existe mais), já seleciona o
    // 1º da lista — assim o que aparece no campo é o que será salvo de verdade.
    const cid =
      c.cliente_id && clientes.some((x) => x.id === c.cliente_id) ? c.cliente_id : clientes[0]?.id ?? ''
    setNovoCli(cid)
    setNovaDesc(c.descricao)
    setNovoValor(String(c.valor))
    setNovoVenc(c.vencimento)
    setNovaForma(c.tipo === 'mensalidade' ? 'mensal' : 'avista')
    setNovaVezes('2')
    setNovaVM(c.vm_participa ?? false)
    setNovoValorVM(c.valor_vm != null ? String(c.valor_vm).replace('.', ',') : '')
    setErro(null)
    setCriando(true)
  }

  function fecharForm() {
    setCriando(false)
    setEditandoId(null)
  }

  async function salvarForm() {
    const cliente = clientes.find((c) => c.id === novoCli)
    const valor = parseValorBR(novoValor)
    if (!cliente || !novaDesc.trim() || !valor || valor <= 0 || !novoVenc) {
      setErro('Preencha o cliente, a descrição, um valor maior que zero e o vencimento.')
      return
    }
    // Parcelado → N cobranças (uma por mês); mensal → 1 cobrança de mensalidade.
    const parcelas = novaForma === 'parcelado' ? Math.min(24, Math.max(2, Number(novaVezes) || 2)) : 1
    const tipo = novaForma === 'mensal' ? 'mensalidade' : 'avulsa'
    const descBase = novaDesc.trim()
    // Valor da VM: se ela participa e o campo ficou vazio, herda o valor total.
    const valorVM = novaVM ? (novoValorVM.trim() ? parseValorBR(novoValorVM) : valor) : null
    if (valorVM != null && valorVM > valor) {
      setErro('O valor da VM Rocks não pode ser maior que o valor cobrado do cliente.')
      return
    }
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
          vm_participa: novaVM,
          valor_vm: valorVM,
        })
        mostrar('Cobrança atualizada')
      } else {
        // Criar (ou, ao editar em parcelado, vira a 1ª parcela + cria as demais).
        for (let k = 0; k < parcelas; k++) {
          const desc = parcelas > 1 ? `${descBase} (${k + 1}/${parcelas})` : descBase
          const venc = somarMeses(novoVenc, k)
          if (editandoId && k === 0) {
            await atualizarCobranca(editandoId, {
              cliente_id: cliente.id,
              descricao: desc,
              valor,
              vencimento: venc,
              vm_participa: novaVM,
              valor_vm: valorVM,
            })
          } else {
            await criarCobranca({
              cliente_id: cliente.id,
              tipo,
              descricao: desc,
              valor,
              vencimento: venc,
              telefone: cliente.telefone ?? null,
              vm_participa: novaVM,
              valor_vm: valorVM,
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
          ' O link automático do Mercado Pago depende de uma Cloud Function (plano Blaze). ' +
          'Enquanto isso, use "Colar link" para colar um link de pagamento manual.',
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

  // Abre o seletor de data do pagamento (default hoje).
  function abrirMarcarPaga(c: Cobranca) {
    setLinkPara(null)
    setPagarPara(c.id)
    setPagarData(hojeLocal())
  }

  async function confirmarPaga() {
    if (!pagarPara) return
    setOcupado(pagarPara)
    try {
      await marcarCobrancaPaga(pagarPara, pagarData || hojeLocal())
      setPagarPara(null)
      await recarregar()
      mostrar('Cobrança marcada como paga ✓', 'ok')
    } catch (e) {
      setErro(e instanceof Error ? e.message : String(e))
    } finally {
      setOcupado(null)
    }
  }

  async function cancelar(c: Cobranca) {
    if (!(await confirmar(`Cancelar a cobrança "${c.descricao}"?`, { perigo: true, confirmar: 'Cancelar cobrança' }))) return
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
    const ok = await confirmar(
      `Excluir de vez a cobrança "${c.descricao}"? Ela some do histórico e não dá para ` +
        'recuperar. (Para manter registro, prefira "Cancelar".)',
      { perigo: true, confirmar: 'Excluir' },
    )
    if (!ok) return
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

  const pendentes = lista.filter((c) => {
    const s = statusEfetivo(c)
    return s === 'pendente' || s === 'atrasada'
  })
  const totalPendente = somarDinheiro(pendentes.map((c) => Number(c.valor)))
  const atrasadas = lista.filter((c) => statusEfetivo(c) === 'atrasada')
  const totalAtrasado = somarDinheiro(atrasadas.map((c) => Number(c.valor)))

  const nParcelas = novaForma === 'parcelado' ? Math.min(24, Math.max(2, Number(novaVezes) || 2)) : 1
  const valorNum = parseValorBR(novoValor)

  // Formulário de criar/editar — renderizado no TOPO ao criar uma nova, e INLINE
  // (logo abaixo do card) ao editar, para abrir onde a KA clicou.
  const formCard = (
    <div className="card cob-form">
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
          <textarea
            rows={1}
            className="campo-cresce"
            value={novaDesc}
            ref={autoAltura}
            onChange={(e) => {
              setNovaDesc(e.target.value)
              autoAltura(e.currentTarget)
            }}
            placeholder="ex.: Criação de logo + identidade"
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
            type="text"
            inputMode="decimal"
            value={novoValor}
            onChange={(e) => setNovoValor(e.target.value)}
            placeholder="ex.: 1.500,00"
          />
        </div>
        <div className="field">
          <label>{novaForma === 'parcelado' ? '1º vencimento' : 'Vencimento'}</label>
          <input type="date" value={novoVenc} onChange={(e) => setNovoVenc(e.target.value)} />
        </div>

        <div className="field campo-toda">
          <label className="check-vm">
            <input type="checkbox" checked={novaVM} onChange={(e) => setNovaVM(e.target.checked)} />
            <span>
              <strong>VM Rocks participa</strong> desta cobrança (aparece no financeiro dela)
            </span>
          </label>
        </div>
        {novaVM && (
          <div className="field">
            <label>Valor da VM Rocks (R$)</label>
            <input
              type="text"
              inputMode="decimal"
              value={novoValorVM}
              onChange={(e) => setNovoValorVM(e.target.value)}
              placeholder={`igual ao total (${novoValor || '0'})`}
            />
            <span className="campo-ajuda">Deixe vazio se for o mesmo valor cobrado do cliente.</span>
          </div>
        )}
      </div>

      {novaForma === 'parcelado' && valorNum > 0 && (
        <p style={{ fontSize: '0.8rem', color: 'var(--t-500)', margin: '0.2rem 0 0.4rem' }}>
          {nParcelas}× de {formatarBRL(valorNum)} = <strong>{formatarBRL(nParcelas * valorNum)}</strong>. O
          sistema cria {nParcelas} cobranças, uma por mês a partir do 1º vencimento.
        </p>
      )}

      {erro && <div className="erro-msg" style={{ marginTop: '0.4rem' }}>{erro}</div>}

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
  )

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
            {pendentes.length} em aberto · {formatarBRL(totalPendente)}
            {totalAtrasado > 0 && (
              <>
                {' '}
                · <strong style={{ color: 'var(--erro)' }}>{formatarBRL(totalAtrasado)} atrasado</strong>
              </>
            )}
          </span>
        )}
      </div>

      {lista.length > 0 && (
        <div className="chips" style={{ marginBottom: '0.6rem' }}>
          {([
            ['todos', 'Todas', lista.length],
            ['pendente', 'Pendentes', contagem.pendente],
            ['atrasada', 'Atrasadas', contagem.atrasada],
            ['paga', 'Pagas', contagem.paga],
            ['cancelada', 'Canceladas', contagem.cancelada],
          ] as const).map(([val, rot, n]) => (
            <button
              key={val}
              className={`chip ${filtroStatus === val ? 'chip--on' : ''} ${val === 'atrasada' && n > 0 ? 'chip--alerta' : ''}`}
              onClick={() => setFiltroStatus(val)}
            >
              {rot} <span className="chip__n">{n}</span>
            </button>
          ))}
        </div>
      )}

      {erro && !criando && <div className="erro-msg">{erro}</div>}
      {carregando && <p style={{ color: 'var(--t-500)', fontSize: '0.85rem' }}>Carregando…</p>}

      {/* Nova cobrança abre aqui no topo; a EDIÇÃO abre inline sob o card. */}
      {criando && editandoId === null && formCard}

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
        <Busca valor={busca} aoMudar={setBusca} placeholder="Buscar por cliente ou descrição…" />
      )}
      {listaFiltrada.length > 0 && (
        <div className="cob-topo">
          <span className="cob-topo__rot">Agrupar por</span>
          <div className="seg seg--escopo">
            <button className={agrupar === 'mes' ? 'seg__on' : ''} onClick={() => setAgrupar('mes')}>
              Mês
            </button>
            <button className={agrupar === 'cliente' ? 'seg__on' : ''} onClick={() => setAgrupar('cliente')}>
              Cliente
            </button>
          </div>
        </div>
      )}
      {lista.length > 0 && listaFiltrada.length === 0 && (
        <p className="ativ-vazio">Nenhuma cobrança encontrada para “{busca}”.</p>
      )}

      {grupos.map((g) => (
        <section key={g.chave} className="cob-grupo">
          <div className="mes-grupo__cab">
            <span className="mes-grupo__nome">{g.rotulo}</span>
            <span className="mes-grupo__total">
              {g.itens.length} {g.itens.length === 1 ? 'cobrança' : 'cobranças'}
              {totalEmAberto(g.itens) > 0 && <> · {formatarBRL(totalEmAberto(g.itens))} em aberto</>}
            </span>
          </div>
          <div className="cob-lista">
            {g.itens.map((c) => {
              const s = statusEfetivo(c)
              const ativa = c.status !== 'paga' && c.status !== 'cancelada'
              return (
                <Fragment key={c.id}>
                  <div className={`cob-card cob-card--${s} ${editandoId === c.id ? 'cob-card--editando' : ''}`}>
                  <div className="cob-card__cab">
                    <span className="cob-card__cliente">
                      {agrupar === 'cliente' ? formatarData(c.vencimento) : nomeCliente(c.cliente_id)}
                    </span>
                    <span className={`badge ${BADGE_COBRANCA[s]}`}>{rotuloStatus('cobranca', s)}</span>
                  </div>
                  <div className="cob-card__desc">
                    {c.descricao}
                    {c.tipo === 'mensalidade' && <span className="badge badge--dourado">mensal</span>}
                    {c.vm_participa && (
                      <span
                        className="badge badge--vm-mini"
                        title={c.valor_vm != null ? `VM Rocks: ${formatarBRL(c.valor_vm)}` : 'VM Rocks'}
                      >
                        VM
                      </span>
                    )}
                  </div>
                  <div className="cob-card__meta">
                    <span className="cob-card__valor">{formatarBRL(c.valor)}</span>
                    <span className="cob-card__venc">
                      {agrupar === 'cliente' ? nomeCliente(c.cliente_id) : `vence ${formatarData(c.vencimento)}`}
                    </span>
                    {c.status === 'paga' && c.pago_em && (
                      <span className="cob-card__pago">paga em {formatarData(c.pago_em)}</span>
                    )}
                    {c.link_pagamento && (
                      <button className="btn-mini" onClick={() => void copiarLink(c)}>
                        Copiar link
                      </button>
                    )}
                  </div>

                  {ativa && (
                    <div className="cob-card__acoes">
                      <button className="btn-mini" disabled={ocupado === c.id} onClick={() => abrirEditar(c)}>
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
                        <button className="btn-mini" disabled={ocupado === c.id} onClick={() => void gerarLink(c)}>
                          Gerar boleto/cartão
                        </button>
                      )}
                      <button className="btn-mini" disabled={ocupado === c.id} onClick={() => abrirColarLink(c)}>
                        Colar link
                      </button>
                      <button className="btn-mini btn-mini--ok" disabled={ocupado === c.id} onClick={() => abrirMarcarPaga(c)}>
                        Marcar paga
                      </button>
                      <button className="btn-mini btn-mini--perigo" disabled={ocupado === c.id} onClick={() => void cancelar(c)}>
                        Cancelar
                      </button>
                    </div>
                  )}

                  {pagarPara === c.id && (
                    <div className="colar-link">
                      <label style={{ fontSize: '0.78rem', color: 'var(--t-500)' }}>Data do pagamento</label>
                      <input type="date" autoFocus value={pagarData} onChange={(e) => setPagarData(e.target.value)} />
                      <button className="btn-mini" disabled={ocupado === c.id} onClick={() => void confirmarPaga()}>
                        Confirmar
                      </button>
                      <button className="btn-mini" onClick={() => setPagarPara(null)}>
                        Cancelar
                      </button>
                    </div>
                  )}
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

                  <button
                    className="cob-card__excluir"
                    disabled={ocupado === c.id}
                    onClick={() => void excluir(c)}
                    title="Excluir de vez"
                  >
                    Excluir
                  </button>
                  </div>
                  {editandoId === c.id && formCard}
                </Fragment>
              )
            })}
          </div>
        </section>
      ))}
    </>
  )
}
