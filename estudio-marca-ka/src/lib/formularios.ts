// ============================================================================
// FORMULÁRIOS do cliente (etapas do Marca com Essência©).
//
// O cliente preenche por um LINK exclusivo (sem login), com SALVAMENTO
// AUTOMÁTICO: cada resposta é gravada no Firestore (coleção `formularios`), então
// ele pode parar e continuar depois no mesmo link — inclusive trocando de
// aparelho — sem perder nada. Um rascunho local (localStorage) reforça o
// preenchimento entre um salvamento e outro.
//
// A KA gera o link na aba Formulários e acompanha as respostas por lá.
// ============================================================================

import {
  addDoc,
  collection,
  doc,
  getDocs,
  limit as fbLimit,
  orderBy,
  query,
  updateDoc,
  where,
} from 'firebase/firestore'
import { db } from './firebase'
import { moverParaLixeira } from './lixeira'

// ---- Definição das perguntas (no código; fiel ao formulário original) -------

export type TipoCampo = 'texto' | 'paragrafo' | 'email' | 'data'

export interface CampoFormulario {
  id: string
  label: string
  ajuda?: string
  tipo: TipoCampo
  obrigatorio?: boolean
}

export interface SecaoFormulario {
  titulo: string
  descricao?: string
  campos: CampoFormulario[]
}

export interface DefinicaoFormulario {
  tipo: string
  nome: string
  etapa?: string
  intro?: string
  secoes: SecaoFormulario[]
}

const IKIGAI: DefinicaoFormulario = {
  tipo: 'ikigai',
  nome: 'IKIGAI Empresarial',
  etapa: 'Projeto Marca com Essência© · Etapa 01',
  intro:
    'Bem-vindo(a) à jornada de descoberta do seu Ikigai, um elemento transformador ' +
    'não só para a sua vida pessoal, mas essencial para o brilho e o sucesso da sua ' +
    'marca ou negócio. Esta ferramenta alinha paixão, missão, vocação e profissão para ' +
    'revelar o coração da sua marca. Reflita com sinceridade sobre cada pergunta: é neste ' +
    'espaço de honestidade e introspecção que o verdadeiro Ikigai é encontrado. ' +
    'Pode responder com calma: o que você escreve fica salvo automaticamente, e você ' +
    'pode parar e voltar depois pelo mesmo link.',
  secoes: [
    {
      titulo: 'Sobre você',
      campos: [
        { id: 'email', label: 'E-mail', tipo: 'email', obrigatorio: true },
        { id: 'nome', label: 'Nome completo', tipo: 'texto', obrigatorio: true },
        { id: 'nascimento', label: 'Data de nascimento', tipo: 'data', obrigatorio: true },
        { id: 'profissao', label: 'Profissão', tipo: 'texto', obrigatorio: true },
        { id: 'cidade', label: 'Cidade e estado que mora', tipo: 'texto', obrigatorio: true },
      ],
    },
    {
      titulo: 'Paixão',
      descricao: 'Pessoal e profissional: o que você ama fazer?',
      campos: [
        {
          id: 'paixao_reflexao',
          label: 'Reflexão sobre a Paixão',
          ajuda:
            'Descreva as atividades que fazem você perder a noção do tempo e trazem uma profunda sensação de alegria.',
          tipo: 'paragrafo',
          obrigatorio: true,
        },
        {
          id: 'paixao_satisfacao',
          label: 'Satisfação no Trabalho',
          ajuda:
            'Quais aspectos do seu trabalho atual ou das atividades que você realiza são os mais gratificantes e por quê?',
          tipo: 'paragrafo',
          obrigatorio: true,
        },
        {
          id: 'paixao_inspiracao',
          label: 'Fontes de Inspiração',
          ajuda: 'Quando e em que circunstâncias você se sente mais energizado(a) e inspirado(a)?',
          tipo: 'paragrafo',
          obrigatorio: true,
        },
      ],
    },
    {
      titulo: 'Missão',
      descricao: 'Pessoal e profissional: o que o mundo precisa de você?',
      campos: [
        {
          id: 'missao_contribuicao',
          label: 'Contribuição para o Mundo',
          ajuda: 'Que problema(s) você se sente chamado(a) a resolver em sua comunidade ou no mundo?',
          tipo: 'paragrafo',
          obrigatorio: true,
        },
        {
          id: 'missao_impacto',
          label: 'Impacto do Seu Trabalho',
          ajuda:
            'Como você acredita que seu trabalho pode gerar um impacto positivo nas pessoas ou na sociedade?',
          tipo: 'paragrafo',
          obrigatorio: true,
        },
        {
          id: 'missao_legado',
          label: 'Legado Desejado',
          ajuda: 'Que mudança ou legado você deseja criar através do seu trabalho?',
          tipo: 'paragrafo',
          obrigatorio: true,
        },
      ],
    },
    {
      titulo: 'Vocação',
      descricao: 'Pelo que você pode ser pago? (áreas relacionadas ou não à sua profissão).',
      campos: [
        {
          id: 'vocacao_habilidades',
          label: 'Habilidades Valiosas',
          ajuda:
            'Quais habilidades ou talentos você possui pelos quais as pessoas estariam dispostas a pagar?',
          tipo: 'paragrafo',
          obrigatorio: true,
        },
        {
          id: 'vocacao_diferenciacao',
          label: 'Diferenciação de Mercado',
          ajuda: 'Como você se destaca dos outros em sua área de atuação?',
          tipo: 'paragrafo',
          obrigatorio: true,
        },
        {
          id: 'vocacao_proposta',
          label: 'Proposta de Valor',
          ajuda: 'Qual é a proposta de valor única que você oferece?',
          tipo: 'paragrafo',
          obrigatorio: true,
        },
      ],
    },
    {
      titulo: 'Profissão',
      descricao: 'No que você é bom?',
      campos: [
        {
          id: 'profissao_forcas',
          label: 'Forças e Habilidades',
          ajuda: 'Quais são suas maiores forças ou habilidades profissionais?',
          tipo: 'paragrafo',
          obrigatorio: true,
        },
        {
          id: 'profissao_reconhecimento',
          label: 'Reconhecimento e Feedback',
          ajuda: 'Você já recebeu algum feedback ou reconhecimento que destaque suas competências?',
          tipo: 'paragrafo',
          obrigatorio: true,
        },
        {
          id: 'profissao_especializacao',
          label: 'Especialização e Desenvolvimento',
          ajuda: 'Existe alguma área em que você gostaria de se aprofundar ou desenvolver mais?',
          tipo: 'paragrafo',
          obrigatorio: true,
        },
      ],
    },
    {
      titulo: 'Finalização',
      campos: [
        {
          id: 'final_reflexao',
          label: 'Reflexão Final',
          ajuda:
            'Existe algo mais que você gostaria de compartilhar sobre sua busca pelo Ikigai ou insights adicionais sobre sua jornada de autoconhecimento e desenvolvimento profissional?',
          tipo: 'paragrafo',
          obrigatorio: true,
        },
      ],
    },
  ],
}

/** Todos os formulários disponíveis (por enquanto só o IKIGAI). */
// ---- Formulário: Identidade Verbal (Etapa 03) -------------------------------
// Adaptado para servir DOIS casos: marca NOVA (do zero) e REPOSICIONAMENTO de
// uma marca existente. Onde o original assumia "hoje/atual/após anos", a pergunta
// foi ajustada para valer nos dois (o cliente conta como é hoje OU como deseja).
const IDENTIDADE_VERBAL: DefinicaoFormulario = {
  tipo: 'identidade-verbal',
  nome: 'Identidade Verbal',
  etapa: 'Projeto Marca com Essência© · Etapa 03',
  intro:
    'Este questionário ajuda a construir a IDENTIDADE VERBAL da sua marca — a forma como ' +
    'ela comunica, se posiciona e se diferencia. Serve tanto para uma marca nova quanto ' +
    'para reposicionar uma marca que já existe: quando a pergunta falar de "hoje/atual", ' +
    'conte como é hoje e o que mudaria; se a marca ainda é nova, responda como você DESEJA ' +
    'que seja. Responda com profundidade e honestidade. IMPORTANTE: se você já respondeu ' +
    'algo parecido no IKIGAI ou na Sua História, pode escrever "Já foi respondido".',
  secoes: [
    {
      titulo: 'Sobre você',
      campos: [
        { id: 'email', label: 'E-mail', tipo: 'email', obrigatorio: true },
        { id: 'nome_empresa', label: 'Nome completo + nome da empresa/marca', tipo: 'texto', obrigatorio: true },
      ],
    },
    {
      titulo: 'Seu negócio',
      descricao: 'Do que se trata a marca.',
      campos: [
        {
          id: 'negocio',
          label: 'Detalhamento das atividades',
          ajuda:
            'Descreva seu negócio: quais produtos ou serviços oferece (ou pretende oferecer). Há algum produto/serviço novo que deseja adicionar ou repensar?',
          tipo: 'paragrafo',
          obrigatorio: true,
        },
      ],
    },
    {
      titulo: 'História e Motivação',
      campos: [
        {
          id: 'historia',
          label: 'História e Motivação',
          ajuda: 'Como surgiu (ou como está nascendo) a sua marca? O que motivou a criação dela?',
          tipo: 'paragrafo',
          obrigatorio: true,
        },
        {
          id: 'desafios',
          label: 'Desafios e Aprendizados',
          ajuda:
            'Quais foram os maiores desafios que você superou no caminho e como isso moldou (ou molda) a sua marca?',
          tipo: 'paragrafo',
          obrigatorio: true,
        },
        {
          id: 'motivacao_atual',
          label: 'Motivação',
          ajuda: 'O que te motiva a seguir com essa marca?',
          tipo: 'paragrafo',
          obrigatorio: true,
        },
      ],
    },
    {
      titulo: 'Público-Alvo',
      campos: [
        {
          id: 'publico',
          label: 'Definição do Público-Alvo',
          ajuda:
            'Quem são (ou serão) seus clientes? Descreva as características mais marcantes: idade, profissão, interesses e estilo de vida.',
          tipo: 'paragrafo',
          obrigatorio: true,
        },
        {
          id: 'publico_problemas',
          label: 'Problemas / necessidades do público',
          ajuda:
            'Quais problemas ou necessidades do seu público a sua marca resolve? (Se a marca já existe, isso mudou desde que você a criou?)',
          tipo: 'paragrafo',
          obrigatorio: true,
        },
        {
          id: 'impacto_emocional',
          label: 'Impacto emocional da sua marca',
          ajuda:
            'Como você gostaria que seus clientes se sentissem ao interagir com sua marca e por quê? (Ex.: seguros, acolhidos, confiantes, inspirados)',
          tipo: 'paragrafo',
          obrigatorio: true,
        },
      ],
    },
    {
      titulo: 'Valores e Princípios',
      campos: [
        {
          id: 'valores',
          label: 'Valores',
          ajuda:
            'Quais são os três valores mais importantes que guiam (ou vão guiar) as decisões e ações da marca e por quê?',
          tipo: 'paragrafo',
          obrigatorio: true,
        },
        {
          id: 'principio',
          label: 'Princípio',
          ajuda:
            'Qual princípio ou crença você não abriria mão na sua marca e por quê? (Ex.: respeito ao cliente, autenticidade, ética)',
          tipo: 'paragrafo',
          obrigatorio: true,
        },
      ],
    },
    {
      titulo: 'Posicionamento e Diferenciação',
      campos: [
        {
          id: 'diferenciacao',
          label: 'Diferenciação',
          ajuda:
            'O que você oferece (ou vai oferecer) que é único ou diferente dos outros da sua área e por quê?',
          tipo: 'paragrafo',
          obrigatorio: true,
        },
        {
          id: 'reconhecimento',
          label: 'Reconhecimento da sua marca',
          ajuda:
            'Como você gostaria que sua marca fosse reconhecida no mercado e por quê? (Ex.: inovadora, confiável, acessível, referência no nicho)',
          tipo: 'paragrafo',
          obrigatorio: true,
        },
        {
          id: 'essencia',
          label: 'Essência da sua marca',
          ajuda:
            'Se pudesse resumir a essência da sua marca em uma frase, qual seria? (Ex.: "Minha marca é reconhecida por proporcionar uma experiência completa e personalizada para cada cliente.")',
          tipo: 'paragrafo',
          obrigatorio: true,
        },
      ],
    },
    {
      titulo: 'Tom de Voz e Personalidade',
      campos: [
        {
          id: 'tom_voz',
          label: 'Tom de voz da sua marca',
          ajuda:
            'Como sua marca "fala" (ou deveria falar) com o público? (Ex.: amigável, formal, técnica, inspiradora). Se já existe: está satisfeito(a) com esse tom? O que mudaria e por quê?',
          tipo: 'paragrafo',
          obrigatorio: true,
        },
        {
          id: 'personalidade',
          label: 'Personalidade da sua marca',
          ajuda:
            'Se sua marca fosse uma pessoa, como ela seria? Descreva traços de personalidade e por quê. Como essa "pessoa" interagiria com o público?',
          tipo: 'paragrafo',
          obrigatorio: true,
        },
        {
          id: 'emocoes',
          label: 'Emoções que sua marca transmite',
          ajuda:
            'Que emoção ou sentimento você quer que seus clientes sintam ao interagir com sua marca e por quê? (Ex.: confiança, segurança, inspiração)',
          tipo: 'paragrafo',
          obrigatorio: true,
        },
      ],
    },
    {
      titulo: 'Slogan',
      descricao: 'O slogan é uma frase curta que resume a essência da marca e comunica, de forma impactante, o que você faz.',
      campos: [
        {
          id: 'slogan',
          label: 'Sobre o seu slogan',
          ajuda:
            'Se sua marca já tem um slogan, escreva-o e avalie se ainda reflete a essência. Se não tem, resuma o que considera importante para sugerirmos um (ex.: que transmita confiança, inovação ou cuidado).',
          tipo: 'paragrafo',
          obrigatorio: true,
        },
      ],
    },
    {
      titulo: 'Pilares e Fundamentação',
      campos: [
        {
          id: 'mensagem',
          label: 'Mensagem que sua marca transmite',
          ajuda:
            'Quais palavras ou frases você gostaria que seus clientes associassem à sua marca e por quê? (Ex.: excelência, proximidade, inovação)',
          tipo: 'paragrafo',
          obrigatorio: true,
        },
        {
          id: 'pilares',
          label: 'Pilares da sua marca',
          ajuda:
            'Quais são os pilares ou princípios centrais que sustentam (ou vão sustentar) a sua marca e por quê?',
          tipo: 'paragrafo',
          obrigatorio: true,
        },
        {
          id: 'pilares_implementacao',
          label: 'Implementação dos pilares',
          ajuda:
            'Como você reflete (ou pretende refletir) esses pilares nas suas ações, produtos ou serviços?',
          tipo: 'paragrafo',
          obrigatorio: true,
        },
      ],
    },
    {
      titulo: 'Estilo Visual',
      campos: [
        {
          id: 'identidade_visual',
          label: 'Identidade visual',
          ajuda:
            'Como você imagina a identidade visual da sua marca? Se já existe, o que ajustaria (ex.: mais moderna, minimalista, acessível) e por quê?',
          tipo: 'paragrafo',
          obrigatorio: true,
        },
        {
          id: 'cores_elementos',
          label: 'Cores e elementos visuais',
          ajuda:
            'Quais cores ou elementos visuais representam melhor a sua marca e por quê? (Ex.: azul para confiança, cinza para sofisticação)',
          tipo: 'paragrafo',
          obrigatorio: true,
        },
      ],
    },
    {
      titulo: 'Concorrentes e Inspirações',
      campos: [
        {
          id: 'concorrentes',
          label: 'Concorrentes',
          ajuda:
            'Quais são seus concorrentes diretos e indiretos e por que você escolheu cada um? Escreva o nome, o motivo e o link do site/redes (e comentários do Google, se tiver).',
          tipo: 'paragrafo',
          obrigatorio: true,
        },
        {
          id: 'ref_pessoais',
          label: 'Referência em marcas pessoais',
          ajuda:
            'Marcas pessoais são construídas em torno de uma pessoa (médicos, advogados, profissionais com forte presença digital). Quais você admira e por quê?',
          tipo: 'paragrafo',
          obrigatorio: true,
        },
        {
          id: 'ref_corporativas',
          label: 'Referência em marcas corporativas',
          ajuda:
            'Marcas corporativas são ligadas a empresas (joias, carros, roupas...). Cite marcas que você admira, como elas se posicionam e por que são referência para você.',
          tipo: 'paragrafo',
          obrigatorio: true,
        },
      ],
    },
  ],
}

export const FORMULARIOS: Record<string, DefinicaoFormulario> = {
  ikigai: IKIGAI,
  'identidade-verbal': IDENTIDADE_VERBAL,
}

export function definicaoFormulario(tipo: string): DefinicaoFormulario | null {
  return FORMULARIOS[tipo] ?? null
}

/** Lista plana de todos os campos de uma definição (para contar progresso). */
export function camposDe(def: DefinicaoFormulario): CampoFormulario[] {
  return def.secoes.flatMap((s) => s.campos)
}

// ---- Instância preenchida pelo cliente (Firestore `formularios`) ------------

export interface Formulario {
  id: string
  token: string
  tipo: string
  cliente_id?: string | null
  cliente_nome?: string | null
  titulo?: string
  respostas: Record<string, string>
  status: 'rascunho' | 'enviado'
  criado_em: string
  atualizado_em?: string | null
  enviado_em?: string | null
}

// ---- Etapas do Projeto Marca com Essência© ---------------------------------
// O projeto tem etapas em ordem. Algumas são FORMULÁRIO (o cliente preenche por
// link, ex.: IKIGAI); outras são MENSAGEM (não têm formulário — o cliente faz
// algo e a KA só envia a mensagem padrão, ex.: mandar a história por áudio).

export interface EtapaProjeto {
  n: number
  nome: string
  descricao: string
  tipo: 'formulario' | 'mensagem'
  /** Quando `tipo==='formulario'`, qual formulário usar (chave em FORMULARIOS). */
  formTipo?: string
}

export const ETAPAS_MARCA_ESSENCIA: EtapaProjeto[] = [
  {
    n: 1,
    nome: 'IKIGAI Empresarial',
    descricao:
      'Formulário de autoconhecimento (paixão, missão, vocação e profissão). O cliente preenche pelo link.',
    tipo: 'formulario',
    formTipo: 'ikigai',
  },
  {
    n: 2,
    nome: 'Sua História',
    descricao:
      'Sem formulário: o cliente envia a história dele por ÁUDIO no WhatsApp da Kelly. Você manda a mensagem padrão abaixo.',
    tipo: 'mensagem',
  },
  {
    n: 3,
    nome: 'Identidade Verbal',
    descricao:
      'Formulário que constrói a identidade verbal da marca (posicionamento, tom de voz, pilares, slogan). Serve para marca nova ou reposicionamento.',
    tipo: 'formulario',
    formTipo: 'identidade-verbal',
  },
]

/** Número da etapa com dois dígitos ("01", "02"). */
export function rotuloEtapa(n: number): string {
  return `Etapa ${String(n).padStart(2, '0')}`
}

/**
 * Mensagem padrão da Etapa 02 (Sua História) para o WhatsApp. `nome` opcional:
 * se vier, a saudação usa o nome; se não, fica "Olá!".
 */
export function mensagemHistoria(nome?: string | null): string {
  const saud = nome && nome.trim() ? `Olá, ${nome.trim()}!` : 'Olá!'
  return [
    saud,
    '',
    'Agora que você terminou a etapa do Ikigai vamos para uma etapa muito especial da nossa jornada: *o envio da sua história pessoal.*',
    '',
    'Essa parte é fundamental para que a Kelly compreenda com mais profundidade o caminho que te trouxe até aqui e como essa trajetória pode se refletir de forma autêntica na identidade da sua marca.',
    '',
    'O que você deve fazer: Compartilhe, por áudio, tudo o que sentir que é relevante. Mas, se possível, inclua pontos como:',
    '– Infância e família',
    '– Escolhas profissionais',
    '– Desafios enfrentados',
    '– Como surgiu a sua empresa',
    '',
    'Instruções importantes:',
    '1. Envie os áudios diretamente para o WhatsApp pessoal da Kelly.',
    '2. Cada áudio deve ter no máximo 8 minutos.',
    '3. Pode mandar quantos áudios quiser.',
    '4. Assim que finalizar os envios, avise aqui no grupo.',
    '',
    'Esses áudios ficarão exclusivamente com a Kelly e serão utilizados apenas na construção da essência e da identidade verbal da sua marca.',
    '',
    'Fico aqui acompanhando o processo com você!',
    '',
    'Qualquer dúvida, estou por aqui. Felipe – Equipe KA | Inteligência para Marcas',
  ].join('\n')
}

/**
 * Mensagem padrão (fixa) de BOAS-VINDAS ao grupo do projeto (WhatsApp). Enviada
 * quando a KA cria um grupo novo com o cliente para conduzir o projeto. Texto
 * genérico ("da sua marca") — serve para qualquer grupo. Usa *asteriscos* =
 * negrito do WhatsApp.
 */
export function mensagemBoasVindasGrupo(): string {
  return [
    'Olá! Sejam bem-vindos todos que fazem parte deste grupo.',
    '',
    'Criamos este espaço para ser *exclusivo do projeto da sua marca*: é aqui que vamos conduzir, juntos, cada etapa do Projeto de Posicionamento *Marca com Essência©*.',
    '',
    'Para que serve este grupo:',
    '– Centralizar tudo sobre o projeto num lugar só;',
    '– Enviar os links de cada etapa (formulários e orientações) e receber os seus retornos;',
    '– Alinhar prazos, compartilhar materiais e tirar dúvidas;',
    '– Acompanhar o andamento do começo ao fim.',
    '',
    'Combinado importante: vamos manter as conversas do projeto por aqui, para nada se perder e o processo fluir com clareza.',
    '',
    'Estamos muito felizes por começar essa jornada com você. Qualquer coisa, é só chamar por aqui.',
    '',
    'Equipe KA | Inteligência para Marcas',
  ].join('\n')
}

function agora() {
  return new Date().toISOString()
}
function novoToken() {
  // Token menor (16 hex ≈ 1,8×10^19 combinações — deixa a URL curta e continua
  // praticamente impossível de adivinhar). Links antigos (32 hex) seguem valendo.
  return crypto.randomUUID().replace(/-/g, '').slice(0, 16)
}

export async function listarFormularios(): Promise<Formulario[]> {
  const snap = await getDocs(query(collection(db, 'formularios'), orderBy('criado_em', 'desc')))
  return snap.docs
    .filter((d) => !d.data().excluido_em)
    .map((d) => ({ id: d.id, ...(d.data() as Omit<Formulario, 'id'>) }))
}

export async function criarFormulario(dados: {
  tipo: string
  cliente_id?: string | null
  cliente_nome?: string | null
  /** Respostas iniciais (ex.: pré-preenchidas com os dados do cliente). */
  respostas?: Record<string, string>
}): Promise<Formulario> {
  const def = definicaoFormulario(dados.tipo)
  const quando = agora()
  const novo = {
    token: novoToken(),
    tipo: dados.tipo,
    cliente_id: dados.cliente_id ?? null,
    cliente_nome: dados.cliente_nome ?? null,
    titulo: def?.nome ?? 'Formulário',
    respostas: dados.respostas ?? {},
    status: 'rascunho' as const,
    criado_em: quando,
    atualizado_em: quando,
    enviado_em: null,
  }
  const ref = await addDoc(collection(db, 'formularios'), novo)
  return { id: ref.id, ...novo }
}

/** Dados do cadastro do cliente que já dá para pré-preencher no formulário. */
export function prefillDoCliente(
  tipo: string,
  c: {
    email_contato?: string | null
    responsavel?: string | null
    contrato_nome?: string | null
    fundador_nome?: string | null
    nome_marca?: string | null
    cidade?: string | null
  },
): Record<string, string> {
  if (tipo !== 'ikigai') return {}
  const nome = (c.contrato_nome || c.fundador_nome || c.responsavel || c.nome_marca || '').trim()
  const out: Record<string, string> = {}
  if (c.email_contato) out.email = c.email_contato.trim()
  if (nome) out.nome = nome
  if (c.cidade) out.cidade = c.cidade.trim()
  return out
}

export async function excluirFormulario(id: string): Promise<void> {
  await moverParaLixeira('formularios', id)
}

function slugTexto(t: string): string {
  return t
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40)
}

/**
 * Link do formulário com URL LIMPA (ex.: `/formulario/boba-joy-ikigai-<token>`).
 * O token (32 hex, sem hífen) fica NO FIM e é o que identifica o formulário; o
 * slug antes dele é só cosmético. Links antigos (só o token) continuam valendo.
 */
export function linkPublicoFormulario(token: string, rotulo?: string | null): string {
  const slug = rotulo ? slugTexto(rotulo) : ''
  const cauda = slug ? `${slug}-${token}` : token
  return `${window.location.origin}/formulario/${cauda}`
}

/** Do parâmetro da URL ("slug-<token>" ou só o token), devolve o token. */
export function tokenDoParametroFormulario(param: string): string {
  const i = param.lastIndexOf('-')
  return i >= 0 ? param.slice(i + 1) : param
}

async function formularioPorTokenDoc(token: string): Promise<Formulario | null> {
  const snap = await getDocs(
    query(collection(db, 'formularios'), where('token', '==', token), fbLimit(1)),
  )
  const d = snap.docs[0]
  return d ? ({ id: d.id, ...(d.data() as Omit<Formulario, 'id'>) }) : null
}

export async function carregarFormulario(token: string): Promise<Formulario | null> {
  return formularioPorTokenDoc(token)
}

/** Salvamento automático das respostas (o cliente não perde o que digitou). */
export async function salvarRespostas(id: string, respostas: Record<string, string>): Promise<void> {
  await updateDoc(doc(db, 'formularios', id), { respostas, atualizado_em: agora() })
}

export async function enviarFormulario(id: string, respostas: Record<string, string>): Promise<void> {
  await updateDoc(doc(db, 'formularios', id), {
    respostas,
    status: 'enviado',
    enviado_em: agora(),
    atualizado_em: agora(),
  })
}

/** Reabre um formulário enviado (caso o cliente precise ajustar). */
export async function reabrirFormulario(id: string): Promise<void> {
  await updateDoc(doc(db, 'formularios', id), { status: 'rascunho', enviado_em: null })
}
