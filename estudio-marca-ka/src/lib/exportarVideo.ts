import { toPng } from 'html-to-image'
import { assinarPngDataUrl, metaPadrao, type MetaAssinatura } from './assinatura'
import { entregarArquivo, dataUrlParaBlob } from './exportar'

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
// Retângulo da área de mídia dentro do card, em coordenadas reais (1080px).
function medirJanela(node: HTMLElement) {
  const W = node.offsetWidth
  const H = node.offsetHeight
  const cardRect = node.getBoundingClientRect()
  const frameEl =
    (node.querySelector('.midia-frame') as HTMLElement) ?? (node.querySelector('video') as HTMLElement)
  const fr = frameEl.getBoundingClientRect()
  return {
    x: ((fr.left - cardRect.left) / cardRect.width) * W,
    y: ((fr.top - cardRect.top) / cardRect.height) * H,
    w: (fr.width / cardRect.width) * W,
    h: (fr.height / cardRect.height) * H,
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
): Promise<{ canvas: HTMLCanvasElement; rect: { x: number; y: number; w: number; h: number } }> {
  const W = node.offsetWidth
  const H = node.offsetHeight
  const rect = medirJanela(node)

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
  node.classList.add('moldura-video')
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
    node.classList.remove('moldura-video')
  }
  const img = await carregarImg(molduraUrl)

  const canvas = document.createElement('canvas')
  canvas.width = W * pixelRatio
  canvas.height = H * pixelRatio
  const ctx = canvas.getContext('2d')!
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
  ctx.globalCompositeOperation = 'destination-out'
  roundRect(ctx, rect.x * pixelRatio, rect.y * pixelRatio, rect.w * pixelRatio, rect.h * pixelRatio, 18 * pixelRatio)
  ctx.fill()
  ctx.globalCompositeOperation = 'source-over'
  return { canvas, rect }
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
  const { canvas: moldura, rect } = await molduraComJanela(node, 1, sinal)

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
