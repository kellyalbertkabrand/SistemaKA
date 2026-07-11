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
 * Abre o WhatsApp com a mensagem pronta. Mostra uma confirmação com o nome do
 * destinatário e o número da ficha JÁ PREENCHIDO — é só dar OK (ou trocar o
 * número ali mesmo, se quiser enviar a outra pessoa). Devolve true se abriu.
 */
export function abrirWhatsApp(
  telefone: string | null | undefined,
  mensagem: string,
  destinatario?: string | null,
): boolean {
  // Abre a aba AGORA, ainda dentro do clique — depois do prompt o navegador
  // (principalmente o Safari do iPhone) bloquearia o pop-up silenciosamente.
  const aba = window.open('', '_blank')

  const tel = telefone?.trim() ?? ''
  const quem = destinatario?.trim()
  const digitado = window.prompt(
    (quem ? `Enviar WhatsApp para ${quem}.\n` : 'Enviar WhatsApp.\n') +
      (tel
        ? 'Confirme o número (OK) ou troque para enviar a outra pessoa:'
        : 'Sem telefone na ficha — digite o número (com DDD, ex.: 41 99999-0000):'),
    tel,
  )
  if (digitado === null) {
    aba?.close()
    return false
  }
  const numero = telefoneParaWa(digitado)
  if (!numero) {
    aba?.close()
    window.alert('Número inválido — use DDD + número (ex.: 41 99999-0000).')
    return false
  }

  const url = `https://wa.me/${numero}?text=${encodeURIComponent(mensagem)}`
  if (aba) {
    aba.location.href = url
  } else {
    // Pop-up bloqueado mesmo assim: navega na própria aba (o Voltar retorna).
    window.location.href = url
  }
  return true
}

/** Primeiro nome, para a mensagem soar pessoal. */
export function primeiroNome(nome: string | null | undefined): string {
  return (nome ?? '').trim().split(/\s+/)[0] || ''
}
