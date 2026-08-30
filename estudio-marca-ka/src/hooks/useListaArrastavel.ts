import { useArrastarCartoes } from './useArrastarCartoes'

// ============================================================================
// LISTA SIMPLES QUE SE ARRASTA (uma coluna só).
//
// É o caso mais comum do sistema: uma lista em pé (sócios, pagamentos do
// contrato, itens do orçamento, etapas do projeto) onde a pessoa quer só
// mudar a ordem — segurar com o dedo e levar para cima ou para baixo.
// Nada de setas ▲▼.
//
// Como usar na tela:
//
//   const arr = useListaArrastavel(lista.length, reordenar)
//   <div {...arr.lista()}>
//     {lista.map((x, i) => {
//       const it = arr.item(i)
//       return (
//         <div key={i} ref={it.ref} onPointerDown={it.onPointerDown}
//              className={`meu-card ${it.classe}`} style={it.style}>
//           <span {...arr.alca()}>⠿</span>
//           …
//         </div>
//       )
//     })}
//   </div>
//
// (`item(i)` NÃO é para espalhar com {...}: `classe` e `style` entram à mão,
// junto com as classes/estilos que a tela já tem.)
//
// Botões e campos de texto de dentro do cartão levam `data-nao-arrasta`
// (assim continuam funcionando com um toque normal).
// ============================================================================

export function useListaArrastavel(
  total: number,
  /** Tira o item da posição `de` e coloca na posição `para`. */
  aoReordenar: (de: number, para: number) => void,
  ativo = true,
) {
  const arrastar = useArrastarCartoes<'lista'>({
    colunas: ['lista'],
    itensDaColuna: () => Array.from({ length: total }, (_, i) => String(i)),
    ativo,
    aoSoltar: (de, _origem, _para, antesDe) =>
      aoReordenar(Number(de), antesDe === null ? total - 1 : Number(antesDe)),
  })

  return {
    /** Props do contêiner da lista. */
    lista: () => ({ ref: (el: HTMLElement | null) => arrastar.registrarColuna('lista', el) }),

    /** Props de um item (a `classe` entra junto com as classes da tela). */
    item: (i: number) => {
      const chave = String(i)
      const puxando = arrastar.arrastando === chave
      const alvo = arrastar.alvo === chave && arrastar.arrastando !== null && !puxando
      return {
        ref: (el: HTMLElement | null) => arrastar.registrarCartao(chave, el),
        onPointerDown: (e: React.PointerEvent<HTMLElement>) =>
          arrastar.aoPressionar(e, 'lista', chave),
        classe: `arr-item ${puxando ? 'arr--puxando' : ''} ${alvo ? 'arr--alvo' : ''}`.trim(),
        style: puxando
          ? {
              transform: `translate(${arrastar.desloc.x}px, ${arrastar.desloc.y}px)`,
              zIndex: 20,
            }
          : undefined,
      }
    },

    /** Props da alcinha ⠿ (pega na hora, sem precisar segurar). */
    alca: () => ({
      className: 'arr-alca',
      title: 'Segure e arraste para mudar a ordem',
      'data-alca': true,
      'aria-hidden': true,
    }),

    /** true logo depois de soltar — ignore o clique que vem junto. */
    acabouDeArrastar: arrastar.acabouDeArrastar,
  }
}
