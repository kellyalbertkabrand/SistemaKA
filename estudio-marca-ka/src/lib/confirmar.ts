// Caixa de confirmação PRÓPRIA (DOM), no lugar de window.confirm.
//
// IMPORTANTE: no iPhone/Safari, depois de vários diálogos nativos o navegador
// passa a SUPRIMIR window.confirm ("não mostrar mais alertas") — e ele volta
// `false` sozinho, então "Excluir" não exclui. Este popup próprio não é
// bloqueado. Devolve uma Promise<boolean> (true = confirmou).

export function confirmar(
  mensagem: string,
  opts?: { confirmar?: string; perigo?: boolean },
): Promise<boolean> {
  return new Promise((resolve) => {
    document.getElementById('cf-overlay')?.remove()

    const overlay = document.createElement('div')
    overlay.id = 'cf-overlay'
    overlay.className = 'wa-overlay'

    const box = document.createElement('div')
    box.className = 'wa-box'

    const msg = document.createElement('div')
    msg.className = 'cf-msg'
    msg.textContent = mensagem

    const acoes = document.createElement('div')
    acoes.className = 'wa-box__acoes'

    const cancelar = document.createElement('button')
    cancelar.type = 'button'
    cancelar.className = 'wa-btn wa-btn--ghost'
    cancelar.textContent = 'Cancelar'

    const ok = document.createElement('button')
    ok.type = 'button'
    ok.className = `wa-btn ${opts?.perigo ? 'wa-btn--perigo' : 'wa-btn--go'}`
    ok.textContent = opts?.confirmar ?? 'Confirmar'

    function fechar(v: boolean) {
      overlay.remove()
      document.removeEventListener('keydown', onKey)
      resolve(v)
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') fechar(false)
    }

    ok.addEventListener('click', () => fechar(true))
    cancelar.addEventListener('click', () => fechar(false))
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) fechar(false)
    })
    document.addEventListener('keydown', onKey)

    acoes.append(cancelar, ok)
    box.append(msg, acoes)
    overlay.append(box)
    document.body.append(overlay)
    ok.focus()
  })
}
