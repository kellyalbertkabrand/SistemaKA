// Conteúdo do Diagnóstico Marca com Essência©.
// Fonte única: perguntas, régua de notas, faixas de leitura e bibliografia.
// Para trocar uma pergunta ou um livro, edite só este arquivo.

export const PRODUTO = {
  nome: "Diagnóstico Marca com Essência©",
  autora: "Kelly Albert",
  livro: "Livro MARCA COM ESSÊNCIA©",
};

// Escala usada nas afirmações (1 a 5).
export const ESCALA = [
  { valor: 1, rotulo: "Discordo totalmente" },
  { valor: 2, rotulo: "Discordo em parte" },
  { valor: 3, rotulo: "Nem concordo, nem discordo" },
  { valor: 4, rotulo: "Concordo em parte" },
  { valor: 5, rotulo: "Concordo totalmente" },
];

export type Pergunta =
  | { id: string; tipo: "escala"; texto: string }
  | { id: string; tipo: "aberta"; texto: string; ajuda?: string };

export type Dimensao = {
  id: string;
  capitulo: number;
  nome: string;
  pilar: string;
  descricao: string;
  perguntas: Pergunta[];
};

// 7 dimensões (capítulos 4 a 10 do livro) × 5 perguntas = 35.
// Em cada dimensão: 4 afirmações em escala (entram na nota) + 1 pergunta aberta (lida pela IA).
export const DIMENSOES: Dimensao[] = [
  {
    id: "autoimagem",
    capitulo: 4,
    nome: "Autoimagem Estratégica",
    pilar: "Consciência & Essência",
    descricao: "A clareza de quem você é no seu negócio. Toda marca é uma extensão da consciência de quem a lidera.",
    perguntas: [
      { id: "autoimagem_1", tipo: "escala", texto: "Consigo explicar em uma frase quem eu sou neste negócio, além do meu cargo ou da minha profissão." },
      { id: "autoimagem_2", tipo: "escala", texto: "Sei qual papel exerço melhor na empresa (criar, gerir, vender, comunicar) e assumo esse papel." },
      { id: "autoimagem_3", tipo: "escala", texto: "Minha história e meus valores aparecem com clareza na marca." },
      { id: "autoimagem_4", tipo: "escala", texto: "O que mudou em mim nos últimos anos já aparece na comunicação da marca." },
      { id: "autoimagem_5", tipo: "aberta", texto: "Quem é você neste negócio?", ajuda: "Responda como responderia a um cliente que acabou de te conhecer." },
    ],
  },
  {
    id: "posicionamento",
    capitulo: 5,
    nome: "Posicionamento Claro",
    pilar: "Estrutura & Posicionamento",
    descricao: "O lugar que a marca ocupa na mente e no coração das pessoas. Se você não escolhe, o mercado escolhe por você.",
    perguntas: [
      { id: "posicionamento_1", tipo: "escala", texto: "Sei por que os clientes escolhem a minha marca, e não a concorrência." },
      { id: "posicionamento_2", tipo: "escala", texto: "Minha marca é lembrada por algo específico, mesmo sem eu precisar repetir." },
      { id: "posicionamento_3", tipo: "escala", texto: "Tenho clareza do que a minha marca não oferece e de quem ela não atende." },
      { id: "posicionamento_4", tipo: "escala", texto: "Minha marca raramente é comparada a concorrentes que não têm nada a ver com ela." },
      { id: "posicionamento_5", tipo: "aberta", texto: "Em uma frase simples, qual é o lugar único que a sua marca ocupa hoje?" },
    ],
  },
  {
    id: "voz",
    capitulo: 6,
    nome: "Personalidade e Voz",
    pilar: "Estrutura & Posicionamento",
    descricao: "A linguagem viva da marca: tom, vocabulário e ritmo que a tornam reconhecível mesmo sem assinatura.",
    perguntas: [
      { id: "voz_1", tipo: "escala", texto: "Sei descrever a personalidade da minha marca em poucas palavras." },
      { id: "voz_2", tipo: "escala", texto: "Minha marca fala do mesmo jeito no Instagram, no WhatsApp, no site e no atendimento." },
      { id: "voz_3", tipo: "escala", texto: "Tenho definidas as palavras que a marca usa e as que ela nunca usaria." },
      { id: "voz_4", tipo: "escala", texto: "Quem lê um texto da minha marca reconhece que é dela, mesmo sem ver o logo." },
      { id: "voz_5", tipo: "aberta", texto: "Qual emoção você quer que a sua marca desperte quando alguém lê ou ouve a sua mensagem?" },
    ],
  },
  {
    id: "arquitetura",
    capitulo: 7,
    nome: "Arquitetura de Marca",
    pilar: "Estrutura & Posicionamento",
    descricao: "A organização das ofertas: o cliente entende por onde começar e qual caminho seguir.",
    perguntas: [
      { id: "arquitetura_1", tipo: "escala", texto: "Um cliente novo sabe por onde começar quando chega à minha marca." },
      { id: "arquitetura_2", tipo: "escala", texto: "Meus produtos e serviços têm uma ordem clara de entrada, aprofundamento e topo." },
      { id: "arquitetura_3", tipo: "escala", texto: "Nenhum dos meus produtos ou serviços compete com outro ou confunde o cliente na escolha." },
      { id: "arquitetura_4", tipo: "escala", texto: "Minha equipe explica o portfólio da mesma forma que eu explicaria." },
      { id: "arquitetura_5", tipo: "aberta", texto: "O que a sua marca oferece hoje?", ajuda: "Liste do mais simples ao mais completo." },
    ],
  },
  {
    id: "visual",
    capitulo: 8,
    nome: "Expressão Visual com Propósito",
    pilar: "Estrutura & Posicionamento",
    descricao: "A coerência entre forma e verdade. Forma sem verdade é maquiagem; verdade sem forma é invisibilidade.",
    perguntas: [
      { id: "visual_1", tipo: "escala", texto: "A identidade visual da minha marca representa quem ela realmente é, e não foi feita só para parecer profissional." },
      { id: "visual_2", tipo: "escala", texto: "Cores, fontes e imagens são usadas de forma consistente em todos os pontos de contato." },
      { id: "visual_3", tipo: "escala", texto: "O que a estética da minha marca promete, a entrega cumpre." },
      { id: "visual_4", tipo: "escala", texto: "Só de bater o olho, as pessoas sentem sobre a marca o que eu quero que sintam." },
      { id: "visual_5", tipo: "aberta", texto: "Se a sua marca fosse uma imagem, o que haveria nela?", ajuda: "Um lugar, uma textura, um cenário, uma composição…" },
    ],
  },
  {
    id: "proposta",
    capitulo: 9,
    nome: "Proposta de Valor e Narrativa",
    pilar: "Expansão & Experiência",
    descricao: "A promessa que a marca cumpre com integridade e a história verdadeira que a sustenta.",
    perguntas: [
      { id: "proposta_1", tipo: "escala", texto: "Consigo dizer em uma frase o que entrego, para quem e por que isso tem valor único." },
      { id: "proposta_2", tipo: "escala", texto: "A promessa da minha marca é algo que cumpro sempre, sem exceção." },
      { id: "proposta_3", tipo: "escala", texto: "Conto a história de origem da minha marca com clareza e verdade." },
      { id: "proposta_4", tipo: "escala", texto: "Minha marca defende posições claras, mesmo quando não são populares." },
      { id: "proposta_5", tipo: "aberta", texto: "Qual é a história por trás da sua marca?", ajuda: "Quando, como e por que ela nasceu?" },
    ],
  },
  {
    id: "presenca",
    capitulo: 10,
    nome: "Presença e Comunicação Estratégica",
    pilar: "Expansão & Experiência",
    descricao: "A comunicação que acontece em todo ponto de contato, não só nas redes. O cliente não separa: ele sente o todo.",
    perguntas: [
      { id: "presenca_1", tipo: "escala", texto: "O que minha marca comunica nas redes é o mesmo que o cliente vive no atendimento." },
      { id: "presenca_2", tipo: "escala", texto: "Sei sobre quais assuntos a minha marca pode falar com autoridade e constância." },
      { id: "presenca_3", tipo: "escala", texto: "Escolho os canais onde a marca aparece de forma intencional, e não por pressão do mercado." },
      { id: "presenca_4", tipo: "escala", texto: "Se eu parasse de anunciar hoje, minha marca continuaria sendo lembrada e indicada." },
      { id: "presenca_5", tipo: "aberta", texto: "Se a sua marca ficasse em silêncio por um tempo, do que as pessoas mais sentiriam falta?" },
    ],
  },
];

// Perguntas de contexto (antes do diagnóstico; não entram na nota).
export const PERFIL = [
  { id: "marca", texto: "Nome da marca", obrigatorio: true },
  { id: "segmento", texto: "Segmento ou área de atuação", obrigatorio: true },
  { id: "tempo", texto: "Há quanto tempo a marca existe?", obrigatorio: false },
];

// Faixas da leitura geral (nota de 0 a 100).
export const FAIXAS = [
  { min: 0, nome: "Marca sem Raiz", resumo: "A marca existe no mercado, mas o lugar que ela ocupa ainda está sendo escolhido pelos outros." },
  { min: 40, nome: "Marca em Construção", resumo: "Há verdade e valor, mas a estrutura ainda não sustenta a percepção com consistência." },
  { min: 70, nome: "Marca com Direção", resumo: "A base está clara. O desafio agora é coerência em todos os pontos de contato." },
  { min: 85, nome: "Marca com Essência", resumo: "Essência, estrutura e expressão caminham juntas. A marca é lembrada, desejada e escolhida." },
];

// Lista fechada de bibliografia. A IA só pode indicar livros desta lista.
export const BIBLIOGRAFIA = [
  { id: "mce", titulo: "Marca com Essência", autor: "Kelly Albert", dimensoes: ["autoimagem", "posicionamento", "voz", "arquitetura", "visual", "proposta", "presenca"] },
  { id: "sinek", titulo: "Comece pelo Porquê (Start with Why)", autor: "Simon Sinek", dimensoes: ["autoimagem", "proposta"] },
  { id: "schein", titulo: "Cultura Organizacional e Liderança", autor: "Edgar Schein", dimensoes: ["autoimagem", "presenca"] },
  { id: "ries_trout", titulo: "Posicionamento: A Batalha por sua Mente", autor: "Al Ries e Jack Trout", dimensoes: ["posicionamento"] },
  { id: "neumeier_gap", titulo: "The Brand Gap", autor: "Marty Neumeier", dimensoes: ["posicionamento", "visual"] },
  { id: "neumeier_zag", titulo: "Zag", autor: "Marty Neumeier", dimensoes: ["posicionamento"] },
  { id: "keller", titulo: "Gestão Estratégica de Marcas (Strategic Brand Management)", autor: "Kevin Lane Keller", dimensoes: ["posicionamento", "arquitetura"] },
  { id: "mark_pearson", titulo: "O Herói e o Fora-da-Lei", autor: "Margaret Mark e Carol S. Pearson", dimensoes: ["voz"] },
  { id: "miller", titulo: "Building a StoryBrand", autor: "Donald Miller", dimensoes: ["voz", "proposta"] },
  { id: "aaker_lideranca", titulo: "Como Construir Marcas Líderes (Brand Leadership)", autor: "David Aaker e Erich Joachimsthaler", dimensoes: ["arquitetura"] },
  { id: "aaker_equity", titulo: "Managing Brand Equity", autor: "David Aaker", dimensoes: ["arquitetura", "posicionamento"] },
  { id: "kapferer", titulo: "The New Strategic Brand Management", autor: "Jean-Noël Kapferer", dimensoes: ["arquitetura", "voz"] },
  { id: "wheeler", titulo: "Design de Identidade da Marca (Designing Brand Identity)", autor: "Alina Wheeler", dimensoes: ["visual", "voz"] },
  { id: "olins", titulo: "The Brand Handbook", autor: "Wally Olins", dimensoes: ["visual", "presenca"] },
  { id: "osterwalder", titulo: "Value Proposition Design", autor: "Alexander Osterwalder e outros", dimensoes: ["proposta"] },
  { id: "mckee", titulo: "Story", autor: "Robert McKee", dimensoes: ["proposta"] },
  { id: "godin", titulo: "Isso é Marketing", autor: "Seth Godin", dimensoes: ["presenca"] },
  { id: "sharp", titulo: "How Brands Grow", autor: "Byron Sharp", dimensoes: ["presenca", "posicionamento"] },
  { id: "cialdini", titulo: "As Armas da Persuasão", autor: "Robert Cialdini", dimensoes: ["presenca"] },
  { id: "kahneman", titulo: "Rápido e Devagar", autor: "Daniel Kahneman", dimensoes: ["presenca", "posicionamento"] },
];

// Versão pública (vai para o navegador): só o necessário para mostrar as perguntas.
export function conteudoPublico() {
  return {
    produto: PRODUTO,
    escala: ESCALA,
    perfil: PERFIL,
    dimensoes: DIMENSOES.map(({ id, capitulo, nome, pilar, descricao, perguntas }) => ({
      id, capitulo, nome, pilar, descricao, perguntas,
    })),
  };
}
