// ============================================================================
// Rascunho automático no navegador (localStorage). Serve para NÃO perder o
// trabalho se a página recarregar, travar, cair a internet ou o navegador
// fechar — o editor volta com tudo preenchido.
//
// Imagens ficam como data URL (grandes). Se estourar a cota do navegador
// (~5 MB), salvamos uma versão SEM as imagens: pelo menos os textos, cores e
// ajustes são preservados. Vídeo vira blob: (não sobrevive ao recarregar) —
// é descartado na restauração.
// ============================================================================

// Remove strings gigantes (data:/blob:) para caber na cota do localStorage.
function enxugar(dado: unknown): unknown {
  return JSON.parse(
    JSON.stringify(dado, (_k, v) =>
      typeof v === 'string' && (v.startsWith('data:') || v.startsWith('blob:')) ? '' : v,
    ),
  )
}

export function salvarRascunho(chave: string, dado: unknown): void {
  try {
    localStorage.setItem(chave, JSON.stringify(dado))
  } catch {
    // Cota estourada (fotos grandes): salva ao menos os textos/ajustes.
    try {
      localStorage.setItem(chave, JSON.stringify(enxugar(dado)))
    } catch {
      /* sem espaço nenhum: desiste silenciosamente */
    }
  }
}

export function lerRascunho<T>(chave: string): T | null {
  try {
    const s = localStorage.getItem(chave)
    return s ? (JSON.parse(s) as T) : null
  } catch {
    return null
  }
}

export function limparRascunho(chave: string): void {
  try {
    localStorage.removeItem(chave)
  } catch {
    /* ignora */
  }
}
