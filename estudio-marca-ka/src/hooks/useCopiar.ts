import { useToast } from '../components/Toast'

// Copiar texto para a área de transferência com aviso (toast) padronizado e
// tratamento de falha. Antes cada tela reimplementava isto e dava o retorno em
// lugares diferentes (às vezes nenhum). `navigator.clipboard` pode rejeitar
// (contexto não seguro / permissão) — nesse caso avisa em vez de falhar mudo.
export function useCopiar() {
  const { mostrar } = useToast()
  return async function copiar(texto: string, msg = 'Link copiado ✓') {
    try {
      await navigator.clipboard.writeText(texto)
      mostrar(msg, 'ok')
    } catch {
      // Fallback antigo (execCommand) para navegadores/contextos sem clipboard API.
      try {
        const ta = document.createElement('textarea')
        ta.value = texto
        ta.style.position = 'fixed'
        ta.style.opacity = '0'
        document.body.appendChild(ta)
        ta.focus()
        ta.select()
        const ok = document.execCommand('copy')
        document.body.removeChild(ta)
        if (!ok) throw new Error('falhou')
        mostrar(msg, 'ok')
      } catch {
        mostrar('Não consegui copiar. Toque e segure o link para copiar à mão.', 'erro')
      }
    }
  }
}
