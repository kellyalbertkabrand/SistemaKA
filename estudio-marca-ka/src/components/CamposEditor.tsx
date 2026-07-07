import type { Campo, ValoresPeca } from '../templates/types'
import { FORMAS } from '../templates/formas'

interface Props {
  campos: Campo[]
  valores: ValoresPeca
  onSet: (id: string, valor: string | number) => void
  /** Prefixo para os `id` dos inputs (evita colisão quando há vários no mesmo DOM). */
  idPrefix?: string
}

// Renderiza os controles de formulário a partir dos campos declarados no template.
// Reutilizado pelo editor de peça única e pelo construtor de carrossel.
export function CamposEditor({ campos, valores, onSet, idPrefix = '' }: Props) {
  function handleImagem(id: string, file: File | undefined) {
    if (!file) return
    // Imagem OU vídeo viram data URL em `valores[id]`; o card decide como
    // renderizar (o ka-midia mostra <video> quando é `data:video`).
    const reader = new FileReader()
    reader.onload = () => onSet(id, reader.result as string)
    reader.readAsDataURL(file)
  }

  return (
    <>
      {campos.map((c) => {
        const inputId = `${idPrefix}${c.id}`
        return (
          <div className="field" key={c.id}>
            <label htmlFor={inputId}>{c.label}</label>

            {c.tipo === 'texto' && (
              <input
                id={inputId}
                type="text"
                value={String(valores[c.id] ?? '')}
                placeholder={c.placeholder}
                maxLength={c.maxLen}
                onChange={(e) => onSet(c.id, e.target.value)}
              />
            )}

            {c.tipo === 'textarea' && (
              <textarea
                id={inputId}
                rows={5}
                value={String(valores[c.id] ?? '')}
                placeholder={c.placeholder}
                maxLength={c.maxLen}
                onChange={(e) => onSet(c.id, e.target.value)}
              />
            )}

            {c.tipo === 'estrelas' && (
              <div className="stars-input" role="radiogroup" aria-label={c.label}>
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    type="button"
                    className={n <= Number(valores[c.id] ?? 0) ? 'on' : ''}
                    aria-label={`${n} estrela${n > 1 ? 's' : ''}`}
                    onClick={() => onSet(c.id, n)}
                  >
                    ★
                  </button>
                ))}
              </div>
            )}

            {c.tipo === 'select' && (
              <select
                id={inputId}
                value={String(valores[c.id] ?? '')}
                onChange={(e) => onSet(c.id, e.target.value)}
              >
                {c.opcoes.map((o) => (
                  <option key={o.valor} value={o.valor}>
                    {o.rotulo}
                  </option>
                ))}
              </select>
            )}

            {c.tipo === 'imagem' && (
              <div className="img-input">
                <input
                  id={inputId}
                  type="file"
                  accept={c.aceitaVideo ? 'image/*,video/*' : 'image/*'}
                  onChange={(e) => handleImagem(c.id, e.target.files?.[0])}
                />
                {c.redimensionavel2d ? (
                  <div className="ajuste-foto tamanho-foto">
                    <label>Largura da área</label>
                    <input
                      type="range"
                      min={40}
                      max={140}
                      value={Number(valores[`${c.id}_larg`] ?? 100)}
                      onChange={(e) => onSet(`${c.id}_larg`, Number(e.target.value))}
                    />
                    <label>Altura da área</label>
                    <input
                      type="range"
                      min={40}
                      max={140}
                      value={Number(valores[`${c.id}_alt`] ?? 100)}
                      onChange={(e) => onSet(`${c.id}_alt`, Number(e.target.value))}
                    />
                  </div>
                ) : (
                  <div className="ajuste-foto tamanho-foto">
                    <label>Tamanho da foto</label>
                    <input
                      type="range"
                      min={60}
                      max={120}
                      value={Number(valores[`${c.id}_area`] ?? 92)}
                      onChange={(e) => onSet(`${c.id}_area`, Number(e.target.value))}
                    />
                  </div>
                )}
                {valores[c.id] && (
                  <>
                    {String(valores[c.id]).startsWith('data:video') ? (
                      <video className="img-preview" src={String(valores[c.id])} autoPlay muted loop playsInline />
                    ) : (
                      <img className="img-preview" src={String(valores[c.id])} alt="pré-visualização" />
                    )}
                    <div className="ajuste-foto">
                      <label>Posição horizontal</label>
                      <input
                        type="range"
                        min={0}
                        max={100}
                        value={Number(valores[`${c.id}_x`] ?? 50)}
                        onChange={(e) => onSet(`${c.id}_x`, Number(e.target.value))}
                      />
                      <label>Posição vertical</label>
                      <input
                        type="range"
                        min={0}
                        max={100}
                        value={Number(valores[`${c.id}_y`] ?? 50)}
                        onChange={(e) => onSet(`${c.id}_y`, Number(e.target.value))}
                      />
                      <label>Zoom</label>
                      <input
                        type="range"
                        min={100}
                        max={250}
                        value={Number(valores[`${c.id}_zoom`] ?? 100)}
                        onChange={(e) => onSet(`${c.id}_zoom`, Number(e.target.value))}
                      />
                    </div>
                  </>
                )}
              </div>
            )}

            {c.tipo === 'cor' && (
              <div className="cor-input">
                <input
                  id={inputId}
                  type="color"
                  value={String(valores[c.id] || '#000000')}
                  onChange={(e) => onSet(c.id, e.target.value)}
                />
                {c.opcoes?.map((o) => (
                  <button
                    key={o.valor}
                    type="button"
                    className={`swatch ${valores[c.id] === o.valor ? 'on' : ''}`}
                    style={
                      o.valor.startsWith('url(')
                        ? { background: `${o.valor} center / cover no-repeat` }
                        : { background: o.valor }
                    }
                    title={o.rotulo ?? o.valor}
                    onClick={() => onSet(c.id, o.valor)}
                  />
                ))}
              </div>
            )}

            {c.tipo === 'forma' && (
              <div className="forma-input">
                {FORMAS.map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    className={`forma-op ${valores[c.id] === f.id ? 'on' : ''}`}
                    title={f.label}
                    onClick={() => onSet(c.id, f.id)}
                  >
                    <svg viewBox="0 0 1 1" width="46" height="46" aria-hidden>
                      <path d={f.d} fill="currentColor" />
                    </svg>
                  </button>
                ))}
              </div>
            )}

            {c.ajuda && <p className="editor__hint">{c.ajuda}</p>}
          </div>
        )
      })}
    </>
  )
}
