// ============================================================================
// DADOS DE PAGAMENTO (PIX) da KA — para as mensagens de cobrança.
//
// A KA tem dois recebedores: a conta PESSOAL (PIX por e-mail) e a da EMPRESA
// (PIX pela chave CNPJ). Na hora de enviar a cobrança ela escolhe qual entra
// na mensagem. IMPORTANTE: os rótulos "pessoa física/jurídica" são INTERNOS —
// NUNCA aparecem no texto que vai para o cliente.
// ============================================================================

export interface DadosPix {
  /** Uso interno (rótulo do botão no popup). Não vai na mensagem. */
  chip: string
  banco: string
  favorecido: string
  /** Linha do PIX já pronta para a mensagem (ex.: "Pix: email@..."). */
  linhaPix: string
}

/** Conta pessoal — PIX por e-mail. */
export const PIX_PESSOAL: DadosPix = {
  chip: 'PIX pessoal',
  banco: 'Nubank',
  favorecido: 'Kelly Albert',
  linhaPix: 'Pix: kellyalbertka@gmail.com',
}

/** Conta da empresa — PIX pela chave CNPJ (só números, sem pontos/traço, para
 *  o cliente copiar e colar a chave sem erro). */
export const PIX_EMPRESA: DadosPix = {
  chip: 'PIX empresa',
  banco: 'Nubank',
  favorecido: 'Kelly Albert',
  linhaPix: 'Pix (CNPJ): 15096943000137',
}

// ---- VM ROCKS (parceira) --------------------------------------------------
// A VM também tem as duas contas, e a regra é a MESMA da KA: cobrança com nota
// vai para a empresa; sem nota, para a conta pessoal.
// (Só os dados do PIX ficam aqui — agência, conta e CPF não entram no código,
//  porque o JavaScript do site é público.)

/** VM com nota — PIX pela chave CNPJ. */
export const PIX_VM_EMPRESA: DadosPix = {
  chip: 'VM empresa',
  banco: 'Nubank',
  favorecido: 'Serena Market Ltda',
  linhaPix: 'Pix (CNPJ): 26534647000197',
}

/** VM sem nota — PIX por e-mail. */
export const PIX_VM_PESSOAL: DadosPix = {
  chip: 'VM pessoal',
  banco: 'Nubank',
  favorecido: 'Gabriela Lucato Serra',
  linhaPix: 'Pix: gabriela.lucato@gmail.com',
}

export const PIX_OPCOES: DadosPix[] = [PIX_PESSOAL, PIX_EMPRESA]

/**
 * Ordem dos PIX conforme a cobrança sai COM ou SEM nota fiscal:
 * • com nota  → recebe pela EMPRESA (chave CNPJ);
 * • sem nota  → recebe na conta PESSOAL;
 * • não marcado (undefined/null) → mantém a ordem padrão, a KA escolhe na hora.
 * O primeiro da lista é o que já vem escrito na mensagem.
 */
export function pixPorNota(comNota?: boolean | null): DadosPix[] {
  if (comNota === true) return [PIX_EMPRESA, PIX_PESSOAL]
  if (comNota === false) return [PIX_PESSOAL, PIX_EMPRESA]
  return PIX_OPCOES
}

/**
 * Bloco de pagamento para a mensagem (sem citar física/jurídica — é interno).
 */
export function blocoPix(p: DadosPix): string {
  return ['Dados para pagamento via PIX:', p.banco, p.favorecido, p.linhaPix].join('\n')
}
