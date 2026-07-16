// ============================================================================
// DADOS DE PAGAMENTO (PIX) da KA — para as mensagens de cobrança.
//
// A KA tem dois recebedores: a conta PESSOAL (PIX por e-mail) e a da EMPRESA
// (PIX pela chave CNPJ). Na hora de enviar a cobrança ela escolhe qual entra
// na mensagem. IMPORTANTE: os rótulos "pessoa física/jurídica" são INTERNOS —
// NUNCA aparecem no texto que vai para o cliente.
// ============================================================================

import { formatarDocumento } from './documento'

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

/** Conta da empresa — PIX pela chave CNPJ (formatada). */
export const PIX_EMPRESA: DadosPix = {
  chip: 'PIX empresa',
  banco: 'Nubank',
  favorecido: 'Kelly Albert',
  linhaPix: `Pix (CNPJ): ${formatarDocumento('15096943000137')}`,
}

export const PIX_OPCOES: DadosPix[] = [PIX_PESSOAL, PIX_EMPRESA]

/**
 * Bloco de pagamento para a mensagem (sem citar física/jurídica — é interno).
 */
export function blocoPix(p: DadosPix): string {
  return ['Dados para pagamento via PIX:', p.banco, p.favorecido, p.linhaPix].join('\n')
}
