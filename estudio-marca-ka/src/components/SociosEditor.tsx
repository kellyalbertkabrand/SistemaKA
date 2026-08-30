import type { Socio } from '../lib/database.types'
import { useListaArrastavel } from '../hooks/useListaArrastavel'

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
  // Muda a ordem dos sócios arrastando (é a ordem que sai no contrato).
  function reordenar(de: number, para: number) {
    const l = [...lista]
    const [s] = l.splice(de, 1)
    l.splice(para, 0, s)
    onChange(l)
  }
  const arr = useListaArrastavel(lista.length, reordenar)

  return (
    <div {...arr.lista()}>
      {lista.length === 0 && (
        <p style={{ fontSize: '0.82rem', color: '#837b6c', margin: '0 0 0.6rem' }}>
          Nenhum sócio adicionado (deixe assim se a empresa tem só o responsável).
        </p>
      )}
      {lista.map((s, i) => {
        const it = arr.item(i)
        return (
        <div
          key={i}
          ref={it.ref}
          onPointerDown={it.onPointerDown}
          className={it.classe}
          style={{
            border: '1px solid rgba(21,37,53,0.14)',
            borderRadius: 10,
            padding: '0.8rem',
            marginBottom: '0.7rem',
            ...it.style,
          }}
        >
          {lista.length > 1 && (
            <div className="arr-cab">
              <span {...arr.alca()}>⠿</span>
              <span className="arr-cab__n">Sócio {i + 1}</span>
            </div>
          )}
          <div className="form-grade" data-nao-arrasta>
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
            data-nao-arrasta
            onClick={() => remover(i)}
            style={{ background: 'none', border: 'none', color: '#b4462f', fontSize: '0.8rem', cursor: 'pointer', padding: '0.3rem 0', marginTop: '0.3rem' }}
          >
            Remover sócio
          </button>
        </div>
        )
      })}
      {lista.length > 1 && (
        <p className="dica-arrastar">Segure um sócio e arraste para mudar a ordem.</p>
      )}
      <button type="button" className="btn btn--ghost" onClick={adicionar}>
        + Adicionar sócio
      </button>
    </div>
  )
}
