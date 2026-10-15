// Exportação dos dados de um cliente: PDF (jsPDF) e texto pronto para WhatsApp.
import { jsPDF } from 'jspdf';
import { dataBR } from './format.js';
import { logoMarca, RGB_ACENTO, NOME_MARCA } from './marca.js';

// Rótulos amigáveis dos campos, na ordem em que aparecem.
const CONTATO = [
  ['email', 'E-mail'],
  ['telefone', 'Telefone / WhatsApp'],
  ['documento', 'CPF / CNPJ'],
  ['cidade', 'Cidade'],
  ['endereco', 'Endereço'],
  ['observacoes', 'Observações'],
];
const CONTRATO = [
  ['contrato_nome', 'Nome completo / Razão social'],
  ['contrato_documento', 'CPF / CNPJ'],
  ['contrato_rg', 'RG / Inscrição Estadual'],
  ['contrato_nacionalidade', 'Nacionalidade'],
  ['contrato_estadocivil', 'Estado civil'],
  ['contrato_profissao', 'Profissão'],
  ['contrato_endereco', 'Endereço (contrato)'],
];

function temContrato(c) {
  return CONTRATO.some(([k]) => c && c[k]);
}

// ---------------------------------------------------------------------------
// Texto para WhatsApp (envia "o conteúdo" do cliente como mensagem).
// ---------------------------------------------------------------------------
export function textoWhatsAppCliente(c) {
  const linhas = [];
  linhas.push(`*Dados do cliente — ${NOME_MARCA}*`, '');
  linhas.push(`👤 *${c.nome || 'Cliente'}*`);
  for (const [k, rot] of CONTATO) if (c[k]) linhas.push(`• ${rot}: ${c[k]}`);
  if (temContrato(c)) {
    linhas.push('', '*Dados para contrato*');
    for (const [k, rot] of CONTRATO) if (c[k]) linhas.push(`• ${rot}: ${c[k]}`);
  }
  if (c.criadoEm) linhas.push('', `Cadastrado em ${dataBR(new Date(c.criadoEm).toISOString())}`);
  return linhas.join('\n');
}

// ---------------------------------------------------------------------------
// PDF dos dados do cliente (arquivo .pdf de verdade, com a marca).
// ---------------------------------------------------------------------------
function carregarImagem(src) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

function nomeArquivo(c) {
  const base = String(c.nome || 'cliente').normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-+|-+$/g, '').toLowerCase().slice(0, 40) || 'cliente';
  return `cliente-${base}.pdf`;
}

export async function baixarPdfCliente(c) {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const M = 48;
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const ACENTO = RGB_ACENTO;
  const ESCURO = [42, 38, 34];
  const MUTED = [120, 112, 104];
  const TEXTO = [55, 50, 46];
  let y = M;

  // Logo (esquerda).
  let logoUrl = logoMarca;
  try { logoUrl = new URL(logoMarca, window.location.href).href; } catch { /* mantém */ }
  const logo = await carregarImagem(logoUrl);
  if (logo && logo.width && logo.height) {
    const escala = Math.min(170 / logo.width, 46 / logo.height);
    try { doc.addImage(logo, 'PNG', M, y, logo.width * escala, logo.height * escala); } catch { /* segue sem logo */ }
  }
  // Título (direita).
  doc.setTextColor(...ACENTO); doc.setFont('helvetica', 'bold'); doc.setFontSize(16);
  doc.text('Dados do Cliente', W - M, y + 16, { align: 'right' });
  doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(...MUTED);
  doc.text(`Emitido em ${dataBR(new Date().toISOString())}`, W - M, y + 30, { align: 'right' });

  y += 58;
  doc.setDrawColor(...ACENTO); doc.setLineWidth(2); doc.line(M, y, W - M, y);
  y += 30;

  // Nome do cliente em destaque.
  doc.setTextColor(...ESCURO); doc.setFont('helvetica', 'bold'); doc.setFontSize(18);
  doc.text(String(c.nome || 'Cliente'), M, y);
  y += 26;

  // Escreve uma seção com título + pares rótulo/valor.
  const secao = (titulo, campos) => {
    const itens = campos.filter(([k]) => c[k]);
    if (!itens.length) return;
    if (y > H - 120) { doc.addPage(); y = M; }
    doc.setTextColor(...ACENTO); doc.setFont('helvetica', 'bold'); doc.setFontSize(11);
    doc.text(titulo.toUpperCase(), M, y);
    y += 6; doc.setDrawColor(230, 224, 214); doc.setLineWidth(1); doc.line(M, y, W - M, y);
    y += 18;
    for (const [k, rot] of itens) {
      if (y > H - 60) { doc.addPage(); y = M; }
      doc.setFont('helvetica', 'bold'); doc.setFontSize(9.5); doc.setTextColor(...MUTED);
      doc.text(`${rot}:`, M, y);
      doc.setFont('helvetica', 'normal'); doc.setTextColor(...TEXTO);
      const valor = doc.splitTextToSize(String(c[k]), W - M - 200);
      doc.text(valor, M + 200, y);
      y += 15 * valor.length + 6;
    }
    y += 12;
  };

  secao('Dados de contato', [['nome', 'Nome / identificação'], ...CONTATO]);
  secao('Dados para contrato', CONTRATO);

  // Rodapé.
  doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(...MUTED);
  doc.text(`${NOME_MARCA}  ·  Cadastro de cliente`, M, H - 30);

  doc.save(nomeArquivo(c));
}
