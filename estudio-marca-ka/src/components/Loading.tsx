export function Loading({ texto = 'Carregando…' }: { texto?: string }) {
  return (
    <div className="center-screen">
      <div>
        <div className="spin" />
        <p style={{ fontSize: '0.82rem' }}>{texto}</p>
      </div>
    </div>
  )
}
