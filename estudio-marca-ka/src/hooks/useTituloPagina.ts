import { useEffect } from 'react'

// Sufixo com o nome da KA — todos os links que a gente envia (cadastro,
// contrato, orçamento, portal da VM…) mostram na aba/título "o que é · KA".
export const SUFIXO_KA = 'KA | Inteligência para Marcas'

/**
 * Define o título da página (aba do navegador e nome que aparece ao salvar o
 * link): "Cadastro · KA | Inteligência para Marcas". Restaura o título anterior
 * ao sair da página.
 */
export function useTituloPagina(titulo: string): void {
  useEffect(() => {
    const anterior = document.title
    document.title = titulo ? `${titulo} · ${SUFIXO_KA}` : SUFIXO_KA
    return () => {
      document.title = anterior
    }
  }, [titulo])
}
