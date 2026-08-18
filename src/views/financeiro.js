import {
  listarObras, listarLancamentosDoEscritorio, listarPagamentosDoEscritorio,
  criarPagamento, excluirPagamento, atualizarObra, sair,
} from '../dados.js';
import { moeda, dataBR, esc } from '../lib/format.js';
import { navBar } from '../lib/nav.js';
import { calcularReembolso, baixarPdfReembolso, baixarExcelReembolso, montarMensagemWhatsApp, PAGAMENTO } from '../lib/reembolso.js';
import { normalizarPlano, somaPagas, gerarPlano, renumerar, somarMeses, mensagemCobrancaParcela } from '../lib/parcelas.js';

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

  // Planos de parcelas (obras sem gestão) que precisam ser gravados por estarem
  // desatualizados — persistimos depois do render, sem travar a tela.
  const planosParaSalvar = [];

  const linhas = obras.map((o) => {
    const comGestao = o.gestao !== false;
    const c = calcularReembolso(lancPorObra[o.id] || [], o);
    // Com gestão: total = reembolso + honorário; recebido = pagamentos avulsos.
    // Sem gestão (só projeto): total = valor do projeto; o recebido vem das
    // PARCELAS marcadas como pagas (plano gerado automaticamente).
    if (comGestao) {
      const recebido = soma(pagPorObra[o.id]);
      return { o, comGestao, total: c.totalEscritorio, recebido, saldo: c.totalEscritorio - recebido, plano: null };
    }
    const { plano, mudou } = normalizarPlano(o);
    if (mudou) planosParaSalvar.push({ id: o.id, plano });
    const total = Number(o.orcamento || 0);
    const recebido = somaPagas(plano);
    return { o, comGestao, total, recebido, saldo: total - recebido, plano };
  }).sort((a, b) => b.saldo - a.saldo); // quem deve mais primeiro

  const totalGeral = linhas.reduce((t, l) => t + l.total, 0);
  const recebidoGeral = linhas.reduce((t, l) => t + l.recebido, 0);
  const saldoGeral = totalGeral - recebidoGeral;

  const FORMAS = ['Pix', 'Transferência', 'Dinheiro', 'Cartão', 'Boleto', 'Outro'];

  // Bloco de pagamentos avulsos (obras COM gestão) — como era antes.
  const blocoPagamentos = (o) => {
    const pgs = (pagPorObra[o.id] || []).slice().sort((a, b) => String(b.data).localeCompare(String(a.data)));
    return `
      <div class="reembolso-form fin-relatorio">
        <label>De<input type="date" class="fin-de" /></label>
        <label>Até<input type="date" class="fin-ate" /></label>
        <button class="btn btn-mini" data-pdf="${esc(o.id)}">⬇ PDF</button>
        <button class="btn btn-mini" data-excel="${esc(o.id)}">⬇ Excel</button>
        <button class="btn btn-mini btn-whats" data-whats="${esc(o.id)}">💬 WhatsApp</button>
        <span class="muted fin-hint">Em branco = toda a obra</span>
      </div>

      <div class="fin-controle">
        <div class="row-between">
          <h3 class="fin-controle-titulo">Controle de pagamentos</h3>
          <button class="btn btn-mini btn-primary" data-add-pag="${esc(o.id)}">+ Registrar pagamento</button>
        </div>
        <form class="reembolso-form" data-form-pag="${esc(o.id)}" hidden>
          <label>Data<input type="date" class="pg-data" /></label>
          <label>Valor (R$)<input type="number" min="0" step="0.01" class="pg-valor" /></label>
          <label>Forma
            <select class="pg-forma">
              ${FORMAS.map((f) => `<option>${f}</option>`).join('')}
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
            <span class="row-end">
              <span class="tag-pago">✓ Pagamento realizado</span>
              <strong class="val-ok fin-pag-valor">${moeda(p.valor)}</strong>
              <button class="btn btn-x" data-del-pag="${esc(p.id)}" title="Remover">×</button></span>
          </div>`).join('')}</div>` : `<p class="muted" style="margin:.4rem 0 0">Nenhum pagamento registrado ainda.</p>`}
      </div>`;
  };

  // Bloco de parcelas do projeto (obras SEM gestão) — geradas automaticamente e
  // totalmente editáveis: valor, data, forma, status; dá para adicionar/remover
  // parcelas e refazer o plano em N parcelas iguais. Cada parcela pode ser
  // cobrada pelo WhatsApp.
  const blocoParcelas = (o, plano) => `
      <div class="fin-controle">
        <div class="row-between">
          <h3 class="fin-controle-titulo">Parcelas do projeto</h3>
          <span class="muted fin-hint">Edite valor, data e forma; marque como pago; cobre pelo WhatsApp.</span>
        </div>
        <div class="fin-parcelas" data-parcelas-obra="${esc(o.id)}">
          ${plano.map((p) => `
          <div class="fin-parcela ${p.pago ? 'paga' : ''}" data-parc-n="${p.n}">
            <div class="fin-parc-topo">
              <span class="fin-parc-num">Parcela ${p.n} de ${plano.length}</span>
              <span class="row-end">
                <button type="button" class="btn btn-mini btn-whats parc-cobrar" title="Cobrar esta parcela pelo WhatsApp">💬 Cobrar</button>
                <button type="button" class="btn btn-x parc-del" title="Remover parcela">×</button>
              </span>
            </div>
            <div class="fin-parc-campos">
              <label>Valor (R$) <input type="number" min="0" step="0.01" class="parc-valor" value="${Number(p.valor || 0)}" /></label>
              <label>Data <input type="date" class="parc-data" value="${esc(p.data || '')}" /></label>
              <label>Forma
                <select class="parc-forma">
                  ${FORMAS.map((f) => `<option ${p.forma === f ? 'selected' : ''}>${f}</option>`).join('')}
                </select>
              </label>
              <button type="button" class="btn btn-mini parc-status ${p.pago ? 'pago' : ''}">${p.pago ? '✓ Pago' : 'Marcar como pago'}</button>
            </div>
          </div>`).join('')}
        </div>
        <div class="fin-parc-acoes">
          <button type="button" class="btn btn-mini" data-add-parc="${esc(o.id)}">+ Adicionar parcela</button>
          <span class="fin-parc-refazer">
            Refazer em
            <input type="number" min="1" max="60" class="parc-refazer-n" value="${plano.length}" />
            parcelas iguais
            <button type="button" class="btn btn-mini" data-refazer-parc="${esc(o.id)}">Refazer</button>
          </span>
        </div>
      </div>`;

  const cardFin = (l) => {
    const o = l.o;
    return `
    <section class="card">
      <div class="row-between">
        <div>
          <strong>${esc(o.nome)}</strong>
          <p class="muted" style="margin:.1rem 0 0">${esc(o.cliente || 'Sem cliente definido')}</p>
        </div>
        <div class="row-end">
          <a class="btn btn-mini" data-link href="/painel/${esc(o.slug)}">Abrir obra</a>
        </div>
      </div>
      <div class="kpis">
        ${kpi(l.comGestao ? 'Total a pagar' : 'Valor do projeto', moeda(l.total))}
        ${kpi('Recebido', moeda(l.recebido), 'val-ok')}
        ${kpi('Saldo em aberto', moeda(l.saldo), l.saldo > 0.005 ? 'neg' : 'val-saldo')}
      </div>
      ${l.comGestao ? blocoPagamentos(o) : blocoParcelas(o, l.plano)}
    </section>`;
  };

  // Mapa obraId -> plano (referência mutável usada pelos handlers de parcela).
  const planoPorObra = {};
  linhas.forEach((l) => { if (!l.comGestao && l.plano) planoPorObra[l.o.id] = l.plano; });

  container.innerHTML = `
    ${navBar('financeiro')}
    <div class="app">
      <div class="pagina-topo"><h1>Financeiro</h1></div>
      <section class="card fin-geral">
        <h2 class="fin-geral-titulo">Resumo geral · soma de todos os clientes</h2>
        <div class="kpis">
          ${kpi('Total a pagar', moeda(totalGeral))}
          ${kpi('Recebido', moeda(recebidoGeral), 'val-ok')}
          ${kpi('Saldo em aberto', moeda(saldoGeral), saldoGeral > 0.005 ? 'neg' : 'val-saldo')}
        </div>
      </section>
      <p class="muted" style="margin:.2rem 0 .2rem">Abaixo, cada obra/cliente separadamente — gere o relatório e registre os pagamentos.</p>
      ${linhas.length ? linhas.map(cardFin).join('') : '<p class="muted center">Nenhuma obra cadastrada ainda.</p>'}
    </div>`;

  container.querySelector('#sair').addEventListener('click', async () => { await sair(); });

  // Grava os planos de parcela recém-gerados/reconciliados (sem travar a tela).
  planosParaSalvar.forEach(({ id, plano }) => {
    atualizarObra(id, { parcelasPlano: plano }).catch(() => {});
  });

  // Editar valor/data/forma de uma parcela (obra sem gestão).
  container.addEventListener('change', async (e) => {
    const wrap = e.target.closest('[data-parcelas-obra]');
    if (!wrap) return;
    const row = e.target.closest('.fin-parcela'); if (!row) return;
    const obraId = wrap.getAttribute('data-parcelas-obra');
    const plano = planoPorObra[obraId]; if (!plano) return;
    const p = plano.find((x) => x.n === Number(row.getAttribute('data-parc-n'))); if (!p) return;
    let recomputa = false;
    if (e.target.classList.contains('parc-valor')) { p.valor = Number(e.target.value || 0); recomputa = true; }
    else if (e.target.classList.contains('parc-data')) p.data = e.target.value;
    else if (e.target.classList.contains('parc-forma')) p.forma = e.target.value;
    else return;
    try {
      await atualizarObra(obraId, { parcelasPlano: plano });
      if (recomputa) renderFinanceiro(container); // valor mexe no recebido/saldo
    } catch (err) { alert('Não foi possível salvar: ' + (err?.message || err)); }
  });

  container.addEventListener('click', async (e) => {
    // Marcar/desmarcar parcela como paga (obra sem gestão).
    const status = e.target.closest('.parc-status');
    if (status) {
      const wrap = status.closest('[data-parcelas-obra]');
      const row = status.closest('.fin-parcela');
      const obraId = wrap.getAttribute('data-parcelas-obra');
      const plano = planoPorObra[obraId];
      const p = plano && plano.find((x) => x.n === Number(row.getAttribute('data-parc-n')));
      if (!p) return;
      p.pago = !p.pago;
      status.disabled = true;
      try {
        await atualizarObra(obraId, { parcelasPlano: plano });
        renderFinanceiro(container); // recomputa recebido/saldo (card e geral)
      } catch (err) {
        p.pago = !p.pago; status.disabled = false;
        alert('Não foi possível salvar: ' + (err?.message || err));
      }
      return;
    }

    // Cobrar a parcela pelo WhatsApp (abre o app; a arquiteta escolhe o contato).
    const cobrar = e.target.closest('.parc-cobrar');
    if (cobrar) {
      const obraId = cobrar.closest('[data-parcelas-obra]').getAttribute('data-parcelas-obra');
      const o = obras.find((x) => x.id === obraId);
      const plano = planoPorObra[obraId];
      const p = plano && plano.find((x) => x.n === Number(cobrar.closest('.fin-parcela').getAttribute('data-parc-n')));
      if (!o || !p) return;
      const link = `${window.location.origin}/obra/${o.slug}`;
      const msg = mensagemCobrancaParcela({ obra: o, parcela: p, total: plano.length, link, pagamento: PAGAMENTO });
      window.open('https://wa.me/?text=' + encodeURIComponent(msg), '_blank', 'noopener');
      return;
    }

    // Remover uma parcela do plano.
    const delParc = e.target.closest('.parc-del');
    if (delParc) {
      const obraId = delParc.closest('[data-parcelas-obra]').getAttribute('data-parcelas-obra');
      const n = Number(delParc.closest('.fin-parcela').getAttribute('data-parc-n'));
      const plano = planoPorObra[obraId]; if (!plano) return;
      if (plano.length <= 1) { alert('Deixe ao menos uma parcela. Se preferir, use "Refazer".'); return; }
      if (!confirm('Remover esta parcela?')) return;
      const novo = renumerar(plano.filter((x) => x.n !== n));
      try { await atualizarObra(obraId, { parcelasPlano: novo }); renderFinanceiro(container); }
      catch (err) { alert('Não foi possível salvar: ' + (err?.message || err)); }
      return;
    }

    // Adicionar uma parcela nova (em aberto) — ex.: um pagamento a mais.
    const addParc = e.target.closest('[data-add-parc]');
    if (addParc) {
      const obraId = addParc.getAttribute('data-add-parc');
      const plano = planoPorObra[obraId]; if (!plano) return;
      const ultima = plano[plano.length - 1];
      const proxData = ultima && ultima.data ? somarMeses(ultima.data, 1) : new Date().toISOString().slice(0, 10);
      const novo = renumerar([...plano, { n: plano.length + 1, valor: 0, data: proxData, forma: 'Pix', pago: false }]);
      try { await atualizarObra(obraId, { parcelasPlano: novo }); renderFinanceiro(container); }
      catch (err) { alert('Não foi possível salvar: ' + (err?.message || err)); }
      return;
    }

    // Refazer o plano em N parcelas iguais (a partir do valor do projeto).
    const refazer = e.target.closest('[data-refazer-parc]');
    if (refazer) {
      const obraId = refazer.getAttribute('data-refazer-parc');
      const o = obras.find((x) => x.id === obraId); if (!o) return;
      const card = refazer.closest('.card');
      const n = Math.max(1, Math.min(60, Number(card.querySelector('.parc-refazer-n')?.value || 1)));
      if (!confirm(`Refazer o plano em ${n} parcela(s) iguais? Isso substitui as parcelas atuais.`)) return;
      const novo = gerarPlano(Number(o.orcamento || 0), n);
      try {
        await atualizarObra(obraId, { parcelasPlano: novo, parcelas: n });
        renderFinanceiro(container);
      } catch (err) { alert('Não foi possível salvar: ' + (err?.message || err)); }
      return;
    }

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
