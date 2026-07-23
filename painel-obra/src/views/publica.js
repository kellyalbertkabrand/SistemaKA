import { configurado } from '../firebase.js';
import { obterObraPublicaPorSlug, listarEtapas, listarLancamentos, listarFotos, obterRecibo, obterFotoBin } from '../dados.js';
import { moeda, dataBR, pct, esc, pillStatus } from '../lib/format.js';
import { ordenarLancamentos, seletorOrdem } from '../lib/ordenar.js';
import { caixaLogo } from '../lib/marca.js';
import { abrirLightbox, abrirAnexo } from '../lib/lightbox.js';

// Página pública do cliente (só leitura), acessada por /obra/{slug}.
// Mostra o andamento da obra com visual limpo — e NADA interno.
export async function renderPublica(container, slug) {
  container.innerHTML = `<div class="publica"><p class="muted center">Carregando…</p></div>`;

  if (!configurado) {
    container.innerHTML = telaSimples('Indisponível', 'Configuração do sistema incompleta.');
    return;
  }

  let obra, etapas, lancamentos;
  let fotos = []; // as fotos (pesadas) carregam em segundo plano após o render
  try {
    obra = await comTimeout(obterObraPublicaPorSlug(slug));

    if (!obra) {
      container.innerHTML = telaSimples(
        'Obra não encontrada',
        'Este link não está disponível. Confira com o seu arquiteto.'
      );
      return;
    }

    [etapas, lancamentos] = await Promise.all([
      comTimeout(listarEtapas(obra.id)),
      comTimeout(listarLancamentos(obra.id)),
    ]);
    etapas = etapas || [];
    lancamentos = lancamentos || [];
  } catch (e) {
    container.innerHTML = telaSimples(
      'Não foi possível carregar',
      'Detalhe: ' + (e?.message || e)
    );
    return;
  }

  const soma = (arr) => arr.reduce((t, l) => t + Number(l.valor || 0), 0);
  const executado = soma(lancamentos);
  const pago = soma(lancamentos.filter((l) => l.status === 'pago'));
  const pendente = soma(lancamentos.filter((l) => l.status === 'pendente'));
  const saldo = Number(obra.orcamento || 0) - executado; // desconta pago + pendente
  const andamento = pct(executado, obra.orcamento);

  // Realizado por etapa
  const realizado = {};
  for (const l of lancamentos) {
    realizado[l.etapa] = (realizado[l.etapa] || 0) + Number(l.valor || 0);
  }
  const nomes = new Set(etapas.map((e) => e.nome));
  const extras = Object.keys(realizado).filter((n) => !nomes.has(n));

  document.title = `${obra.nome} — acompanhamento`;

  container.innerHTML = `
    <div class="publica">
      <header class="pub-logo-header">
        ${caixaLogo('caixa-logo-cliente')}
      </header>

      <section class="pub-hero">
        <p class="pub-marca">Acompanhamento de obra</p>
        <h1>${esc(obra.nome)}</h1>
        ${obra.cliente ? `<p class="pub-cliente">Cliente: ${esc(obra.cliente)}</p>` : ''}
      </section>

      <section class="pub-resumo">
        <div class="anel" style="--p:${Math.min(andamento, 100)}">
          <div class="anel-centro">
            <strong>${andamento}%</strong>
            <small>executado</small>
          </div>
        </div>
        <div class="pub-numeros">
          ${num('Orçamento', moeda(obra.orcamento), 'val-orcado')}
          ${num('Pago', moeda(pago), 'val-ok')}
          ${num('Pendente', moeda(pendente), 'val-pend')}
          ${num('Saldo disponível', moeda(saldo), saldo < 0 ? 'neg' : 'val-saldo')}
          <p class="pub-nota">O saldo já desconta o que está pago e o que está pendente.</p>
        </div>
      </section>

      <section class="pub-bloco">
        ${etapas.length === 0 && extras.length === 0
          ? `<h2>Por etapa</h2><p class="muted">As etapas aparecerão aqui conforme a obra avança.</p>`
          : `<div class="row-between">
              <h2>Por etapa</h2>
              <button class="btn-toggle" id="pub-toggle-etapas" aria-expanded="false">
                <span class="chev">▾</span><span class="tog-lbl">Ver etapas (${etapas.length + extras.length})</span>
              </button>
            </div>
            <div class="pub-etapas" id="pub-etapas" hidden>
              ${etapas.map((e) => barraEtapa(e.nome, Number(e.orcado || 0), realizado[e.nome] || 0)).join('')}
              ${extras.map((n) => barraEtapa(n, 0, realizado[n] || 0)).join('')}
            </div>`}
      </section>

      <section class="pub-bloco">
        <div class="row-between">
          <h2>Atualizações</h2>
          ${lancamentos.length ? seletorOrdem('pub-ord', 'data') : ''}
        </div>
        <div id="pub-lista">${listaTimeline(ordenarLancamentos(lancamentos, 'data'))}</div>
      </section>

      ${(obra.projetos && obra.projetos.length) ? `
      <section class="pub-bloco">
        <h2>Projeto da obra</h2>
        <ul class="proj-lista" id="pub-projetos">
          ${obra.projetos.map((p) => `
            <li class="proj-item">
              <span class="proj-nome">📐 ${esc(p.nome || 'Projeto')}</span>
              ${p.link
                ? `<a class="btn btn-mini" href="${esc(/^https?:\/\//i.test(p.link) ? p.link : 'https://' + p.link)}" target="_blank" rel="noopener">Abrir</a>`
                : `<button class="btn btn-mini" data-ver-projeto="${esc(p.id)}">Abrir</button>`}
            </li>`).join('')}
        </ul>
      </section>` : ''}

      <section class="pub-bloco" id="pub-fotos-sec" hidden>
        <h2>Fotos da obra</h2>
        <div id="pub-fotos"><p class="muted"><span class="spinner"></span> Carregando fotos…</p></div>
      </section>

      <footer class="pub-rodape">
        <p class="pub-rodape-nome">SCHRAMM ARQUITETURA E ENGENHARIA</p>
        <p class="muted">Rua Dr. Luiz Bastos do Prado, 2093 - 504 - Centro, Gravataí - RS, 94010-021</p>
        <p class="muted pub-rodape-nota">Atualizado em tempo real pelo escritório.</p>
      </footer>
    </div>`;

  // Fotos entram em segundo plano (são o dado mais pesado) — a página já abriu.
  comTimeout(listarFotos(obra.id)).then((fs) => {
    fotos = fs || [];
    const sec = container.querySelector('#pub-fotos-sec');
    const wrap = container.querySelector('#pub-fotos');
    if (sec && wrap && fotos.length) {
      wrap.innerHTML = blocosFotosPub(fotos);
      sec.hidden = false;
    }
  }).catch(() => {});

  // Abrir projeto anexado como arquivo (link abre direto pelo <a>).
  const pubProjetos = container.querySelector('#pub-projetos');
  if (pubProjetos) {
    pubProjetos.addEventListener('click', async (e) => {
      const b = e.target.closest('[data-ver-projeto]');
      if (!b) return;
      const p = (obra.projetos || []).find((x) => x.id === b.getAttribute('data-ver-projeto'));
      if (!p) return;
      let dado = p.dataUrl;                              // antigos: inline
      if (!dado && p.temArquivo) dado = await obterFotoBin(p.id); // novos: cofre
      if (dado) abrirAnexo(dado, p.arquivo || p.nome);
    });
  }

  // Expandir/recolher a lista "Por etapa".
  const pubToggleEtapas = container.querySelector('#pub-toggle-etapas');
  const pubEtapas = container.querySelector('#pub-etapas');
  if (pubToggleEtapas && pubEtapas) {
    pubToggleEtapas.addEventListener('click', () => {
      pubEtapas.hidden = !pubEtapas.hidden;
      const aberto = !pubEtapas.hidden;
      pubToggleEtapas.classList.toggle('aberto', aberto);
      pubToggleEtapas.setAttribute('aria-expanded', String(aberto));
      pubToggleEtapas.querySelector('.tog-lbl').textContent = aberto
        ? 'Ocultar etapas'
        : `Ver etapas (${etapas.length + extras.length})`;
    });
  }

  // Fotos da obra: abrir o carrossel ao clicar numa miniatura.
  const pubFotos = container.querySelector('#pub-fotos');
  if (pubFotos) {
    pubFotos.addEventListener('click', (e) => {
      const b = e.target.closest('[data-abrir-foto]');
      if (!b) return;
      const numero = numerarFotosPub(fotos);
      const itens = fotos.map((f) => ({
        thumb: f.thumbUrl || f.dataUrl || f.url,
        url: f.dataUrl || f.url || null,
        obterUrl: () => obterFotoBin(f.id),
        numero: numero.get(f.id),
        nome: f.nome,
        data: f.dataVisita ? dataBR(f.dataVisita)
          : (f.criadoEm ? dataBR(new Date(f.criadoEm).toISOString()) : ''),
        texto: f.texto,
      }));
      abrirLightbox(itens, Number(b.getAttribute('data-abrir-foto')) || 0);
    });
  }

  // Abrir a nota fiscal ao clicar no lançamento (delegação sobrevive ao reordenar).
  const pubLista = container.querySelector('#pub-lista');
  if (pubLista) {
    pubLista.addEventListener('click', async (e) => {
      const b = e.target.closest('[data-ver-nf]');
      if (!b) return;
      const l = lancamentos.find((x) => x.id === b.getAttribute('data-ver-nf'));
      if (!l) return;
      let dado = l.reciboDataUrl || l.reciboUrl;
      if (!dado) dado = (await obterRecibo(l.id))?.dataUrl;
      if (dado) abrirAnexo(dado, l.reciboNome);
    });
  }

  // Reordenar a lista de atualizações também no painel do cliente.
  const selPub = container.querySelector('#pub-ord');
  if (selPub) {
    selPub.addEventListener('change', () => {
      container.querySelector('#pub-lista').innerHTML = listaTimeline(
        ordenarLancamentos(lancamentos, selPub.value)
      );
    });
  }
}

function listaTimeline(lancamentos) {
  if (!lancamentos.length) return `<p class="muted">Ainda não há lançamentos.</p>`;
  return `<ul class="pub-timeline">
    ${lancamentos.map((l) => {
      const temNF = Boolean(l.reciboDataUrl || l.reciboUrl || l.temRecibo || l.reciboNome);
      return `
      <li>
        <div class="tl-topo">
          <span class="tl-etapa">${esc(l.etapa)}</span>
          <span class="tl-valor">${moeda(l.valor)}</span>
        </div>
        <div class="tl-base">
          <span>${esc(l.descricao || '')}${temNF ? ` <button class="nf-link" data-ver-nf="${esc(l.id)}">📎 Nota fiscal</button>` : ''}</span>
          <span class="tl-status">${dataBR(l.data)} ${pillStatus(l.status)}</span>
        </div>
      </li>`;
    }).join('')}
  </ul>`;
}

function barraEtapa(nome, orcado, realizado) {
  const p = orcado > 0 ? pct(realizado, orcado) : (realizado > 0 ? 100 : 0);
  const estouro = orcado > 0 && realizado > orcado;
  return `
    <div class="pub-etapa">
      <div class="row-between">
        <span>${esc(nome)}</span>
        <span class="muted">${moeda(realizado)}${orcado > 0 ? ' / ' + moeda(orcado) : ''}</span>
      </div>
      <div class="barra ${estouro ? 'estouro' : ''}"><span style="width:${Math.min(p, 100)}%"></span></div>
    </div>`;
}

function num(rotulo, valor, cls = '') {
  return `<div class="pub-num"><small>${rotulo}</small><strong class="${cls}">${valor}</strong></div>`;
}

// Data 'YYYY-MM-DD' -> 'dd/mm/aaaa' sem depender de fuso.
function fmtDataVisita(v) {
  if (!v) return '';
  const [a, m, d] = String(v).slice(0, 10).split('-');
  return d ? `${d}/${m}/${a}` : '';
}

// Fotos agrupadas em blocos por visita técnica (mesma leitura do painel interno,
// só que somente-leitura para o cliente). Mantém o índice original para o
// carrossel (data-abrir-foto).
// Numera as fotos na mesma ordem de exibição — o número bate com o do painel
// interno, então a cliente pode citar "a foto 5".
function numerarFotosPub(fotos) {
  const grupos = new Map();
  fotos.forEach((f) => {
    const chave = String(f.dataVisita || '').slice(0, 10)
      || (f.criadoEm ? new Date(f.criadoEm).toISOString().slice(0, 10) : 'sem-data');
    if (!grupos.has(chave)) grupos.set(chave, []);
    grupos.get(chave).push(f);
  });
  const chaves = [...grupos.keys()].sort((a, b) => String(b).localeCompare(String(a)));
  const mapa = new Map();
  let n = 0;
  for (const c of chaves) for (const f of grupos.get(c)) mapa.set(f.id, ++n);
  return mapa;
}

function blocosFotosPub(fotos) {
  const numero = numerarFotosPub(fotos);
  const grupos = new Map();
  fotos.forEach((f, idx) => {
    const chave = String(f.dataVisita || '').slice(0, 10)
      || (f.criadoEm ? new Date(f.criadoEm).toISOString().slice(0, 10) : 'sem-data');
    if (!grupos.has(chave)) grupos.set(chave, []);
    grupos.get(chave).push({ f, idx });
  });
  const chaves = [...grupos.keys()].sort((a, b) => String(b).localeCompare(String(a)));

  return chaves.map((chave) => {
    const itens = grupos.get(chave);
    const data = chave === 'sem-data' ? '' : fmtDataVisita(chave);
    const obsVisita = (itens.find((it) => it.f.texto) || {}).f?.texto || '';
    return `
    <div class="visita-bloco">
      <div class="visita-cab">
        <h3 class="visita-titulo">Visita técnica${data ? ` <span class="visita-data">${data}</span>` : ''}</h3>
      </div>
      ${obsVisita ? `<p class="visita-obs">${esc(obsVisita)}</p>` : ''}
      <div class="fotos-grid">
        ${itens.map(({ f, idx }) => `
        <figure class="foto-item">
          <button class="foto-thumb" data-abrir-foto="${idx}" title="Ampliar">
            <span class="foto-num">${numero.get(f.id)}</span>
            <img src="${esc(f.thumbUrl || f.dataUrl || f.url)}" alt="Foto da obra" loading="lazy" />
            <span class="foto-zoom">⤢</span>
          </button>
          ${f.legenda ? `<figcaption><p class="foto-texto">${esc(f.legenda)}</p></figcaption>` : ''}
        </figure>`).join('')}
      </div>
    </div>`;
  }).join('');
}

// Corre a consulta do Firebase contra um tempo-limite, para a página nunca
// ficar presa em "Carregando…". Se estourar, cai no catch e mostra a mensagem.
function comTimeout(promise, ms = 12000) {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error('tempo esgotado ao falar com o banco')), ms)
    ),
  ]);
}

function telaSimples(titulo, texto) {
  return `
    <div class="publica">
      <div class="pub-vazio">
        <h1>${esc(titulo)}</h1>
        <p class="muted">${esc(texto)}</p>
      </div>
    </div>`;
}
