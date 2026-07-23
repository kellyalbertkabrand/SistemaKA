import { listarObras, totaisPorObra, listarLancamentosDoEscritorio, listarFotosDoEscritorio, criarObra, criarEtapas, slugExiste, sair } from '../dados.js';
import { navegar } from '../main.js';
import { moeda, pct, slugify, esc, dataBR } from '../lib/format.js';
import { navBar } from '../lib/nav.js';
import { ETAPAS_PADRAO } from '../lib/etapasPadrao.js';
import { baixarBlob, montarExcelHTML, numBR } from '../lib/exportar.js';
import { criarZip } from '../lib/zip.js';
import { dataURLParaBytes } from '../lib/imagem.js';

// Lista de obras + cadastro de nova obra (com etapas opcionais).
export async function renderObras(container) {
  container.innerHTML = `<div class="app"><p class="muted center">Carregando…</p></div>`;

  let obras;
  try {
    obras = await Promise.race([
      listarObras(),
      new Promise((_, reject) => setTimeout(() => reject(new Error('tempo esgotado ao falar com o banco')), 12000)),
    ]);
  } catch (e) {
    container.innerHTML = `<div class="app">
      <p class="erro" style="display:block">Não foi possível carregar as obras. ${esc(e?.message || e)}</p>
      <button class="btn btn-primary" onclick="location.reload()">Tentar de novo</button>
    </div>`;
    return;
  }

  // Os totais executados exigem baixar todos os lançamentos (pesado por causa
  // das notas fiscais anexadas). Para a tela abrir NA HORA, renderizamos os
  // cards já e preenchemos os totais em segundo plano (ver mais abaixo).
  let porObra = {};
  let totaisProntos = false;

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
          : obras.map((o) => cardObra(o, porObra[o.id] || 0, totaisProntos)).join('')}
      </section>
    </div>`;

  // (Re)liga o clique de cada card — usado no 1º render e ao atualizar os totais.
  const ligarCards = () => {
    container.querySelectorAll('[data-obra]').forEach((el) => {
      el.addEventListener('click', () => navegar(`/painel/${el.getAttribute('data-obra')}`));
    });
  };

  // Preenche os totais em segundo plano e atualiza só a lista (sem travar a tela).
  totaisPorObra().then((t) => {
    porObra = t;
    totaisProntos = true;
    const lista = container.querySelector('#lista');
    if (lista && (obras || []).length) {
      lista.innerHTML = obras.map((o) => cardObra(o, porObra[o.id] || 0, true)).join('');
      ligarCards();
    }
  }).catch(() => {});

  // Logout
  container.querySelector('#sair').addEventListener('click', async () => {
    await sair();
  });

  // Exportar tudo: um ZIP com a planilha geral + uma pasta por obra
  // (notas fiscais e fotos).
  const btnExp = container.querySelector('#exportar-tudo');
  if (btnExp) {
    btnExp.addEventListener('click', async () => {
      btnExp.disabled = true;
      const original = btnExp.textContent;
      btnExp.textContent = 'Gerando…';
      try {
        const [todos, todasFotos] = await Promise.all([
          listarLancamentosDoEscritorio(),
          listarFotosDoEscritorio().catch(() => []),
        ]);

        const nomeSeg = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '')
          .replace(/[^a-zA-Z0-9._-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40) || 'item';
        const extDe = (dado) => {
          const t = (/^data:([^;]+)/.exec(dado || '') || [])[1] || '';
          if (t.includes('pdf')) return 'pdf';
          if (t.includes('png')) return 'png';
          if (t.includes('webp')) return 'webp';
          return 'jpg';
        };

        // Totais a partir dos lançamentos já baixados (não depende do preenchimento
        // em segundo plano lá de cima).
        const execExport = {};
        for (const l of todos) execExport[l.obraId] = (execExport[l.obraId] || 0) + Number(l.valor || 0);

        const nomePorId = Object.fromEntries((obras || []).map((o) => [o.id, o.nome]));
        const slugPorId = Object.fromEntries((obras || []).map((o) => [o.id, o.slug || nomeSeg(o.nome)]));
        const pastaObra = (obraId) => slugPorId[obraId] || nomeSeg(obraId || 'sem-obra');

        const arquivos = [];
        const lancOrd = [...todos].sort((a, b) => String(b.data).localeCompare(String(a.data)));
        const fotosOrd = [...todasFotos].sort((a, b) => (b.criadoEm || 0) - (a.criadoEm || 0));

        // Notas fiscais -> <obra>/notas-fiscais/
        const nfNome = new Map();
        const contNF = {};
        for (const l of lancOrd) {
          const dado = l.reciboDataUrl || l.reciboUrl;
          if (dado && String(dado).startsWith('data:')) {
            const p = pastaObra(l.obraId);
            contNF[p] = (contNF[p] || 0) + 1;
            const nome = `${p}/notas-fiscais/${String(contNF[p]).padStart(2, '0')}-${nomeSeg((l.data || '').slice(0, 10) + '-' + (l.etapa || ''))}.${extDe(dado)}`;
            arquivos.push({ nome, dados: dataURLParaBytes(dado) });
            nfNome.set(l.id, nome);
          }
        }
        // Fotos -> <obra>/fotos/
        const fNome = new Map();
        const contF = {};
        for (const f of fotosOrd) {
          const dado = f.dataUrl || f.url;
          if (dado && String(dado).startsWith('data:')) {
            const p = pastaObra(f.obraId);
            contF[p] = (contF[p] || 0) + 1;
            const d = f.dataVisita || (f.criadoEm ? new Date(f.criadoEm).toISOString().slice(0, 10) : '') || 'foto';
            const nome = `${p}/fotos/${String(contF[p]).padStart(2, '0')}-${nomeSeg(d)}.jpg`;
            arquivos.push({ nome, dados: dataURLParaBytes(dado) });
            fNome.set(f.id, nome);
          }
        }

        const secoes = [
          { titulo: 'Obras', cabecalho: ['Obra', 'Cliente', 'Orçamento (R$)', 'Executado (R$)', 'Saldo (R$)'],
            linhas: (obras || []).map((o) => {
              const exec = execExport[o.id] || 0;
              return [o.nome, o.cliente || '', numBR(o.orcamento), numBR(exec), numBR(Number(o.orcamento || 0) - exec)];
            }) },
          { titulo: 'Lançamentos (todas as obras)', cabecalho: ['Obra', 'Data', 'Etapa', 'Descrição', 'Valor (R$)', 'Status', 'Nota fiscal (arquivo)'],
            linhas: lancOrd.map((l) => [
              nomePorId[l.obraId] || '', dataBR(l.data), l.etapa, l.descricao || '', numBR(l.valor), l.status,
              nfNome.get(l.id) || ((l.reciboDataUrl || l.reciboUrl) ? 'anexada' : '—'),
            ]) },
          { titulo: 'Fotos (todas as obras)', cabecalho: ['Obra', 'Data da visita', 'Descrição', 'Arquivo'],
            linhas: fotosOrd.map((f) => [
              nomePorId[f.obraId] || '',
              f.dataVisita ? dataBR(f.dataVisita) : (f.criadoEm ? dataBR(new Date(f.criadoEm).toISOString()) : ''),
              f.texto || '', fNome.get(f.id) || '',
            ]) },
        ];
        arquivos.unshift({ nome: 'obras.xls', dados: new TextEncoder().encode('﻿' + montarExcelHTML(secoes)) });

        baixarBlob('painel-obras.zip', criarZip(arquivos));
      } catch (err) {
        alert('Não foi possível exportar: ' + (err?.message || err));
      } finally {
        btnExp.disabled = false;
        btnExp.textContent = original;
      }
    });
  }

  // Abrir uma obra
  ligarCards();

  configurarFormNovaObra(container);
}

function cardObra(o, executado, pronto = true) {
  const exec = executado || 0;
  const saldo = Number(o.orcamento || 0) - exec;
  const p = pct(exec, o.orcamento);
  const espera = '<span class="muted">…</span>';
  return `
    <article class="card obra-card" data-obra="${esc(o.id)}" role="button" tabindex="0">
      <div class="row-between">
        <h2>${esc(o.nome)}</h2>
        <span class="tag ${o.publicado ? 'tag-on' : 'tag-off'}">
          ${o.publicado ? 'link ativo' : 'link off'}
        </span>
      </div>
      <p class="muted">${esc(o.cliente || 'Sem cliente definido')}</p>
      <div class="barra"><span style="width:${pronto ? Math.min(p, 100) : 0}%"></span></div>
      <div class="mini-kpis">
        <div><small>Orçado</small><strong>${moeda(o.orcamento)}</strong></div>
        <div><small>Executado</small><strong>${pronto ? moeda(exec) : espera}</strong></div>
        <div><small>Saldo</small><strong class="${pronto && saldo < 0 ? 'neg' : ''}">${pronto ? moeda(saldo) : espera}</strong></div>
        <div><small>Andamento</small><strong>${pronto ? p + '%' : espera}</strong></div>
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

    try {
      if (await slugExiste(payload.slug)) {
        btn.disabled = false; btn.textContent = 'Salvar obra';
        mostrarErro(erro, 'Esse slug já existe. Escolha outro.');
        return;
      }
      await criarObra(payload); // o ID da obra é o próprio slug

      // Etapas preenchidas manualmente
      const etapas = [...linhas.querySelectorAll('.etapa-linha')]
        .map((l) => ({
          obraId: payload.slug,
          nome: l.querySelector('.et-nome').value.trim(),
          orcado: Number(l.querySelector('.et-orcado').value || 0),
        }))
        .filter((et) => et.nome);

      // Etapas padrão (CAIXA), se marcado — sem duplicar as já digitadas
      if (container.querySelector('#o-padrao')?.checked) {
        const jaTem = new Set(etapas.map((e) => e.nome.toLowerCase()));
        for (const nomeEt of ETAPAS_PADRAO) {
          if (!jaTem.has(nomeEt.toLowerCase())) {
            etapas.push({ obraId: payload.slug, nome: nomeEt, orcado: 0 });
          }
        }
      }

      if (etapas.length) await criarEtapas(etapas);

      navegar(`/painel/${payload.slug}`);
    } catch (err) {
      btn.disabled = false; btn.textContent = 'Salvar obra';
      mostrarErro(erro, err?.message || 'Não foi possível salvar a obra.');
    }
  });
}

function kpi(rotulo, valor, cls = '') {
  return `<div class="kpi"><small>${rotulo}</small><strong class="${cls}">${valor}</strong></div>`;
}

function mostrarErro(el, msg) {
  el.textContent = msg;
  el.hidden = false;
}
