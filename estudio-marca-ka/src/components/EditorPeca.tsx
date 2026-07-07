import { useMemo, useRef, useState } from 'react'
import type { Template, ValoresPeca, FormatoDef } from '../templates/types'
import { valoresPadrao } from '../templates/types'
import { baixarPng } from '../lib/exportar'
import { baixarMolduraPng, baixarVideoDoCard, suportaGravacaoVideo } from '../lib/exportarVideo'
import { metaPadrao } from '../lib/assinatura'
import { CamposEditor } from './CamposEditor'
import './editor.css'

// Editor de peça: formulário (à esquerda) + pré-visualização ao vivo (à direita),
// dirigido pelos campos declarados no Template. Exporta PNG em alta resolução.
export function EditorPeca({ template }: { template: Template }) {
  const [valores, setValores] = useState<ValoresPeca>(() => valoresPadrao(template.campos))
  const [formato, setFormato] = useState<FormatoDef>(template.formatos[0])
  const [baixando, setBaixando] = useState(false)
  const [statusVideo, setStatusVideo] = useState<string | null>(null)
  const artRef = useRef<HTMLDivElement>(null)

  const Render = template.render

  // O card tem vídeo? (alguma mídia carregada é um arquivo de vídeo)
  const temVideo = useMemo(
    () => Object.values(valores).some((v) => typeof v === 'string' && v.startsWith('data:video')),
    [valores],
  )

  const nomeBase = () => `${template.clienteSlug}-${template.id}-${formato.formato}`
  const meta = () => metaPadrao({ cliente: template.clienteNome, titulo: template.nome })

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
      await baixarPng(artRef.current, nomeBase(), 2, meta())
    } catch (e) {
      alert('Não consegui gerar o PNG agora. Tente novamente.\n' + (e as Error).message)
    } finally {
      setBaixando(false)
    }
  }

  async function handleMoldura() {
    if (!artRef.current) return
    setBaixando(true)
    try {
      await baixarMolduraPng(artRef.current, `${nomeBase()}-moldura`, 2, meta())
    } catch (e) {
      alert('Não consegui gerar a moldura agora.\n' + (e as Error).message)
    } finally {
      setBaixando(false)
    }
  }

  async function handleVideo() {
    if (!artRef.current) return
    setBaixando(true)
    setStatusVideo('Preparando…')
    try {
      await baixarVideoDoCard(artRef.current, nomeBase(), (f) => setStatusVideo(f))
    } catch (e) {
      alert((e as Error).message)
    } finally {
      setBaixando(false)
      setStatusVideo(null)
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
          {baixando && !statusVideo ? 'Gerando…' : temVideo ? 'Baixar imagem (PNG)' : 'Baixar PNG'}
        </button>

        {temVideo && (
          <div className="export-video">
            <p className="editor__hint" style={{ marginTop: '0.6rem' }}>
              <strong>Este card tem vídeo.</strong> Escolha como baixar:
            </p>
            <button className="btn btn--ghost" disabled={!podeBaixar || baixando} onClick={handleMoldura}>
              Baixar moldura (PNG) — p/ montar no CapCut
            </button>
            {suportaGravacaoVideo() ? (
              <button className="btn" disabled={!podeBaixar || baixando} onClick={handleVideo}>
                {statusVideo ?? 'Baixar vídeo pronto (com áudio)'}
              </button>
            ) : (
              <p className="editor__hint">
                Seu navegador (comum no iPhone) não gera o vídeo pronto — use a <strong>moldura PNG</strong>{' '}
                e junte com o vídeo no CapCut/Instagram. No computador (Chrome), o vídeo pronto funciona.
              </p>
            )}
            {statusVideo && (
              <p className="editor__hint">
                Gravando o vídeo… deixe esta aba aberta até o download começar (leva o tempo do vídeo).
              </p>
            )}
          </div>
        )}
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
