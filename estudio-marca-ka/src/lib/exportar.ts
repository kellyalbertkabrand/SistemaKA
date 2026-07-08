import { toPng } from 'html-to-image'
import JSZip from 'jszip'
import { assinarPngDataUrl, metaPadrao, type MetaAssinatura } from './assinatura'

const OPCOES_PNG = {
  pixelRatio: 2,
  cacheBust: true,
  style: { transform: 'none', margin: '0' },
} as const

const EH_SAFARI =
  typeof navigator !== 'undefined' &&
  (/^((?!chrome|android).)*safari/i.test(navigator.userAgent) ||
    /iP(hone|ad|od)/i.test(navigator.userAgent))

/** Espera todas as imagens do nó terminarem de decodificar. */
async function esperarImagens(node: HTMLElement): Promise<void> {
  const imgs = Array.from(node.querySelectorAll('img'))
  await Promise.all(
    imgs.map((img) =>
      img.complete && img.naturalWidth > 0 ? Promise.resolve() : img.decode().catch(() => undefined),
    ),
  )
}

/**
 * Rasteriza o nó em PNG. No Safari/iPhone a PRIMEIRA rasterização costuma sair
 * SEM as imagens (o <img> dentro do foreignObject ainda não carregou) — por
 * isso fazemos uma passada de "aquecimento" e só usamos a segunda. É o que
 * fazia a foto sumir do PNG salvo no celular.
 */
export async function rasterizarPng(
  node: HTMLElement,
  opts: Parameters<typeof toPng>[1],
): Promise<string> {
  if (document.fonts?.ready) await document.fonts.ready
  await esperarImagens(node)
  if (EH_SAFARI) {
    await toPng(node, opts).catch(() => undefined)
    await new Promise((r) => setTimeout(r, 150))
    await esperarImagens(node)
  }
  return toPng(node, opts)
}

/**
 * Exporta um nó (a arte em tamanho real) para PNG de alta resolução, já
 * assinado com os metadados do Estúdio de Marca — KA.
 * @param node   elemento da peça (largura real, ex.: 1080px)
 * @param nome   nome do arquivo (sem extensão)
 * @param escala multiplicador de resolução (2 = 2160px de largura)
 * @param meta   metadados de assinatura (autor/URL/cliente/título)
 */
/**
 * Entrega o arquivo ao usuário. No CELULAR abre a folha de compartilhar
 * (Web Share com arquivo) — no iPhone isso mostra "Salvar Imagem"/"Salvar
 * Vídeo" e vai direto para o rolo/Fotos (o download por link não funciona no
 * Safari). No computador, faz o download normal na pasta Downloads.
 */
export async function entregarArquivo(blob: Blob, nomeArquivo: string, titulo: string): Promise<void> {
  const nav = navigator as Navigator & {
    canShare?: (data?: unknown) => boolean
    share?: (data?: unknown) => Promise<void>
  }
  const mobile = typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches
  if (mobile && nav.canShare && nav.share) {
    const file = new File([blob], nomeArquivo, { type: blob.type || 'application/octet-stream' })
    if (nav.canShare({ files: [file] })) {
      try {
        await nav.share({ files: [file], title: titulo })
        return
      } catch (e) {
        if ((e as Error).name === 'AbortError') return // usuário cancelou
        // qualquer outro erro: cai no download por link abaixo
      }
    }
  }
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.download = nomeArquivo
  a.href = url
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 4000)
}

/** Converte um data URL (ex.: PNG assinado) em Blob. */
export async function dataUrlParaBlob(dataUrl: string): Promise<Blob> {
  return (await fetch(dataUrl)).blob()
}

export async function baixarPng(
  node: HTMLElement,
  nome: string,
  escala = 2,
  meta?: MetaAssinatura,
): Promise<void> {
  const dataUrl = await rasterizarPng(node, {
    ...OPCOES_PNG,
    pixelRatio: escala,
    // Renderiza no tamanho real do nó, ignorando qualquer transform de preview.
    width: node.offsetWidth,
    height: node.offsetHeight,
  })

  const assinado = assinarPngDataUrl(dataUrl, meta ?? metaPadrao())
  await entregarArquivo(await dataUrlParaBlob(assinado), `${nome}.png`, nome)
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
    const dataUrl = await rasterizarPng(node, {
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

/**
 * Salva TODAS as imagens de uma vez. No CELULAR (iPhone e Android) abre a folha
 * de compartilhar com todos os PNGs, onde aparece "Salvar N imagens" e vai para
 * o rolo/Fotos (o ZIP era difícil de salvar no celular). No computador, baixa
 * um único ZIP com todas. Devolve como foi entregue.
 */
export async function salvarTodasImagens(
  itens: { node: HTMLElement; nome: string }[],
  nomeBase: string,
  escala = 2,
  meta?: MetaAssinatura,
): Promise<'compartilhado' | 'zip'> {
  if (document.fonts?.ready) await document.fonts.ready
  const assinatura = meta ?? metaPadrao()

  const arquivos: { nome: string; blob: Blob }[] = []
  for (const { node, nome } of itens) {
    const dataUrl = await rasterizarPng(node, {
      ...OPCOES_PNG,
      pixelRatio: escala,
      width: node.offsetWidth,
      height: node.offsetHeight,
    })
    const assinado = assinarPngDataUrl(dataUrl, assinatura)
    arquivos.push({ nome: `${nome}.png`, blob: await dataUrlParaBlob(assinado) })
  }

  const nav = navigator as Navigator & {
    canShare?: (data?: unknown) => boolean
    share?: (data?: unknown) => Promise<void>
  }
  const mobile = typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches
  if (mobile && nav.canShare && nav.share) {
    const files = arquivos.map((a) => new File([a.blob], a.nome, { type: 'image/png' }))
    if (nav.canShare({ files })) {
      try {
        await nav.share({ files, title: nomeBase })
        return 'compartilhado'
      } catch (e) {
        if ((e as Error).name === 'AbortError') return 'compartilhado'
      }
    }
  }

  // Computador (ou sem compartilhar): um único ZIP.
  const zip = new JSZip()
  arquivos.forEach((a) => zip.file(a.nome, a.blob))
  const blob = await zip.generateAsync({ type: 'blob' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.download = `${nomeBase}.zip`
  a.href = url
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 4000)
  return 'zip'
}
