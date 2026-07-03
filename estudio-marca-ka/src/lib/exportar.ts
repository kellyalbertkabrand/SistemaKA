import { toPng } from 'html-to-image'
import JSZip from 'jszip'

/**
 * Exporta um nó (a arte em tamanho real) para PNG de alta resolução.
 * @param node   elemento da peça (largura real, ex.: 1080px)
 * @param nome   nome do arquivo (sem extensão)
 * @param escala multiplicador de resolução (2 = 2160px de largura)
 */
export async function baixarPng(node: HTMLElement, nome: string, escala = 2): Promise<void> {
  // Garante que as fontes carregaram antes de rasterizar.
  if (document.fonts?.ready) await document.fonts.ready

  const dataUrl = await toPng(node, {
    pixelRatio: escala,
    cacheBust: true,
    // Renderiza no tamanho real do nó, ignorando qualquer transform de preview.
    width: node.offsetWidth,
    height: node.offsetHeight,
    style: { transform: 'none', margin: '0' },
  })

  const a = document.createElement('a')
  a.download = `${nome}.png`
  a.href = dataUrl
  a.click()
}

/**
 * Exporta vários nós (slides do carrossel) para um único .zip de PNGs.
 */
export async function baixarZip(
  itens: { node: HTMLElement; nome: string }[],
  zipNome: string,
  escala = 2,
): Promise<void> {
  if (document.fonts?.ready) await document.fonts.ready

  const zip = new JSZip()
  for (const { node, nome } of itens) {
    const dataUrl = await toPng(node, {
      pixelRatio: escala,
      cacheBust: true,
      width: node.offsetWidth,
      height: node.offsetHeight,
      style: { transform: 'none', margin: '0' },
    })
    zip.file(`${nome}.png`, dataUrl.split(',')[1], { base64: true })
  }

  const blob = await zip.generateAsync({ type: 'blob' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.download = `${zipNome}.zip`
  a.href = url
  a.click()
  URL.revokeObjectURL(url)
}
