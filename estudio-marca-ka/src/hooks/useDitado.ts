import { useEffect, useRef, useState } from 'react'

// ============================================================================
// useDitado — ditado por voz usando a Web Speech API do navegador (grátis, sem
// chave). Funciona no Chrome e no Safari do iPhone (webkitSpeechRecognition).
// Cada trecho reconhecido em pt-BR é entregue pelo callback `aoTexto`.
// ============================================================================

// A Web Speech API não faz parte dos tipos padrão do TS — tipamos o mínimo.
interface FalaEvento {
  resultIndex: number
  results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }>
}
interface Reconhecimento {
  lang: string
  continuous: boolean
  interimResults: boolean
  start: () => void
  stop: () => void
  abort: () => void
  onresult: ((e: FalaEvento) => void) | null
  onend: (() => void) | null
  onerror: ((e: unknown) => void) | null
}

function criarReconhecimento(): Reconhecimento | null {
  const w = window as unknown as {
    SpeechRecognition?: new () => Reconhecimento
    webkitSpeechRecognition?: new () => Reconhecimento
  }
  const Cls = w.SpeechRecognition ?? w.webkitSpeechRecognition
  return Cls ? new Cls() : null
}

export function ditadoSuportado(): boolean {
  const w = window as unknown as Record<string, unknown>
  return !!(w.SpeechRecognition || w.webkitSpeechRecognition)
}

/**
 * Devolve `{ suportado, gravando, alternar }`. Ao ouvir uma frase, chama
 * `aoTexto(frase)` — quem usa decide se soma no campo ou vira uma nova linha.
 */
export function useDitado(aoTexto: (texto: string) => void) {
  const [gravando, setGravando] = useState(false)
  const suportado = ditadoSuportado()
  const recRef = useRef<Reconhecimento | null>(null)
  const cbRef = useRef(aoTexto)
  cbRef.current = aoTexto

  function parar() {
    recRef.current?.stop()
  }

  function iniciar() {
    const rec = criarReconhecimento()
    if (!rec) return
    rec.lang = 'pt-BR'
    rec.continuous = true
    rec.interimResults = false
    rec.onresult = (e) => {
      let txt = ''
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i]
        if (r.isFinal) txt += r[0].transcript
      }
      const limpo = txt.trim()
      if (limpo) cbRef.current(limpo)
    }
    rec.onend = () => setGravando(false)
    rec.onerror = () => setGravando(false)
    recRef.current = rec
    try {
      rec.start()
      setGravando(true)
    } catch {
      setGravando(false)
    }
  }

  function alternar() {
    if (gravando) parar()
    else iniciar()
  }

  // Para o reconhecimento se o componente sair da tela.
  useEffect(() => () => recRef.current?.abort(), [])

  return { suportado, gravando, alternar }
}
