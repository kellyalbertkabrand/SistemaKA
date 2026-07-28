import { toPng } from 'html-to-image'
import { assinarPngDataUrl, metaPadrao, type MetaAssinatura } from './assinatura'
import { entregarArquivo, dataUrlParaBlob } from './exportar'
import { FORMAS } from '../templates/formas'

// ============================================================================
// Exportação de VÍDEO. O card da KA vira um vídeo: desenhamos o vídeo do
// cliente dentro da "janela" da área de mídia e, por cima, a moldura da KA
// (texto, cabeçalho, rodapé) — que é a arte com a área de mídia transparente.
// Grava com MediaRecorder (webm). Em navegadores sem suporte (alguns iPhones),
// avisa para usar a "moldura PNG" e montar no CapCut.
// ============================================================================

export function suportaGravacaoVideo(): boolean {
  return typeof MediaRecorder !== 'undefined' && typeof HTMLCanvasElement.prototype.captureStream === 'function'
}

function escolherMime(): string | undefined {
  // MP4 (H.264+AAC) primeiro — é o formato que o Instagram aceita direto.
  // WebM fica como fallback para navegadores sem encoder MP4.
  const cands = [
    'video/mp4;codecs=avc1.640028,mp4a.40.2',
    'video/mp4;codecs=avc1.42E01E,mp4a.40.2',
    'video/mp4',
    'video/webm;codecs=vp9,opus',
    'video/webm;codecs=vp8,opus',
    'video/webm',
  ]
  for (const m of cands) if (MediaRecorder.isTypeSupported?.(m)) return m
  return undefined
}

// Grafo de áudio por elemento de vídeo (criado UMA vez — o navegador proíbe
// um segundo createMediaElementSource no mesmo elemento). O áudio do vídeo
// vai direto para a gravação, sem tocar nas caixas de som (a fonte só
// conecta no destino de stream, nunca no destination do contexto).
const grafosAudio = new WeakMap<HTMLVideoElement, MediaStreamAudioDestinationNode>()

function audioDoVideo(video: HTMLVideoElement): MediaStream {
  let destino = grafosAudio.get(video)
  if (!destino) {
    const ctx = new AudioContext()
    const fonte = ctx.createMediaElementSource(video)
    destino = ctx.createMediaStreamDestination()
    fonte.connect(destino)
    grafosAudio.set(video, destino)
  }
  return destino.stream
}

// Embute as fontes da KA (self-hosted) como base64 e passa direto ao
// html-to-image. Assim ele NÃO tenta varrer/baixar as fontes do Google
// (cross-origin), que travavam o embed e faziam o cabeçalho cair no fallback.
function bufParaBase64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf)
  let bin = ''
  const chunk = 0x8000
  for (let i = 0; i < bytes.length; i += chunk) {
    bin += String.fromCharCode(...bytes.subarray(i, i + chunk))
  }
  return btoa(bin)
}
async function embutirFonte(fam: string, weight: string, url: string): Promise<string> {
  try {
    const res = await fetch(url)
    const b64 = bufParaBase64(await res.arrayBuffer())
    return `@font-face{font-family:'${fam}';font-style:normal;font-weight:${weight};font-display:block;src:url(data:font/woff2;base64,${b64}) format('woff2');}`
  } catch {
    return ''
  }
}

// Fontes embutidas por cliente, para o html-to-image NÃO varrer o Google Fonts
// (cross-origin) e não cair no fallback. Embutimos SÓ o necessário para o card
// que gera moldura/vídeo, senão o SVG fica grande e trava o Safari do iPhone:
//  - KA (card Mídia): Montserrat (cabeçalho, texto, rodapé).
//  - Shapes (card Capa): Montilla peso 500 (título + logo).
const cacheFontCss: Record<string, string> = {}
async function fontEmbedCss(cliente: 'ka' | 'shapes'): Promise<string> {
  if (cacheFontCss[cliente] != null) return cacheFontCss[cliente]
  const partes =
    cliente === 'shapes'
      ? [await embutirFonte('Montilla', '500', '/clientes/shapes/fonts/montilla-500.woff2')]
      : [await embutirFonte('Montserrat KA', '100 900', '/clientes/ka/fonts/montserrat-var.woff2')]
  cacheFontCss[cliente] = partes.filter(Boolean).join('\n')
  return cacheFontCss[cliente]
}

// Descobre o cliente pelo nó do card (para escolher as fontes certas).
function clienteDoNode(node: HTMLElement): 'ka' | 'shapes' {
  return /shapes/.test(node.className || '') || node.querySelector('[class*="shapes-"]') ? 'shapes' : 'ka'
}

function carregarImg(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = src
  })
}

function esperar(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms))
}

// Marca de cancelamento pelo usuário (o rodar trata sem mostrar erro).
export const CANCELADO = 'cancelado'

// Aborta uma promessa lenta (o toPng do Safari às vezes nunca resolve) ou quando
// o usuário aperta Cancelar. Assim o botão nunca fica preso.
function comTimeout<T>(p: Promise<T>, ms: number, msg: string, sinal?: AbortSignal): Promise<T> {
  return Promise.race([
    p,
    new Promise<T>((_, rej) => {
      const t = setTimeout(() => rej(new Error(msg)), ms)
      sinal?.addEventListener(
        'abort',
        () => {
          clearTimeout(t)
          rej(new Error(CANCELADO))
        },
        { once: true },
      )
    }),
  ])
}

// Duração confiável (segundos). Espera os metadados; se vier Infinity/NaN
// (comum em webm/stream), força o cálculo indo até o fim e voltando.
async function duracaoConfiavel(video: HTMLVideoElement): Promise<number> {
  if (video.readyState < 1) {
    await new Promise<void>((r) => {
      video.addEventListener('loadedmetadata', () => r(), { once: true })
      setTimeout(r, 2500)
    })
  }
  let d = video.duration
  if (!Number.isFinite(d) || d <= 0) {
    await new Promise<void>((r) => {
      video.addEventListener('seeked', () => r(), { once: true })
      try {
        video.currentTime = 1e7
      } catch {
        r()
      }
      setTimeout(r, 1500)
    })
    d = video.duration
    try {
      video.currentTime = 0
    } catch {
      /* ignora */
    }
  }
  return Number.isFinite(d) && d > 0 ? d : 8
}

// Força o carregamento dos pesos das fontes da KA ANTES de rasterizar, senão o
// html-to-image pode usar uma fonte de fallback (mais larga) e o cabeçalho —
// que é `white-space: nowrap` — sai "estourado"/desconfigurado.
async function garantirFontesKA(): Promise<void> {
  try {
    await Promise.all([
      document.fonts.load('500 21px "Montserrat KA"'),
      document.fonts.load('800 21px "Montserrat KA"'),
      document.fonts.load('600 26px "Montserrat KA"'),
      document.fonts.load('900 53px "Montserrat KA"'),
      document.fonts.load('700 106px "Playfair KA"'),
    ])
  } catch {
    /* segue mesmo assim */
  }
  if (document.fonts?.ready) await document.fonts.ready
}

// Caminho (Path2D) da janela do vídeo: forma orgânica escalada OU retângulo
// arredondado. Usado para recortar o vídeo e para perfurar a moldura.
function caminhoJanela(
  rect: { x: number; y: number; w: number; h: number },
  forma: string | null,
  pr: number,
  raio = 18,
): Path2D {
  const p = new Path2D()
  const f = forma ? FORMAS.find((x) => x.id === forma) : null
  if (f) {
    const base = new Path2D(f.d) // `d` em objectBoundingBox (0–1)
    const m = new DOMMatrix().translateSelf(rect.x * pr, rect.y * pr).scaleSelf(rect.w * pr, rect.h * pr)
    p.addPath(base, m)
  } else {
    const x = rect.x * pr,
      y = rect.y * pr,
      w = rect.w * pr,
      h = rect.h * pr
    const r = Math.min(raio * pr, w / 2, h / 2)
    if (r > 0 && typeof (p as { roundRect?: unknown }).roundRect === 'function') p.roundRect(x, y, w, h, r)
    else p.rect(x, y, w, h)
  }
  return p
}

// Cards onde o texto/logo ficam POR CIMA do vídeo (o vídeo é o fundo): a moldura
// não pode "perfurar" a janela (apagaria o texto), então deixamos o fundo
// transparente e mantemos só o texto/logo por cima.
function videoSobreposto(node: HTMLElement): boolean {
  return !!node.querySelector('.shapes-capa, .shapes-cta')
}

/**
 * Gera e baixa um vídeo do card: vídeo do cliente na área de mídia + moldura
 * (texto/logo) por cima. `node` é a arte em tamanho real (1080px).
 */
// Janela da mídia dentro do card (coords reais 1080px) + a FORMA da janela
// (retângulo arredondado ou uma forma orgânica da Shapes).
interface Janela {
  x: number
  y: number
  w: number
  h: number
  /** id da forma orgânica (shape-blob1…) OU null para retângulo. */
  forma: string | null
}
function medirJanela(node: HTMLElement): Janela {
  const W = node.offsetWidth
  const H = node.offsetHeight
  const cardRect = node.getBoundingClientRect()
  // A "janela" é o elemento que CONTÉM o vídeo (o frame da mídia / a foto).
  const videoEl = node.querySelector('video') as HTMLElement | null
  const frameEl =
    (videoEl?.parentElement as HTMLElement) ??
    (node.querySelector('.midia-frame') as HTMLElement) ??
    (node.querySelector('.foto-blob') as HTMLElement) ??
    (node.querySelector('.foto-frame') as HTMLElement) ??
    node
  const fr = frameEl.getBoundingClientRect()
  // Forma orgânica: os cards da Shapes marcam a foto-blob com data-forma.
  const forma = frameEl.getAttribute?.('data-forma') || null
  return {
    x: ((fr.left - cardRect.left) / cardRect.width) * W,
    y: ((fr.top - cardRect.top) / cardRect.height) * H,
    w: (fr.width / cardRect.width) * W,
    h: (fr.height / cardRect.height) * H,
    forma,
  }
}

/**
 * Rasteriza a moldura do card com a janela do vídeo REALMENTE transparente.
 * A classe `.moldura-video` esconde a mídia, mas o fundo do card continua
 * pintando atrás da janela — então o buraco é "perfurado" no canvas com
 * `destination-out` (senão a moldura cobriria o vídeo no export, e o PNG
 * não serviria para sobrepor no CapCut).
 */
async function molduraComJanela(
  node: HTMLElement,
  pixelRatio: number,
  sinal?: AbortSignal,
): Promise<{ canvas: HTMLCanvasElement; rect: Janela; sobreposto: boolean }> {
  const W = node.offsetWidth
  const H = node.offsetHeight
  const rect = medirJanela(node)
  const sobreposto = videoSobreposto(node)

  await garantirFontesKA()
  const fontEmbedCSS = await fontEmbedCss(clienteDoNode(node))
  const opts = {
    pixelRatio,
    width: W,
    height: H,
    // NÃO tenta rasterizar o <video> (a gente desenha ele à parte). Isso evita
    // que o html-to-image trave/erre embutindo o vídeo pesado — o que fazia o
    // cabeçalho sair com fonte trocada e estourada.
    filter: (el: HTMLElement) => !(el instanceof HTMLVideoElement),
    // Fontes da KA já embutidas (não varre o Google Fonts, que estraga o embed).
    fontEmbedCSS,
    style: { transform: 'none', margin: '0' },
  }
  // Cards onde o vídeo é FUNDO (capa/cta): o texto/logo ficam por cima, então
  // não escondemos a mídia com a classe — só a deixamos transparente (o próprio
  // <video> é excluído pelo filtro). Cards com JANELA (mídia da KA, forma da
  // Shapes): a classe esconde a mídia e o buraco é perfurado no canvas.
  node.classList.add(sobreposto ? 'moldura-video--sobreposto' : 'moldura-video')
  let molduraUrl: string
  try {
    // Uma única rasterização, com tempo limite: o toPng do Safari às vezes
    // nunca resolve, e sem o limite o botão ficava preso em "Preparando a
    // moldura". (Não precisa de aquecimento aqui: o vídeo é excluído e não há
    // foto na moldura.)
    molduraUrl = await comTimeout(
      toPng(node, opts),
      25000,
      'Não consegui gerar a moldura neste navegador. Tente de novo, ou use o computador (Chrome).',
      sinal,
    )
  } finally {
    node.classList.remove('moldura-video', 'moldura-video--sobreposto')
  }
  const img = await carregarImg(molduraUrl)

  const canvas = document.createElement('canvas')
  canvas.width = W * pixelRatio
  canvas.height = H * pixelRatio
  const ctx = canvas.getContext('2d')!
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
  // Perfura a janela (só nos cards com janela — no vídeo-de-fundo o texto/logo
  // já estão por cima e não há nada para perfurar). A forma pode ser orgânica.
  if (!sobreposto) {
    ctx.globalCompositeOperation = 'destination-out'
    ctx.fill(caminhoJanela(rect, rect.forma, pixelRatio))
    ctx.globalCompositeOperation = 'source-over'
  }
  return { canvas, rect, sobreposto }
}

/**
 * Baixa a moldura do card em PNG (janela do vídeo transparente), assinada —
 * para a pessoa montar com o próprio vídeo no CapCut/Instagram.
 */
export async function baixarMolduraPng(
  node: HTMLElement,
  nome: string,
  escala = 2,
  meta?: MetaAssinatura,
  sinal?: AbortSignal,
): Promise<void> {
  if (document.fonts?.ready) await document.fonts.ready
  const { canvas } = await molduraComJanela(node, escala, sinal)
  const assinado = assinarPngDataUrl(canvas.toDataURL('image/png'), meta ?? metaPadrao())
  await entregarArquivo(await dataUrlParaBlob(assinado), `${nome}.png`, nome)
}

/** Gera o vídeo do card (arte + vídeo + áudio) e devolve o Blob e a extensão. */
export async function gerarVideoBlob(
  node: HTMLElement,
  aoProgresso?: (fase: string) => void,
  sinal?: AbortSignal,
): Promise<{ blob: Blob; ext: string }> {
  if (!suportaGravacaoVideo()) {
    throw new Error(
      'Este navegador não grava vídeo (comum no iPhone). Use "Baixar moldura (PNG)" e ' +
        'junte com o seu vídeo no CapCut/Instagram.',
    )
  }
  const video = node.querySelector('video') as HTMLVideoElement | null
  if (!video) throw new Error('Este card não tem vídeo.')

  // Garante que o vídeo carregou os quadros. Se não decodificar (ex.: .mov
  // HEVC no Chrome), videoWidth fica 0 e o export sairia PRETO — melhor avisar.
  if (!video.videoWidth) {
    await new Promise<void>((res) => {
      const ok = () => res()
      video.addEventListener('loadeddata', ok, { once: true })
      setTimeout(ok, 2000)
    })
  }
  if (!video.videoWidth) {
    throw new Error(
      'Não consegui ler este vídeo no navegador — é comum com arquivos .mov (HEVC) do iPhone/Mac. ' +
        'Converta para MP4 (H.264) ou use "Baixar moldura (PNG)" e monte no CapCut.',
    )
  }

  if (document.fonts?.ready) await document.fonts.ready

  const W = node.offsetWidth
  const H = node.offsetHeight

  aoProgresso?.('Preparando a moldura…')
  // Moldura com a janela perfurada — o vídeo aparece por baixo dela.
  const { canvas: moldura, rect, sobreposto } = await molduraComJanela(node, 1, sinal)
  // Cards de vídeo-fundo (capa/cta): a moldura fica com o fundo do card
  // transparente, então pintamos a cor do card ATRÁS do vídeo (aparece nas
  // margens quando a foto é menor que o card). Cards com janela não precisam.
  const corFundoCard = sobreposto ? getComputedStyle(node).backgroundColor : ''

  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')!

  const stream = canvas.captureStream(30)
  // Junta o áudio ORIGINAL do vídeo, se existir. O elemento precisa estar com
  // muted=false para o áudio fluir pelo grafo — mas nada sai nas caixas de
  // som, porque a fonte só conecta no destino da gravação.
  try {
    audioDoVideo(video)
      .getAudioTracks()
      .forEach((t) => stream.addTrack(t))
  } catch {
    /* sem áudio, tudo bem */
  }

  const mime = escolherMime()
  const rec = new MediaRecorder(
    stream,
    mime ? { mimeType: mime, videoBitsPerSecond: 8_000_000 } : { videoBitsPerSecond: 8_000_000 },
  )
  const chunks: BlobPart[] = []
  rec.ondataavailable = (e) => {
    if (e.data && e.data.size) chunks.push(e.data)
  }
  const parou = new Promise<void>((res) => {
    rec.onstop = () => res()
  })

  // Toca o vídeo do começo e desenha cada quadro. Desliga mute/loop durante a
  // gravação (mute silenciaria o áudio captado; loop recomeçaria o vídeo).
  const muteAntes = video.muted
  const loopAntes = video.loop
  video.currentTime = 0
  video.muted = false
  video.loop = false
  await video.play().catch(() => {})

  function desenhaQuadro() {
    ctx.clearRect(0, 0, W, H)
    if (corFundoCard) {
      ctx.fillStyle = corFundoCard
      ctx.fillRect(0, 0, W, H)
    }
    const vw = video!.videoWidth
    const vh = video!.videoHeight
    if (vw && vh) {
      const escala = Math.max(rect.w / vw, rect.h / vh)
      const dw = vw * escala
      const dh = vh * escala
      const dx = rect.x + (rect.w - dw) / 2
      const dy = rect.y + (rect.h - dh) / 2
      ctx.save()
      // Recorta o vídeo na FORMA da janela (retângulo arredondado OU forma
      // orgânica da Shapes). Nos cards de vídeo-fundo (capa/cta) a moldura por
      // cima cobre o resto; nos de janela, a moldura foi perfurada. Vídeo-fundo
      // usa canto reto (raio 0) — o próprio card já define o recorte.
      ctx.clip(caminhoJanela(rect, rect.forma, 1, sobreposto ? 0 : 18))
      ctx.drawImage(video!, dx, dy, dw, dh)
      ctx.restore()
    }
    ctx.drawImage(moldura, 0, 0, W, H)
  }

  const total = Math.max(1, Math.min(60, Math.round(await duracaoConfiavel(video))))

  rec.start(100)
  // setInterval (não requestAnimationFrame) — desenha ~30fps mesmo se o card
  // não estiver totalmente visível (é o caso do carrossel).
  const desenhar = setInterval(desenhaQuadro, 33)
  desenhaQuadro()

  const t0 = performance.now()

  // Encerra a gravação quando: o vídeo termina; OU ele TRAVA (currentTime parou
  // de avançar por ~2,5s — acontece quando a pessoa rola/sai da aba no iPhone);
  // OU um teto absoluto de 65s. Assim o botão NUNCA fica preso.
  let cancelado = false
  await new Promise<void>((resolve) => {
    let ultimo = -1
    let mudouEm = performance.now()
    const prog = setInterval(() => {
      // Usuário apertou Cancelar: para na hora.
      if (sinal?.aborted) {
        cancelado = true
        clearInterval(prog)
        resolve()
        return
      }
      const ct = video.currentTime
      const decorrido = (performance.now() - t0) / 1000
      const s = Math.round(decorrido)
      aoProgresso?.(video.ended || s >= total ? 'Finalizando…' : `Gravando… ${s}s de ${total}s`)

      if (Math.abs(ct - ultimo) >= 0.02) {
        ultimo = ct
        mudouEm = performance.now()
      }
      const travou = ct > 0.2 && performance.now() - mudouEm > 2500
      if (video.ended || travou || decorrido > 65) {
        clearInterval(prog)
        resolve()
      }
    }, 250)
  })
  clearInterval(desenhar)

  rec.stop()
  // Trava de segurança: se o onstop não disparar, não deixa o botão preso.
  await Promise.race([parou, esperar(5000)])
  video.pause()
  video.muted = muteAntes
  video.loop = loopAntes

  // Cancelado pelo usuário: descarta o que gravou e avisa o rodar (sem erro visível).
  if (cancelado) throw new Error(CANCELADO)

  const blob = new Blob(chunks, { type: mime?.startsWith('video/mp4') ? 'video/mp4' : 'video/webm' })
  const ext = mime?.startsWith('video/mp4') ? 'mp4' : 'webm'
  return { blob, ext }
}

/** Grava o vídeo do card e entrega (compartilhar no celular / baixar no PC). */
export async function baixarVideoDoCard(
  node: HTMLElement,
  nome: string,
  aoProgresso?: (fase: string) => void,
  sinal?: AbortSignal,
): Promise<void> {
  const { blob, ext } = await gerarVideoBlob(node, aoProgresso, sinal)
  await entregarArquivo(blob, `${nome}.${ext}`, nome)
}
