// WhatsApp via link oficial wa.me (Caminho 1 — sem API paga).
// O sistema monta a mensagem pronta e abre a conversa no WhatsApp da KA;
// ela só confere e aperta enviar. Usa o telefone da ficha do cliente.

/** Converte o telefone da ficha em número wa.me (só dígitos, com DDI 55). */
export function telefoneParaWa(telefone: string): string | null {
  const d = telefone.replace(/\D/g, '')
  if (d.length === 10 || d.length === 11) return `55${d}` // DDD + número (BR)
  if (d.length === 12 || d.length === 13) return d // já veio com DDI
  return null
}

/**
 * Abre o WhatsApp com a mensagem pronta. Se o telefone estiver vazio ou
 * inválido, pede o número na hora (com DDD). Devolve true se abriu.
 */
export function abrirWhatsApp(telefone: string | null | undefined, mensagem: string): boolean {
  let tel = telefone?.trim() ?? ''
  if (!tel || !telefoneParaWa(tel)) {
    const digitado = window.prompt(
      'WhatsApp do cliente (com DDD, ex.: 41 99999-0000):',
      tel,
    )
    if (digitado === null) return false
    tel = digitado
  }
  const numero = telefoneParaWa(tel)
  if (!numero) {
    window.alert('Número inválido — confira o DDD (ex.: 41 99999-0000).')
    return false
  }
  window.open(`https://wa.me/${numero}?text=${encodeURIComponent(mensagem)}`, '_blank', 'noopener')
  return true
}

/** Primeiro nome, para a mensagem soar pessoal. */
export function primeiroNome(nome: string | null | undefined): string {
  return (nome ?? '').trim().split(/\s+/)[0] || ''
}
