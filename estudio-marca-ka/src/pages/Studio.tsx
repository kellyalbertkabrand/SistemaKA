import { useState } from 'react'
import { TopBar } from '../components/TopBar'
import { useAuth } from '../context/AuthContext'
import { TEMPLATES } from '../templates/registry'
import type { Template } from '../templates/types'
import { EditorPeca } from '../components/EditorPeca'

// Estúdio autenticado: lista os templates disponíveis e abre o editor real
// (formato + campos + preview + export PNG). Se houver um único template,
// abre direto nele.
export function Studio() {
  const { isAdmin } = useAuth()
  // TODO (multi-cliente): quando o cliente logado tiver marca vinculada,
  // filtrar por templatesDoCliente(slug). Hoje mostramos o catálogo completo.
  const disponiveis = TEMPLATES
  const [sel, setSel] = useState<Template | null>(
    disponiveis.length === 1 ? disponiveis[0] : null,
  )

  return (
    <>
      <TopBar />
      <div className="page">
        {sel ? (
          <>
            <div className="page__head">
              <div className="eyebrow">{sel.clienteNome}</div>
              <h1>{sel.nome}</h1>
              <p>{sel.descricao}</p>
              {disponiveis.length > 1 && (
                <p style={{ marginTop: '0.7rem' }}>
                  <button className="btn btn--ghost" onClick={() => setSel(null)}>
                    ← Trocar template
                  </button>
                </p>
              )}
            </div>
            <EditorPeca template={sel} />
          </>
        ) : (
          <>
            <div className="page__head">
              <div className="eyebrow">{isAdmin ? 'Painel KA' : 'Seu Estúdio'}</div>
              <h1>Escolha um template</h1>
              <p>Selecione o modelo que você quer gerar.</p>
            </div>
            {disponiveis.map((t) => (
              <button
                key={t.id}
                className="card"
                style={{ display: 'block', width: '100%', textAlign: 'left', cursor: 'pointer' }}
                onClick={() => setSel(t)}
              >
                <h3>
                  {t.clienteNome} · {t.nome}
                </h3>
                <p>{t.descricao}</p>
              </button>
            ))}
          </>
        )}
      </div>
    </>
  )
}
