// Helpers de interface compartilhados entre as telas — para o sistema parar de
// reimplementar as mesmas coisas de jeitos diferentes em cada lugar.

// Faz um <textarea> crescer sozinho conforme o conteúdo (mostra o texto todo,
// sem barra de rolagem nem cortar numa linha só). Usar como `ref` e no onInput.
export function autoAltura(el: HTMLTextAreaElement | null) {
  if (!el) return
  el.style.height = 'auto'
  el.style.height = `${el.scrollHeight}px`
}

// Converte um valor digitado (formato brasileiro) em número.
// Aceita "1.500,00", "1500,5", "R$ 1.200", "1200.50" etc. — no iPhone a KA
// digita com vírgula e o `Number(...)` cru virava NaN/0.
export function parseValorBR(entrada: string | number | null | undefined): number {
  if (typeof entrada === 'number') return Number.isFinite(entrada) ? entrada : 0
  if (!entrada) return 0
  const limpo = String(entrada).trim().replace(/R\$/gi, '').replace(/\s/g, '')
  if (!limpo) return 0
  // Se tem vírgula, ela é o separador decimal (BR): tira os pontos de milhar.
  const normal = limpo.includes(',')
    ? limpo.replace(/\./g, '').replace(',', '.')
    : limpo
  const n = Number(normal)
  return Number.isFinite(n) ? n : 0
}
