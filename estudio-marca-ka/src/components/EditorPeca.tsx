import { useEffect, useMemo, useRef, useState } from 'react'
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
  // Qual ação está rodando (null = nenhuma) e o texto de progresso do vídeo.
  const [acao, setAcao] = useState<'png' | 'moldura' | 'video' | null>(null)
  const [statusVideo, setStatusVideo] = useState<string | null>(null)
  // O que acabou de baixar (para mostrar as instruções pós-download).
  const [feito, setFeito] = useState<'imagem' | 'video' | null>(null)
  const ocupado = acao !== null
  const artRef = useRef<HTMLDivElement>(null)

  const Render = template.render

  // O card tem vídeo? (alguma mídia carregada é um arquivo de vídeo)
  const temVideo = useMemo(
    () =>
      Object.entries(valores).some(([k, v]) => k.endsWith('_kind') && v === 'video') ||
      Object.values(valores).some((v) => typeof v === 'string' && v.startsWith('data:video')),
    [valores],
  )

  const nomeBase = () => `${template.clienteSlug}-${template.id}-${formato.formato}`
  const meta = () => metaPadrao({ cliente: template.clienteNome, titulo: template.nome })

  // No desktop há duas colunas (controles + card fixo ao lado): o card pode
  // ficar no tamanho cheio, inclusive o Story alto. No celular é empilhado, com
  // o card fixo em cima — então limitamos a altura para sobrar espaço aos
  // controles logo abaixo.
  const [desktop, setDesktop] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(min-width: 900px)').matches,
  )
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 900px)')
    const ao = () => setDesktop(mq.matches)
    mq.addEventListener('change', ao)
    return () => mq.removeEventListener('change', ao)
  }, [])
  const MAX_W = desktop ? 360 : 300
  const MAX_H = desktop ? 640 : 260
  const escala = Math.min(MAX_W / formato.largura, MAX_H / formato.altura)
  const previewW = Math.round(formato.largura * escala)
  const previewH = Math.round(formato.altura * escala)

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

  async function rodar(
    qual: 'png' | 'moldura' | 'video',
    fn: () => Promise<void>,
    tipoFeito: 'imagem' | 'video',
  ) {
    if (!artRef.current) return
    setFeito(null)
    setAcao(qual)
    try {
      await fn()
      setFeito(tipoFeito)
    } catch (e) {
      alert((e as Error).message)
    } finally {
      setAcao(null)
      setStatusVideo(null)
    }
  }

  const handleDownload = () =>
    rodar('png', () => baixarPng(artRef.current!, nomeBase(), 2, meta()), 'imagem')
  const handleMoldura = () =>
    rodar('moldura', () => baixarMolduraPng(artRef.current!, `${nomeBase()}-moldura`, 2, meta()), 'imagem')
  const handleVideo = () =>
    rodar(
      'video',
      () => baixarVideoDoCard(artRef.current!, nomeBase(), (f) => setStatusVideo(f)),
      'video',
    )

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

        <div className="export-botoes">
          {temVideo && (
            <p className="editor__hint">
              <strong>Este card tem vídeo.</strong> Escolha como baixar:
            </p>
          )}

          <button className="btn" disabled={!podeBaixar || ocupado} onClick={handleDownload}>
            {acao === 'png' && <span className="spin-mini" />}
            {acao === 'png' ? 'Baixando…' : temVideo ? 'Baixar imagem (PNG)' : 'Baixar PNG'}
          </button>

          {temVideo && (
            <>
              <button className="btn" disabled={!podeBaixar || ocupado} onClick={handleMoldura}>
                {acao === 'moldura' && <span className="spin-mini" />}
                {acao === 'moldura' ? 'Gerando moldura…' : 'Baixar moldura (PNG) — p/ CapCut'}
              </button>

              {suportaGravacaoVideo() ? (
                <button className="btn" disabled={!podeBaixar || ocupado} onClick={handleVideo}>
                  {acao === 'video' && <span className="spin-mini" />}
                  {acao === 'video' ? statusVideo ?? 'Preparando…' : 'Baixar vídeo pronto (com áudio)'}
                </button>
              ) : (
                <p className="editor__hint">
                  Seu navegador não gera o vídeo pronto — use a <strong>moldura PNG</strong> e junte
                  com o vídeo no CapCut/Instagram.
                </p>
              )}
            </>
          )}

          {acao === 'video' && (
            <p className="editor__hint">
              Gravando em tempo real — leva o tempo do vídeo. Deixe esta aba aberta.
            </p>
          )}

          {feito && (
            <div className="export-feito">
              <strong>✓ Pronto!</strong>
              <div>
                <strong>No celular:</strong> na tela que abriu, toque em{' '}
                <strong>{feito === 'video' ? '“Salvar vídeo”' : '“Salvar imagem”'}</strong> (ou
                “Salvar em Fotos”/“Salvar em Arquivos”). Depois é só postar no Instagram.
              </div>
              <div style={{ marginTop: '0.35rem' }}>
                <strong>No computador:</strong> o arquivo está na pasta <strong>Downloads</strong>.
              </div>
            </div>
          )}
        </div>

        {!podeBaixar && <p className="editor__hint">Preencha os campos obrigatórios para baixar.</p>}
      </div>

      {/* ----- Palco / preview ----- */}
      <div className="editor__stage">
        <div
          className="editor__scaler"
          style={{ width: previewW, height: previewH }}
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
