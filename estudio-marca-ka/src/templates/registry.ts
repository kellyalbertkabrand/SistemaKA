import type { Template } from './types'
import { ShapesFeedbackCard } from './shapes/FeedbackCard'
import { ShapesProdutoCard } from './shapes/ProdutoCard'

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
