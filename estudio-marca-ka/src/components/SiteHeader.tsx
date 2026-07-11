import { useEffect, useRef, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import './menu.css'

export interface ItemMenu {
  id: string
  rotulo: string
  /** Subitens: no desktop viram MENU SUSPENSO; no celular, lista normal. */
  filhos?: ItemMenu[]
}

interface Props {
  /** Itens de navegação (as seções do sistema). Vazio = só a logo. */
  itens?: ItemMenu[]
  ativo?: string
  onSelecionar?: (id: string) => void
}

// Cabeçalho no estilo do site kellyalbert.com.br: fundo creme, logo KA à
// esquerda, links em maiúsculas (ativo com sublinhado teal) à direita e
// menu hambúrguer no celular. Itens com `filhos` viram menu suspenso.
export function SiteHeader({ itens = [], ativo, onSelecionar }: Props) {
  const [aberto, setAberto] = useState(false)
  const [dropAberto, setDropAberto] = useState<string | null>(null)
  const { session, signOut } = useAuth()
  const navRef = useRef<HTMLElement>(null)

  // Fecha o menu suspenso ao clicar fora dele.
  useEffect(() => {
    if (!dropAberto) return
    function fechar(e: MouseEvent) {
      if (navRef.current && !navRef.current.contains(e.target as Node)) setDropAberto(null)
    }
    document.addEventListener('mousedown', fechar)
    return () => document.removeEventListener('mousedown', fechar)
  }, [dropAberto])

  function escolher(id: string) {
    onSelecionar?.(id)
    setAberto(false)
    setDropAberto(null)
  }

  const temNav = itens.length > 0

  return (
    <header className="ka-top">
      <a className="ka-logo" href="/" aria-label="KA, Inteligência para Marcas">
        <img className="ka-logo__img" src="/logo-ka.png" alt="KA, Inteligência para Marcas" />
      </a>

      {temNav && (
        <button
          type="button"
          className={`ka-burger ${aberto ? 'on' : ''}`}
          aria-label="Abrir menu"
          aria-expanded={aberto}
          onClick={() => setAberto((v) => !v)}
        >
          <span />
          <span />
          <span />
        </button>
      )}

      <nav ref={navRef} className={`ka-nav ${aberto ? 'aberto' : ''}`} aria-label="Menu principal">
        {itens.map((it) =>
          it.filhos?.length ? (
            <div key={it.id} className={`ka-drop ${dropAberto === it.id ? 'aberto' : ''}`}>
              <button
                type="button"
                className={`ka-link ka-drop__trigger ${it.filhos.some((f) => f.id === ativo) ? 'ativo' : ''}`}
                aria-haspopup="true"
                aria-expanded={dropAberto === it.id}
                onClick={() => setDropAberto((v) => (v === it.id ? null : it.id))}
              >
                {it.rotulo} <span className="ka-drop__seta">▾</span>
              </button>
              <div className="ka-drop__menu" role="menu">
                <div className="ka-drop__titulo">{it.rotulo}</div>
                {it.filhos.map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    role="menuitem"
                    className={`ka-drop__item ${ativo === f.id ? 'ativo' : ''}`}
                    onClick={() => escolher(f.id)}
                  >
                    {f.rotulo}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <button
              key={it.id}
              type="button"
              className={`ka-link ${ativo === it.id ? 'ativo' : ''}`}
              onClick={() => escolher(it.id)}
            >
              {it.rotulo}
            </button>
          ),
        )}

        {session && (
          <button
            type="button"
            className="ka-link ka-link--sair"
            onClick={() => {
              void signOut()
              setAberto(false)
            }}
          >
            Sair
          </button>
        )}
      </nav>
    </header>
  )
}
