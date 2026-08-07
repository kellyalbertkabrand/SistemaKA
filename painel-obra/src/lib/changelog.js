// Registro de atualizações do sistema (changelog).
// SEMPRE que uma mudança for publicada, adicione um item aqui — de forma
// sucinta e clara para o cliente — e atualize a VERSAO (data da publicação).
// É exibido na página pública /atualizacoes, que pode ser enviada ao cliente.

export const VERSAO = '06/08/2026';

export const CHANGELOG = [
  {
    data: '06/08/2026',
    titulo: 'Financeiro e cobrança',
    itens: [
      'Nova aba Financeiro: total a pagar, recebido e saldo de cada obra num só lugar, com o resumo geral de todos os clientes.',
      'Controle de pagamentos por obra: registro dos recebimentos, com destaque em verde e selo "Pagamento realizado".',
      'Relatório de reembolso do cliente em PDF e em Excel, por período ou completo.',
      'Botão de WhatsApp nos clientes e fornecedores, abrindo a conversa já com uma saudação.',
      'Fornecedor: campo Vendedor (contato) e campo CPF/CNPJ.',
      'Máscaras automáticas de CPF/CNPJ e telefone, e verificação de e-mail com sugestão de correção.',
      'Backup completo (planilhas + fotos + notas fiscais + arquivo técnico) e opção de importar; backup automático no banco de dados.',
      'Painel do cliente mais enxuto, com o controle de pagamentos espelhado.',
      'Esta página de Atualizações do sistema, para acompanhar as melhorias contínuas.',
    ],
  },
  {
    data: '03/08/2026',
    titulo: 'Cadastros e relatório',
    itens: [
      'Link de autocadastro para o cliente e para o fornecedor preencherem os próprios dados.',
      'Percentual de gestão do escritório por obra, com o honorário no relatório.',
      'Edição de fornecedor, remoção de arquivos e dados de pagamento (Pix) no relatório.',
      'Relatório do cliente passa a ser baixado como PDF (evita erros de impressão).',
    ],
  },
];
