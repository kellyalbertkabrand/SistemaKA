// Exportação de dados para CSV (abre no Excel). 100% no navegador —
// funciona como "backup na mão" da arquiteta, sem depender do servidor.

function campo(v) {
  const s = String(v ?? '');
  if (/[";\n\r]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
  return s;
}

// Número no formato brasileiro (vírgula decimal), para o Excel pt-BR.
export function numBR(n) {
  return Number(n || 0).toFixed(2).replace('.', ',');
}

export function paraCSV(matriz) {
  // BOM (﻿) para o Excel reconhecer acentos; separador ";" (padrão pt-BR).
  return '﻿' + matriz.map((linha) => linha.map(campo).join(';')).join('\r\n');
}

export function baixarBlob(nomeArquivo, blob) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nomeArquivo;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
const baixar = baixarBlob;

export function baixarCSV(nomeArquivo, matriz) {
  baixar(nomeArquivo, new Blob([paraCSV(matriz)], { type: 'text/csv;charset=utf-8;' }));
}

// Exporta um arquivo .xls (HTML que o Excel abre) com uma ou mais seções e
// suporte a LINKS CLICÁVEIS — usado para levar os anexos (recibos/NF e fotos)
// dentro da planilha. Cada célula pode ser texto/número OU { link, texto }.
function escHtml(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function celula(c, tag = 'td') {
  const estilo = tag === 'th'
    ? ' style="background:#2a2622;color:#fff;text-align:left;font-family:Arial;font-size:11px"'
    : ' style="font-family:Arial;font-size:11px"';
  if (c && typeof c === 'object' && c.link) {
    return `<${tag}${estilo}><a href="${escHtml(c.link)}">${escHtml(c.texto || 'abrir')}</a></${tag}>`;
  }
  return `<${tag}${estilo}>${escHtml(c)}</${tag}>`;
}

// Monta o HTML da planilha .xls a partir das seções.
// secoes: [{ titulo?, cabecalho?: [str], linhas: [[celula]] }]
export function montarExcelHTML(secoes) {
  const blocos = secoes.map((s) => {
    const titulo = s.titulo
      ? `<tr><td colspan="9" style="font-family:Arial;font-size:12px;font-weight:bold;background:#f0ece3">${escHtml(s.titulo)}</td></tr>`
      : '';
    const head = s.cabecalho ? `<tr>${s.cabecalho.map((h) => celula(h, 'th')).join('')}</tr>` : '';
    const body = (s.linhas || []).map((l) => `<tr>${l.map((c) => celula(c)).join('')}</tr>`).join('');
    return `<table border="1" cellspacing="0" cellpadding="5">${titulo}${head}${body}</table><br/>`;
  }).join('');
  return `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel">
<head><meta charset="utf-8"><!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet><x:Name>Obra</x:Name><x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions></x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]--></head>
<body>${blocos}</body></html>`;
}

export function baixarExcel(nomeArquivo, secoes) {
  baixar(nomeArquivo, new Blob(['﻿' + montarExcelHTML(secoes)], { type: 'application/vnd.ms-excel;charset=utf-8;' }));
}
