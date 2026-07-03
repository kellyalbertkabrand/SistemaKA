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
