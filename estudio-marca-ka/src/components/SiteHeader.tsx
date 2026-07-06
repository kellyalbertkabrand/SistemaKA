import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import './menu.css'

export interface ItemMenu {
  id: string
  rotulo: string
}

interface Props {
  /** Itens de navegação (as seções do sistema). Vazio = só a logo. */
  itens?: ItemMenu[]
  ativo?: string
  onSelecionar?: (id: string) => void
}

// Cabeçalho no estilo do site kellyalbert.com.br: fundo creme, logo KA à
// esquerda, links em maiúsculas (ativo com sublinhado teal) à direita e
// menu hambúrguer no celular.
export function SiteHeader({ itens = [], ativo, onSelecionar }: Props) {
  const [aberto, setAberto] = useState(false)
  const { session, signOut } = useAuth()

  function escolher(id: string) {
    onSelecionar?.(id)
    setAberto(false)
  }

  const temNav = itens.length > 0

  return (
    <header className="ka-top">
      <a className="ka-logo" href="/" aria-label="KA — Inteligência para Marcas">
        <img className="ka-logo__img" src="/logo-ka.png" alt="KA — Inteligência para Marcas" />
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

      <nav className={`ka-nav ${aberto ? 'aberto' : ''}`} aria-label="Menu principal">
        {itens.map((it) => (
          <button
            key={it.id}
            type="button"
            className={`ka-link ${ativo === it.id ? 'ativo' : ''}`}
            onClick={() => escolher(it.id)}
          >
            {it.rotulo}
          </button>
        ))}

        <a
          className="ka-link ka-link--site"
          href="https://kellyalbert.com.br"
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => setAberto(false)}
        >
          Meu site
        </a>

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
