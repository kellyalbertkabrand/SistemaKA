import { useParams, Link } from 'react-router-dom'
import { templatesDoCliente, clientesComTemplates } from '../templates/registry'
import { BrandStudio } from '../components/BrandStudio'

// Estúdio público por marca (sem login) — ex.: /shapes.
// Reaproveita o BrandStudio (mesma experiência do painel logado).
export function DemoStudio() {
  const { slug = 'shapes' } = useParams()
  const templates = templatesDoCliente(slug)

  return (
    <>
      <header className="app-top">
        <div className="app-top__brand">
          Estúdio de <span>Marca</span>
        </div>
        <div className="app-top__tag">{templates[0]?.clienteNome ?? slug}</div>
      </header>

      <div className="page">
        {templates.length === 0 ? (
          <div className="card">
            <h3>Sem templates para “{slug}”.</h3>
            <p>Marcas disponíveis:</p>
            <ul style={{ marginTop: '0.6rem', paddingLeft: '1.1rem' }}>
              {clientesComTemplates().map((c) => (
                <li key={c.slug} style={{ marginBottom: '0.3rem' }}>
                  <Link to={`/${c.slug}`}>{c.nome}</Link>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <BrandStudio slug={slug} />
        )}
      </div>
    </>
  )
}
