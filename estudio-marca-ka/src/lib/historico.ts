import { useRef, useState } from 'react'

// ============================================================================
// Histórico de estado com Desfazer/Refazer. Guarda os estados anteriores para
// a pessoa voltar atrás sem perder o trabalho. A digitação é AGRUPADA (não
// empilha uma etapa por letra): mudanças rápidas seguidas viram um passo só.
// ============================================================================

const LIMITE = 60 // quantos passos guardar
const AGRUPA_MS = 600 // digitação em até 0,6s conta como um passo só

export function useHistorico<T>(inicial: T) {
  const [hist, setHist] = useState<{ passado: T[]; atual: T; futuro: T[] }>({
    passado: [],
    atual: inicial,
    futuro: [],
  })
  const ultimoPush = useRef(0)

  // Atualiza o estado registrando o anterior no histórico. `agrupar` (usado na
  // digitação) evita empilhar um passo por tecla.
  function set(prox: T | ((p: T) => T), agrupar = false) {
    setHist((h) => {
      const novo = typeof prox === 'function' ? (prox as (p: T) => T)(h.atual) : prox
      const agora =
        typeof performance !== 'undefined' && performance.now ? performance.now() : Date.now()
      const coalesce = agrupar && agora - ultimoPush.current < AGRUPA_MS
      ultimoPush.current = agora
      if (coalesce) return { ...h, atual: novo }
      return { passado: [...h.passado, h.atual].slice(-LIMITE), atual: novo, futuro: [] }
    })
  }

  // Substitui o estado SEM criar passo de histórico (ex.: recuperar rascunho).
  function repor(prox: T) {
    ultimoPush.current = 0
    setHist({ passado: [], atual: prox, futuro: [] })
  }

  function desfazer() {
    ultimoPush.current = 0
    setHist((h) =>
      h.passado.length
        ? {
            passado: h.passado.slice(0, -1),
            atual: h.passado[h.passado.length - 1],
            futuro: [h.atual, ...h.futuro],
          }
        : h,
    )
  }

  function refazer() {
    ultimoPush.current = 0
    setHist((h) =>
      h.futuro.length
        ? { passado: [...h.passado, h.atual], atual: h.futuro[0], futuro: h.futuro.slice(1) }
        : h,
    )
  }

  return {
    estado: hist.atual,
    set,
    repor,
    desfazer,
    refazer,
    podeDesfazer: hist.passado.length > 0,
    podeRefazer: hist.futuro.length > 0,
  }
}
