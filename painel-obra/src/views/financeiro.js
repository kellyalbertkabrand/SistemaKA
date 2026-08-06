import {
  listarObras, listarLancamentosDoEscritorio, listarPagamentosDoEscritorio,
  criarPagamento, excluirPagamento, sair,
} from '../dados.js';
import { moeda, dataBR, esc } from '../lib/format.js';
import { navBar } from '../lib/nav.js';
import { calcularReembolso, baixarPdfReembolso, baixarExcelReembolso, montarMensagemWhatsApp } from '../lib/reembolso.js';

// Financeiro: uma tela só, por obra, com Total a pagar / Recebido / Saldo em
// aberto; gera o relatório do cliente (PDF/WhatsApp) e controla os pagamentos ali.
export async function renderFinanceiro(container) {
  container.innerHTML = `<div class="app"><p class="muted center">Carregando…</p></div>`;

  let obras, lancs, pags;
  try {
    [obras, lancs, pags] = await Promise.all([
      listarObras(),
      listarLancamentosDoEscritorio(),
      listarPagamentosDoEscritorio().catch(() => []),
    ]);
  } catch (e) {
    container.innerHTML = `${navBar('financeiro')}<div class="app"><div class="card">
      <h2>Não foi possível carregar</h2>
      <p class="erro" style="display:block">${esc(e?.message || e)}</p></div></div>`;
    const s = container.querySelector('#sair'); if (s) s.addEventListener('click', () => sair());
    return;
  }
  obras = obras || []; lancs = lancs || []; pags = pags || [];

  const soma = (arr) => (arr || []).reduce((t, x) => t + Number(x.valor || 0), 0);
  const agrupar = (arr) => { const m = {}; (arr || []).forEach((x) => { (m[x.obraId] ||= []).push(x); }); return m; };
  const lancPorObra = agrupar(lancs);
  const pagPorObra = agrupar(pags);
  const hojeISO = new Date().toISOString().slice(0, 10);
  const kpi = (r, v, c = '') => `<div class="kpi"><small>${r}</small><strong class="${c}">${v}</strong></div>`;

  const linhas = obras.map((o) => {
    const c = calcularReembolso(lancPorObra[o.id] || [], o);
    const recebido = soma(pagPorObra[o.id]);
    return { o, total: c.totalEscritorio, recebido, saldo: c.totalEscritorio - recebido };
  }).sort((a, b) => b.saldo - a.saldo); // quem deve mais primeiro

  const totalGeral = linhas.reduce((t, l) => t + l.total, 0);
  const recebidoGeral = linhas.reduce((t, l) => t + l.recebido, 0);
  const saldoGeral = totalGeral - recebidoGeral;

  const cardFin = (l) => {
    const o = l.o;
    const pgs = (pagPorObra[o.id] || []).slice().sort((a, b) => String(b.data).localeCompare(String(a.data)));
    return `
    <section class="card">
      <div class="row-between">
        <div>
          <strong>${esc(o.nome)}</strong>
          <p class="muted" style="margin:.1rem 0 0">${esc(o.cliente || 'Sem cliente definido')}</p>
        </div>
        <div class="row-end">
          <a class="btn btn-mini" data-link href="/painel/${esc(o.slug)}">Abrir obra</a>
          <button class="btn btn-mini btn-primary" data-add-pag="${esc(o.id)}">+ Pagamento</button>
        </div>
      </div>
      <div class="kpis">
        ${kpi('Total a pagar', moeda(l.total))}
        ${kpi('Recebido', moeda(l.recebido), 'val-ok')}
        ${kpi('Saldo em aberto', moeda(l.saldo), l.saldo > 0.005 ? 'neg' : 'val-saldo')}
      </div>
      <div class="reembolso-form fin-relatorio">
        <label>De<input type="date" class="fin-de" /></label>
        <label>Até<input type="date" class="fin-ate" /></label>
        <button class="btn btn-mini btn-primary" data-pdf="${esc(o.id)}">⬇ PDF</button>
        <button class="btn btn-mini" data-excel="${esc(o.id)}">⬇ Excel</button>
        <button class="btn btn-mini" data-whats="${esc(o.id)}">💬 WhatsApp</button>
        <span class="muted" style="font-size:.78rem;align-self:center">Em branco = toda a obra</span>
      </div>
      <form class="reembolso-form" data-form-pag="${esc(o.id)}" hidden>
        <label>Data<input type="date" class="pg-data" /></label>
        <label>Valor (R$)<input type="number" min="0" step="0.01" class="pg-valor" /></label>
        <label>Forma
          <select class="pg-forma">
            <option>Pix</option><option>Transferência</option><option>Dinheiro</option><option>Cartão</option><option>Outro</option>
          </select>
        </label>
        <label>Observação<input class="pg-obs" placeholder="Opcional" /></label>
        <button class="btn btn-mini btn-primary" type="submit">Salvar</button>
        <button type="button" class="btn btn-mini btn-ghost" data-cancel-pag>Cancelar</button>
        <p class="erro pg-erro" hidden></p>
      </form>
      ${pgs.length ? `<div class="fin-pag-lista">${pgs.map((p) => `
        <div class="row-between fin-pag-item">
          <span class="muted">${dataBR(p.data)} · ${esc(p.forma || '')}${p.observacao ? ' · ' + esc(p.observacao) : ''}</span>
          <span class="row-end"><strong>${moeda(p.valor)}</strong>
            <button class="btn btn-x" data-del-pag="${esc(p.id)}" title="Remover">×</button></span>
        </div>`).join('')}</div>` : ''}
    </section>`;
  };

  container.innerHTML = `
    ${navBar('financeiro')}
    <div class="app">
      <div class="pagina-topo"><h1>Financeiro</h1></div>
      <p class="muted">Total a pagar, recebido e saldo de cada obra. Gere o relatório do cliente e registre os pagamentos aqui.</p>
      <section class="kpis">
        ${kpi('Total a pagar (geral)', moeda(totalGeral))}
        ${kpi('Recebido (geral)', moeda(recebidoGeral), 'val-ok')}
        ${kpi('Saldo em aberto (geral)', moeda(saldoGeral), saldoGeral > 0.005 ? 'neg' : 'val-saldo')}
      </section>
      ${linhas.length ? linhas.map(cardFin).join('') : '<p class="muted center">Nenhuma obra cadastrada ainda.</p>'}
    </div>`;

  container.querySelector('#sair').addEventListener('click', async () => { await sair(); });

  container.addEventListener('click', async (e) => {
    // Período escolhido no card (em branco = toda a obra).
    const periodoDoCard = (el) => {
      const card = el.closest('.card');
      const de = card?.querySelector('.fin-de')?.value || '';
      const ate = card?.querySelector('.fin-ate')?.value || '';
      if (de && ate && de > ate) { alert('A data inicial não pode ser depois da final.'); return null; }
      return { de, ate };
    };

    const pdf = e.target.closest('[data-pdf]');
    if (pdf) {
      const per = periodoDoCard(pdf); if (!per) return;
      const o = obras.find((x) => x.id === pdf.getAttribute('data-pdf'));
      pdf.disabled = true; const r = pdf.textContent; pdf.textContent = 'Gerando…';
      try { await baixarPdfReembolso({ obra: o, lancamentos: lancPorObra[o.id] || [], ...per }); }
      catch (err) { alert('Não foi possível gerar o PDF: ' + (err?.message || err)); }
      finally { pdf.disabled = false; pdf.textContent = r; }
      return;
    }
    const excel = e.target.closest('[data-excel]');
    if (excel) {
      const per = periodoDoCard(excel); if (!per) return;
      const o = obras.find((x) => x.id === excel.getAttribute('data-excel'));
      try { baixarExcelReembolso({ obra: o, lancamentos: lancPorObra[o.id] || [], ...per }); }
      catch (err) { alert('Não foi possível gerar o Excel: ' + (err?.message || err)); }
      return;
    }
    const wa = e.target.closest('[data-whats]');
    if (wa) {
      const per = periodoDoCard(wa); if (!per) return;
      const o = obras.find((x) => x.id === wa.getAttribute('data-whats'));
      const msg = montarMensagemWhatsApp({ obra: o, lancamentos: lancPorObra[o.id] || [], ...per });
      window.open('https://wa.me/?text=' + encodeURIComponent(msg), '_blank', 'noopener');
      return;
    }
    const add = e.target.closest('[data-add-pag]');
    if (add) {
      const form = container.querySelector(`[data-form-pag="${add.getAttribute('data-add-pag')}"]`);
      if (form) {
        form.hidden = !form.hidden;
        if (!form.hidden) {
          const d = form.querySelector('.pg-data'); if (d && !d.value) d.value = hojeISO;
          form.querySelector('.pg-valor').focus();
        }
      }
      return;
    }
    const cancel = e.target.closest('[data-cancel-pag]');
    if (cancel) { const f = cancel.closest('form'); if (f) f.hidden = true; return; }
    const del = e.target.closest('[data-del-pag]');
    if (del) {
      if (!confirm('Remover este pagamento?')) return;
      await excluirPagamento(del.getAttribute('data-del-pag'));
      renderFinanceiro(container);
    }
  });

  container.addEventListener('submit', async (e) => {
    const form = e.target.closest('[data-form-pag]');
    if (!form) return;
    e.preventDefault();
    const erro = form.querySelector('.pg-erro');
    const valor = Number(form.querySelector('.pg-valor').value || 0);
    if (!(valor > 0)) { erro.textContent = 'Informe o valor recebido.'; erro.hidden = false; return; }
    erro.hidden = true;
    const btn = form.querySelector('button[type="submit"]'); btn.disabled = true; btn.textContent = 'Salvando…';
    try {
      await criarPagamento({
        obraId: form.getAttribute('data-form-pag'),
        valor,
        data: form.querySelector('.pg-data').value || hojeISO,
        forma: form.querySelector('.pg-forma').value || null,
        observacao: form.querySelector('.pg-obs').value.trim() || null,
      });
      renderFinanceiro(container);
    } catch (err) {
      btn.disabled = false; btn.textContent = 'Salvar';
      erro.textContent = 'Não foi possível salvar: ' + (err?.message || err); erro.hidden = false;
    }
  });
}
