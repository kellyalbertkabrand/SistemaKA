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
export const FORMULARIOS: Record<string, DefinicaoFormulario> = {
  ikigai: IKIGAI,
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

function agora() {
  return new Date().toISOString()
}
function novoToken() {
  return crypto.randomUUID().replace(/-/g, '')
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
