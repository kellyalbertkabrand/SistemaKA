import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { listarClientes } from '../../lib/api'
import { formatarBRL, formatarData, listarCobrancas, statusEfetivo } from '../../lib/gestao'
import type { Cliente, Cobranca } from '../../lib/database.types'
import { linhasFinanceiro, resumoPorQuem, rotuloForma } from '../../lib/financeiro'
import {
  atualizarLancamento,
  criarLancamento,
  excluirLancamento,
  listarLancamentos,
  type EscopoLancamento,
  type Lancamento,
  type TipoLancamento,
} from '../../lib/caixa'
import { useToast } from '../../components/Toast'
import { confirmar } from '../../lib/confirmar'
import { arredondar, parseValorBR, somarDinheiro } from '../../lib/ui'

// ============================================================================
// FINANCEIRO — gestor de caixa PESSOAL da KA. Junta:
//  - COBRANÇAS pagas (aba Cobranças) → entram como ENTRADAS automáticas;
//  - COBRANÇAS em aberto → aparecem em "A receber";
//  - ENTRADAS e SAÍDAS lançadas à mão aqui (coleção `caixa`).
// Saldo = entradas (recebidas) − saídas. Também mostra, num bloco à parte,
// "quem tem a receber" (KA/VM Rocks) vindo dos pagamentos do contrato.
// ============================================================================

const hoje = () => new Date().toISOString().slice(0, 10)

// "2026-07-..." → "julho de 2026"
function rotuloMes(chave: string): string {
  const [y, m] = chave.split('-')
  if (!y || !m) return 'Sem data'
  return new Date(Number(y), Number(m) - 1, 1)
    .toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
    .replace(/^./, (c) => c.toUpperCase())
}

// Agrupa itens por mês (YYYY-MM da data), somando o valor. Meses em ordem.
function agruparPorMes<T>(
  itens: T[],
  getData: (t: T) => string,
  getValor: (t: T) => number,
): { chave: string; total: number; itens: T[] }[] {
  const map = new Map<string, { chave: string; total: number; itens: T[] }>()
  for (const it of itens) {
    const chave = (getData(it) || '').slice(0, 7) || 'sem-data'
    const cur = map.get(chave) ?? { chave, total: 0, itens: [] }
    cur.total += getValor(it)
    cur.itens.push(it)
    map.set(chave, cur)
  }
  return [...map.values()].sort((a, b) => (a.chave < b.chave ? -1 : 1))
}

const mesDe = (iso: string) => (iso || '').slice(0, 7)

// Soma `k` meses a uma data YYYY-MM-DD, com clamp de dia (31/01 +1 → 28/02).
function somarMesesISO(iso: string, k: number): string {
  const [y, m, d] = iso.split('-').map(Number)
  const alvo = m - 1 + k
  const ultimo = new Date(y, alvo + 1, 0).getDate()
  const dt = new Date(y, alvo, Math.min(d, ultimo))
  const mm = String(dt.getMonth() + 1).padStart(2, '0')
  const dd = String(dt.getDate()).padStart(2, '0')
  return `${dt.getFullYear()}-${mm}-${dd}`
}

// Ocorrência de "a receber": uma cobrança num mês. Mensalidades geram uma
// ocorrência REAL (no mês do vencimento) + ocorrências PROJETADAS nos meses
// seguintes (recorrência), até o horizonte. Assim a mensalidade aparece em
// todos os próximos meses, não só no que foi lançada.
export interface OcorReceber {
  c: Cobranca
  venc: string
  projetada: boolean
}

function expandirReceber(cobs: Cobranca[], hojeChave: string, fimChave: string): OcorReceber[] {
  const out: OcorReceber[] = []
  const vistos = new Set<string>() // cliente|descrição|mês (real tem prioridade)
  for (const c of cobs) {
    out.push({ c, venc: c.vencimento, projetada: false })
    if (c.tipo === 'mensalidade') vistos.add(`${c.cliente_id}|${c.descricao}|${mesDe(c.vencimento)}`)
  }
  for (const c of cobs) {
    if (c.tipo !== 'mensalidade') continue
    for (let k = 1; k <= 24; k++) {
      const venc = somarMesesISO(c.vencimento, k)
      const mc = mesDe(venc)
      if (mc > fimChave) break
      if (mc < hojeChave) continue
      const chave = `${c.cliente_id}|${c.descricao}|${mc}`
      if (vistos.has(chave)) continue
      vistos.add(chave)
      out.push({ c, venc, projetada: true })
    }
  }
  return out
}

interface Mov {
  chave: string
  tipo: TipoLancamento
  descricao: string
  valor: number
  data: string
  origem: 'cobranca' | 'manual'
  escopo?: EscopoLancamento | null
  cliente?: string
  lancamento?: Lancamento
}

// Item da lista "A receber" (cobrança projetada OU entrada à mão a receber).
interface RecebItem {
  chave: string
  descricao: string
  cliente: string
  data: string
  valor: number
  escopo: EscopoLancamento
  origem: 'cobranca' | 'manual'
  projetada: boolean
  atrasada: boolean
  vmParticipa: boolean
  lancamento?: Lancamento
}

export function GestaoFinanceiro() {
  const { mostrar } = useToast()
  const [, setParams] = useSearchParams()
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [cobrancas, setCobrancas] = useState<Cobranca[]>([])
  const [lancamentos, setLancamentos] = useState<Lancamento[]>([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState<string | null>(null)
  // Visão: "Meu caixa" (pessoal da KA) OU "A receber da VM Rocks" (só o que é
  // dela — é a prévia do que a VM verá quando entrar com o login por papel).
  const [visao, setVisao] = useState<'caixa' | 'vm'>('caixa')

  // Formulário de entrada/saída (à mão)
  const [formTipo, setFormTipo] = useState<TipoLancamento | null>(null)
  const [editId, setEditId] = useState<string | null>(null)
  const [fDesc, setFDesc] = useState('')
  const [fValor, setFValor] = useState('')
  const [fData, setFData] = useState(hoje())
  const [fEscopo, setFEscopo] = useState<EscopoLancamento>('ka')
  const [fRecebido, setFRecebido] = useState(true) // entrada: já recebida ou a receber
  const [salvando, setSalvando] = useState(false)

  async function recarregar() {
    try {
      setCarregando(true)
      const [cs, cb, lc] = await Promise.all([listarClientes(), listarCobrancas(), listarLancamentos()])
      setClientes(cs)
      setCobrancas(cb)
      setLancamentos(lc)
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

  const nomeCliente = useMemo(() => {
    const m = new Map(clientes.map((c) => [c.id, c.nome_marca]))
    return (id: string | null) => (id ? (m.get(id) ?? '') : '')
  }, [clientes])

  // Um lançamento à mão que é ENTRADA ainda NÃO recebida = "a receber".
  const ehAReceberManual = (l: Lancamento) => l.tipo === 'entrada' && l.recebido === false

  // A receber = cobranças em aberto (pendente/atrasada — status derivado por
  // data) + entradas à mão marcadas como "a receber".
  const emAberto = (c: Cobranca) => {
    const s = statusEfetivo(c)
    return s === 'pendente' || s === 'atrasada'
  }
  const aReceber = cobrancas.filter(emAberto)
  const lancAReceber = lancamentos.filter(ehAReceberManual)
  const totalAReceber = somarDinheiro([
    ...aReceber.map((c) => Number(c.valor || 0)),
    ...lancAReceber.map((l) => Number(l.valor || 0)),
  ])
  // Projeta as mensalidades para os próximos meses (recorrência) — até 12 meses.
  const hojeChave = mesDe(hoje())
  const fimChave = mesDe(somarMesesISO(hoje(), 12))
  const ocorReceber = expandirReceber(aReceber, hojeChave, fimChave)
  const temMensalidade = aReceber.some((c) => c.tipo === 'mensalidade')

  // Lista unificada de "a receber" (cobranças projetadas + entradas à mão),
  // agrupada por mês. Cada item guarda a origem para saber o que renderizar.
  const recebTodos: RecebItem[] = [
    ...ocorReceber.map((o) => ({
      chave: `cob-${o.c.id}-${o.venc}`,
      descricao: o.c.descricao,
      cliente: nomeCliente(o.c.cliente_id) || 'sem cliente',
      data: o.venc,
      valor: Number(o.c.valor || 0),
      escopo: 'ka' as EscopoLancamento,
      origem: 'cobranca' as const,
      projetada: o.projetada,
      atrasada: !o.projetada && statusEfetivo(o.c) === 'atrasada',
      vmParticipa: !!o.c.vm_participa,
    })),
    ...lancAReceber.map((l) => ({
      chave: `man-${l.id}`,
      descricao: l.descricao,
      cliente: '',
      data: l.data,
      valor: Number(l.valor || 0),
      escopo: l.escopo ?? 'ka',
      origem: 'manual' as const,
      projetada: false,
      atrasada: l.data < hoje(),
      vmParticipa: false,
      lancamento: l,
    })),
  ]
  const aReceberPorMes = agruparPorMes(recebTodos, (r) => r.data, (r) => r.valor)

  // Movimentações do caixa = cobranças PAGAS (entradas automáticas) + lançamentos
  // à mão JÁ realizados (entradas recebidas + todas as saídas).
  const movimentos: Mov[] = useMemo(() => {
    const deCobranca: Mov[] = cobrancas
      .filter((c) => c.status === 'paga')
      .map((c) => ({
        chave: `cob-${c.id}`,
        tipo: 'entrada' as const,
        descricao: c.descricao,
        valor: Number(c.valor || 0),
        data: (c.pago_em ?? c.vencimento ?? '').slice(0, 10),
        origem: 'cobranca' as const,
        escopo: 'ka' as const,
        cliente: nomeCliente(c.cliente_id),
      }))
    const deMao: Mov[] = lancamentos
      .filter((l) => !(l.tipo === 'entrada' && l.recebido === false))
      .map((l) => ({
        chave: l.id,
        tipo: l.tipo,
        descricao: l.descricao,
        valor: Number(l.valor || 0),
        data: l.data,
        origem: 'manual' as const,
        escopo: l.escopo ?? 'ka',
        lancamento: l,
      }))
    return [...deCobranca, ...deMao].sort((a, b) => (a.data < b.data ? 1 : a.data > b.data ? -1 : 0))
  }, [cobrancas, lancamentos, nomeCliente])

  const totalEntradas = somarDinheiro(movimentos.filter((m) => m.tipo === 'entrada').map((m) => m.valor))
  const totalSaidas = somarDinheiro(movimentos.filter((m) => m.tipo === 'saida').map((m) => m.valor))
  const saldo = arredondar(totalEntradas - totalSaidas)

  // "Quem tem a receber" (KA/VM Rocks) — dos pagamentos do contrato.
  const linhas = linhasFinanceiro(clientes)
  const resumo = resumoPorQuem(linhas)
  const totalContratoUnico = somarDinheiro(linhas.map((l) => l.unico))
  const totalContratoMensal = somarDinheiro(linhas.map((l) => l.mensal))

  // Só o que é da VM Rocks (o que ela tem a receber nos clientes que atende com
  // a KA). É a única coisa que a VM enxerga — nunca o caixa da KA.
  const linhasVM = linhas.filter((l) => l.rotulo === 'VM Rocks')
  const totalVMUnico = somarDinheiro(linhasVM.map((l) => l.unico))
  const totalVMMensal = somarDinheiro(linhasVM.map((l) => l.mensal))

  // Cobranças em aberto onde a VM participa (valor dela = valor_vm, ou o total
  // se não foi informado) — agrupadas por mês.
  const valorDaVM = (c: Cobranca) => Number(c.valor_vm ?? c.valor ?? 0)
  const vmCobrancas = aReceber.filter((c) => c.vm_participa)
  const vmOcor = expandirReceber(vmCobrancas, hojeChave, fimChave)
  const vmCobrancasPorMes = agruparPorMes(vmOcor, (o) => o.venc, (o) => valorDaVM(o.c))
  const totalVMCobrancas = somarDinheiro(vmCobrancas.map(valorDaVM))
  const totalVMGeral = arredondar(totalVMUnico + totalVMCobrancas)

  function abrirForm(tipo: TipoLancamento) {
    setFormTipo(tipo)
    setEditId(null)
    setFDesc('')
    setFValor('')
    setFData(hoje())
    setFEscopo('ka')
    setFRecebido(true)
  }

  function editar(l: Lancamento) {
    setFormTipo(l.tipo)
    setEditId(l.id)
    setFDesc(l.descricao)
    setFValor(String(l.valor).replace('.', ','))
    setFData(l.data)
    setFEscopo(l.escopo ?? 'ka')
    setFRecebido(l.recebido !== false)
  }

  function fecharForm() {
    setFormTipo(null)
    setEditId(null)
  }

  async function salvar() {
    if (!formTipo) return
    const descricao = fDesc.trim()
    const valor = parseValorBR(fValor)
    if (!descricao) {
      mostrar('Escreva uma descrição.', 'erro')
      return
    }
    if (!valor || valor <= 0) {
      mostrar('Informe um valor maior que zero.', 'erro')
      return
    }
    setSalvando(true)
    try {
      const dados = {
        tipo: formTipo,
        descricao,
        valor,
        data: fData || hoje(),
        escopo: fEscopo,
        // Só entradas têm "recebido"; saídas são sempre realizadas.
        recebido: formTipo === 'entrada' ? fRecebido : true,
      }
      if (editId) {
        await atualizarLancamento(editId, dados)
        setLancamentos((l) => l.map((x) => (x.id === editId ? { ...x, ...dados } : x)))
        mostrar('Lançamento atualizado ✓', 'ok')
      } else {
        const novo = await criarLancamento(dados)
        setLancamentos((l) => [novo, ...l])
        mostrar(formTipo === 'entrada' ? 'Entrada lançada ✓' : 'Saída lançada ✓', 'ok')
      }
      fecharForm()
    } catch (e) {
      mostrar(e instanceof Error ? e.message : String(e), 'erro')
    } finally {
      setSalvando(false)
    }
  }

  async function excluir(l: Lancamento) {
    if (!(await confirmar(`Excluir "${l.descricao}"?`, { perigo: true, confirmar: 'Excluir' }))) return
    setLancamentos((x) => x.filter((y) => y.id !== l.id))
    try {
      await excluirLancamento(l.id)
      mostrar('Lançamento excluído.', 'ok')
    } catch (e) {
      mostrar(e instanceof Error ? e.message : String(e), 'erro')
      void recarregar()
    }
  }

  // Marca uma entrada "a receber" como RECEBIDA (passa a contar em Entradas/saldo).
  async function marcarRecebida(l: Lancamento) {
    setLancamentos((x) => x.map((y) => (y.id === l.id ? { ...y, recebido: true } : y)))
    try {
      await atualizarLancamento(l.id, { recebido: true })
      mostrar('Marcada como recebida ✓', 'ok')
    } catch (e) {
      mostrar(e instanceof Error ? e.message : String(e), 'erro')
      void recarregar()
    }
  }

  return (
    <>
      {erro && <div className="erro-msg" role="alert">{erro}</div>}
      {carregando && <p style={{ color: 'var(--t-500)', fontSize: '0.85rem' }}>Carregando…</p>}

      {!carregando && (
        <div className="seg nao-imprimir" style={{ marginBottom: '1rem' }}>
          <button className={visao === 'caixa' ? 'seg__on' : ''} onClick={() => setVisao('caixa')}>
            Meu caixa
          </button>
          <button className={visao === 'vm' ? 'seg__on' : ''} onClick={() => setVisao('vm')}>
            A receber — VM Rocks
          </button>
        </div>
      )}

      {/* ===== VISÃO VM ROCKS — só o que é dela (prévia do login da parceira) ===== */}
      {!carregando && visao === 'vm' && (
        <>
          <div className="fin-cards">
            <div className="fin-card fin-card--vm">
              <div className="fin-card__quem">VM Rocks tem a receber</div>
              <div className="fin-card__valor">{formatarBRL(totalVMGeral)}</div>
              {totalVMMensal > 0 && <div className="fin-card__mensal">+ {formatarBRL(totalVMMensal)}/mês</div>}
              <div className="fin-card__qtd">
                {vmCobrancas.length + linhasVM.length} item(ns) ·{' '}
                {new Set([...vmCobrancas.map((c) => c.cliente_id), ...linhasVM.map((l) => l.cliente_id)]).size} cliente(s)
              </div>
            </div>
          </div>

          <p className="fin-dica">
            Esta é a visão que a <strong>VM Rocks</strong> terá quando entrar com o login dela: só
            o que ela tem a receber, nos clientes que atende com você. Ela <strong>não vê</strong>
            {' '}o seu caixa nem as finanças dos outros clientes.
          </p>

          {vmCobrancas.length === 0 && linhasVM.length === 0 ? (
            <div className="card">
              <h3>Nada a receber para a VM Rocks ainda.</h3>
              <p>
                Ao criar uma cobrança (aba <strong>Cobranças</strong>), marque{' '}
                <strong>“VM Rocks participa”</strong> e informe o valor dela. Ou, na ficha de um
                cliente, marque um pagamento com <strong>quem recebe = VM Rocks</strong>. Aparece aqui.
              </p>
            </div>
          ) : (
            <>
              {/* Cobranças da VM, por mês */}
              {vmCobrancasPorMes.length > 0 && (
                <section className="fin-secao">
                  <h3 className="fin-secao__tit">A receber — por mês (cobranças)</h3>
                  {vmCobrancasPorMes.map((g) => (
                    <div key={g.chave} className="mes-grupo">
                      <div className="mes-grupo__cab">
                        <span className="mes-grupo__nome">{rotuloMes(g.chave)}</span>
                        <span className="mes-grupo__total">{formatarBRL(g.total)}</span>
                      </div>
                      <div className="fin-lista">
                        {g.itens.map((o, i) => (
                          <div key={`${o.c.id}-${i}`} className={`mov mov--receber ${o.projetada ? 'mov--previsto' : ''}`}>
                            <div className="mov__corpo">
                              <div className="mov__desc">
                                {o.c.descricao}
                                {o.projetada && <span className="mov__tag mov__tag--prev">previsto</span>}
                              </div>
                              <div className="mov__meta">
                                {nomeCliente(o.c.cliente_id) || 'sem cliente'} · vence {formatarData(o.venc)}
                              </div>
                            </div>
                            <div className="mov__valor mov__valor--receber">{formatarBRL(valorDaVM(o.c))}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </section>
              )}

              {/* Pagamentos de contrato marcados como VM */}
              {linhasVM.length > 0 && (
                <section className="fin-secao">
                  <h3 className="fin-secao__tit">Por contrato</h3>
                  <div className="fin-lista">
                    {linhasVM
                      .slice()
                      .sort((a, b) => b.unico + b.mensal - (a.unico + a.mensal))
                      .map((l, i) => (
                        <button
                          key={`${l.cliente_id}-${i}`}
                          className="fin-item fin-item--btn"
                          onClick={() => setParams({ aba: 'clientes', id: l.cliente_id })}
                          title="Editar na ficha do cliente"
                        >
                          <div className="fin-item__corpo">
                            <div className="fin-item__cliente">{l.cliente_nome}</div>
                            <div className="fin-item__meta">
                              {rotuloForma(l, formatarBRL)}
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
                </section>
              )}
            </>
          )}
        </>
      )}

      {!carregando && visao === 'caixa' && (
        <>
          {/* Resumo em cards */}
          <div className="fin-cards">
            <div className="fin-card fin-card--saldo">
              <div className="fin-card__quem">Saldo em caixa</div>
              <div className="fin-card__valor">{formatarBRL(saldo)}</div>
              <div className="fin-card__qtd">entradas − saídas</div>
            </div>
            <div className="fin-card fin-card--receber">
              <div className="fin-card__quem">A receber</div>
              <div className="fin-card__valor">{formatarBRL(totalAReceber)}</div>
              <div className="fin-card__qtd">
                {aReceber.length + lancAReceber.length} em aberto
                {lancAReceber.length > 0 ? ` (${lancAReceber.length} à mão)` : ''}
              </div>
            </div>
            <div className="fin-card fin-card--entrada">
              <div className="fin-card__quem">Entradas</div>
              <div className="fin-card__valor">{formatarBRL(totalEntradas)}</div>
              <div className="fin-card__qtd">recebidas</div>
            </div>
            <div className="fin-card fin-card--saida">
              <div className="fin-card__quem">Saídas</div>
              <div className="fin-card__valor">{formatarBRL(totalSaidas)}</div>
              <div className="fin-card__qtd">despesas</div>
            </div>
          </div>

          <p className="fin-dica">
            As <strong>cobranças pagas</strong> (aba Cobranças) entram aqui como entradas
            automaticamente. Acrescente outras entradas e as saídas abaixo.
          </p>

          {/* Botões / formulário de entrada e saída */}
          <div className="gestao-acoes">
            <button className="btn" onClick={() => abrirForm('entrada')}>
              + Entrada
            </button>
            <button className="btn btn--saida" onClick={() => abrirForm('saida')}>
              − Saída
            </button>
            <span className="espaco" />
          </div>

          {formTipo && (
            <div className="card caixa-form">
              <h3>
                {editId ? 'Editar' : formTipo === 'entrada' ? 'Nova entrada' : 'Nova saída'}
                {!editId && (formTipo === 'entrada' ? ' (dinheiro que entrou)' : ' (despesa)')}
              </h3>
              <div className="caixa-form__linha">
                <div className="field campo-toda">
                  <label>Descrição</label>
                  <input
                    autoFocus
                    value={fDesc}
                    onChange={(e) => setFDesc(e.target.value)}
                    placeholder={formTipo === 'entrada' ? 'ex.: Trabalho avulso — logo' : 'ex.: Assinatura Canva'}
                  />
                </div>
                <div className="field">
                  <label>Valor (R$)</label>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={fValor}
                    onChange={(e) => setFValor(e.target.value)}
                    placeholder="0,00"
                  />
                </div>
                <div className="field">
                  <label>Data</label>
                  <input type="date" value={fData} onChange={(e) => setFData(e.target.value)} />
                </div>
                <div className="field campo-toda">
                  <label>É da KA ou pessoal?</label>
                  <div className="seg seg--escopo">
                    <button
                      type="button"
                      className={fEscopo === 'ka' ? 'seg__on' : ''}
                      onClick={() => setFEscopo('ka')}
                    >
                      KA (negócio)
                    </button>
                    <button
                      type="button"
                      className={fEscopo === 'pessoal' ? 'seg__on' : ''}
                      onClick={() => setFEscopo('pessoal')}
                    >
                      Pessoal
                    </button>
                  </div>
                </div>
                {formTipo === 'entrada' && (
                  <div className="field campo-toda">
                    <label>Já recebeu esse valor?</label>
                    <div className="seg seg--escopo">
                      <button type="button" className={fRecebido ? 'seg__on' : ''} onClick={() => setFRecebido(true)}>
                        Já recebi (entrou)
                      </button>
                      <button type="button" className={!fRecebido ? 'seg__on' : ''} onClick={() => setFRecebido(false)}>
                        A receber
                      </button>
                    </div>
                    <span className="campo-ajuda">
                      {fRecebido ? 'Entra em Entradas e no saldo.' : 'Entra em “A receber” até você marcar como recebida.'}
                    </span>
                  </div>
                )}
              </div>
              <div className="caixa-form__acoes">
                <button className="btn" disabled={salvando} onClick={() => void salvar()}>
                  {salvando ? 'Salvando…' : 'Salvar'}
                </button>
                <button className="btn--ghost" onClick={fecharForm}>
                  Cancelar
                </button>
              </div>
            </div>
          )}

          {/* A receber (cobranças em aberto) — POR MÊS, com mensalidades projetadas */}
          {recebTodos.length > 0 && (
            <section className="fin-secao">
              <h3 className="fin-secao__tit">A receber — por mês</h3>
              {temMensalidade && (
                <p className="fin-dica" style={{ marginTop: 0 }}>
                  As <strong>mensalidades</strong> se repetem nos próximos meses (marcadas “previsto”).
                </p>
              )}
              {aReceberPorMes.map((g) => (
                <div key={g.chave} className="mes-grupo">
                  <div className="mes-grupo__cab">
                    <span className="mes-grupo__nome">{rotuloMes(g.chave)}</span>
                    <span className="mes-grupo__total">{formatarBRL(g.total)}</span>
                  </div>
                  <div className="fin-lista">
                    {g.itens.map((r) => (
                      <div key={r.chave} className={`mov mov--receber ${r.projetada ? 'mov--previsto' : ''}`}>
                        <div className="mov__corpo">
                          <div className="mov__desc">
                            {r.descricao}
                            {r.projetada && <span className="mov__tag mov__tag--prev">previsto</span>}
                            {r.origem === 'manual' && (
                              <span className={`mov__escopo mov__escopo--${r.escopo}`} style={{ marginLeft: '0.4rem' }}>
                                {r.escopo === 'pessoal' ? 'Pessoal' : 'KA'}
                              </span>
                            )}
                          </div>
                          <div className="mov__meta">
                            {r.origem === 'cobranca'
                              ? `${r.cliente} · vence ${formatarData(r.data)}`
                              : `lançada à mão · ${formatarData(r.data)}`}
                            {r.atrasada ? ' · atrasada' : ''}
                            {r.vmParticipa ? ' · VM Rocks' : ''}
                          </div>
                        </div>
                        <div className="mov__valor mov__valor--receber">{formatarBRL(r.valor)}</div>
                        {r.origem === 'manual' && r.lancamento && (
                          <div className="mov__acoes">
                            <button className="btn-mini" onClick={() => void marcarRecebida(r.lancamento!)} title="Marcar como recebida">
                              Recebi
                            </button>
                            <button className="btn-mini" onClick={() => editar(r.lancamento!)}>
                              Editar
                            </button>
                            <button className="btn-mini btn-mini--perigo" onClick={() => void excluir(r.lancamento!)} title="Excluir">
                              ✕
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </section>
          )}

          {/* Movimentações (entradas e saídas) */}
          <section className="fin-secao">
            <h3 className="fin-secao__tit">Entradas e saídas</h3>
            {movimentos.length === 0 ? (
              <p className="ativ-vazio">Nada lançado ainda. Use “+ Entrada” ou “− Saída” acima.</p>
            ) : (
              <div className="fin-lista">
                {movimentos.map((m) => (
                  <div key={m.chave} className={`mov mov--${m.tipo}`}>
                    <div className="mov__corpo">
                      <div className="mov__desc">{m.descricao}</div>
                      <div className="mov__meta">
                        {formatarData(m.data)}
                        {' · '}
                        <span className={`mov__escopo mov__escopo--${m.escopo ?? 'ka'}`}>
                          {m.escopo === 'pessoal' ? 'Pessoal' : 'KA'}
                        </span>
                        {m.origem === 'cobranca' && (
                          <>
                            {' '}
                            · <span className="mov__tag">cobrança</span>
                            {m.cliente ? ` ${m.cliente}` : ''}
                          </>
                        )}
                      </div>
                    </div>
                    <div className={`mov__valor mov__valor--${m.tipo}`}>
                      {m.tipo === 'entrada' ? '+ ' : '− '}
                      {formatarBRL(m.valor)}
                    </div>
                    {m.origem === 'manual' && m.lancamento && (
                      <div className="mov__acoes">
                        <button className="btn-mini" onClick={() => editar(m.lancamento!)}>
                          Editar
                        </button>
                        <button
                          className="btn-mini btn-mini--perigo"
                          onClick={() => void excluir(m.lancamento!)}
                          title="Excluir"
                        >
                          ✕
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Quem tem a receber (KA / VM Rocks) — dos pagamentos do contrato */}
          {linhas.length > 0 && (
            <details className="fin-detalhes">
              <summary>
                Por contrato — quem tem a receber (KA, VM Rocks…):{' '}
                <strong>{formatarBRL(totalContratoUnico)}</strong>
                {totalContratoMensal > 0 && <> + {formatarBRL(totalContratoMensal)}/mês</>}
              </summary>
              <div className="fin-cards" style={{ marginTop: '0.8rem' }}>
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
              <p className="fin-dica" style={{ marginTop: '0.6rem' }}>
                Toque num item para editar na ficha do cliente.
              </p>
              <div className="fin-lista">
                {linhas
                  .slice()
                  .sort((a, b) => b.unico + b.mensal - (a.unico + a.mensal))
                  .map((l, i) => (
                    <button
                      key={`${l.cliente_id}-${i}`}
                      className="fin-item fin-item--btn"
                      onClick={() => setParams({ aba: 'clientes', id: l.cliente_id })}
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
            </details>
          )}
        </>
      )}
    </>
  )
}
