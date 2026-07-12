import { useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'

// Guarda na URL qual registro está aberto (?<chave>=<id>), preservando os
// outros parâmetros (?aba=). Assim:
//  - F5 / atualizar a página REABRE a ficha (não cai na lista);
//  - o "voltar" do navegador FECHA a ficha (não sai da seção);
//  - a ficha vira um link compartilhável.
// abrir() empilha no histórico (Back fecha); fechar() substitui (não polui).
export function useFichaUrl(chave = 'id') {
  const [params, setParams] = useSearchParams()
  const idAberto = params.get(chave)

  const abrir = useCallback(
    (id: string) => {
      const p = new URLSearchParams(params)
      p.set(chave, id)
      setParams(p)
    },
    [params, setParams, chave],
  )

  const fechar = useCallback(() => {
    const p = new URLSearchParams(params)
    p.delete(chave)
    setParams(p, { replace: true })
  }, [params, setParams, chave])

  return { idAberto, abrir, fechar }
}
