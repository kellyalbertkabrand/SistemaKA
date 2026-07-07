import { toPng } from 'html-to-image'

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
  const cands = [
    'video/webm;codecs=vp9,opus',
    'video/webm;codecs=vp8,opus',
    'video/webm',
    'video/mp4',
  ]
  for (const m of cands) if (MediaRecorder.isTypeSupported?.(m)) return m
  return undefined
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

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  const raio = Math.min(r, w / 2, h / 2)
  ctx.beginPath()
  ctx.moveTo(x + raio, y)
  ctx.arcTo(x + w, y, x + w, y + h, raio)
  ctx.arcTo(x + w, y + h, x, y + h, raio)
  ctx.arcTo(x, y + h, x, y, raio)
  ctx.arcTo(x, y, x + w, y, raio)
  ctx.closePath()
}

/**
 * Gera e baixa um vídeo (.webm) do card: vídeo do cliente na área de mídia +
 * moldura da KA por cima. `node` é a arte em tamanho real (1080px).
 */
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

  // Retângulo da área de mídia dentro do card, em coordenadas reais (1080px).
  const cardRect = node.getBoundingClientRect()
  const frameEl = (node.querySelector('.midia-frame') as HTMLElement) ?? video
  const fr = frameEl.getBoundingClientRect()
  const rect = {
    x: ((fr.left - cardRect.left) / cardRect.width) * W,
    y: ((fr.top - cardRect.top) / cardRect.height) * H,
    w: (fr.width / cardRect.width) * W,
    h: (fr.height / cardRect.height) * H,
  }

  aoProgresso?.('Preparando a moldura…')
  // Moldura = a arte com a janela do vídeo transparente.
  node.classList.add('moldura-video')
  let molduraUrl: string
  try {
    molduraUrl = await toPng(node, {
      pixelRatio: 1,
      width: W,
      height: H,
      cacheBust: true,
      style: { transform: 'none', margin: '0' },
    })
  } finally {
    node.classList.remove('moldura-video')
  }
  const moldura = await carregarImg(molduraUrl)

  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')!

  const stream = canvas.captureStream(30)
  // Junta o áudio do vídeo, se existir.
  try {
    const anyVideo = video as HTMLVideoElement & {
      captureStream?: () => MediaStream
      mozCaptureStream?: () => MediaStream
    }
    const vs = anyVideo.captureStream?.() ?? anyVideo.mozCaptureStream?.()
    vs?.getAudioTracks().forEach((t) => stream.addTrack(t))
  } catch {
    /* sem áudio, tudo bem */
  }

  const mime = escolherMime()
  const rec = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined)
  const chunks: BlobPart[] = []
  rec.ondataavailable = (e) => {
    if (e.data && e.data.size) chunks.push(e.data)
  }
  const parou = new Promise<void>((res) => {
    rec.onstop = () => res()
  })

  // Toca o vídeo do começo e desenha cada quadro.
  video.currentTime = 0
  video.muted = true
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
      roundRect(ctx, rect.x, rect.y, rect.w, rect.h, 18)
      ctx.clip()
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

  const blob = new Blob(chunks, { type: mime?.startsWith('video/mp4') ? 'video/mp4' : 'video/webm' })
  const ext = mime?.startsWith('video/mp4') ? 'mp4' : 'webm'
  const a = document.createElement('a')
  a.download = `${nome}.${ext}`
  a.href = URL.createObjectURL(blob)
  a.click()
  setTimeout(() => URL.revokeObjectURL(a.href), 4000)
}
