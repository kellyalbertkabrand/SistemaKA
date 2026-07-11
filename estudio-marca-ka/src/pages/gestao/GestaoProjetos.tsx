import { useEffect, useState, type FormEvent } from 'react'
import type { Cliente } from '../../lib/database.types'
import { listarClientes } from '../../lib/api'
import { formatarData } from '../../lib/gestao'
import {
  criarProjeto,
  excluirProjeto,
  linkPublicoProjeto,
  listarProjetos,
  MODELOS_FASES,
  progressoProjeto,
  proximoStatusFase,
  salvarProjeto,
  type FaseProjeto,
  type Projeto,
  type ProjetoStatus,
} from '../../lib/projetos'
import { abrirWhatsApp, primeiroNome } from '../../lib/whatsapp'

const BADGE_PROJETO: Record<ProjetoStatus, string> = {
  ativo: 'badge--azul',
  pausado: 'badge--dourado',
  concluido: 'badge--verde',
}

const ROTULO_FASE = {
  pendente: 'pendente',
  andamento: 'em andamento',
  concluida: 'concluída ✓',
} as const

// Projetos: cadastro simples, fases com modelos prontos e link público onde
// o cliente acompanha o andamento em tempo real.
export function GestaoProjetos() {
  const [lista, setLista] = useState<Projeto[]>([])
  const [sel, setSel] = useState<Projeto | null>(null)
  const [criando, setCriando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [msg, setMsg] = useState<string | null>(null)
  const [carregando, setCarregando] = useState(true)

  async function recarregar() {
    try {
      setCarregando(true)
      setLista(await listarProjetos())
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

  async function copiarLink(p: Projeto) {
    await navigator.clipboard.writeText(linkPublicoProjeto(p.token))
    setMsg(`Link de acompanhamento de "${p.nome}" copiado. Envie ao cliente. A página dele atualiza sozinha conforme você avança as fases.`)
    setTimeout(() => setMsg(null), 5000)
  }

  async function excluir(p: Projeto) {
    if (!window.confirm(`Excluir o projeto "${p.nome}"? O link do cliente para de funcionar.`)) return
    try {
      await excluirProjeto(p.id)
      await recarregar()
    } catch (e) {
      setErro(e instanceof Error ? e.message : String(e))
    }
  }

  if (criando) {
    return (
      <NovoProjeto
        aoVoltar={() => setCriando(false)}
        aoCriar={(p) => {
          setCriando(false)
          void recarregar()
          setSel(p)
        }}
      />
    )
  }

  if (sel) {
    return (
      <DetalheProjeto
        original={sel}
        aoVoltar={() => {
          setSel(null)
          void recarregar()
        }}
      />
    )
  }

  return (
    <>
      <div className="gestao-acoes">
        <span className="espaco" />
        <button className="btn" onClick={() => setCriando(true)}>
          + Novo projeto
        </button>
      </div>

      {erro && <div className="erro-msg">{erro}</div>}
      {msg && <div className="nota">{msg}</div>}
      {carregando && <p style={{ color: 'var(--t-500)', fontSize: '0.85rem' }}>Carregando…</p>}

      {!carregando && lista.length === 0 && !erro && (
        <div className="card">
          <h3>Nenhum projeto ainda.</h3>
          <p>
            Crie o primeiro em “+ Novo projeto”: escolha o cliente, um modelo de fases pronto
            (identidade, social media, site…) e envie o link para o cliente acompanhar.
          </p>
        </div>
      )}

      {lista.length > 0 && (
        <div className="tabela-wrap">
          <table className="tabela">
            <thead>
              <tr>
                <th>Projeto</th>
                <th>Cliente</th>
                <th style={{ minWidth: 160 }}>Progresso</th>
                <th>Status</th>
                <th className="acoes"></th>
              </tr>
            </thead>
            <tbody>
              {lista.map((p) => {
                const pct = progressoProjeto(p)
                const atual =
                  p.fases.find((f) => f.status === 'andamento') ??
                  p.fases.find((f) => f.status === 'pendente')
                return (
                  <tr key={p.id}>
                    <td>
                      <strong>{p.nome}</strong>
                    </td>
                    <td>{p.cliente_nome || '-'}</td>
                    <td>
                      <div className="progresso">
                        <div className="progresso__barra">
                          <span style={{ width: `${pct}%` }} />
                        </div>
                        <span className="progresso__pct">{pct}%</span>
                      </div>
                      {atual && (
                        <div style={{ fontSize: '0.68rem', color: 'var(--t-400)', marginTop: 3 }}>
                          agora: {atual.nome}
                        </div>
                      )}
                    </td>
                    <td>
                      <span className={`badge ${BADGE_PROJETO[p.status]}`}>{p.status}</span>
                    </td>
                    <td className="acoes">
                      <button className="btn-mini" onClick={() => setSel(p)}>
                        Abrir
                      </button>
                      <button className="btn-mini" onClick={() => void copiarLink(p)}>
                        Copiar link
                      </button>
                      <button className="btn-mini btn-mini--perigo" onClick={() => void excluir(p)}>
                        Excluir
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  )
}

// ---------------------------------------------------------------------------
// Novo projeto: nome + cliente + modelo de fases. Simples.
// ---------------------------------------------------------------------------
function NovoProjeto({ aoVoltar, aoCriar }: { aoVoltar: () => void; aoCriar: (p: Projeto) => void }) {
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [nome, setNome] = useState('')
  const [clienteId, setClienteId] = useState('')
  const [clienteNome, setClienteNome] = useState('')
  const [descricao, setDescricao] = useState('')
  const [modelo, setModelo] = useState(MODELOS_FASES[0].id)
  const [gerando, setGerando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  useEffect(() => {
    listarClientes()
      .then(setClientes)
      .catch(() => setClientes([]))
  }, [])

  async function criar(e: FormEvent) {
    e.preventDefault()
    setGerando(true)
    setErro(null)
    try {
      const c = clientes.find((x) => x.id === clienteId) ?? null
      const fases = MODELOS_FASES.find((m) => m.id === modelo)?.fases ?? []
      const p = await criarProjeto({
        nome: nome.trim(),
        cliente_id: c?.id ?? null,
        cliente_nome: c?.nome_marca ?? (clienteNome.trim() || null),
        descricao: descricao.trim() || null,
        fases,
      })
      aoCriar(p)
    } catch (err) {
      setErro(err instanceof Error ? err.message : String(err))
      setGerando(false)
    }
  }

  return (
    <>
      <p style={{ marginBottom: '1rem' }}>
        <button className="btn--voltar" onClick={aoVoltar}>
          ← Projetos
        </button>
      </p>
      <div className="card">
        <h3>Novo projeto</h3>
        <p style={{ marginBottom: '1rem' }}>
          Escolha um modelo de fases pronto. Dá para ajustar tudo depois.
        </p>
        {erro && <div className="erro-msg">{erro}</div>}
        <form onSubmit={(e) => void criar(e)}>
          <div className="form-grade">
            <div className="field campo-2">
              <label>Nome do projeto</label>
              <input
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="ex.: Identidade visual · Shapes"
                required
              />
            </div>
            <div className="field">
              <label>Cliente cadastrado</label>
              <select value={clienteId} onChange={(e) => setClienteId(e.target.value)}>
                <option value="">(escolher depois)</option>
                {clientes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nome_marca}
                  </option>
                ))}
              </select>
            </div>
            {!clienteId && (
              <div className="field">
                <label>Ou nome do cliente (livre)</label>
                <input
                  value={clienteNome}
                  onChange={(e) => setClienteNome(e.target.value)}
                  placeholder="aparece na página do cliente"
                />
              </div>
            )}
            <div className="field">
              <label>Modelo de fases</label>
              <select value={modelo} onChange={(e) => setModelo(e.target.value)}>
                {MODELOS_FASES.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.nome}
                  </option>
                ))}
              </select>
            </div>
            <div className="field campo-toda">
              <label>Descrição (opcional, o cliente vê)</label>
              <textarea rows={2} value={descricao} onChange={(e) => setDescricao(e.target.value)} />
            </div>
          </div>
          <button className="btn" type="submit" disabled={gerando || !nome.trim()}>
            {gerando ? 'Criando…' : 'Criar projeto'}
          </button>
        </form>
      </div>
    </>
  )
}

// ---------------------------------------------------------------------------
// Detalhe: as fases. Um clique na fase avança o status
// (pendente → em andamento → concluída). Tudo salva na hora.
// ---------------------------------------------------------------------------
function DetalheProjeto({ original, aoVoltar }: { original: Projeto; aoVoltar: () => void }) {
  const [p, setP] = useState<Projeto>(original)
  const [erro, setErro] = useState<string | null>(null)
  const [msg, setMsg] = useState<string | null>(null)
  const [salvando, setSalvando] = useState(false)
  const [clientes, setClientes] = useState<Cliente[]>([])

  useEffect(() => {
    listarClientes()
      .then(setClientes)
      .catch(() => setClientes([]))
  }, [])

  const pct = progressoProjeto(p)

  function avisarWhatsApp() {
    const cliente = p.cliente_id ? clientes.find((c) => c.id === p.cliente_id) : null
    const nome = primeiroNome(cliente?.responsavel ?? p.cliente_nome)
    const concluidas = p.fases.filter((f) => f.status === 'concluida')
    const ultima = concluidas[concluidas.length - 1]
    const atual = p.fases.find((f) => f.status === 'andamento')
    const linhas = [`Boa notícia${nome ? `, ${nome}` : ''}! ✨`, '']
    if (ultima) linhas.push(`Concluímos a etapa "${ultima.nome}" do projeto ${p.nome}.`)
    else linhas.push(`O projeto ${p.nome} avançou!`)
    if (atual) linhas.push(`Agora estamos em: ${atual.nome}.`)
    linhas.push(
      `Progresso: ${pct}% ✅`,
      '',
      `Acompanhe em tempo real por aqui: ${linkPublicoProjeto(p.token)}`,
      '',
      'Kelly',
    )
    abrirWhatsApp(
      cliente?.telefone,
      linhas.join('\n'),
      cliente?.responsavel ?? p.cliente_nome,
    )
  }

  async function aplicar(dados: Partial<Pick<Projeto, 'nome' | 'descricao' | 'fases' | 'status' | 'cliente_nome'>>) {
    setSalvando(true)
    setErro(null)
    try {
      const atualizado = await salvarProjeto(p.id, dados)
      setP(atualizado)
    } catch (e) {
      setErro(e instanceof Error ? e.message : String(e))
    } finally {
      setSalvando(false)
    }
  }

  function avancarFase(i: number) {
    const fases = p.fases.map<FaseProjeto>((f, idx) => {
      if (idx !== i) return f
      const status = proximoStatusFase(f.status)
      return { ...f, status, concluida_em: status === 'concluida' ? new Date().toISOString() : null }
    })
    void aplicar({ fases })
  }

  function renomearFase(i: number) {
    const nome = window.prompt('Nome da fase:', p.fases[i].nome)
    if (!nome?.trim()) return
    void aplicar({ fases: p.fases.map((f, idx) => (idx === i ? { ...f, nome: nome.trim() } : f)) })
  }

  function removerFase(i: number) {
    if (!window.confirm(`Remover a fase "${p.fases[i].nome}"?`)) return
    void aplicar({ fases: p.fases.filter((_, idx) => idx !== i) })
  }

  function adicionarFase() {
    const nome = window.prompt('Nome da nova fase:')
    if (!nome?.trim()) return
    void aplicar({
      fases: [...p.fases, { nome: nome.trim(), status: 'pendente', concluida_em: null }],
    })
  }

  function moverFase(i: number, delta: -1 | 1) {
    const j = i + delta
    if (j < 0 || j >= p.fases.length) return
    const fases = [...p.fases]
    ;[fases[i], fases[j]] = [fases[j], fases[i]]
    void aplicar({ fases })
  }

  async function copiarLink() {
    await navigator.clipboard.writeText(linkPublicoProjeto(p.token))
    setMsg('Link copiado. Envie ao cliente. A página dele atualiza em tempo real.')
    setTimeout(() => setMsg(null), 4000)
  }

  return (
    <>
      <p style={{ marginBottom: '1rem', display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
        <button className="btn--voltar" onClick={aoVoltar}>
          ← Projetos
        </button>
        <button className="btn--voltar" onClick={() => void copiarLink()}>
          Copiar link do cliente
        </button>
        <button className="btn--voltar btn--voltar-whats" onClick={avisarWhatsApp}>
          Avisar no WhatsApp
        </button>
      </p>

      {erro && <div className="erro-msg">{erro}</div>}
      {msg && <div className="nota">{msg}</div>}

      <div className="card">
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.8rem', flexWrap: 'wrap' }}>
          <h3 style={{ flex: 1 }}>{p.nome}</h3>
          <select
            value={p.status}
            disabled={salvando}
            onChange={(e) => void aplicar({ status: e.target.value as ProjetoStatus })}
            style={{ fontFamily: 'var(--body)', fontSize: '0.8rem', padding: '0.35rem 0.6rem', borderRadius: 8, border: '1px solid rgba(15,25,35,0.12)', background: 'var(--bg-1)' }}
          >
            <option value="ativo">ativo</option>
            <option value="pausado">pausado</option>
            <option value="concluido">concluído</option>
          </select>
        </div>
        {p.cliente_nome && (
          <p style={{ marginTop: 2 }}>
            Cliente: <strong>{p.cliente_nome}</strong>
          </p>
        )}

        <div className="progresso" style={{ margin: '0.9rem 0 1.2rem' }}>
          <div className="progresso__barra progresso__barra--grande">
            <span style={{ width: `${pct}%` }} />
          </div>
          <span className="progresso__pct">{pct}%</span>
        </div>

        <div className="fases">
          {p.fases.map((f, i) => (
            <div key={i} className={`fase fase--${f.status}`}>
              <button
                className="fase__status"
                disabled={salvando}
                title="Clique para avançar: pendente → em andamento → concluída"
                onClick={() => avancarFase(i)}
              >
                {f.status === 'concluida' ? '✓' : f.status === 'andamento' ? '●' : String(i + 1)}
              </button>
              <div className="fase__info">
                <div className="fase__nome">{f.nome}</div>
                <div className="fase__meta">
                  {ROTULO_FASE[f.status]}
                  {f.concluida_em && ` em ${formatarData(f.concluida_em)}`}
                </div>
              </div>
              <div className="fase__acoes">
                <button className="btn-mini" disabled={salvando || i === 0} onClick={() => moverFase(i, -1)} title="Subir">
                  ▲
                </button>
                <button className="btn-mini" disabled={salvando || i === p.fases.length - 1} onClick={() => moverFase(i, 1)} title="Descer">
                  ▼
                </button>
                <button className="btn-mini" disabled={salvando} onClick={() => renomearFase(i)}>
                  Renomear
                </button>
                <button className="btn-mini btn-mini--perigo" disabled={salvando} onClick={() => removerFase(i)}>
                  ✕
                </button>
              </div>
            </div>
          ))}
        </div>

        <p style={{ marginTop: '0.9rem' }}>
          <button className="btn-mini" disabled={salvando} onClick={adicionarFase}>
            + Adicionar fase
          </button>
        </p>

        <p style={{ marginTop: '0.6rem', fontSize: '0.75rem', color: 'var(--t-400)' }}>
          Dica: clique na bolinha de uma fase para avançar (pendente → em andamento → concluída).
          O cliente vê a mudança na hora pelo link.
        </p>
      </div>
    </>
  )
}
