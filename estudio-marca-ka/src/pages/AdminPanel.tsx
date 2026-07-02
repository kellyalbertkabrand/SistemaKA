import { useState } from 'react'
import { TopBar } from '../components/TopBar'
import { clientesComTemplates } from '../templates/registry'
import { BrandStudio } from '../components/BrandStudio'

// Painel da KA: lista todos os clientes e abre o estúdio de cada um.
export function AdminPanel() {
  const clientes = clientesComTemplates()
  const [slug, setSlug] = useState<string | null>(null)

  return (
    <>
      <TopBar />
      <div className="page">
        {slug ? (
          <>
            <p style={{ marginBottom: '1rem' }}>
              <button className="btn btn--ghost" onClick={() => setSlug(null)}>
                ← Todos os clientes
              </button>
            </p>
            <BrandStudio slug={slug} />
          </>
        ) : (
          <>
            <div className="page__head">
              <div className="eyebrow">Painel KA</div>
              <h1>Seus clientes</h1>
              <p>Selecione um cliente para gerar as artes na identidade dele.</p>
            </div>
            {clientes.length === 0 && (
              <div className="card">
                <h3>Nenhum cliente ainda.</h3>
                <p>Os clientes aparecem aqui conforme seus layouts são integrados ao sistema.</p>
              </div>
            )}
            {clientes.map((c) => (
              <button
                key={c.slug}
                className="card"
                style={{ display: 'block', width: '100%', textAlign: 'left', cursor: 'pointer' }}
                onClick={() => setSlug(c.slug)}
              >
                <h3>{c.nome}</h3>
                <p>
                  {c.qtd} template{c.qtd > 1 ? 's' : ''} disponível{c.qtd > 1 ? 'is' : ''}.
                </p>
              </button>
            ))}
          </>
        )}
      </div>
    </>
  )
}
