import type { Template, Campo } from './types'
import { ShapesFeedbackCard } from './shapes/FeedbackCard'
import { ShapesProdutoCard } from './shapes/ProdutoCard'
import { ShapesFraseCard } from './shapes/FraseCard'
import { ShapesGrafismoCard } from './shapes/GrafismoCard'
import {
  ShapesCapaCard,
  ShapesCoresCard,
  ShapesFormaCard,
  ShapesCtaCard,
} from './shapes/slides'
import { PALETA_SHAPES } from './shapes/cores'
import {
  KaCapaCard,
  KaTextoCard,
  KaPassoCard,
  KaMidiaCard,
  KaComentarioCard,
  KaCtaCard,
  KaFeedbackCard,
} from './ka/KaCards'
import { FUNDOS_KA } from './ka/cores'

// Paleta oficial da Shapes (primárias + gama secundária) para os fundos.
const SWATCHES = PALETA_SHAPES

// Campo padrão "Cor do logo": logo nas 3 cores da marca (preto/branco/laranja),
// ou automático (segue o fundo). Usado em todos os cards com logo.
function campoCorLogo(): Campo {
  return {
    id: 'cor_logo',
    label: 'Cor do logo',
    tipo: 'select',
    padrao: 'auto',
    opcoes: [
      { valor: 'auto', rotulo: 'Automático (segue o fundo)' },
      { valor: 'preto', rotulo: 'Preto' },
      { valor: 'branco', rotulo: 'Branco' },
      { valor: 'laranja', rotulo: 'Laranja' },
    ],
  }
}

// Fundo laranja texturizado original do card de feedback (valor especial:
// uma imagem em vez de cor sólida). Mantido como opção/padrão.
const TEXTURA_LARANJA = 'url(/clientes/shapes/fundo-shapes.jpg)'

// Amostras de fundo do card de feedback: textura laranja + paleta da marca.
const SWATCHES_FEEDBACK = [
  { valor: TEXTURA_LARANJA, rotulo: 'Laranja (textura)' },
  ...PALETA_SHAPES,
]

// ---- KA | Inteligência para Marcas ---------------------------------------
// O padrão dos carrosséis da KA é travado: só feed 4:5 (1080×1350), só três
// fundos oficiais, texto e destaque derivados do fundo (ver ka/cores.ts).

// Formatos padrão de TODOS os layouts da KA: Feed, Story e Quadrado.
const FORMATO_KA = [
  { formato: 'post' as const, rotulo: 'Feed 4:5', largura: 1080, altura: 1350 },
  { formato: 'story' as const, rotulo: 'Story 9:16', largura: 1080, altura: 1920 },
  { formato: 'card' as const, rotulo: 'Quadrado 1:1', largura: 1080, altura: 1080 },
]

// Campo padrão "Cor de fundo": todas as cores da paleta KA, em amostras (o
// tipo 'paleta' mostra a cor de verdade e guarda a chave da cor).
function campoFundoKA(padrao: string): Campo {
  return {
    id: 'cor_fundo',
    label: 'Cor de fundo',
    tipo: 'paleta',
    padrao,
    ajuda: 'Clique numa cor da paleta oficial da KA.',
    opcoes: FUNDOS_KA.map((f) => ({ valor: f.valor, rotulo: f.rotulo, cor: f.hex })),
  }
}

// Campo padrão "Cor do texto": Automático (contraste com o fundo) OU uma cor
// fixa da paleta KA. Vale para todos os cards da KA.
function campoCorTextoKA(): Campo {
  return {
    id: 'cor_fonte',
    label: 'Cor do texto',
    tipo: 'paleta',
    padrao: 'auto',
    ajuda: 'A primeira (A) é automática, combina com o fundo. Ou escolha uma cor fixa.',
    opcoes: [
      { valor: 'auto', rotulo: 'Automático (combina com o fundo)' },
      ...FUNDOS_KA.map((f) => ({ valor: f.valor, rotulo: f.rotulo, cor: f.hex })),
    ],
  }
}

const AJUDA_DESTAQUE =
  'Para deixar uma palavra ou frase em negrito, coloque entre aspas. ' +
  'Ex.: a marca é "percepção".'

// Dimensões dos 3 formatos (todos os modelos usam as mesmas).
const FORMATOS = [
  { formato: 'post' as const, rotulo: 'Feed 4:5', largura: 1080, altura: 1350 },
  { formato: 'story' as const, rotulo: 'Story 9:16', largura: 1080, altura: 1920 },
  { formato: 'card' as const, rotulo: 'Quadrado 1:1', largura: 1080, altura: 1080 },
]

// ============================================================================
// Registro de templates validados pela KA.
//
// Hoje os moldes vivem no código (rápido para colocar de pé e com fidelidade
// total ao layout aprovado). Quando o Painel Admin (Fase 2) estiver completo,
// os metadados de cada template passam a vir da tabela `templates` do Supabase
// e os assets do Storage, mas a interface `Template` continua a mesma.
// ============================================================================

export const TEMPLATES: Template[] = [
  {
    id: 'shapes-feedback',
    clienteSlug: 'shapes',
    clienteNome: 'Shapes',
    nome: 'Card de Feedback',
    descricao:
      'Depoimento de cliente no padrão da Shapes, fundo laranja texturizado, ' +
      'símbolo da concha e card branco com estrelas douradas.',
    formatos: [
      { formato: 'post', rotulo: 'Feed 4:5', largura: 1080, altura: 1350 },
      { formato: 'story', rotulo: 'Story 9:16', largura: 1080, altura: 1920 },
      { formato: 'card', rotulo: 'Quadrado 1:1', largura: 1080, altura: 1080 },
    ],
    campos: [
      {
        id: 'stars',
        label: 'Nota (estrelas)',
        tipo: 'estrelas',
        padrao: 5,
      },
      {
        id: 'quote',
        label: 'Depoimento',
        tipo: 'textarea',
        obrigatorio: true,
        placeholder: 'Cole aqui o depoimento real do cliente…',
        ajuda: 'Transcreva o depoimento real. Quebre em linhas curtas para leitura.',
        padrao:
          'Meu pedido chegou rapidinho!\n' +
          'Amei a luminária!\n' +
          'Super fácil de montar e ficou linda na minha sala!\n' +
          'Já pedi outra pra dar de presente.',
      },
      {
        id: 'who',
        label: 'Nome do cliente',
        tipo: 'texto',
        obrigatorio: true,
        placeholder: 'nome da cliente',
        ajuda: 'Primeiro nome + inicial, ou @ do Instagram.',
        padrao: 'nome da cliente',
      },
      {
        id: 'cor_fundo',
        label: 'Cor de fundo',
        tipo: 'cor',
        padrao: TEXTURA_LARANJA,
        ajuda: 'A textura laranja é o padrão. Escolha uma cor da marca nas amostras ou qualquer cor no seletor.',
        opcoes: SWATCHES_FEEDBACK,
      },
      { id: 'cor_fonte', label: 'Cor do texto', tipo: 'cor', padrao: '#FFFFFF', opcoes: SWATCHES },
      campoCorLogo(),
    ],
    render: ShapesFeedbackCard,
  },
  {
    id: 'shapes-produto',
    clienteSlug: 'shapes',
    clienteNome: 'Shapes',
    nome: 'Post de Produto',
    descricao:
      'Post de produto no estilo do carrossel da Shapes, fundo colorido, ' +
      'foto do produto em forma orgânica e um texto curto.',
    formatos: [
      { formato: 'post', rotulo: 'Feed 4:5', largura: 1080, altura: 1350 },
      { formato: 'story', rotulo: 'Story 9:16', largura: 1080, altura: 1920 },
      { formato: 'card', rotulo: 'Quadrado 1:1', largura: 1080, altura: 1080 },
    ],
    campos: [
      {
        id: 'foto',
        label: 'Foto do produto',
        tipo: 'imagem',
        obrigatorio: true,
        ajuda: 'Envie uma foto do produto (JPG ou PNG). Fica dentro da forma orgânica.',
      },
      { id: 'forma', label: 'Forma da foto', tipo: 'forma', padrao: 'shape-blob1' },
      {
        id: 'cor_fundo',
        label: 'Cor de fundo',
        tipo: 'cor',
        padrao: '#FF7829',
        ajuda: 'Escolha uma cor da marca nas amostras ou qualquer cor no seletor, a Shapes tem liberdade cromática.',
        opcoes: SWATCHES,
      },
      { id: 'cor_fonte', label: 'Cor do texto', tipo: 'cor', padrao: '#FFFFFF', opcoes: SWATCHES },
      {
        id: 'texto',
        label: 'Texto',
        tipo: 'textarea',
        placeholder: 'Ex.: design\nautoral',
        ajuda: 'Texto curto. Use quebras de linha para separar as palavras.',
        padrao: 'design\nautoral',
      },
      campoCorLogo(),
    ],
    render: ShapesProdutoCard,
  },
  {
    id: 'shapes-capa',
    clienteSlug: 'shapes',
    clienteNome: 'Shapes',
    nome: 'Capa (foto + título)',
    descricao: 'Capa do carrossel, foto com título grande e a logo; a foto pode ocupar o card todo ou aparecer menor, revelando a cor de fundo.',
    formatos: FORMATOS,
    campos: [
      {
        id: 'foto',
        label: 'Foto',
        tipo: 'imagem',
        obrigatorio: true,
        ajuda: 'Use "Tamanho da foto" para a foto ocupar o card todo (100%) ou aparecer menor, mostrando a cor de fundo em volta.',
      },
      {
        id: 'cor_fundo',
        label: 'Cor de fundo',
        tipo: 'cor',
        padrao: '#EDE9DE',
        opcoes: SWATCHES,
      },
      {
        id: 'cor_fonte',
        label: 'Cor do texto',
        tipo: 'cor',
        padrao: '#131313',
        opcoes: SWATCHES,
      },
      {
        id: 'titulo',
        label: 'Título',
        tipo: 'texto',
        obrigatorio: true,
        placeholder: 'Ex.: LUMINÁRIA CACTUS',
        padrao: 'LUMINÁRIA CACTUS',
      },
      campoCorLogo(),
    ],
    render: ShapesCapaCard,
  },
  {
    id: 'shapes-frase',
    clienteSlug: 'shapes',
    clienteNome: 'Shapes',
    nome: 'Frase + foto',
    descricao:
      'Fundo creme com uma frase em cima, a foto no meio (tamanho ajustável) e ' +
      'uma frase embaixo. Sem logotipo. Itálico com *asteriscos*.',
    formatos: FORMATOS,
    campos: [
      {
        id: 'texto_cima',
        label: 'Texto de cima',
        tipo: 'textarea',
        placeholder: 'Ex.: Não cria apenas objetos,',
        ajuda: 'Aspas = negrito ("assim"). Asteriscos = itálico (*sensorial*).',
        padrao: 'Não cria apenas objetos,',
      },
      {
        id: 'foto',
        label: 'Foto',
        tipo: 'imagem',
        obrigatorio: true,
        areaPadrao: 100,
        ajuda: 'Use "Tamanho da foto" para aumentar ou diminuir o espaço da imagem.',
      },
      {
        id: 'texto_baixo',
        label: 'Texto de baixo',
        tipo: 'textarea',
        placeholder: 'Ex.: cria experiências sensoriais.',
        padrao: 'cria experiências sensoriais.',
      },
      { id: 'cor_fundo', label: 'Cor de fundo', tipo: 'cor', padrao: '#F1E9DA', opcoes: SWATCHES },
      { id: 'cor_fonte', label: 'Cor do texto', tipo: 'cor', padrao: '#131313', opcoes: SWATCHES },
    ],
    render: ShapesFraseCard,
  },
  {
    id: 'shapes-grafismo',
    clienteSlug: 'shapes',
    clienteNome: 'Shapes',
    nome: 'Card com grafismo',
    descricao:
      'Fundo liso com as espirais da concha nas laterais (recoloríveis), texto ' +
      'em cima e embaixo e a foto no centro (tamanho ajustável). Sem logotipo.',
    formatos: FORMATOS,
    campos: [
      {
        id: 'texto_cima',
        label: 'Texto de cima',
        tipo: 'textarea',
        placeholder: 'Ex.: texto de cima',
        ajuda: 'Aspas = negrito ("assim"). Asteriscos = itálico (*assim*).',
        padrao: 'texto de cima',
      },
      {
        id: 'foto',
        label: 'Foto',
        tipo: 'imagem',
        obrigatorio: true,
        areaPadrao: 100,
        ajuda: 'Use "Tamanho da foto" para aumentar ou diminuir o espaço da imagem.',
      },
      {
        id: 'texto_baixo',
        label: 'Texto de baixo',
        tipo: 'textarea',
        placeholder: 'Ex.: texto de baixo',
        padrao: 'texto de baixo',
      },
      { id: 'cor_fundo', label: 'Cor de fundo', tipo: 'cor', padrao: '#FFFFFF', opcoes: SWATCHES },
      { id: 'cor_grafismo', label: 'Cor dos grafismos', tipo: 'cor', padrao: '#DFC0DF', opcoes: SWATCHES },
      { id: 'cor_fonte', label: 'Cor do texto', tipo: 'cor', padrao: '#131313', opcoes: SWATCHES },
    ],
    render: ShapesGrafismoCard,
  },
  {
    id: 'shapes-cores',
    clienteSlug: 'shapes',
    clienteNome: 'Shapes',
    nome: 'Diversas cores (fundo claro)',
    descricao: 'Fundo claro, foto do produto em forma orgânica e rótulos curtos.',
    formatos: FORMATOS,
    campos: [
      {
        id: 'cor_fundo',
        label: 'Cor de fundo',
        tipo: 'cor',
        padrao: '#F2EFE9',
        opcoes: SWATCHES,
      },
      { id: 'cor_fonte', label: 'Cor do texto', tipo: 'cor', padrao: '#131313', opcoes: SWATCHES },
      { id: 'foto', label: 'Foto do produto', tipo: 'imagem', obrigatorio: true },
      { id: 'forma', label: 'Forma da foto', tipo: 'forma', padrao: 'shape-blob2' },
      {
        id: 'texto',
        label: 'Rótulos',
        tipo: 'textarea',
        placeholder: 'diversas cores\ndesmontável',
        ajuda: 'Uma característica por linha.',
        padrao: 'diversas cores\ndesmontável',
      },
      campoCorLogo(),
    ],
    render: ShapesCoresCard,
  },
  {
    id: 'shapes-forma',
    clienteSlug: 'shapes',
    clienteNome: 'Shapes',
    nome: 'Forma função emoção (fundo escuro)',
    descricao: 'Fundo escuro, foto em forma orgânica e um texto ao lado com a concha.',
    formatos: FORMATOS,
    campos: [
      {
        id: 'cor_fundo',
        label: 'Cor de fundo',
        tipo: 'cor',
        padrao: '#010101',
        opcoes: SWATCHES,
      },
      { id: 'cor_fonte', label: 'Cor do texto', tipo: 'cor', padrao: '#FFFFFF', opcoes: SWATCHES },
      { id: 'foto', label: 'Foto do produto', tipo: 'imagem', obrigatorio: true },
      { id: 'forma', label: 'Forma da foto', tipo: 'forma', padrao: 'shape-blob3' },
      {
        id: 'texto',
        label: 'Texto',
        tipo: 'textarea',
        placeholder: 'forma\nfunção\nemoção',
        ajuda: 'Uma palavra por linha funciona bem.',
        padrao: 'forma\nfunção\nemoção',
      },
      campoCorLogo(),
    ],
    render: ShapesFormaCard,
  },
  {
    id: 'shapes-cta',
    clienteSlug: 'shapes',
    clienteNome: 'Shapes',
    nome: 'CTA (acesse a loja)',
    descricao: 'Fechamento do carrossel, foto de fundo, forma orgânica colorida (semi-transparente), concha, botão e chamada para a loja.',
    formatos: FORMATOS,
    campos: [
      {
        id: 'foto',
        label: 'Foto de fundo',
        tipo: 'imagem',
        areaPadrao: 100,
        ajuda: 'Aqui "Tamanho da foto" controla o tamanho da forma orgânica.',
      },
      { id: 'forma', label: 'Forma (o texto fica dentro)', tipo: 'forma', padrao: 'shape-blob1' },
      {
        id: 'cor_fundo',
        label: 'Cor da forma',
        tipo: 'cor',
        padrao: '#363E31',
        opcoes: SWATCHES,
      },
      { id: 'cor_fonte', label: 'Cor do texto', tipo: 'cor', padrao: '#FFFFFF', opcoes: SWATCHES },
      { id: 'texto_botao', label: 'Texto do botão', tipo: 'texto', padrao: 'ACESSE A LOJA' },
      { id: 'texto_sub', label: 'Subtexto', tipo: 'texto', padrao: 'no botão abaixo' },
      {
        id: 'texto_extra',
        label: 'Linha extra',
        tipo: 'textarea',
        ajuda: 'Use quebra de linha para separar em duas linhas.',
        padrao: 'entregamos para\ntodo Brasil',
      },
      campoCorLogo(),
    ],
    render: ShapesCtaCard,
  },

  // ==== KA | Inteligência para Marcas ======================================
  {
    id: 'ka-capa',
    clienteSlug: 'ka',
    clienteNome: 'KA | Inteligência para Marcas',
    nome: 'Capa (gancho)',
    descricao:
      'Card 1 do carrossel, o gancho em Playfair Display grande, no padrão ' +
      'unificado da KA (cabeçalho, rodapé e fundos oficiais).',
    formatos: FORMATO_KA,
    campos: [
      {
        id: 'titulo',
        label: 'Gancho (título grande)',
        tipo: 'textarea',
        obrigatorio: true,
        placeholder: 'Ex.: Sua marca não é o que você diz. É o que *percebem.*',
        ajuda: AJUDA_DESTAQUE + ' Quebre em linhas curtas.',
        padrao: 'Sua marca não é\no que você diz.\nÉ o que *percebem.*',
      },
      campoFundoKA('marinho'),
      campoCorTextoKA(),
    ],
    render: KaCapaCard,
  },
  {
    id: 'ka-texto',
    clienteSlug: 'ka',
    clienteNome: 'KA | Inteligência para Marcas',
    nome: 'Texto (desenvolvimento)',
    descricao:
      'Card de desenvolvimento, afirmação, virada ou insight. Título em ' +
      'Playfair (opcional) e corpo em Montserrat com destaques em caramelo.',
    formatos: FORMATO_KA,
    campos: [
      {
        id: 'titulo',
        label: 'Título (opcional)',
        tipo: 'texto',
        placeholder: 'Ex.: A virada',
        padrao: '',
      },
      {
        id: 'texto',
        label: 'Texto',
        tipo: 'textarea',
        obrigatorio: true,
        placeholder: 'O insight do card…',
        ajuda: AJUDA_DESTAQUE,
        padrao:
          'Posicionamento não é um slogan bonito.\n\n' +
          'É a decisão sobre qual espaço a sua marca ocupa na *mente de quem compra.*',
      },
      campoFundoKA('papel'),
      campoCorTextoKA(),
    ],
    render: KaTextoCard,
  },
  {
    id: 'ka-passo',
    clienteSlug: 'ka',
    clienteNome: 'KA | Inteligência para Marcas',
    nome: 'Passo numerado',
    descricao:
      'Card de passo, número grande em caramelo acima do texto, para as ' +
      'sequências didáticas do carrossel educativo.',
    formatos: FORMATO_KA,
    campos: [
      {
        id: 'numero',
        label: 'Número do passo',
        tipo: 'texto',
        obrigatorio: true,
        maxLen: 2,
        padrao: '1',
      },
      {
        id: 'texto',
        label: 'Texto do passo',
        tipo: 'textarea',
        obrigatorio: true,
        ajuda: AJUDA_DESTAQUE,
        padrao: 'Defina o território que a sua marca pode *dominar.*',
      },
      campoFundoKA('papel'),
      campoCorTextoKA(),
    ],
    render: KaPassoCard,
  },
  {
    id: 'ka-midia',
    clienteSlug: 'ka',
    clienteNome: 'KA | Inteligência para Marcas',
    nome: 'Mídia (notícias e análises)',
    descricao:
      'Card do carrossel de notícias, texto + área de mídia (imagem, print ou ' +
      'vídeo) como prova. Horizontal e quadrada: mídia embaixo; vertical: mídia à direita.',
    formatos: FORMATO_KA,
    campos: [
      {
        id: 'texto',
        label: 'Texto',
        tipo: 'textarea',
        obrigatorio: true,
        ajuda: AJUDA_DESTAQUE,
        padrao: 'O case que *todo mundo* comentou esta semana:',
      },
      {
        id: 'midia',
        label: 'Imagem, print ou vídeo',
        tipo: 'imagem',
        obrigatorio: true,
        aceitaVideo: true,
        redimensionavel2d: true,
        ajuda:
          'Aceita foto/print OU vídeo. Vídeo: use MP4 (H.264) para tocar no navegador, ' +
          '.mov do iPhone/Mac pode não abrir; máx. 200 MB e ~60s. Ajuste Largura/Altura da área.',
      },
      {
        id: 'proporcao',
        label: 'Proporção da mídia',
        tipo: 'select',
        chips: true,
        padrao: '16:9',
        opcoes: [
          { valor: '16:9', rotulo: 'Horizontal 16:9' },
          { valor: '1:1', rotulo: 'Quadrada 1:1' },
          { valor: '9:16', rotulo: 'Vertical 9:16' },
        ],
      },
      campoFundoKA('papel'),
      campoCorTextoKA(),
    ],
    render: KaMidiaCard,
  },
  {
    id: 'ka-comentario',
    clienteSlug: 'ka',
    clienteNome: 'KA | Inteligência para Marcas',
    nome: 'Comentário (box de print)',
    descricao:
      'Card do carrossel de notícias, texto em cima e card branco com ' +
      '@usuário e o comentário, como um print de texto.',
    formatos: FORMATO_KA,
    campos: [
      {
        id: 'texto',
        label: 'Texto',
        tipo: 'textarea',
        ajuda: AJUDA_DESTAQUE,
        padrao: 'E a internet *não perdoou:*',
      },
      {
        id: 'usuario',
        label: '@ do usuário',
        tipo: 'texto',
        obrigatorio: true,
        placeholder: '@usuario',
        padrao: '@cliente',
      },
      {
        id: 'comentario',
        label: 'Comentário',
        tipo: 'textarea',
        obrigatorio: true,
        placeholder: 'Cole aqui o comentário…',
        padrao: 'Nunca vi uma marca se reposicionar tão rápido. Aula.',
      },
      campoFundoKA('marinho'),
      campoCorTextoKA(),
    ],
    render: KaComentarioCard,
  },
  {
    id: 'ka-cta',
    clienteSlug: 'ka',
    clienteNome: 'KA | Inteligência para Marcas',
    nome: 'CTA (card 10)',
    descricao:
      'Fechamento de todo carrossel KA, fundo bege, frase, nome do produto ' +
      'grande e botão pill "Link na minha bio" com contorno caramelo.',
    formatos: FORMATO_KA,
    campos: [
      {
        id: 'frase',
        label: 'Frase',
        tipo: 'textarea',
        ajuda: AJUDA_DESTAQUE,
        padrao:
          'Se esse conteúdo te ajudou a enxergar a sua marca de outro jeito, ' +
          'compartilhe e me siga para mais.',
      },
      {
        id: 'produto',
        label: 'Nome do produto',
        tipo: 'texto',
        obrigatorio: true,
        placeholder: 'Ex.: Diagnóstico de Marca',
        padrao: 'Diagnóstico de Marca',
      },
      {
        id: 'botao',
        label: 'Texto do botão',
        tipo: 'texto',
        padrao: 'Link na minha bio',
      },
      campoFundoKA('papel'),
      campoCorTextoKA(),
    ],
    render: KaCtaCard,
  },
  {
    id: 'ka-feedback',
    clienteSlug: 'ka',
    clienteNome: 'KA | Inteligência para Marcas',
    nome: 'Card de Feedback (review)',
    descricao:
      'Prova social no modelo de review do Google, logo KA, "FEEDBACK ;)", ' +
      'box branco com avatar, nome, estrelas douradas e o depoimento real.',
    formatos: FORMATO_KA,
    campos: [
      {
        id: 'nome',
        label: 'Nome do cliente',
        tipo: 'texto',
        obrigatorio: true,
        placeholder: 'Como o cliente aparece na avaliação',
        padrao: 'SABRE Odonto Gravataí',
      },
      {
        id: 'subtitulo',
        label: 'Subtítulo (opcional)',
        tipo: 'texto',
        placeholder: 'Ex.: Odontologia · Gravataí',
        ajuda: 'Segmento e/ou cidade do cliente.',
        padrao: 'Odontologia · Gravataí',
      },
      {
        id: 'texto',
        label: 'Depoimento',
        tipo: 'textarea',
        obrigatorio: true,
        placeholder: 'Cole aqui o depoimento real (Google, WhatsApp ou DM)…',
        ajuda: 'Transcreva o depoimento REAL, limpe só erros óbvios de digitação. Sem data.',
        padrao:
          'Nós do grupo SABRE somos muito gratos pela experiência maravilhosa ' +
          'que tivemos com a Kelly e tudo aquilo que ela nos ensinou. É uma ' +
          'profissional muito capacitada e de excelência. Obrigada por ' +
          'participar e nos auxiliar em um momento tão importante para nós! ' +
          'Recomendamos muito!',
      },
      { id: 'nota', label: 'Nota (estrelas)', tipo: 'estrelas', padrao: 5 },
      {
        id: 'inicial',
        label: 'Letra do avatar (opcional)',
        tipo: 'texto',
        maxLen: 2,
        placeholder: 'Vazio = 1ª letra do nome',
        padrao: '',
      },
      { id: 'rotulo', label: 'Rótulo do topo', tipo: 'texto', padrao: 'FEEDBACK ;)' },
      campoFundoKA('caramelo'),
      campoCorTextoKA(),
    ],
    render: KaFeedbackCard,
  },
]

export function templatesDoCliente(slug: string): Template[] {
  return TEMPLATES.filter((t) => t.clienteSlug === slug)
}

export function obterTemplate(id: string): Template | undefined {
  return TEMPLATES.find((t) => t.id === id)
}

export function clientesComTemplates(): { slug: string; nome: string; qtd: number }[] {
  const mapa = new Map<string, { slug: string; nome: string; qtd: number }>()
  for (const t of TEMPLATES) {
    const atual = mapa.get(t.clienteSlug)
    if (atual) atual.qtd += 1
    else mapa.set(t.clienteSlug, { slug: t.clienteSlug, nome: t.clienteNome, qtd: 1 })
  }
  return [...mapa.values()]
}
