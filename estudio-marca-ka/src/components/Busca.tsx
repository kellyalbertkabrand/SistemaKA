// Campo de busca padrão das listas de gestão (texto + limpar). Filtro é sempre
// no cliente (as listas cabem em memória).
export function Busca({
  valor,
  aoMudar,
  placeholder,
}: {
  valor: string
  aoMudar: (v: string) => void
  placeholder?: string
}) {
  return (
    <div className="busca">
      <span className="busca__ico" aria-hidden>
        🔍
      </span>
      <input
        type="search"
        className="busca__input"
        value={valor}
        onChange={(e) => aoMudar(e.target.value)}
        placeholder={placeholder ?? 'Buscar…'}
        aria-label={placeholder ?? 'Buscar'}
      />
      {valor && (
        <button className="busca__x" aria-label="Limpar busca" onClick={() => aoMudar('')}>
          ✕
        </button>
      )}
    </div>
  )
}

// Normaliza para busca sem acento e sem caixa.
export function normalizar(s: string | null | undefined): string {
  return (s ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}
