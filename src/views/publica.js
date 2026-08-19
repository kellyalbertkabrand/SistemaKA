import { configurado } from '../firebase.js';
import { obterObraPublicaPorSlug, listarEtapas, listarLancamentos, listarPagamentos, listarFotos, obterRecibo, obterFotoBin, aoMudarAuth } from '../dados.js';
import { moeda, dataBR, pct, esc, pillStatus } from '../lib/format.js';
import { ordenarLancamentos, seletorOrdem } from '../lib/ordenar.js';
import { calcularReembolso } from '../lib/reembolso.js';
import { caixaLogo } from '../lib/marca.js';
import { abrirLightbox, abrirAnexo } from '../lib/lightbox.js';
import { criarZip } from '../lib/zip.js';
import { baixarBlob } from '../lib/exportar.js';
import { dataURLParaBytes } from '../lib/imagem.js';
import { normalizarPlano, somaPagas, somaPlano } from '../lib/parcelas.js';

// Página pública do cliente (só leitura), acessada por /obra/{slug}.
// Mostra o andamento da obra com visual limpo — e NADA interno.
export async function renderPublica(container, slug) {
  container.innerHTML = `<div class="publica"><p class="muted center">Carregando…</p></div>`;

  if (!configurado) {
    container.innerHTML = telaSimples('Indisponível', 'Configuração do sistema incompleta.');
    return;
  }

  let obra, etapas, lancamentos, pagamentos;
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

    [etapas, lancamentos, pagamentos] = await Promise.all([
      comTimeout(listarEtapas(obra.id)),
      comTimeout(listarLancamentos(obra.id)),
      comTimeout(listarPagamentos(obra.id)).catch(() => []),
    ]);
    etapas = etapas || [];
    lancamentos = lancamentos || [];
    pagamentos = pagamentos || [];
  } catch (e) {
    container.innerHTML = telaSimples(
      'Não foi possível carregar',
      'Detalhe: ' + (e?.message || e)
    );
    return;
  }

  const soma = (arr) => arr.reduce((t, l) => t + Number(l.valor || 0), 0);
  const executado = soma(lancamentos);
  const andamento = pct(executado, obra.orcamento);

  // Tipo de serviço: com gestão de obra = painel completo (padrão);
  // sem gestão = só projeto (painel reduzido). Obras antigas não têm o campo.
  const comGestao = obra.gestao !== false;

  // Valores no modelo "escritório adianta / cliente reembolsa + honorário".
  // pago/pendente aqui são só dos itens pagos pelo escritório (reembolsáveis);
  // o que o cliente pagou direto não entra no total a pagar ao escritório.
  const r = calcularReembolso(lancamentos, obra);
  // Sem gestão (só projeto): plano de parcelas (data, forma, status pago).
  const planoParcelas = comGestao ? null : normalizarPlano(obra).plano;
  // Com gestão: recebido = pagamentos avulsos. Sem gestão: soma das parcelas pagas.
  const recebido = comGestao ? soma(pagamentos) : somaPagas(planoParcelas);
  // Com gestão: o cliente deve o reembolso + honorário (calcularReembolso).
  // Sem gestão (só projeto): o cliente deve a SOMA das parcelas do projeto
  // (assim um serviço a mais, numa nova parcela, já entra no total).
  const totalDevido = comGestao
    ? r.totalEscritorio
    : (planoParcelas && planoParcelas.length ? somaPlano(planoParcelas) : Number(obra.orcamento || 0));
  const saldoCliente = totalDevido - recebido;
  const parcelasProjeto = comGestao
    ? Math.max(1, Number(obra.parcelas || 1))
    : Math.max(1, (planoParcelas && planoParcelas.length) || 1); // 1 = à vista
  // As parcelas podem ter valores diferentes (ex.: um serviço a mais). Só
  // mostramos "Nx de R$Y" quando são todas iguais; senão, só "N parcelas".
  const parcelasIguais = Boolean(planoParcelas && planoParcelas.length > 1
    && planoParcelas.every((p) => Math.round(Number(p.valor || 0) * 100) === Math.round(Number(planoParcelas[0].valor || 0) * 100)));
  // Sem gestão: só mostramos a nota e a lista de parcelas quando há valor
  // definido (ou algo já recebido). Sem valor, nada de texto sobre pagamento.
  const temPagamentoProjeto = totalDevido > 0.005 || recebido > 0.005;

  // Realizado por etapa
  const realizado = {};
  for (const l of lancamentos) {
    realizado[l.etapa] = (realizado[l.etapa] || 0) + Number(l.valor || 0);
  }
  const nomes = new Set(etapas.map((e) => e.nome));
  const extras = Object.keys(realizado).filter((n) => !nomes.has(n));

  document.title = `${obra.nome} — acompanhamento`;

  // Títulos das seções conforme o tipo de serviço (comGestao definido acima).
  const tituloPagamento = comGestao ? 'Controle de pagamentos' : 'Controle de pagamento do projeto';
  const tituloFotos = comGestao ? 'Fotos da obra' : 'Imagens das visitas técnicas';
  const tituloProjeto = comGestao ? 'Projeto da obra' : 'Arquivos do projeto';

  // Seções de fotos e de arquivos do projeto: montadas em variáveis para poder
  // ordená-las conforme o tipo de serviço. No painel reduzido (sem gestão) a
  // ordem pedida é Imagens → Arquivos; no completo mantém-se Projeto → Fotos.
  const secFotos = `
      <section class="pub-bloco pub-bloco-fotos" id="pub-fotos-sec" hidden>
        <div class="pub-bloco-cab">
          ${tituloSecao('📷', tituloFotos)}
          <button class="btn btn-mini" id="pub-baixar-todas" title="Baixar todas as fotos num único ZIP" hidden>⬇ Baixar todas</button>
        </div>
        <div id="pub-fotos"><p class="muted"><span class="spinner"></span> Carregando fotos…</p></div>
      </section>`;

  const secProjeto = (obra.projetos && obra.projetos.length) ? `
      <section class="pub-bloco pub-bloco-projeto">
        <div class="pub-bloco-cab">
          ${tituloSecao('📐', tituloProjeto)}
          ${(obra.projetos.some((p) => !p.link && (p.dataUrl || p.temArquivo)))
            ? `<button class="btn btn-mini" id="pub-baixar-projetos" title="Baixar os arquivos do projeto num único ZIP">⬇ Baixar arquivos</button>`
            : ''}
        </div>
        <ul class="proj-lista" id="pub-projetos">
          ${obra.projetos.map((p) => {
            const ext = (p.arquivo && p.arquivo.includes('.')) ? p.arquivo.split('.').pop().toLowerCase() : '';
            const thumbSrc = p.thumbUrl || (p.dataUrl && /^data:image\//i.test(p.dataUrl) ? p.dataUrl : '');
            const visual = thumbSrc
              ? `<button class="proj-thumb" data-ver-projeto="${esc(p.id)}" title="Ver imagem"><img src="${esc(thumbSrc)}" alt="${esc(p.nome || 'projeto')}" loading="lazy" /></button>`
              : `<span class="proj-ico">${p.link ? '🔗' : (ext === 'pdf' ? '📄' : '📐')}</span>`;
            return `
            <li class="proj-item">
              <span class="proj-info">
                ${visual}
                <span class="proj-nome">${esc(p.nome || 'Projeto')}</span>
              </span>
              ${p.link
                ? `<a class="btn btn-mini" href="${esc(/^https?:\/\//i.test(p.link) ? p.link : 'https://' + p.link)}" target="_blank" rel="noopener">Abrir ↗</a>`
                : `<button class="btn btn-mini" data-ver-projeto="${esc(p.id)}">Abrir</button>`}
            </li>`;
          }).join('')}
        </ul>
      </section>` : '';

  container.innerHTML = `
    <div class="publica">
      <header class="pub-logo-header">
        ${caixaLogo('caixa-logo-cliente')}
      </header>

      <section class="pub-hero">
        <p class="pub-marca">${comGestao ? 'Acompanhamento de obra' : 'Acompanhamento do projeto'}</p>
        <h1>${esc(obra.nome)}</h1>
        ${obra.cliente ? `<p class="pub-cliente">Cliente: ${esc(obra.cliente)}</p>` : ''}
      </section>

      ${comGestao ? `
      <section class="pub-resumo">
        <div class="anel" style="--p:${Math.min(andamento, 100)}">
          <div class="anel-centro">
            <strong>${andamento}%</strong>
            <small>executado</small>
          </div>
        </div>
        <div class="pub-numeros">
          ${num('Orçamento', moeda(obra.orcamento), 'val-orcado')}
          ${num('Saldo em aberto', moeda(saldoCliente), saldoCliente > 0.005 ? 'neg' : 'val-saldo')}
          <p class="pub-nota">Detalhes no <strong>controle de pagamentos</strong> abaixo.</p>
        </div>
      </section>` : ''}

      <section class="pub-bloco">
        ${tituloSecao('💳', tituloPagamento)}
        <div class="pub-numeros pub-numeros-3">
          ${num(comGestao ? 'Total a pagar ao escritório' : 'Valor do projeto', moeda(totalDevido))}
          ${num('Já pago por você', moeda(recebido), 'val-ok')}
          ${num('Saldo em aberto', moeda(saldoCliente), saldoCliente > 0.005 ? 'neg' : 'val-saldo')}
        </div>
        ${comGestao
          ? `<p class="pub-nota">O total é o reembolso dos fornecedores${r.pctEsc > 0 ? ` + o honorário de gestão (${r.pctFmt}%)` : ''}. O saldo já desconta o que você pagou.</p>`
          : (temPagamentoProjeto
            ? `<p class="pub-nota">${parcelasProjeto > 1 ? `Combinado em <strong>${parcelasIguais ? `${parcelasProjeto}x de ${moeda(totalDevido / parcelasProjeto)}` : `${parcelasProjeto} parcelas`}</strong>. ` : '<strong>Pagamento à vista.</strong> '}O saldo já desconta as parcelas que você pagou.</p>`
            : '')}
        ${comGestao
          ? (pagamentos.length ? `
          <ul class="pub-timeline">
            ${pagamentos.map((p) => `
              <li>
                <div class="tl-topo">
                  <span class="tl-etapa">${esc(p.forma || 'Pagamento')}</span>
                  <span class="tl-valor">${moeda(p.valor)}</span>
                </div>
                <div class="tl-base">
                  <span>${esc(p.observacao || '')}</span>
                  <span class="tl-status">${dataBR(p.data)}</span>
                </div>
              </li>`).join('')}
          </ul>` : `<p class="muted">Nenhum pagamento registrado ainda.</p>`)
          : (temPagamentoProjeto ? `
          <ul class="pub-timeline">
            ${planoParcelas.map((p) => `
              <li>
                <div class="tl-topo">
                  <span class="tl-etapa">Parcela ${p.n} de ${planoParcelas.length}</span>
                  <span class="tl-valor">${moeda(p.valor)}</span>
                </div>
                <div class="tl-base">
                  <span>${p.data ? dataBR(p.data) : ''}${p.forma ? ' · ' + esc(p.forma) : ''}</span>
                  <span class="tl-status">${p.pago
                    ? '<span class="pill pill-pago"><span class="dot"></span>pago</span>'
                    : '<span class="pill">em aberto</span>'}</span>
                </div>
              </li>`).join('')}
          </ul>` : '')}
      </section>

      ${comGestao ? `
      <section class="pub-bloco pub-bloco-fases">
        ${etapas.length === 0 && extras.length === 0
          ? `${tituloSecao('🏗️', 'Fases da obra')}<p class="muted">As fases aparecerão aqui conforme a obra avança.</p>`
          : `<div class="pub-bloco-cab">
              ${tituloSecao('🏗️', 'Fases da obra')}
              <button class="btn-toggle" id="pub-toggle-etapas" aria-expanded="false">
                <span class="chev">▾</span><span class="tog-lbl">Ver fases (${etapas.length + extras.length})</span>
              </button>
            </div>
            <div class="pub-etapas" id="pub-etapas" hidden>
              ${etapas.map((e) => barraEtapa(e.nome, Number(e.orcado || 0), realizado[e.nome] || 0)).join('')}
              ${extras.map((n) => barraEtapa(n, 0, realizado[n] || 0)).join('')}
            </div>`}
      </section>

      <section class="pub-bloco pub-bloco-updates">
        <div class="pub-bloco-cab">
          ${tituloSecao('📋', 'Atualizações')}
          ${lancamentos.length ? seletorOrdem('pub-ord', 'data') : ''}
        </div>
        <div id="pub-lista">${listaTimeline(ordenarLancamentos(lancamentos, 'data'))}</div>
      </section>` : ''}

      ${comGestao ? secProjeto + secFotos : secFotos + secProjeto}

      <a class="btn btn-ghost pub-voltar-arq" id="voltar-arq" data-link href="/painel/${esc(obra.slug)}" hidden>← Voltar ao painel do arquiteto</a>

      <footer class="pub-rodape">
        <p class="pub-rodape-nome">SCHRAMM ARQUITETURA E ENGENHARIA</p>
        <p class="muted">Rua Dr. Luiz Bastos do Prado, 2093 - 504 - Centro, Gravataí - RS, 94010-021</p>
        <p class="muted pub-rodape-nota">Atualizado em tempo real pelo escritório.</p>
      </footer>
    </div>`;

  // Só a arquiteta (logada) vê o atalho de voltar — o cliente nunca vê. A auth
  // resolve de forma assíncrona, então revelamos quando ela confirmar.
  aoMudarAuth((usuario) => {
    const v = container.querySelector('#voltar-arq');
    if (v) v.hidden = !usuario;
  });

  // Fotos entram em segundo plano (são o dado mais pesado) — a página já abriu.
  comTimeout(listarFotos(obra.id)).then((fs) => {
    fotos = fs || [];
    const sec = container.querySelector('#pub-fotos-sec');
    const wrap = container.querySelector('#pub-fotos');
    if (sec && wrap && fotos.length) {
      wrap.innerHTML = blocosFotosPub(fotos);
      sec.hidden = false;
      const btnTodas = container.querySelector('#pub-baixar-todas');
      if (btnTodas) btnTodas.hidden = false;
    }
  }).catch(() => {});

  // Baixar TODAS as fotos (todas as visitas) num único ZIP.
  const btnBaixarTodas = container.querySelector('#pub-baixar-todas');
  if (btnBaixarTodas) {
    btnBaixarTodas.addEventListener('click', () => {
      baixarFotosZip(btnBaixarTodas, fotos, `fotos-${obra.slug}`);
    });
  }

  // Baixar os arquivos do projeto (plantas/PDFs) — só os que são arquivo, não link.
  const btnBaixarProjetos = container.querySelector('#pub-baixar-projetos');
  if (btnBaixarProjetos) {
    btnBaixarProjetos.addEventListener('click', () => {
      baixarProjetosZip(btnBaixarProjetos, obra.projetos || [], `projeto-${obra.slug}`);
    });
  }

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
        ? 'Ocultar fases'
        : `Ver fases (${etapas.length + extras.length})`;
    });
  }

  // Fotos da obra: abrir o carrossel ao clicar numa miniatura.
  const pubFotos = container.querySelector('#pub-fotos');
  if (pubFotos) {
    pubFotos.addEventListener('click', (e) => {
      // Baixar as fotos de uma visita específica.
      const bx = e.target.closest('[data-baixar-visita]');
      if (bx) {
        const chave = bx.getAttribute('data-baixar-visita');
        const daVisita = fotos.filter((f) => chaveVisitaPub(f) === chave);
        const rotulo = chave && chave !== 'sem-data' ? fmtDataVisita(chave).replace(/\//g, '-') : 'sem-data';
        baixarFotosZip(bx, daVisita, `fotos-visita-${rotulo}-${obra.slug}`);
        return;
      }
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
          <span class="tl-status">${dataBR(l.data)} ${l.pagoPor === 'cliente'
            ? '<span class="pill pill-pago"><span class="dot"></span>pago por você</span>'
            : pillStatus(l.status)}</span>
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

// Cabeçalho padrão de cada seção: um ícone em "caixinha" + o título. Deixa cada
// bloco visualmente distinto (bate o olho e vê que é outra coisa).
function tituloSecao(icone, texto) {
  return `<h2 class="pub-sec-titulo"><span class="pub-sec-ico">${icone}</span>${esc(texto)}</h2>`;
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
// Chave do grupo (data da visita, ou data de criação, ou 'sem-data').
function chaveVisitaPub(f) {
  return String(f.dataVisita || '').slice(0, 10)
    || (f.criadoEm ? new Date(f.criadoEm).toISOString().slice(0, 10) : 'sem-data');
}

function numerarFotosPub(fotos) {
  const grupos = new Map();
  fotos.forEach((f) => {
    const chave = chaveVisitaPub(f);
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
    const chave = chaveVisitaPub(f);
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
        <button class="btn btn-mini" data-baixar-visita="${esc(chave)}" title="Baixar as fotos desta visita num ZIP">⬇ Baixar fotos</button>
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

// Nome de arquivo seguro (sem acento nem caractere estranho), preservando ponto
// da extensão. Usado para nomear as fotos/arquivos dentro do ZIP.
function nomeSegPub(s, padrao = 'arquivo') {
  const limpo = String(s || '')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^\w.\- ]+/g, '').trim().replace(/\s+/g, '-').slice(0, 60);
  return limpo || padrao;
}

// Baixa uma lista de fotos como um único ZIP (mesmo mecanismo do painel interno).
// As imagens já são JPEG; o ZIP usa método "store" (sem recomprimir).
async function baixarFotosZip(botao, lista, nomeBase) {
  const rotulo = botao ? botao.textContent : '';
  if (botao) { botao.disabled = true; botao.textContent = 'Preparando…'; }
  try {
    const arquivos = [];
    let n = 0;
    for (const f of lista) {
      let dado = f.dataUrl || f.url;
      if (!dado) dado = await obterFotoBin(f.id);
      if (dado && String(dado).startsWith('data:')) {
        n++;
        const d = f.dataVisita
          || (f.criadoEm ? new Date(f.criadoEm).toISOString().slice(0, 10) : '')
          || 'foto';
        arquivos.push({ nome: `${String(n).padStart(2, '0')}-${nomeSegPub(d, 'foto')}.jpg`, dados: dataURLParaBytes(dado) });
      }
    }
    if (!arquivos.length) { alert('Não há fotos disponíveis para baixar.'); return; }
    baixarBlob(`${nomeSegPub(nomeBase, 'fotos')}.zip`, criarZip(arquivos));
  } catch (err) {
    alert('Não foi possível baixar as fotos: ' + (err?.message || err));
  } finally {
    if (botao) { botao.disabled = false; botao.textContent = rotulo; }
  }
}

// Baixa os arquivos do projeto (plantas/PDFs) como um único ZIP. Ignora os itens
// que são apenas link (esses o cliente abre direto).
async function baixarProjetosZip(botao, projetos, nomeBase) {
  const rotulo = botao ? botao.textContent : '';
  if (botao) { botao.disabled = true; botao.textContent = 'Preparando…'; }
  try {
    const arquivos = [];
    let n = 0;
    for (const p of projetos) {
      if (p.link) continue;
      let dado = p.dataUrl;
      if (!dado && p.temArquivo) dado = await obterFotoBin(p.id);
      if (dado && String(dado).startsWith('data:')) {
        n++;
        const base = nomeSegPub(p.arquivo || p.nome || 'projeto', 'projeto');
        const nome = /\.[a-z0-9]{1,6}$/i.test(base) ? base : base + '.dat';
        arquivos.push({ nome: `${String(n).padStart(2, '0')}-${nome}`, dados: dataURLParaBytes(dado) });
      }
    }
    if (!arquivos.length) { alert('Não há arquivos de projeto para baixar.'); return; }
    baixarBlob(`${nomeSegPub(nomeBase, 'projeto')}.zip`, criarZip(arquivos));
  } catch (err) {
    alert('Não foi possível baixar os arquivos: ' + (err?.message || err));
  } finally {
    if (botao) { botao.disabled = false; botao.textContent = rotulo; }
  }
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
