import { toPng } from 'html-to-image'
import JSZip from 'jszip'
import { assinarPngDataUrl, metaPadrao, type MetaAssinatura } from './assinatura'

const OPCOES_PNG = {
  pixelRatio: 2,
  cacheBust: true,
  style: { transform: 'none', margin: '0' },
} as const

/**
 * Exporta um nó (a arte em tamanho real) para PNG de alta resolução, já
 * assinado com os metadados do Estúdio de Marca — KA.
 * @param node   elemento da peça (largura real, ex.: 1080px)
 * @param nome   nome do arquivo (sem extensão)
 * @param escala multiplicador de resolução (2 = 2160px de largura)
 * @param meta   metadados de assinatura (autor/URL/cliente/título)
 */
export async function baixarPng(
  node: HTMLElement,
  nome: string,
  escala = 2,
  meta?: MetaAssinatura,
): Promise<void> {
  // Garante que as fontes carregaram antes de rasterizar.
  if (document.fonts?.ready) await document.fonts.ready

  const dataUrl = await toPng(node, {
    ...OPCOES_PNG,
    pixelRatio: escala,
    // Renderiza no tamanho real do nó, ignorando qualquer transform de preview.
    width: node.offsetWidth,
    height: node.offsetHeight,
  })

  const assinado = assinarPngDataUrl(dataUrl, meta ?? metaPadrao())

  const a = document.createElement('a')
  a.download = `${nome}.png`
  a.href = assinado
  a.click()
}

// Formatos de gravação, do melhor para o fallback. MP4 (H.264/AAC) é o que o
// Instagram aceita direto; WebM sai como último recurso (Chrome antigo).
const MIMES_VIDEO = [
  'video/mp4;codecs=avc1.640028,mp4a.40.2',
  'video/mp4;codecs=avc1.42E01E,mp4a.40.2',
  'video/mp4',
  'video/webm;codecs=vp9,opus',
  'video/webm',
]

/**
 * Exporta o card como VÍDEO (arte parada + vídeo rodando na moldura + áudio
 * original), gravado em tempo real no navegador. Usado pelo card de notícias
 * da KA quando o campo de mídia recebe um vídeo.
 *
 * @param node          nó da arte em tamanho real (ex.: 1080×1350)
 * @param videoUrl      object URL do vídeo carregado no campo de mídia
 * @param nome          nome do arquivo (sem extensão)
 * @param onProgresso   callback com os segundos já gravados (UI)
 * @param frameSelector seletor da moldura da mídia dentro do nó
 * @param radius        raio dos cantos da moldura (px na arte real)
 * @returns extensão do arquivo gerado ('mp4' ou 'webm')
 */
export async function baixarMp4(
  node: HTMLElement,
  videoUrl: string,
  nome: string,
  onProgresso?: (segundos: number) => void,
  frameSelector = '.midia-frame',
  radius = 18,
): Promise<'mp4' | 'webm'> {
  if (document.fonts?.ready) await document.fonts.ready

  const largura = node.offsetWidth
  const altura = node.offsetHeight

  // 1 · A arte parada (com a capa na moldura — o vídeo é desenhado por cima).
  const baseUrl = await toPng(node, { ...OPCOES_PNG, pixelRatio: 1, width: largura, height: altura })
  const base = new Image()
  await new Promise((res, rej) => {
    base.onload = res
    base.onerror = rej
    base.src = baseUrl
  })

  // 2 · Posição real da moldura dentro do card (independe da escala do preview).
  const frameEl = node.querySelector(frameSelector)
  if (!frameEl) throw new Error('Moldura da mídia não encontrada no card.')
  const nr = node.getBoundingClientRect()
  const fr = frameEl.getBoundingClientRect()
  const escala = nr.width / largura
  const fx = (fr.x - nr.x) / escala
  const fy = (fr.y - nr.y) / escala
  const fw = fr.width / escala
  const fh = fr.height / escala

  // 3 · Vídeo + áudio. O áudio vai por AudioContext direto para a gravação
  //     (sem tocar nas caixas de som durante o export).
  const video = document.createElement('video')
  video.src = videoUrl
  video.playsInline = true
  await new Promise((res, rej) => {
    video.oncanplaythrough = res
    video.onerror = () => rej(new Error('Não consegui reproduzir o vídeo.'))
    video.load()
  })

  const audioCtx = new AudioContext()
  const fonte = audioCtx.createMediaElementSource(video)
  const destino = audioCtx.createMediaStreamDestination()
  fonte.connect(destino)

  // 4 · Canvas compositor: arte + vídeo recortado com cantos arredondados.
  const canvas = document.createElement('canvas')
  canvas.width = largura
  canvas.height = altura
  const ctx = canvas.getContext('2d')!

  function desenhar() {
    ctx.drawImage(base, 0, 0, largura, altura)
    ctx.save()
    ctx.beginPath()
    ctx.roundRect(fx, fy, fw, fh, radius)
    ctx.clip()
    // cover: o vídeo preenche a moldura mantendo proporção
    const vw = video.videoWidth || 1
    const vh = video.videoHeight || 1
    const s = Math.max(fw / vw, fh / vh)
    ctx.drawImage(video, fx + (fw - vw * s) / 2, fy + (fh - vh * s) / 2, vw * s, vh * s)
    ctx.restore()
  }
  desenhar()

  const stream = canvas.captureStream(30)
  for (const t of destino.stream.getAudioTracks()) stream.addTrack(t)

  const mime = MIMES_VIDEO.find((m) => MediaRecorder.isTypeSupported(m))
  if (!mime) throw new Error('Este navegador não suporta gravação de vídeo.')
  const ext: 'mp4' | 'webm' = mime.startsWith('video/mp4') ? 'mp4' : 'webm'
  const recorder = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 8_000_000 })
  const pedacos: Blob[] = []
  recorder.ondataavailable = (e) => e.data.size && pedacos.push(e.data)

  // 5 · Grava em tempo real, do início ao fim do vídeo.
  await new Promise<void>((resolve, reject) => {
    let vivo = true
    recorder.onstop = () => {
      vivo = false
      resolve()
    }
    recorder.onerror = () => reject(new Error('Falha na gravação do vídeo.'))
    video.onended = () => {
      desenhar()
      setTimeout(() => recorder.state !== 'inactive' && recorder.stop(), 120)
    }
    function loop() {
      if (!vivo) return
      desenhar()
      onProgresso?.(Math.floor(video.currentTime))
      requestAnimationFrame(loop)
    }
    recorder.start(500)
    video.currentTime = 0
    video
      .play()
      .then(() => requestAnimationFrame(loop))
      .catch(reject)
  })
  audioCtx.close()

  const blob = new Blob(pedacos, { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.download = `${nome}.${ext}`
  a.href = url
  a.click()
  URL.revokeObjectURL(url)
  return ext
}

/**
 * Exporta vários nós (slides do carrossel) para um único .zip de PNGs assinados.
 */
export async function baixarZip(
  itens: { node: HTMLElement; nome: string }[],
  zipNome: string,
  escala = 2,
  meta?: MetaAssinatura,
): Promise<void> {
  if (document.fonts?.ready) await document.fonts.ready

  const assinatura = meta ?? metaPadrao()
  const zip = new JSZip()
  for (const { node, nome } of itens) {
    const dataUrl = await toPng(node, {
      ...OPCOES_PNG,
      pixelRatio: escala,
      width: node.offsetWidth,
      height: node.offsetHeight,
    })
    const assinado = assinarPngDataUrl(dataUrl, assinatura)
    zip.file(`${nome}.png`, assinado.split(',')[1], { base64: true })
  }

  const blob = await zip.generateAsync({ type: 'blob' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.download = `${zipNome}.zip`
  a.href = url
  a.click()
  URL.revokeObjectURL(url)
}
