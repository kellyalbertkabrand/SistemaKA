import { useEffect, useState, type FormEvent } from 'react'
import { formatarData } from '../../lib/gestao'
import {
  listarProjetos,
  pendenciasDeProjetos,
  salvarProjeto,
  type Pendencia,
  type Projeto,
} from '../../lib/projetos'
import {
  alternarAtividade,
  CATEGORIAS,
  criarAtividade,
  duplicarAtividade,
  editarAtividade,
  excluirAtividade,
  listarAtividades,
  ROTULO_CATEGORIA,
  type Atividade,
  type CategoriaAtividade,
} from '../../lib/atividades'

// ============================================================================
// ATIVIDADES DA KELLY — painel pessoal.
//
// Junta, num só lugar: as pendências de TRABALHO que vêm dos projetos dos
// clientes (etapas em aberto que são da KA) + tarefas que a Kelly adiciona à
// mão. Tudo separado em Trabalho, BIA e Pessoal.
// ============================================================================

const ORDEM: CategoriaAtividade[] = CATEGORIAS

export function GestaoAtividades() {
  const [projetos, setProjetos] = useState<Projeto[]>([])
  const [atividades, setAtividades] = useState<Atividade[]>([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState<string | null>(null)
  const [salvando, setSalvando] = useState(false)
  const [filtro, setFiltro] = useState<'tudo' | CategoriaAtividade>('tudo')

  // Nova atividade
  const [novoTitulo, setNovoTitulo] = useState('')
  const [novaCategoria, setNovaCategoria] = useState<CategoriaAtividade>('pessoal')
  const [novaData, setNovaData] = useState('')

  // Edição inline
  const [editId, setEditId] = useState<string | null>(null)
  const [editTitulo, setEditTitulo] = useState('')
  const [editCategoria, setEditCategoria] = useState<CategoriaAtividade>('pessoal')
  const [editData, setEditData] = useState('')

  async function recarregar() {
    try {
      setCarregando(true)
      const [ps, as] = await Promise.all([listarProjetos(), listarAtividades()])
      setProjetos(ps)
      setAtividades(as)
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

  // Pendências de trabalho (etapas da KA em aberto, de todos os projetos).
  const pendKA = pendenciasDeProjetos(projetos, 'KA')

  async function addNovo(e: FormEvent) {
    e.preventDefault()
    const titulo = novoTitulo.trim()
    if (!titulo) return
    setSalvando(true)
    try {
      const nova = await criarAtividade({ titulo, categoria: novaCategoria, data: novaData || null })
      setAtividades((l) => [nova, ...l])
      setNovoTitulo('')
      setNovaData('')
    } catch (e) {
      setErro(e instanceof Error ? e.message : String(e))
    } finally {
      setSalvando(false)
    }
  }

  async function toggle(a: Atividade) {
    const feito = !a.feito
    setAtividades((l) => l.map((x) => (x.id === a.id ? { ...x, feito } : x)))
    try {
      await alternarAtividade(a.id, feito)
    } catch {
      void recarregar()
    }
  }

  async function duplicar(a: Atividade) {
    setSalvando(true)
    try {
      const nova = await duplicarAtividade(a)
      setAtividades((l) => [nova, ...l])
    } catch (e) {
      setErro(e instanceof Error ? e.message : String(e))
    } finally {
      setSalvando(false)
    }
  }

  async function excluir(a: Atividade) {
    if (!window.confirm(`Excluir "${a.titulo}"?`)) return
    setAtividades((l) => l.filter((x) => x.id !== a.id))
    try {
      await excluirAtividade(a.id)
    } catch {
      void recarregar()
    }
  }

  function iniciarEdicao(a: Atividade) {
    setEditId(a.id)
    setEditTitulo(a.titulo)
    setEditCategoria(a.categoria)
    setEditData(a.data ?? '')
  }

  async function salvarEdicao() {
    if (!editId) return
    const titulo = editTitulo.trim()
    if (!titulo) return
    const dados = { titulo, categoria: editCategoria, data: editData || null }
    setAtividades((l) => l.map((x) => (x.id === editId ? { ...x, ...dados } : x)))
    setEditId(null)
    try {
      await editarAtividade(editId, dados)
    } catch {
      void recarregar()
    }
  }

  // Marca uma pendência de trabalho (etapa de projeto) como concluída.
  async function concluirPendencia(pd: Pendencia) {
    const proj = projetos.find((p) => p.id === pd.projeto_id)
    if (!proj) return
    setSalvando(true)
    try {
      const fases = proj.fases.map((f, idx) =>
        idx === pd.fase_idx
          ? { ...f, status: 'concluida' as const, concluida_em: new Date().toISOString() }
          : f,
      )
      const atualizado = await salvarProjeto(proj.id, { fases })
      setProjetos((l) => l.map((p) => (p.id === proj.id ? atualizado : p)))
    } catch (e) {
      setErro(e instanceof Error ? e.message : String(e))
    } finally {
      setSalvando(false)
    }
  }

  // Quantidade em aberto por categoria (trabalho conta as pendências de projeto).
  function abertosDe(cat: CategoriaAtividade): number {
    const pessoais = atividades.filter((a) => a.categoria === cat && !a.feito).length
    return cat === 'trabalho' ? pessoais + pendKA.length : pessoais
  }
  const totalAberto = ORDEM.reduce((s, c) => s + abertosDe(c), 0)

  const categoriasVisiveis = ORDEM.filter((c) => filtro === 'tudo' || filtro === c)

  return (
    <>
      <div className="gestao-acoes">
        <div className="chips">
          <button className={`chip ${filtro === 'tudo' ? 'chip--on' : ''}`} onClick={() => setFiltro('tudo')}>
            Tudo <span className="chip__n">{totalAberto}</span>
          </button>
          {ORDEM.map((c) => (
            <button key={c} className={`chip ${filtro === c ? 'chip--on' : ''}`} onClick={() => setFiltro(c)}>
              {ROTULO_CATEGORIA[c]} <span className="chip__n">{abertosDe(c)}</span>
            </button>
          ))}
        </div>
      </div>

      {erro && <div className="erro-msg">{erro}</div>}

      {/* Nova atividade */}
      <form className="card add-ativ" onSubmit={(e) => void addNovo(e)}>
        <input
          value={novoTitulo}
          onChange={(e) => setNovoTitulo(e.target.value)}
          placeholder="O que precisa fazer?"
        />
        <select value={novaCategoria} onChange={(e) => setNovaCategoria(e.target.value as CategoriaAtividade)}>
          {ORDEM.map((c) => (
            <option key={c} value={c}>
              {ROTULO_CATEGORIA[c]}
            </option>
          ))}
        </select>
        <input type="date" value={novaData} onChange={(e) => setNovaData(e.target.value)} title="Data (opcional)" />
        <button className="btn" type="submit" disabled={salvando || !novoTitulo.trim()}>
          + Adicionar
        </button>
      </form>

      {carregando && <p style={{ color: 'var(--t-500)', fontSize: '0.85rem' }}>Carregando…</p>}

      {!carregando &&
        categoriasVisiveis.map((cat) => {
          const pessoais = atividades.filter((a) => a.categoria === cat)
          const pendencias = cat === 'trabalho' ? pendKA : []
          const vazio = pessoais.length === 0 && pendencias.length === 0
          // pendentes primeiro, feitas por último
          const pessoaisOrd = [...pessoais].sort((a, b) => Number(a.feito) - Number(b.feito))
          return (
            <div key={cat} className="ativ-grupo">
              <h3 className={`ativ-grupo__tit cat--${cat}`}>{ROTULO_CATEGORIA[cat]}</h3>

              {vazio && <p className="ativ-vazio">Nada por aqui ainda.</p>}

              {/* Pendências de trabalho (dos projetos) */}
              {pendencias.map((pd) => (
                <div key={`${pd.projeto_id}-${pd.fase_idx}`} className="ativ ativ--projeto">
                  <button
                    className="ativ__check"
                    disabled={salvando}
                    title="Marcar etapa como concluída"
                    onClick={() => void concluirPendencia(pd)}
                  >
                    {pd.status === 'andamento' ? '●' : '○'}
                  </button>
                  <div className="ativ__corpo">
                    <div className="ativ__titulo">{pd.fase_nome}</div>
                    <div className="ativ__sub">
                      <span className="ativ__tag">projeto</span>
                      {pd.projeto_nome}
                      {pd.cliente_nome ? ` · ${pd.cliente_nome}` : ''}
                      {pd.data && <> · 📅 {formatarData(pd.data)}</>}
                    </div>
                  </div>
                </div>
              ))}

              {/* Atividades pessoais */}
              {pessoaisOrd.map((a) =>
                editId === a.id ? (
                  <div key={a.id} className="ativ ativ--edit">
                    <input
                      autoFocus
                      value={editTitulo}
                      onChange={(e) => setEditTitulo(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') void salvarEdicao()
                        if (e.key === 'Escape') setEditId(null)
                      }}
                    />
                    <div className="ativ__edit-linha">
                      <select value={editCategoria} onChange={(e) => setEditCategoria(e.target.value as CategoriaAtividade)}>
                        {ORDEM.map((c) => (
                          <option key={c} value={c}>
                            {ROTULO_CATEGORIA[c]}
                          </option>
                        ))}
                      </select>
                      <input type="date" value={editData} onChange={(e) => setEditData(e.target.value)} />
                      <button className="btn-mini" disabled={!editTitulo.trim()} onClick={() => void salvarEdicao()}>
                        Salvar
                      </button>
                      <button className="btn-mini" onClick={() => setEditId(null)}>
                        Cancelar
                      </button>
                    </div>
                  </div>
                ) : (
                  <div key={a.id} className={`ativ ${a.feito ? 'ativ--feito' : ''}`}>
                    <button
                      className="ativ__check"
                      title={a.feito ? 'Marcar como não feita' : 'Marcar como feita'}
                      onClick={() => void toggle(a)}
                    >
                      {a.feito ? '✓' : '○'}
                    </button>
                    <button className="ativ__corpo ativ__corpo--btn" onClick={() => iniciarEdicao(a)} title="Editar">
                      <div className="ativ__titulo">{a.titulo}</div>
                      {a.data && <div className="ativ__sub">📅 {formatarData(a.data)}</div>}
                    </button>
                    <div className="ativ__acoes">
                      <button className="btn-mini" disabled={salvando} title="Duplicar" onClick={() => void duplicar(a)}>
                        Duplicar
                      </button>
                      <button
                        className="btn-mini btn-mini--perigo"
                        title="Excluir"
                        onClick={() => void excluir(a)}
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ),
              )}
            </div>
          )
        })}
    </>
  )
}
