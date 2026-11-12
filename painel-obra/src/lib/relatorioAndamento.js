// Relatório de ANDAMENTO da obra em PDF: Orçado × Realizado por etapa, com um
// gráfico de barras e a economia (orçado − realizado). Feito para enviar ao
// cliente (ex.: por WhatsApp), com a marca do escritório.
import { jsPDF } from 'jspdf';
import { moeda, dataBR } from './format.js';
import { logoMarca, MARCA, NOME_MARCA, RGB_ACENTO } from './marca.js';

function carregarImagem(src) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

// Monta a lista de etapas com orçado e realizado (realizado = soma dos
// lançamentos daquela etapa). Inclui etapas que só aparecem nos lançamentos.
export function dadosAndamento(etapas, lancamentos) {
  const realizado = {};
  for (const l of (lancamentos || [])) {
    realizado[l.etapa] = (realizado[l.etapa] || 0) + Number(l.valor || 0);
  }
  const nomes = new Set((etapas || []).map((e) => e.nome));
  const extras = Object.keys(realizado).filter((n) => !nomes.has(n));
  const linhas = [
    ...(etapas || []).map((e) => ({ nome: e.nome, orcado: Number(e.orcado || 0), real: realizado[e.nome] || 0 })),
    ...extras.map((n) => ({ nome: n, orcado: 0, real: realizado[n] || 0 })),
  ];
  const totOrcado = linhas.reduce((t, l) => t + l.orcado, 0);
  const totReal = linhas.reduce((t, l) => t + l.real, 0);
  return { linhas, totOrcado, totReal, economia: totOrcado - totReal };
}

export async function baixarPdfAndamento({ obra, etapas, lancamentos }) {
  const { linhas, totOrcado, totReal, economia } = dadosAndamento(etapas, lancamentos);
  const emitidoEm = dataBR(new Date().toISOString());

  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const M = 40;
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const TERRA = RGB_ACENTO;
  const ESCURO = [42, 38, 34];
  const MUTED = [107, 98, 89];
  const TEXTO = [60, 55, 50];
  const VERDE = [78, 156, 107];
  const VERMELHO = [192, 57, 43];
  const TRACK = [233, 228, 219];
  let y = M;

  // Cabeçalho: logo + título.
  let logoUrl = logoMarca;
  try { logoUrl = new URL(logoMarca, window.location.href).href; } catch { /* mantém */ }
  const logo = await carregarImagem(logoUrl);
  if (logo && logo.width && logo.height) {
    const escala = Math.min(170 / logo.width, 44 / logo.height);
    try { doc.addImage(logo, 'PNG', M, y, logo.width * escala, logo.height * escala); } catch { /* segue */ }
  }
  doc.setTextColor(...TERRA); doc.setFont('helvetica', 'bold'); doc.setFontSize(16);
  doc.text('Andamento da Obra', W - M, y + 16, { align: 'right' });
  doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(...MUTED);
  doc.text('Orçado × Realizado por etapa', W - M, y + 30, { align: 'right' });

  y += 54;
  doc.setDrawColor(...TERRA); doc.setLineWidth(2); doc.line(M, y, W - M, y);
  y += 18;

  doc.setFont('helvetica', 'normal'); doc.setFontSize(9.5); doc.setTextColor(...TEXTO);
  doc.text(`Obra: ${obra?.nome || ''}     Cliente: ${obra?.cliente || '—'}`, M, y);
  y += 13;
  doc.text(`Emitido em: ${emitidoEm}`, M, y);
  y += 22;

  // Resumo em três caixas: Orçado, Realizado, Economia.
  const gap = 12;
  const boxW = (W - 2 * M - 2 * gap) / 3;
  const boxH = 54;
  const economiaPos = economia >= 0;
  const caixa = (i, rot, val, cor) => {
    const x = M + i * (boxW + gap);
    doc.setFillColor(250, 247, 242); doc.setDrawColor(224, 216, 204); doc.setLineWidth(1);
    doc.roundedRect(x, y, boxW, boxH, 4, 4, 'FD');
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5); doc.setTextColor(...MUTED);
    doc.text(rot.toUpperCase(), x + 12, y + 18);
    doc.setFont('helvetica', 'bold'); doc.setFontSize(14); doc.setTextColor(...cor);
    doc.text(val, x + 12, y + 40);
  };
  caixa(0, 'Orçado (estimado)', moeda(totOrcado), ESCURO);
  caixa(1, 'Realizado (até agora)', moeda(totReal), ESCURO);
  caixa(2, economiaPos ? 'Economia' : 'Acima do previsto', moeda(Math.abs(economia)), economiaPos ? VERDE : TERRA);
  y += boxH + 24;

  // Gráfico de barras: por etapa, Orçado (cinza) e Realizado (cor da marca).
  doc.setFont('helvetica', 'bold'); doc.setFontSize(11); doc.setTextColor(...ESCURO);
  doc.text('Por etapa', M, y);
  y += 6;
  doc.setDrawColor(230, 224, 214); doc.setLineWidth(1); doc.line(M, y, W - M, y);
  y += 16;

  const maxVal = Math.max(1, ...linhas.map((l) => Math.max(l.orcado, l.real)));
  const chartW = W - 2 * M - 150; // reserva 150 à direita para os valores
  const barH = 6;

  const desenharEtapa = (l) => {
    if (y > H - 70) { doc.addPage(); y = M; }
    const estouro = l.orcado > 0 && l.real > l.orcado;
    // Nome da etapa.
    doc.setFont('helvetica', 'bold'); doc.setFontSize(9.5); doc.setTextColor(...ESCURO);
    doc.text(doc.splitTextToSize(l.nome || 'Etapa', chartW)[0], M, y);
    // Valores à direita: economia (verde) ou acima do previsto (vermelho).
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5);
    const dif = l.orcado - l.real;
    const difTxt = l.orcado > 0 ? (dif >= 0 ? `economia ${moeda(dif)}` : `acima +${moeda(-dif)}`) : '';
    doc.setTextColor(...(l.orcado > 0 && dif < 0 ? VERMELHO : VERDE));
    doc.text(difTxt, W - M, y, { align: 'right' });
    // Barra Orçado (cinza claro).
    let by = y + 7;
    doc.setFillColor(...TRACK);
    doc.rect(M, by, Math.max(1, (l.orcado / maxVal) * chartW), barH, 'F');
    doc.setFontSize(7.5); doc.setTextColor(...MUTED);
    doc.text(`Orçado ${moeda(l.orcado)}`, M + chartW + 8, by + barH, { });
    // Barra Realizado (cor da marca; vermelho se estourou o orçado).
    by += barH + 3;
    doc.setFillColor(...(estouro ? VERMELHO : TERRA));
    doc.rect(M, by, Math.max(1, (l.real / maxVal) * chartW), barH, 'F');
    doc.setTextColor(...(estouro ? VERMELHO : TERRA));
    doc.text(`Realizado ${moeda(l.real)}`, M + chartW + 8, by + barH, { });
    y = by + barH + 14;
  };

  if (!linhas.length) {
    doc.setFont('helvetica', 'normal'); doc.setFontSize(10); doc.setTextColor(...MUTED);
    doc.text('Nenhuma etapa cadastrada ainda.', M, y);
    y += 20;
  } else {
    linhas.forEach(desenharEtapa);
  }

  // Nota explicativa.
  if (y > H - 90) { doc.addPage(); y = M; }
  y += 4;
  doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5); doc.setTextColor(...MUTED);
  const nota = 'Orçado = estimativa de cada etapa. Realizado = soma dos custos lançados até agora. '
    + 'Economia = Orçado - Realizado. Etapas ainda em andamento podem ter o Realizado abaixo do Orçado.';
  const notaLines = doc.splitTextToSize(nota, W - 2 * M);
  doc.text(notaLines, M, y);

  // Rodapé.
  doc.setDrawColor(224, 216, 204); doc.setLineWidth(0.8); doc.line(M, H - 56, W - M, H - 56);
  doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.setTextColor(...ESCURO);
  doc.text(NOME_MARCA, M, H - 42);
  doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5); doc.setTextColor(...MUTED);
  doc.text(MARCA.endereco || '', M, H - 30);

  doc.save(`andamento-${obra?.slug || 'obra'}.pdf`);
}
