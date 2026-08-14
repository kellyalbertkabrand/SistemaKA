import { createContext, useCallback, useContext, useState, type ReactNode } from 'react'

// ============================================================================
// Sistema de "toast" — avisos flutuantes no canto (sucesso / erro / info) que
// somem sozinhos. Substitui os avisos inline que empurram o layout. Acessível
// (aria-live), fecha no X e no toque.
// ============================================================================

type Tipo = 'ok' | 'erro' | 'info'
interface ToastItem {
  id: number
  tipo: Tipo
  texto: string
}
interface ToastApi {
  mostrar: (texto: string, tipo?: Tipo) => void
}

const ToastCtx = createContext<ToastApi | null>(null)
let seq = 1

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])

  const remover = useCallback((id: number) => {
    setToasts((l) => l.filter((t) => t.id !== id))
  }, [])

  const mostrar = useCallback(
    (texto: string, tipo: Tipo = 'ok') => {
      const id = seq++
      setToasts((l) => [...l, { id, tipo, texto }])
      setTimeout(() => remover(id), 4500)
    },
    [remover],
  )

  return (
    <ToastCtx.Provider value={{ mostrar }}>
      {children}
      <div className="toast-cont" role="status" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className={`toast toast--${t.tipo}`}>
            <span className="toast__ico" aria-hidden>
              {t.tipo === 'erro' ? '⚠️' : t.tipo === 'info' ? 'ℹ️' : '✓'}
            </span>
            <span className="toast__txt">{t.texto}</span>
            <button className="toast__x" aria-label="Fechar aviso" onClick={() => remover(t.id)}>
              ✕
            </button>
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  )
}

/** Hook para disparar toasts. Fora do provider, vira no-op (não quebra). */
export function useToast(): ToastApi {
  return useContext(ToastCtx) ?? { mostrar: () => {} }
}
