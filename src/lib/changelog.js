// Registro de atualizações do sistema (changelog).
// SEMPRE que uma mudança for publicada, adicione um item aqui — de forma
// sucinta e clara para o cliente — e atualize a VERSAO (data da publicação).
// É exibido na página pública /atualizacoes, que pode ser enviada ao cliente.

export const VERSAO = '17/08/2026';

export const CHANGELOG = [
  {
    data: '17/08/2026',
    titulo: 'Downloads no painel do cliente e link por WhatsApp',
    itens: [
      'Painel do cliente: botão para baixar as fotos de cada visita técnica num único arquivo (ZIP), além de um "Baixar todas" com as fotos de todas as visitas de uma vez.',
      'Painel do cliente: botão para baixar os arquivos do projeto (plantas, PDFs) em um único ZIP.',
      'Link do cliente: novo botão "Enviar por WhatsApp" que já monta a mensagem com o nome da obra, o link do acompanhamento e o passo a passo para o cliente salvar o painel como um app na tela inicial (iPhone e Android).',
    ],
  },
  {
    data: '11/08/2026',
    titulo: 'Lançamentos mais fáceis no celular',
    itens: [
      'Cada lançamento (custo) da obra passa a ter o campo Fornecedor: dá para escolher da lista de fornecedores cadastrados ou escrever um novo na hora.',
      'Lista de lançamentos em cartões, sem aquela rolagem para os lados no celular: toque em um lançamento e abre um popup com todas as informações.',
      'Edição do lançamento no popup, com campos grandes — dá para ver o que está digitando.',
      'O fornecedor também aparece na planilha exportada.',
    ],
  },
  {
    data: '08/08/2026',
    titulo: 'Visual, celular e navegação',
    itens: [
      'Versão para celular revisada: menu em tela cheia (estilo app) com botão de fechar, e caixas e textos mais compactos e harmônicos.',
      'Botões padronizados: mesma altura em toda a linha e botão de WhatsApp na cor oficial (verde) com texto branco, em todo o sistema.',
      'Financeiro: resumo geral destacado (soma de todos os clientes) e bloco "Controle de pagamentos" em verde, com o selo "Pagamento realizado".',
      'Página de Atualizações do sistema (esta) e botão de voltar ao início nas páginas.',
    ],
  },
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
    ],
  },
  {
    data: '03/08/2026',
    titulo: 'Reembolso e cadastros',
    itens: [
      'Modelo financeiro: o escritório adianta os fornecedores e o cliente reembolsa + honorário de gestão (percentual por obra).',
      'Marcação de itens pagos direto pelo cliente (não entram no reembolso, mas geram honorário).',
      'Relatório de reembolso por período, com os dados de pagamento (Pix) do escritório.',
      'Link de autocadastro para cliente e fornecedor; edição de fornecedor; campo de endereço.',
      'Relatório do cliente passa a ser baixado como PDF (evita erros de impressão).',
    ],
  },
  {
    data: '24/07/2026',
    titulo: 'Aplicativo no celular',
    itens: [
      'Ícone e nome na tela inicial do celular: o sistema abre como um app, em tela cheia.',
    ],
  },
  {
    data: '23/07/2026',
    titulo: 'Painel do cliente e projeto da obra',
    itens: [
      'Painel do cliente modernizado, em cards, com a seção "Fases da obra".',
      'Fotos das visitas e notas fiscais visíveis para o cliente; a nota abre em tela cheia.',
      'Projeto da obra (link ou arquivo) no painel do arquiteto e do cliente.',
      '"Esqueci minha senha" no login e abertura do painel do cliente em nova aba.',
      'Mais desempenho: a obra abre na hora e as fotos carregam em segundo plano.',
    ],
  },
  {
    data: '22/07/2026',
    titulo: 'Fotos e exportação',
    itens: [
      'Galeria de fotos das visitas com carrossel e download.',
      'Exportação em Excel com os anexos (notas fiscais e fotos); edição de etapas.',
    ],
  },
  {
    data: '21/07/2026',
    titulo: 'Base do sistema',
    itens: [
      'Logo oficial da Schramm no login, na navegação e no painel do cliente.',
      'Tela inicial em menu, com Painel de Obras, Clientes e Fornecedores.',
      'Cadastro de cliente com dados para contrato; anexo de recibo/nota fiscal por lançamento.',
      'Base de dados migrada para o Firebase, deixando o sistema mais estável.',
    ],
  },
];
