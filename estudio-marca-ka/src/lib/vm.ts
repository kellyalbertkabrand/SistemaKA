// ============================================================================
// PORTAL DA VM ROCKS — link só-leitura para a parceira.
//
// Enquanto o "modo seguro" (login por papel) não entra, a VM acessa por um
// LINK com token: uma página que mostra SÓ o que é dela (as tarefas dela nos
// projetos + o que ela tem a receber). Nada do resto (clientes, caixa da KA,
// cuidadoras…) aparece na tela.
//
// O token abaixo é uma constante: para REVOGAR o link, basta trocá-lo aqui e
// publicar de novo (o link antigo para de valer). Não é um segredo forte — a
// separação de verdade virá com o login por papel (regras do Firestore).
// ============================================================================

export const TOKEN_PORTAL_VM = 'vm-rocks-4b7f2e9a8c1d6035'

export function linkPortalVM(): string {
  return `${window.location.origin}/vm/${TOKEN_PORTAL_VM}`
}
