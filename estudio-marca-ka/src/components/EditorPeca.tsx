import { useEffect, useMemo, useRef, useState } from 'react'
import type { Template, ValoresPeca, FormatoDef } from '../templates/types'
import { valoresPadrao } from '../templates/types'
import { baixarPng } from '../lib/exportar'
import { baixarMolduraPng, baixarVideoDoCard, suportaGravacaoVideo, CANCELADO } from '../lib/exportarVideo'
import { metaPadrao } from '../lib/assinatura'
import { CamposEditor } from './CamposEditor'
import { salvarRascunho, lerRascunho, limparRascunho } from '../lib/persistencia'
import './editor.css'

// Editor de peça: formulário (à esquerda) + pré-visualização ao vivo (à direita),
// dirigido pelos campos declarados no Template. Exporta PNG em alta resolução.
// Remove entradas de vídeo mortas (blob: não sobrevive ao recarregar).
function sanearValores(v: ValoresPeca): ValoresPeca {
  const out: ValoresPeca = {}
  for (const [k, val] of Object.entries(v)) {
    if (typeof val === 'string' && val.startsWith('blob:')) continue
    out[k] = val
  }
  for (const k of Object.keys(out)) {
    if (k.endsWith('_kind') && out[k] === 'video') {
      const base = k.slice(0, -'_kind'.length)
      if (!out[base]) delete out[k]
    }
  }
  return out
}

export function EditorPeca({ template }: { template: Template }) {
  // Rascunho por template: se travar/recarregar, a peça volta preenchida.
  const CHAVE = `rascunho-peca-${template.id}`
  const inicial = useRef<{ valores: ValoresPeca; recuperado: boolean } | null>(null)
  if (!inicial.current) {
    const salvo = lerRascunho<{ valores?: ValoresPeca }>(CHAVE)
    const temAlgo =
      salvo?.valores && Object.keys(salvo.valores).length > 0
    inicial.current = temAlgo
      ? { valores: { ...valoresPadrao(template.campos), ...sanearValores(salvo!.valores!) }, recuperado: true }
      : { valores: valoresPadrao(template.campos), recuperado: false }
  }

  const [valores, setValores] = useState<ValoresPeca>(inicial.current.valores)
  const [recuperado, setRecuperado] = useState(inicial.current.recuperado)
  const [formato, setFormato] = useState<FormatoDef>(template.formatos[0])
  // Qual ação está rodando (null = nenhuma) e o texto de progresso do vídeo.
  const [acao, setAcao] = useState<'png' | 'moldura' | 'video' | null>(null)
  const [statusVideo, setStatusVideo] = useState<string | null>(null)
  // O que acabou de baixar (para mostrar as instruções pós-download).
  const [feito, setFeito] = useState<'imagem' | 'video' | null>(null)
  const ocupado = acao !== null
  const artRef = useRef<HTMLDivElement>(null)
  // Permite CANCELAR uma exportação travada sem perder o trabalho.
  const abortRef = useRef<AbortController | null>(null)

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
  // o card fixo em cima, então limitamos a altura para sobrar espaço aos
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

  // Salva a peça automaticamente (com atraso) para não perder o trabalho.
  useEffect(() => {
    const id = setTimeout(() => salvarRascunho(CHAVE, { valores }), 500)
    return () => clearTimeout(id)
  }, [valores, CHAVE])

  function set(id: string, valor: string | number) {
    setValores((v) => ({ ...v, [id]: valor }))
  }

  // Limpa a peça e o rascunho salvo (recomeça do zero).
  function limparPeca() {
    if (ocupado) return
    if (!confirm('Limpar tudo e começar do zero?')) return
    limparRascunho(CHAVE)
    setValores(valoresPadrao(template.campos))
    setRecuperado(false)
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
    fn: (sinal: AbortSignal) => Promise<void>,
    tipoFeito: 'imagem' | 'video',
  ) {
    if (!artRef.current) return
    const ac = new AbortController()
    abortRef.current = ac
    setFeito(null)
    setAcao(qual)
    try {
      await fn(ac.signal)
      setFeito(tipoFeito)
    } catch (e) {
      // Cancelamento pelo usuário: não é erro, some sem alerta e mantém o trabalho.
      if ((e as Error).message !== CANCELADO && (e as Error).name !== 'AbortError') {
        alert((e as Error).message)
      }
    } finally {
      abortRef.current = null
      setAcao(null)
      setStatusVideo(null)
    }
  }

  // Para o processo (moldura/vídeo travado) sem fechar a tela nem perder a peça.
  function cancelar() {
    abortRef.current?.abort()
  }

  const handleDownload = () =>
    rodar('png', () => baixarPng(artRef.current!, nomeBase(), 2, meta()), 'imagem')
  const handleMoldura = () =>
    rodar(
      'moldura',
      (sinal) => baixarMolduraPng(artRef.current!, `${nomeBase()}-moldura`, 2, meta(), sinal),
      'imagem',
    )
  const handleVideo = () =>
    rodar(
      'video',
      (sinal) => baixarVideoDoCard(artRef.current!, nomeBase(), (f) => setStatusVideo(f), sinal),
      'video',
    )

  return (
    <div className="editor">
      {/* ----- Controles ----- */}
      <div className="editor__panel">
        {recuperado && (
          <div className="rascunho-aviso">
            <span>✓ Recuperamos a sua última peça. Continue de onde parou.</span>
            <button type="button" onClick={limparPeca}>
              Começar do zero
            </button>
          </div>
        )}

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
                {acao === 'moldura' ? 'Gerando moldura…' : 'Baixar moldura PNG (p/ CapCut)'}
              </button>

              {suportaGravacaoVideo() ? (
                <button className="btn" disabled={!podeBaixar || ocupado} onClick={handleVideo}>
                  {acao === 'video' && <span className="spin-mini" />}
                  {acao === 'video' ? statusVideo ?? 'Preparando…' : 'Baixar vídeo pronto (com áudio)'}
                </button>
              ) : (
                <p className="editor__hint">
                  Seu navegador não gera o vídeo pronto. Use a <strong>moldura PNG</strong> e junte
                  com o vídeo no CapCut ou no Instagram.
                </p>
              )}
            </>
          )}

          {acao === 'video' && (
            <div className="aviso-atencao">
              <strong>⚠️ Atenção: fique nesta tela até terminar.</strong>
              <div>
                O vídeo é gravado em tempo real (leva o tempo do vídeo). Enquanto grava,{' '}
                <strong>não role a tela, não bloqueie o celular e não abra outro app</strong>. No
                iPhone qualquer uma dessas ações pausa o vídeo e corta a gravação. Pode acompanhar o
                progresso aqui.
              </div>
            </div>
          )}

          {ocupado && (
            <button type="button" className="btn btn--cancelar" onClick={cancelar}>
              Parar e voltar (não perde a peça)
            </button>
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
