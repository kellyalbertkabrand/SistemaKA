import { useEffect, useMemo, useRef, useState } from 'react'
import type { FormatoDef, Template, ValoresPeca } from '../templates/types'
import { valoresPadrao } from '../templates/types'
import { CamposEditor } from './CamposEditor'
import { PreviewCheia } from './PreviewCheia'
import { salvarRascunho, lerRascunho, limparRascunho } from '../lib/persistencia'
import { useHistorico } from '../lib/historico'
import { migrarConteudo } from '../templates/migrar'
import { baixarPng, gerarPngBlob, entregarArquivos } from '../lib/exportar'
import {
  baixarMolduraPng,
  baixarVideoDoCard,
  gerarVideoBlob,
  suportaGravacaoVideo,
  CANCELADO,
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

// Remove entradas de vídeo mortas (blob: não sobrevive ao recarregar a página).
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

// Construtor de carrossel: até 10 slides; em cada slide a pessoa escolhe o
// template e preenche os campos. Baixa slide a slide ou tudo num .zip.
export function Carrossel({ templates }: { templates: Template[] }) {
  const porId = (id: string) => templates.find((t) => t.id === id) ?? templates[0]

  const seqRef = useRef(0)
  const novoSlide = (): Slide => {
    const t = templates[0]
    return { key: ++seqRef.current, templateId: t.id, valores: valoresPadrao(t.campos) }
  }

  // Chave do rascunho por cliente (cada marca guarda o seu carrossel).
  const CHAVE = `rascunho-carrossel-${templates[0]?.clienteSlug ?? 'x'}`

  // Recupera o último carrossel salvo (se houver) para NÃO perder o trabalho.
  const inicial = useRef<{ slides: Slide[]; formato: FormatoDef; recuperado: boolean } | null>(null)
  if (!inicial.current) {
    const salvo = lerRascunho<{ slides?: Slide[]; formato?: { formato?: string } }>(CHAVE)
    const validos = (salvo?.slides ?? [])
      .filter((s) => s && templates.some((t) => t.id === s.templateId))
      .map((s) => ({ key: ++seqRef.current, templateId: s.templateId, valores: sanearValores(s.valores ?? {}) }))
    const f = FORMATOS.find((x) => x.formato === salvo?.formato?.formato) ?? FORMATOS[0]
    inicial.current = validos.length
      ? { slides: validos, formato: f, recuperado: true }
      : { slides: [novoSlide()], formato: f, recuperado: false }
  }

  const [formato, setFormato] = useState<FormatoDef>(inicial.current.formato)
  // Slides com histórico (Desfazer/Refazer).
  const {
    estado: slides,
    set: setSlides,
    repor: reporSlides,
    desfazer,
    refazer,
    podeDesfazer,
    podeRefazer,
  } = useHistorico<Slide[]>(inicial.current.slides)
  const [recuperado, setRecuperado] = useState(inicial.current.recuperado)
  const [sel, setSel] = useState(0)
  const [telaCheia, setTelaCheia] = useState(false)
  const [acao, setAcao] = useState<'png' | 'moldura' | 'video' | 'tudo' | null>(null)
  const [statusVideo, setStatusVideo] = useState<string | null>(null)
  const [feito, setFeito] = useState<'imagem' | 'video' | null>(null)
  // true enquanto grava algum vídeo (mostra o aviso de atenção também no "salvar tudo").
  const [gravandoVideo, setGravandoVideo] = useState(false)
  const ocupado = acao !== null
  // Permite CANCELAR uma exportação travada sem perder o carrossel.
  const abortRef = useRef<AbortController | null>(null)
  // Índice do slide sendo arrastado (reordenar).
  const arrastandoRef = useRef<number | null>(null)

  // Salva o carrossel automaticamente (com um pequeno atraso para não pesar a
  // cada tecla). Assim, se travar/recarregar, o trabalho continua lá.
  useEffect(() => {
    const id = setTimeout(() => salvarRascunho(CHAVE, { formato, slides }), 500)
    return () => clearTimeout(id)
  }, [slides, formato, CHAVE])

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
    if (!confirm(`Apagar o slide ${i + 1}? Não dá para desfazer.`)) return
    setSlides((s) => s.filter((_, idx) => idx !== i))
    setSel((cur) => Math.max(0, cur > i ? cur - 1 : cur === i ? Math.min(i, slides.length - 2) : cur))
  }

  // Duplica um slide (cópia logo depois): reaproveita o layout/textos já feitos.
  function duplicarSlide(i: number) {
    if (ocupado || slides.length >= MAX_SLIDES) return
    setSlides((s) => {
      const copia: Slide = { key: ++seqRef.current, templateId: s[i].templateId, valores: { ...s[i].valores } }
      const c = [...s]
      c.splice(i + 1, 0, copia)
      return c
    })
    setSel(i + 1)
  }

  // Começa um carrossel do zero, apagando o rascunho salvo.
  function comecarNovo() {
    if (ocupado) return
    if (!confirm('Começar um carrossel novo? O atual será apagado.')) return
    limparRascunho(CHAVE)
    seqRef.current = 0
    reporSlides([novoSlide()])
    setSel(0)
    setRecuperado(false)
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

  // Reordena arrastando (do índice `de` para o índice `para`).
  function reordenar(de: number, para: number) {
    if (ocupado || de === para || de < 0 || para < 0 || de >= slides.length || para >= slides.length) return
    setSlides((s) => {
      const c = [...s]
      const [item] = c.splice(de, 1)
      c.splice(para, 0, item)
      return c
    })
    setSel(para)
  }

  // Troca o template do slide APROVEITANDO o conteúdo (textos e imagens migram).
  // Assim a pessoa vê o mesmo conteúdo em outro modelo sem redigitar.
  function trocarTemplate(id: string) {
    if (ocupado) return
    const novoT = porId(id)
    setSlides((s) =>
      s.map((sl, idx) =>
        idx === sel
          ? { ...sl, templateId: id, valores: migrarConteudo(porId(sl.templateId), sl.valores, novoT) }
          : sl,
      ),
    )
  }

  function setValor(id: string, valor: string | number) {
    // agrupar=true: digitar não empilha um passo de Desfazer por letra.
    setSlides(
      (s) => s.map((sl, idx) => (idx === sel ? { ...sl, valores: { ...sl.valores, [id]: valor } } : sl)),
      true,
    )
  }

  async function rodar(
    qual: 'png' | 'moldura' | 'video' | 'tudo',
    fn: (sinal: AbortSignal) => Promise<void>,
    tipoFeito?: 'imagem' | 'video',
  ) {
    const ac = new AbortController()
    abortRef.current = ac
    setFeito(null)
    setAcao(qual)
    try {
      await fn(ac.signal)
      if (tipoFeito) setFeito(tipoFeito)
    } catch (e) {
      // Cancelamento pelo usuário: não é erro, some sem alerta e mantém o carrossel.
      if ((e as Error).message !== CANCELADO && (e as Error).name !== 'AbortError') {
        alert((e as Error).message)
      }
    } finally {
      abortRef.current = null
      setAcao(null)
      setStatusVideo(null)
      setGravandoVideo(false)
    }
  }

  // Para o processo (moldura/vídeo travado) sem perder os slides já montados.
  function cancelar() {
    abortRef.current?.abort()
  }

  const baixarSlide = () => {
    const node = nodeRefs.current[sel]
    if (node) void rodar('png', () => baixarPng(node, nomeSlide(), 2, meta()), 'imagem')
  }

  const baixarMoldura = () => {
    const node = stageRef.current
    if (node)
      void rodar(
        'moldura',
        (sinal) => baixarMolduraPng(node, `${nomeSlide()}-moldura`, 2, meta(), sinal),
        'imagem',
      )
  }

  const baixarVideo = () => {
    const node = stageRef.current
    if (node)
      void rodar(
        'video',
        (sinal) => baixarVideoDoCard(node, nomeSlide(), (f) => setStatusVideo(f), sinal),
        'video',
      )
  }

  const esperar = (ms: number) => new Promise((r) => setTimeout(r, ms))

  // Salva TUDO (imagens e vídeos) de uma vez no rolo. Vídeos são gravados um a
  // um em tempo real: para gravar, o slide precisa ficar visível, então trocamos
  // o slide selecionado e esperamos renderizar.
  const salvarTudo = () => {
    void rodar(
      'tudo',
      async (sinal) => {
        const arquivos: { nome: string; blob: Blob }[] = []
        for (let i = 0; i < slides.length; i++) {
          if (sinal.aborted) throw new Error(CANCELADO)
          const numero = String(i + 1).padStart(2, '0')
          if (slideTemVideo(slides[i].valores)) {
            if (!suportaGravacaoVideo()) continue // sem suporte: pula o vídeo
            setSel(i)
            setGravandoVideo(true)
            await esperar(600) // deixa o slide renderizar e o vídeo começar
            const node = stageRef.current
            if (node) {
              const { blob, ext } = await gerarVideoBlob(
                node,
                (fase) => setStatusVideo(`Slide ${i + 1}: ${fase}`),
                sinal,
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
      {recuperado && (
        <div className="rascunho-aviso">
          <span>✓ Recuperamos o seu último carrossel. Continue de onde parou.</span>
          <button type="button" onClick={comecarNovo}>
            Começar um novo
          </button>
        </div>
      )}

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
                draggable={!ocupado}
                onClick={() => {
                  if (!ocupado) setSel(i)
                }}
                onDragStart={() => {
                  arrastandoRef.current = i
                }}
                onDragOver={(e) => {
                  if (arrastandoRef.current !== null) e.preventDefault()
                }}
                onDrop={() => {
                  if (arrastandoRef.current !== null) reordenar(arrastandoRef.current, i)
                  arrastandoRef.current = null
                }}
                onDragEnd={() => {
                  arrastandoRef.current = null
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
                {slides.length < MAX_SLIDES && (
                  <button
                    className="thumb__dup"
                    title="Duplicar slide"
                    onClick={(e) => {
                      e.stopPropagation()
                      duplicarSlide(i)
                    }}
                  >
                    ⧉
                  </button>
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
            <div className="acoes-rapidas">
              <button type="button" onClick={desfazer} disabled={!podeDesfazer || ocupado} title="Desfazer">
                ↶ Desfazer
              </button>
              <button type="button" onClick={refazer} disabled={!podeRefazer || ocupado} title="Refazer">
                ↷ Refazer
              </button>
              <button type="button" onClick={() => setTelaCheia(true)} title="Ver em tela cheia">
                ⛶ Tela cheia
              </button>
            </div>

            <div className="field">
              <label>Template deste slide (nº {sel + 1})</label>
              <select value={slide.templateId} disabled={ocupado} onChange={(e) => trocarTemplate(e.target.value)}>
                {templates.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.nome}
                  </option>
                ))}
              </select>
              <p className="editor__hint">
                Trocar o modelo mantém o texto e a foto que você já colocou.
              </p>
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

              <button className="btn" onClick={salvarTudo} disabled={ocupado}>
                {acao === 'tudo' && <span className="spin-mini" />}
                {acao === 'tudo'
                  ? statusVideo ?? 'Gerando…'
                  : temAlgumVideo
                    ? 'Salvar tudo no rolo (imagens e vídeos)'
                    : 'Salvar todas as imagens'}
              </button>
              <p className="editor__hint">
                No celular, as imagens (e vídeos) vão direto para o <strong>rolo de câmera</strong>;
                no computador, baixam juntas num <strong>arquivo .zip</strong>.
              </p>

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

              {ocupado && (
                <button type="button" className="btn btn--cancelar" onClick={cancelar}>
                  Parar e voltar (não perde o carrossel)
                </button>
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

      {telaCheia && (
        <PreviewCheia
          largura={formato.largura}
          altura={formato.altura}
          rotulo={`Slide ${sel + 1} · ${formato.rotulo}`}
          onFechar={() => setTelaCheia(false)}
        >
          <template.render valores={slide.valores} formato={formato} />
        </PreviewCheia>
      )}
    </div>
  )
}
