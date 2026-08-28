// Gerar um arquivo do EXCEL (.xlsx) de verdade — sem biblioteca nova: um .xlsx
// é um .zip com XMLs dentro, e o app já usa o JSZip (export de carrossel).
// Motivo de não usar CSV: no Excel o CSV depende do separador e da codificação
// da máquina (acento vira símbolo, tudo cai numa coluna só). O .xlsx abre certo
// em qualquer lugar (Excel, Google Planilhas, Numbers do iPhone).
import JSZip from 'jszip'

/** Valor de uma célula: texto ou número (número já entra somável na planilha). */
export type Celula = string | number | null | undefined

function escapar(v: string): string {
  return (
    v
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      // Caracteres de controle não são válidos no XML da planilha.
      .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '')
  )
}

/** 1 → A, 26 → Z, 27 → AA (a planilha daqui passa de 26 colunas). */
export function letraColuna(n: number): string {
  let s = ''
  let x = n
  while (x > 0) {
    const resto = (x - 1) % 26
    s = String.fromCharCode(65 + resto) + s
    x = Math.floor((x - 1) / 26)
  }
  return s
}

function celulaXml(ref: string, valor: Celula, estilo: number): string {
  if (valor === null || valor === undefined || valor === '') {
    return `<c r="${ref}" s="${estilo}"/>`
  }
  if (typeof valor === 'number' && Number.isFinite(valor)) {
    return `<c r="${ref}" s="${estilo}"><v>${valor}</v></c>`
  }
  const texto = escapar(String(valor))
  return `<c r="${ref}" s="${estilo}" t="inlineStr"><is><t xml:space="preserve">${texto}</t></is></c>`
}

function planilhaXml(cabecalhos: string[], linhas: Celula[][]): string {
  // Largura da coluna pelo maior conteúdo (limitada, p/ não ficar quilométrica).
  const largura = (i: number) => {
    const conteudo = [cabecalhos[i] ?? '', ...linhas.map((l) => String(l[i] ?? ''))]
    const maior = conteudo.reduce((m, t) => Math.max(m, t.length), 0)
    return Math.min(46, Math.max(12, maior + 2))
  }
  const cols = cabecalhos
    .map((_, i) => `<col min="${i + 1}" max="${i + 1}" width="${largura(i)}" customWidth="1"/>`)
    .join('')

  const linhaXml = (valores: Celula[], indice: number, estilo: number) =>
    `<row r="${indice}">` +
    valores.map((v, i) => celulaXml(`${letraColuna(i + 1)}${indice}`, v, estilo)).join('') +
    '</row>'

  const corpo = [linhaXml(cabecalhos, 1, 1), ...linhas.map((l, i) => linhaXml(l, i + 2, 0))].join('')

  return (
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
    // O cabeçalho fica congelado ao rolar a planilha.
    '<sheetViews><sheetView workbookViewId="0">' +
    '<pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/>' +
    '</sheetView></sheetViews>' +
    `<cols>${cols}</cols>` +
    `<sheetData>${corpo}</sheetData>` +
    '</worksheet>'
  )
}

const CONTENT_TYPES =
  '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
  '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
  '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
  '<Default Extension="xml" ContentType="application/xml"/>' +
  '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>' +
  '<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>' +
  '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>' +
  '</Types>'

const RELS =
  '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
  '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
  '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>' +
  '</Relationships>'

const WORKBOOK_RELS =
  '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
  '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
  '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>' +
  '<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>' +
  '</Relationships>'

// Dois estilos: 0 = normal (quebra linha), 1 = negrito (a linha do cabeçalho).
const STYLES =
  '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
  '<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
  '<fonts count="2"><font><sz val="11"/><name val="Calibri"/></font>' +
  '<font><b/><sz val="11"/><name val="Calibri"/></font></fonts>' +
  '<fills count="1"><fill><patternFill patternType="none"/></fill></fills>' +
  '<borders count="1"><border/></borders>' +
  '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>' +
  '<cellXfs count="2">' +
  '<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0" applyAlignment="1">' +
  '<alignment vertical="top" wrapText="1"/></xf>' +
  '<xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/>' +
  '</cellXfs>' +
  // O Excel espera o estilo "Normal" declarado; sem ele alguns leitores reclamam.
  '<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>' +
  '</styleSheet>'

function workbookXml(nomeAba: string): string {
  // O Excel não aceita : \ / ? * [ ] no nome da aba, nem mais de 31 caracteres.
  const nome = escapar(nomeAba.replace(/[:\\/?*[\]]/g, ' ').slice(0, 31).trim() || 'Planilha')
  return (
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" ' +
    'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">' +
    `<sheets><sheet name="${nome}" sheetId="1" r:id="rId1"/></sheets>` +
    '</workbook>'
  )
}

/** Monta o .xlsx (uma aba) e devolve o arquivo pronto para baixar. */
export async function gerarXlsx(
  cabecalhos: string[],
  linhas: Celula[][],
  nomeAba = 'Planilha',
): Promise<Blob> {
  const zip = new JSZip()
  zip.file('[Content_Types].xml', CONTENT_TYPES)
  zip.file('_rels/.rels', RELS)
  zip.file('xl/workbook.xml', workbookXml(nomeAba))
  zip.file('xl/_rels/workbook.xml.rels', WORKBOOK_RELS)
  zip.file('xl/styles.xml', STYLES)
  zip.file('xl/worksheets/sheet1.xml', planilhaXml(cabecalhos, linhas))
  return zip.generateAsync({
    type: 'blob',
    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
}

/** Gera e baixa a planilha do Excel. */
export async function baixarXlsx(
  nomeArquivo: string,
  cabecalhos: string[],
  linhas: Celula[][],
  nomeAba = 'Planilha',
): Promise<void> {
  const blob = await gerarXlsx(cabecalhos, linhas, nomeAba)
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = nomeArquivo.endsWith('.xlsx') ? nomeArquivo : `${nomeArquivo}.xlsx`
  a.click()
  // Espera o navegador iniciar o download antes de soltar o arquivo da memória.
  window.setTimeout(() => URL.revokeObjectURL(url), 4000)
}
