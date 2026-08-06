// Relatório de reembolso em PDF (semanal ou por período à escolha da arquiteta).
// Não usamos biblioteca de PDF: montamos uma página HTML com layout de impressão
// (A4, com a marca do escritório) e abrimos numa nova aba chamando window.print()
// — o próprio navegador salva como PDF. Funciona 100% offline, sem dependência.

import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { moeda, dataBR, esc } from './format.js';
import { baixarExcel, numBR } from './exportar.js';
import { logoSchramm } from './marca.js';

const ESCRITORIO_NOME = 'SCHRAMM ARQUITETURA E ENGENHARIA';
const ESCRITORIO_ENDERECO =
  'Rua Dr. Luiz Bastos do Prado, 2093 - 504 - Centro, Gravataí - RS, 94010-021';

// Dados bancários para o pagamento do honorário de gestão.
const PAGAMENTO = {
  banco: 'Banco do Brasil',
  titular: 'Schramm Eng e Proj Ltda',
  agencia: '0883-4',
  conta: '34852-x',
  pixTipo: 'CPF',
  pix: '08940235000175',
};

// Cálculo central do reembolso/honorário — usado no PDF, na mensagem de
// WhatsApp e no painel do cliente, para todos baterem.
//
// Modelo: o escritório paga os fornecedores; o cliente reembolsa o escritório
// (valor dos fornecedores) + o honorário de gestão (percentual). Itens pagos
// DIRETO pelo cliente (pagoPor='cliente') não entram no reembolso nem no
// honorário — aparecem só como informação.
export function calcularReembolso(lancamentos, obra, { de, ate } = {}) {
  const itens = lancamentosNoPeriodo(lancamentos, de, ate);
  const ehCliente = (l) => l.pagoPor === 'cliente';
  const escritorioItens = itens.filter((l) => !ehCliente(l));
  const clienteItens = itens.filter(ehCliente);
  const soma = (arr) => arr.reduce((t, l) => t + Number(l.valor || 0), 0);

  const reembolso = soma(escritorioItens);                                  // o cliente devolve
  const pago = soma(escritorioItens.filter((l) => l.status === 'pago'));
  const pendente = soma(escritorioItens.filter((l) => l.status !== 'pago'));
  const pagoDireto = soma(clienteItens);                                    // o cliente já pagou

  const pctEsc = Number(obra?.percentualEscritorio || 0);
  // O honorário de gestão incide sobre TODA a obra: fornecedores pagos pelo
  // escritório + os pagos direto pelo cliente. (Quando o cliente paga direto,
  // ele não reembolsa, mas paga o percentual sobre esse valor também.)
  const honorarioBase = reembolso + pagoDireto;
  const honorario = honorarioBase * pctEsc / 100;
  // O que o cliente paga ao escritório = reembolso dos fornecedores adiantados
  // + o honorário total (inclusive a parte sobre o que ele pagou direto).
  const totalEscritorio = reembolso + honorario;
  const pctFmt = pctEsc.toLocaleString('pt-BR', { maximumFractionDigits: 2 });

  return {
    itens, escritorioItens, clienteItens,
    reembolso, pago, pendente, pagoDireto,
    pctEsc, pctFmt, honorarioBase, honorario, totalEscritorio,
  };
}

// Filtra os lançamentos cujo dia (YYYY-MM-DD) está dentro do intervalo [de, ate].
export function lancamentosNoPeriodo(lancamentos, de, ate) {
  return (lancamentos || [])
    .filter((l) => {
      const d = String(l.data || '').slice(0, 10);
      if (!d) return false;
      if (de && d < de) return false;
      if (ate && d > ate) return false;
      return true;
    })
    .sort((a, b) => String(a.data).localeCompare(String(b.data))); // cronológico
}

function linhaLanc(l) {
  const cliente = l.pagoPor === 'cliente';
  return `<tr>
    <td>${esc(dataBR(l.data))}</td>
    <td>${esc(l.etapa || '')}</td>
    <td>${esc(l.descricao || '')}</td>
    <td>${cliente ? 'Cliente (direto)' : 'Escritório'}</td>
    <td class="st ${l.status === 'pago' ? 'pago' : 'pend'}">${esc(l.status || '')}</td>
    <td class="num">${esc(moeda(l.valor))}</td>
  </tr>`;
}

// Monta o HTML completo (com CSS de impressão embutido) do relatório.
export function montarRelatorioReembolso({ obra, lancamentos, de, ate }) {
  const c = calcularReembolso(lancamentos, obra, { de, ate });
  const { itens, reembolso, honorario, honorarioBase, totalEscritorio, pagoDireto, pctEsc, pctFmt } = c;

  const periodo = (de || ate) ? `${de ? dataBR(de) : '…'} a ${ate ? dataBR(ate) : '…'}` : 'Toda a obra';
  const emitidoEm = dataBR(new Date().toISOString());
  // URL absoluto do logo — a aba nova (about:blank) não resolve caminhos relativos.
  let logoUrl = logoSchramm;
  try { logoUrl = new URL(logoSchramm, window.location.href).href; } catch { /* mantém */ }

  const corpo = itens.length
    ? itens.map(linhaLanc).join('')
    : `<tr><td colspan="6" class="vazio">Nenhum lançamento neste período.</td></tr>`;

  return `<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8">
<title>Reembolso ${esc(obra?.nome || '')} — ${esc(periodo)}</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: Arial, Helvetica, sans-serif; color: #2a2622; margin: 0; padding: 28px 30px; }
  .cab { display: flex; align-items: center; justify-content: space-between; gap: 16px;
         border-bottom: 3px solid #c65a2e; padding-bottom: 14px; }
  .cab img { height: 54px; width: auto; }
  .cab .tit { text-align: right; }
  .cab h1 { font-size: 19px; margin: 0; color: #c65a2e; letter-spacing: .3px; }
  .cab .sub { font-size: 12px; color: #6b6259; margin-top: 2px; }
  .meta { display: flex; flex-wrap: wrap; gap: 6px 26px; margin: 18px 0 8px; font-size: 13px; }
  .meta b { color: #6b6259; font-weight: 600; }
  table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 12.5px; }
  thead th { background: #2a2622; color: #fff; text-align: left; padding: 7px 8px; font-weight: 600; }
  thead th.num { text-align: right; }
  tbody td { padding: 6px 8px; border-bottom: 1px solid #e7e1d7; vertical-align: top; }
  td.num { text-align: right; white-space: nowrap; }
  td.st { text-transform: capitalize; }
  td.st.pago { color: #2e7d32; }
  td.st.pend { color: #b23b3b; }
  td.vazio { text-align: center; color: #8a8178; padding: 20px; }
  .totais { margin-top: 16px; margin-left: auto; width: 340px; font-size: 13px; }
  .totais .row { display: flex; justify-content: space-between; padding: 5px 0; }
  .totais .sub { color: #6b6259; }
  .totais .base { border-top: 1px solid #cfc7ba; margin-top: 4px; padding-top: 8px; font-weight: 600; }
  .totais .geral { border-top: 2px solid #c65a2e; margin-top: 6px; padding-top: 9px;
                   font-size: 16px; font-weight: 700; color: #c65a2e; }
  .nota-gestao { margin-top: 14px; margin-left: auto; width: 340px; font-size: 10.5px;
                 color: #8a8178; text-align: right; }
  .pagamento { margin-top: 22px; border: 1px solid #e0d8cc; border-left: 4px solid #c65a2e;
               border-radius: 6px; padding: 12px 14px; background: #faf7f2; font-size: 12.5px; }
  .pagamento h2 { margin: 0 0 6px; font-size: 13px; color: #c65a2e; }
  .pagamento .grade { display: flex; flex-wrap: wrap; gap: 3px 26px; }
  .pagamento .item b { color: #6b6259; font-weight: 600; }
  .pagamento .pix { margin-top: 4px; font-weight: 700; }
  .rodape { margin-top: 34px; border-top: 1px solid #e7e1d7; padding-top: 12px;
            font-size: 11px; color: #6b6259; }
  .rodape .nome { font-weight: 700; color: #2a2622; letter-spacing: .4px; }
  @media print { body { padding: 0; } @page { margin: 16mm 14mm; } }
</style></head>
<body>
  <div class="cab">
    <img src="${esc(logoUrl)}" alt="${esc(ESCRITORIO_NOME)}" />
    <div class="tit">
      <h1>Relatório de Reembolso</h1>
      <div class="sub">Lançamentos do período e honorário de gestão</div>
    </div>
  </div>

  <div class="meta">
    <span><b>Obra:</b> ${esc(obra?.nome || '')}</span>
    <span><b>Cliente:</b> ${esc(obra?.cliente || '—')}</span>
    <span><b>Período:</b> ${esc(periodo)}</span>
    <span><b>Emitido em:</b> ${esc(emitidoEm)}</span>
  </div>

  <table>
    <thead>
      <tr><th>Data</th><th>Etapa</th><th>Descrição</th><th>Pago por</th><th>Status</th><th class="num">Valor</th></tr>
    </thead>
    <tbody>${corpo}</tbody>
  </table>

  <div class="totais">
    <div class="row sub"><span>Reembolso — fornecedores pagos pelo escritório</span><span>${esc(moeda(reembolso))}</span></div>
    ${pctEsc > 0
      ? `<div class="row sub"><span>Honorário de gestão (${esc(pctFmt)}% sobre ${esc(moeda(honorarioBase))})</span><span>${esc(moeda(honorario))}</span></div>`
      : ''}
    <div class="row geral"><span>Total a pagar ao escritório</span><span>${esc(moeda(totalEscritorio))}</span></div>
    ${pagoDireto > 0
      ? `<div class="row base"><span>Pago direto pelo cliente (não reembolsa)</span><span>${esc(moeda(pagoDireto))}</span></div>`
      : ''}
  </div>
  <p class="nota-gestao">O escritório adianta o pagamento dos fornecedores; o cliente reembolsa esse valor.${pctEsc > 0 ? ` O honorário de gestão (${esc(pctFmt)}%) incide sobre toda a obra — inclusive os fornecedores pagos direto pelo cliente.` : ''} O que o cliente paga direto não entra no reembolso${pctEsc > 0 ? ', mas gera honorário' : ''}.</p>

  <div class="pagamento">
    <h2>Dados para pagamento</h2>
    <div class="grade">
      <span class="item"><b>Banco:</b> ${esc(PAGAMENTO.banco)}</span>
      <span class="item"><b>Titular:</b> ${esc(PAGAMENTO.titular)}</span>
      <span class="item"><b>Agência:</b> ${esc(PAGAMENTO.agencia)}</span>
      <span class="item"><b>Conta corrente:</b> ${esc(PAGAMENTO.conta)}</span>
    </div>
    <div class="pix">Pix (${esc(PAGAMENTO.pixTipo)}): ${esc(PAGAMENTO.pix)}</div>
  </div>

  <div class="rodape">
    <p class="nome">${esc(ESCRITORIO_NOME)}</p>
    <p>${esc(ESCRITORIO_ENDERECO)}</p>
  </div>

  <script>
    window.addEventListener('load', function () {
      setTimeout(function () { window.focus(); window.print(); }, 300);
    });
  <\/script>
</body></html>`;
}

// Abre o relatório numa nova aba e dispara a impressão (salvar como PDF).
// Devolve false se o navegador bloqueou o pop-up.
export function gerarPdfReembolso(dados) {
  const html = montarRelatorioReembolso(dados);
  const win = window.open('', '_blank');
  if (!win) return false;
  win.document.open();
  win.document.write(html);
  win.document.close();
  return true;
}

// ---------------------------------------------------------------------------
// PDF de verdade (vetorial) para BAIXAR — evita o "imprimir página do celular",
// que em alguns aparelhos saía espelhado. Gera um arquivo .pdf com jsPDF.
// ---------------------------------------------------------------------------
function carregarImagem(src) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

export async function baixarPdfReembolso({ obra, lancamentos, de, ate }) {
  const c = calcularReembolso(lancamentos, obra, { de, ate });
  const periodo = (de || ate) ? `${de ? dataBR(de) : '…'} a ${ate ? dataBR(ate) : '…'}` : 'Toda a obra';
  const emitidoEm = dataBR(new Date().toISOString());

  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const M = 40;
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const TERRA = [198, 90, 46];
  const ESCURO = [42, 38, 34];
  const MUTED = [107, 98, 89];
  const TEXTO = [60, 55, 50];

  let y = M;

  // Logo (esquerda), preservando proporção.
  let logoUrl = logoSchramm;
  try { logoUrl = new URL(logoSchramm, window.location.href).href; } catch { /* mantém */ }
  const logo = await carregarImagem(logoUrl);
  if (logo && logo.width && logo.height) {
    const escala = Math.min(170 / logo.width, 44 / logo.height);
    try { doc.addImage(logo, 'PNG', M, y, logo.width * escala, logo.height * escala); } catch { /* segue sem logo */ }
  }

  // Título (direita).
  doc.setTextColor(...TERRA); doc.setFont('helvetica', 'bold'); doc.setFontSize(16);
  doc.text('Relatório de Reembolso', W - M, y + 16, { align: 'right' });
  doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(...MUTED);
  doc.text('Lançamentos do período e honorário de gestão', W - M, y + 30, { align: 'right' });

  y += 54;
  doc.setDrawColor(...TERRA); doc.setLineWidth(2); doc.line(M, y, W - M, y);
  y += 18;

  // Meta.
  doc.setFont('helvetica', 'normal'); doc.setFontSize(9.5); doc.setTextColor(...TEXTO);
  doc.text(`Obra: ${obra?.nome || ''}     Cliente: ${obra?.cliente || '—'}`, M, y);
  y += 13;
  doc.text(`Período: ${periodo}     Emitido em: ${emitidoEm}`, M, y);

  // Tabela.
  const body = c.itens.length
    ? c.itens.map((l) => [
        dataBR(l.data), l.etapa || '', l.descricao || '',
        l.pagoPor === 'cliente' ? 'Cliente (direto)' : 'Escritório',
        l.status || '', moeda(l.valor),
      ])
    : [[{ content: 'Nenhum lançamento neste período.', colSpan: 6, styles: { halign: 'center', textColor: MUTED } }]];
  autoTable(doc, {
    startY: y + 12,
    margin: { left: M, right: M },
    head: [['Data', 'Etapa', 'Descrição', 'Pago por', 'Status', 'Valor']],
    body,
    styles: { fontSize: 8.5, cellPadding: 4, textColor: ESCURO },
    headStyles: { fillColor: ESCURO, textColor: 255, fontStyle: 'bold' },
    columnStyles: { 5: { halign: 'right' } },
    theme: 'grid',
  });
  y = doc.lastAutoTable.finalY + 22;

  // Totais (bloco à direita).
  const bx = W - M - 330;
  const linha = (rot, val, o = {}) => {
    doc.setFont('helvetica', o.bold ? 'bold' : 'normal');
    doc.setFontSize(o.size || 10);
    doc.setTextColor(...(o.cor || TEXTO));
    doc.text(rot, bx, y);
    doc.text(val, W - M, y, { align: 'right' });
    y += o.gap || 15;
  };
  linha('Reembolso — fornecedores pagos pelo escritório', moeda(c.reembolso), { size: 9.5, cor: MUTED });
  if (c.pctEsc > 0) {
    linha(`Honorário de gestão (${c.pctFmt}% sobre ${moeda(c.honorarioBase)})`, moeda(c.honorario), { size: 9.5, cor: MUTED });
  }
  doc.setDrawColor(...TERRA); doc.setLineWidth(1.2); doc.line(bx, y - 5, W - M, y - 5);
  y += 4;
  linha('Total a pagar ao escritório', moeda(c.totalEscritorio), { bold: true, size: 12.5, cor: TERRA, gap: 18 });
  if (c.pagoDireto > 0) {
    linha('Pago direto pelo cliente (não reembolsa)', moeda(c.pagoDireto), { size: 9, cor: MUTED });
  }

  // Nota da regra (largura total).
  y += 4;
  doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5); doc.setTextColor(...MUTED);
  const nota = `O escritório adianta o pagamento dos fornecedores; o cliente reembolsa esse valor.`
    + (c.pctEsc > 0 ? ` O honorário de gestão (${c.pctFmt}%) incide sobre toda a obra — inclusive os fornecedores pagos direto pelo cliente.` : '')
    + ` O que o cliente paga direto não entra no reembolso${c.pctEsc > 0 ? ', mas gera honorário' : ''}.`;
  const notaLines = doc.splitTextToSize(nota, W - 2 * M);
  doc.text(notaLines, M, y);
  y += notaLines.length * 11 + 16;

  // Se faltar espaço para a caixa de pagamento + rodapé, nova página.
  if (y > H - 150) { doc.addPage(); y = M; }

  // Caixa "Dados para pagamento".
  const boxH = 78;
  doc.setFillColor(250, 247, 242); doc.setDrawColor(224, 216, 204); doc.setLineWidth(1);
  doc.roundedRect(M, y, W - 2 * M, boxH, 4, 4, 'FD');
  doc.setFillColor(...TERRA); doc.rect(M, y, 4, boxH, 'F');
  doc.setTextColor(...TERRA); doc.setFont('helvetica', 'bold'); doc.setFontSize(11);
  doc.text('Dados para pagamento', M + 14, y + 18);
  doc.setTextColor(...TEXTO); doc.setFont('helvetica', 'normal'); doc.setFontSize(10);
  doc.text(`Banco: ${PAGAMENTO.banco}      Titular: ${PAGAMENTO.titular}`, M + 14, y + 37);
  doc.text(`Agência: ${PAGAMENTO.agencia}      Conta corrente: ${PAGAMENTO.conta}`, M + 14, y + 53);
  doc.setFont('helvetica', 'bold');
  doc.text(`Pix (${PAGAMENTO.pixTipo}): ${PAGAMENTO.pix}`, M + 14, y + 69);

  // Rodapé (na base da página atual).
  doc.setDrawColor(224, 216, 204); doc.setLineWidth(0.8); doc.line(M, H - 56, W - M, H - 56);
  doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.setTextColor(...ESCURO);
  doc.text(ESCRITORIO_NOME, M, H - 42);
  doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5); doc.setTextColor(...MUTED);
  doc.text(ESCRITORIO_ENDERECO, M, H - 30);

  const nomeArq = `reembolso-${obra?.slug || 'obra'}-${(de && ate) ? de + '_a_' + ate : 'completo'}.pdf`;
  doc.save(nomeArq);
}

// Reembolso em EXCEL (.xls) — mesmo conteúdo do PDF, em planilha.
export function baixarExcelReembolso({ obra, lancamentos, de, ate }) {
  const c = calcularReembolso(lancamentos, obra, { de, ate });
  const periodo = (de || ate) ? `${de ? dataBR(de) : '…'} a ${ate ? dataBR(ate) : '…'}` : 'Toda a obra';
  const totais = [
    ['Reembolso — fornecedores pagos pelo escritório', numBR(c.reembolso)],
  ];
  if (c.pctEsc > 0) totais.push([`Honorário de gestão (${c.pctFmt}%)`, numBR(c.honorario)]);
  totais.push(['Total a pagar ao escritório', numBR(c.totalEscritorio)]);
  if (c.pagoDireto > 0) totais.push(['Pago direto pelo cliente (não reembolsa)', numBR(c.pagoDireto)]);

  const secoes = [
    { titulo: `Relatório de Reembolso — ${obra?.nome || ''}`, cabecalho: ['Campo', 'Valor'], linhas: [
      ['Cliente', obra?.cliente || '—'],
      ['Período', periodo],
      ['Emitido em', dataBR(new Date().toISOString())],
    ] },
    { titulo: 'Lançamentos', cabecalho: ['Data', 'Etapa', 'Descrição', 'Pago por', 'Status', 'Valor (R$)'],
      linhas: c.itens.map((l) => [
        dataBR(l.data), l.etapa || '', l.descricao || '',
        l.pagoPor === 'cliente' ? 'Cliente (direto)' : 'Escritório', l.status || '', numBR(l.valor),
      ]) },
    { titulo: 'Totais', cabecalho: ['Descrição', 'Valor (R$)'], linhas: totais },
    { titulo: 'Dados para pagamento', cabecalho: ['Campo', 'Valor'], linhas: [
      ['Banco', PAGAMENTO.banco], ['Titular', PAGAMENTO.titular], ['Agência', PAGAMENTO.agencia],
      ['Conta corrente', PAGAMENTO.conta], [`Pix (${PAGAMENTO.pixTipo})`, PAGAMENTO.pix],
    ] },
  ];
  baixarExcel(`reembolso-${obra?.slug || 'obra'}-${(de && ate) ? de + '_a_' + ate : 'completo'}.xls`, secoes);
}

// Texto pronto para o WhatsApp: resumo do que o cliente paga ao escritório
// no período + os dados de pagamento. Sem markdown pesado — só o *negrito* do
// WhatsApp (asteriscos).
export function montarMensagemWhatsApp({ obra, lancamentos, de, ate }) {
  const c = calcularReembolso(lancamentos, obra, { de, ate });
  const periodo = (de || ate) ? `${de ? dataBR(de) : '…'} a ${ate ? dataBR(ate) : '…'}` : 'Toda a obra';
  const linhas = [
    `*${obra?.nome || 'Obra'}*`,
    `Período: ${periodo}`,
    '',
    `Reembolso de fornecedores: ${moeda(c.reembolso)}`,
  ];
  if (c.pctEsc > 0) linhas.push(`Honorário de gestão (${c.pctFmt}% sobre ${moeda(c.honorarioBase)}): ${moeda(c.honorario)}`);
  linhas.push(`*Total a pagar ao escritório: ${moeda(c.totalEscritorio)}*`);
  if (c.pagoDireto > 0) {
    linhas.push('', `Você pagou direto aos fornecedores: ${moeda(c.pagoDireto)} (não reembolsa${c.pctEsc > 0 ? '; o honorário já inclui o % sobre esse valor' : ''})`);
  }
  linhas.push(
    '',
    '*Dados para pagamento*',
    PAGAMENTO.banco,
    PAGAMENTO.titular,
    `Ag ${PAGAMENTO.agencia} · CC ${PAGAMENTO.conta}`,
    `Pix (${PAGAMENTO.pixTipo}): ${PAGAMENTO.pix}`,
  );
  return linhas.join('\n');
}
