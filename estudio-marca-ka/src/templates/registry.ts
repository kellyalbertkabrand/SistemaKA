import type { Template } from './types'
import { ShapesFeedbackCard } from './shapes/FeedbackCard'
import { ShapesProdutoCard } from './shapes/ProdutoCard'
import {
  ShapesCapaCard,
  ShapesCoresCard,
  ShapesFormaCard,
  ShapesCtaCard,
} from './shapes/slides'

// Paleta de fundo comum (amostras) usada pelos modelos de produto da Shapes.
const SWATCHES = [
  { valor: '#3E4A2C', rotulo: 'Verde Shapes' },
  { valor: '#131313', rotulo: 'Preto' },
  { valor: '#FF7829', rotulo: 'Laranja' },
  { valor: '#F2EFE9', rotulo: 'Claro' },
  { valor: '#D9C7A8', rotulo: 'Bege' },
  { valor: '#F2B950', rotulo: 'Amarelo' },
  { valor: '#8A8A8A', rotulo: 'Cinza' },
]

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
// e os assets do Storage — mas a interface `Template` continua a mesma.
// ============================================================================

export const TEMPLATES: Template[] = [
  {
    id: 'shapes-feedback',
    clienteSlug: 'shapes',
    clienteNome: 'Shapes',
    nome: 'Card de Feedback',
    descricao:
      'Depoimento de cliente no padrão da Shapes — fundo laranja texturizado, ' +
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
    ],
    render: ShapesFeedbackCard,
  },
  {
    id: 'shapes-produto',
    clienteSlug: 'shapes',
    clienteNome: 'Shapes',
    nome: 'Post de Produto',
    descricao:
      'Post de produto no estilo do carrossel da Shapes — fundo colorido, ' +
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
        padrao: '#3E4A2C',
        ajuda: 'Escolha uma cor (o verde é o padrão) ou clique numa das amostras.',
        opcoes: [
          { valor: '#3E4A2C', rotulo: 'Verde Shapes' },
          { valor: '#131313', rotulo: 'Preto' },
          { valor: '#FF7829', rotulo: 'Laranja' },
          { valor: '#D9C7A8', rotulo: 'Bege' },
          { valor: '#F2B950', rotulo: 'Amarelo' },
          { valor: '#8A8A8A', rotulo: 'Cinza' },
        ],
      },
      {
        id: 'texto',
        label: 'Texto',
        tipo: 'textarea',
        placeholder: 'Ex.: design\nautoral',
        ajuda: 'Texto curto. Use quebras de linha para separar as palavras.',
        padrao: 'design\nautoral',
      },
    ],
    render: ShapesProdutoCard,
  },
  {
    id: 'shapes-capa',
    clienteSlug: 'shapes',
    clienteNome: 'Shapes',
    nome: 'Capa (foto + título)',
    descricao: 'Capa do carrossel — foto em tela cheia com título grande e a logo.',
    formatos: FORMATOS,
    campos: [
      {
        id: 'foto',
        label: 'Foto (tela cheia)',
        tipo: 'imagem',
        obrigatorio: true,
        ajuda: 'A foto ocupa o fundo inteiro. Use os controles para enquadrar.',
      },
      {
        id: 'titulo',
        label: 'Título',
        tipo: 'texto',
        obrigatorio: true,
        placeholder: 'Ex.: LUMINÁRIA CACTUS',
        padrao: 'LUMINÁRIA CACTUS',
      },
    ],
    render: ShapesCapaCard,
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
        padrao: '#131313',
        opcoes: SWATCHES,
      },
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
    ],
    render: ShapesFormaCard,
  },
  {
    id: 'shapes-cta',
    clienteSlug: 'shapes',
    clienteNome: 'Shapes',
    nome: 'CTA (acesse a loja)',
    descricao: 'Fechamento do carrossel — foto desfocada, forma colorida e chamada para a loja.',
    formatos: FORMATOS,
    campos: [
      { id: 'foto', label: 'Foto de fundo (desfocada)', tipo: 'imagem' },
      {
        id: 'cor_fundo',
        label: 'Cor da forma',
        tipo: 'cor',
        padrao: '#3E4A2C',
        opcoes: SWATCHES,
      },
      { id: 'texto_botao', label: 'Texto do botão', tipo: 'texto', padrao: 'ACESSE A LOJA' },
      { id: 'texto_sub', label: 'Subtexto', tipo: 'texto', padrao: 'no botão abaixo' },
      { id: 'texto_extra', label: 'Linha extra', tipo: 'texto', padrao: 'entregamos para todo Brasil' },
    ],
    render: ShapesCtaCard,
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
