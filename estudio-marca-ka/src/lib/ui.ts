// Helpers de interface compartilhados entre as telas — para o sistema parar de
// reimplementar as mesmas coisas de jeitos diferentes em cada lugar.

// Faz um <textarea> crescer sozinho conforme o conteúdo (mostra o texto todo,
// sem barra de rolagem nem cortar numa linha só). Usar como `ref` e no onInput.
export function autoAltura(el: HTMLTextAreaElement | null) {
  if (!el) return
  el.style.height = 'auto'
  el.style.height = `${el.scrollHeight}px`
}

// Salvar em PDF / imprimir usando `nomeArquivo` como nome sugerido do arquivo.
// O navegador usa o document.title como nome do PDF ao "Salvar como PDF", então
// trocamos o título antes de imprimir e restauramos logo depois.
export function imprimirComoPdf(...partes: (string | null | undefined)[]) {
  const nome = partes
    .map((p) => (p ?? '').trim())
    .filter(Boolean)
    .join(' - ')
    // Tira caracteres que atrapalham nome de arquivo.
    .replace(/[\\/:*?"<>|]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  const anterior = document.title
  if (nome) document.title = nome
  window.print()
  window.setTimeout(() => {
    document.title = anterior
  }, 800)
}

// Arredonda para 2 casas (centavos) evitando o erro clássico de ponto flutuante
// (0.1 + 0.2 = 0.30000000000000004). Usar em TODA soma/agregação de dinheiro.
export function arredondar(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100
}

// Soma uma lista de valores em dinheiro com arredondamento de centavos.
export function somarDinheiro(valores: number[]): number {
  return arredondar(valores.reduce((s, v) => s + (Number(v) || 0), 0))
}

// Converte um valor digitado (formato brasileiro) em número de reais.
// Regra determinística p/ resolver ponto vs vírgula: o ÚLTIMO separador é o
// decimal; o outro é milhar. Se só há ponto(s) e o último grupo tem 3 dígitos,
// tratamos como milhar ("1.500" = 1500, "1.234.567" = 1234567). Sanitiza sinal
// (dinheiro aqui é sempre ≥ 0) e arredonda a 2 casas.
//   "1.500" → 1500 · "1.234,56" → 1234.56 · "1500,5" → 1500.5 · "R$ 1,2M"→1.2
export function parseValorBR(entrada: string | number | null | undefined): number {
  if (typeof entrada === 'number') return Number.isFinite(entrada) ? arredondar(Math.max(0, entrada)) : 0
  if (!entrada) return 0
  // mantém só dígitos, ponto e vírgula (tira "R$", espaços, sinal, letras)
  const s = String(entrada).replace(/[^\d.,]/g, '')
  if (!s) return 0

  const lastComma = s.lastIndexOf(',')
  const lastDot = s.lastIndexOf('.')
  let normal: string
  if (lastComma === -1 && lastDot === -1) {
    normal = s
  } else {
    const decPos = Math.max(lastComma, lastDot)
    const decSep = lastComma > lastDot ? ',' : '.'
    const intPart = s.slice(0, decPos).replace(/[.,]/g, '')
    const decPart = s.slice(decPos + 1).replace(/[.,]/g, '')
    // "1.500" / "1.234.567": ponto sozinho + último grupo de 3 dígitos = milhar.
    if (decSep === '.' && lastComma === -1 && decPart.length === 3 && intPart.length >= 1) {
      normal = intPart + decPart
    } else {
      normal = `${intPart}.${decPart}`
    }
  }
  const n = Number(normal)
  return Number.isFinite(n) ? arredondar(Math.max(0, n)) : 0
}

// Data de HOJE no fuso LOCAL, como "YYYY-MM-DD" (evita o off-by-one do UTC
// perto da meia-noite — `toISOString()` é UTC e pula o dia/mês).
export function hojeLocal(): string {
  const d = new Date()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${mm}-${dd}`
}
