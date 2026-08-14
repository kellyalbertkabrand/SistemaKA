import type { Socio } from '../lib/database.types'

// ---------------------------------------------------------------------------
// Editor de SÓCIOS (opcional): lista com nome/CPF/RG/e-mail e "assina o
// contrato". Usado na ficha do cliente (admin) e no cadastro público /cadastro.
// Nada é obrigatório — a pessoa adiciona só se a empresa tiver sócios.
// ---------------------------------------------------------------------------
export function SociosEditor({ lista, onChange }: { lista: Socio[]; onChange: (l: Socio[]) => void }) {
  function atualizar(i: number, patch: Partial<Socio>) {
    onChange(lista.map((s, x) => (x === i ? { ...s, ...patch } : s)))
  }
  function adicionar() {
    onChange([...lista, { nome: '', cpf: null, rg: null, email: null, assina: true }])
  }
  function remover(i: number) {
    onChange(lista.filter((_, x) => x !== i))
  }
  return (
    <div>
      {lista.length === 0 && (
        <p style={{ fontSize: '0.82rem', color: '#837b6c', margin: '0 0 0.6rem' }}>
          Nenhum sócio adicionado (deixe assim se a empresa tem só o responsável).
        </p>
      )}
      {lista.map((s, i) => (
        <div
          key={i}
          style={{ border: '1px solid rgba(21,37,53,0.14)', borderRadius: 10, padding: '0.8rem', marginBottom: '0.7rem' }}
        >
          <div className="form-grade">
            <div className="field campo-toda">
              <label>Nome completo do sócio</label>
              <input value={s.nome} onChange={(e) => atualizar(i, { nome: e.target.value })} />
            </div>
            <div className="field">
              <label>CPF</label>
              <input value={s.cpf ?? ''} onChange={(e) => atualizar(i, { cpf: e.target.value || null })} />
            </div>
            <div className="field">
              <label>RG</label>
              <input value={s.rg ?? ''} onChange={(e) => atualizar(i, { rg: e.target.value || null })} />
            </div>
            <div className="field campo-toda">
              <label>E-mail</label>
              <input type="email" value={s.email ?? ''} onChange={(e) => atualizar(i, { email: e.target.value || null })} />
            </div>
            <div className="field campo-toda">
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={s.assina ?? false}
                  onChange={(e) => atualizar(i, { assina: e.target.checked })}
                  style={{ width: 'auto' }}
                />
                Assina o contrato
              </label>
            </div>
          </div>
          <button
            type="button"
            onClick={() => remover(i)}
            style={{ background: 'none', border: 'none', color: '#b4462f', fontSize: '0.8rem', cursor: 'pointer', padding: '0.3rem 0', marginTop: '0.3rem' }}
          >
            Remover sócio
          </button>
        </div>
      ))}
      <button type="button" className="btn btn--ghost" onClick={adicionar}>
        + Adicionar sócio
      </button>
    </div>
  )
}
