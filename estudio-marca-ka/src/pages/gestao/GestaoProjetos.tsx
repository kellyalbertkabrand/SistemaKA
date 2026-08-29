import { useEffect, useRef, useState, type FormEvent } from 'react'
import type { Cliente } from '../../lib/database.types'
import { listarClientes } from '../../lib/api'
import { formatarData } from '../../lib/gestao'
import { useArrastarCartoes } from '../../hooks/useArrastarCartoes'
import {
  criarProjeto,
  definirOrdensProjetos,
  diasParaEntrega,
  ESTAGIOS,
  estagioDoProjeto,
  excluirProjeto,
  faseAtual,
  moverProjeto,
  ROTULO_ESTAGIO,
  linkPublicoProjeto,
  listarFasesSalvas,
  listarProjetos,
  MODELOS_FASES,
  pendenciasDeProjetos,
  progressoProjeto,
  proximoStatusFase,
  respClasse,
  responsavelPadrao,
  rotuloResp,
  salvarFaseSalva,
  salvarProjeto,
  type FaseProjeto,
  type FaseSalva,
  type EstagioProjeto,
  type FaseStatus,
  type Projeto,
  type ProjetoStatus,
  type Responsavel,
} from '../../lib/projetos'
import { abrirWhatsApp, primeiroNome } from '../../lib/whatsapp'
import { confirmar } from '../../lib/confirmar'
import { useToast } from '../../components/Toast'
import { BotaoLinkVM } from '../../components/BotaoLinkVM'
import { autoAltura } from '../../lib/ui'
import { rotuloStatus } from '../../lib/rotulos'
import { useFichaUrl } from '../../hooks/useFichaUrl'

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

const BADGE_FASE: Record<FaseStatus, string> = {
  pendente: 'badge--cinza',
  andamento: 'badge--azul',
  concluida: 'badge--verde',
}

// Projetos: cadastro simples, fases com modelos prontos e link público onde
// o cliente acompanha o andamento em tempo real.
export function GestaoProjetos() {
  const { mostrar } = useToast()
  const { idAberto, abrir: abrirUrl, fechar } = useFichaUrl('id')
  const [lista, setLista] = useState<Projeto[]>([])
  const [erro, setErro] = useState<string | null>(null)
  const [carregando, setCarregando] = useState(true)

  // Projeto aberto / criação vêm da URL (?id=<uuid> ou ?id=novo).
  const criando = idAberto === 'novo'
  const sel: Projeto | null =
    idAberto && idAberto !== 'novo' ? (lista.find((p) => p.id === idAberto) ?? null) : null
  // Visão: lista de projetos OU painel de pendências (com filtro por responsável)
  const [vista, setVista] = useState<'quadro' | 'projetos' | 'pendencias'>('quadro')
  const [filtroResp, setFiltroResp] = useState<Responsavel | 'todas'>('todas')

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
    await navigator.clipboard.writeText(linkPublicoProjeto(p.token, p.cliente_nome ?? p.nome))
    mostrar(`Link de "${p.nome}" copiado — é só enviar ao cliente`)
  }

  async function excluir(p: Projeto) {
    if (!(await confirmar(`Excluir o projeto "${p.nome}"? O link do cliente para de funcionar.`, { perigo: true, confirmar: 'Excluir' }))) return
    try {
      await excluirProjeto(p.id)
      await recarregar()
    } catch (e) {
      setErro(e instanceof Error ? e.message : String(e))
    }
  }

  // ---- QUADRO: um projeto por cartão, uma coluna por estágio ---------------
  // A ordem dentro da coluna é manual (arrastar). Projeto sem ordem entra pelo
  // nome, para a lista nunca sair embaralhada.
  function projetosDe(estagio: EstagioProjeto): Projeto[] {
    return lista
      .filter((p) => estagioDoProjeto(p) === estagio)
      .sort((a, b) => (a.ordem ?? 0) - (b.ordem ?? 0) || a.nome.localeCompare(b.nome))
  }

  async function soltarProjeto(
    de: string,
    origem: EstagioProjeto,
    paraColuna: EstagioProjeto,
    antesDe: string | null,
  ) {
    const movido = lista.find((p) => p.id === de)
    if (!movido) return
    const destino = projetosDe(paraColuna).filter((p) => p.id !== de)
    const idx = antesDe ? destino.findIndex((p) => p.id === antesDe) : -1
    if (idx >= 0) destino.splice(idx, 0, movido)
    else destino.push(movido)

    // Aplica na tela na hora (sem esperar o banco).
    const posicao = new Map(destino.map((p, i) => [p.id, i]))
    setLista((l) =>
      l.map((p) => {
        if (p.id === de) {
          return {
            ...p,
            estagio: paraColuna,
            status: paraColuna === 'entregue' ? 'concluido' : 'ativo',
            ordem: posicao.get(p.id) ?? 0,
          }
        }
        return posicao.has(p.id) ? { ...p, ordem: posicao.get(p.id) } : p
      }),
    )
    try {
      if (origem !== paraColuna) {
        await moverProjeto(de, paraColuna, posicao.get(de) ?? 0)
        mostrar(`"${movido.nome}" → ${ROTULO_ESTAGIO[paraColuna]}`)
      }
      await definirOrdensProjetos(destino.map((p, i) => ({ id: p.id, ordem: i })))
    } catch {
      mostrar('Não deu para salvar a mudança, tente de novo.', 'erro')
      void recarregar()
    }
  }

  const arrastar = useArrastarCartoes<EstagioProjeto>({
    colunas: ESTAGIOS,
    itensDaColuna: (col) => projetosDe(col).map((p) => p.id),
    aoSoltar: (de, origem, para, antes) => void soltarProjeto(de, origem, para, antes),
  })

  if (criando) {
    return (
      <NovoProjeto
        aoVoltar={fechar}
        aoCriar={(p) => {
          setLista((l) => [p, ...l])
          abrirUrl(p.id)
        }}
      />
    )
  }

  if (sel) {
    return (
      <DetalheProjeto
        key={sel.id}
        original={sel}
        aoVoltar={() => {
          fechar()
          void recarregar()
        }}
      />
    )
  }

  const pendTodas = pendenciasDeProjetos(lista, 'todas')
  const pendKA = pendenciasDeProjetos(lista, 'KA')
  const pendVM = pendenciasDeProjetos(lista, 'VM')
  const pendCliente = pendenciasDeProjetos(lista, 'CLIENTE')
  const pend =
    filtroResp === 'KA'
      ? pendKA
      : filtroResp === 'VM'
        ? pendVM
        : filtroResp === 'CLIENTE'
          ? pendCliente
          : pendTodas
  const contaPend = (f: typeof filtroResp) =>
    f === 'todas' ? pendTodas.length : f === 'KA' ? pendKA.length : f === 'VM' ? pendVM.length : pendCliente.length

  return (
    <>
      <div className="gestao-acoes">
        <div className="seg">
          <button className={vista === 'quadro' ? 'seg__on' : ''} onClick={() => setVista('quadro')}>
            ▦ Quadro
          </button>
          <button className={vista === 'projetos' ? 'seg__on' : ''} onClick={() => setVista('projetos')}>
            ☰ Lista ({lista.length})
          </button>
          <button className={vista === 'pendencias' ? 'seg__on' : ''} onClick={() => setVista('pendencias')}>
            Pendências ({pendTodas.length})
          </button>
        </div>
        <span className="espaco" />
        <BotaoLinkVM rotulo="Link da VM" />
        <button className="btn" onClick={() => abrirUrl('novo')}>
          + Novo projeto
        </button>
      </div>

      {erro && <div className="erro-msg">{erro}</div>}
      {carregando && <p style={{ color: 'var(--t-500)', fontSize: '0.85rem' }}>Carregando…</p>}

      {vista === 'pendencias' && (
        <>
          <div className="pend-filtros">
            {(['todas', 'KA', 'VM', 'CLIENTE'] as const).map((f) => (
              <button
                key={f}
                className={`chip ${filtroResp === f ? 'chip--on' : ''} ${f === 'CLIENTE' && pendCliente.length > 0 ? 'chip--cliente' : ''}`}
                onClick={() => setFiltroResp(f)}
              >
                {f === 'todas' ? 'Todas' : rotuloResp(f)} <span className="chip__n">{contaPend(f)}</span>
              </button>
            ))}
          </div>

          {pend.length === 0 ? (
            <div className="card">
              <h3>Tudo em dia por aqui ✨</h3>
              <p>Nenhuma etapa em aberto {filtroResp !== 'todas' ? `para ${rotuloResp(filtroResp)}` : ''}.</p>
            </div>
          ) : (
            <div className="pend-lista">
              {pend.map((pd) => (
                <button
                  key={`${pd.projeto_id}-${pd.fase_idx}`}
                  className="pend-item"
                  onClick={() => abrirUrl(pd.projeto_id)}
                  title="Abrir o projeto"
                >
                  <span className={`resp-badge resp--${respClasse(pd.responsavel)}`}>{rotuloResp(pd.responsavel)}</span>
                  <div className="pend-item__corpo">
                    <div className="pend-item__fase">{pd.fase_nome}</div>
                    <div className="pend-item__proj">
                      {pd.projeto_nome}
                      {pd.cliente_nome ? ` · ${pd.cliente_nome}` : ''}
                    </div>
                  </div>
                  <div className="pend-item__dir">
                    <span className={`badge ${BADGE_FASE[pd.status]}`}>{ROTULO_FASE[pd.status]}</span>
                    {pd.data && <span className="pend-item__data">📅 {formatarData(pd.data)}</span>}
                  </div>
                </button>
              ))}
            </div>
          )}
        </>
      )}

      {vista === 'quadro' && !carregando && lista.length > 0 && (
        <>
          <p className="dica-voz" style={{ marginTop: 0 }}>
            Segure um projeto e arraste: <strong>para cima</strong> muda a ordem da fila,{' '}
            <strong>para o lado</strong> muda de coluna.
          </p>
          <div className="ativ-quadro proj-quadro">
            {ESTAGIOS.map((est) => {
              const daColuna = projetosDe(est)
              const recebendo = arrastar.colunaAlvo === est && arrastar.arrastando !== null
              return (
                <section
                  key={est}
                  className={`ativ-col est--${est} ${recebendo ? 'ativ-col--recebendo' : ''}`}
                  ref={(el) => arrastar.registrarColuna(est, el)}
                >
                  <header className="ativ-col__cab">
                    <h3 className={`ativ-col__tit est--${est}`}>{ROTULO_ESTAGIO[est]}</h3>
                    <span className="ativ-col__n">{daColuna.length}</span>
                  </header>
                  <div className="ativ-col__corpo">
                    {daColuna.length === 0 && <p className="ativ-vazio">—</p>}
                    {daColuna.map((p) => {
                      const pct = progressoProjeto(p)
                      const atual = faseAtual(p)
                      const dias = diasParaEntrega(p)
                      const arrastando = arrastar.arrastando === p.id
                      const alvo =
                        arrastar.alvo === p.id && arrastar.arrastando && arrastar.arrastando !== p.id
                      return (
                        <article
                          key={p.id}
                          ref={(el) => arrastar.registrarCartao(p.id, el)}
                          className={`quadro-card ${arrastando ? 'quadro-card--arrastando' : ''} ${
                            alvo ? 'quadro-card--alvo' : ''
                          }`}
                          onPointerDown={(e) => arrastar.aoPressionar(e, est, p.id)}
                          style={
                            arrastando
                              ? {
                                  transform: `translate(${arrastar.desloc.x}px, ${arrastar.desloc.y}px) scale(1.03)`,
                                  zIndex: 30,
                                }
                              : undefined
                          }
                        >
                          <button
                            className="quadro-card__abrir"
                            onClick={() => {
                              if (arrastar.acabouDeArrastar()) return
                              abrirUrl(p.id)
                            }}
                            title="Abrir projeto"
                          >
                            {p.cliente_nome && <div className="quadro-card__cliente">{p.cliente_nome}</div>}
                            <div className="quadro-card__nome">{p.nome}</div>
                            {atual ? (
                              <div className="quadro-card__fase">
                                <span className={`resp-badge resp--${respClasse(atual.fase.responsavel)}`}>
                                  {rotuloResp(atual.fase.responsavel)}
                                </span>
                                <span className="quadro-card__fase-nome">{atual.fase.nome}</span>
                              </div>
                            ) : (
                              <div className="quadro-card__fase">
                                <span className="quadro-card__fase-nome">Todas as etapas concluídas</span>
                              </div>
                            )}
                            <div className="progresso">
                              <div className="progresso__barra">
                                <span style={{ width: `${pct}%` }} />
                              </div>
                              <span className="progresso__pct">{pct}%</span>
                            </div>
                            {p.entrega_prevista && (
                              <div className="quadro-card__entrega">
                                <span
                                  className={`data-chip ${
                                    dias != null && dias < 0
                                      ? 'data-chip--atrasado'
                                      : dias != null && dias <= 7
                                        ? 'data-chip--perto'
                                        : ''
                                  }`}
                                >
                                  📅 {formatarData(p.entrega_prevista)}
                                  {dias != null && dias < 0
                                    ? ` · ${Math.abs(dias)}d atrasado`
                                    : dias != null && dias <= 7
                                      ? ` · faltam ${dias}d`
                                      : ''}
                                </span>
                              </div>
                            )}
                          </button>
                        </article>
                      )
                    })}
                  </div>
                </section>
              )
            })}
          </div>
        </>
      )}

      {vista === 'quadro' && !carregando && lista.length === 0 && !erro && (
        <div className="card">
          <h3>Nenhum projeto ainda.</h3>
          <p>
            Crie o primeiro em “+ Novo projeto”. Ele entra em <strong>Na fila</strong> — depois é só
            arrastar para “Em andamento” quando começar.
          </p>
        </div>
      )}

      {vista === 'projetos' && !carregando && lista.length === 0 && !erro && (
        <div className="card">
          <h3>Nenhum projeto ainda.</h3>
          <p>
            Crie o primeiro em “+ Novo projeto”: escolha o cliente, um modelo de fases pronto
            (identidade, social media, site…) e envie o link para o cliente acompanhar.
          </p>
        </div>
      )}

      {vista === 'projetos' && lista.length > 0 && (
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
                    <td className="cel-nome" data-label="Projeto">
                      <button className="cel-abrir" onClick={() => abrirUrl(p.id)} title="Abrir projeto">
                        <strong>{p.nome}</strong>
                      </button>
                    </td>
                    <td data-label="Cliente">{p.cliente_nome || '-'}</td>
                    <td data-label="Progresso">
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
                    <td data-label="Status">
                      <span className={`badge ${BADGE_PROJETO[p.status]}`}>{rotuloStatus('projeto', p.status)}</span>
                    </td>
                    <td className="acoes">
                      <button className="btn-mini" onClick={() => abrirUrl(p.id)} title="Abrir projeto">
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
  const [inicio, setInicio] = useState('')
  const [entrega, setEntrega] = useState('')
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
        inicio: inicio || null,
        entrega_prevista: entrega || null,
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
            <div className="field">
              <label>Início do projeto (opcional)</label>
              <input type="date" value={inicio} onChange={(e) => setInicio(e.target.value)} />
            </div>
            <div className="field">
              <label>Entrega prevista (opcional)</label>
              <input type="date" value={entrega} onChange={(e) => setEntrega(e.target.value)} />
              <span className="campo-ajuda">Aparece no cartão do quadro e avisa quando atrasa.</span>
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

// Seletor de responsável da etapa: KA, VM Rocks, o cliente do projeto ou um
// texto livre ("Outro"). Guarda o valor bruto (string) — 'KA'/'VM' são
// especiais; o resto é o nome escrito.
function SeletorResponsavel({
  value,
  onChange,
  clienteNome,
}: {
  value: string
  onChange: (v: string) => void
  clienteNome: string | null
}) {
  const opt =
    value === 'KA'
      ? 'KA'
      : value === 'VM'
        ? 'VM'
        : value === 'CLIENTE'
          ? 'cliente'
          : 'outro'
  return (
    <span className="resp-campo">
      <select
        className="resp-sel"
        value={opt}
        onChange={(e) => {
          const o = e.target.value
          if (o === 'KA') onChange('KA')
          else if (o === 'VM') onChange('VM')
          else if (o === 'cliente') onChange('CLIENTE') // tarefa do cliente (cobrar)
          else onChange('') // "outro": começa vazio para digitar
        }}
      >
        <option value="KA">KA</option>
        <option value="VM">VM Rocks</option>
        <option value="cliente">{clienteNome ? `${clienteNome} (cliente)` : 'Cliente (fazer)'}</option>
        <option value="outro">Outro (escrever)</option>
      </select>
      {opt === 'outro' && (
        <input
          className="resp-sel"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Nome do responsável"
        />
      )}
    </span>
  )
}

// ---------------------------------------------------------------------------
// Detalhe: as fases. Um clique na fase avança o status
// (pendente → em andamento → concluída). Tudo salva na hora.
// ---------------------------------------------------------------------------
function DetalheProjeto({ original, aoVoltar }: { original: Projeto; aoVoltar: () => void }) {
  const { mostrar } = useToast()
  const [p, setP] = useState<Projeto>(original)
  const [erro, setErro] = useState<string | null>(null)
  const [salvando, setSalvando] = useState(false)
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [fasesSalvas, setFasesSalvas] = useState<FaseSalva[]>([])
  const [novaNome, setNovaNome] = useState('')
  const [novaDesc, setNovaDesc] = useState('')
  const [novaResp, setNovaResp] = useState<Responsavel>('KA')
  const [novaData, setNovaData] = useState('')
  // Editar o nome do projeto (inline)
  const [editandoNome, setEditandoNome] = useState(false)
  const [nomeEdit, setNomeEdit] = useState('')
  // Editar o nome do cliente (inline) — útil para criar o projeto antes de ter
  // os dados do cliente e só depois trocar o nome / excluir o cadastro provisório
  const [editandoCliente, setEditandoCliente] = useState(false)
  const [clienteEdit, setClienteEdit] = useState('')
  // Edição inline (sem a janelinha do navegador)
  const [editIdx, setEditIdx] = useState<number | null>(null)
  const [editNome, setEditNome] = useState('')
  const [editDesc, setEditDesc] = useState('')
  const [editResp, setEditResp] = useState<Responsavel>('KA')
  const [editData, setEditData] = useState('')
  // Arrastar para reordenar (Pointer Events — funciona no dedo E no mouse;
  // o "draggable" nativo do HTML não dispara no toque do iPhone)
  const [dragIdx, setDragIdx] = useState<number | null>(null)
  const [overIdx, setOverIdx] = useState<number | null>(null)
  const [dragY, setDragY] = useState(0) // deslocamento vertical da fase arrastada
  const [movidoIdx, setMovidoIdx] = useState<number | null>(null) // fase que acabou de mudar de lugar (flash)
  const rowsRef = useRef<(HTMLDivElement | null)[]>([])
  const dragState = useRef<{ de: number; para: number } | null>(null)
  const movidoTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Destaca (flash) a fase que acabou de mudar de lugar, por ~1,3s.
  function marcarMovido(idx: number) {
    setMovidoIdx(idx)
    if (movidoTimer.current) clearTimeout(movidoTimer.current)
    movidoTimer.current = setTimeout(() => setMovidoIdx(null), 1300)
  }
  useEffect(() => () => {
    if (movidoTimer.current) clearTimeout(movidoTimer.current)
  }, [])

  function recarregarSalvas() {
    listarFasesSalvas()
      .then(setFasesSalvas)
      .catch(() => {})
  }

  useEffect(() => {
    listarClientes()
      .then(setClientes)
      .catch(() => setClientes([]))
    recarregarSalvas()
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
      `Acompanhe em tempo real por aqui: ${linkPublicoProjeto(p.token, p.cliente_nome ?? p.nome)}`,
      '',
      'Kelly',
    )
    abrirWhatsApp(
      cliente?.telefone,
      linhas.join('\n'),
      cliente?.responsavel ?? p.cliente_nome,
    )
  }

  async function aplicar(
    dados: Partial<
      Pick<
        Projeto,
        | 'nome'
        | 'descricao'
        | 'fases'
        | 'status'
        | 'cliente_nome'
        | 'inicio'
        | 'entrega_prevista'
        | 'estagio'
      >
    >,
  ) {
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

  function definirStatusFase(i: number, status: FaseStatus) {
    const fases = p.fases.map<FaseProjeto>((f, idx) =>
      idx === i
        ? {
            ...f,
            status,
            concluida_em:
              status === 'concluida' ? (f.concluida_em ?? new Date().toISOString()) : null,
          }
        : f,
    )
    void aplicar({ fases })
  }

  // ---- Edição inline (sem prompt do navegador) ----
  function iniciarEdicao(i: number) {
    setEditIdx(i)
    setEditNome(p.fases[i].nome)
    setEditDesc(p.fases[i].descricao ?? '')
    setEditResp(p.fases[i].responsavel ?? 'KA')
    setEditData(p.fases[i].data ?? '')
  }
  async function salvarEdicao() {
    if (editIdx === null) return
    const nome = editNome.trim()
    if (!nome) return
    const descricao = editDesc.trim() || null
    const data = editData || null
    const responsavel = editResp.trim() || 'KA'
    const i = editIdx
    await aplicar({
      fases: p.fases.map((f, idx) => (idx === i ? { ...f, nome, descricao, responsavel, data } : f)),
    })
    void salvarFaseSalva(nome, descricao)
    recarregarSalvas()
    setEditIdx(null)
  }

  async function removerFase(i: number) {
    if (!(await confirmar(`Remover a fase "${p.fases[i].nome}"?`, { perigo: true, confirmar: 'Remover' }))) return
    void aplicar({ fases: p.fases.filter((_, idx) => idx !== i) })
  }

  // ---- Arrastar para reordenar (segurando a alça) ----
  function reordenar(de: number, para: number) {
    if (de === para || de < 0 || para < 0 || para >= p.fases.length) return
    const fases = [...p.fases]
    const [item] = fases.splice(de, 1)
    fases.splice(para, 0, item)
    void aplicar({ fases })
    marcarMovido(para) // flash no destino p/ ficar claro para onde foi
  }

  // Começa a arrastar pela alça. Usa Pointer Events (dedo ou mouse) e escuta
  // no window até soltar — assim funciona no toque do celular.
  function iniciarArraste(e: React.PointerEvent, i: number) {
    e.preventDefault()
    const startY = e.clientY
    try {
      ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
    } catch {
      /* ignora */
    }
    dragState.current = { de: i, para: i }
    setDragIdx(i)
    setOverIdx(i)
    setDragY(0)
    const mover = (ev: PointerEvent) => {
      if (!dragState.current) return
      setDragY(ev.clientY - startY)
      const y = ev.clientY
      // Alvo = a fase cujo CENTRO está mais perto do dedo/cursor. Assim não há
      // "zona morta" entre as linhas (antes só mudava se soltasse exatamente
      // dentro da linha — por isso alguns itens "não moviam").
      let alvo = dragState.current.de
      let melhor = Infinity
      rowsRef.current.forEach((el, idx) => {
        if (!el) return
        const r = el.getBoundingClientRect()
        const centro = (r.top + r.bottom) / 2
        const dist = Math.abs(y - centro)
        if (dist < melhor) {
          melhor = dist
          alvo = idx
        }
      })
      dragState.current.para = alvo
      setOverIdx(alvo)
    }
    const soltar = () => {
      window.removeEventListener('pointermove', mover)
      window.removeEventListener('pointerup', soltar)
      window.removeEventListener('pointercancel', soltar)
      const st = dragState.current
      dragState.current = null
      setDragIdx(null)
      setOverIdx(null)
      setDragY(0)
      if (st) reordenar(st.de, st.para)
    }
    window.addEventListener('pointermove', mover)
    window.addEventListener('pointerup', soltar)
    window.addEventListener('pointercancel', soltar)
  }

  async function adicionarFase() {
    const nome = novaNome.trim()
    if (!nome) return
    const descricao = novaDesc.trim() || null
    await aplicar({
      fases: [
        ...p.fases,
        { nome, descricao, status: 'pendente', concluida_em: null, responsavel: novaResp.trim() || 'KA', data: novaData || null },
      ],
    })
    // Salva na biblioteca para reusar em outros projetos.
    void salvarFaseSalva(nome, descricao)
    setNovaNome('')
    setNovaDesc('')
    setNovaResp('KA')
    setNovaData('')
    recarregarSalvas()
  }

  // Ao digitar/escolher um nome já salvo, sugere a descrição guardada.
  // Também sugere a VM Rocks quando o nome fala de "visual" ou "instagram".
  function mudarNovaNome(v: string) {
    setNovaNome(v)
    if (!novaDesc.trim()) {
      const achou = fasesSalvas.find((fs) => fs.nome.toLowerCase() === v.trim().toLowerCase())
      if (achou?.descricao) setNovaDesc(achou.descricao)
    }
    if (responsavelPadrao(v) === 'VM') setNovaResp('VM')
  }

  async function copiarLink() {
    await navigator.clipboard.writeText(linkPublicoProjeto(p.token, p.cliente_nome ?? p.nome))
    mostrar('Link copiado — a página do cliente atualiza em tempo real')
  }

  function iniciarEdicaoNome() {
    setNomeEdit(p.nome)
    setEditandoNome(true)
  }
  async function salvarNome() {
    const nome = nomeEdit.trim()
    if (!nome) return
    await aplicar({ nome })
    setEditandoNome(false)
  }

  function iniciarEdicaoCliente() {
    setClienteEdit(p.cliente_nome ?? '')
    setEditandoCliente(true)
  }
  async function salvarCliente() {
    await aplicar({ cliente_nome: clienteEdit.trim() || null })
    setEditandoCliente(false)
  }

  // Tarefas que o CLIENTE precisa fazer (etapas em aberto com responsável Cliente).
  const tarefasCliente = p.fases.filter((f) => f.responsavel === 'CLIENTE' && f.status !== 'concluida')

  // Cobra o cliente no WhatsApp, listando o que falta ele fazer.
  function cobrarClienteWhatsApp() {
    const cliente = p.cliente_id ? clientes.find((c) => c.id === p.cliente_id) : null
    const nome = primeiroNome(cliente?.responsavel ?? p.cliente_nome)
    const linhas = [
      `Oi${nome ? `, ${nome}` : ''}! Tudo bem? 😊`,
      '',
      `Para seguirmos com o projeto ${p.nome}, preciso de você:`,
      ...tarefasCliente.map((f) => `• ${f.nome}${f.data ? ` (até ${formatarData(f.data)})` : ''}`),
      '',
      'Assim que me enviar, sigo com a próxima etapa. Obrigada! Kelly',
    ]
    abrirWhatsApp(cliente?.telefone, linhas.join('\n'), cliente?.responsavel ?? p.cliente_nome)
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
        {tarefasCliente.length > 0 && (
          <button className="btn--voltar btn--voltar-whats" onClick={cobrarClienteWhatsApp}>
            Cobrar cliente ({tarefasCliente.length})
          </button>
        )}
      </p>

      {erro && <div className="erro-msg">{erro}</div>}

      <div className="card">
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.8rem', flexWrap: 'wrap' }}>
          {editandoNome ? (
            <div className="proj-nome-edit" style={{ flex: 1 }}>
              <input
                autoFocus
                value={nomeEdit}
                onChange={(e) => setNomeEdit(e.target.value)}
                placeholder="Nome do projeto"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') void salvarNome()
                  if (e.key === 'Escape') setEditandoNome(false)
                }}
              />
              <button className="btn-mini" disabled={salvando || !nomeEdit.trim()} onClick={() => void salvarNome()}>
                Salvar
              </button>
              <button className="btn-mini" onClick={() => setEditandoNome(false)}>
                Cancelar
              </button>
            </div>
          ) : (
            <h3 style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
              {p.nome}
              <button className="btn-mini" disabled={salvando} title="Editar o nome do projeto" onClick={iniciarEdicaoNome}>
                Editar nome
              </button>
            </h3>
          )}
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
        {editandoCliente ? (
          <div className="proj-nome-edit" style={{ marginTop: 6 }}>
            <input
              autoFocus
              value={clienteEdit}
              onChange={(e) => setClienteEdit(e.target.value)}
              placeholder="Nome do cliente"
              onKeyDown={(e) => {
                if (e.key === 'Enter') void salvarCliente()
                if (e.key === 'Escape') setEditandoCliente(false)
              }}
            />
            <button className="btn-mini" disabled={salvando} onClick={() => void salvarCliente()}>
              Salvar
            </button>
            <button className="btn-mini" onClick={() => setEditandoCliente(false)}>
              Cancelar
            </button>
          </div>
        ) : (
          <p style={{ marginTop: 2, display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
            {p.cliente_nome ? (
              <>
                Cliente: <strong>{p.cliente_nome}</strong>
              </>
            ) : (
              <span style={{ opacity: 0.6 }}>Sem cliente definido</span>
            )}
            <button className="btn-mini" disabled={salvando} title="Alterar o nome do cliente" onClick={iniciarEdicaoCliente}>
              {p.cliente_nome ? 'Alterar cliente' : 'Definir cliente'}
            </button>
          </p>
        )}

        <div className="proj-datas">
          <label className="proj-inicio">
            <span>Início do projeto</span>
            <input
              type="date"
              value={p.inicio ?? ''}
              disabled={salvando}
              onChange={(e) => void aplicar({ inicio: e.target.value || null })}
            />
          </label>
          <label className="proj-inicio">
            <span>Entrega prevista</span>
            <input
              type="date"
              value={p.entrega_prevista ?? ''}
              disabled={salvando}
              onChange={(e) => void aplicar({ entrega_prevista: e.target.value || null })}
            />
          </label>
          <label className="proj-inicio">
            <span>Onde está</span>
            <select
              value={estagioDoProjeto(p)}
              disabled={salvando}
              onChange={(e) =>
                void aplicar({
                  estagio: e.target.value as EstagioProjeto,
                  status: e.target.value === 'entregue' ? 'concluido' : 'ativo',
                })
              }
            >
              {ESTAGIOS.map((est) => (
                <option key={est} value={est}>
                  {ROTULO_ESTAGIO[est]}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="progresso" style={{ margin: '0.9rem 0 1.2rem' }}>
          <div className="progresso__barra progresso__barra--grande">
            <span style={{ width: `${pct}%` }} />
          </div>
          <span className="progresso__pct">{pct}%</span>
        </div>

        {/* Nova fase — no TOPO */}
        <div className="add-fase">
          <input
            list="fases-salvas"
            value={novaNome}
            onChange={(e) => mudarNovaNome(e.target.value)}
            placeholder="Nome da nova fase"
          />
          <textarea
            rows={1}
            className="add-fase__desc"
            value={novaDesc}
            ref={autoAltura}
            onChange={(e) => {
              setNovaDesc(e.target.value)
              autoAltura(e.currentTarget)
            }}
            placeholder="Descrição (o cliente vê)"
          />
          <SeletorResponsavel value={novaResp} onChange={setNovaResp} clienteNome={p.cliente_nome} />
          <input
            className="add-fase__data"
            type="date"
            value={novaData}
            title="Data da etapa (opcional)"
            onChange={(e) => setNovaData(e.target.value)}
          />
          <button className="btn-mini" disabled={salvando || !novaNome.trim()} onClick={() => void adicionarFase()}>
            + Adicionar fase
          </button>
          <datalist id="fases-salvas">
            {fasesSalvas.map((fs) => (
              <option key={fs.id} value={fs.nome} />
            ))}
          </datalist>
        </div>

        <p style={{ margin: '0.2rem 0 0.9rem', fontSize: '0.75rem', color: 'var(--t-400)' }}>
          Arraste pela alça <span aria-hidden>⠿</span> para reordenar. Concluída fica{' '}
          <strong style={{ color: '#2e6b45' }}>verde</strong>, em andamento{' '}
          <strong style={{ color: 'var(--essencia)' }}>azul</strong>, pendente cinza. Cada etapa tem
          um <strong>responsável</strong> (KA, VM Rocks, o cliente ou outro que você escrever) e
          pode ter uma <strong>data</strong> (opcional). As fases que você escreve ficam{' '}
          <strong>salvas</strong> para reusar.
        </p>

        <div className="fases">
          {p.fases.map((f, i) => (
            <div
              key={i}
              ref={(el) => {
                rowsRef.current[i] = el
              }}
              className={`fase fase--${f.status} ${dragIdx === i ? 'fase--arrastando' : ''} ${
                overIdx === i && dragIdx !== null && dragIdx !== i ? 'fase--alvo' : ''
              } ${movidoIdx === i ? 'fase--movido' : ''}`}
              style={dragIdx === i ? { transform: `translateY(${dragY}px)`, zIndex: 20 } : undefined}
            >
              <span
                className="fase__handle"
                title="Segure e arraste para reordenar"
                onPointerDown={(e) => iniciarArraste(e, i)}
              >
                ⠿
              </span>
              <button
                className="fase__status"
                disabled={salvando}
                title="Clique para avançar: pendente → em andamento → concluída"
                onClick={() => avancarFase(i)}
              >
                {f.status === 'concluida' ? '✓' : f.status === 'andamento' ? '●' : String(i + 1)}
              </button>

              {editIdx === i ? (
                <div className="fase__edit">
                  <input
                    autoFocus
                    value={editNome}
                    onChange={(e) => setEditNome(e.target.value)}
                    placeholder="Nome da fase"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') void salvarEdicao()
                      if (e.key === 'Escape') setEditIdx(null)
                    }}
                  />
                  <textarea
                    rows={1}
                    className="fase__edit-desc"
                    value={editDesc}
                    ref={autoAltura}
                    onChange={(e) => {
                      setEditDesc(e.target.value)
                      autoAltura(e.currentTarget)
                    }}
                    placeholder="Descrição (o cliente vê)"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault()
                        void salvarEdicao()
                      }
                      if (e.key === 'Escape') setEditIdx(null)
                    }}
                  />
                  <div className="fase__edit-linha">
                    <label>
                      Responsável
                      <SeletorResponsavel value={editResp} onChange={setEditResp} clienteNome={p.cliente_nome} />
                    </label>
                    <label>
                      Data (opcional)
                      <input type="date" value={editData} onChange={(e) => setEditData(e.target.value)} />
                    </label>
                  </div>
                  <div className="fase__edit-acoes">
                    <button className="btn-mini" disabled={salvando || !editNome.trim()} onClick={() => void salvarEdicao()}>
                      Salvar
                    </button>
                    <button className="btn-mini" onClick={() => setEditIdx(null)}>
                      Cancelar
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <button className="fase__info fase__info--btn" onClick={() => iniciarEdicao(i)} title="Editar esta fase">
                    <div className="fase__nome">{f.nome}</div>
                    {f.descricao && <div className="fase__desc">{f.descricao}</div>}
                    <div className="fase__meta">
                      <span className={`badge ${BADGE_FASE[f.status]}`}>{ROTULO_FASE[f.status]}</span>
                      <span className={`resp-badge resp--${respClasse(f.responsavel)}`}>
                        {rotuloResp(f.responsavel)}
                      </span>
                      {f.data && (
                        <span className="fase__data data-chip">📅 {formatarData(f.data)}</span>
                      )}
                      {f.concluida_em && (
                        <span style={{ marginLeft: 6, color: 'var(--t-400)', textTransform: 'none', letterSpacing: 0 }}>
                          ✓ {formatarData(f.concluida_em)}
                        </span>
                      )}
                    </div>
                  </button>
                  <div className="fase__acoes">
                    <select
                      className={`fase-status-sel status-${f.status}`}
                      value={f.status}
                      disabled={salvando}
                      title="Mudar o status desta fase"
                      onChange={(e) => definirStatusFase(i, e.target.value as FaseStatus)}
                    >
                      <option value="pendente">Pendente</option>
                      <option value="andamento">Em andamento</option>
                      <option value="concluida">Concluída</option>
                    </select>
                    <button className="btn-mini" disabled={salvando} onClick={() => iniciarEdicao(i)}>
                      Editar
                    </button>
                    <button className="btn-mini btn-mini--perigo" disabled={salvando} onClick={() => removerFase(i)}>
                      ✕
                    </button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      </div>
    </>
  )
}
