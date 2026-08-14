import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore'
import { db } from './firebase'
import { moverParaLixeira } from './lixeira'
import {
  contratanteNome,
  documentoRotulado,
  formatarDocumento,
  qualificacaoContratante,
  rotuloTipoDocumento,
} from './documento'
import type {
  Cliente,
  Cobranca,
  Contrato,
  ModeloContrato,
  Orcamento,
  OrcamentoItem,
  OrcamentoStatus,
  PropostaCampos,
} from './database.types'

// ============================================================================
// Camada de dados da GESTÃO (orçamentos, contratos, cobranças) — Firebase.
// Antes: Supabase (tabelas + RLS + RPCs + Edge Functions). Agora: Firestore,
// com a mesma interface pública. A lógica que era feita em RPC no servidor
// (responder orçamento → gerar contrato + cobrança) roda aqui no cliente.
//
// Observações sobre o plano grátis (Spark) do Firebase:
//  - Não há Cloud Functions, então o Mercado Pago (link automático) e o convite
//    por e-mail ficam manuais por enquanto (ver mensagens específicas).
//  - As páginas públicas por token leem direto do Firestore (regras liberam).
// ============================================================================

const agora = () => new Date().toISOString()

function comId<T>(id: string, data: Record<string, unknown>): T {
  return { id, ...data } as T
}

function limpar<T extends Record<string, unknown>>(obj: T): T {
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(obj)) if (v !== undefined) out[k] = v
  return out as T
}

/** Token aleatório para os links públicos (orçamento/contrato). */
function novoToken(): string {
  const c = globalThis.crypto
  if (c && 'randomUUID' in c) return c.randomUUID().replace(/-/g, '')
  return Array.from({ length: 32 }, () => Math.floor(Math.random() * 16).toString(16)).join('')
}

export function valorTotalOrcamento(itens: OrcamentoItem[], desconto: number): number {
  const soma = itens.reduce((t, i) => t + (Number(i.qtd) || 0) * (Number(i.valor) || 0), 0)
  return Math.max(0, soma - (Number(desconto) || 0))
}

export function formatarBRL(v: number | null | undefined): string {
  return (v ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export function formatarData(d: string | null | undefined): string {
  if (!d) return '-'
  const data = d.length === 10 ? new Date(`${d}T12:00:00`) : new Date(d)
  return data.toLocaleDateString('pt-BR')
}

const MESES_PT = [
  'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
  'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro',
]

/** Data por extenso p/ contratos: "16 de julho de 2026". */
export function formatarDataExtenso(d: string | null | undefined): string {
  if (!d) return ''
  const data = d.length === 10 ? new Date(`${d}T12:00:00`) : new Date(d)
  return `${data.getDate()} de ${MESES_PT[data.getMonth()]} de ${data.getFullYear()}`
}

// Data de hoje no fuso LOCAL como "YYYY-MM-DD" (não usar toISOString/UTC).
function hojeLocalISO(): string {
  const d = new Date()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${mm}-${dd}`
}

// STATUS EFETIVO de uma cobrança: se está "pendente" e o vencimento já passou,
// ela é "atrasada" (o status era só armazenado e nunca virava atrasada sozinho).
// Derivado na leitura — não depende de nenhuma rotina que grave o estado.
export function statusEfetivo(
  c: { status: Cobranca['status']; vencimento: string | null | undefined },
): Cobranca['status'] {
  if (c.status === 'pendente' && c.vencimento && c.vencimento.slice(0, 10) < hojeLocalISO()) {
    return 'atrasada'
  }
  return c.status
}

// ---- Ficha do cliente ---------------------------------------------------------

export type FichaCliente = Partial<
  Pick<
    Cliente,
    | 'nome_marca'
    | 'slug'
    | 'instagram_handle'
    | 'segmento'
    | 'site'
    | 'status'
    | 'responsavel'
    | 'email_contato'
    | 'telefone'
    | 'endereco'
    | 'cidade'
    | 'observacoes'
    | 'email_cobranca'
    | 'documento'
    | 'valor_mensalidade'
    | 'dia_vencimento'
    | 'cobranca_ativa'
    | 'razao_social'
    | 'fundador_nome'
    | 'fundador_cpf'
    | 'contrato_nome'
    | 'contrato_documento'
    | 'contrato_rg'
    | 'contrato_email'
    | 'pagamentos_contrato'
    | 'socios'
  >
>

export async function salvarFichaCliente(id: string, dados: FichaCliente): Promise<Cliente> {
  await updateDoc(doc(db, 'clientes', id), limpar({ ...dados }))
  const d = await getDoc(doc(db, 'clientes', id))
  return comId<Cliente>(d.id, d.data() ?? {})
}

/**
 * "Convida" um e-mail para acessar o sistema vinculado a um cliente.
 * No plano grátis não há envio de e-mail automático; então gravamos um convite
 * em `convites`. Quando a pessoa entrar com o Google usando esse mesmo e-mail,
 * o app vincula o login à marca automaticamente (ver AuthContext).
 */
export async function convidarUsuario(
  email: string,
  clienteId: string,
  clienteSlug: string | null,
): Promise<void> {
  const chave = email.trim().toLowerCase()
  await setDoc(doc(db, 'convites', chave), {
    email: chave,
    cliente_id: clienteId,
    cliente_slug: clienteSlug,
    criado_em: agora(),
  })
}

/**
 * Cadastro público: o próprio cliente preenche a ficha dele pelo link
 * `/cadastro`, criando um registro na coleção `clientes` (aparece na aba
 * Clientes da KA). Marcado com `origem: 'auto-cadastro'`.
 */
export async function cadastrarClientePublico(
  dados: FichaCliente & { nome_marca: string },
): Promise<void> {
  const novo = limpar({
    nome_marca: dados.nome_marca,
    instagram_handle: dados.instagram_handle ?? null,
    segmento: dados.segmento ?? null,
    site: dados.site ?? null,
    status: 'ativo',
    slug: null,
    responsavel: dados.responsavel ?? null,
    email_contato: dados.email_contato ?? null,
    telefone: dados.telefone ?? null,
    endereco: dados.endereco ?? null,
    cidade: dados.cidade ?? null,
    observacoes: dados.observacoes ?? null,
    email_cobranca: dados.email_cobranca ?? dados.email_contato ?? null,
    documento: dados.documento ?? null,
    razao_social: dados.razao_social ?? null,
    fundador_nome: dados.fundador_nome ?? null,
    fundador_cpf: dados.fundador_cpf ?? null,
    contrato_nome: dados.contrato_nome ?? null,
    contrato_documento: dados.contrato_documento ?? null,
    contrato_rg: dados.contrato_rg ?? null,
    contrato_email: dados.contrato_email ?? null,
    socios: dados.socios ?? null,
    valor_mensalidade: null,
    dia_vencimento: 10,
    cobranca_ativa: false,
    origem: 'auto-cadastro',
    revisado: false,
    criado_em: agora(),
  })
  await addDoc(collection(db, 'clientes'), novo)
}

export function linkPublicoCadastro(): string {
  return `${window.location.origin}/cadastro`
}

/** Marca um cadastro novo como já visto pela KA (tira a etiqueta "NOVO"). */
export async function marcarClienteRevisado(id: string): Promise<void> {
  await updateDoc(doc(db, 'clientes', id), { revisado: true })
}

/**
 * Exclui o cliente (para limpar testes). Orçamentos, contratos e cobranças
 * ligados a ele NÃO são apagados juntos — apague-os nas respectivas abas.
 */
export async function excluirCliente(id: string): Promise<void> {
  await moverParaLixeira('clientes', id)
}

// ---- Orçamentos -------------------------------------------------------------

export async function listarOrcamentos(): Promise<Orcamento[]> {
  const snap = await getDocs(query(collection(db, 'orcamentos'), orderBy('criado_em', 'desc')))
  return snap.docs.filter((d) => !d.data().excluido_em).map((d) => comId<Orcamento>(d.id, d.data()))
}

export type NovoOrcamento = Pick<
  Orcamento,
  | 'cliente_id'
  | 'destinatario_nome'
  | 'destinatario_email'
  | 'destinatario_telefone'
  | 'destinatario_documento'
  | 'razao_social'
  | 'fundador_nome'
  | 'fundador_cpf'
  | 'titulo'
  | 'descricao'
  | 'itens'
  | 'desconto'
  | 'valor_total'
  | 'condicoes'
  | 'validade'
  | 'proposta'
>

export async function criarOrcamento(dados: NovoOrcamento): Promise<Orcamento> {
  const novo = limpar({
    ...dados,
    status: 'rascunho' as OrcamentoStatus,
    token: novoToken(),
    modelo_contrato_id: null,
    contrato_id: null,
    cobranca_id: null,
    criado_em: agora(),
    enviado_em: null,
    respondido_em: null,
  })
  const ref = await addDoc(collection(db, 'orcamentos'), novo)
  return comId<Orcamento>(ref.id, novo)
}

export async function atualizarOrcamento(
  id: string,
  dados: Partial<NovoOrcamento> & { status?: OrcamentoStatus; enviado_em?: string | null },
): Promise<Orcamento> {
  await updateDoc(doc(db, 'orcamentos', id), limpar({ ...dados }))
  const d = await getDoc(doc(db, 'orcamentos', id))
  return comId<Orcamento>(d.id, d.data() ?? {})
}

export async function enviarOrcamento(id: string): Promise<Orcamento> {
  return atualizarOrcamento(id, { status: 'enviado', enviado_em: agora() })
}

export async function excluirOrcamento(id: string): Promise<void> {
  await moverParaLixeira('orcamentos', id)
}

export function linkPublicoOrcamento(token: string): string {
  return `${window.location.origin}/orcamento/${token}`
}

// ---- Página pública do orçamento (por token) ---------------------------------

export interface OrcamentoPublico {
  titulo: string
  descricao: string | null
  destinatario_nome: string
  itens: OrcamentoItem[]
  desconto: number
  valor_total: number
  condicoes: string | null
  validade: string | null
  proposta: PropostaCampos | null
  status: OrcamentoStatus
  criado_em: string
  respondido_em: string | null
}

async function orcamentoPorTokenDoc(token: string): Promise<Orcamento | null> {
  const snap = await getDocs(
    query(collection(db, 'orcamentos'), where('token', '==', token), limit(1)),
  )
  const d = snap.docs[0]
  return d ? comId<Orcamento>(d.id, d.data()) : null
}

export async function orcamentoPorToken(token: string): Promise<OrcamentoPublico | null> {
  const o = await orcamentoPorTokenDoc(token)
  if (!o) return null
  return {
    titulo: o.titulo,
    descricao: o.descricao,
    destinatario_nome: o.destinatario_nome,
    itens: o.itens,
    desconto: o.desconto,
    valor_total: o.valor_total,
    condicoes: o.condicoes,
    validade: o.validade,
    proposta: o.proposta ?? null,
    status: o.status,
    criado_em: o.criado_em,
    respondido_em: o.respondido_em,
  }
}

/**
 * Modelo padrão da PROPOSTA no layout KA (baseado na proposta do Sistema
 * Visual de Publicações da Marca). O botão "Preencher com o modelo" do editor
 * usa isto; a KA então adapta os textos ao cliente.
 */
export function modeloPropostaPadrao(): PropostaCampos {
  return {
    subtitulo:
      'Estúdio digital da marca para criar as artes das redes sociais na identidade ' +
      'oficial: é só anexar a foto, escrever o texto e baixar a peça pronta para postar.',
    cidade: '',
    objeto:
      'Implantação e operação contínua de um estúdio digital próprio da marca, acessado ' +
      'pelo navegador, para produzir as publicações das redes sociais sempre dentro da identidade ' +
      'visual oficial da marca. Todo o design já vem *travado nos templates aprovados*: cores, ' +
      'fontes licenciadas, formas e logotipo. A criação do dia a dia se resume a anexar a foto, ' +
      'escrever o texto e escolher o formato. O resultado sai em alta resolução, pronto para o Instagram.',
    painel_a:
      'Estúdio da marca\n' +
      'Acesso exclusivo, pelo navegador\n' +
      '*Templates oficiais* validados com a marca\n' +
      '*3 formatos* por peça: Feed 4:5, Story 9:16 e Quadrado 1:1\n' +
      '*Construtor de carrossel*: até 10 slides, reordenação e download em .zip\n' +
      'Download em *PNG de alta resolução*, com assinatura digital de autoria da marca\n' +
      'Funciona no *celular e no computador* (mobile e desktop), direto do navegador, sem instalar nada',
    painel_b:
      'Identidade protegida\n' +
      'O design não desvia do manual, post após post\n' +
      'Fontes licenciadas da marca hospedadas no próprio sistema\n' +
      '*Paleta oficial* sempre à mão nas amostras\n' +
      'O *logotipo troca de cor sozinho* conforme o fundo, em todos os cards\n' +
      'Templates fiéis aos layouts aprovados, desenhados em tamanho real\n' +
      'Qualquer pessoa da equipe cria *sem precisar saber design*',
    destaque:
      'Criação em minutos, design de estúdio\n' +
      'A pessoa escolhe o modelo, anexa a foto e escreve o texto: o sistema monta a arte ' +
      '*no padrão aprovado* e entrega o PNG pronto para postar. Sem montagem manual, sem retrabalho, ' +
      'sem "quase na identidade". Consistência visual é o que constrói o reconhecimento da marca.',
    incluso:
      '*Hospedagem* do estúdio no ar, 24 horas\n' +
      '*Certificado de segurança* (site sob HTTPS)\n' +
      '*Fontes e elementos oficiais* da marca hospedados no sistema\n' +
      '*Manutenção* e atualizações da plataforma\n' +
      '*Pequenos ajustes* e melhorias contínuas nos templates\n' +
      '*Suporte direto* com a KA\n' +
      '*Monitoramento* e disponibilidade do serviço\n' +
      '*Novos formatos* das peças atuais conforme as redes mudarem',
    necessario:
      '*Fotos dos produtos* em boa resolução para as peças. O logotipo e o manual da marca já ' +
      'estão com a KA. Domínio próprio (URL) é *opcional*: o estúdio pode rodar em endereço ' +
      'exclusivo dentro do domínio da KA, sem custo extra.',
    prazo: '*Até 15 dias úteis* após a aprovação.',
    entrega: 'Estúdio no ar com os templates e o carrossel, acesso criado e treinamento de uso feito.',
    fases:
      'Card com vídeo e áudio | O vídeo do produto entra dentro da arte, com o áudio original, pronto para o carrossel. Tecnologia já validada pela KA.\n' +
      'Novos templates e formatos | Capa de Reels, anúncios, peças de datas sazonais e novos layouts conforme a marca lançar.',
    impl_titulo: 'Valor da implantação em até 2×',
    impl_valor: '2× de R$ 1.250 no Pix',
    impl_sub: 'Total: R$ 2.500.',
    impl_desc:
      'Personalização completa com a identidade da marca, os templates oficiais validados e treinamento de uso.',
    mensal_titulo: 'Mensalidade · Plano tudo incluído',
    mensal_valor: 'R$ 420/mês',
    mensal_desc:
      'Hospedagem, infraestrutura, manutenção, suporte e pequenos ajustes.\nInício após a entrega da implantação.',
    pagamento: 'Implantação em *até 2×* mais mensalidade recorrente via boleto ou Pix.',
    fidelidade: 'Sem fidelidade. *Cancelável a qualquer momento*, sem multa.',
    reajuste: 'Anual, pela variação do *IPCA* acumulado.',
    proximos:
      '1. aprovar esta proposta; 2. a KA coloca o estúdio no ar e agenda o treinamento. ' +
      'Em até 15 dias úteis, a marca publica a primeira peça criada no próprio estúdio.',
    cidade_rodape: 'Porto Alegre, RS',
  }
}

function preencherModelo(texto: string, dados: Record<string, string>): string {
  return texto.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_m, chave: string) => dados[chave] ?? '')
}

/**
 * Aprova/recusa um orçamento. Ao aprovar, gera o contrato (a partir do modelo
 * padrão) e uma cobrança avulsa, e devolve o token do contrato para o cliente
 * assinar. Reproduz a antiga RPC `responder_orcamento`.
 */
export async function responderOrcamento(
  token: string,
  aprovado: boolean,
  nome?: string,
  documento?: string,
): Promise<string | null> {
  const o = await orcamentoPorTokenDoc(token)
  if (!o) throw new Error('Orçamento não encontrado.')
  if (o.status === 'aprovado' || o.status === 'recusado') {
    throw new Error('Este orçamento já foi respondido.')
  }

  const quando = agora()

  if (!aprovado) {
    await updateDoc(doc(db, 'orcamentos', o.id), {
      status: 'recusado',
      respondido_em: quando,
      destinatario_nome: nome ?? o.destinatario_nome,
      destinatario_documento: documento ?? o.destinatario_documento,
    })
    return null
  }

  // Modelo de contrato padrão (ou o primeiro que houver).
  const modelos = await listarModelosContrato()
  const modelo = modelos.find((m) => m.padrao) ?? modelos[0]
  const nomeFinal = nome ?? o.destinatario_nome
  const docFinal = documento ?? o.destinatario_documento ?? ''
  const corpo = modelo
    ? preencherModelo(modelo.conteudo, {
        cliente_nome: nomeFinal,
        cliente_documento: docFinal ? formatarDocumento(docFinal) : '',
        cliente_documento_tipo: rotuloTipoDocumento(docFinal),
        cliente_documento_rotulado: documentoRotulado(docFinal),
        contratante_nome: contratanteNome(nomeFinal, o.razao_social, docFinal),
        contratante_qualificacao: qualificacaoContratante({
          nome: nomeFinal,
          razaoSocial: o.razao_social,
          documento: docFinal,
        }),
        assinante_nome: nomeFinal,
        assinante_documento_rotulado: documentoRotulado(docFinal),
        cliente_endereco: '',
        razao_social: o.razao_social ?? '',
        fundador_nome: o.fundador_nome ?? '',
        fundador_cpf: o.fundador_cpf ?? '',
        titulo: o.titulo,
        descricao: o.descricao ?? '',
        valor: formatarBRL(o.valor_total),
        valor_total: formatarBRL(o.valor_total),
        data: formatarDataExtenso(quando),
      })
    : `Contrato referente a: ${o.titulo}\n\nValor: ${formatarBRL(o.valor_total)}\n` +
      `Contratante: ${nomeFinal} (${docFinal}).`

  const contratoToken = novoToken()
  const contrato = limpar({
    orcamento_id: o.id,
    cliente_id: o.cliente_id,
    titulo: `Contrato: ${o.titulo}`,
    conteudo: corpo,
    status: 'enviado',
    token: contratoToken,
    telefone: o.destinatario_telefone ?? null,
    criado_em: quando,
    enviado_em: quando,
    assinado_em: null,
    assinatura_nome: null,
    assinatura_documento: null,
    assinatura_user_agent: null,
  })
  const contratoRef = await addDoc(collection(db, 'contratos'), contrato)

  // COBRANÇA AUTOMÁTICA — DESLIGADA (decisão da KA, jul/2026): por enquanto a KA
  // lança CADA cobrança à mão (aba Cobranças), então aprovar um orçamento gera
  // só o contrato, não a cobrança. Para RELIGAR no futuro, recrie aqui a
  // cobrança avulsa (vencimento ~7 dias, valor = o.valor_total, tipo 'avulsa')
  // e grave o `cobranca_id` no orçamento abaixo.

  await updateDoc(doc(db, 'orcamentos', o.id), {
    status: 'aprovado',
    respondido_em: quando,
    destinatario_nome: nomeFinal,
    destinatario_documento: docFinal,
    modelo_contrato_id: modelo?.id ?? null,
    contrato_id: contratoRef.id,
    cobranca_id: null,
  })

  return contratoToken
}

// ---- Contratos ---------------------------------------------------------------

export async function listarContratos(): Promise<Contrato[]> {
  const snap = await getDocs(query(collection(db, 'contratos'), orderBy('criado_em', 'desc')))
  return snap.docs.filter((d) => !d.data().excluido_em).map((d) => comId<Contrato>(d.id, d.data()))
}

export async function criarContrato(
  dados: Pick<Contrato, 'titulo' | 'conteudo'> & Partial<Pick<Contrato, 'cliente_id' | 'status' | 'telefone'>>,
): Promise<Contrato> {
  const novo = limpar({
    orcamento_id: null,
    cliente_id: dados.cliente_id ?? null,
    titulo: dados.titulo,
    conteudo: dados.conteudo,
    status: dados.status ?? 'rascunho',
    telefone: dados.telefone ?? null,
    token: novoToken(),
    criado_em: agora(),
    enviado_em: null,
    assinado_em: null,
    assinatura_nome: null,
    assinatura_documento: null,
    assinatura_user_agent: null,
  })
  const ref = await addDoc(collection(db, 'contratos'), novo)
  return comId<Contrato>(ref.id, novo)
}

/**
 * Cria um contrato novo já a partir do MODELO padrão, preenchendo os campos do
 * cliente ({{cliente_nome}}, {{cliente_documento}}, {{data}}). Usado pelo botão
 * "Novo contrato" — sem precisar de orçamento.
 */
export async function criarContratoDoModelo(dados: {
  cliente_nome?: string
  cliente_documento?: string
  /** CPF do representante quando o documento principal é o CNPJ da empresa. */
  cliente_documento_representante?: string
  cliente_email?: string
  razao_social?: string
  cliente_endereco?: string
  telefone?: string | null
  cliente_id?: string | null
  titulo?: string
  /** Qual modelo usar. Ausente = o modelo padrão (ou o primeiro). */
  modelo_id?: string | null
}): Promise<Contrato> {
  const modelos = await listarModelosContrato()
  const modelo =
    (dados.modelo_id ? modelos.find((m) => m.id === dados.modelo_id) : undefined) ??
    modelos.find((m) => m.padrao) ??
    modelos[0]
  const quando = agora()
  const nome = dados.cliente_nome?.trim()
  const documento = dados.cliente_documento?.trim()
  const docRep = dados.cliente_documento_representante?.trim()
  const email = dados.cliente_email?.trim()
  const razao = dados.razao_social?.trim()
  const endereco = dados.cliente_endereco?.trim()
  // "Inteligência" do documento: CPF vs CNPJ define rótulo, formatação e QUEM é
  // o CONTRATANTE (CPF = a pessoa cadastrada; CNPJ = a empresa/razão social,
  // com a pessoa como representante — e o CPF do representante aparece). Se o
  // documento não vier, mantém os {{placeholders}} para o cliente preencher.
  const temDoc = !!(documento || docRep)
  // Documento de quem ASSINA (o representante, se empresa; senão o próprio).
  const docAssinante = docRep || documento
  // Se um campo do cliente não for informado, MANTÉM o {{placeholder}} no texto
  // para o próprio cliente preencher ao assinar pelo link público.
  const corpo = modelo
    ? preencherModelo(modelo.conteudo, {
        cliente_nome: nome || '{{cliente_nome}}',
        cliente_documento: documento ? formatarDocumento(documento) : '{{cliente_documento}}',
        cliente_documento_tipo: documento ? rotuloTipoDocumento(documento) : '{{cliente_documento_tipo}}',
        cliente_documento_rotulado: documento ? documentoRotulado(documento) : '{{cliente_documento_rotulado}}',
        contratante_nome: temDoc || nome ? contratanteNome(nome, razao, documento) : '{{contratante_nome}}',
        contratante_qualificacao: temDoc
          ? qualificacaoContratante({
              nome,
              razaoSocial: razao,
              documento,
              documentoRepresentante: docRep,
              endereco,
            })
          : '{{contratante_qualificacao}}',
        // Bloco de assinatura: a PESSOA que assina (nome + CPF), mesmo em empresa.
        assinante_nome: nome || '{{assinante_nome}}',
        assinante_documento_rotulado: docAssinante
          ? documentoRotulado(docAssinante)
          : '{{assinante_documento_rotulado}}',
        cliente_email: email || '{{cliente_email}}',
        cliente_endereco: endereco || '{{cliente_endereco}}',
        razao_social: razao || '',
        data: formatarDataExtenso(quando),
      })
    : `Contrato para ${nome || '{{cliente_nome}}'}.`
  return criarContrato({
    titulo: dados.titulo?.trim() || (nome ? `Contrato: ${nome}` : 'Contrato de Prestação de Serviços'),
    conteudo: corpo,
    cliente_id: dados.cliente_id ?? null,
    telefone: dados.telefone ?? null,
    status: 'enviado',
  })
}

export async function atualizarContrato(
  id: string,
  dados: Partial<Pick<Contrato, 'titulo' | 'conteudo' | 'status' | 'enviado_em'>>,
): Promise<Contrato> {
  await updateDoc(doc(db, 'contratos', id), limpar({ ...dados }))
  const d = await getDoc(doc(db, 'contratos', id))
  return comId<Contrato>(d.id, d.data() ?? {})
}

export async function excluirContrato(id: string): Promise<void> {
  await moverParaLixeira('contratos', id)
}

export function linkPublicoContrato(token: string): string {
  return `${window.location.origin}/contrato/${token}`
}

export interface ContratoPublico {
  titulo: string
  conteudo: string
  status: Contrato['status']
  criado_em: string
  assinado_em: string | null
  assinatura_nome: string | null
}

async function contratoPorTokenDoc(token: string): Promise<Contrato | null> {
  const snap = await getDocs(
    query(collection(db, 'contratos'), where('token', '==', token), limit(1)),
  )
  const d = snap.docs[0]
  return d ? comId<Contrato>(d.id, d.data()) : null
}

export async function contratoPorToken(token: string): Promise<ContratoPublico | null> {
  const c = await contratoPorTokenDoc(token)
  if (!c) return null
  return {
    titulo: c.titulo,
    conteudo: c.conteudo,
    status: c.status,
    criado_em: c.criado_em,
    assinado_em: c.assinado_em,
    assinatura_nome: c.assinatura_nome,
  }
}

export async function assinarContrato(
  token: string,
  nome: string,
  documento: string,
): Promise<void> {
  const c = await contratoPorTokenDoc(token)
  if (!c) throw new Error('Contrato não encontrado.')
  if (c.status === 'assinado') throw new Error('Este contrato já foi assinado.')
  // Preenche no texto os dados que o cliente digitou ao assinar (caso a KA
  // tenha deixado os {{placeholders}} para ele completar) — inclusive a
  // "inteligência" de CPF/CNPJ (rótulo, formatação e qualificação).
  const corpoFinal = c.conteudo
    .replace(/\{\{\s*contratante_qualificacao\s*\}\}/g, qualificacaoContratante({ nome, documento }))
    .replace(/\{\{\s*contratante_nome\s*\}\}/g, contratanteNome(nome, null, documento) || nome)
    .replace(/\{\{\s*assinante_nome\s*\}\}/g, nome)
    .replace(/\{\{\s*assinante_documento_rotulado\s*\}\}/g, documentoRotulado(documento))
    .replace(/\{\{\s*cliente_documento_rotulado\s*\}\}/g, documentoRotulado(documento))
    .replace(/\{\{\s*cliente_documento_tipo\s*\}\}/g, rotuloTipoDocumento(documento))
    .replace(/\{\{\s*cliente_documento\s*\}\}/g, formatarDocumento(documento))
    .replace(/\{\{\s*cliente_nome\s*\}\}/g, nome)
  await updateDoc(doc(db, 'contratos', c.id), {
    conteudo: corpoFinal,
    status: 'assinado',
    assinado_em: agora(),
    assinatura_nome: nome,
    assinatura_documento: documento,
    assinatura_user_agent: navigator.userAgent,
  })
}

// ---- Modelos de contrato ------------------------------------------------------

export async function listarModelosContrato(): Promise<ModeloContrato[]> {
  const snap = await getDocs(collection(db, 'modelos_contrato'))
  return snap.docs
    .map((d) => comId<ModeloContrato>(d.id, d.data()))
    .sort((a, b) => {
      if (a.padrao !== b.padrao) return a.padrao ? -1 : 1
      return a.criado_em < b.criado_em ? -1 : 1
    })
}

export async function salvarModeloContrato(
  dados: Partial<ModeloContrato> & { nome: string; conteudo: string },
): Promise<ModeloContrato> {
  if (dados.id) {
    await updateDoc(
      doc(db, 'modelos_contrato', dados.id),
      limpar({ nome: dados.nome, conteudo: dados.conteudo, padrao: dados.padrao }),
    )
    const d = await getDoc(doc(db, 'modelos_contrato', dados.id))
    return comId<ModeloContrato>(d.id, d.data() ?? {})
  }
  const novo = limpar({
    nome: dados.nome,
    conteudo: dados.conteudo,
    padrao: dados.padrao ?? false,
    criado_em: agora(),
  })
  const ref = await addDoc(collection(db, 'modelos_contrato'), novo)
  return comId<ModeloContrato>(ref.id, novo)
}

/** Torna UM modelo o padrão (e tira o "padrão" de todos os outros). */
export async function tornarModeloPadrao(id: string): Promise<void> {
  const modelos = await listarModelosContrato()
  await Promise.all(
    modelos.map((m) => updateDoc(doc(db, 'modelos_contrato', m.id), { padrao: m.id === id })),
  )
}

/** Exclui um modelo de contrato de vez (não vai para a lixeira). */
export async function excluirModeloContrato(id: string): Promise<void> {
  await deleteDoc(doc(db, 'modelos_contrato', id))
}

// ---- Cobranças -----------------------------------------------------------------

export async function listarCobrancas(): Promise<Cobranca[]> {
  const snap = await getDocs(query(collection(db, 'cobrancas'), orderBy('vencimento', 'desc')))
  return snap.docs.filter((d) => !d.data().excluido_em).map((d) => comId<Cobranca>(d.id, d.data()))
}

export type NovaCobranca = Pick<
  Cobranca,
  'cliente_id' | 'tipo' | 'descricao' | 'valor' | 'vencimento'
> &
  Partial<Pick<Cobranca, 'competencia' | 'link_pagamento' | 'telefone' | 'vm_participa' | 'valor_vm'>>

export async function criarCobranca(dados: NovaCobranca): Promise<Cobranca> {
  const novo = limpar({
    cliente_id: dados.cliente_id ?? null,
    orcamento_id: null,
    tipo: dados.tipo,
    descricao: dados.descricao,
    valor: dados.valor,
    vencimento: dados.vencimento,
    vm_participa: dados.vm_participa ?? false,
    valor_vm: dados.valor_vm ?? null,
    telefone: dados.telefone ?? null,
    competencia: dados.competencia ?? null,
    status: 'pendente',
    mp_preference_id: null,
    mp_payment_id: null,
    link_pagamento: dados.link_pagamento ?? null,
    boleto_url: null,
    boleto_linha_digitavel: null,
    pago_em: null,
    criado_em: agora(),
  })
  const ref = await addDoc(collection(db, 'cobrancas'), novo)
  return comId<Cobranca>(ref.id, novo)
}

export async function atualizarCobranca(
  id: string,
  dados: Partial<
    Pick<
      Cobranca,
      'status' | 'link_pagamento' | 'pago_em' | 'vencimento' | 'valor' | 'descricao' | 'cliente_id' | 'vm_participa' | 'valor_vm'
    >
  >,
): Promise<Cobranca> {
  await updateDoc(doc(db, 'cobrancas', id), limpar({ ...dados }))
  const d = await getDoc(doc(db, 'cobrancas', id))
  return comId<Cobranca>(d.id, d.data() ?? {})
}

/** Manda a cobrança para a Lixeira (dá para restaurar; esvaziar apaga de vez). */
export async function excluirCobranca(id: string): Promise<void> {
  await moverParaLixeira('cobrancas', id)
}

export async function marcarCobrancaPaga(id: string, dataPagamento?: string): Promise<Cobranca> {
  // Guarda a data do pagamento em LOCAL (YYYY-MM-DD): evita o off-by-one do UTC
  // que jogava um pagamento da noite para o mês seguinte no fluxo de caixa.
  return atualizarCobranca(id, { status: 'paga', pago_em: dataPagamento || hojeLocalISO() })
}

/**
 * Gera as mensalidades da competência (mês) — idempotente: não duplica uma
 * mensalidade já criada para o mesmo cliente/competência. Devolve quantas criou.
 * Reproduz a antiga RPC `gerar_mensalidades` no cliente.
 */
export async function gerarMensalidades(competencia?: string): Promise<number> {
  const hoje = new Date()
  const comp = competencia ?? `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}`

  const [clientesSnap, cobrancasSnap] = await Promise.all([
    getDocs(query(collection(db, 'clientes'), where('cobranca_ativa', '==', true))),
    getDocs(query(collection(db, 'cobrancas'), where('competencia', '==', comp))),
  ])

  const jaTem = new Set(cobrancasSnap.docs.map((d) => d.data().cliente_id as string))
  let criadas = 0

  for (const c of clientesSnap.docs) {
    const cli = c.data() as Cliente
    if (!cli.valor_mensalidade || cli.valor_mensalidade <= 0) continue
    if (jaTem.has(c.id)) continue
    const dia = Math.min(28, Math.max(1, Number(cli.dia_vencimento) || 10))
    const vencimento = `${comp}-${String(dia).padStart(2, '0')}`
    await criarCobranca({
      cliente_id: c.id,
      tipo: 'mensalidade',
      descricao: `Mensalidade ${comp} · ${cli.nome_marca}`,
      valor: cli.valor_mensalidade,
      vencimento,
      competencia: comp,
    })
    criadas++
  }
  return criadas
}

/**
 * Link de pagamento do Mercado Pago: exigiria uma Cloud Function (plano Blaze),
 * pois o access token do MP não pode ir para o front. Enquanto isso, cole o
 * link manualmente na cobrança (campo "link de pagamento").
 */
export async function gerarLinkMercadoPago(_cobrancaId: string): Promise<Cobranca> {
  throw new Error(
    'O link automático do Mercado Pago precisa de uma Cloud Function (plano Blaze do Firebase). ' +
      'Por enquanto, gere o link no painel do Mercado Pago e cole no campo "link de pagamento" da cobrança.',
  )
}
