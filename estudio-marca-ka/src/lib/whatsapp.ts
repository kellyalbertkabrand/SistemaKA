// WhatsApp via link oficial wa.me (Caminho 1 — sem API paga).
// O sistema monta a mensagem pronta e abre a conversa no WhatsApp da KA;
// ela só confere e envia. Usa o telefone da ficha do cliente.
//
// IMPORTANTE: NÃO usamos window.prompt para confirmar o número — no celular
// (iPhone/Safari sobretudo) o prompt é suprimido e "não acontece nada". Em vez
// disso montamos um popup próprio (DOM), e o envio sai de um clique real de
// botão dentro dele — assim nenhum navegador bloqueia a abertura do WhatsApp.

/** Converte o telefone da ficha em número wa.me (só dígitos, com DDI 55). */
export function telefoneParaWa(telefone: string): string | null {
  const d = telefone.replace(/\D/g, '')
  if (d.length === 10 || d.length === 11) return `55${d}` // DDD + número (BR)
  if (d.length === 12 || d.length === 13) return d // já veio com DDI
  return null
}

/** Primeiro nome, para a mensagem soar pessoal. */
export function primeiroNome(nome: string | null | undefined): string {
  return (nome ?? '').trim().split(/\s+/)[0] || ''
}

/**
 * Abre um popup próprio com o destinatário e o número da ficha JÁ preenchidos
 * e a mensagem à vista. A KA confere (ou troca o número) e clica em "Abrir
 * WhatsApp" — o wa.me abre a partir desse clique.
 */
export function abrirWhatsApp(
  telefone: string | null | undefined,
  mensagem: string,
  destinatario?: string | null,
): void {
  const tel = (telefone ?? '').trim()
  const quem = (destinatario ?? '').trim()

  // Remove um popup anterior, se houver.
  document.getElementById('wa-overlay')?.remove()

  const overlay = document.createElement('div')
  overlay.id = 'wa-overlay'
  overlay.className = 'wa-overlay'

  const box = document.createElement('div')
  box.className = 'wa-box'

  const titulo = document.createElement('div')
  titulo.className = 'wa-box__titulo'
  titulo.textContent = quem ? `Enviar WhatsApp para ${quem}` : 'Enviar WhatsApp'

  const rotuloTel = document.createElement('label')
  rotuloTel.className = 'wa-box__rotulo'
  rotuloTel.textContent = 'Número (com DDD)'

  const input = document.createElement('input')
  input.className = 'wa-box__input'
  input.type = 'tel'
  input.value = tel
  input.placeholder = 'ex.: 41 99999-0000'

  const rotuloMsg = document.createElement('label')
  rotuloMsg.className = 'wa-box__rotulo'
  rotuloMsg.textContent = 'Mensagem (pode editar)'

  const area = document.createElement('textarea')
  area.className = 'wa-box__area'
  area.rows = 7
  area.value = mensagem

  const aviso = document.createElement('div')
  aviso.className = 'wa-box__aviso'

  const acoes = document.createElement('div')
  acoes.className = 'wa-box__acoes'

  const cancelar = document.createElement('button')
  cancelar.type = 'button'
  cancelar.className = 'wa-btn wa-btn--ghost'
  cancelar.textContent = 'Cancelar'

  const enviar = document.createElement('button')
  enviar.type = 'button'
  enviar.className = 'wa-btn wa-btn--go'
  enviar.textContent = 'Abrir WhatsApp'

  function fechar() {
    overlay.remove()
    document.removeEventListener('keydown', onKey)
  }
  function onKey(e: KeyboardEvent) {
    if (e.key === 'Escape') fechar()
  }

  enviar.addEventListener('click', () => {
    const numero = telefoneParaWa(input.value)
    if (!numero) {
      aviso.textContent = 'Número inválido. Use DDD + número (ex.: 41 99999-0000).'
      input.focus()
      return
    }
    const url = `https://wa.me/${numero}?text=${encodeURIComponent(area.value)}`
    // Clique real do usuário: a abertura não é bloqueada.
    window.open(url, '_blank', 'noopener')
    fechar()
  })
  cancelar.addEventListener('click', fechar)
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) fechar()
  })
  document.addEventListener('keydown', onKey)

  acoes.append(cancelar, enviar)
  box.append(titulo, rotuloTel, input, rotuloMsg, area, aviso, acoes)
  overlay.append(box)
  document.body.append(overlay)
  input.focus()
}
