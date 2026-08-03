// Relatório de reembolso em PDF (semanal ou por período à escolha da arquiteta).
// Não usamos biblioteca de PDF: montamos uma página HTML com layout de impressão
// (A4, com a marca do escritório) e abrimos numa nova aba chamando window.print()
// — o próprio navegador salva como PDF. Funciona 100% offline, sem dependência.

import { moeda, dataBR, esc } from './format.js';
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
  pixTipo: 'CNPJ',
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

  const reembolso = soma(escritorioItens);                                  // base
  const pago = soma(escritorioItens.filter((l) => l.status === 'pago'));
  const pendente = soma(escritorioItens.filter((l) => l.status !== 'pago'));
  const pagoDireto = soma(clienteItens);

  const pctEsc = Number(obra?.percentualEscritorio || 0);
  const honorario = reembolso * pctEsc / 100;
  const totalEscritorio = reembolso + honorario;
  const pctFmt = pctEsc.toLocaleString('pt-BR', { maximumFractionDigits: 2 });

  return {
    itens, escritorioItens, clienteItens,
    reembolso, pago, pendente, pagoDireto,
    pctEsc, pctFmt, honorario, totalEscritorio,
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
  const { itens, reembolso, honorario, totalEscritorio, pagoDireto, pctEsc, pctFmt } = c;

  const periodo = `${de ? dataBR(de) : '…'} a ${ate ? dataBR(ate) : '…'}`;
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
      ? `<div class="row sub"><span>Honorário de gestão (${esc(pctFmt)}%)</span><span>${esc(moeda(honorario))}</span></div>`
      : ''}
    <div class="row geral"><span>Total a pagar ao escritório</span><span>${esc(moeda(totalEscritorio))}</span></div>
    ${pagoDireto > 0
      ? `<div class="row base"><span>Pago direto pelo cliente (não entra no reembolso)</span><span>${esc(moeda(pagoDireto))}</span></div>`
      : ''}
  </div>
  <p class="nota-gestao">O escritório adianta o pagamento dos fornecedores; o cliente reembolsa esse valor${pctEsc > 0 ? ` mais o honorário de gestão (${esc(pctFmt)}%)` : ''}. Itens pagos direto pelo cliente não entram no reembolso.</p>

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

// Texto pronto para o WhatsApp: resumo do que o cliente paga ao escritório
// no período + os dados de pagamento. Sem markdown pesado — só o *negrito* do
// WhatsApp (asteriscos).
export function montarMensagemWhatsApp({ obra, lancamentos, de, ate }) {
  const c = calcularReembolso(lancamentos, obra, { de, ate });
  const periodo = `${de ? dataBR(de) : '…'} a ${ate ? dataBR(ate) : '…'}`;
  const linhas = [
    `*${obra?.nome || 'Obra'}*`,
    `Período: ${periodo}`,
    '',
    `Reembolso de fornecedores: ${moeda(c.reembolso)}`,
  ];
  if (c.pctEsc > 0) linhas.push(`Honorário de gestão (${c.pctFmt}%): ${moeda(c.honorario)}`);
  linhas.push(`*Total a pagar ao escritório: ${moeda(c.totalEscritorio)}*`);
  if (c.pagoDireto > 0) {
    linhas.push('', `Itens pagos direto por você (não entram): ${moeda(c.pagoDireto)}`);
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
