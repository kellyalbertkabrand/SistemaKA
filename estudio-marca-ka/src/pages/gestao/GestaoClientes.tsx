import { useEffect, useRef, useState, type FormEvent } from 'react'
import { confirmar } from '../../lib/confirmar'
import { useFichaUrl } from '../../hooks/useFichaUrl'
import { Busca, normalizar } from '../../components/Busca'
import { SociosEditor } from '../../components/SociosEditor'
import { useToast } from '../../components/Toast'
import { useCopiar } from '../../hooks/useCopiar'
import { parseValorBR } from '../../lib/ui'
import { rotuloStatus } from '../../lib/rotulos'
import type { Cliente, Usuario, PagamentoContrato } from '../../lib/database.types'
import {
  criarCliente,
  listarClientes,
  listarUsuariosDoCliente,
  listarUsuariosSemVinculo,
  vincularUsuario,
  desvincularUsuario,
} from '../../lib/api'
import {
  convidarUsuario,
  excluirCliente,
  formatarBRL,
  linkPublicoCadastro,
  marcarClienteRevisado,
  salvarFichaCliente,
  type FichaCliente,
} from '../../lib/gestao'

/** Cadastro que veio do link público e a KA ainda não abriu. */
function ehNovo(c: Cliente): boolean {
  return c.origem === 'auto-cadastro' && !c.revisado
}

// Clientes & Acessos: ficha completa de cada cliente (dados cadastrais,
// cobrança/mensalidade) + quem tem login vinculado à marca.
export function GestaoClientes() {
  const { mostrar } = useToast()
  const copiar = useCopiar()
  const { idAberto, abrir: abrirUrl, fechar } = useFichaUrl('id')
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [erro, setErro] = useState<string | null>(null)
  const [carregando, setCarregando] = useState(true)
  const [busca, setBusca] = useState('')

  const clientesFiltrados = (() => {
    const q = normalizar(busca).trim()
    if (!q) return clientes
    return clientes.filter((c) =>
      normalizar(
        `${c.nome_marca} ${c.responsavel ?? ''} ${c.telefone ?? ''} ${c.email_contato ?? ''} ${c.segmento ?? ''} ${c.instagram_handle ?? ''} ${c.slug ?? ''}`,
      ).includes(q),
    )
  })()

  // A ficha aberta vem da URL (?id=<uuid> ou ?id=novo): F5 e "voltar" do
  // navegador funcionam e o link é compartilhável.
  const sel: Cliente | 'novo' | null =
    idAberto === 'novo'
      ? 'novo'
      : idAberto
        ? (clientes.find((c) => c.id === idAberto) ?? null)
        : null

  async function copiarLinkCadastro() {
    await copiar(
      linkPublicoCadastro(),
      'Link de cadastro copiado! Envie ao cliente para preencher a ficha.',
    )
  }

  // Abrir a ficha de um cadastro novo já o marca como visto (tira o "NOVO").
  function abrir(c: Cliente) {
    if (ehNovo(c)) void marcarClienteRevisado(c.id).catch(() => {})
    abrirUrl(c.id)
  }

  async function excluir(c: Cliente) {
    const ok = await confirmar(
      `Excluir o cliente "${c.nome_marca}"? A ficha e os acessos somem de vez. ` +
        'Orçamentos, contratos e cobranças ligados a ele NÃO são apagados junto. ' +
        'Se também forem teste, apague-os nas outras abas.',
      { perigo: true, confirmar: 'Excluir' },
    )
    if (!ok) return
    setClientes((l) => l.filter((x) => x.id !== c.id))
    try {
      await excluirCliente(c.id)
      mostrar('Cliente excluído.', 'ok')
    } catch (e) {
      mostrar(e instanceof Error ? e.message : String(e), 'erro')
      void recarregar()
    }
  }

  const novos = clientes.filter(ehNovo).length

  async function recarregar() {
    try {
      setCarregando(true)
      const lista = await listarClientes()
      setClientes(lista)
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

  // Abriu um cadastro do link público (?id=<uuid>) → tira o "NOVO" ao ver.
  useEffect(() => {
    if (!idAberto || idAberto === 'novo') return
    const c = clientes.find((x) => x.id === idAberto)
    if (c && ehNovo(c)) void marcarClienteRevisado(c.id).catch(() => {})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idAberto, clientes])

  if (sel) {
    return (
      <FichaDoCliente
        key={idAberto ?? 'novo'}
        cliente={sel === 'novo' ? null : sel}
        aoVoltar={() => {
          fechar()
          void recarregar()
        }}
      />
    )
  }

  return (
    <>
      <div className="gestao-acoes">
        <span className="espaco" />
        <button className="btn--voltar" onClick={() => void copiarLinkCadastro()}>
          Copiar link de cadastro
        </button>
        <button className="btn" onClick={() => abrirUrl('novo')}>
          + Novo cliente
        </button>
      </div>

      {novos > 0 && (
        <div className="nota" style={{ borderLeft: '3px solid #2e6b45' }}>
          🔔 Você tem <strong>{novos}</strong>{' '}
          {novos === 1 ? 'novo cadastro' : 'novos cadastros'} pelo link, marcados com{' '}
          <span className="badge badge--verde">NOVO</span> na lista abaixo. Abra a ficha para revisar.
        </div>
      )}
      {erro && <div className="erro-msg" role="alert">{erro}</div>}
      {carregando && <p style={{ color: 'var(--t-500)', fontSize: '0.85rem' }}>Carregando…</p>}

      {!carregando && clientes.length === 0 && !erro && (
        <div className="card">
          <h3>Nenhum cliente cadastrado no banco ainda.</h3>
          <p>
            Crie o primeiro com “+ Novo cliente”. (Os templates do estúdio continuam funcionando
            de forma independente; o cadastro aqui organiza dados, acessos e cobrança.)
          </p>
        </div>
      )}

      {clientes.length > 0 && (
        <Busca valor={busca} aoMudar={setBusca} placeholder="Buscar cliente por nome, responsável…" />
      )}
      {clientes.length > 0 && clientesFiltrados.length === 0 && (
        <p className="ativ-vazio">Nenhum cliente encontrado para “{busca}”.</p>
      )}

      {clientesFiltrados.length > 0 && (
        <div className="tabela-wrap">
          <table className="tabela">
            <thead>
              <tr>
                <th>Marca</th>
                <th>Responsável</th>
                <th>Contato</th>
                <th>Mensalidade</th>
                <th>Status</th>
                <th className="acoes"></th>
              </tr>
            </thead>
            <tbody>
              {clientesFiltrados.map((c) => (
                <tr key={c.id}>
                  <td className="cel-nome" data-label="Marca">
                    <button className="cel-abrir" onClick={() => abrir(c)} title="Abrir ficha">
                      <strong>{c.nome_marca}</strong>
                    </button>
                    {c.slug && (
                      <span style={{ color: 'var(--t-400)', marginLeft: 6 }}>/{c.slug}</span>
                    )}
                    {ehNovo(c) && (
                      <span className="badge badge--verde" style={{ marginLeft: 8 }}>
                        NOVO
                      </span>
                    )}
                  </td>
                  <td data-label="Responsável">{c.responsavel || '-'}</td>
                  <td data-label="Contato">{c.telefone || c.email_contato || '-'}</td>
                  <td className="num" data-label="Mensalidade">
                    {c.cobranca_ativa && c.valor_mensalidade
                      ? `${formatarBRL(c.valor_mensalidade)} · dia ${c.dia_vencimento}`
                      : '-'}
                  </td>
                  <td data-label="Status">
                    <span className={`badge ${c.status === 'ativo' ? 'badge--verde' : 'badge--cinza'}`}>
                      {rotuloStatus('cliente', c.status)}
                    </span>
                  </td>
                  <td className="acoes">
                    <button className="btn-mini" onClick={() => abrir(c)}>
                      Abrir ficha
                    </button>
                    <button className="btn-mini btn-mini--perigo" onClick={() => void excluir(c)}>
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

// ---------------------------------------------------------------------------
// Ficha do cliente: dados cadastrais + cobrança + acessos.
// ---------------------------------------------------------------------------
function FichaDoCliente({ cliente, aoVoltar }: { cliente: Cliente | null; aoVoltar: () => void }) {
  const { mostrar } = useToast()
  const criando = !cliente
  const [f, setF] = useState<FichaCliente>(
    cliente ? { ...cliente } : { status: 'ativo', dia_vencimento: 10, cobranca_ativa: false },
  )
  // Valor digitado como texto (aceita "1.500,00"); vira número só ao salvar.
  const [valorMensalTxt, setValorMensalTxt] = useState(
    cliente?.valor_mensalidade != null ? String(cliente.valor_mensalidade).replace('.', ',') : '',
  )
  // Se a 1ª gravação (criar) já rodou, guarda o id para o "Salvar de novo" não
  // criar um cliente duplicado — vira só uma atualização da ficha.
  const novoIdRef = useRef<string | null>(null)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  function campo<K extends keyof FichaCliente>(k: K, v: FichaCliente[K]) {
    setF((atual) => ({ ...atual, [k]: v }))
  }

  async function salvar(e: FormEvent) {
    e.preventDefault()
    if (!f.nome_marca?.trim()) {
      setErro('Informe o nome da marca.')
      return
    }
    setSalvando(true)
    setErro(null)
    const valor = valorMensalTxt.trim() ? parseValorBR(valorMensalTxt) : null
    const dados: FichaCliente = {
      ...f,
      nome_marca: f.nome_marca.trim(),
      valor_mensalidade: valor,
      dia_vencimento: Math.min(28, Math.max(1, Number(f.dia_vencimento) || 10)),
    }
    try {
      if (criando) {
        // Cria o cliente (uma vez só, mesmo em retentativa) e grava a ficha.
        if (!novoIdRef.current) {
          const novo = await criarCliente({
            nome_marca: dados.nome_marca!,
            instagram_handle: dados.instagram_handle ?? null,
            segmento: dados.segmento ?? null,
            site: dados.site ?? null,
          })
          novoIdRef.current = novo.id
        }
        await salvarFichaCliente(novoIdRef.current, dados)
        mostrar('Cliente criado ✓', 'ok')
        aoVoltar()
        return
      }
      await salvarFichaCliente(cliente!.id, dados)
      mostrar('Ficha salva ✓', 'ok')
    } catch (err) {
      mostrar(err instanceof Error ? err.message : String(err), 'erro')
      setErro(err instanceof Error ? err.message : String(err))
    } finally {
      setSalvando(false)
    }
  }

  return (
    <>
      <p style={{ marginBottom: '1rem' }}>
        <button className="btn--voltar" onClick={aoVoltar}>
          ← Todos os clientes
        </button>
      </p>

      <div className="card">
        <h3>{criando ? 'Novo cliente' : 'Ficha do cliente'}</h3>
        <p style={{ marginBottom: '1rem' }}>
          Dados cadastrais e de contato, ficam guardados aqui, num lugar só.
        </p>
        {erro && <div className="erro-msg">{erro}</div>}
        <form onSubmit={(e) => void salvar(e)}>
          {/* Mesma ordem da ficha pública /cadastro */}
          <div className="form-grade">
            <div className="field campo-toda">
              <label>Nome da marca</label>
              <input value={f.nome_marca ?? ''} onChange={(e) => campo('nome_marca', e.target.value)} required />
            </div>
            <div className="field">
              <label>Responsável (nome)</label>
              <input value={f.responsavel ?? ''} onChange={(e) => campo('responsavel', e.target.value || null)} />
            </div>
            <div className="field">
              <label>E-mail</label>
              <input type="email" value={f.email_contato ?? ''} onChange={(e) => campo('email_contato', e.target.value || null)} />
            </div>
            <div className="field">
              <label>Telefone / WhatsApp</label>
              <input type="tel" inputMode="tel" value={f.telefone ?? ''} onChange={(e) => campo('telefone', e.target.value || null)} />
            </div>
            <div className="field">
              <label>Instagram</label>
              <input value={f.instagram_handle ?? ''} onChange={(e) => campo('instagram_handle', e.target.value || null)} placeholder="@marca" />
            </div>
            <div className="field">
              <label>Segmento</label>
              <input value={f.segmento ?? ''} onChange={(e) => campo('segmento', e.target.value || null)} placeholder="ex.: decoração" />
            </div>
            <div className="field">
              <label>Site</label>
              <input value={f.site ?? ''} onChange={(e) => campo('site', e.target.value || null)} />
            </div>
            <div className="field campo-2">
              <label>Endereço</label>
              <input value={f.endereco ?? ''} onChange={(e) => campo('endereco', e.target.value || null)} />
            </div>
            <div className="field">
              <label>Cidade / UF</label>
              <input value={f.cidade ?? ''} onChange={(e) => campo('cidade', e.target.value || null)} />
            </div>
            <div className="field">
              <label>CPF / CNPJ da empresa</label>
              <input value={f.documento ?? ''} onChange={(e) => campo('documento', e.target.value || null)} />
            </div>
          </div>

          <h3 style={{ margin: '1.2rem 0 0.3rem' }}>Dados para o contrato</h3>
          <p style={{ fontSize: '0.8rem', color: 'var(--t-500)', marginBottom: '0.7rem' }}>
            Fundador da empresa e quem vai assinar (se for a mesma pessoa, pode repetir).
          </p>
          <div className="form-grade">
            <div className="field campo-toda">
              <label>Razão social / nome jurídico da empresa</label>
              <input value={f.razao_social ?? ''} onChange={(e) => campo('razao_social', e.target.value || null)} />
            </div>
            <div className="field">
              <label>Fundador(a) da empresa</label>
              <input value={f.fundador_nome ?? ''} onChange={(e) => campo('fundador_nome', e.target.value || null)} />
            </div>
            <div className="field">
              <label>CPF do fundador(a)</label>
              <input value={f.fundador_cpf ?? ''} onChange={(e) => campo('fundador_cpf', e.target.value || null)} />
            </div>
            <div className="field campo-toda">
              <label>Quem vai assinar o contrato (nome completo)</label>
              <input value={f.contrato_nome ?? ''} onChange={(e) => campo('contrato_nome', e.target.value || null)} />
            </div>
            <div className="field">
              <label>CPF de quem assina</label>
              <input value={f.contrato_documento ?? ''} onChange={(e) => campo('contrato_documento', e.target.value || null)} />
            </div>
            <div className="field">
              <label>RG de quem assina</label>
              <input value={f.contrato_rg ?? ''} onChange={(e) => campo('contrato_rg', e.target.value || null)} />
            </div>
            <div className="field campo-toda">
              <label>E-mail de quem assina</label>
              <input type="email" value={f.contrato_email ?? ''} onChange={(e) => campo('contrato_email', e.target.value || null)} />
            </div>
          </div>

          <h3 style={{ margin: '1.2rem 0 0.3rem' }}>Sócios (quando houver)</h3>
          <p style={{ fontSize: '0.8rem', color: 'var(--t-500)', marginBottom: '0.7rem' }}>
            Se a empresa tem <strong>mais de um sócio</strong>, adicione aqui os dados de cada um.
            Marque <strong>“Assina o contrato”</strong> nos que vão assinar — eles entram como
            signatários, além do responsável principal acima.
          </p>
          <SociosEditor lista={f.socios ?? []} onChange={(l) => campo('socios', l)} />

          {/* Campos internos da KA (não existem no cadastro público) */}
          <h3 style={{ margin: '1.2rem 0 0.8rem' }}>Interno (só você vê)</h3>
          <div className="form-grade">
            <div className="field">
              <label>Slug (marca no estúdio)</label>
              <input
                value={f.slug ?? ''}
                onChange={(e) => campo('slug', e.target.value.trim().toLowerCase() || null)}
                placeholder="ex.: shapes"
              />
            </div>
            <div className="field">
              <label>Status</label>
              <select value={f.status ?? 'ativo'} onChange={(e) => campo('status', e.target.value as Cliente['status'])}>
                <option value="ativo">ativo</option>
                <option value="pausado">pausado</option>
              </select>
            </div>
            <div className="field campo-toda">
              <label>Observações</label>
              <textarea
                rows={3}
                value={f.observacoes ?? ''}
                onChange={(e) => campo('observacoes', e.target.value || null)}
                placeholder="Anotações internas sobre o cliente (briefing, preferências, histórico…)"
              />
            </div>
          </div>

          <h3 style={{ margin: '1.2rem 0 0.8rem' }}>Cobrança</h3>
          <div className="form-grade">
            <div className="field">
              <label>E-mail de cobrança</label>
              <input type="email" value={f.email_cobranca ?? ''} onChange={(e) => campo('email_cobranca', e.target.value || null)} />
            </div>
            <div className="field">
              <label>Mensalidade (R$)</label>
              <input
                type="text"
                inputMode="decimal"
                placeholder="0,00"
                value={valorMensalTxt}
                onChange={(e) => setValorMensalTxt(e.target.value)}
              />
            </div>
            <div className="field">
              <label>Dia do vencimento</label>
              <input
                type="text"
                inputMode="numeric"
                maxLength={2}
                placeholder="ex.: 10"
                value={f.dia_vencimento == null ? '' : String(f.dia_vencimento)}
                onChange={(e) => {
                  const d = e.target.value.replace(/\D/g, '')
                  campo('dia_vencimento', d === '' ? undefined : Number(d))
                }}
              />
            </div>
            <div className="field">
              <label>Cobrança mensal ativa?</label>
              <select
                value={f.cobranca_ativa ? 'sim' : 'nao'}
                onChange={(e) => campo('cobranca_ativa', e.target.value === 'sim')}
              >
                <option value="nao">não</option>
                <option value="sim">sim, gerar mensalidade</option>
              </select>
            </div>
          </div>

          <h3 style={{ margin: '0.6rem 0 0.2rem' }}>Pagamentos do contrato</h3>
          <p style={{ margin: '0 0 0.6rem', fontSize: '0.8rem', color: '#5a5346' }}>
            Para cada pagamento, escolha <strong>quem</strong> recebe (o cliente, a KA, a VM Rocks
            ou um nome), a <strong>forma</strong> (à vista, parcelado em X vezes ou mensalidade), a
            data e o valor. O resumo no fim mostra quanto cada um tem a receber.
          </p>

          <PagamentosContrato
            lista={f.pagamentos_contrato ?? []}
            onChange={(l) => campo('pagamentos_contrato', l)}
          />

          <p style={{ display: 'flex', gap: '0.7rem', alignItems: 'center', marginTop: '1.2rem' }}>
            <button className="btn" type="submit" disabled={salvando}>
              {salvando ? 'Salvando…' : 'Salvar ficha'}
            </button>
          </p>
        </form>
      </div>

      {cliente ? (
        <Acessos cliente={cliente} slug={f.slug ?? null} />
      ) : (
        <p style={{ color: 'var(--t-500)', fontSize: '0.82rem', marginTop: '1rem' }}>
          Salve a ficha para poder convidar acessos deste cliente.
        </p>
      )}
    </>
  )
}

// ---------------------------------------------------------------------------
// Pagamentos do contrato: lista com "quem" deve ser pago (cliente/KA/VM/outro),
// data, nº de parcelas e valor de cada parcela.
// ---------------------------------------------------------------------------
const QUEM_OPCOES = [
  { valor: 'cliente', rotulo: 'O cliente' },
  { valor: 'ka', rotulo: 'KA' },
  { valor: 'vm', rotulo: 'VM Rocks' },
  { valor: 'outro', rotulo: 'Personalizado…' },
]
const FORMA_OPCOES = [
  { valor: 'avista', rotulo: 'À vista' },
  { valor: 'parcelado', rotulo: 'Parcelado' },
  { valor: 'mensalidade', rotulo: 'Mensalidade' },
]

function rotuloQuem(p: PagamentoContrato): string {
  if (p.quem === 'outro') return p.quem_outro?.trim() || 'Personalizado'
  return QUEM_OPCOES.find((o) => o.valor === p.quem)?.rotulo ?? p.quem
}

/** Valor único (à vista = valor; parcelado = parcelas × valor; mensalidade não entra). */
function totalUnico(p: PagamentoContrato): number {
  const v = Number(p.valor_parcela) || 0
  if (p.forma === 'mensalidade') return 0
  if (p.forma === 'parcelado') return v * Math.max(1, Number(p.parcelas) || 1)
  return v
}
/** Valor por mês (só quando a forma é mensalidade). */
function totalMensal(p: PagamentoContrato): number {
  return p.forma === 'mensalidade' ? Number(p.valor_parcela) || 0 : 0
}

function PagamentosContrato({
  lista,
  onChange,
}: {
  lista: PagamentoContrato[]
  onChange: (l: PagamentoContrato[]) => void
}) {
  function atualizar(i: number, patch: Partial<PagamentoContrato>) {
    onChange(lista.map((p, x) => (x === i ? { ...p, ...patch } : p)))
  }
  function adicionar() {
    onChange([
      ...lista,
      { quem: 'ka', quem_outro: null, forma: 'avista', data: null, parcelas: null, valor_parcela: null },
    ])
  }
  function remover(i: number) {
    onChange(lista.filter((_, x) => x !== i))
  }

  // Resumo: quanto cada um (KA, VM Rocks, cliente…) tem a receber neste contrato.
  const resumo = new Map<string, { unico: number; mensal: number }>()
  for (const p of lista) {
    const chave = rotuloQuem(p)
    const cur = resumo.get(chave) ?? { unico: 0, mensal: 0 }
    cur.unico += totalUnico(p)
    cur.mensal += totalMensal(p)
    resumo.set(chave, cur)
  }

  return (
    <div>
      {lista.length === 0 && (
        <p style={{ fontSize: '0.82rem', color: '#837b6c', margin: '0 0 0.6rem' }}>
          Nenhum pagamento cadastrado ainda.
        </p>
      )}
      {lista.map((p, i) => {
        const forma = p.forma ?? 'avista'
        return (
          <div
            key={i}
            style={{ border: '1px solid rgba(21,37,53,0.14)', borderRadius: 10, padding: '0.8rem', marginBottom: '0.7rem' }}
          >
            <div className="form-grade">
              <div className="field">
                <label>Quem deve ser pago</label>
                <select value={p.quem} onChange={(e) => atualizar(i, { quem: e.target.value })}>
                  {QUEM_OPCOES.map((o) => (
                    <option key={o.valor} value={o.valor}>
                      {o.rotulo}
                    </option>
                  ))}
                </select>
              </div>
              {p.quem === 'outro' && (
                <div className="field">
                  <label>Nome (personalizado)</label>
                  <input
                    value={p.quem_outro ?? ''}
                    onChange={(e) => atualizar(i, { quem_outro: e.target.value || null })}
                    placeholder="ex.: Fornecedor, sócio…"
                  />
                </div>
              )}
              <div className="field">
                <label>Forma de pagamento</label>
                <select
                  value={forma}
                  onChange={(e) =>
                    atualizar(i, {
                      forma: e.target.value,
                      parcelas: e.target.value === 'parcelado' ? (p.parcelas ?? 2) : null,
                    })
                  }
                >
                  {FORMA_OPCOES.map((o) => (
                    <option key={o.valor} value={o.valor}>
                      {o.rotulo}
                    </option>
                  ))}
                </select>
              </div>
              {forma === 'parcelado' && (
                <div className="field">
                  <label>Em quantas vezes</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={2}
                    placeholder="ex.: 3"
                    value={p.parcelas == null ? '' : String(p.parcelas)}
                    onChange={(e) => {
                      const d = e.target.value.replace(/\D/g, '')
                      atualizar(i, { parcelas: d === '' ? null : Number(d) })
                    }}
                  />
                </div>
              )}
              <div className="field">
                <label>Data do pagamento</label>
                <input type="date" value={p.data ?? ''} onChange={(e) => atualizar(i, { data: e.target.value || null })} />
              </div>
              <div className="field">
                <label>
                  {forma === 'parcelado'
                    ? 'Valor de cada parcela (R$)'
                    : forma === 'mensalidade'
                      ? 'Valor por mês (R$)'
                      : 'Valor (R$)'}
                </label>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={p.valor_parcela ?? ''}
                  onChange={(e) => atualizar(i, { valor_parcela: e.target.value === '' ? null : Number(e.target.value) })}
                />
              </div>
            </div>

            {(totalUnico(p) > 0 || totalMensal(p) > 0) && (
              <p style={{ fontSize: '0.78rem', color: 'var(--t-500)', margin: '0.4rem 0 0' }}>
                {forma === 'parcelado' && `${p.parcelas || 1}× de ${formatarBRL(p.valor_parcela)} = `}
                <strong>
                  {forma === 'mensalidade' ? `${formatarBRL(totalMensal(p))}/mês` : formatarBRL(totalUnico(p))}
                </strong>{' '}
                para {rotuloQuem(p)}
              </p>
            )}

            <button
              type="button"
              onClick={() => remover(i)}
              style={{ background: 'none', border: 'none', color: '#b4462f', fontSize: '0.8rem', cursor: 'pointer', padding: '0.3rem 0', marginTop: '0.3rem' }}
            >
              Remover pagamento
            </button>
          </div>
        )
      })}
      <button type="button" className="btn btn--ghost" onClick={adicionar}>
        + Adicionar pagamento
      </button>

      {lista.length > 0 && (
        <div className="resumo-receber">
          <div className="resumo-receber__tit">A receber neste contrato</div>
          {[...resumo.entries()].map(([quem, v]) => (
            <div key={quem} className="resumo-receber__linha">
              <span>{quem}</span>
              <strong>
                {v.unico > 0 && formatarBRL(v.unico)}
                {v.unico > 0 && v.mensal > 0 && ' + '}
                {v.mensal > 0 && `${formatarBRL(v.mensal)}/mês`}
                {v.unico === 0 && v.mensal === 0 && '—'}
              </strong>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Acessos: usuários com login vinculado a este cliente + convite por e-mail.
// ---------------------------------------------------------------------------
function Acessos({ cliente, slug }: { cliente: Cliente; slug: string | null }) {
  const [vinculados, setVinculados] = useState<Usuario[]>([])
  const [candidatos, setCandidatos] = useState<Usuario[]>([])
  const [email, setEmail] = useState('')
  const [ocupado, setOcupado] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const [erro, setErro] = useState<string | null>(null)

  async function recarregar() {
    try {
      const [v, c] = await Promise.all([
        listarUsuariosDoCliente(cliente.id),
        listarUsuariosSemVinculo(),
      ])
      setVinculados(v)
      setCandidatos(c)
      setErro(null)
    } catch (e) {
      setErro(e instanceof Error ? e.message : String(e))
    }
  }

  useEffect(() => {
    void recarregar()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cliente.id])

  async function convidar(e: FormEvent) {
    e.preventDefault()
    if (!email.trim()) return
    setOcupado(true)
    setErro(null)
    setMsg(null)
    try {
      await convidarUsuario(email.trim().toLowerCase(), cliente.id, slug)
      setMsg(
        `Convite registrado para ${email.trim()}. Peça para a pessoa entrar (login com o Google ` +
          `ou criar a senha) usando exatamente este e-mail — o acesso à marca é vinculado no 1º login.`,
      )
      setEmail('')
      await recarregar()
    } catch (err) {
      setErro(err instanceof Error ? err.message : String(err))
    } finally {
      setOcupado(false)
    }
  }

  async function vincular(u: Usuario) {
    setOcupado(true)
    try {
      await vincularUsuario(u.id, cliente.id)
      await recarregar()
    } catch (e) {
      setErro(e instanceof Error ? e.message : String(e))
    } finally {
      setOcupado(false)
    }
  }

  async function desvincular(u: Usuario) {
    if (!(await confirmar(`Remover o acesso de ${u.email} a ${cliente.nome_marca}?`, { perigo: true }))) return
    setOcupado(true)
    try {
      await desvincularUsuario(u.id)
      await recarregar()
    } catch (e) {
      setErro(e instanceof Error ? e.message : String(e))
    } finally {
      setOcupado(false)
    }
  }

  return (
    <div className="card">
      <h3>Acessos</h3>
      <p style={{ marginBottom: '0.9rem' }}>
        Quem pode entrar no sistema e ver o estúdio da marca <strong>{cliente.nome_marca}</strong>.
      </p>

      {erro && <div className="erro-msg">{erro}</div>}
      {msg && <div className="nota">{msg}</div>}

      <form onSubmit={(e) => void convidar(e)} style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap', marginBottom: '1.1rem' }}>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="e-mail do cliente"
          style={{
            flex: '1 1 240px',
            fontFamily: 'var(--body)',
            fontSize: '16px',
            border: '1px solid rgba(15,25,35,0.12)',
            borderRadius: 8,
            padding: '0.7rem 0.8rem',
            background: 'var(--bg-1)',
          }}
        />
        <button className="btn" disabled={ocupado || !email.trim()}>
          Convidar por e-mail
        </button>
      </form>

      {vinculados.length > 0 ? (
        <div className="tabela-wrap" style={{ marginBottom: '1rem' }}>
          <table className="tabela">
            <thead>
              <tr>
                <th>E-mail</th>
                <th>Papel</th>
                <th className="acoes"></th>
              </tr>
            </thead>
            <tbody>
              {vinculados.map((u) => (
                <tr key={u.id}>
                  <td>{u.email}</td>
                  <td>
                    <span className="badge badge--azul">{u.papel}</span>
                  </td>
                  <td className="acoes">
                    <button className="btn-mini btn-mini--perigo" disabled={ocupado} onClick={() => void desvincular(u)}>
                      Remover acesso
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p style={{ color: 'var(--t-500)', fontSize: '0.82rem', marginBottom: '1rem' }}>
          Nenhum login vinculado a este cliente ainda.
        </p>
      )}

      {candidatos.length > 0 && (
        <>
          <h3 style={{ fontSize: '0.95rem' }}>Logins sem vínculo</h3>
          <p style={{ color: 'var(--t-500)', fontSize: '0.8rem', marginBottom: '0.6rem' }}>
            Pessoas que já criaram login mas ainda não foram ligadas a uma marca.
          </p>
          <div className="tabela-wrap">
            <table className="tabela">
              <tbody>
                {candidatos.map((u) => (
                  <tr key={u.id}>
                    <td>{u.email}</td>
                    <td className="acoes">
                      <button className="btn-mini" disabled={ocupado} onClick={() => void vincular(u)}>
                        Vincular a {cliente.nome_marca}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}
