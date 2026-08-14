import { Link } from 'react-router-dom'

export function NotFound() {
  return (
    <div className="center-screen">
      <div>
        <h1 style={{ fontSize: '2rem', color: 'var(--dourado-c)', fontStyle: 'italic' }}>404</h1>
        <p style={{ marginTop: '0.6rem' }}>Página não encontrada.</p>
        <p style={{ marginTop: '1rem' }}>
          <Link to="/">Voltar ao início</Link>
        </p>
      </div>
    </div>
  )
}
