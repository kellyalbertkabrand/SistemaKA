import { toPng } from 'html-to-image'
import { assinarPngDataUrl, metaPadrao, type MetaAssinatura } from './assinatura'
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

// Janela da mídia: retângulo (px reais) + forma do recorte. `blobD` é o traçado
// de uma forma orgânica da Shapes (coords 0–1); quando ausente, é um retângulo
// de cantos `radius`.
interface Janela {
  x: number
  y: number
  w: number
  h: number
  radius: number
  blobD?: string
  /** A mídia é o fundo de tela cheia do card (ex.: CTA): as sobreposições já
   *  ficam sobre fundo transparente, então NÃO se perfura a janela. */
  full: boolean
}

// Constrói o caminho da janela (Path2D) já escalado — usado tanto para perfurar
// a moldura quanto para recortar o vídeo. Retângulo arredondado OU forma orgânica.
function caminhoJanela(j: Janela, escala = 1): Path2D {
  const x = j.x * escala
  const y = j.y * escala
  const w = j.w * escala
  const h = j.h * escala
  const p = new Path2D()
  if (j.blobD) {
    // A forma é traçada em coords 0–1 (objectBoundingBox); mapeia para a janela.
    p.addPath(new Path2D(j.blobD), new DOMMatrix([w, 0, 0, h, x, y]))
    return p
  }
  const r = Math.min(j.radius * escala, w / 2, h / 2)
  p.moveTo(x + r, y)
  p.arcTo(x + w, y, x + w, y + h, r)
  p.arcTo(x + w, y + h, x, y + h, r)
  p.arcTo(x, y + h, x, y, r)
  p.arcTo(x, y, x + w, y, r)
  p.closePath()
  return p
}

/**
 * Gera e baixa um vídeo do card: vídeo do cliente na área de mídia +
 * moldura por cima. `node` é a arte em tamanho real (1080px).
 */
// Área da mídia dentro do card, em coordenadas reais (1080px), com a forma do
// recorte (retângulo arredondado da KA / frames da Shapes, ou forma orgânica).
function medirJanela(node: HTMLElement): Janela {
  const W = node.offsetWidth
  const H = node.offsetHeight
  const cardRect = node.getBoundingClientRect()
  const video = node.querySelector('video') as HTMLElement | null
  // A "janela" é o container da mídia: o pai do <video> (`.midia-frame` na KA,
  // `.frame`/`.foto-frame`/`.foto-blob` na Shapes, ou o próprio card no CTA).
  const frameEl =
    video?.parentElement ??
    (node.querySelector('.midia-frame') as HTMLElement) ??
    (video as HTMLElement)
  const fr = frameEl.getBoundingClientRect()

  const cs = getComputedStyle(frameEl)
  const clip = cs.clipPath || (cs as unknown as { webkitClipPath?: string }).webkitClipPath || ''
  const idBlob = clip.match(/#(shape-blob\d)/)?.[1]
  const blobD = idBlob ? FORMAS.find((f) => f.id === idBlob)?.d : undefined
  const radius = parseFloat(cs.borderTopLeftRadius) || 0
  // Fundo de tela cheia: o container da mídia é o próprio card (1º filho do nó).
  const full = frameEl === node.firstElementChild

  return {
    x: ((fr.left - cardRect.left) / cardRect.width) * W,
    y: ((fr.top - cardRect.top) / cardRect.height) * H,
    w: (fr.width / cardRect.width) * W,
    h: (fr.height / cardRect.height) * H,
    radius,
    blobD,
    full,
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
): Promise<{ canvas: HTMLCanvasElement; janela: Janela }> {
  const W = node.offsetWidth
  const H = node.offsetHeight
  const janela = medirJanela(node)

  node.classList.add('moldura-video')
  let molduraUrl: string
  try {
    molduraUrl = await toPng(node, {
      pixelRatio,
      width: W,
      height: H,
      cacheBust: true,
      style: { transform: 'none', margin: '0' },
    })
  } finally {
    node.classList.remove('moldura-video')
  }
  const img = await carregarImg(molduraUrl)

  const canvas = document.createElement('canvas')
  canvas.width = W * pixelRatio
  canvas.height = H * pixelRatio
  const ctx = canvas.getContext('2d')!
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
  // Fundo de tela cheia (CTA): as sobreposições já estão sobre transparente —
  // perfurar apagaria o grafismo/botão/logo. Só perfura molduras com janela.
  if (!janela.full) {
    ctx.globalCompositeOperation = 'destination-out'
    ctx.fill(caminhoJanela(janela, pixelRatio))
    ctx.globalCompositeOperation = 'source-over'
  }
  return { canvas, janela }
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
): Promise<void> {
  if (document.fonts?.ready) await document.fonts.ready
  const { canvas } = await molduraComJanela(node, escala)
  const assinado = assinarPngDataUrl(canvas.toDataURL('image/png'), meta ?? metaPadrao())
  const a = document.createElement('a')
  a.download = `${nome}.png`
  a.href = assinado
  a.click()
}

export async function baixarVideoDoCard(
  node: HTMLElement,
  nome: string,
  aoProgresso?: (fase: string) => void,
): Promise<void> {
  if (!suportaGravacaoVideo()) {
    throw new Error(
      'Este navegador não grava vídeo (comum no iPhone). Use "Baixar moldura (PNG)" e ' +
        'junte com o seu vídeo no CapCut/Instagram.',
    )
  }
  const video = node.querySelector('video') as HTMLVideoElement | null
  if (!video) throw new Error('Este card não tem vídeo.')

  if (document.fonts?.ready) await document.fonts.ready

  const W = node.offsetWidth
  const H = node.offsetHeight

  aoProgresso?.('Preparando a moldura…')
  // Moldura com a janela perfurada — o vídeo aparece por baixo dela.
  const { canvas: moldura, janela: rect } = await molduraComJanela(node, 1)

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

  let parar = false
  function desenha() {
    if (parar) return
    ctx.clearRect(0, 0, W, H)
    const vw = video!.videoWidth
    const vh = video!.videoHeight
    if (vw && vh) {
      const escala = Math.max(rect.w / vw, rect.h / vh)
      const dw = vw * escala
      const dh = vh * escala
      const dx = rect.x + (rect.w - dw) / 2
      const dy = rect.y + (rect.h - dh) / 2
      ctx.save()
      ctx.clip(caminhoJanela(rect, 1))
      ctx.drawImage(video!, dx, dy, dw, dh)
      ctx.restore()
    }
    ctx.drawImage(moldura, 0, 0, W, H)
    requestAnimationFrame(desenha)
  }

  aoProgresso?.('Gravando o vídeo…')
  rec.start(100)
  desenha()

  const dur = Number.isFinite(video.duration) && video.duration > 0 ? Math.min(video.duration, 60) : 8
  await esperar(dur * 1000 + 250)

  parar = true
  rec.stop()
  await parou
  video.pause()
  video.muted = muteAntes
  video.loop = loopAntes

  const blob = new Blob(chunks, { type: mime?.startsWith('video/mp4') ? 'video/mp4' : 'video/webm' })
  const ext = mime?.startsWith('video/mp4') ? 'mp4' : 'webm'
  const a = document.createElement('a')
  a.download = `${nome}.${ext}`
  a.href = URL.createObjectURL(blob)
  a.click()
  setTimeout(() => URL.revokeObjectURL(a.href), 4000)
}
