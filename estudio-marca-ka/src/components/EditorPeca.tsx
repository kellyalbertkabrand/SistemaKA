import { useMemo, useRef, useState } from 'react'
import type { Template, ValoresPeca, FormatoDef } from '../templates/types'
import { valoresPadrao } from '../templates/types'
import { baixarPng } from '../lib/exportar'
import './editor.css'

// Editor de peça: formulário (à esquerda) + pré-visualização ao vivo (à direita),
// dirigido pelos campos declarados no Template. Exporta PNG em alta resolução.
export function EditorPeca({ template }: { template: Template }) {
  const [valores, setValores] = useState<ValoresPeca>(() => valoresPadrao(template.campos))
  const [formato, setFormato] = useState<FormatoDef>(template.formatos[0])
  const [baixando, setBaixando] = useState(false)
  const artRef = useRef<HTMLDivElement>(null)

  const Render = template.render

  // Escala do preview: cabe numa coluna de ~360px de largura.
  const previewW = 360
  const escala = previewW / formato.largura

  function set(id: string, valor: string | number) {
    setValores((v) => ({ ...v, [id]: valor }))
  }

  function handleImagem(id: string, file: File | undefined) {
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => set(id, reader.result as string)
    reader.readAsDataURL(file)
  }

  const podeBaixar = useMemo(
    () =>
      template.campos
        .filter((c) => c.obrigatorio)
        .every((c) => String(valores[c.id] ?? '').trim().length > 0),
    [template.campos, valores],
  )

  async function handleDownload() {
    if (!artRef.current) return
    setBaixando(true)
    try {
      await baixarPng(artRef.current, `${template.clienteSlug}-${template.id}-${formato.formato}`)
    } catch (e) {
      alert('Não consegui gerar o PNG agora. Tente novamente.\n' + (e as Error).message)
    } finally {
      setBaixando(false)
    }
  }

  return (
    <div className="editor">
      {/* ----- Controles ----- */}
      <div className="editor__panel">
        <div className="field">
          <label>Formato</label>
          <div className="seg">
            {template.formatos.map((f) => (
              <button
                key={f.formato}
                type="button"
                className={f.formato === formato.formato ? 'on' : ''}
                onClick={() => setFormato(f)}
              >
                {f.rotulo}
              </button>
            ))}
          </div>
        </div>

        {template.campos.map((c) => (
          <div className="field" key={c.id}>
            <label htmlFor={c.id}>{c.label}</label>

            {c.tipo === 'texto' && (
              <input
                id={c.id}
                type="text"
                value={String(valores[c.id] ?? '')}
                placeholder={c.placeholder}
                maxLength={c.maxLen}
                onChange={(e) => set(c.id, e.target.value)}
              />
            )}

            {c.tipo === 'textarea' && (
              <textarea
                id={c.id}
                rows={5}
                value={String(valores[c.id] ?? '')}
                placeholder={c.placeholder}
                maxLength={c.maxLen}
                onChange={(e) => set(c.id, e.target.value)}
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
                    onClick={() => set(c.id, n)}
                  >
                    ★
                  </button>
                ))}
              </div>
            )}

            {c.tipo === 'select' && (
              <select
                id={c.id}
                value={String(valores[c.id] ?? '')}
                onChange={(e) => set(c.id, e.target.value)}
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
                  id={c.id}
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleImagem(c.id, e.target.files?.[0])}
                />
                {valores[c.id] && (
                  <img className="img-preview" src={String(valores[c.id])} alt="pré-visualização" />
                )}
              </div>
            )}

            {c.tipo === 'cor' && (
              <div className="cor-input">
                <input
                  id={c.id}
                  type="color"
                  value={String(valores[c.id] || '#000000')}
                  onChange={(e) => set(c.id, e.target.value)}
                />
                {c.opcoes?.map((o) => (
                  <button
                    key={o.valor}
                    type="button"
                    className="swatch"
                    style={{ background: o.valor }}
                    title={o.rotulo ?? o.valor}
                    onClick={() => set(c.id, o.valor)}
                  />
                ))}
              </div>
            )}

            {c.ajuda && <p className="editor__hint">{c.ajuda}</p>}
          </div>
        ))}

        <button className="btn" disabled={!podeBaixar || baixando} onClick={handleDownload}>
          {baixando ? 'Gerando PNG…' : 'Baixar PNG'}
        </button>
        {!podeBaixar && <p className="editor__hint">Preencha os campos obrigatórios para baixar.</p>}
      </div>

      {/* ----- Palco / preview ----- */}
      <div className="editor__stage">
        <div
          className="editor__scaler"
          style={{ width: previewW, height: formato.altura * escala }}
        >
          <div
            style={{
              transform: `scale(${escala})`,
              transformOrigin: 'top left',
              width: formato.largura,
              height: formato.altura,
            }}
          >
            {/* Nó exportado em tamanho real */}
            <div ref={artRef}>
              <Render valores={valores} formato={formato} />
            </div>
          </div>
        </div>
        <span className="editor__label">
          {formato.rotulo} · {formato.largura}×{formato.altura}
        </span>
      </div>
    </div>
  )
}
