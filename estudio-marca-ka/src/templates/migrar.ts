import type { Template, ValoresPeca } from './types'
import { valoresPadrao } from './types'

// ============================================================================
// Ao trocar o template de um slide, aproveita o que a pessoa já preencheu:
// os TEXTOS e as IMAGENS migram para o novo card (na ordem em que aparecem),
// para ela ver o MESMO conteúdo em outro modelo sem redigitar nem reanexar.
// Cores, seleções, estrelas e formas migram quando o campo tem o mesmo id.
// ============================================================================

// Sufixos companheiros de um campo de imagem (tamanho, posição, zoom, tipo).
const SUF_IMG = ['_kind', '_area', '_larg', '_alt', '_x', '_y', '_zoom']

function ehTexto(tipo: string) {
  return tipo === 'texto' || tipo === 'textarea'
}

export function migrarConteudo(
  antigo: Template,
  valoresAnt: ValoresPeca,
  novo: Template,
): ValoresPeca {
  const novoV = valoresPadrao(novo.campos)

  // --- Textos, na ordem ---
  const textosAnt = antigo.campos
    .filter((c) => ehTexto(c.tipo))
    .map((c) => valoresAnt[c.id])
    .filter((v) => typeof v === 'string' && v.trim() !== '')
  const textosNovos = novo.campos.filter((c) => ehTexto(c.tipo))
  textosNovos.forEach((c, i) => {
    if (i < textosAnt.length) novoV[c.id] = textosAnt[i] as string
  })

  // --- Imagens, na ordem (com tamanho/posição/zoom) ---
  const imgsAnt = antigo.campos
    .filter((c) => c.tipo === 'imagem')
    .map((c) => c.id)
    .filter((id) => valoresAnt[id] != null && valoresAnt[id] !== '')
  const imgsNovos = novo.campos.filter((c) => c.tipo === 'imagem')
  imgsAnt.forEach((idAnt, i) => {
    const cNovo = imgsNovos[i]
    if (!cNovo) return
    const val = String(valoresAnt[idAnt])
    const ehVideo =
      valoresAnt[idAnt + '_kind'] === 'video' || val.startsWith('data:video') || val.startsWith('blob:')
    // Não leva vídeo para um card que não aceita vídeo.
    if (ehVideo && !cNovo.aceitaVideo) return
    novoV[cNovo.id] = valoresAnt[idAnt]
    SUF_IMG.forEach((s) => {
      if (valoresAnt[idAnt + s] != null) novoV[cNovo.id + s] = valoresAnt[idAnt + s]
    })
  })

  // --- Demais campos por id idêntico (cor, paleta, select, estrelas, forma) ---
  for (const c of novo.campos) {
    if (
      (c.tipo === 'cor' || c.tipo === 'paleta' || c.tipo === 'select' || c.tipo === 'estrelas' || c.tipo === 'forma') &&
      valoresAnt[c.id] != null
    ) {
      novoV[c.id] = valoresAnt[c.id]
    }
  }

  return novoV
}
