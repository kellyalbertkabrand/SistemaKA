// ============================================================================
// PORTAL DA VM ROCKS — link só-leitura para a parceira.
//
// Enquanto o "modo seguro" (login por papel) não entra, a VM acessa por um
// LINK limpo (/vm-rocks): uma página que mostra SÓ o que é dela (as tarefas
// dela nos projetos + o que ela tem a receber). Nada do resto (clientes, caixa
// da KA, cuidadoras…) aparece na tela.
//
// A URL é fixa e amigável a pedido da KA. A separação de verdade (a VM só
// conseguir BAIXAR o que é dela) virá com o login por papel + regras do
// Firestore (modo seguro).
// ============================================================================

export const CAMINHO_PORTAL_VM = 'vm-rocks'

export function linkPortalVM(): string {
  return `${window.location.origin}/${CAMINHO_PORTAL_VM}`
}
