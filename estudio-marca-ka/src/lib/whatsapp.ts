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

/** Uma variante de mensagem que a KA pode escolher dentro do popup. */
export interface OpcaoMensagem {
  /** Texto curto do botão (ex.: "PIX pessoal"). */
  rotulo: string
  /** A mensagem completa que esse botão aplica. */
  mensagem: string
}

/**
 * Abre um popup próprio com o destinatário e o número da ficha JÁ preenchidos
 * e a mensagem à vista. A KA confere (ou troca o número) e clica em "Abrir
 * WhatsApp" — o wa.me abre a partir desse clique.
 *
 * Se `opcoes` for informado, aparece uma fileira de botões acima da mensagem
 * (ex.: PIX pessoal / PIX empresa); clicar troca o texto na hora. A `mensagem`
 * inicial deve ser a da 1ª opção (ela já vem selecionada).
 */
export function abrirWhatsApp(
  telefone: string | null | undefined,
  mensagem: string,
  destinatario?: string | null,
  opcoes?: OpcaoMensagem[],
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

  const area = document.createElement('textarea')
  area.className = 'wa-box__area'
  area.rows = 9
  area.value = mensagem

  // Botões de variante (ex.: PIX pessoal / PIX empresa). Trocam o texto na hora.
  let seletor: HTMLDivElement | null = null
  if (opcoes && opcoes.length > 1) {
    seletor = document.createElement('div')
    seletor.className = 'wa-box__pix'

    const rotuloOpc = document.createElement('label')
    rotuloOpc.className = 'wa-box__rotulo'
    rotuloOpc.textContent = 'Dados de pagamento na mensagem'

    const chips = document.createElement('div')
    chips.className = 'wa-box__opcoes'
    opcoes.forEach((op, i) => {
      const b = document.createElement('button')
      b.type = 'button'
      b.className = 'wa-chip' + (i === 0 ? ' wa-chip--ativo' : '')
      b.textContent = op.rotulo
      b.addEventListener('click', () => {
        area.value = op.mensagem
        chips.querySelectorAll('.wa-chip').forEach((el) => el.classList.remove('wa-chip--ativo'))
        b.classList.add('wa-chip--ativo')
      })
      chips.append(b)
    })
    seletor.append(rotuloOpc, chips)
  }

  const rotuloMsg = document.createElement('label')
  rotuloMsg.className = 'wa-box__rotulo'
  rotuloMsg.textContent = 'Mensagem (pode editar)'

  const aviso = document.createElement('div')
  aviso.className = 'wa-box__aviso'
  // Se a ficha não tem telefone, avisa (mas dá para digitar aqui mesmo).
  if (!tel) {
    aviso.textContent =
      'Sem telefone na ficha deste cliente — digite o número aqui, ou preencha em Clientes para vir automático.'
  }

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
  box.append(titulo, rotuloTel, input)
  if (seletor) box.append(seletor)
  box.append(rotuloMsg, area, aviso, acoes)
  overlay.append(box)
  document.body.append(overlay)
  input.focus()
}
