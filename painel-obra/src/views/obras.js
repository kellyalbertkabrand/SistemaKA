import { listarObras, totaisPorObra, listarLancamentosDoEscritorio, listarFotosDoEscritorio, listarEtapasDoEscritorio, listarClientes, listarFornecedores, listarPagamentosDoEscritorio, criarObra, criarEtapas, slugExiste, sair, salvarFotoBin, definirThumbFoto, anexarRecibo, obterRecibo, obterFotoBin } from '../dados.js';
import { navegar } from '../main.js';
import { moeda, pct, slugify, esc, dataBR } from '../lib/format.js';
import { navBar } from '../lib/nav.js';
import { ETAPAS_PADRAO } from '../lib/etapasPadrao.js';
import { baixarBlob, montarExcelHTML, numBR } from '../lib/exportar.js';
import { criarZip } from '../lib/zip.js';
import { dataURLParaBytes, comprimirParaDataURL, dataURLParaBlob } from '../lib/imagem.js';

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
        ${(obras || []).length ? `<div class="row-end">
          <button class="btn btn-mini" id="otimizar-dados" title="Deixa o sistema mais rápido: separa as imagens/notas já enviadas">⚙ Otimizar imagens</button>
          <button class="btn btn-mini" id="exportar-tudo">⬇ Exportar tudo (backup completo)</button>
        </div>` : ''}
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
          <label>Percentual do escritório — gestão (%)
            <input id="o-percentual" type="number" min="0" max="100" step="0.1" value="0" placeholder="Ex.: 10" />
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

  // Otimizar (uma vez): separa as imagens/notas antigas (base64 inline) em
  // coleções próprias (fotos_bin / recibos), gerando miniaturas leves. Assim as
  // aberturas seguintes ficam rápidas. Grava o pesado ANTES de apagar o inline.
  const btnOt = container.querySelector('#otimizar-dados');
  if (btnOt) {
    btnOt.addEventListener('click', async () => {
      if (!confirm('Otimizar as imagens e notas fiscais já enviadas? Deixa o sistema mais rápido. Pode levar um tempo — não feche a página.')) return;
      const rot = btnOt.textContent;
      btnOt.disabled = true;
      try {
        const [fotos, lancs] = await Promise.all([
          listarFotosDoEscritorio(),
          listarLancamentosDoEscritorio(),
        ]);
        const fotosAntigas = fotos.filter((f) => !f.thumbUrl && f.dataUrl);
        const lancsAntigos = lancs.filter((l) => l.reciboDataUrl);
        const total = fotosAntigas.length + lancsAntigos.length;
        if (!total) {
          btnOt.textContent = '✓ Já otimizado';
          setTimeout(() => { btnOt.textContent = rot; btnOt.disabled = false; }, 2500);
          return;
        }
        let feito = 0;
        for (const f of fotosAntigas) {
          btnOt.textContent = `Otimizando ${++feito}/${total}…`;
          const thumb = await comprimirParaDataURL(dataURLParaBlob(f.dataUrl), 30_000, 400);
          await salvarFotoBin(f.id, f.obraId, f.dataUrl); // grava a cheia primeiro
          await definirThumbFoto(f.id, thumb);            // só então apaga o inline
        }
        for (const l of lancsAntigos) {
          btnOt.textContent = `Otimizando ${++feito}/${total}…`;
          await anexarRecibo(l.id, l.reciboDataUrl, l.reciboNome, l.obraId);
        }
        btnOt.textContent = '✓ Otimizado!';
        setTimeout(() => renderObras(container), 1200);
      } catch (err) {
        btnOt.disabled = false;
        btnOt.textContent = rot;
        alert('Não foi possível otimizar agora: ' + (err?.message || err)
          + '\n\nSe for erro de permissão, publique as Regras do Firestore (com as coleções fotos_bin e recibos).');
      }
    });
  }

  // Exportar tudo (backup completo): um ZIP datado com planilhas de clientes,
  // fornecedores e pagamentos; uma pasta por obra (detalhes + fotos + notas
  // fiscais + projeto); e um backup.json técnico (para restauração).
  const btnExp = container.querySelector('#exportar-tudo');
  if (btnExp) {
    btnExp.addEventListener('click', async () => {
      btnExp.disabled = true;
      const original = btnExp.textContent;
      btnExp.textContent = 'Gerando…';
      try {
        const [todos, todasFotos, todasEtapas, clientes, fornecedores, pagamentos] = await Promise.all([
          listarLancamentosDoEscritorio(),
          listarFotosDoEscritorio().catch(() => []),
          listarEtapasDoEscritorio().catch(() => []),
          listarClientes().catch(() => []),
          listarFornecedores().catch(() => []),
          listarPagamentosDoEscritorio().catch(() => []),
        ]);

        const enc = (txt) => new TextEncoder().encode('﻿' + txt);
        const xls = (secoes) => enc(montarExcelHTML(secoes));
        const nomeSeg = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '')
          .replace(/[^a-zA-Z0-9._-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40) || 'item';
        const extDe = (dado) => {
          const t = (/^data:([^;]+)/.exec(dado || '') || [])[1] || '';
          if (t.includes('pdf')) return 'pdf';
          if (t.includes('png')) return 'png';
          if (t.includes('webp')) return 'webp';
          return 'jpg';
        };
        const dataHora = (ms) => (ms ? dataBR(new Date(ms).toISOString()) : '');
        // Planilha "todos os campos": colunas = união de todas as chaves.
        const secaoTodosCampos = (titulo, docs, ordem = []) => {
          const arr = docs || [];
          const chaves = []; const vistas = new Set();
          [...ordem, ...arr.flatMap((d) => Object.keys(d))].forEach((k) => {
            if (!vistas.has(k)) { vistas.add(k); chaves.push(k); }
          });
          const val = (d, k) => {
            const v = d[k];
            if (v == null) return '';
            if (k === 'criadoEm' || k === 'reciboEm') return dataHora(v);
            if (typeof v === 'object') return JSON.stringify(v);
            return String(v);
          };
          return { titulo, cabecalho: chaves, linhas: arr.map((d) => chaves.map((k) => val(d, k))) };
        };

        const obrasArr = obras || [];
        const nomePorId = Object.fromEntries(obrasArr.map((o) => [o.id, o.nome]));
        const usados = new Set();
        const pastaObra = (o) => {
          let base = `obras/${nomeSeg(o.slug || o.nome || o.id)}`;
          let nome = base, i = 2;
          while (usados.has(nome)) { nome = `${base}-${i++}`; }
          usados.add(nome); return nome;
        };
        const pastaPorId = {};
        obrasArr.forEach((o) => { pastaPorId[o.id] = pastaObra(o); });

        // Agrupa por obra.
        const porObra = (arr) => {
          const m = {}; (arr || []).forEach((x) => { (m[x.obraId] ||= []).push(x); }); return m;
        };
        const lancPorObra = porObra(todos);
        const etapasPorObra = porObra(todasEtapas);
        const fotosPorObra = porObra(todasFotos);
        const pagPorObra = porObra(pagamentos);

        const arquivos = [];
        const nfNome = new Map();   // lancId -> caminho do arquivo
        const fNome = new Map();    // fotoId -> caminho do arquivo

        // ---- Uma pasta por obra: detalhes + fotos + notas fiscais + projeto ----
        for (const o of obrasArr) {
          const pasta = pastaPorId[o.id];
          const lancs = (lancPorObra[o.id] || []).slice().sort((a, b) => String(b.data).localeCompare(String(a.data)));
          const etps = (etapasPorObra[o.id] || []).slice().sort((a, b) => (a.criadoEm || 0) - (b.criadoEm || 0));
          const fts = (fotosPorObra[o.id] || []).slice().sort((a, b) => (b.criadoEm || 0) - (a.criadoEm || 0));
          const pgs = (pagPorObra[o.id] || []).slice().sort((a, b) => String(b.data).localeCompare(String(a.data)));
          const exec = lancs.reduce((t, l) => t + Number(l.valor || 0), 0);

          // Notas fiscais da obra.
          let cNF = 0;
          for (const l of lancs) {
            let dado = l.reciboDataUrl || l.reciboUrl;
            if (!dado && (l.temRecibo || l.reciboNome)) dado = (await obterRecibo(l.id))?.dataUrl;
            if (dado && String(dado).startsWith('data:')) {
              const nome = `${pasta}/notas-fiscais/${String(++cNF).padStart(2, '0')}-${nomeSeg((l.data || '').slice(0, 10) + '-' + (l.etapa || ''))}.${extDe(dado)}`;
              arquivos.push({ nome, dados: dataURLParaBytes(dado) });
              nfNome.set(l.id, nome);
            }
          }
          // Fotos da obra.
          let cF = 0;
          for (const f of fts) {
            let dado = f.dataUrl || f.url;
            if (!dado) dado = await obterFotoBin(f.id);
            if (dado && String(dado).startsWith('data:')) {
              const d = f.dataVisita || (f.criadoEm ? new Date(f.criadoEm).toISOString().slice(0, 10) : '') || 'foto';
              const nome = `${pasta}/fotos/${String(++cF).padStart(2, '0')}-${nomeSeg(d)}.${extDe(dado)}`;
              arquivos.push({ nome, dados: dataURLParaBytes(dado) });
              fNome.set(f.id, nome);
            }
          }
          // Arquivos de projeto (quando anexados como arquivo).
          let cP = 0;
          for (const p of (o.projetos || [])) {
            let dado = p.dataUrl;
            if (!dado && p.temArquivo) dado = await obterFotoBin(p.id);
            if (dado && String(dado).startsWith('data:')) {
              const nome = `${pasta}/projeto/${String(++cP).padStart(2, '0')}-${nomeSeg(p.arquivo || p.nome || 'projeto')}`;
              const jaTemExt = /\.[a-z0-9]{2,5}$/i.test(nome);
              arquivos.push({ nome: jaTemExt ? nome : `${nome}.${extDe(dado)}`, dados: dataURLParaBytes(dado) });
            }
          }

          // Planilha de detalhes da obra.
          const secoesObra = [
            { titulo: `Obra: ${o.nome || ''}`, cabecalho: ['Campo', 'Valor'], linhas: [
              ['Nome', o.nome || ''], ['Cliente', o.cliente || ''], ['Slug (link)', o.slug || ''],
              ['Orçamento (R$)', numBR(o.orcamento)], ['Percentual do escritório (%)', String(o.percentualEscritorio || 0)],
              ['Executado (R$)', numBR(exec)], ['Saldo (R$)', numBR(Number(o.orcamento || 0) - exec)],
              ['Publicado', o.publicado ? 'sim' : 'não'], ['Criada em', dataHora(o.criadoEm)],
            ] },
            { titulo: 'Etapas', cabecalho: ['Etapa', 'Orçado (R$)'],
              linhas: etps.map((e) => [e.nome || '', numBR(e.orcado)]) },
            { titulo: 'Lançamentos', cabecalho: ['Data', 'Etapa', 'Descrição', 'Pago por', 'Status', 'Valor (R$)', 'Nota fiscal'],
              linhas: lancs.map((l) => [
                dataBR(l.data), l.etapa || '', l.descricao || '',
                l.pagoPor === 'cliente' ? 'Cliente (direto)' : 'Escritório', l.status || '', numBR(l.valor),
                nfNome.has(l.id) ? nfNome.get(l.id).split('/').pop() : ((l.temRecibo || l.reciboNome) ? 'anexada' : '—'),
              ]) },
            { titulo: 'Pagamentos do cliente', cabecalho: ['Data', 'Forma', 'Valor (R$)', 'Observação'],
              linhas: pgs.map((p) => [dataBR(p.data), p.forma || '', numBR(p.valor), p.observacao || '']) },
          ];
          arquivos.push({ nome: `${pasta}/obra.xls`, dados: xls(secoesObra) });
        }

        // ---- Planilhas gerais na raiz do ZIP ----
        arquivos.push({ nome: 'clientes.xls', dados: xls([secaoTodosCampos('Clientes', clientes, ['nome', 'email', 'telefone', 'documento', 'cidade', 'endereco', 'observacoes'])]) });
        arquivos.push({ nome: 'fornecedores.xls', dados: xls([secaoTodosCampos('Fornecedores', fornecedores, ['nome', 'categoria', 'telefone', 'email', 'cnpj', 'endereco', 'observacoes'])]) });
        arquivos.push({ nome: 'pagamentos.xls', dados: xls([
          { titulo: 'Pagamentos do cliente (todas as obras)', cabecalho: ['Obra', 'Data', 'Forma', 'Valor (R$)', 'Observação'],
            linhas: [...pagamentos].sort((a, b) => String(b.data).localeCompare(String(a.data))).map((p) => [
              nomePorId[p.obraId] || '', dataBR(p.data), p.forma || '', numBR(p.valor), p.observacao || '',
            ]) },
        ]) });

        // ---- backup.json (técnico, para restauração) ----
        // Remove os binários pesados (base64) — eles já vão como arquivos no ZIP.
        const semBin = (obj, chaves) => { const c = { ...obj }; chaves.forEach((k) => delete c[k]); return c; };
        const backup = {
          geradoEm: new Date().toISOString(),
          versao: 1,
          obras: obrasArr,
          etapas: todasEtapas,
          lancamentos: todos.map((l) => semBin(l, ['reciboDataUrl', 'reciboUrl'])),
          pagamentos,
          clientes,
          fornecedores,
          fotos: todasFotos.map((f) => ({ ...semBin(f, ['dataUrl', 'thumbUrl', 'url']), arquivo: fNome.get(f.id) || null })),
        };
        arquivos.push({ nome: 'backup.json', dados: new TextEncoder().encode(JSON.stringify(backup, null, 2)) });

        // ---- Nome do ZIP com a data (dia-mês-ano) ----
        const hoje = new Date();
        const dd = String(hoje.getDate()).padStart(2, '0');
        const mm = String(hoje.getMonth() + 1).padStart(2, '0');
        const aaaa = hoje.getFullYear();
        baixarBlob(`backup-painel-obra-${dd}-${mm}-${aaaa}.zip`, criarZip(arquivos));
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
      percentualEscritorio: Number(container.querySelector('#o-percentual').value || 0),
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
