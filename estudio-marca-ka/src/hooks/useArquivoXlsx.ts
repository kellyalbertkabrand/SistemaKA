import { useEffect, useState } from 'react'
import { gerarXlsx, type Celula } from '../lib/xlsx'

/**
 * Deixa a planilha PRONTA antes do clique e devolve uma URL para usar num
 * `<a download>` de verdade.
 *
 * Por que assim: no iPhone (Safari), um download disparado por JavaScript
 * DEPOIS de um `await` perde o "gesto" do toque — o navegador simplesmente
 * ignora e nada acontece (foi o que aconteceu ao exportar um cadastro). Com o
 * arquivo já montado e um link real, o toque baixa o arquivo em qualquer
 * aparelho.
 *
 * A URL é liberada quando os dados mudam ou a tela sai (evita segurar memória).
 */
export function useArquivoXlsx(
  cabecalhos: string[],
  linhas: Celula[][],
  aba = 'Planilha',
): { url: string | null; erro: string | null } {
  const [url, setUrl] = useState<string | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  // Refaz o arquivo quando o conteúdo muda (ex.: a busca filtrou a lista).
  const conteudo = JSON.stringify(linhas)

  useEffect(() => {
    let vivo = true
    let criada: string | null = null
    setUrl(null)
    setErro(null)
    gerarXlsx(cabecalhos, linhas, aba)
      .then((blob) => {
        if (!vivo) return
        criada = URL.createObjectURL(blob)
        setUrl(criada)
      })
      .catch((e) => {
        if (vivo) setErro(e instanceof Error ? e.message : String(e))
      })
    return () => {
      vivo = false
      if (criada) URL.revokeObjectURL(criada)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conteudo, aba])

  return { url, erro }
}
