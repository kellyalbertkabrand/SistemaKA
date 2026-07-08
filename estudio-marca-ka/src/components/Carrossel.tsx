import { useMemo, useRef, useState } from 'react'
import type { FormatoDef, Template, ValoresPeca } from '../templates/types'
import { valoresPadrao } from '../templates/types'
import { CamposEditor } from './CamposEditor'
import { baixarPng, gerarPngBlob, entregarArquivos } from '../lib/exportar'
import {
  baixarMolduraPng,
  baixarVideoDoCard,
  gerarVideoBlob,
  suportaGravacaoVideo,
} from '../lib/exportarVideo'
import { metaPadrao } from '../lib/assinatura'
import './carrossel.css'
import './editor.css'

const MAX_SLIDES = 10

// Formatos disponíveis (o carrossel do Instagram usa o mesmo para todos os slides).
const FORMATOS: FormatoDef[] = [
  { formato: 'post', rotulo: 'Feed 4:5', largura: 1080, altura: 1350 },
  { formato: 'story', rotulo: 'Story 9:16', largura: 1080, altura: 1920 },
  { formato: 'card', rotulo: 'Quadrado 1:1', largura: 1080, altura: 1080 },
]

interface Slide {
  key: number
  templateId: string
  valores: ValoresPeca
}

// Construtor de carrossel: até 10 slides; em cada slide a pessoa escolhe o
// template e preenche os campos. Baixa slide a slide ou tudo num .zip.
export function Carrossel({ templates }: { templates: Template[] }) {
  const porId = (id: string) => templates.find((t) => t.id === id) ?? templates[0]

  const seqRef = useRef(0)
  const novoSlide = (): Slide => {
    const t = templates[0]
    return { key: ++seqRef.current, templateId: t.id, valores: valoresPadrao(t.campos) }
  }

  const [formato, setFormato] = useState<FormatoDef>(FORMATOS[0])
  const [slides, setSlides] = useState<Slide[]>(() => [novoSlide()])
  const [sel, setSel] = useState(0)
  const [acao, setAcao] = useState<'png' | 'moldura' | 'video' | 'tudo' | null>(null)
  const [statusVideo, setStatusVideo] = useState<string | null>(null)
  const [feito, setFeito] = useState<'imagem' | 'video' | null>(null)
  // true enquanto grava algum vídeo (mostra o aviso de atenção também no "salvar tudo").
  const [gravandoVideo, setGravandoVideo] = useState(false)
  const ocupado = acao !== null

  const slideTemVideo = (v: ValoresPeca) =>
    Object.entries(v).some(([k, val]) => k.endsWith('_kind') && val === 'video') ||
    Object.values(v).some((val) => typeof val === 'string' && val.startsWith('data:video'))
  const temAlgumVideo = slides.some((s) => slideTemVideo(s.valores))

  // Nós em tamanho real (escondidos) usados para exportar PNG de cada slide.
  const nodeRefs = useRef<(HTMLDivElement | null)[]>([])
  // Nó do slide VISÍVEL (usado no vídeo: o card precisa estar visível/tocando).
  const stageRef = useRef<HTMLDivElement>(null)

  const slide = slides[sel]
  const template = porId(slide.templateId)
  const slug = templates[0]?.clienteSlug ?? 'peca'
  const clienteNome = templates[0]?.clienteNome

  // O slide selecionado tem vídeo? (libera as saídas de vídeo/moldura)
  const temVideo = useMemo(
    () =>
      Object.entries(slide.valores).some(([k, v]) => k.endsWith('_kind') && v === 'video') ||
      Object.values(slide.valores).some((v) => typeof v === 'string' && v.startsWith('data:video')),
    [slide.valores],
  )
  const meta = () => metaPadrao({ cliente: clienteNome, titulo: 'Carrossel' })
  const nomeSlide = () => `${slug}-carrossel-slide${sel + 1}`

  const previewW = 320
  const escala = previewW / formato.largura

  function addSlide() {
    if (slides.length >= MAX_SLIDES) return
    setSlides((s) => [...s, novoSlide()])
    setSel(slides.length)
  }

  function removeSlide(i: number) {
    if (ocupado || slides.length <= 1) return
    setSlides((s) => s.filter((_, idx) => idx !== i))
    setSel((cur) => Math.max(0, cur > i ? cur - 1 : cur === i ? Math.min(i, slides.length - 2) : cur))
  }

  function mover(i: number, dir: -1 | 1) {
    if (ocupado) return
    const j = i + dir
    if (j < 0 || j >= slides.length) return
    setSlides((s) => {
      const c = [...s]
      ;[c[i], c[j]] = [c[j], c[i]]
      return c
    })
    setSel((cur) => (cur === i ? j : cur === j ? i : cur))
  }

  function trocarTemplate(id: string) {
    if (ocupado) return
    const t = porId(id)
    setSlides((s) =>
      s.map((sl, idx) => (idx === sel ? { ...sl, templateId: id, valores: valoresPadrao(t.campos) } : sl)),
    )
  }

  function setValor(id: string, valor: string | number) {
    setSlides((s) =>
      s.map((sl, idx) => (idx === sel ? { ...sl, valores: { ...sl.valores, [id]: valor } } : sl)),
    )
  }

  async function rodar(
    qual: 'png' | 'moldura' | 'video' | 'tudo',
    fn: () => Promise<void>,
    tipoFeito?: 'imagem' | 'video',
  ) {
    setFeito(null)
    setAcao(qual)
    try {
      await fn()
      if (tipoFeito) setFeito(tipoFeito)
    } catch (e) {
      alert((e as Error).message)
    } finally {
      setAcao(null)
      setStatusVideo(null)
      setGravandoVideo(false)
    }
  }

  const baixarSlide = () => {
    const node = nodeRefs.current[sel]
    if (node) void rodar('png', () => baixarPng(node, nomeSlide(), 2, meta()), 'imagem')
  }

  const baixarMoldura = () => {
    const node = stageRef.current
    if (node) void rodar('moldura', () => baixarMolduraPng(node, `${nomeSlide()}-moldura`, 2, meta()), 'imagem')
  }

  const baixarVideo = () => {
    const node = stageRef.current
    if (node)
      void rodar('video', () => baixarVideoDoCard(node, nomeSlide(), (f) => setStatusVideo(f)), 'video')
  }

  const esperar = (ms: number) => new Promise((r) => setTimeout(r, ms))

  // Salva TUDO (imagens e vídeos) de uma vez no rolo. Vídeos são gravados um a
  // um em tempo real: para gravar, o slide precisa ficar visível, então trocamos
  // o slide selecionado e esperamos renderizar.
  const salvarTudo = () => {
    void rodar(
      'tudo',
      async () => {
        const arquivos: { nome: string; blob: Blob }[] = []
        for (let i = 0; i < slides.length; i++) {
          const numero = String(i + 1).padStart(2, '0')
          if (slideTemVideo(slides[i].valores)) {
            if (!suportaGravacaoVideo()) continue // sem suporte: pula o vídeo
            setSel(i)
            setGravandoVideo(true)
            await esperar(600) // deixa o slide renderizar e o vídeo começar
            const node = stageRef.current
            if (node) {
              const { blob, ext } = await gerarVideoBlob(node, (fase) =>
                setStatusVideo(`Slide ${i + 1}: ${fase}`),
              )
              arquivos.push({ nome: `carrossel-${numero}.${ext}`, blob })
            }
            setGravandoVideo(false)
          } else {
            const node = nodeRefs.current[i]
            if (node) {
              setStatusVideo(`Gerando imagem do slide ${i + 1}...`)
              arquivos.push({ nome: `carrossel-${numero}.png`, blob: await gerarPngBlob(node, 2, meta()) })
            }
          }
        }
        if (arquivos.length) await entregarArquivos(arquivos, `${slug}-carrossel`, 'Carrossel')
      },
      'video',
    )
  }

  return (
    <div className="carrossel">
      {/* Barra de ações */}
      <div className="carrossel__bar">
        <div className="seg">
          {FORMATOS.map((f) => (
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
        <div className="carrossel__bar-actions">
          <button className="btn btn--ghost" onClick={addSlide} disabled={slides.length >= MAX_SLIDES || ocupado}>
            + Slide ({slides.length}/{MAX_SLIDES})
          </button>
          <button className="btn" onClick={salvarTudo} disabled={ocupado}>
            {acao === 'tudo'
              ? statusVideo ?? 'Gerando…'
              : temAlgumVideo
                ? 'Salvar tudo no rolo (imagens e vídeos)'
                : 'Salvar todas as imagens'}
          </button>
        </div>
      </div>

      <div className="carrossel__body">
        {/* Filmstrip de slides */}
        <div className="carrossel__strip">
          {slides.map((s, i) => {
            const t = porId(s.templateId)
            const R = t.render
            const tw = 96
            const th = (formato.altura / formato.largura) * tw
            return (
              <div
                key={s.key}
                className={`thumb ${i === sel ? 'on' : ''} ${ocupado ? 'thumb--travado' : ''}`}
                onClick={() => {
                  if (!ocupado) setSel(i)
                }}
              >
                <div className="thumb__scaler" style={{ width: tw, height: th }}>
                  <div
                    style={{
                      transform: `scale(${tw / formato.largura})`,
                      transformOrigin: 'top left',
                      width: formato.largura,
                      height: formato.altura,
                    }}
                  >
                    <R valores={s.valores} formato={formato} />
                  </div>
                </div>
                <span className="thumb__n">{i + 1}</span>
                {slides.length > 1 && (
                  <>
                    <div className="thumb__move">
                      <button
                        title="Mover para cima"
                        disabled={i === 0}
                        onClick={(e) => {
                          e.stopPropagation()
                          mover(i, -1)
                        }}
                      >
                        ▲
                      </button>
                      <button
                        title="Mover para baixo"
                        disabled={i === slides.length - 1}
                        onClick={(e) => {
                          e.stopPropagation()
                          mover(i, 1)
                        }}
                      >
                        ▼
                      </button>
                    </div>
                    <button
                      className="thumb__x"
                      title="Remover slide"
                      onClick={(e) => {
                        e.stopPropagation()
                        removeSlide(i)
                      }}
                    >
                      ×
                    </button>
                  </>
                )}
              </div>
            )
          })}
          {slides.length < MAX_SLIDES && (
            <button className="thumb thumb--add" onClick={addSlide} title="Adicionar slide">
              +
            </button>
          )}
        </div>

        {/* Editor do slide selecionado */}
        <div className="carrossel__editor">
          <div className="editor__panel">
            <div className="field">
              <label>Template deste slide (nº {sel + 1})</label>
              <select value={slide.templateId} disabled={ocupado} onChange={(e) => trocarTemplate(e.target.value)}>
                {templates.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.nome}
                  </option>
                ))}
              </select>
            </div>

            <CamposEditor
              campos={template.campos}
              valores={slide.valores}
              onSet={setValor}
              idPrefix={`s${slide.key}-`}
            />

            <div className="export-botoes">
              {temVideo && (
                <p className="editor__hint">
                  <strong>Este slide tem vídeo.</strong> Escolha como baixar:
                </p>
              )}

              <button className="btn" onClick={baixarSlide} disabled={ocupado}>
                {acao === 'png' && <span className="spin-mini" />}
                {acao === 'png' ? 'Baixando…' : temVideo ? 'Baixar imagem (PNG)' : 'Baixar só este slide'}
              </button>

              {temVideo && (
                <>
                  <button className="btn" onClick={baixarMoldura} disabled={ocupado}>
                    {acao === 'moldura' && <span className="spin-mini" />}
                    {acao === 'moldura' ? 'Gerando moldura…' : 'Baixar moldura PNG (p/ CapCut)'}
                  </button>
                  {suportaGravacaoVideo() ? (
                    <button className="btn" onClick={baixarVideo} disabled={ocupado}>
                      {acao === 'video' && <span className="spin-mini" />}
                      {acao === 'video' ? statusVideo ?? 'Preparando…' : 'Baixar vídeo pronto (com áudio)'}
                    </button>
                  ) : (
                    <p className="editor__hint">
                      Seu navegador não gera o vídeo pronto. Use a <strong>moldura PNG</strong> e junte
                      no CapCut ou no Instagram.
                    </p>
                  )}
                </>
              )}

              {(acao === 'video' || gravandoVideo) && (
                <div className="aviso-atencao">
                  <strong>⚠️ Atenção: fique nesta tela até terminar.</strong>
                  <div>
                    O vídeo é gravado em tempo real (leva o tempo do vídeo). Enquanto grava,{' '}
                    <strong>não role a tela, não troque de slide, não bloqueie o celular e não abra
                    outro app</strong>. No iPhone qualquer uma dessas ações pausa o vídeo e corta a
                    gravação. Pode acompanhar aqui o progresso.
                  </div>
                </div>
              )}

              {feito && (
                <div className="export-feito">
                  <strong>✓ Pronto!</strong>
                  <div>
                    <strong>No celular:</strong> na tela que abriu, toque em{' '}
                    <strong>{feito === 'video' ? '“Salvar vídeo”' : '“Salvar imagem”'}</strong> (ou
                    “Salvar em Fotos”). No computador: pasta <strong>Downloads</strong>.
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Preview do slide selecionado */}
          <div className="editor__stage">
            <div className="editor__scaler" style={{ width: previewW, height: formato.altura * escala }}>
              <div
                style={{
                  transform: `scale(${escala})`,
                  transformOrigin: 'top left',
                  width: formato.largura,
                  height: formato.altura,
                }}
              >
                <div ref={stageRef}>
                  <template.render valores={slide.valores} formato={formato} />
                </div>
              </div>
            </div>
            <span className="editor__label">
              Slide {sel + 1} · {formato.rotulo}
            </span>
          </div>
        </div>
      </div>

      {/* Nós em tamanho real (escondidos) para exportação */}
      <div className="carrossel__offscreen" aria-hidden>
        {slides.map((s, i) => {
          const t = porId(s.templateId)
          const R = t.render
          return (
            <div
              key={s.key}
              ref={(el) => {
                nodeRefs.current[i] = el
              }}
            >
              <R valores={s.valores} formato={formato} />
            </div>
          )
        })}
      </div>
    </div>
  )
}
