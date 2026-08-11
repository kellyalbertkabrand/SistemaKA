// ============================================================================
// NOVIDADES / ATUALIZAÇÕES DO SISTEMA — histórico mostrado no painel (Shapes).
//
// É um "changelog" simples e legível: cada alteração relevante feita no sistema
// entra aqui (a mais recente em cima). Para adicionar uma novidade, é só criar
// um item novo no topo do array. A versão no ar é sempre a mais recente.
// ============================================================================

export interface Novidade {
  /** Data no formato DD/MM/AAAA (ou mês/ano). */
  data: string
  /** Título curto do conjunto de mudanças. */
  titulo: string
  /** Lista de alterações daquele dia. */
  itens: string[]
}

export const NOVIDADES: Novidade[] = [
  {
    data: '11/08/2026',
    titulo: 'Vídeos e carrossel',
    itens: [
      'O logo voltou a aparecer nos vídeos exportados (capa e CTA).',
      'O vídeo agora salva direto no rolo de câmera no iPhone e no Android.',
      'Os modelos dentro do carrossel ficaram idênticos aos de fora (o CTA volta a abrir com “ACESSE A LOJA”).',
      'Mais respiro no texto do botão “acesse a loja”.',
    ],
  },
  {
    data: '08/2026',
    titulo: 'Organização das tarefas',
    itens: ['Botões ↑/↓ para reordenar tarefas, além de arrastar.'],
  },
  {
    data: '29/07/2026',
    titulo: 'Template “Imagem inteira”',
    itens: [
      'Novo modelo com a foto ou vídeo em tela cheia (posição e zoom ajustáveis).',
      'Caixa de texto translúcida, posicionável em cima, no meio ou embaixo.',
      'Tamanho do texto ajustável.',
      'Correção do logo que saía “metade preto, metade branco”.',
    ],
  },
  {
    data: '07/2026',
    titulo: 'Vídeo em mais cards',
    itens: [
      'Todos os cards com foto passaram a aceitar vídeo (produto, frase, grafismo, cores, forma, CTA).',
      'Forma quadrada (reta) para as fotos, além das orgânicas.',
    ],
  },
]
