// Relatório de reembolso em PDF (semanal ou por período à escolha da arquiteta).
// Não usamos biblioteca de PDF: montamos uma página HTML com layout de impressão
// (A4, com a marca do escritório) e abrimos numa nova aba chamando window.print()
// — o próprio navegador salva como PDF. Funciona 100% offline, sem dependência.

import { moeda, dataBR, esc } from './format.js';
import { logoSchramm } from './marca.js';

const ESCRITORIO_NOME = 'SCHRAMM ARQUITETURA E ENGENHARIA';
const ESCRITORIO_ENDERECO =
  'Rua Dr. Luiz Bastos do Prado, 2093 - 504 - Centro, Gravataí - RS, 94010-021';

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
  return `<tr>
    <td>${esc(dataBR(l.data))}</td>
    <td>${esc(l.etapa || '')}</td>
    <td>${esc(l.descricao || '')}</td>
    <td class="st ${l.status === 'pago' ? 'pago' : 'pend'}">${esc(l.status || '')}</td>
    <td class="num">${esc(moeda(l.valor))}</td>
  </tr>`;
}

// Monta o HTML completo (com CSS de impressão embutido) do relatório.
export function montarRelatorioReembolso({ obra, lancamentos, de, ate }) {
  const itens = lancamentosNoPeriodo(lancamentos, de, ate);
  const soma = (arr) => arr.reduce((t, l) => t + Number(l.valor || 0), 0);
  const totalGeral = soma(itens);
  const totalPago = soma(itens.filter((l) => l.status === 'pago'));
  const totalPend = soma(itens.filter((l) => l.status !== 'pago'));

  const periodo = `${de ? dataBR(de) : '…'} a ${ate ? dataBR(ate) : '…'}`;
  const emitidoEm = dataBR(new Date().toISOString());
  // URL absoluto do logo — a aba nova (about:blank) não resolve caminhos relativos.
  let logoUrl = logoSchramm;
  try { logoUrl = new URL(logoSchramm, window.location.href).href; } catch { /* mantém */ }

  const corpo = itens.length
    ? itens.map(linhaLanc).join('')
    : `<tr><td colspan="5" class="vazio">Nenhum lançamento neste período.</td></tr>`;

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
  .totais { margin-top: 16px; margin-left: auto; width: 320px; font-size: 13px; }
  .totais .row { display: flex; justify-content: space-between; padding: 5px 0; }
  .totais .sub { color: #6b6259; }
  .totais .geral { border-top: 2px solid #c65a2e; margin-top: 6px; padding-top: 9px;
                   font-size: 16px; font-weight: 700; color: #c65a2e; }
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
      <div class="sub">Valores a reembolsar ao escritório</div>
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
      <tr><th>Data</th><th>Etapa</th><th>Descrição</th><th>Status</th><th class="num">Valor</th></tr>
    </thead>
    <tbody>${corpo}</tbody>
  </table>

  <div class="totais">
    <div class="row sub"><span>Pago no período</span><span>${esc(moeda(totalPago))}</span></div>
    <div class="row sub"><span>Pendente no período</span><span>${esc(moeda(totalPend))}</span></div>
    <div class="row geral"><span>Total a reembolsar</span><span>${esc(moeda(totalGeral))}</span></div>
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
