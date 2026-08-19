import {
  listarObras, listarLancamentosDoEscritorio, listarPagamentosDoEscritorio,
  criarPagamento, excluirPagamento, atualizarObra, sair,
} from '../dados.js';
import { moeda, dataBR, esc } from '../lib/format.js';
import { navBar } from '../lib/nav.js';
import { calcularReembolso, baixarPdfReembolso, baixarExcelReembolso, montarMensagemWhatsApp, PAGAMENTO } from '../lib/reembolso.js';
import { normalizarPlano, somaPagas, somaPlano, gerarPlano, renumerar, somarMeses, mensagemCobrancaParcela } from '../lib/parcelas.js';

// Financeiro: uma tela só, por obra, com Total a pagar / Recebido / Saldo em
// aberto; gera o relatório do cliente (PDF/WhatsApp) e controla os pagamentos ali.
export async function renderFinanceiro(container, opts = {}) {
  // manterScroll: refresh silencioso (sem "Carregando…" e sem pular pro topo),
  // usado quando o usuário marca pago/registra pagamento e a tela só precisa
  // recalcular os valores — a posição de rolagem é preservada.
  const manterScroll = Boolean(opts.manterScroll);
  const scrollY = manterScroll ? window.scrollY : 0;
  if (!manterScroll) container.innerHTML = `<div class="app"><p class="muted center">Carregando…</p></div>`;

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
      // Plano de pagamento do PROJETO (honorário de projeto) — CONTROLE INTERNO:
      // não é gerado automaticamente e NÃO aparece no painel do cliente (lá só
      // entra a obra). Os KPIs da obra continuam sendo o reembolso da obra.
      const plano = (Array.isArray(o.parcelasPlano) && o.parcelasPlano.length) ? renumerar(o.parcelasPlano) : [];
      return { o, comGestao, total: c.totalEscritorio, recebido, saldo: c.totalEscritorio - recebido, plano };
    }
    // Sem valor definido e sem plano salvo: não geramos parcela "fantasma".
    const orc = Number(o.orcamento || 0);
    const temPlanoSalvo = Array.isArray(o.parcelasPlano) && o.parcelasPlano.length;
    let plano = [];
    if (temPlanoSalvo || orc > 0) {
      const norm = normalizarPlano(o);
      plano = norm.plano;
      if (norm.mudou) planosParaSalvar.push({ id: o.id, plano });
    }
    // Valor do projeto = SOMA das parcelas (permite acrescentar um serviço numa
    // nova parcela sem precisar refazer nem mexer nas parcelas já pagas).
    const total = plano.length ? somaPlano(plano) : orc;
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

  // Mini-resumo do plano de parcelas (usado no bloco interno do projeto, nas
  // obras COM gestão) — atualizado no lugar ao marcar pago / editar valor.
  const resumoParcelas = (plano) => {
    const total = somaPlano(plano), receb = somaPagas(plano), saldo = total - receb;
    return `<div class="fin-proj-resumo">
      <span>Total do projeto <strong data-proj-total>${moeda(total)}</strong></span>
      <span>Recebido <strong class="val-ok" data-proj-recebido>${moeda(receb)}</strong></span>
      <span>Falta <strong class="${saldo > 0.005 ? 'neg' : 'val-saldo'}" data-proj-saldo>${moeda(saldo)}</strong></span>
    </div>`;
  };

  // Bloco de parcelas do projeto — totalmente editável: valor, data, forma,
  // status; dá para adicionar/remover parcelas e refazer em N iguais; cada
  // parcela pode ser cobrada pelo WhatsApp. Usado tanto no painel do cliente
  // (obras SEM gestão) quanto no controle INTERNO do projeto (obras COM gestão).
  const blocoParcelas = (o, plano, opts = {}) => `
      <div class="fin-controle${opts.interno ? ' fin-controle-interno' : ''}">
        <div class="row-between">
          <h3 class="fin-controle-titulo">${opts.titulo || 'Parcelas do projeto'}</h3>
          <span class="muted fin-hint">${opts.nota || 'Edite valor, data e forma; marque como pago; cobre pelo WhatsApp.'}</span>
        </div>
        ${opts.resumo ? resumoParcelas(plano) : ''}
        <div class="fin-parcelas" data-parcelas-obra="${esc(o.id)}">
          ${plano.length ? '' : `<p class="muted" style="margin:0">${opts.vazioMsg || 'Defina o valor do projeto (na obra) e clique em "Refazer", ou adicione parcelas manualmente.'}</p>`}
          ${plano.map((p) => `
          <div class="fin-parcela ${p.pago ? 'paga' : ''}" data-parc-n="${p.n}">
            <div class="fin-parc-topo">
              <span class="fin-parc-num">Parcela ${p.n}<span class="muted">/${plano.length}</span></span>
              <span class="fin-parc-badge">${p.pago ? 'Paga' : 'Em aberto'}</span>
              <button type="button" class="btn btn-x parc-del" title="Remover parcela">×</button>
            </div>
            <div class="fin-parc-campos">
              <label>Valor (R$) <input type="number" min="0" step="0.01" class="parc-valor" value="${Number(p.valor || 0)}" /></label>
              <label>Data <input type="date" class="parc-data" value="${esc(p.data || '')}" /></label>
              <label>Forma
                <select class="parc-forma">
                  ${FORMAS.map((f) => `<option ${p.forma === f ? 'selected' : ''}>${f}</option>`).join('')}
                </select>
              </label>
            </div>
            <div class="fin-parc-rodape">
              <button type="button" class="btn btn-mini parc-status ${p.pago ? 'pago' : ''}">${p.pago ? '✓ Pago' : 'Marcar como pago'}</button>
              <button type="button" class="btn btn-mini btn-whats parc-cobrar" title="Cobrar esta parcela pelo WhatsApp">💬 Cobrar</button>
            </div>
          </div>`).join('')}
        </div>
        <div class="fin-parc-acoes">
          <button type="button" class="btn btn-mini" data-add-parc="${esc(o.id)}">+ Adicionar parcela</button>
          <span class="fin-parc-refazer">
            Refazer em
            <input type="number" min="1" max="60" class="parc-refazer-n" value="${Math.max(1, plano.length)}" />
            parcelas iguais
            <button type="button" class="btn btn-mini" data-refazer-parc="${esc(o.id)}">Refazer</button>
          </span>
        </div>
      </div>`;

  // Controle INTERNO do pagamento do projeto (obras COM gestão). Fica recolhido
  // por padrão e NÃO aparece para o cliente. Reaproveita a UI de parcelas.
  const blocoProjetoInterno = (o, plano) => `
      <details class="fin-proj-det"${plano.length ? ' open' : ''}>
        <summary class="fin-proj-summary">💼 Pagamento do projeto — controle interno <span class="muted">(não aparece para o cliente)</span></summary>
        ${blocoParcelas(o, plano, {
          titulo: 'Parcelas do projeto (honorário de projeto)',
          nota: 'Só você vê. Marque pago e cobre pelo WhatsApp.',
          resumo: true, interno: true,
          vazioMsg: 'Adicione as parcelas do pagamento do projeto. Isso é um controle interno — o cliente não vê.',
        })}
      </details>`;

  // Situação da obra (para o selo e o traço colorido): quitado / em aberto /
  // sem cobranças. Base: total e saldo da OBRA (reembolso ou projeto).
  const situacao = (total, saldo) => total <= 0.005 ? 'neutro' : (saldo <= 0.005 ? 'quitado' : 'aberto');
  const seloTxt = (st, saldo) => st === 'quitado' ? '✓ Quitado' : st === 'aberto' ? 'Falta ' + moeda(saldo) : 'Sem cobranças';
  const seloCls = (st) => st === 'quitado' ? 'fin-badge-ok' : st === 'aberto' ? 'fin-badge-aberto' : 'fin-badge-neutro';

  const cardFin = (l) => {
    const o = l.o;
    const st = situacao(l.total, l.saldo);
    return `
    <section class="card fin-obra-card fin-status-${st}">
      <div class="fin-obra-cab">
        <div class="fin-obra-id">
          <strong class="fin-obra-nome">${esc(o.nome)}</strong>
          <span class="muted fin-obra-cliente">${esc(o.cliente || 'Sem cliente definido')}</span>
        </div>
        <div class="fin-obra-cab-dir">
          <span class="fin-badge ${seloCls(st)}">${seloTxt(st, l.saldo)}</span>
          <a class="btn btn-mini" data-link href="/painel/${esc(o.slug)}">Abrir obra</a>
        </div>
      </div>
      <div class="kpis">
        ${kpi(l.comGestao ? 'Total a pagar' : 'Valor do projeto', moeda(l.total))}
        ${kpi('Recebido', moeda(l.recebido), 'val-ok')}
        ${kpi('Saldo em aberto', moeda(l.saldo), l.saldo > 0.005 ? 'neg' : 'val-saldo')}
      </div>
      ${l.comGestao ? (blocoPagamentos(o) + blocoProjetoInterno(o, l.plano || [])) : blocoParcelas(o, l.plano)}
    </section>`;
  };

  // Mapa obraId -> plano (referência mutável usada pelos handlers de parcela).
  const planoPorObra = {};
  linhas.forEach((l) => { if (l.plano) planoPorObra[l.o.id] = l.plano; });

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

  // O container (app) é o MESMO elemento entre re-renders, então removemos os
  // handlers do render anterior antes de religar — senão eles se acumulam e cada
  // clique dispara várias vezes.
  const prevH = container.__finH;
  if (prevH) {
    container.removeEventListener('change', prevH.change);
    container.removeEventListener('click', prevH.click);
    container.removeEventListener('submit', prevH.submit);
  }
  container.__finH = {};
  // Refresh que preserva a rolagem (usado só quando a estrutura muda: adicionar/
  // remover parcela, registrar/excluir pagamento).
  const recarregar = () => renderFinanceiro(container, { manterScroll: true });

  // Atualiza os valores (Recebido/Saldo do card e do resumo geral) SEM
  // re-renderizar a página — assim a tela NÃO sobe ao marcar pago / editar valor.
  const refletirValores = (obraId, cardEl) => {
    const linha = linhas.find((x) => x.o.id === obraId);
    const plano = planoPorObra[obraId] || [];
    const total = somaPlano(plano);
    const recebido = somaPagas(plano);
    const saldo = total - recebido;
    // COM gestão: o plano é o controle INTERNO do projeto — mexe SÓ no resumo do
    // bloco interno; os KPIs da obra e o resumo geral (que são da obra) não mudam.
    if (linha && linha.comGestao) {
      const box = cardEl && cardEl.querySelector('.fin-proj-resumo');
      if (box) {
        const t = box.querySelector('[data-proj-total]'); if (t) t.textContent = moeda(total);
        const r = box.querySelector('[data-proj-recebido]'); if (r) r.textContent = moeda(recebido);
        const sd = box.querySelector('[data-proj-saldo]');
        if (sd) { sd.textContent = moeda(saldo); sd.className = saldo > 0.005 ? 'neg' : 'val-saldo'; }
      }
      return;
    }
    // SEM gestão: o plano É o total do projeto — atualiza os KPIs do card...
    if (cardEl) {
      const s = cardEl.querySelectorAll('.kpis .kpi strong');
      if (s[0]) s[0].textContent = moeda(total);
      if (s[1]) s[1].textContent = moeda(recebido);
      if (s[2]) { s[2].textContent = moeda(saldo); s[2].className = saldo > 0.005 ? 'neg' : 'val-saldo'; }
      // ...e o selo/traço de situação da obra.
      const st = situacao(total, saldo);
      cardEl.classList.remove('fin-status-quitado', 'fin-status-aberto', 'fin-status-neutro');
      cardEl.classList.add('fin-status-' + st);
      const bd = cardEl.querySelector('.fin-badge');
      if (bd) { bd.className = 'fin-badge ' + seloCls(st); bd.textContent = seloTxt(st, saldo); }
    }
    // ...e o resumo geral (soma de todos os clientes).
    let tG = 0, rG = 0;
    for (const l of linhas) {
      tG += l.comGestao ? l.total : somaPlano(planoPorObra[l.o.id] || l.plano || []);
      rG += l.comGestao ? l.recebido : somaPagas(planoPorObra[l.o.id] || l.plano || []);
    }
    const sG = tG - rG;
    const g = container.querySelectorAll('.fin-geral .kpis .kpi strong');
    if (g[0]) g[0].textContent = moeda(tG);
    if (g[1]) g[1].textContent = moeda(rG);
    if (g[2]) { g[2].textContent = moeda(sG); g[2].className = sG > 0.005 ? 'neg' : 'val-saldo'; }
  };

  // Editar valor/data/forma de uma parcela (obra sem gestão).
  container.addEventListener('change', container.__finH.change = async (e) => {
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
      if (recomputa) refletirValores(obraId, e.target.closest('.card')); // valor mexe no recebido/saldo — sem re-render
    } catch (err) { alert('Não foi possível salvar: ' + (err?.message || err)); }
  });

  container.addEventListener('click', container.__finH.click = async (e) => {
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
        // Atualiza SÓ o que mudou, no lugar — a tela não sobe pro topo.
        row.classList.toggle('paga', !!p.pago);
        status.classList.toggle('pago', !!p.pago);
        status.textContent = p.pago ? '✓ Pago' : 'Marcar como pago';
        const bdg = row.querySelector('.fin-parc-badge');
        if (bdg) bdg.textContent = p.pago ? 'Paga' : 'Em aberto';
        status.disabled = false;
        refletirValores(obraId, status.closest('.card'));
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
      try { await atualizarObra(obraId, { parcelasPlano: novo }); recarregar(); }
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
      try { await atualizarObra(obraId, { parcelasPlano: novo }); recarregar(); }
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
      const base = somaPlano(planoPorObra[obraId] || []) || (o.gestao === false ? Number(o.orcamento || 0) : 0);
      const novo = gerarPlano(base, n);
      try {
        await atualizarObra(obraId, { parcelasPlano: novo, parcelas: n });
        recarregar();
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
      recarregar();
    }
  });

  container.addEventListener('submit', container.__finH.submit = async (e) => {
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
      recarregar();
    } catch (err) {
      btn.disabled = false; btn.textContent = 'Salvar';
      erro.textContent = 'Não foi possível salvar: ' + (err?.message || err); erro.hidden = false;
    }
  });

  // Refresh silencioso: devolve a rolagem ao ponto onde o usuário estava.
  if (manterScroll) requestAnimationFrame(() => window.scrollTo(0, scrollY));
}
