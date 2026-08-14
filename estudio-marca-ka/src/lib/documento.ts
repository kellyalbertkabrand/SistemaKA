// ============================================================================
// DOCUMENTO (CPF / CNPJ) — "inteligência" para os contratos.
//
// Detecta se o número informado é CPF (11 dígitos) ou CNPJ (14), formata com a
// máscara certa e monta o rótulo ("CPF nº 123.456.789-00"). Assim o contrato
// não escreve "CNPJ" para uma cliente que é pessoa física, por exemplo.
// ============================================================================

export function soDigitos(v?: string | null): string {
  return (v ?? '').replace(/\D/g, '')
}

export function tipoDocumento(v?: string | null): 'cpf' | 'cnpj' | null {
  const d = soDigitos(v)
  if (d.length === 11) return 'cpf'
  if (d.length === 14) return 'cnpj'
  return null
}

/** Formata com a máscara (CPF 000.000.000-00 · CNPJ 00.000.000/0000-00). Se
 *  não der para saber (nº de dígitos diferente), devolve o texto como veio. */
export function formatarDocumento(v?: string | null): string {
  const d = soDigitos(v)
  if (d.length === 11) return d.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
  if (d.length === 14) return d.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5')
  return (v ?? '').trim()
}

/** Rótulo do tipo: "CPF", "CNPJ" ou "CPF/CNPJ" quando não dá para saber. */
export function rotuloTipoDocumento(v?: string | null): string {
  const t = tipoDocumento(v)
  return t === 'cpf' ? 'CPF' : t === 'cnpj' ? 'CNPJ' : 'CPF/CNPJ'
}

/** "CPF nº 123.456.789-00" (ou "CNPJ nº ..."; vazio se não houver documento). */
export function documentoRotulado(v?: string | null): string {
  const num = formatarDocumento(v)
  if (!num) return ''
  return `${rotuloTipoDocumento(v)} nº ${num}`
}

/**
 * Nome do CONTRATANTE conforme o documento:
 *  - CNPJ (empresa) → a RAZÃO SOCIAL (se houver; senão o nome cadastrado);
 *  - CPF ou desconhecido → o NOME cadastrado.
 */
export function contratanteNome(
  nome?: string | null,
  razaoSocial?: string | null,
  documento?: string | null,
): string {
  const razao = (razaoSocial ?? '').trim()
  if (tipoDocumento(documento) === 'cnpj' && razao) return razao
  return (nome ?? '').trim()
}

/** Acha o 1º CNPJ (14 dígitos) numa lista de documentos possíveis. */
export function acharCnpj(...docs: (string | null | undefined)[]): string {
  return docs.map(soDigitos).find((d) => d.length === 14) ?? ''
}

/** Acha o 1º CPF (11 dígitos) numa lista de documentos possíveis. */
export function acharCpf(...docs: (string | null | undefined)[]): string {
  return docs.map(soDigitos).find((d) => d.length === 11) ?? ''
}

/**
 * Qualificação completa do CONTRATANTE para o contrato, com "inteligência":
 *  - CNPJ → "Razão Social, inscrita no CNPJ nº ..., com sede em ..., neste ato
 *    representada por Fulano, inscrito(a) no CPF nº ..." (o CPF é o do
 *    representante, quando informado em `documentoRepresentante`);
 *  - CPF  → "Fulano, inscrito(a) no CPF nº ..., com endereço em ...".
 */
export function qualificacaoContratante(opts: {
  nome?: string | null
  razaoSocial?: string | null
  documento?: string | null
  /** CPF do representante (quando o documento principal é o CNPJ da empresa). */
  documentoRepresentante?: string | null
  endereco?: string | null
}): string {
  const nome = (opts.nome ?? '').trim()
  const razao = (opts.razaoSocial ?? '').trim()
  const endereco = (opts.endereco ?? '').trim()
  if (tipoDocumento(opts.documento) === 'cnpj') {
    const empresa = razao || nome
    let s = empresa
    const cnpjRot = documentoRotulado(opts.documento)
    if (cnpjRot) s += `, inscrita no ${cnpjRot}`
    if (endereco) s += `, com sede em ${endereco}`
    if (nome && nome !== empresa) {
      s += `, neste ato representada por ${nome}`
      const cpfRep = documentoRotulado(opts.documentoRepresentante)
      if (cpfRep) s += `, inscrito(a) no ${cpfRep}`
    }
    return s
  }
  let s = nome
  const docRot = documentoRotulado(opts.documento)
  if (docRot) s += `, inscrito(a) no ${docRot}`
  // "com endereço em" (neutro) — NÃO dizer "residente"/"residência", a pedido
  // da KA: o endereço pode ser comercial e não queremos afirmar que é a casa.
  if (endereco) s += `, com endereço em ${endereco}`
  return s
}
