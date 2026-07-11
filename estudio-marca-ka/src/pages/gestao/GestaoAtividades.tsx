import { useEffect, useRef, useState, type FormEvent } from 'react'
import { formatarData } from '../../lib/gestao'
import { BotaoMic } from '../../components/BotaoMic'
import { useToast } from '../../components/Toast'
import { useDitado } from '../../hooks/useDitado'
import { confirmar } from '../../lib/confirmar'
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
  reordenarAtividades,
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

// Faz a caixa de texto crescer sozinha conforme o conteúdo (some com a barra de
// rolagem e mostra a tarefa inteira, sem cortar numa linha só).
function autoAltura(el: HTMLTextAreaElement | null) {
  if (!el) return
  el.style.height = 'auto'
  el.style.height = `${el.scrollHeight}px`
}

export function GestaoAtividades() {
  const { mostrar } = useToast()
  const [projetos, setProjetos] = useState<Projeto[]>([])
  const [atividades, setAtividades] = useState<Atividade[]>([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState<string | null>(null)
  const [salvando, setSalvando] = useState(false)
  const [filtro, setFiltro] = useState<'tudo' | CategoriaAtividade>('tudo')
  const [ordenar, setOrdenar] = useState<'padrao' | 'data' | 'cliente'>('padrao')

  // Nova atividade
  const [novoTitulo, setNovoTitulo] = useState('')
  const [novaCategoria, setNovaCategoria] = useState<CategoriaAtividade>('pessoal')
  const [novaData, setNovaData] = useState('')
  // Modo "colar várias" (uma por linha) e ditado por voz
  const [modoColar, setModoColar] = useState(false)
  const [textoColar, setTextoColar] = useState('')
  const ditadoUm = useDitado((t) => setNovoTitulo((v) => (v ? `${v} ${t}` : t)))
  const ditadoVarias = useDitado((t) => setTextoColar((v) => (v ? `${v}\n${t}` : t)))

  // Edição inline
  const [editId, setEditId] = useState<string | null>(null)
  const [editTitulo, setEditTitulo] = useState('')
  const [editCategoria, setEditCategoria] = useState<CategoriaAtividade>('pessoal')
  const [editData, setEditData] = useState('')

  // Arrastar para reordenar (Pointer Events — funciona no toque do iPhone)
  const [dragId, setDragId] = useState<string | null>(null)
  const [overId, setOverId] = useState<string | null>(null)
  const rowsRef = useRef<Map<string, HTMLElement>>(new Map())
  const dragRef = useRef<{ cat: CategoriaAtividade; de: string; para: string } | null>(null)

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

  // Menor `ordem` de uma categoria (para novos itens nascerem no topo).
  function menorOrdem(cat: CategoriaAtividade): number {
    return Math.min(0, ...atividades.filter((a) => a.categoria === cat).map((a) => a.ordem ?? 0))
  }

  async function addNovo(e: FormEvent) {
    e.preventDefault()
    await criarUma()
  }

  async function criarUma() {
    const titulo = novoTitulo.trim()
    if (!titulo) return
    setSalvando(true)
    try {
      const nova = await criarAtividade({
        titulo,
        categoria: novaCategoria,
        data: novaData || null,
        ordem: menorOrdem(novaCategoria) - 1,
      })
      setAtividades((l) => [nova, ...l])
      setNovoTitulo('')
      setNovaData('')
    } catch (e) {
      setErro(e instanceof Error ? e.message : String(e))
    } finally {
      setSalvando(false)
    }
  }

  // Linhas não vazias do textão "colar várias".
  const linhasColar = textoColar
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)

  async function adicionarVarias() {
    if (linhasColar.length === 0) return
    if (ditadoVarias.gravando) ditadoVarias.alternar()
    setSalvando(true)
    try {
      // Cria mantendo a ordem colada no topo (a 1ª linha fica mais em cima).
      const base = menorOrdem(novaCategoria)
      const n = linhasColar.length
      const criadas: Atividade[] = []
      for (let i = 0; i < n; i++) {
        criadas.push(
          await criarAtividade({
            titulo: linhasColar[i],
            categoria: novaCategoria,
            data: novaData || null,
            ordem: base - (n - i),
          }),
        )
      }
      setAtividades((l) => [...criadas.reverse(), ...l])
      setTextoColar('')
      setNovaData('')
      setModoColar(false)
      setFiltro(novaCategoria)
      mostrar(`${criadas.length} ${criadas.length === 1 ? 'tarefa adicionada' : 'tarefas adicionadas'} em ${ROTULO_CATEGORIA[novaCategoria]}`)
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
      mostrar('Tarefa duplicada')
    } catch (e) {
      setErro(e instanceof Error ? e.message : String(e))
    } finally {
      setSalvando(false)
    }
  }

  async function excluir(a: Atividade) {
    if (!(await confirmar(`Excluir "${a.titulo}"?`, { perigo: true, confirmar: 'Excluir' }))) return
    setAtividades((l) => l.filter((x) => x.id !== a.id))
    try {
      await excluirAtividade(a.id)
    } catch {
      void recarregar()
    }
  }

  // ---- Arrastar para reordenar (só no modo "Padrão") ----
  // Atividades pessoais de uma categoria, na ordem em que aparecem (não feitas
  // primeiro, depois por `ordem`). É a mesma ordem usada no render.
  function pessoaisOrdenadas(cat: CategoriaAtividade): Atividade[] {
    return atividades
      .filter((a) => a.categoria === cat)
      .sort((a, b) => Number(a.feito) - Number(b.feito) || (a.ordem ?? 0) - (b.ordem ?? 0))
  }

  async function aplicarReordem(cat: CategoriaAtividade, deId: string, paraId: string) {
    const arr = pessoaisOrdenadas(cat)
    const de = arr.findIndex((a) => a.id === deId)
    const para = arr.findIndex((a) => a.id === paraId)
    if (de < 0 || para < 0 || de === para) return
    const [item] = arr.splice(de, 1)
    arr.splice(para, 0, item)
    const pos = new Map(arr.map((a, i) => [a.id, i]))
    setAtividades((l) => l.map((a) => (pos.has(a.id) ? { ...a, ordem: pos.get(a.id) } : a)))
    try {
      await reordenarAtividades(arr.map((a) => a.id))
    } catch {
      void recarregar()
    }
  }

  function iniciarArraste(e: React.PointerEvent, cat: CategoriaAtividade, id: string) {
    e.preventDefault()
    dragRef.current = { cat, de: id, para: id }
    setDragId(id)
    setOverId(id)
    const mover = (ev: PointerEvent) => {
      const st = dragRef.current
      if (!st) return
      const y = ev.clientY
      let alvo = st.de
      for (const a of pessoaisOrdenadas(st.cat)) {
        const el = rowsRef.current.get(a.id)
        if (!el) continue
        const r = el.getBoundingClientRect()
        if (y >= r.top && y <= r.bottom) {
          alvo = a.id
          break
        }
      }
      st.para = alvo
      setOverId(alvo)
    }
    const soltar = () => {
      window.removeEventListener('pointermove', mover)
      window.removeEventListener('pointerup', soltar)
      const st = dragRef.current
      dragRef.current = null
      setDragId(null)
      setOverId(null)
      if (st && st.de !== st.para) void aplicarReordem(st.cat, st.de, st.para)
    }
    window.addEventListener('pointermove', mover)
    window.addEventListener('pointerup', soltar)
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
        <label className="ordenar">
          Ordenar por:
          <select value={ordenar} onChange={(e) => setOrdenar(e.target.value as typeof ordenar)}>
            <option value="padrao">Padrão</option>
            <option value="data">Data</option>
            <option value="cliente">Cliente</option>
          </select>
        </label>
      </div>

      {erro && <div className="erro-msg">{erro}</div>}

      {/* Nova atividade — uma tarefa OU colar/ditar várias */}
      <div className="card add-ativ-card">
        <div className="seg add-ativ-seg">
          <button className={!modoColar ? 'seg__on' : ''} onClick={() => setModoColar(false)}>
            Uma tarefa
          </button>
          <button className={modoColar ? 'seg__on' : ''} onClick={() => setModoColar(true)}>
            Colar / ditar várias
          </button>
        </div>

        {!modoColar ? (
          <form className="add-ativ" onSubmit={(e) => void addNovo(e)}>
            <div className="campo-mic campo-mic--cresce">
              <textarea
                rows={2}
                value={novoTitulo}
                ref={autoAltura}
                onChange={(e) => {
                  setNovoTitulo(e.target.value)
                  autoAltura(e.currentTarget)
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    void criarUma()
                  }
                }}
                placeholder="O que precisa fazer?"
              />
              {ditadoUm.suportado && (
                <BotaoMic gravando={ditadoUm.gravando} onClick={ditadoUm.alternar} />
              )}
            </div>
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
        ) : (
          <div className="add-ativ-colar">
            <div className="campo-mic campo-mic--area">
              <textarea
                rows={5}
                value={textoColar}
                onChange={(e) => setTextoColar(e.target.value)}
                placeholder={'Cole ou dite várias tarefas — uma por linha.\nEx.:\nFalar com a fornecedora\nEnviar arte da Boba Joy\nMarcar reunião'}
              />
              {ditadoVarias.suportado && (
                <BotaoMic gravando={ditadoVarias.gravando} onClick={ditadoVarias.alternar} titulo="Ditar (cada frase vira uma linha)" />
              )}
            </div>
            <div className="add-ativ-colar__baixo">
              <select value={novaCategoria} onChange={(e) => setNovaCategoria(e.target.value as CategoriaAtividade)}>
                {ORDEM.map((c) => (
                  <option key={c} value={c}>
                    {ROTULO_CATEGORIA[c]}
                  </option>
                ))}
              </select>
              <input type="date" value={novaData} onChange={(e) => setNovaData(e.target.value)} title="Data (opcional)" />
              <span className="add-ativ__conta">
                {linhasColar.length} {linhasColar.length === 1 ? 'tarefa' : 'tarefas'}
              </span>
              <button
                className="btn"
                onClick={() => void adicionarVarias()}
                disabled={salvando || linhasColar.length === 0}
              >
                + Adicionar todas
              </button>
            </div>
          </div>
        )}

        {!ditadoUm.suportado && (
          <p className="dica-voz">
            O ditado por voz 🎤 aparece no Chrome e no Safari do iPhone (o navegador pede permissão do microfone).
          </p>
        )}
      </div>

      {carregando && <p style={{ color: 'var(--t-500)', fontSize: '0.85rem' }}>Carregando…</p>}

      {!carregando && ordenar === 'padrao' && atividades.length > 0 && (
        <p className="dica-voz" style={{ marginTop: 0 }}>
          Segure a alça <span aria-hidden>⠿</span> e arraste para reordenar suas tarefas.
        </p>
      )}

      {!carregando &&
        categoriasVisiveis.map((cat) => {
          const pessoais = atividades.filter((a) => a.categoria === cat)
          const pendencias = cat === 'trabalho' ? pendKA : []
          const vazio = pessoais.length === 0 && pendencias.length === 0

          // Junta pendências de projeto + atividades pessoais numa lista só e
          // ordena conforme a escolha (Padrão / Data / Cliente).
          type Item =
            | { tipo: 'pend'; chave: string; data: string | null; cliente: string; feito: boolean; pd: Pendencia }
            | { tipo: 'ativ'; chave: string; data: string | null; cliente: string; feito: boolean; a: Atividade }
          const itens: Item[] = [
            ...pendencias.map(
              (pd): Item => ({
                tipo: 'pend',
                chave: `p-${pd.projeto_id}-${pd.fase_idx}`,
                data: pd.data ?? null,
                cliente: pd.cliente_nome ?? '',
                feito: false,
                pd,
              }),
            ),
            ...pessoais.map(
              (a): Item => ({ tipo: 'ativ', chave: `a-${a.id}`, data: a.data ?? null, cliente: '', feito: a.feito, a }),
            ),
          ]
          const FIM = '￿' // vazios (sem data / sem cliente) vão para o fim
          itens.sort((x, y) => {
            // feitas sempre por último
            if (x.feito !== y.feito) return Number(x.feito) - Number(y.feito)
            if (ordenar === 'data') return (x.data || FIM).localeCompare(y.data || FIM)
            if (ordenar === 'cliente') {
              const c = (x.cliente || FIM).localeCompare(y.cliente || FIM)
              return c !== 0 ? c : (x.data || FIM).localeCompare(y.data || FIM)
            }
            // padrão: pendências de projeto primeiro, depois pessoais por ordem
            if ((x.tipo === 'pend') !== (y.tipo === 'pend')) return x.tipo === 'pend' ? -1 : 1
            if (x.tipo === 'ativ' && y.tipo === 'ativ') return (x.a.ordem ?? 0) - (y.a.ordem ?? 0)
            return 0
          })

          return (
            <div key={cat} className="ativ-grupo">
              <h3 className={`ativ-grupo__tit cat--${cat}`}>{ROTULO_CATEGORIA[cat]}</h3>

              {vazio && <p className="ativ-vazio">Nada por aqui ainda.</p>}

              {itens.map((it) =>
                it.tipo === 'pend' ? (
                  <div key={it.chave} className="ativ ativ--projeto">
                    <button
                      className="ativ__check"
                      disabled={salvando}
                      title="Marcar etapa como concluída"
                      onClick={() => void concluirPendencia(it.pd)}
                    >
                      {it.pd.status === 'andamento' ? '●' : '○'}
                    </button>
                    <div className="ativ__corpo">
                      <div className="ativ__titulo">{it.pd.fase_nome}</div>
                      <div className="ativ__sub">
                        <span className="ativ__tag">projeto</span>
                        {it.pd.projeto_nome}
                        {it.pd.cliente_nome ? ` · ${it.pd.cliente_nome}` : ''}
                        {it.pd.data && <> · 📅 {formatarData(it.pd.data)}</>}
                      </div>
                    </div>
                  </div>
                ) : (() => {
                  const a = it.a
                  return editId === a.id ? (
                  <div key={a.id} className="ativ ativ--edit">
                    <textarea
                      autoFocus
                      rows={2}
                      className="ativ__edit-txt"
                      value={editTitulo}
                      ref={autoAltura}
                      onChange={(e) => {
                        setEditTitulo(e.target.value)
                        autoAltura(e.currentTarget)
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault()
                          void salvarEdicao()
                        }
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
                  <div
                    key={a.id}
                    ref={(el) => {
                      if (el) rowsRef.current.set(a.id, el)
                      else rowsRef.current.delete(a.id)
                    }}
                    className={`ativ ${a.feito ? 'ativ--feito' : ''} ${dragId === a.id ? 'ativ--arrastando' : ''} ${
                      overId === a.id && dragId && dragId !== a.id ? 'ativ--alvo' : ''
                    }`}
                  >
                    {ordenar === 'padrao' && (
                      <span
                        className="fase__handle"
                        title="Segure e arraste para reordenar"
                        onPointerDown={(e) => iniciarArraste(e, cat, a.id)}
                      >
                        ⠿
                      </span>
                    )}
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
                  )
                })(),
              )}
            </div>
          )
        })}
    </>
  )
}
