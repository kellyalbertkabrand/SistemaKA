import { supabase } from '../supabaseClient.js';
import { navegar } from '../main.js';
import { moeda, pct, slugify, esc, dataBR } from '../lib/format.js';
import { navBar } from '../lib/nav.js';
import { ETAPAS_PADRAO } from '../lib/etapasPadrao.js';
import { baixarCSV, numBR } from '../lib/exportar.js';

// Lista de obras + cadastro de nova obra (com etapas opcionais).
export async function renderObras(container) {
  container.innerHTML = `<div class="app"><p class="muted center">Carregando…</p></div>`;

  let obras;
  try {
    const res = await Promise.race([
      supabase.from('obras').select('*').order('created_at', { ascending: false }),
      new Promise((_, reject) => setTimeout(() => reject(new Error('tempo esgotado ao falar com o banco')), 12000)),
    ]);
    if (res.error) throw res.error;
    obras = res.data || [];
  } catch (e) {
    container.innerHTML = `<div class="app">
      <p class="erro" style="display:block">Não foi possível carregar as obras. ${esc(e?.message || e)}</p>
      <button class="btn btn-primary" onclick="location.reload()">Tentar de novo</button>
    </div>`;
    return;
  }

  // Totais por obra + totais gerais (uma consulta só).
  const ids = (obras || []).map((o) => o.id);
  let porObra = {};
  let totalExec = 0, totalPago = 0, totalPend = 0;
  if (ids.length) {
    const { data: lancs } = await supabase
      .from('lancamentos')
      .select('obra_id, valor, status')
      .in('obra_id', ids);
    for (const l of lancs || []) {
      const v = Number(l.valor || 0);
      porObra[l.obra_id] = (porObra[l.obra_id] || 0) + v;
      totalExec += v;
      if (l.status === 'pago') totalPago += v; else totalPend += v;
    }
  }
  const totalOrc = (obras || []).reduce((t, o) => t + Number(o.orcamento || 0), 0);
  const totalSaldo = totalOrc - totalExec;
  const obrasEstouradas = (obras || []).filter(
    (o) => Number(o.orcamento || 0) - (porObra[o.id] || 0) < 0
  ).length;

  container.innerHTML = `
    ${navBar('painel')}
    <div class="app">
      <div class="pagina-topo">
        <h1>Painel de Obras</h1>
        ${(obras || []).length ? `<button class="btn btn-mini" id="exportar-tudo">⬇ Exportar tudo</button>` : ''}
      </div>

      <section class="card">
        <button class="btn btn-primary" id="abrir-nova">+ Nova obra</button>
        <form id="form-obra" class="form-grid" hidden>
          <label>Nome da obra
            <input id="o-nome" required placeholder="Ex.: Casa da Família Silva" />
          </label>
          <label>Cliente
            <input id="o-cliente" placeholder="Ex.: Ana e João Silva" />
          </label>
          <label>Link do cliente (slug)
            <input id="o-slug" placeholder="casa-familia-silva" />
          </label>
          <label>Orçamento total (R$)
            <input id="o-orcamento" type="number" min="0" step="0.01" value="0" />
          </label>

          <div class="etapas-novas full">
            <div class="row-between">
              <strong>Etapas (opcional)</strong>
              <button type="button" class="btn btn-mini" id="add-etapa-linha">+ etapa</button>
            </div>
            <div id="etapas-linhas"></div>
          </div>

          <label class="check-inline full">
            <input type="checkbox" id="o-padrao" />
            Já criar as etapas padrão da obra (lista CAIXA, do início ao fim)
          </label>

          <div class="full row-end">
            <button type="button" class="btn btn-ghost" id="cancelar-nova">Cancelar</button>
            <button type="submit" class="btn btn-primary">Salvar obra</button>
          </div>
          <p class="erro full" id="erro-obra" hidden></p>
        </form>
      </section>

      <section class="lista-obras" id="lista">
        ${(obras || []).length === 0
          ? `<p class="muted center">Nenhuma obra ainda. Crie a primeira acima.</p>`
          : obras.map((o) => cardObra(o, porObra[o.id] || 0)).join('')}
      </section>
    </div>`;

  // Logout
  container.querySelector('#sair').addEventListener('click', async () => {
    await supabase.auth.signOut();
  });

  // Exportar tudo (todos os lançamentos de todas as obras) em CSV/Excel
  const btnExp = container.querySelector('#exportar-tudo');
  if (btnExp) {
    btnExp.addEventListener('click', async () => {
      btnExp.disabled = true;
      const original = btnExp.textContent;
      btnExp.textContent = 'Gerando…';
      const nomePorId = Object.fromEntries((obras || []).map((o) => [o.id, o.nome]));
      const { data: todos } = await supabase
        .from('lancamentos')
        .select('obra_id, data, etapa, descricao, valor, status')
        .in('obra_id', ids)
        .order('data', { ascending: false });
      const linhas = [['Obra', 'Data', 'Etapa', 'Descrição', 'Valor', 'Status']];
      for (const l of todos || []) {
        linhas.push([nomePorId[l.obra_id] || '', dataBR(l.data), l.etapa, l.descricao || '', numBR(l.valor), l.status]);
      }
      baixarCSV('obras-todos-os-lancamentos.csv', linhas);
      btnExp.disabled = false;
      btnExp.textContent = original;
    });
  }

  // Abrir uma obra
  container.querySelectorAll('[data-obra]').forEach((el) => {
    el.addEventListener('click', () => navegar(`/painel/${el.getAttribute('data-obra')}`));
  });

  configurarFormNovaObra(container);
}

function cardObra(o, executado) {
  const saldo = Number(o.orcamento || 0) - executado;
  const p = pct(executado, o.orcamento);
  return `
    <article class="card obra-card" data-obra="${esc(o.id)}" role="button" tabindex="0">
      <div class="row-between">
        <h2>${esc(o.nome)}</h2>
        <span class="tag ${o.publicado ? 'tag-on' : 'tag-off'}">
          ${o.publicado ? 'link ativo' : 'link off'}
        </span>
      </div>
      <p class="muted">${esc(o.cliente || 'Sem cliente definido')}</p>
      <div class="barra"><span style="width:${Math.min(p, 100)}%"></span></div>
      <div class="mini-kpis">
        <div><small>Orçado</small><strong>${moeda(o.orcamento)}</strong></div>
        <div><small>Executado</small><strong>${moeda(executado)}</strong></div>
        <div><small>Saldo</small><strong class="${saldo < 0 ? 'neg' : ''}">${moeda(saldo)}</strong></div>
        <div><small>Andamento</small><strong>${p}%</strong></div>
      </div>
    </article>`;
}

function configurarFormNovaObra(container) {
  const abrir = container.querySelector('#abrir-nova');
  const form = container.querySelector('#form-obra');
  const cancelar = container.querySelector('#cancelar-nova');
  const erro = container.querySelector('#erro-obra');
  const nome = container.querySelector('#o-nome');
  const slug = container.querySelector('#o-slug');
  const linhas = container.querySelector('#etapas-linhas');

  abrir.addEventListener('click', () => {
    form.hidden = false;
    abrir.hidden = true;
    nome.focus();
  });
  cancelar.addEventListener('click', () => {
    form.hidden = true;
    abrir.hidden = false;
  });

  // Slug sugerido a partir do nome (até a arquiteta mexer manualmente).
  let slugEditado = false;
  slug.addEventListener('input', () => { slugEditado = true; });
  nome.addEventListener('input', () => {
    if (!slugEditado) slug.value = slugify(nome.value);
  });

  const addLinha = () => {
    const div = document.createElement('div');
    div.className = 'etapa-linha';
    div.innerHTML = `
      <input class="et-nome" placeholder="Nome da etapa (ex.: Fundação)" />
      <input class="et-orcado" type="number" min="0" step="0.01" placeholder="Orçado R$" />
      <button type="button" class="btn btn-mini btn-x" title="Remover">×</button>`;
    div.querySelector('.btn-x').addEventListener('click', () => div.remove());
    linhas.appendChild(div);
  };
  container.querySelector('#add-etapa-linha').addEventListener('click', addLinha);

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    erro.hidden = true;

    const payload = {
      nome: nome.value.trim(),
      cliente: container.querySelector('#o-cliente').value.trim() || null,
      slug: (slug.value.trim() || slugify(nome.value)),
      orcamento: Number(container.querySelector('#o-orcamento').value || 0),
      publicado: true,
    };
    if (!payload.nome) { mostrarErro(erro, 'Dê um nome à obra.'); return; }
    if (!payload.slug) { mostrarErro(erro, 'Defina o slug do link.'); return; }

    const btn = form.querySelector('button[type="submit"]');
    btn.disabled = true; btn.textContent = 'Salvando…';

    const { data: obra, error: errObra } = await supabase
      .from('obras')
      .insert(payload)
      .select()
      .single();

    if (errObra) {
      btn.disabled = false; btn.textContent = 'Salvar obra';
      mostrarErro(erro, /duplicate|unique/i.test(errObra.message)
        ? 'Esse slug já existe. Escolha outro.'
        : errObra.message);
      return;
    }

    // Etapas preenchidas manualmente
    const etapas = [...linhas.querySelectorAll('.etapa-linha')]
      .map((l) => ({
        obra_id: obra.id,
        nome: l.querySelector('.et-nome').value.trim(),
        orcado: Number(l.querySelector('.et-orcado').value || 0),
      }))
      .filter((et) => et.nome);

    // Etapas padrão (CAIXA), se marcado — sem duplicar as já digitadas
    if (container.querySelector('#o-padrao')?.checked) {
      const jaTem = new Set(etapas.map((e) => e.nome.toLowerCase()));
      for (const nome of ETAPAS_PADRAO) {
        if (!jaTem.has(nome.toLowerCase())) {
          etapas.push({ obra_id: obra.id, nome, orcado: 0 });
        }
      }
    }

    if (etapas.length) {
      await supabase.from('etapas').insert(etapas);
    }

    navegar(`/painel/${obra.id}`);
  });
}

function kpi(rotulo, valor, cls = '') {
  return `<div class="kpi"><small>${rotulo}</small><strong class="${cls}">${valor}</strong></div>`;
}

function mostrarErro(el, msg) {
  el.textContent = msg;
  el.hidden = false;
}
