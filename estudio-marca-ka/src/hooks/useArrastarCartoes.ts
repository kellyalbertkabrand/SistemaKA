import { useEffect, useRef, useState } from 'react'

// ============================================================================
// ARRASTAR CARTÕES ENTRE COLUNAS (o mesmo gesto das Atividades e dos Projetos).
//
// Como funciona para a KA:
//   • segurar ~0,3s em qualquer parte do cartão pega ele (a alça ⠿ pega na hora);
//   • se o dedo desliza antes disso, é rolagem da página e o arraste é cancelado;
//   • enquanto arrasta, a rolagem trava (senão o iPhone rola junto e o cartão
//     escapa do dedo) e o cartão segue o dedo;
//   • soltar em outro lugar reordena; soltar em outra coluna muda de coluna.
//
// A tela só precisa dizer: quais colunas existem, quais cartões há em cada uma,
// e o que fazer ao soltar (`aoSoltar`).
// ============================================================================

export interface ArrastarConfig<C extends string> {
  /** Colunas visíveis, na ordem em que aparecem. */
  colunas: C[]
  /** Chaves dos cartões de uma coluna, na ordem exibida. */
  itensDaColuna: (coluna: C) => string[]
  /**
   * Soltou o cartão: `de` é a chave arrastada, `paraColuna` a coluna de destino
   * e `antesDe` a chave do cartão que estava sob o dedo (null = fim da lista).
   */
  aoSoltar: (de: string, colunaOrigem: C, paraColuna: C, antesDe: string | null) => void
  /** false desliga o arraste (ex.: quando a lista está ordenada por data). */
  ativo?: boolean
}

export interface Arrastar<C extends string> {
  /** Cartão que está na mão (null = ninguém). */
  arrastando: string | null
  /** Cartão sob o dedo (onde vai cair). */
  alvo: string | null
  /** Coluna sob o dedo. */
  colunaAlvo: C | null
  /** Deslocamento do cartão arrastado, para o `transform`. */
  desloc: { x: number; y: number }
  /** `onPointerDown` do cartão. */
  aoPressionar: (e: React.PointerEvent<HTMLElement>, coluna: C, chave: string) => void
  /** Refs: registre cada cartão e cada coluna para o cálculo do alvo. */
  registrarCartao: (chave: string, el: HTMLElement | null) => void
  registrarColuna: (coluna: C, el: HTMLElement | null) => void
  /** true logo depois de soltar — use para ignorar o clique que vem junto. */
  acabouDeArrastar: () => boolean
}

export function useArrastarCartoes<C extends string>(cfg: ArrastarConfig<C>): Arrastar<C> {
  // As listas/callbacks são lidas de `cfgRef` (sempre a versão atual do render).
  const ativo = cfg.ativo !== false

  const [arrastando, setArrastando] = useState<string | null>(null)
  const [alvo, setAlvo] = useState<string | null>(null)
  const [colunaAlvo, setColunaAlvo] = useState<C | null>(null)
  const [desloc, setDesloc] = useState({ x: 0, y: 0 })

  const cartoesRef = useRef<Map<string, HTMLElement>>(new Map())
  const colunasRef = useRef<Map<C, HTMLElement>>(new Map())
  const estadoRef = useRef<{ de: string; origem: C; coluna: C; alvo: string | null } | null>(null)
  const segurarRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const soltouEmRef = useRef(0)
  // As funções mudam a cada render; o arraste em curso lê sempre as atuais.
  const cfgRef = useRef(cfg)
  cfgRef.current = cfg

  useEffect(
    () => () => {
      if (segurarRef.current) clearTimeout(segurarRef.current)
    },
    [],
  )

  function comecar(
    cartao: HTMLElement,
    pointerId: number,
    inicio: { x: number; y: number },
    coluna: C,
    chave: string,
  ) {
    try {
      cartao.setPointerCapture(pointerId)
    } catch {
      /* ignora */
    }
    // Trava a rolagem da página enquanto o cartão está na mão (iPhone).
    const travarRolagem = (ev: TouchEvent) => ev.preventDefault()
    window.addEventListener('touchmove', travarRolagem, { passive: false })

    estadoRef.current = { de: chave, origem: coluna, coluna, alvo: chave }
    setArrastando(chave)
    setAlvo(chave)
    setColunaAlvo(coluna)
    setDesloc({ x: 0, y: 0 })

    const mover = (ev: PointerEvent) => {
      const st = estadoRef.current
      if (!st) return
      setDesloc({ x: ev.clientX - inicio.x, y: ev.clientY - inicio.y })

      // 1) coluna sob o dedo (a mais próxima, se estiver fora de todas)
      let colDestino = st.coluna
      let melhorCol = Infinity
      for (const c of cfgRef.current.colunas) {
        const el = colunasRef.current.get(c)
        if (!el) continue
        const r = el.getBoundingClientRect()
        const dx = ev.clientX < r.left ? r.left - ev.clientX : ev.clientX > r.right ? ev.clientX - r.right : 0
        const dy = ev.clientY < r.top ? r.top - ev.clientY : ev.clientY > r.bottom ? ev.clientY - r.bottom : 0
        if (dx + dy < melhorCol) {
          melhorCol = dx + dy
          colDestino = c
        }
      }

      // 2) cartão dessa coluna mais perto do dedo (null = coluna vazia/fim).
      // A distância é em DUAS dimensões para valer também nas listas deitadas
      // (a tira de slides do carrossel fica lado a lado no celular). Numa lista
      // em pé o X é igual para todos, então a ordem sai pela altura, como antes.
      let sobre: string | null = null
      let melhor = Infinity
      for (const k of cfgRef.current.itensDaColuna(colDestino)) {
        if (k === st.de) continue
        const el = cartoesRef.current.get(k)
        if (!el) continue
        const r = el.getBoundingClientRect()
        const dist = Math.hypot(
          ev.clientX - (r.left + r.right) / 2,
          ev.clientY - (r.top + r.bottom) / 2,
        )
        if (dist < melhor) {
          melhor = dist
          sobre = k
        }
      }
      st.coluna = colDestino
      st.alvo = sobre
      setColunaAlvo(colDestino)
      setAlvo(sobre)
    }

    const soltar = () => {
      window.removeEventListener('pointermove', mover)
      window.removeEventListener('pointerup', soltar)
      window.removeEventListener('pointercancel', soltar)
      window.removeEventListener('touchmove', travarRolagem)
      soltouEmRef.current = Date.now()
      const st = estadoRef.current
      estadoRef.current = null
      setArrastando(null)
      setAlvo(null)
      setColunaAlvo(null)
      setDesloc({ x: 0, y: 0 })
      if (!st) return
      const mudouDeColuna = st.coluna !== st.origem
      if (mudouDeColuna || (st.alvo && st.alvo !== st.de)) {
        cfgRef.current.aoSoltar(st.de, st.origem, st.coluna, st.alvo)
      }
    }

    window.addEventListener('pointermove', mover)
    window.addEventListener('pointerup', soltar)
    window.addEventListener('pointercancel', soltar)
  }

  function aoPressionar(e: React.PointerEvent<HTMLElement>, coluna: C, chave: string) {
    if (!ativo || estadoRef.current) return
    const alvoDom = e.target as HTMLElement
    // Botões de verdade (concluir, excluir, abrir) não arrastam.
    if (alvoDom.closest('[data-nao-arrasta]')) return

    const cartao = e.currentTarget
    const inicio = { x: e.clientX, y: e.clientY }
    const pointerId = e.pointerId

    if (alvoDom.closest('[data-alca]')) {
      e.preventDefault()
      comecar(cartao, pointerId, inicio, coluna, chave)
      return
    }

    // Segurar para pegar; deslizar antes = rolagem, cancela.
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
      comecar(cartao, pointerId, inicio, coluna, chave)
    }, 300)
  }

  return {
    arrastando,
    alvo,
    colunaAlvo,
    desloc,
    aoPressionar,
    registrarCartao: (chave, el) => {
      if (el) cartoesRef.current.set(chave, el)
      else cartoesRef.current.delete(chave)
    },
    registrarColuna: (coluna, el) => {
      if (el) colunasRef.current.set(coluna, el)
      else colunasRef.current.delete(coluna)
    },
    acabouDeArrastar: () => Date.now() - soltouEmRef.current < 350,
  }
}
