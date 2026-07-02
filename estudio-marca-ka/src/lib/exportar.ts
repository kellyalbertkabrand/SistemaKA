import { toPng } from 'html-to-image'

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
