import type { Template, Campo, FormatoDef } from './types'
import { ShapesFeedbackCard } from './shapes/FeedbackCard'
import { ShapesProdutoCard } from './shapes/ProdutoCard'
import { ShapesFraseCard } from './shapes/FraseCard'
import { ShapesGrafismoCard } from './shapes/GrafismoCard'
import {
  ShapesCapaCard,
  ShapesCoresCard,
  ShapesFormaCard,
  ShapesCtaCard,
  ShapesImagemCard,
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
import {
  ConectaCapaCard,
  ConectaConteudoCard,
  ConectaListaCard,
  ConectaFotoCard,
  ConectaUmAUmCard,
  ConectaCalendarioCard,
  ConectaEducativoCard,
  ConectaFraseCard,
  ConectaCtaCard,
  ConectaFeedbackCard,
} from './conecta/ConectaCards'
import { FUNDOS_CONECTA, COLORS_CONECTA } from './conecta/cores'
import {
  GraziFraseCard,
  GraziDepoimentoCard,
  GraziTextoCard,
  GraziPassoCard,
  GraziCtaCard,
  GraziMistaCard,
  GraziFraseFotoCard,
  GraziComparativoCard,
  GraziNotasCard,
  GraziCapaCard,
} from './grazi/GraziCards'
import { FUNDOS_GRAZI } from './grazi/cores'

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

// Campo padrão "Textura de fundo": nenhum ou um dos padrões geométricos, com
// intensidade (mais clara/escura). Vale para todos os cards da KA.
function campoTexturaKA(): Campo {
  return {
    id: 'textura',
    label: 'Textura de fundo',
    tipo: 'textura',
    padrao: 'nenhuma',
    intensidadePadrao: 40,
    ajuda: 'Opcional: um padrão sutil no fundo. O slider deixa mais clara ou mais escura.',
  }
}

const AJUDA_DESTAQUE =
  'Para deixar uma palavra ou frase em negrito, coloque entre aspas. ' +
  'Ex.: a marca é "percepção".'

// ---- Grazi Martini · Comportamento Humano · Método The One© ---------------
const FORMATO_GRAZI = [
  { formato: 'post' as const, rotulo: 'Feed 4:5', largura: 1080, altura: 1350 },
  { formato: 'story' as const, rotulo: 'Story 9:16', largura: 1080, altura: 1920 },
  { formato: 'card' as const, rotulo: 'Quadrado 1:1', largura: 1080, altura: 1080 },
]
// Capa de Reels: 9:16 primeiro (formato padrão).
const FORMATO_GRAZI_CAPA = [
  { formato: 'story' as const, rotulo: 'Reels / Story 9:16', largura: 1080, altura: 1920 },
  { formato: 'post' as const, rotulo: 'Feed 4:5', largura: 1080, altura: 1350 },
  { formato: 'card' as const, rotulo: 'Quadrado 1:1', largura: 1080, altura: 1080 },
]
function campoFundoGrazi(padrao: string): Campo {
  return {
    id: 'cor_fundo',
    label: 'Cor de fundo',
    tipo: 'paleta',
    padrao,
    opcoes: FUNDOS_GRAZI.map((f) => ({ valor: f.valor, rotulo: f.rotulo, cor: f.hex })),
  }
}
function campoCorTextoGrazi(): Campo {
  return {
    id: 'cor_fonte',
    label: 'Cor do texto',
    tipo: 'paleta',
    padrao: 'auto',
    ajuda: 'A primeira (A) é automática, combina com o fundo. Ou escolha uma cor fixa.',
    opcoes: [
      { valor: 'auto', rotulo: 'Automático (combina com o fundo)' },
      ...FUNDOS_GRAZI.map((f) => ({ valor: f.valor, rotulo: f.rotulo, cor: f.hex })),
    ],
  }
}
// Controles comuns a todos os cards da Grazi: posição vertical e tamanho do texto.
function campoPosGrazi(): Campo {
  return {
    id: 'pos',
    label: 'Posição do texto',
    tipo: 'select',
    padrao: 'meio',
    chips: true,
    opcoes: [
      { valor: 'topo', rotulo: 'Em cima' },
      { valor: 'meio', rotulo: 'No meio' },
      { valor: 'base', rotulo: 'Embaixo' },
    ],
  }
}
function campoTamanhoGrazi(): Campo {
  return {
    id: 'escala',
    label: 'Tamanho do texto',
    tipo: 'range',
    min: 70,
    max: 130,
    passo: 2,
    padrao: 100,
    ajuda: 'Aumenta ou diminui todo o texto do card.',
  }
}
// Selo @sougrazimartini: onde mostrar e em que cor (ou esconder).
function campoSeloPosGrazi(): Campo {
  return {
    id: 'handle_pos',
    label: 'Selo @sougrazimartini',
    tipo: 'select',
    padrao: 'rodape',
    chips: true,
    ajuda: 'Onde mostrar o @ da Grazi — ou esconder.',
    opcoes: [
      { valor: 'rodape', rotulo: 'No rodapé' },
      { valor: 'cabecalho', rotulo: 'No topo' },
      { valor: 'nenhum', rotulo: 'Não mostrar' },
    ],
  }
}
function campoSeloCorGrazi(padrao = 'auto'): Campo {
  return {
    id: 'handle_cor',
    label: 'Cor do @',
    tipo: 'paleta',
    padrao,
    ajuda: 'A primeira (A) combina com o fundo. Ou escolha uma cor fixa.',
    opcoes: [
      { valor: 'auto', rotulo: 'Automático (combina com o fundo)' },
      { valor: '#C9A24C', rotulo: 'Dourado', cor: '#C9A24C' },
      ...FUNDOS_GRAZI.map((f) => ({ valor: f.hex, rotulo: f.rotulo, cor: f.hex })),
    ],
  }
}

// Dimensões dos 3 formatos (todos os modelos usam as mesmas).
const FORMATOS = [
  { formato: 'post' as const, rotulo: 'Feed 4:5', largura: 1080, altura: 1350 },
  { formato: 'story' as const, rotulo: 'Story 9:16', largura: 1080, altura: 1920 },
  { formato: 'card' as const, rotulo: 'Quadrado 1:1', largura: 1080, altura: 1080 },
]

// ---- Conecta · Núcleo de Negócios ACIGRA ----------------------------------
// Formatos: Feed, Story, Quadrado e Apresentação 16:9 (mesmos modelos servem
// para redes sociais E slides de apresentação).
const FORMATOS_CONECTA: FormatoDef[] = [
  { formato: 'post', rotulo: 'Feed 4:5', largura: 1080, altura: 1350 },
  { formato: 'story', rotulo: 'Story 9:16', largura: 1080, altura: 1920 },
  { formato: 'card', rotulo: 'Quadrado 1:1', largura: 1080, altura: 1080 },
  { formato: 'carrossel', rotulo: 'Apresentação 16:9', largura: 1920, altura: 1080 },
]

// Fundo do card: só as famílias do Design System — Navy (gradiente), Navy CTA
// (radial) e Warm (claro). Turquesa nunca é fundo inteiro.
function campoFundoConecta(padrao: string): Campo {
  return {
    id: 'cor_fundo',
    label: 'Fundo do card',
    tipo: 'paleta',
    padrao,
    ajuda: 'Navy (escuro) ou Warm (claro). Alterne no feed: nunca 2 navy seguidos.',
    opcoes: FUNDOS_CONECTA.map((f) => ({ valor: f.valor, rotulo: f.rotulo, cor: f.hex })),
  }
}

// Tag de categoria (texto turquesa, ex.: "REUNIÃO QUINZENAL", "DICA CONECTA").
function campoTagConecta(padrao: string): Campo {
  return {
    id: 'tag',
    label: 'Tag de categoria',
    tipo: 'texto',
    placeholder: 'Ex.: DICA CONECTA',
    ajuda: 'Texto curto em maiúsculas (vira turquesa, espaçado). Sem emoji.',
    padrao,
  }
}

const AJUDA_KW =
  'Título em peso leve; a PALAVRA-CHAVE entre "aspas" ou *asteriscos* fica em ' +
  'negrito turquesa — é a identidade do sistema. Use quebras de linha. ' +
  'O texto quebra sozinho para não passar da margem.'

// Slider "volume" de tamanho de um texto (companheiro ${id}_tam, 100 = normal).
function campoTam(id: string, label: string): Campo {
  return { id: `${id}_tam`, label, tipo: 'range', min: 60, max: 160, passo: 2, padrao: 100 }
}

// Cor de UM texto (id): Automático (combina com o fundo) ou uma cor da paleta.
function campoCor(id: string, label: string): Campo {
  return {
    id: `${id}_cor`,
    label,
    tipo: 'paleta',
    padrao: 'auto',
    opcoes: [
      { valor: 'auto', rotulo: 'Automático' },
      ...COLORS_CONECTA.map((c) => ({ valor: c.valor, rotulo: c.rotulo, cor: c.hex })),
    ],
  }
}

// Cor do logo: Automático (segue o fundo) ou fixa.
function campoCorLogoConecta(): Campo {
  return {
    id: 'cor_logo',
    label: 'Cor do logo',
    tipo: 'select',
    chips: true,
    padrao: 'auto',
    opcoes: [
      { valor: 'auto', rotulo: 'Automático' },
      { valor: 'branco', rotulo: 'Branco' },
      { valor: 'turquesa', rotulo: 'Turquesa' },
      { valor: 'navy', rotulo: 'Navy' },
    ],
  }
}

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
        padrao: 'Meu pedido chegou rapidinho!\nAmei a luminária!',
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
        label: 'Foto ou vídeo do produto',
        tipo: 'imagem',
        obrigatorio: true,
        aceitaVideo: true,
        ajuda: 'Envie uma foto OU vídeo do produto. Fica dentro da forma orgânica. Com vídeo, dá para baixar a moldura (p/ CapCut) ou o vídeo pronto com áudio.',
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
      {
        id: 'texto_tam',
        label: 'Tamanho do texto',
        tipo: 'range',
        min: 34,
        max: 96,
        padrao: 66,
        ajuda: 'Diminua o texto para a foto ficar MAIOR (o espaço da foto é flexível).',
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
        label: 'Foto ou vídeo',
        tipo: 'imagem',
        obrigatorio: true,
        aceitaVideo: true,
        ajuda: 'Aceita foto OU vídeo. Use "Tamanho da foto" para ocupar o card todo (100%) ou menor, mostrando a cor de fundo em volta. Com vídeo, dá para baixar a moldura (p/ CapCut) ou o vídeo pronto com áudio.',
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
        label: 'Foto ou vídeo',
        tipo: 'imagem',
        obrigatorio: true,
        aceitaVideo: true,
        areaPadrao: 100,
        ajuda: 'Aceita foto OU vídeo. Use "Tamanho da foto" para aumentar ou diminuir o espaço. Com vídeo, dá para baixar a moldura (p/ CapCut) ou o vídeo pronto com áudio.',
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
        label: 'Foto ou vídeo',
        tipo: 'imagem',
        obrigatorio: true,
        aceitaVideo: true,
        areaPadrao: 100,
        ajuda: 'Aceita foto OU vídeo. Use "Tamanho da foto" para aumentar ou diminuir o espaço. Com vídeo, dá para baixar a moldura (p/ CapCut) ou o vídeo pronto com áudio.',
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
      { id: 'foto', label: 'Foto ou vídeo do produto', tipo: 'imagem', obrigatorio: true, aceitaVideo: true },
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
      { id: 'foto', label: 'Foto ou vídeo do produto', tipo: 'imagem', obrigatorio: true, aceitaVideo: true },
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
        label: 'Foto ou vídeo de fundo',
        tipo: 'imagem',
        aceitaVideo: true,
        areaPadrao: 100,
        ajuda: 'Aceita foto OU vídeo de fundo. Aqui "Tamanho da foto" controla o tamanho da forma orgânica. Com vídeo, dá para baixar a moldura (p/ CapCut) ou o vídeo pronto com áudio.',
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
  {
    id: 'shapes-imagem',
    clienteSlug: 'shapes',
    clienteNome: 'Shapes',
    nome: 'Imagem inteira (tela cheia)',
    descricao:
      'A foto ou vídeo ocupa o card todo (posição e zoom ajustáveis). O texto é ' +
      'opcional, numa caixa translúcida de cantos arredondados que você posiciona ' +
      'em cima, no meio ou embaixo. Sem texto, fica só a imagem.',
    formatos: FORMATOS,
    campos: [
      {
        id: 'foto',
        label: 'Foto ou vídeo (tela cheia)',
        tipo: 'imagem',
        obrigatorio: true,
        aceitaVideo: true,
        areaPadrao: 100,
        ajuda: 'Ocupa o card inteiro. Use Posição horizontal/vertical e Zoom para enquadrar. Aceita vídeo.',
      },
      {
        id: 'texto',
        label: 'Texto (opcional)',
        tipo: 'textarea',
        placeholder: 'Deixe em branco para ficar só a imagem',
        ajuda: 'Deixe VAZIO para o card ficar só com a imagem. Aspas = negrito ("assim"), *asteriscos* = itálico.',
        padrao: '',
      },
      {
        id: 'caixa_pos',
        label: 'Posição do texto',
        tipo: 'select',
        padrao: 'base',
        opcoes: [
          { valor: 'topo', rotulo: 'Em cima' },
          { valor: 'meio', rotulo: 'No meio' },
          { valor: 'base', rotulo: 'Embaixo' },
        ],
      },
      {
        id: 'texto_tam',
        label: 'Tamanho do texto',
        tipo: 'range',
        min: 26,
        max: 84,
        padrao: 46,
      },
      { id: 'cor_caixa', label: 'Cor da caixa', tipo: 'cor', padrao: '#FFFFFF', opcoes: SWATCHES },
      {
        id: 'caixa_op',
        label: 'Opacidade da caixa (0 = só o texto, 100 = sólida)',
        tipo: 'range',
        min: 0,
        max: 100,
        padrao: 82,
      },
      { id: 'cor_fonte', label: 'Cor do texto', tipo: 'cor', padrao: '#131313', opcoes: SWATCHES },
    ],
    render: ShapesImagemCard,
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
      campoTexturaKA(),
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
      'Playfair (opcional) e corpo em Montserrat, com destaques em negrito.',
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
      campoTexturaKA(),
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
      campoTexturaKA(),
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
      campoTexturaKA(),
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
      campoTexturaKA(),
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
      campoTexturaKA(),
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

  // ==== Conecta · Núcleo de Negócios ACIGRA (Design System) ================
  {
    id: 'conecta-capa',
    clienteSlug: 'conecta',
    clienteNome: 'Conecta · Núcleo de Negócios ACIGRA',
    nome: 'Capa',
    descricao:
      'Abertura editorial: logo centralizado, tag, título light com palavra-' +
      'chave em turquesa, linha e subtítulo. Navy ou Warm.',
    formatos: FORMATOS_CONECTA,
    campos: [
      campoTagConecta('CONECTA'),
      {
        id: 'titulo',
        label: 'Título',
        tipo: 'textarea',
        obrigatorio: true,
        placeholder: 'Ex.: Conexões com "propósito"',
        ajuda: AJUDA_KW,
        padrao: 'Conexões com\n"propósito"',
      },
      {
        id: 'subtitulo',
        label: 'Subtítulo (opcional)',
        tipo: 'textarea',
        placeholder: 'Uma linha de apoio…',
        padrao: 'O núcleo de negócios da ACIGRA em Gravataí.',
      },
      { id: 'deslize', label: 'Rodapé (ex.: Deslize →)', tipo: 'texto', padrao: 'Deslize →' },
      campoTam('tag', 'Tamanho — Tag'),
      campoCor('tag', 'Cor — Tag'),
      campoTam('titulo', 'Tamanho — Título'),
      campoCor('titulo', 'Cor — Título'),
      campoTam('subtitulo', 'Tamanho — Subtítulo'),
      campoCor('subtitulo', 'Cor — Subtítulo'),
      campoTam('deslize', 'Tamanho — Rodapé'),
      campoCor('deslize', 'Cor — Rodapé'),
      campoCorLogoConecta(),
      campoFundoConecta('navy'),
    ],
    render: ConectaCapaCard,
  },
  {
    id: 'conecta-conteudo',
    clienteSlug: 'conecta',
    clienteNome: 'Conecta · Núcleo de Negócios ACIGRA',
    nome: 'Conteúdo (slide interno)',
    descricao:
      'Slide de conteúdo: logo + número decorativo, tag, título light com ' +
      'keyword turquesa, linha e texto de apoio. MISSÃO, VISÃO, dicas, sinais.',
    formatos: FORMATOS_CONECTA,
    campos: [
      { id: 'numero', label: 'Número (opcional)', tipo: 'texto', maxLen: 2, placeholder: 'Ex.: 01', padrao: '01' },
      campoTagConecta('SINAL 01'),
      {
        id: 'titulo',
        label: 'Título',
        tipo: 'textarea',
        obrigatorio: true,
        ajuda: AJUDA_KW,
        padrao: 'Você decide por\n"impulso", não por\nestratégia',
      },
      {
        id: 'texto',
        label: 'Texto de apoio',
        tipo: 'textarea',
        ajuda: 'Peso leve, cinza. Frase curta de reforço.',
        padrao:
          'Sem processos claros, cada decisão vira aposta. O núcleo ajuda a trocar o achismo por método.',
      },
      campoTam('tag', 'Tamanho — Tag'),
      campoCor('tag', 'Cor — Tag'),
      campoTam('titulo', 'Tamanho — Título'),
      campoCor('titulo', 'Cor — Título'),
      campoTam('texto', 'Tamanho — Texto'),
      campoCor('texto', 'Cor — Texto'),
      campoCorLogoConecta(),
      campoFundoConecta('navy'),
    ],
    render: ConectaConteudoCard,
  },
  {
    id: 'conecta-lista',
    clienteSlug: 'conecta',
    clienteNome: 'Conecta · Núcleo de Negócios ACIGRA',
    nome: 'Lista (valores / objetivos)',
    descricao:
      'Tag + título + lista editorial. Cada linha “Rótulo: descrição” destaca ' +
      'o rótulo em turquesa. Ex.: VALORES, OBJETIVOS.',
    formatos: FORMATOS_CONECTA,
    campos: [
      campoTagConecta('O NÚCLEO'),
      { id: 'titulo', label: 'Título (opcional)', tipo: 'texto', placeholder: 'Ex.: Nossos valores', padrao: 'Nossos valores' },
      {
        id: 'itens',
        label: 'Itens (um por linha)',
        tipo: 'textarea',
        obrigatorio: true,
        ajuda: 'Um item por linha. Use “Rótulo: descrição” para destacar o rótulo.',
        padrao:
          'Conexão: aproximar empresários e fortalecer relações.\n' +
          'Colaboração: compartilhar conhecimento e oportunidades.\n' +
          'Desenvolvimento: aprendizado contínuo, no CNPJ e no CPF.\n' +
          'Confiança: escuta, transparência e respeito.\n' +
          'Propósito: impacto positivo na comunidade.',
      },
      campoTam('tag', 'Tamanho — Tag'),
      campoCor('tag', 'Cor — Tag'),
      campoTam('titulo', 'Tamanho — Título'),
      campoCor('titulo', 'Cor — Título'),
      campoTam('itens', 'Tamanho — Itens'),
      campoCor('itens', 'Cor — Itens'),
      campoCorLogoConecta(),
      campoFundoConecta('navy'),
    ],
    render: ConectaListaCard,
  },
  {
    id: 'conecta-foto',
    clienteSlug: 'conecta',
    clienteNome: 'Conecta · Núcleo de Negócios ACIGRA',
    nome: 'Card com foto (evento)',
    descricao:
      'Foto full-bleed com overlay (Navy) ou emoldurada (Warm). Logo branco, ' +
      'tag, título light e data/local. Serve Reunião Quinzenal e Palestra ' +
      '(use o sobretítulo "Convidados especiais").',
    formatos: FORMATOS_CONECTA,
    campos: [
      {
        id: 'foto',
        label: 'Foto ou vídeo',
        tipo: 'imagem',
        obrigatorio: true,
        aceitaVideo: true,
        areaPadrao: 100,
        ajuda: 'Use Posição e Zoom para enquadrar. Aceita vídeo.',
      },
      campoTagConecta('REUNIÃO QUINZENAL'),
      { id: 'sobre', label: 'Sobretítulo (opcional, ex.: Convidados especiais)', tipo: 'texto', padrao: '' },
      {
        id: 'titulo',
        label: 'Título',
        tipo: 'textarea',
        obrigatorio: true,
        ajuda: AJUDA_KW,
        padrao: 'Conexões, aprendizado\ne troca de "experiências"',
      },
      { id: 'apoio', label: 'Data — Hora · Local', tipo: 'texto', padrao: '25 Mar 2025 — 19h · ACIGRA' },
      campoTam('tag', 'Tamanho — Tag'),
      campoCor('tag', 'Cor — Tag'),
      campoTam('sobre', 'Tamanho — Sobretítulo'),
      campoCor('sobre', 'Cor — Sobretítulo'),
      campoTam('titulo', 'Tamanho — Título'),
      campoCor('titulo', 'Cor — Título'),
      campoTam('apoio', 'Tamanho — Data/local'),
      campoCor('apoio', 'Cor — Data/local'),
      campoCorLogoConecta(),
      campoFundoConecta('navy'),
    ],
    render: ConectaFotoCard,
  },
  {
    id: 'conecta-1a1',
    clienteSlug: 'conecta',
    clienteNome: 'Conecta · Núcleo de Negócios ACIGRA',
    nome: 'Encontro 1:1',
    descricao:
      'Foto em destaque com o selo "CONECTA 1:1" e, acima dele, os dois ' +
      'participantes (nome em CAIXA ALTA + empresa) à esquerda e à direita. ' +
      'Navy (full-bleed) ou Warm (emoldurada).',
    formatos: FORMATOS_CONECTA,
    campos: [
      {
        id: 'foto',
        label: 'Foto ou vídeo',
        tipo: 'imagem',
        obrigatorio: true,
        aceitaVideo: true,
        areaPadrao: 100,
        ajuda: 'A foto é o protagonista. Use Posição e Zoom para enquadrar.',
      },
      { id: 'nome_esq', label: 'Nome — esquerda (CAIXA ALTA)', tipo: 'texto', placeholder: 'Ex.: JOÃO SILVA', padrao: '' },
      { id: 'empresa_esq', label: 'Empresa — esquerda', tipo: 'texto', placeholder: 'Ex.: Silva Consultoria', padrao: '' },
      { id: 'nome_dir', label: 'Nome — direita (CAIXA ALTA)', tipo: 'texto', placeholder: 'Ex.: MARIA SOUZA', padrao: '' },
      { id: 'empresa_dir', label: 'Empresa — direita', tipo: 'texto', placeholder: 'Ex.: Souza & Cia', padrao: '' },
      { id: 'badge', label: 'Selo', tipo: 'texto', padrao: 'CONECTA 1:1' },
      { id: 'pos', label: 'Subir nomes e botão', tipo: 'range', min: 0, max: 700, passo: 10, padrao: 0, ajuda: 'Sobe o bloco de nomes + selo. 0 = no rodapé.' },
      campoTam('pessoaEsq', 'Tamanho — participante esquerda'),
      campoCor('pessoaEsq', 'Cor — participante esquerda'),
      campoTam('pessoaDir', 'Tamanho — participante direita'),
      campoCor('pessoaDir', 'Cor — participante direita'),
      campoCorLogoConecta(),
      campoFundoConecta('navy'),
    ],
    render: ConectaUmAUmCard,
  },
  {
    id: 'conecta-calendario',
    clienteSlug: 'conecta',
    clienteNome: 'Conecta · Núcleo de Negócios ACIGRA',
    nome: 'Calendário do mês',
    descricao:
      'Mês em destaque (peso ultrafino) + ano em turquesa, com o número do ' +
      'mês gigante ao fundo. Para anunciar os eventos do mês.',
    formatos: FORMATOS_CONECTA,
    campos: [
      campoTagConecta('CALENDÁRIO'),
      { id: 'mes', label: 'Mês', tipo: 'texto', obrigatorio: true, padrao: 'Abril' },
      { id: 'ano', label: 'Ano', tipo: 'texto', padrao: '2025' },
      { id: 'rodape', label: 'Rodapé', tipo: 'texto', padrao: 'Eventos do mês →' },
      { id: 'numero', label: 'Número do mês (fundo)', tipo: 'texto', maxLen: 2, padrao: '04' },
      campoTam('tag', 'Tamanho — Tag'),
      campoCor('tag', 'Cor — Tag'),
      campoTam('mes', 'Tamanho — Mês'),
      campoCor('mes', 'Cor — Mês'),
      campoTam('ano', 'Tamanho — Ano'),
      campoCor('ano', 'Cor — Ano'),
      campoTam('rodape', 'Tamanho — Rodapé'),
      campoCor('rodape', 'Cor — Rodapé'),
      campoCorLogoConecta(),
      campoFundoConecta('navy'),
    ],
    render: ConectaCalendarioCard,
  },
  {
    id: 'conecta-educativo',
    clienteSlug: 'conecta',
    clienteNome: 'Conecta · Núcleo de Negócios ACIGRA',
    nome: 'Conteúdo educativo',
    descricao:
      'Capa de conteúdo: aspas decorativas, tag, título light com palavra-' +
      'chave em turquesa, texto de apoio e "Deslize →".',
    formatos: FORMATOS_CONECTA,
    campos: [
      campoTagConecta('DICA CONECTA'),
      {
        id: 'titulo',
        label: 'Título',
        tipo: 'textarea',
        obrigatorio: true,
        ajuda: AJUDA_KW,
        padrao: '5 perguntas que todo\nempresário deveria\n"se fazer"',
      },
      {
        id: 'texto',
        label: 'Texto de apoio',
        tipo: 'textarea',
        padrao: 'Antes de pensar em crescer, pare e reflita.',
      },
      { id: 'deslize', label: 'Rodapé (ex.: Deslize →)', tipo: 'texto', padrao: 'Deslize →' },
      campoTam('tag', 'Tamanho — Tag'),
      campoCor('tag', 'Cor — Tag'),
      campoTam('titulo', 'Tamanho — Título'),
      campoCor('titulo', 'Cor — Título'),
      campoTam('texto', 'Tamanho — Texto'),
      campoCor('texto', 'Cor — Texto'),
      campoTam('deslize', 'Tamanho — Rodapé'),
      campoCor('deslize', 'Cor — Rodapé'),
      campoCorLogoConecta(),
      campoFundoConecta('navy'),
    ],
    render: ConectaEducativoCard,
  },
  {
    id: 'conecta-frase',
    clienteSlug: 'conecta',
    clienteNome: 'Conecta · Núcleo de Negócios ACIGRA',
    nome: 'Frase de virada',
    descricao:
      'Slide de impacto: aspas decorativas e uma frase centralizada em peso ' +
      'leve, com a palavra-chave em turquesa.',
    formatos: FORMATOS_CONECTA,
    campos: [
      {
        id: 'frase',
        label: 'Frase',
        tipo: 'textarea',
        obrigatorio: true,
        ajuda: AJUDA_KW,
        padrao: 'Empresas crescem quando\nas pessoas por trás delas\ncrescem "juntas".',
      },
      campoTam('frase', 'Tamanho — Frase'),
      campoCor('frase', 'Cor — Frase'),
      campoCorLogoConecta(),
      campoFundoConecta('navy'),
    ],
    render: ConectaFraseCard,
  },
  {
    id: 'conecta-cta',
    clienteSlug: 'conecta',
    clienteNome: 'Conecta · Núcleo de Negócios ACIGRA',
    nome: 'CTA (fechamento)',
    descricao:
      'Fechamento do carrossel: logo grande, tag, frase conceitual e o tom de ' +
      'exclusividade (as vagas abrem duas vezes por ano). Fundo radial.',
    formatos: FORMATOS_CONECTA,
    campos: [
      campoTagConecta('NÚCLEO DE NEGÓCIOS ACIGRA'),
      {
        id: 'frase',
        label: 'Frase conceitual',
        tipo: 'textarea',
        obrigatorio: true,
        ajuda: AJUDA_KW,
        padrao: 'Conexão com "propósito".\nCrescimento com "consistência".',
      },
      { id: 'exclusivo', label: 'Linha de exclusividade', tipo: 'texto', padrao: 'As vagas abrem duas vezes por ano.' },
      campoTam('tag', 'Tamanho — Tag'),
      campoCor('tag', 'Cor — Tag'),
      campoTam('frase', 'Tamanho — Frase'),
      campoCor('frase', 'Cor — Frase'),
      campoTam('exclusivo', 'Tamanho — Exclusividade'),
      campoCor('exclusivo', 'Cor — Exclusividade'),
      campoCorLogoConecta(),
      campoFundoConecta('cta'),
    ],
    render: ConectaCtaCard,
  },
  {
    id: 'conecta-feedback',
    clienteSlug: 'conecta',
    clienteNome: 'Conecta · Núcleo de Negócios ACIGRA',
    nome: 'Card de Feedback',
    descricao:
      'Prova social: logo, tag e box branco com avatar, nome, estrelas e o ' +
      'depoimento real. Navy ou Warm.',
    formatos: FORMATOS_CONECTA,
    campos: [
      { id: 'rotulo', label: 'Tag do topo', tipo: 'texto', padrao: 'DEPOIMENTO' },
      {
        id: 'nome',
        label: 'Nome do nucleado',
        tipo: 'texto',
        obrigatorio: true,
        placeholder: 'Como a pessoa aparece',
        padrao: 'Fernanda Pereira',
      },
      {
        id: 'subtitulo',
        label: 'Subtítulo (opcional)',
        tipo: 'texto',
        placeholder: 'Ex.: Empresa · Segmento',
        padrao: 'Nucleada Conecta',
      },
      {
        id: 'texto',
        label: 'Depoimento',
        tipo: 'textarea',
        obrigatorio: true,
        placeholder: 'Cole aqui o depoimento real…',
        ajuda: 'Transcreva o depoimento REAL. Sem data.',
        padrao:
          'No Conecta encontrei muito mais que networking: relações de confiança ' +
          'que fortaleceram o meu negócio. Recomendo demais!',
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
      campoTam('rotulo', 'Tamanho — Tag'),
      campoCor('rotulo', 'Cor — Tag'),
      campoCorLogoConecta(),
      campoFundoConecta('navy'),
    ],
    render: ConectaFeedbackCard,
  },

  // ---- Grazi Martini ----
  {
    id: 'grazi-frase',
    clienteSlug: 'grazi',
    clienteNome: 'Grazi Martini',
    nome: 'Frase editorial',
    descricao:
      'Frase de impacto: título em Poppins caixa-alta + uma palavra em script ' +
      '(destaque) e o botão "Leia a Legenda". Faixa verde no rodapé.',
    formatos: FORMATO_GRAZI,
    campos: [
      {
        id: 'titulo',
        label: 'Título (caixa-alta)',
        tipo: 'textarea',
        obrigatorio: true,
        placeholder: 'Ex.: Erros comuns de quem',
        ajuda: 'Vai aparecer em MAIÚSCULAS. A palavra de destaque (em script) fica no campo abaixo.',
        padrao: 'Erros comuns de quem',
      },
      {
        id: 'script',
        label: 'Palavra em destaque (script)',
        tipo: 'texto',
        placeholder: 'Ex.: lidera',
        ajuda: 'Uma palavra curta, escrita à mão (script). Deixe em branco se não quiser.',
        padrao: 'lidera',
      },
      {
        id: 'botao',
        label: 'Texto do botão',
        tipo: 'texto',
        placeholder: 'Ex.: Leia a Legenda',
        padrao: 'Leia a Legenda',
      },
      campoFundoGrazi('mostarda'),
      campoCorTextoGrazi(),
      {
        id: 'script_tam',
        label: 'Tamanho da palavra em script',
        tipo: 'range',
        min: 60,
        max: 160,
        passo: 5,
        padrao: 100,
        ajuda: 'Aumenta ou diminui só a palavra escrita à mão.',
      },
      {
        id: 'script_y',
        label: 'Altura da palavra em script',
        tipo: 'range',
        min: -60,
        max: 60,
        passo: 4,
        padrao: 0,
        ajuda: 'Valores negativos sobem a palavra; positivos descem.',
      },
      campoPosGrazi(),
      campoTamanhoGrazi(),
      campoSeloPosGrazi(),
      campoSeloCorGrazi(),
    ],
    render: GraziFraseCard,
  },
  {
    id: 'grazi-depoimento',
    clienteSlug: 'grazi',
    clienteNome: 'Grazi Martini',
    nome: 'Depoimento',
    descricao:
      'Prova social estilo review do Google (card branco com estrelas) sobre a ' +
      'marca d’água "depoimento". Depoimento sempre real.',
    formatos: FORMATO_GRAZI,
    campos: [
      { id: 'nome', label: 'Nome de quem avaliou', tipo: 'texto', obrigatorio: true, padrao: 'Emerson Raiza Batagin' },
      {
        id: 'sub',
        label: 'Sublinha (opcional)',
        tipo: 'texto',
        placeholder: 'Ex.: 2 avaliações · 12 fotos',
        padrao: '2 avaliações · 12 fotos',
      },
      {
        id: 'depoimento',
        label: 'Depoimento',
        tipo: 'textarea',
        obrigatorio: true,
        padrao:
          'A Grazi é simplesmente espetacular. Domina de muitos assuntos e traz diversos insights práticos e ferramentas que auxiliam na análise comportamental, principalmente. As sessões são super dinâmicas.',
      },
      { id: 'estrelas', label: 'Estrelas', tipo: 'estrelas', padrao: 5 },
      campoFundoGrazi('verde-escuro'),
      campoPosGrazi(),
      campoTamanhoGrazi(),
      campoSeloPosGrazi(),
      campoSeloCorGrazi('#C9A24C'),
    ],
    render: GraziDepoimentoCard,
  },
  {
    id: 'grazi-texto',
    clienteSlug: 'grazi',
    clienteNome: 'Grazi Martini',
    nome: 'Texto (desenvolvimento)',
    descricao:
      'Slide de conteúdo para carrossel: título opcional + corpo de texto. ' +
      'Palavra entre "aspas" fica em negrito.',
    formatos: FORMATO_GRAZI,
    campos: [
      {
        id: 'titulo',
        label: 'Título (opcional)',
        tipo: 'texto',
        placeholder: 'Ex.: O que ninguém te conta sobre liderança',
        padrao: 'O que ninguém te conta',
      },
      {
        id: 'texto',
        label: 'Texto',
        tipo: 'textarea',
        obrigatorio: true,
        ajuda: 'Palavra entre "aspas" fica em negrito.',
        padrao:
          'A liderança não quebra num grande erro. Ela se desgasta nas "pequenas incoerências" do dia a dia — o que você cobra, mas não pratica.',
      },
      campoFundoGrazi('verde'),
      campoCorTextoGrazi(),
      campoPosGrazi(),
      campoTamanhoGrazi(),
      campoSeloPosGrazi(),
      campoSeloCorGrazi(),
    ],
    render: GraziTextoCard,
  },
  {
    id: 'grazi-passo',
    clienteSlug: 'grazi',
    clienteNome: 'Grazi Martini',
    nome: 'Passo numerado',
    descricao: 'Número grande + título + texto. Para etapas do método ou listas.',
    formatos: FORMATO_GRAZI,
    campos: [
      { id: 'numero', label: 'Número', tipo: 'texto', obrigatorio: true, padrao: '01' },
      {
        id: 'titulo',
        label: 'Título (opcional)',
        tipo: 'texto',
        placeholder: 'Ex.: Escute antes de agir',
        padrao: 'Escute antes de agir',
      },
      {
        id: 'texto',
        label: 'Texto',
        tipo: 'textarea',
        obrigatorio: true,
        padrao:
          'Antes de cobrar coerência da equipe, organize o que você sente. A liderança começa por dentro.',
      },
      campoFundoGrazi('terracota'),
      campoCorTextoGrazi(),
      campoPosGrazi(),
      campoTamanhoGrazi(),
      campoSeloPosGrazi(),
      campoSeloCorGrazi(),
    ],
    render: GraziPassoCard,
  },
  {
    id: 'grazi-cta',
    clienteSlug: 'grazi',
    clienteNome: 'Grazi Martini',
    nome: 'CTA (fechamento)',
    descricao:
      'Card de encerramento: uma frase + nome em script + botão. Fecha o carrossel.',
    formatos: FORMATO_GRAZI,
    campos: [
      { id: 'frase', label: 'Frase', tipo: 'texto', padrao: 'Vamos organizar a sua', obrigatorio: true },
      {
        id: 'produto',
        label: 'Palavra em script',
        tipo: 'texto',
        placeholder: 'Ex.: liderança',
        padrao: 'liderança',
      },
      { id: 'botao', label: 'Texto do botão', tipo: 'texto', padrao: 'Agende sua sessão' },
      campoFundoGrazi('bege-dourado'),
      campoCorTextoGrazi(),
      campoPosGrazi(),
      campoTamanhoGrazi(),
      campoSeloPosGrazi(),
      campoSeloCorGrazi(),
    ],
    render: GraziCtaCard,
  },
  {
    id: 'grazi-mista',
    clienteSlug: 'grazi',
    clienteNome: 'Grazi Martini',
    nome: 'Frase mista',
    descricao:
      'Frase com intro, uma palavra-herói em script no meio, um fecho (com ' +
      'destaque em "aspas") e uma nota manuscrita. Fundo verde.',
    formatos: FORMATO_GRAZI,
    campos: [
      {
        id: 'texto_cima',
        label: 'Intro (1ª linha maior)',
        tipo: 'textarea',
        ajuda: 'A 1ª linha aparece um pouco maior.',
        padrao: 'Relacionamentos\nsaudáveis começam quando',
      },
      {
        id: 'script',
        label: 'Palavra-herói (script)',
        tipo: 'texto',
        placeholder: 'Ex.: líderes',
        padrao: 'líderes',
      },
      {
        id: 'texto_baixo',
        label: 'Fecho',
        tipo: 'textarea',
        ajuda: 'Palavra entre "aspas" fica em negrito.',
        padrao: '"reorganizam" suas\npróprias emoções',
      },
      {
        id: 'nota',
        label: 'Nota manuscrita (opcional)',
        tipo: 'texto',
        placeholder: 'Ex.: antes de exigir coerência da equipe.',
        padrao: 'antes de exigir coerência da equipe.',
      },
      { id: 'botao', label: 'Rodapé (opcional)', tipo: 'texto', padrao: 'leia a legenda' },
      campoFundoGrazi('verde'),
      campoCorTextoGrazi(),
      campoPosGrazi(),
      campoTamanhoGrazi(),
      campoSeloPosGrazi(),
      campoSeloCorGrazi(),
    ],
    render: GraziMistaCard,
  },
  {
    id: 'grazi-frase-foto',
    clienteSlug: 'grazi',
    clienteNome: 'Grazi Martini',
    nome: 'Frase + foto',
    descricao:
      'Título em cima, foto (ou vídeo) numa janela arredondada e uma frase de ' +
      'fecho embaixo. Tamanho da foto ajustável.',
    formatos: FORMATO_GRAZI,
    campos: [
      {
        id: 'titulo',
        label: 'Título',
        tipo: 'textarea',
        obrigatorio: true,
        placeholder: 'Ex.: As travas emocionais que travam a sua liderança',
        ajuda: 'Palavra entre "aspas" fica em negrito.',
        padrao: 'As travas emocionais que travam a sua "liderança"',
      },
      {
        id: 'foto',
        label: 'Foto ou vídeo',
        tipo: 'imagem',
        obrigatorio: true,
        aceitaVideo: true,
        areaPadrao: 92,
        ajuda: 'Fica numa janela arredondada. Use "Tamanho da foto" para aumentar ou diminuir a altura. Com vídeo, dá para baixar a moldura (p/ CapCut) ou o vídeo pronto com áudio.',
      },
      {
        id: 'legenda',
        label: 'Frase de fecho (opcional)',
        tipo: 'textarea',
        placeholder: 'Ex.: Reconhecer é o primeiro passo para reorganizar.',
        padrao: 'Reconhecer é o primeiro passo para "reorganizar".',
      },
      campoFundoGrazi('vinho'),
      campoCorTextoGrazi(),
      campoPosGrazi(),
      campoTamanhoGrazi(),
      campoSeloPosGrazi(),
      campoSeloCorGrazi(),
    ],
    render: GraziFraseFotoCard,
  },
  {
    id: 'grazi-comparativo',
    clienteSlug: 'grazi',
    clienteNome: 'Grazi Martini',
    nome: 'Comparativo (2 colunas)',
    descricao:
      'Duas colunas lado a lado — o que "pesa" × o que "inspira" (ou os rótulos ' +
      'que você quiser). Uma linha por item.',
    formatos: FORMATO_GRAZI,
    campos: [
      {
        id: 'titulo',
        label: 'Título (opcional)',
        tipo: 'texto',
        placeholder: 'Ex.: Dois jeitos de liderar',
        padrao: 'Dois jeitos de liderar',
      },
      { id: 'rotulo_a', label: 'Cabeçalho da coluna 1', tipo: 'texto', padrao: 'Uma liderança que pesa' },
      {
        id: 'itens_a',
        label: 'Itens da coluna 1 (um por linha)',
        tipo: 'textarea',
        obrigatorio: true,
        ajuda: 'Uma linha por item. Palavra entre "aspas" fica em negrito.',
        padrao: 'Cobra, mas não escuta\nControla cada detalhe\nDecide pelo medo\nReage no impulso',
      },
      { id: 'rotulo_b', label: 'Cabeçalho da coluna 2', tipo: 'texto', padrao: 'Uma liderança que inspira' },
      {
        id: 'itens_b',
        label: 'Itens da coluna 2 (um por linha)',
        tipo: 'textarea',
        obrigatorio: true,
        ajuda: 'Uma linha por item. Palavra entre "aspas" fica em negrito.',
        padrao: 'Escuta antes de agir\nConfia e delega\nDecide com clareza\nResponde com intenção',
      },
      campoFundoGrazi('verde'),
      campoCorTextoGrazi(),
      campoPosGrazi(),
      campoTamanhoGrazi(),
      campoSeloPosGrazi(),
      campoSeloCorGrazi(),
    ],
    render: GraziComparativoCard,
  },
  {
    id: 'grazi-notas',
    clienteSlug: 'grazi',
    clienteNome: 'Grazi Martini',
    nome: 'Bloco de notas',
    descricao:
      'Cartão estilo "Notas" do iPhone (título + texto) sobre o fundo da marca. ' +
      'Para listas e reflexões com um ar pessoal.',
    formatos: FORMATO_GRAZI,
    campos: [
      {
        id: 'chamada',
        label: 'Chamada (acima do bloco, opcional)',
        tipo: 'texto',
        placeholder: 'Ex.: Anota aí:',
        padrao: 'Anota aí:',
      },
      { id: 'titulo', label: 'Título da nota', tipo: 'texto', padrao: '3 perguntas antes de reagir' },
      {
        id: 'corpo',
        label: 'Texto da nota',
        tipo: 'textarea',
        obrigatorio: true,
        ajuda: 'Palavra entre "aspas" fica em negrito. Enter cria uma nova linha.',
        padrao:
          '1. O que eu estou sentindo agora?\n2. Isso é sobre a equipe ou sobre mim?\n3. Qual resposta a minha "melhor versão" daria?',
      },
      campoFundoGrazi('bege-dourado'),
      campoCorTextoGrazi(),
      campoPosGrazi(),
      campoTamanhoGrazi(),
      campoSeloPosGrazi(),
      campoSeloCorGrazi(),
    ],
    render: GraziNotasCard,
  },
  {
    id: 'grazi-capa',
    clienteSlug: 'grazi',
    clienteNome: 'Grazi Martini',
    nome: 'Capa de Reels',
    descricao:
      'Foto (ou vídeo) ocupando o card inteiro, título grande por cima e uma ' +
      'faixa verde elegante no rodapé com um texto. Padrão 9:16.',
    formatos: FORMATO_GRAZI_CAPA,
    campos: [
      {
        id: 'foto',
        label: 'Foto ou vídeo (ocupa o card todo)',
        tipo: 'imagem',
        obrigatorio: true,
        aceitaVideo: true,
        ajuda: 'A imagem preenche a capa inteira. Use o enquadramento (arrastar/zoom) para posicionar. Aceita vídeo.',
      },
      {
        id: 'titulo',
        label: 'Título grande',
        tipo: 'textarea',
        obrigatorio: true,
        placeholder: 'Ex.: O erro que trava a sua liderança',
        ajuda: 'Aparece em MAIÚSCULAS por cima da foto. Palavra entre "aspas" fica em negrito.',
        padrao: 'O erro que trava a sua "liderança"',
      },
      {
        id: 'subtitulo',
        label: 'Linha de apoio (opcional)',
        tipo: 'texto',
        placeholder: 'Ex.: e como sair dele em 3 passos',
        padrao: '',
      },
      {
        id: 'titulo_pos',
        label: 'Posição do título',
        tipo: 'select',
        padrao: 'base',
        chips: true,
        opcoes: [
          { valor: 'topo', rotulo: 'No topo' },
          { valor: 'meio', rotulo: 'No meio' },
          { valor: 'base', rotulo: 'Embaixo' },
        ],
      },
      {
        id: 'caixa',
        label: 'Caixa das letras',
        tipo: 'select',
        padrao: 'maiuscula',
        chips: true,
        ajuda: 'Vale para o título e a linha de apoio. O @ fica como você escrever.',
        opcoes: [
          { valor: 'maiuscula', rotulo: 'MAIÚSCULAS' },
          { valor: 'minuscula', rotulo: 'minúsculas' },
          { valor: 'normal', rotulo: 'Como escrevi' },
        ],
      },
      campoTamanhoGrazi(),
      {
        id: 'cor_fonte',
        label: 'Cor do título',
        tipo: 'paleta',
        padrao: 'branco',
        ajuda: 'Sobre a foto, branco ou creme costumam ficar mais legíveis.',
        opcoes: [
          { valor: 'branco', rotulo: 'Branco', cor: '#FFFFFF' },
          { valor: 'creme', rotulo: 'Creme', cor: '#F3EEE8' },
          { valor: 'preto', rotulo: 'Preto', cor: '#181007' },
          ...FUNDOS_GRAZI.map((f) => ({ valor: f.valor, rotulo: f.rotulo, cor: f.hex })),
        ],
      },
      {
        id: 'rodape',
        label: 'Assinatura / chamada (abaixo do título)',
        tipo: 'texto',
        placeholder: 'Ex.: @sougrazimartini',
        ajuda: 'Deixe em branco se não quiser.',
        padrao: '@sougrazimartini',
      },
      {
        id: 'cor_faixa',
        label: 'Cor do blur (verde)',
        tipo: 'paleta',
        padrao: 'verde-escuro',
        ajuda: 'A cor do brilho difuso que aparece atrás do texto.',
        opcoes: FUNDOS_GRAZI.map((f) => ({ valor: f.valor, rotulo: f.rotulo, cor: f.hex })),
      },
    ],
    render: GraziCapaCard,
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
