import { useEffect, useRef, useState, type FormEvent } from 'react'
import { formatarData } from '../../lib/gestao'
import { listarClientes } from '../../lib/api'
import type { Cliente } from '../../lib/database.types'
import { abrirWhatsApp, primeiroNome } from '../../lib/whatsapp'
import { BotaoMic } from '../../components/BotaoMic'
import { BotaoLinkVM } from '../../components/BotaoLinkVM'
import { useToast } from '../../components/Toast'
import { useDitado } from '../../hooks/useDitado'
import { confirmar } from '../../lib/confirmar'
import { autoAltura } from '../../lib/ui'
import {
  listarProjetos,
  pendenciasDeProjetos,
  salvarProjeto,
  type Pendencia,
  type Projeto,
} from '../../lib/projetos'
import {
  alternarAtividade,
  carregarOrdemPendencias,
  CATEGORIAS,
  criarAtividade,
  definirOrdens,
  duplicarAtividade,
  editarAtividade,
  excluirAtividade,
  listarAtividades,
  ROTULO_CATEGORIA,
  salvarOrdemPendencias,
  type Atividade,
  type CategoriaAtividade,
} from '../../lib/atividades'

// ============================================================================
// ATIVIDADES DA KELLY — painel pessoal.
//
// Junta, num só lugar: as pendências de TRABALHO que vêm dos projetos dos
// clientes (etapas em aberto que são da KA) + tarefas que a Kelly adiciona à
// mão. Tudo separado em KA, VM, BIA e Pessoal.
//
// Duas VISÕES da mesma lista (a escolha fica guardada no aparelho):
//   • Painéis — uma coluna por categoria, lado a lado (estilo quadro).
//   • Lista   — as categorias uma embaixo da outra.
// Em qualquer uma delas TUDO é arrastável, inclusive as etapas de projeto
// (a posição delas vive em `preferencias/ordem_atividades`), e as tarefas
// concluídas ficam recolhidas num bloco que abre e fecha.
// ============================================================================

const ORDEM: CategoriaAtividade[] = CATEGORIAS

type Visao = 'paineis' | 'lista'

/** Item da lista: etapa de projeto (derivada) ou tarefa da Kelly (documento). */
type Item =
  | {
      tipo: 'pend'
      chave: string
      ordem: number
      feito: boolean
      data: string | null
      cliente: string
      pd: Pendencia
    }
  | {
      tipo: 'ativ'
      chave: string
      ordem: number
      feito: boolean
      data: string | null
      cliente: string
      a: Atividade
    }

const chaveDaPendencia = (pd: Pendencia) => `p-${pd.projeto_id}-${pd.fase_idx}`

// Preferências simples de tela (visão e blocos de concluídas), por aparelho.
function lerPref<T>(chave: string, padrao: T): T {
  try {
    const bruto = localStorage.getItem(chave)
    return bruto ? (JSON.parse(bruto) as T) : padrao
  } catch {
    return padrao
  }
}
function gravarPref(chave: string, valor: unknown) {
  try {
    localStorage.setItem(chave, JSON.stringify(valor))
  } catch {
    /* aparelho sem armazenamento: a tela funciona igual, só não lembra */
  }
}

export function GestaoAtividades() {
  const { mostrar } = useToast()
  const [projetos, setProjetos] = useState<Projeto[]>([])
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [atividades, setAtividades] = useState<Atividade[]>([])
  const [ordemPend, setOrdemPend] = useState<Record<string, number>>({})
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState<string | null>(null)
  const [salvando, setSalvando] = useState(false)
  const [filtro, setFiltro] = useState<'tudo' | CategoriaAtividade>('tudo')
  const [ordenar, setOrdenar] = useState<'padrao' | 'data' | 'cliente'>('padrao')
  const [visao, setVisao] = useState<Visao>(() => lerPref<Visao>('ka.ativ.visao', 'paineis'))
  const [feitasAbertas, setFeitasAbertas] = useState<Record<string, boolean>>(() =>
    lerPref<Record<string, boolean>>('ka.ativ.feitas', {}),
  )
  const [formAberto, setFormAberto] = useState(false)

  useEffect(() => gravarPref('ka.ativ.visao', visao), [visao])
  useEffect(() => gravarPref('ka.ativ.feitas', feitasAbertas), [feitasAbertas])

  // Nova atividade
  const [novoTitulo, setNovoTitulo] = useState('')
  const [novaCategoria, setNovaCategoria] = useState<CategoriaAtividade>('pessoal')
  const [novaData, setNovaData] = useState('')
  const [novoClienteId, setNovoClienteId] = useState('') // só p/ categoria 'cliente'/'vm'
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

  // Arrastar (Pointer Events — funciona no toque do iPhone). Vale para TUDO:
  // tarefas e etapas de projeto, dentro da coluna ou entre colunas.
  const [dragChave, setDragChave] = useState<string | null>(null)
  const [overChave, setOverChave] = useState<string | null>(null)
  const [overCat, setOverCat] = useState<CategoriaAtividade | null>(null)
  const [dragXY, setDragXY] = useState({ x: 0, y: 0 })
  const [movidoChave, setMovidoChave] = useState<string | null>(null) // flash dourado
  const rowsRef = useRef<Map<string, HTMLElement>>(new Map())
  const colsRef = useRef<Map<CategoriaAtividade, HTMLElement>>(new Map())
  const dragRef = useRef<{
    cat: CategoriaAtividade
    de: string
    paraCat: CategoriaAtividade
    para: string | null
  } | null>(null)
  const movidoTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  // Momento em que o último arraste terminou — o clique que vem logo depois é
  // ignorado (senão soltar a tarefa abriria a caixa de edição).
  const arrastouRef = useRef(0)
  // "Segurar para pegar": timer + cancelamento quando o dedo rola a página.
  const segurarRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  function marcarMovido(chave: string) {
    setMovidoChave(chave)
    if (movidoTimer.current) clearTimeout(movidoTimer.current)
    movidoTimer.current = setTimeout(() => setMovidoChave(null), 1300)
  }
  useEffect(
    () => () => {
      if (movidoTimer.current) clearTimeout(movidoTimer.current)
      if (segurarRef.current) clearTimeout(segurarRef.current)
    },
    [],
  )

  async function recarregar() {
    try {
      setCarregando(true)
      const [ps, as, cs, om] = await Promise.all([
        listarProjetos(),
        listarAtividades(),
        listarClientes(),
        carregarOrdemPendencias(),
      ])
      setProjetos(ps)
      setAtividades(as)
      setClientes(cs)
      setOrdemPend(om)
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
  // Pendências do CLIENTE (etapas que o cliente precisa fazer — a KA cobra).
  const pendCliente = pendenciasDeProjetos(projetos, 'CLIENTE')

  // ---- Montagem da lista de uma categoria ---------------------------------
  // Etapas de projeto e tarefas ficam na MESMA lista, ordenadas pela posição
  // manual (arrastar). Etapa nova, que ainda não foi arrastada, nasce no topo.
  function itensDe(cat: CategoriaAtividade): Item[] {
    const pendencias = cat === 'trabalho' ? pendKA : cat === 'cliente' ? pendCliente : []
    const itens: Item[] = [
      ...pendencias.map((pd): Item => {
        const chave = chaveDaPendencia(pd)
        return {
          tipo: 'pend',
          chave,
          ordem: ordemPend[chave] ?? -1,
          feito: false,
          data: pd.data ?? null,
          cliente: pd.cliente_nome ?? '',
          pd,
        }
      }),
      ...atividades
        .filter((a) => a.categoria === cat)
        .map(
          (a): Item => ({
            tipo: 'ativ',
            chave: `a-${a.id}`,
            ordem: a.ordem ?? 0,
            feito: a.feito,
            data: a.data ?? null,
            cliente: a.cliente_nome ?? '',
            a,
          }),
        ),
    ]
    const FIM = '￿' // vazios (sem data / sem cliente) vão para o fim
    itens.sort((x, y) => {
      if (x.feito !== y.feito) return Number(x.feito) - Number(y.feito) // feitas por último
      if (ordenar === 'data') return (x.data || FIM).localeCompare(y.data || FIM)
      if (ordenar === 'cliente') {
        const c = (x.cliente || FIM).localeCompare(y.cliente || FIM)
        return c !== 0 ? c : (x.data || FIM).localeCompare(y.data || FIM)
      }
      return x.ordem - y.ordem
    })
    return itens
  }

  // Pendência de projeto do cliente OU atividade manual da categoria 'cliente'
  // → cobra no WhatsApp (usa o telefone do cliente, se houver).
  function cobrarProjetoCliente(pd: Pendencia) {
    const proj = projetos.find((p) => p.id === pd.projeto_id)
    const cli = proj?.cliente_id ? clientes.find((c) => c.id === proj.cliente_id) : null
    const nome = primeiroNome(cli?.responsavel ?? pd.cliente_nome)
    const linhas = [
      `Oi${nome ? `, ${nome}` : ''}! Tudo bem? 😊`,
      '',
      `Para seguirmos com o projeto ${pd.projeto_nome}, preciso de você:`,
      `• ${pd.fase_nome}${pd.data ? ` (até ${formatarData(pd.data)})` : ''}`,
      '',
      'Assim que me enviar, sigo com a próxima etapa. Obrigada! Kelly',
    ]
    abrirWhatsApp(cli?.telefone, linhas.join('\n'), cli?.responsavel ?? pd.cliente_nome)
  }

  function cobrarAtividadeCliente(a: Atividade) {
    const cli = a.cliente_id ? clientes.find((c) => c.id === a.cliente_id) : null
    const nome = primeiroNome(cli?.responsavel ?? a.cliente_nome)
    const linhas = [
      `Oi${nome ? `, ${nome}` : ''}! Tudo bem? 😊`,
      '',
      `Passando pra lembrar: ${a.titulo}${a.data ? ` (até ${formatarData(a.data)})` : ''}`,
      '',
      'Qualquer coisa, me chama! Kelly',
    ]
    abrirWhatsApp(cli?.telefone, linhas.join('\n'), cli?.responsavel ?? a.cliente_nome ?? null)
  }

  // Menor `ordem` de uma categoria (para novos itens nascerem no topo).
  function menorOrdem(cat: CategoriaAtividade): number {
    return Math.min(0, ...itensDe(cat).map((it) => it.ordem))
  }

  async function addNovo(e: FormEvent) {
    e.preventDefault()
    await criarUma()
  }

  // Cliente escolhido (para as categorias 'cliente' e 'vm', que podem apontar
  // de qual cliente é a tarefa).
  const usaCliente = novaCategoria === 'cliente' || novaCategoria === 'vm'
  function dadosCliente() {
    if (!usaCliente || !novoClienteId) return { cliente_id: null, cliente_nome: null }
    const c = clientes.find((x) => x.id === novoClienteId)
    return { cliente_id: c?.id ?? null, cliente_nome: c?.nome_marca ?? null }
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
        ...dadosCliente(),
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
            ...dadosCliente(),
          }),
        )
      }
      setAtividades((l) => [...criadas.reverse(), ...l])
      setTextoColar('')
      setNovaData('')
      setModoColar(false)
      setFiltro(novaCategoria)
      mostrar(
        `${criadas.length} ${criadas.length === 1 ? 'tarefa adicionada' : 'tarefas adicionadas'} em ${ROTULO_CATEGORIA[novaCategoria]}`,
      )
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
      mostrar('Não deu para salvar, tente de novo.', 'erro')
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
      mostrar('Tarefa excluída.', 'ok')
    } catch {
      mostrar('Não deu para excluir, tente de novo.', 'erro')
      void recarregar()
    }
  }

  // ---- Reordenar (só no modo "Padrão") ------------------------------------
  // Grava a posição de cada item da coluna: tarefas no próprio documento
  // (`ordem`), etapas de projeto no mapa `preferencias/ordem_atividades`.
  async function gravarPosicoes(lista: Item[]) {
    const pares: { id: string; ordem: number }[] = []
    const mapa: Record<string, number> = {}
    lista.forEach((it, i) => {
      if (it.tipo === 'ativ') pares.push({ id: it.a.id, ordem: i })
      else mapa[it.chave] = i
    })
    // Estado local já reflete a nova ordem (a tela não "pisca" esperando o banco).
    setAtividades((l) => {
      const pos = new Map(pares.map((p) => [p.id, p.ordem]))
      return l.map((a) => (pos.has(a.id) ? { ...a, ordem: pos.get(a.id) } : a))
    })
    if (Object.keys(mapa).length > 0) setOrdemPend((o) => ({ ...o, ...mapa }))
    try {
      await Promise.all([
        pares.length > 0 ? definirOrdens(pares) : Promise.resolve(),
        Object.keys(mapa).length > 0 ? salvarOrdemPendencias(mapa) : Promise.resolve(),
      ])
    } catch {
      mostrar('Não deu para salvar a nova ordem, tente de novo.', 'erro')
      void recarregar()
    }
  }

  /** Move `deChave` para a posição de `paraChave` (ou para o fim, se null). */
  async function aplicarReordem(
    cat: CategoriaAtividade,
    deChave: string,
    paraChave: string | null,
  ) {
    const arr = itensDe(cat)
    const de = arr.findIndex((it) => it.chave === deChave)
    if (de < 0) return
    const para = paraChave ? arr.findIndex((it) => it.chave === paraChave) : arr.length - 1
    if (para < 0 || de === para) return
    const [item] = arr.splice(de, 1)
    arr.splice(para, 0, item)
    marcarMovido(deChave)
    await gravarPosicoes(arr)
  }

  /** Arrastou para OUTRA coluna: muda a categoria da tarefa e reposiciona. */
  async function mudarCategoria(
    a: Atividade,
    novaCat: CategoriaAtividade,
    paraChave: string | null,
  ) {
    const chave = `a-${a.id}`
    const destino = itensDe(novaCat).filter((it) => it.chave !== chave)
    const item: Item = {
      tipo: 'ativ',
      chave,
      ordem: 0,
      feito: a.feito,
      data: a.data ?? null,
      cliente: a.cliente_nome ?? '',
      a: { ...a, categoria: novaCat },
    }
    const idx = paraChave ? destino.findIndex((it) => it.chave === paraChave) : -1
    if (idx >= 0) destino.splice(idx, 0, item)
    else destino.push(item)
    setAtividades((l) => l.map((x) => (x.id === a.id ? { ...x, categoria: novaCat } : x)))
    marcarMovido(chave)
    try {
      await editarAtividade(a.id, { categoria: novaCat })
    } catch {
      mostrar('Não deu para mudar de coluna, tente de novo.', 'erro')
      void recarregar()
      return
    }
    await gravarPosicoes(destino)
    mostrar(`Movida para ${ROTULO_CATEGORIA[novaCat]}`)
  }

  /**
   * Começa a arrastar de fato. Chamado pela alça (na hora) ou por segurar o
   * cartão (~0,3s). Enquanto arrasta, bloqueia a rolagem da página no toque —
   * sem isso o iPhone rola junto e a tarefa "escapa" do dedo.
   */
  function comecarArraste(
    alvo: HTMLElement,
    pointerId: number,
    inicio: { x: number; y: number },
    cat: CategoriaAtividade,
    chave: string,
  ) {
    try {
      alvo.setPointerCapture(pointerId)
    } catch {
      /* ignora */
    }
    const segurarRolagem = (ev: TouchEvent) => ev.preventDefault()
    window.addEventListener('touchmove', segurarRolagem, { passive: false })
    dragRef.current = { cat, de: chave, paraCat: cat, para: chave }
    setDragChave(chave)
    setOverChave(chave)
    setOverCat(cat)
    setDragXY({ x: 0, y: 0 })

    const mover = (ev: PointerEvent) => {
      const st = dragRef.current
      if (!st) return
      // O cartão arrastado segue o ponteiro (é o movimento que se vê).
      setDragXY({ x: ev.clientX - inicio.x, y: ev.clientY - inicio.y })

      // 1) Em qual coluna está o ponteiro? (na visão em lista há uma só por vez)
      let colunaAlvo = st.paraCat
      let melhorCol = Infinity
      for (const c of colunasVisiveis) {
        const el = colsRef.current.get(c)
        if (!el) continue
        const r = el.getBoundingClientRect()
        const dentro = ev.clientX >= r.left && ev.clientX <= r.right
        const dist = dentro ? 0 : Math.min(Math.abs(ev.clientX - r.left), Math.abs(ev.clientX - r.right))
        const distY = ev.clientY < r.top ? r.top - ev.clientY : ev.clientY > r.bottom ? ev.clientY - r.bottom : 0
        const total = dist + distY
        if (total < melhorCol) {
          melhorCol = total
          colunaAlvo = c
        }
      }

      // 2) Qual item dessa coluna está mais perto do dedo/cursor?
      let alvo: string | null = null
      let melhor = Infinity
      for (const it of itensDe(colunaAlvo)) {
        if (it.chave === st.de) continue
        const el = rowsRef.current.get(it.chave)
        if (!el) continue
        const r = el.getBoundingClientRect()
        const dist = Math.abs(ev.clientY - (r.top + r.bottom) / 2)
        if (dist < melhor) {
          melhor = dist
          alvo = it.chave
        }
      }
      st.paraCat = colunaAlvo
      st.para = alvo
      setOverCat(colunaAlvo)
      setOverChave(alvo)
    }

    const soltar = () => {
      window.removeEventListener('pointermove', mover)
      window.removeEventListener('pointerup', soltar)
      window.removeEventListener('pointercancel', soltar)
      window.removeEventListener('touchmove', segurarRolagem)
      // Segura o clique que vem logo depois de soltar (senão abre a edição).
      arrastouRef.current = Date.now()
      const st = dragRef.current
      dragRef.current = null
      setDragChave(null)
      setOverChave(null)
      setOverCat(null)
      setDragXY({ x: 0, y: 0 })
      if (!st) return
      if (st.paraCat === st.cat) {
        if (st.para && st.para !== st.de) void aplicarReordem(st.cat, st.de, st.para)
        return
      }
      // Soltou em outra coluna
      const item = itensDe(st.cat).find((it) => it.chave === st.de)
      if (item?.tipo === 'ativ') void mudarCategoria(item.a, st.paraCat, st.para)
      else mostrar('Etapa de projeto fica na coluna do responsável.', 'info')
    }

    window.addEventListener('pointermove', mover)
    window.addEventListener('pointerup', soltar)
    window.addEventListener('pointercancel', soltar)
  }

  /**
   * Toque/clique no cartão: a alça (⠿) pega na hora; no resto do cartão vale
   * "segurar para pegar" (~0,3s parado). Se o dedo desliza antes disso, é
   * rolagem da página e o arraste é cancelado. Botões (check, excluir, cobrar)
   * seguem funcionando normalmente.
   */
  function aoPressionarCartao(
    e: React.PointerEvent<HTMLElement>,
    cat: CategoriaAtividade,
    chave: string,
  ) {
    if (!podeArrastar || dragRef.current) return
    const alvo = e.target as HTMLElement
    // Ações de verdade (marcar feita, excluir, cobrar) não arrastam.
    if (alvo.closest('.ativ__acoes, .ativ__check')) return

    const cartao = e.currentTarget
    const inicio = { x: e.clientX, y: e.clientY }
    const pointerId = e.pointerId
    const naAlca = !!alvo.closest('.ativ__alca')

    if (naAlca) {
      e.preventDefault()
      comecarArraste(cartao, pointerId, inicio, cat, chave)
      return
    }

    // Segurar para pegar: cancela se o dedo andar (rolagem) ou soltar antes.
    const cancelar = () => {
      if (segurarRef.current) clearTimeout(segurarRef.current)
      segurarRef.current = null
      window.removeEventListener('pointermove', vigiar)
      window.removeEventListener('pointerup', cancelar)
      window.removeEventListener('pointercancel', cancelar)
    }
    const vigiar = (ev: PointerEvent) => {
      if (Math.abs(ev.clientX - inicio.x) > 10 || Math.abs(ev.clientY - inicio.y) > 10) cancelar()
    }
    window.addEventListener('pointermove', vigiar)
    window.addEventListener('pointerup', cancelar)
    window.addEventListener('pointercancel', cancelar)
    segurarRef.current = setTimeout(() => {
      cancelar()
      comecarArraste(cartao, pointerId, inicio, cat, chave)
    }, 300)
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
      mostrar('Não deu para salvar, tente de novo.', 'erro')
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

  // Quantidade em aberto por categoria (KA conta as etapas de projeto).
  function abertosDe(cat: CategoriaAtividade): number {
    return itensDe(cat).filter((it) => !it.feito).length
  }
  const totalAberto = ORDEM.reduce((s, c) => s + abertosDe(c), 0)
  const colunasVisiveis = ORDEM.filter((c) => filtro === 'tudo' || filtro === c)
  const podeArrastar = ordenar === 'padrao'

  // ---- Um item da lista (cartão compacto) ---------------------------------
  function cartao(it: Item, cat: CategoriaAtividade) {
    const arrastando = dragChave === it.chave
    const alvo = overChave === it.chave && dragChave && dragChave !== it.chave
    const classes = [
      'ativ',
      it.tipo === 'pend' ? 'ativ--projeto' : '',
      it.tipo === 'pend' && cat === 'cliente' ? 'ativ--cliente' : '',
      it.feito ? 'ativ--feito' : '',
      arrastando ? 'ativ--arrastando' : '',
      alvo ? 'ativ--alvo' : '',
      movidoChave === it.chave ? 'ativ--movido' : '',
    ]
      .filter(Boolean)
      .join(' ')

    return (
      <div
        key={it.chave}
        ref={(el) => {
          if (el) rowsRef.current.set(it.chave, el)
          else rowsRef.current.delete(it.chave)
        }}
        className={classes}
        onPointerDown={(e) => aoPressionarCartao(e, cat, it.chave)}
        style={
          arrastando
            ? {
                transform: `translate(${dragXY.x}px, ${dragXY.y}px) scale(1.03)`,
                zIndex: 30,
              }
            : undefined
        }
      >
        {podeArrastar && (
          <span className="ativ__alca" title="Segure e arraste para mover" aria-hidden>
            ⠿
          </span>
        )}

        {it.tipo === 'pend' ? (
          <button
            className="ativ__check"
            disabled={salvando}
            title="Marcar etapa como concluída"
            onClick={() => void concluirPendencia(it.pd)}
          >
            {it.pd.status === 'andamento' ? '●' : '○'}
          </button>
        ) : (
          <button
            className="ativ__check"
            title={it.feito ? 'Marcar como não feita' : 'Marcar como feita'}
            onClick={() => void toggle(it.a)}
          >
            {it.feito ? '✓' : '○'}
          </button>
        )}

        {it.tipo === 'pend' ? (
          <div className="ativ__corpo">
            <div className="ativ__titulo">{it.pd.fase_nome}</div>
            <div className="ativ__meta">
              <span className="ativ__tag">projeto</span>
              <span className="ativ__meta-txt">
                {it.pd.projeto_nome}
                {it.pd.cliente_nome ? ` · ${it.pd.cliente_nome}` : ''}
              </span>
              {it.pd.data && <span className="data-chip">📅 {formatarData(it.pd.data)}</span>}
            </div>
          </div>
        ) : (
          <button
            className="ativ__corpo ativ__corpo--btn"
            onClick={() => {
              // Soltar a tarefa dispara um clique — esse não abre a edição.
              if (Date.now() - arrastouRef.current < 350) return
              iniciarEdicao(it.a)
            }}
            title="Editar"
          >
            <div className="ativ__titulo">{it.a.titulo}</div>
            {(it.a.cliente_nome || it.a.data) && (
              <div className="ativ__meta">
                {it.a.cliente_nome && <span className="ativ__meta-txt">{it.a.cliente_nome}</span>}
                {it.a.data && <span className="data-chip">📅 {formatarData(it.a.data)}</span>}
              </div>
            )}
          </button>
        )}

        <div className="ativ__acoes">
          {(it.tipo === 'pend' ? cat === 'cliente' : it.a.categoria === 'cliente') && (
            <button
              className="btn-mini btn-mini--whats"
              title="Cobrar o cliente no WhatsApp"
              onClick={() =>
                it.tipo === 'pend' ? cobrarProjetoCliente(it.pd) : cobrarAtividadeCliente(it.a)
              }
            >
              Cobrar
            </button>
          )}
          {it.tipo === 'ativ' && (
            <button
              className="btn-mini btn-mini--perigo"
              title="Excluir"
              aria-label="Excluir"
              onClick={() => void excluir(it.a)}
            >
              ✕
            </button>
          )}
        </div>
      </div>
    )
  }

  // Edição inline de uma tarefa (substitui o cartão enquanto edita).
  function cartaoEdicao(chave: string, a: Atividade) {
    return (
      <div key={chave} className="ativ ativ--edit">
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
          <select
            value={editCategoria}
            onChange={(e) => setEditCategoria(e.target.value as CategoriaAtividade)}
          >
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
          <button
            className="btn-mini"
            disabled={salvando}
            title="Criar uma cópia desta tarefa"
            onClick={() => {
              setEditId(null)
              void duplicar(a)
            }}
          >
            Duplicar
          </button>
        </div>
      </div>
    )
  }

  // ---- Uma categoria (coluna do quadro OU bloco da lista) -----------------
  function coluna(cat: CategoriaAtividade) {
    const itens = itensDe(cat)
    const abertos = itens.filter((it) => !it.feito)
    const feitos = itens.filter((it) => it.feito)
    const mostrarFeitas = !!feitasAbertas[cat]
    const recebendo = overCat === cat && dragChave !== null

    return (
      <section
        key={cat}
        className={`ativ-col cat--${cat} ${recebendo ? 'ativ-col--recebendo' : ''}`}
        ref={(el) => {
          if (el) colsRef.current.set(cat, el)
          else colsRef.current.delete(cat)
        }}
      >
        <header className="ativ-col__cab">
          <h3 className={`ativ-col__tit cat--${cat}`}>{ROTULO_CATEGORIA[cat]}</h3>
          <span className="ativ-col__n">{abertos.length}</span>
        </header>

        <div className="ativ-col__corpo">
          {abertos.length === 0 && feitos.length === 0 && (
            <p className="ativ-vazio">Nada por aqui ainda.</p>
          )}

          {abertos.map((it) =>
            it.tipo === 'ativ' && editId === it.a.id
              ? cartaoEdicao(it.chave, it.a)
              : cartao(it, cat),
          )}

          {feitos.length > 0 && (
            <>
              <button
                className={`feitas-tog ${mostrarFeitas ? 'feitas-tog--on' : ''}`}
                onClick={() => setFeitasAbertas((f) => ({ ...f, [cat]: !f[cat] }))}
              >
                <span className="feitas-tog__seta" aria-hidden>
                  {mostrarFeitas ? '▾' : '▸'}
                </span>
                Concluídas <span className="feitas-tog__n">{feitos.length}</span>
              </button>
              {mostrarFeitas &&
                feitos.map((it) =>
                  it.tipo === 'ativ' && editId === it.a.id
                    ? cartaoEdicao(it.chave, it.a)
                    : cartao(it, cat),
                )}
            </>
          )}
        </div>
      </section>
    )
  }

  return (
    <>
      <div className="gestao-acoes ativ-barra">
        <div className="seg seg--visao">
          <button className={visao === 'paineis' ? 'seg__on' : ''} onClick={() => setVisao('paineis')}>
            ▦ Painéis
          </button>
          <button className={visao === 'lista' ? 'seg__on' : ''} onClick={() => setVisao('lista')}>
            ☰ Lista
          </button>
        </div>
        <div className="chips">
          <button
            className={`chip ${filtro === 'tudo' ? 'chip--on' : ''}`}
            onClick={() => setFiltro('tudo')}
          >
            Tudo <span className="chip__n">{totalAberto}</span>
          </button>
          {ORDEM.map((c) => (
            <button
              key={c}
              className={`chip ${filtro === c ? 'chip--on' : ''}`}
              onClick={() => setFiltro(c)}
            >
              {ROTULO_CATEGORIA[c]} <span className="chip__n">{abertosDe(c)}</span>
            </button>
          ))}
        </div>
        <label className="ordenar">
          Ordenar por:
          <select value={ordenar} onChange={(e) => setOrdenar(e.target.value as typeof ordenar)}>
            <option value="padrao">Minha ordem</option>
            <option value="data">Data</option>
            <option value="cliente">Cliente</option>
          </select>
        </label>
        <button className="btn" onClick={() => setFormAberto((v) => !v)}>
          {formAberto ? '✕ Fechar' : '+ Nova tarefa'}
        </button>
        <BotaoLinkVM rotulo="Link da VM" />
      </div>

      {erro && <div className="erro-msg">{erro}</div>}

      {/* Nova atividade — uma tarefa OU colar/ditar várias */}
      {formAberto && (
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
                  rows={1}
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
              <select
                value={novaCategoria}
                onChange={(e) => setNovaCategoria(e.target.value as CategoriaAtividade)}
              >
                {ORDEM.map((c) => (
                  <option key={c} value={c}>
                    {ROTULO_CATEGORIA[c]}
                  </option>
                ))}
              </select>
              {usaCliente && (
                <select
                  value={novoClienteId}
                  onChange={(e) => setNovoClienteId(e.target.value)}
                  title="Cliente"
                >
                  <option value="">
                    {novaCategoria === 'vm' ? 'Cliente (opcional)…' : 'Cliente (p/ cobrar)…'}
                  </option>
                  {clientes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nome_marca}
                    </option>
                  ))}
                </select>
              )}
              <input
                type="date"
                value={novaData}
                onChange={(e) => setNovaData(e.target.value)}
                title="Data (opcional)"
              />
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
                  placeholder={
                    'Cole ou dite várias tarefas — uma por linha.\nEx.:\nFalar com a fornecedora\nEnviar arte da Boba Joy\nMarcar reunião'
                  }
                />
                {ditadoVarias.suportado && (
                  <BotaoMic
                    gravando={ditadoVarias.gravando}
                    onClick={ditadoVarias.alternar}
                    titulo="Ditar (cada frase vira uma linha)"
                  />
                )}
              </div>
              <div className="add-ativ-colar__baixo">
                <select
                  value={novaCategoria}
                  onChange={(e) => setNovaCategoria(e.target.value as CategoriaAtividade)}
                >
                  {ORDEM.map((c) => (
                    <option key={c} value={c}>
                      {ROTULO_CATEGORIA[c]}
                    </option>
                  ))}
                </select>
                {usaCliente && (
                  <select
                    value={novoClienteId}
                    onChange={(e) => setNovoClienteId(e.target.value)}
                    title="Cliente"
                  >
                    <option value="">
                      {novaCategoria === 'vm' ? 'Cliente (opcional)…' : 'Cliente (p/ cobrar)…'}
                    </option>
                    {clientes.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.nome_marca}
                      </option>
                    ))}
                  </select>
                )}
                <input
                  type="date"
                  value={novaData}
                  onChange={(e) => setNovaData(e.target.value)}
                  title="Data (opcional)"
                />
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
              O ditado por voz 🎤 aparece no Chrome e no Safari do iPhone (o navegador pede permissão
              do microfone).
            </p>
          )}
        </div>
      )}

      {carregando && <p style={{ color: 'var(--t-500)', fontSize: '0.85rem' }}>Carregando…</p>}

      {!carregando && !podeArrastar && (
        <p className="dica-voz" style={{ marginTop: 0 }}>
          Ordenado por {ordenar === 'data' ? 'data' : 'cliente'}. Volte para{' '}
          <strong>Minha ordem</strong> para poder arrastar.
        </p>
      )}

      {!carregando && (
        <div className={visao === 'paineis' ? 'ativ-quadro' : 'ativ-pilha'}>
          {colunasVisiveis.map((cat) => coluna(cat))}
        </div>
      )}
    </>
  )
}
