import { useMemo, useRef, useState } from 'react'
import type { Template, ValoresPeca, FormatoDef } from '../templates/types'
import { valoresPadrao } from '../templates/types'
import { baixarPng } from '../lib/exportar'
import { metaPadrao } from '../lib/assinatura'
import { CamposEditor } from './CamposEditor'
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
      await baixarPng(
        artRef.current,
        `${template.clienteSlug}-${template.id}-${formato.formato}`,
        2,
        metaPadrao({ cliente: template.clienteNome, titulo: template.nome }),
      )
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

        <CamposEditor campos={template.campos} valores={valores} onSet={set} />

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
