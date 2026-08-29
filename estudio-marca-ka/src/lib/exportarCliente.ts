// Exportar o CADASTRO do cliente: transforma a ficha (doc do Firestore) em
// seções legíveis — usadas pelo documento na tela (Imprimir / Salvar PDF), pelo
// texto para copiar/WhatsApp e pela planilha (CSV, para o contador/backup).
import type { Cliente, PagamentoContrato, Socio } from './database.types'
import { formatarBRL, formatarData } from './gestao'
import { formatarDocumento, rotuloTipoDocumento } from './documento'
import type { Celula } from './xlsx'

export interface ItemCadastro {
  rotulo: string
  valor: string
}
export interface SecaoCadastro {
  titulo: string
  itens: ItemCadastro[]
}

/** Só entra no documento o que está preenchido (ficha em branco não polui). */
function preenchidos(itens: (ItemCadastro | null)[]): ItemCadastro[] {
  return itens.filter((i): i is ItemCadastro => !!i && !!i.valor.trim())
}

function doc(v?: string | null): string {
  if (!v?.trim()) return ''
  const tipo = rotuloTipoDocumento(v)
  const formatado = formatarDocumento(v)
  return tipo ? `${tipo} ${formatado}` : formatado
}

const FORMAS: Record<string, string> = {
  avista: 'à vista',
  parcelado: 'parcelado',
  mensalidade: 'mensalidade',
}

/** "KA · parcelado 3× de R$ 500,00 (total R$ 1.500,00) · 10/08/2026" */
export function linhaPagamento(p: PagamentoContrato): string {
  const quem =
    p.quem === 'outro'
      ? p.quem_outro?.trim() || 'Personalizado'
      : p.quem === 'ka'
        ? 'KA'
        : p.quem === 'vm'
          ? 'VM Rocks'
          : 'O cliente'
  const forma = FORMAS[p.forma ?? 'avista'] ?? p.forma ?? 'à vista'
  const valor = Number(p.valor_parcela) || 0
  const partes = [quem]
  if (p.forma === 'parcelado') {
    const n = Math.max(1, Number(p.parcelas) || 1)
    partes.push(`${n}× de ${formatarBRL(valor)} (total ${formatarBRL(valor * n)})`)
  } else if (p.forma === 'mensalidade') {
    partes.push(`${formatarBRL(valor)} por mês`)
  } else {
    partes.push(`${forma} ${formatarBRL(valor)}`)
  }
  if (p.data) partes.push(formatarData(p.data))
  return partes.join(' · ')
}

function linhaSocio(s: Socio): string {
  const partes = [s.nome?.trim() || 'Sócio']
  if (s.cpf?.trim()) partes.push(doc(s.cpf))
  if (s.rg?.trim()) partes.push(`RG ${s.rg}`)
  if (s.email?.trim()) partes.push(s.email)
  if (s.assina) partes.push('assina o contrato')
  return partes.join(' · ')
}

/** A ficha inteira do cliente, em seções, pronta para virar documento/texto. */
export function secoesDoCliente(c: Cliente): SecaoCadastro[] {
  const secoes: SecaoCadastro[] = [
    {
      titulo: 'Marca',
      itens: preenchidos([
        { rotulo: 'Nome da marca', valor: c.nome_marca ?? '' },
        { rotulo: 'Segmento', valor: c.segmento ?? '' },
        { rotulo: 'Instagram', valor: c.instagram_handle ?? '' },
        { rotulo: 'Site', valor: c.site ?? '' },
        { rotulo: 'Situação', valor: c.status === 'ativo' ? 'Ativo' : 'Inativo' },
        { rotulo: 'Cadastrado em', valor: c.criado_em ? formatarData(c.criado_em) : '' },
        { rotulo: 'Origem', valor: c.origem === 'auto-cadastro' ? 'Link público de cadastro' : '' },
      ]),
    },
    {
      titulo: 'Contato',
      itens: preenchidos([
        { rotulo: 'Nome (completo)', valor: c.responsavel ?? '' },
        { rotulo: 'E-mail', valor: c.email_contato ?? '' },
        { rotulo: 'Telefone / WhatsApp', valor: c.telefone ?? '' },
        { rotulo: 'Endereço', valor: c.endereco ?? '' },
        { rotulo: 'Cidade / UF', valor: c.cidade ?? '' },
      ]),
    },
    {
      titulo: 'Dados para o contrato',
      itens: preenchidos([
        { rotulo: 'Razão social', valor: c.razao_social ?? '' },
        { rotulo: 'CPF / CNPJ da empresa', valor: doc(c.documento) },
        { rotulo: 'Fundador(a)', valor: c.fundador_nome ?? '' },
        { rotulo: 'CPF do fundador(a)', valor: doc(c.fundador_cpf) },
        { rotulo: 'Quem assina', valor: c.contrato_nome ?? '' },
        { rotulo: 'Documento de quem assina', valor: doc(c.contrato_documento) },
        { rotulo: 'RG', valor: c.contrato_rg ?? '' },
        { rotulo: 'E-mail de quem assina', valor: c.contrato_email ?? '' },
      ]),
    },
    {
      titulo: 'Sócios',
      itens: (c.socios ?? []).map((s, i) => ({ rotulo: `Sócio ${i + 1}`, valor: linhaSocio(s) })),
    },
    {
      titulo: 'Cobrança',
      itens: preenchidos([
        { rotulo: 'E-mail de cobrança', valor: c.email_cobranca ?? '' },
        {
          rotulo: 'Mensalidade',
          valor: c.valor_mensalidade ? `${formatarBRL(c.valor_mensalidade)} · dia ${c.dia_vencimento}` : '',
        },
        { rotulo: 'Cobrança mensal', valor: c.cobranca_ativa ? 'ativa' : 'desligada' },
      ]),
    },
    {
      titulo: 'Pagamentos do contrato',
      itens: (c.pagamentos_contrato ?? []).map((p, i) => ({
        rotulo: `Pagamento ${i + 1}`,
        valor: linhaPagamento(p),
      })),
    },
    {
      titulo: 'Acesso ao estúdio',
      itens: preenchidos([
        { rotulo: 'Marca no estúdio', valor: c.slug ? `/${c.slug}` : '' },
        { rotulo: 'Estúdio liberado', valor: c.estudio_ativo === false ? 'não' : 'sim' },
        { rotulo: 'Liberado até', valor: c.estudio_ate ? formatarData(c.estudio_ate) : '' },
      ]),
    },
    {
      titulo: 'Observações',
      itens: preenchidos([{ rotulo: '', valor: c.observacoes ?? '' }]),
    },
  ]
  return secoes.filter((s) => s.itens.length > 0)
}

/** A mesma ficha em texto puro (copiar / mandar no WhatsApp). */
export function textoDoCliente(c: Cliente): string {
  const blocos = secoesDoCliente(c).map((s) => {
    const linhas = s.itens.map((i) => (i.rotulo ? `${i.rotulo}: ${i.valor}` : i.valor))
    return `*${s.titulo}*\n${linhas.join('\n')}`
  })
  return `Cadastro — ${c.nome_marca}\n\n${blocos.join('\n\n')}`
}

// ---- Planilha do Excel ----------------------------------------------------

/** Colunas da planilha de clientes (uma linha por cliente). */
const COLUNAS: { cabecalho: string; valor: (c: Cliente) => Celula }[] = [
  { cabecalho: 'Marca', valor: (c) => c.nome_marca ?? '' },
  { cabecalho: 'Segmento', valor: (c) => c.segmento ?? '' },
  { cabecalho: 'Instagram', valor: (c) => c.instagram_handle ?? '' },
  { cabecalho: 'Site', valor: (c) => c.site ?? '' },
  { cabecalho: 'Situação', valor: (c) => (c.status === 'ativo' ? 'Ativo' : 'Inativo') },
  { cabecalho: 'Nome (completo)', valor: (c) => c.responsavel ?? '' },
  { cabecalho: 'E-mail', valor: (c) => c.email_contato ?? '' },
  { cabecalho: 'Telefone', valor: (c) => c.telefone ?? '' },
  { cabecalho: 'Endereço', valor: (c) => c.endereco ?? '' },
  { cabecalho: 'Cidade / UF', valor: (c) => c.cidade ?? '' },
  { cabecalho: 'Razão social', valor: (c) => c.razao_social ?? '' },
  { cabecalho: 'CPF / CNPJ', valor: (c) => formatarDocumento(c.documento) },
  { cabecalho: 'Fundador(a)', valor: (c) => c.fundador_nome ?? '' },
  { cabecalho: 'CPF do fundador(a)', valor: (c) => formatarDocumento(c.fundador_cpf) },
  { cabecalho: 'Quem assina', valor: (c) => c.contrato_nome ?? '' },
  { cabecalho: 'Documento de quem assina', valor: (c) => formatarDocumento(c.contrato_documento) },
  { cabecalho: 'RG', valor: (c) => c.contrato_rg ?? '' },
  { cabecalho: 'E-mail de quem assina', valor: (c) => c.contrato_email ?? '' },
  { cabecalho: 'E-mail de cobrança', valor: (c) => c.email_cobranca ?? '' },
  // Números entram como NÚMERO (dá para somar/filtrar na planilha).
  { cabecalho: 'Mensalidade (R$)', valor: (c) => c.valor_mensalidade ?? '' },
  { cabecalho: 'Dia do vencimento', valor: (c) => (c.valor_mensalidade ? (c.dia_vencimento ?? '') : '') },
  { cabecalho: 'Cobrança mensal', valor: (c) => (c.cobranca_ativa ? 'ativa' : 'desligada') },
  { cabecalho: 'Sócios', valor: (c) => (c.socios ?? []).map(linhaSocio).join(' | ') },
  { cabecalho: 'Pagamentos do contrato', valor: (c) => (c.pagamentos_contrato ?? []).map(linhaPagamento).join(' | ') },
  { cabecalho: 'Marca no estúdio', valor: (c) => c.slug ?? '' },
  { cabecalho: 'Observações', valor: (c) => c.observacoes ?? '' },
  { cabecalho: 'Cadastrado em', valor: (c) => (c.criado_em ? formatarData(c.criado_em) : '') },
]

export function cabecalhosDeClientes(): string[] {
  return COLUNAS.map((c) => c.cabecalho)
}

export function linhasDeClientes(lista: Cliente[]): Celula[][] {
  return lista.map((cli) => COLUNAS.map((c) => c.valor(cli)))
}

/** Nome de arquivo seguro a partir do nome da marca. */
export function nomeArquivo(base: string): string {
  return (
    base
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .toLowerCase() || 'cliente'
  )
}
