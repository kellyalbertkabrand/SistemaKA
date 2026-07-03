import { useRef, useState } from 'react'
import type { FormatoDef, Template, ValoresPeca } from '../templates/types'
import { valoresPadrao } from '../templates/types'
import { CamposEditor } from './CamposEditor'
import { baixarPng, baixarZip } from '../lib/exportar'
import { metaPadrao } from '../lib/assinatura'
import './carrossel.css'

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
  const [baixando, setBaixando] = useState(false)

  // Nós em tamanho real (escondidos) usados para exportar cada slide.
  const nodeRefs = useRef<(HTMLDivElement | null)[]>([])

  const slide = slides[sel]
  const template = porId(slide.templateId)
  const slug = templates[0]?.clienteSlug ?? 'peca'
  const clienteNome = templates[0]?.clienteNome

  const previewW = 320
  const escala = previewW / formato.largura

  function addSlide() {
    if (slides.length >= MAX_SLIDES) return
    setSlides((s) => [...s, novoSlide()])
    setSel(slides.length)
  }

  function removeSlide(i: number) {
    if (slides.length <= 1) return
    setSlides((s) => s.filter((_, idx) => idx !== i))
    setSel((cur) => Math.max(0, cur > i ? cur - 1 : cur === i ? Math.min(i, slides.length - 2) : cur))
  }

  function mover(i: number, dir: -1 | 1) {
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

  async function baixarSlide() {
    const node = nodeRefs.current[sel]
    if (!node) return
    setBaixando(true)
    try {
      await baixarPng(node, `${slug}-carrossel-slide${sel + 1}`, 2, metaPadrao({ cliente: clienteNome, titulo: 'Carrossel' }))
    } catch (e) {
      alert('Não consegui gerar o PNG.\n' + (e as Error).message)
    } finally {
      setBaixando(false)
    }
  }

  async function baixarTodos() {
    setBaixando(true)
    try {
      const itens = slides
        .map((_, i) => nodeRefs.current[i])
        .filter((n): n is HTMLDivElement => !!n)
        .map((node, i) => ({ node, nome: `slide${i + 1}` }))
      await baixarZip(itens, `${slug}-carrossel`, 2, metaPadrao({ cliente: clienteNome, titulo: 'Carrossel' }))
    } catch (e) {
      alert('Não consegui gerar o zip.\n' + (e as Error).message)
    } finally {
      setBaixando(false)
    }
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
          <button className="btn btn--ghost" onClick={addSlide} disabled={slides.length >= MAX_SLIDES}>
            + Slide ({slides.length}/{MAX_SLIDES})
          </button>
          <button className="btn" onClick={baixarTodos} disabled={baixando}>
            {baixando ? 'Gerando…' : 'Baixar todos (ZIP)'}
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
              <div key={s.key} className={`thumb ${i === sel ? 'on' : ''}`} onClick={() => setSel(i)}>
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
              <select value={slide.templateId} onChange={(e) => trocarTemplate(e.target.value)}>
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

            <button className="btn btn--ghost" onClick={baixarSlide} disabled={baixando}>
              Baixar só este slide
            </button>
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
                <template.render valores={slide.valores} formato={formato} />
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
