// Configuração da marca do cliente — Schramm Arquitetura e Engenharia.
//
// Tudo o que é "do cliente" (nome, cores, endereço, dados bancários e dados
// da CONTRATADA nos contratos) mora aqui. O código do sistema é o mesmo para
// todos os clientes; o banco de dados de cada um é um projeto Firebase próprio,
// definido pelas variáveis VITE_FIREBASE_* do site dele no Netlify.
//
// Arquivos da pasta do cliente:
//   config.js   — este arquivo
//   logo.png    — logo (lockup) usado no login, na navegação, no painel do
//                 cliente e nos PDFs
//   public/     — ícones do app (apple-touch-icon.png, icon-512.png) e
//                 manifest.webmanifest
//
// Este arquivo também é lido pelo vite.config.js (Node), então deve conter só
// dados — nada de import de imagem.

export default {
  // Nome como aparece nos rodapés, PDFs e no alt do logo.
  nome: 'Schramm Arquitetura e Engenharia',
  // Título da aba do navegador / nome do app na tela inicial do celular.
  tituloApp: 'Obras Schramm',
  // Endereço mostrado no rodapé do painel do cliente e do relatório de reembolso.
  endereco: 'Rua Dr. Luiz Bastos do Prado, 2093 - 504 - Centro, Gravataí - RS, 94010-021',

  // Cores da marca (hex). "acento" é a cor principal dos botões, títulos e
  // destaques; "acentoEscuro" o hover; "acentoTint" uma lavagem bem clara.
  cores: {
    acento: '#c65a2e',
    acentoEscuro: '#a8481f',
    acentoTint: '#fbf1ea',
    fundo: '#f5f2ec',
  },

  // Dados bancários para o pagamento do honorário de gestão (relatório de
  // reembolso e mensagem de WhatsApp).
  pagamento: {
    banco: 'Banco do Brasil',
    titular: 'Schramm Eng e Proj Ltda',
    agencia: '0883-4',
    conta: '34852-x',
    pixTipo: 'CPF',
    pix: '08940235000175',
  },

  // Dados da CONTRATADA usados nos modelos de contrato.
  contratos: {
    // Nome no título salvo e no arquivo: "Contrato entre X e <nomeTitulo>".
    nomeTitulo: 'Schramm Engenharia e Projetos',
    // Qualificação corrida (modelos Projeto e Projeto e Execução).
    intro: 'SCHRAMM ENGENHARIA E PROJETOS LTDA, CNPJ 08.940.235/0001-75, sito à Rua Dr. Luiz Bastos do Prado, 2093, sala 504, centro em Gravataí/RS, representada por Luiza Barbosa Schramm, brasileira, casada, CPF 002.634.640-08, simplesmente doravante denominado CONTRATADO, convencionam e ajustam o que segue:',
    // Qualificação em bloco (modelo Administração de Obra).
    qualificacao: 'SCHRAMM ENGENHARIA E PROJETOS, pessoa jurídica de direito privado, inscrita no CNPJ sob o nº 08.940.235/0001-75, com sede na Rua Dr. Luiz Bastos do Prado, 2093, centro, Gravataí/RS, neste ato representada na forma de seu contrato social por Luiza Barbosa Schramm, portador(a) da Cédula de Identidade RG nº 5079432166 e do CPF nº 002.634.640-08, doravante denominada simplesmente CONTRATADA;',
    // Nome sob a linha de assinatura.
    assinatura: 'Schramm Engenharia e Projetos Ltda',
    assinaturaAdministracao: 'SCHRAMM ENGENHARIA E PROJETOS',
    // Cidade da assinatura (padrão do campo) e comarca do foro.
    cidade: 'Gravataí/RS',
    foro: 'Gravataí/RS',
    // Dados bancários que já vêm preenchidos em cada modelo (editáveis no contrato).
    bancoProjetoExecucao: `BANCO INTER - 077
SCHRAMM ENGENHARIA E PROJETOS LTDA
CNPJ: 08.940.235/0001-75
Agência: 0001     Conta: 51862092-1
PIX: 1301e44e-6339-4235-b101-f8625227df9c`,
    bancoProjeto: `Banco do Brasil - Schramm Engenharia e Projetos Ltda
CNPJ 08.940.235/0001-75 (PIX)
Ag.: 0883-4     CC.: 34.852-x`,
  },
};
