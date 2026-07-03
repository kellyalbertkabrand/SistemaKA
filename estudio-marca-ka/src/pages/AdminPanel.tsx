import { useState } from 'react'
import { TopBar } from '../components/TopBar'
import { clientesComTemplates } from '../templates/registry'
import { marcaVisual } from '../templates/marcas'
import { BrandStudio } from '../components/BrandStudio'
import '../styles/painel.css'

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
              <button className="btn--voltar" onClick={() => setSlug(null)}>
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
            <div className="grade-clientes">
              {clientes.map((c) => {
                const m = marcaVisual(c.slug)
                return (
                  <button key={c.slug} className="cliente-card" onClick={() => setSlug(c.slug)}>
                    <div
                      className="cliente-card__capa"
                      style={{
                        backgroundColor: m.corPrincipal,
                        backgroundImage: m.capa ? `url(${m.capa})` : undefined,
                      }}
                    >
                      {m.logo ? <img src={m.logo} alt="" /> : <span>{c.nome}</span>}
                    </div>
                    <div className="cliente-card__corpo">
                      <h3>{c.nome}</h3>
                      {m.tagline && <div className="cliente-card__tagline">{m.tagline}</div>}
                      {m.paleta.length > 0 && (
                        <div className="cliente-card__paleta">
                          {m.paleta.map((cor) => (
                            <span key={cor} style={{ background: cor }} />
                          ))}
                        </div>
                      )}
                      <div className="cliente-card__rodape">
                        <span className="cliente-card__qtd">
                          {c.qtd} template{c.qtd > 1 ? 's' : ''}
                        </span>
                        <span className="cliente-card__cta">Abrir estúdio →</span>
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          </>
        )}
      </div>
    </>
  )
}
