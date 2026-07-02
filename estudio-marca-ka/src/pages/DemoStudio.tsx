import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { templatesDoCliente, clientesComTemplates } from '../templates/registry'
import type { Template } from '../templates/types'
import { EditorPeca } from '../components/EditorPeca'

// Demonstração pública do Estúdio (sem login), para validar os layouts reais.
// Ex.: /ver/shapes . Quando a autenticação estiver ligada, este mesmo fluxo
// roda dentro de /estudio já filtrado pela marca do cliente logado.
export function DemoStudio() {
  const { slug = 'shapes' } = useParams()
  const templates = templatesDoCliente(slug)
  const [sel, setSel] = useState<Template | null>(templates.length === 1 ? templates[0] : null)

  return (
    <>
      <header className="app-top">
        <div className="app-top__brand">
          Estúdio de <span>Marca</span>
        </div>
        <div className="app-top__tag">
          {templates[0]?.clienteNome ?? slug}
        </div>
      </header>

      <div className="page">
        {templates.length === 0 ? (
          <div className="card">
            <h3>Sem templates para “{slug}”.</h3>
            <p>Clientes disponíveis nesta demonstração:</p>
            <ul style={{ marginTop: '0.6rem', paddingLeft: '1.1rem' }}>
              {clientesComTemplates().map((c) => (
                <li key={c.slug} style={{ marginBottom: '0.3rem' }}>
                  <Link to={`/ver/${c.slug}`}>
                    {c.nome} ({c.qtd} template{c.qtd > 1 ? 's' : ''})
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ) : sel ? (
          <>
            <div className="page__head">
              <div className="eyebrow">{sel.clienteNome}</div>
              <h1>{sel.nome}</h1>
              <p>{sel.descricao}</p>
              {templatesDoCliente(slug).length > 1 && (
                <p style={{ marginTop: '0.6rem' }}>
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
              <div className="eyebrow">{templates[0].clienteNome}</div>
              <h1>Escolha um template</h1>
              <p>Selecione o modelo que você quer gerar.</p>
            </div>
            {templates.map((t) => (
              <button
                key={t.id}
                className="card"
                style={{ display: 'block', width: '100%', textAlign: 'left', cursor: 'pointer' }}
                onClick={() => setSel(t)}
              >
                <h3>{t.nome}</h3>
                <p>{t.descricao}</p>
              </button>
            ))}
          </>
        )}
      </div>
    </>
  )
}
