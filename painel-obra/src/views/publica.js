import { supabase } from '../supabaseClient.js';
import { moeda, dataBR, pct, esc, pillStatus } from '../lib/format.js';
import { ordenarLancamentos, seletorOrdem } from '../lib/ordenar.js';
import { marcaSchramm } from '../lib/marca.js';

// Página pública do cliente (só leitura), acessada por /obra/{slug}.
// Mostra o andamento da obra com visual limpo — e NADA interno.
export async function renderPublica(container, slug) {
  container.innerHTML = `<div class="publica"><p class="muted center">Carregando…</p></div>`;

  if (!supabase) {
    container.innerHTML = telaSimples('Indisponível', 'Configuração do sistema incompleta.');
    return;
  }

  let obra, etapas, lancamentos;
  try {
    const obraRes = await comTimeout(
      supabase
        .from('obras')
        .select('id, nome, cliente, orcamento, slug, publicado')
        .eq('slug', slug)
        .eq('publicado', true)
        .maybeSingle(),
    );

    if (obraRes.error) throw obraRes.error;
    obra = obraRes.data;

    if (!obra) {
      container.innerHTML = telaSimples(
        'Obra não encontrada',
        'Este link não está disponível. Confira com o seu arquiteto.'
      );
      return;
    }

    const [etapasRes, lancRes] = await Promise.all([
      comTimeout(supabase.from('etapas').select('*').eq('obra_id', obra.id).order('created_at')),
      comTimeout(supabase.from('lancamentos').select('*').eq('obra_id', obra.id).order('data', { ascending: false })),
    ]);
    etapas = etapasRes.data || [];
    lancamentos = lancRes.data || [];
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
      <header class="pub-hero">
        ${marcaSchramm()}
        <p class="pub-marca">Acompanhamento de obra</p>
        <h1>${esc(obra.nome)}</h1>
        ${obra.cliente ? `<p class="pub-cliente">${esc(obra.cliente)}</p>` : ''}
        <p class="pub-tagline">Acompanhe sua obra com clareza, do alicerce ao acabamento.</p>
      </header>

      <section class="pub-resumo">
        <div class="anel" style="--p:${Math.min(andamento, 100)}">
          <div class="anel-centro">
            <strong>${andamento}%</strong>
            <small>executado</small>
          </div>
        </div>
        <div class="pub-numeros">
          ${num('Orçamento', moeda(obra.orcamento))}
          ${num('Pago', moeda(pago), 'val-ok')}
          ${num('Pendente', moeda(pendente), 'val-pend')}
          ${num('Saldo disponível', moeda(saldo), saldo < 0 ? 'neg' : '')}
          <p class="pub-nota">O saldo já desconta o que está pago e o que está pendente.</p>
        </div>
      </section>

      <section class="pub-bloco">
        <h2>Por etapa</h2>
        ${etapas.length === 0 && extras.length === 0
          ? `<p class="muted">As etapas aparecerão aqui conforme a obra avança.</p>`
          : `<div class="pub-etapas">
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

      <footer class="pub-rodape">
        <p class="muted">Atualizado em tempo real pelo seu arquiteto.</p>
      </footer>
    </div>`;

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
    ${lancamentos.map((l) => `
      <li>
        <div class="tl-topo">
          <span class="tl-etapa">${esc(l.etapa)}</span>
          <span class="tl-valor">${moeda(l.valor)}</span>
        </div>
        <div class="tl-base">
          <span>${esc(l.descricao || '')}</span>
          <span class="tl-status">${dataBR(l.data)} ${pillStatus(l.status)}</span>
        </div>
      </li>`).join('')}
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

// Corre a consulta do Supabase contra um tempo-limite, para a página nunca
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
