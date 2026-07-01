import { supabase } from '../supabaseClient.js';
import { navegar } from '../main.js';
import { moeda, dataBR, pct, esc, pillStatus } from '../lib/format.js';
import { reconhecimentoDisponivel, ouvir, parar } from '../lib/voice.js';
import { ordenarLancamentos, seletorOrdem } from '../lib/ordenar.js';

// Detalhe interno de uma obra: KPIs, lançamento por voz/IA, etapas e lançamentos.
export async function renderObra(container, obraId) {
  container.innerHTML = `<div class="app"><p class="muted center">Carregando…</p></div>`;

  const [obraRes, etapasRes, lancRes] = await Promise.all([
    supabase.from('obras').select('*').eq('id', obraId).single(),
    supabase.from('etapas').select('*').eq('obra_id', obraId).order('created_at'),
    supabase.from('lancamentos').select('*').eq('obra_id', obraId).order('data', { ascending: false }),
  ]);

  if (obraRes.error || !obraRes.data) {
    container.innerHTML = `
      <div class="app">
        <a class="btn btn-ghost" data-link href="/">← Voltar</a>
        <p class="erro" style="display:block">Obra não encontrada.</p>
      </div>`;
    return;
  }

  const obra = obraRes.data;
  const etapas = etapasRes.data || [];
  const lancamentos = lancRes.data || [];

  const executado = soma(lancamentos);
  const pago = soma(lancamentos.filter((l) => l.status === 'pago'));
  const pendente = soma(lancamentos.filter((l) => l.status === 'pendente'));
  const saldo = Number(obra.orcamento || 0) - executado;

  const linkPublico = `${window.location.origin}/obra/${obra.slug}`;

  container.innerHTML = `
    <div class="app">
      <header class="topo">
        <div>
          <a class="voltar" data-link href="/">← Obras</a>
          <h1>${esc(obra.nome)}</h1>
          <p class="muted">${esc(obra.cliente || 'Sem cliente definido')}</p>
        </div>
        <button class="btn btn-ghost" id="sair">Sair</button>
      </header>

      <section class="kpis">
        ${kpi('Orçado', moeda(obra.orcamento))}
        ${kpi('Executado', moeda(executado))}
        ${kpi('Saldo', moeda(saldo), saldo < 0 ? 'neg' : '')}
        ${kpi('Pago', moeda(pago))}
        ${kpi('Pendente', moeda(pendente))}
      </section>

      <section class="card link-cliente">
        <div class="row-between">
          <div>
            <strong>Link do cliente</strong>
            <p class="muted mono">${esc(linkPublico)}</p>
          </div>
          <div class="row-end">
            <label class="switch">
              <input type="checkbox" id="toggle-pub" ${obra.publicado ? 'checked' : ''} />
              <span>Publicado</span>
            </label>
            <button class="btn btn-mini" id="copiar-link">Copiar</button>
            <a class="btn btn-mini" href="/obra/${esc(obra.slug)}" target="_blank" rel="noopener">Abrir</a>
          </div>
        </div>
      </section>

      <section class="card lancar">
        <h2>Lançar custo</h2>
        <p class="muted">Fale ou escreva — a IA organiza etapa, valor e status.</p>
        <div class="lancar-controles">
          <button class="btn btn-mic" id="btn-mic">🎤 Falar</button>
          <input id="texto-livre" class="texto-livre"
            placeholder='Ex.: "material elétrico, três mil e quinhentos, pago no Pix"' />
          <button class="btn btn-primary" id="btn-interpretar">Interpretar</button>
        </div>
        <p class="status-voz" id="status-voz" hidden></p>
        <div id="preview"></div>
      </section>

      <section class="card">
        <div class="row-between">
          <h2>Etapas</h2>
          <button class="btn btn-mini" id="add-etapa">+ etapa</button>
        </div>
        <form id="form-etapa" class="form-inline" hidden>
          <input id="e-nome" placeholder="Nome da etapa" />
          <input id="e-orcado" type="number" min="0" step="0.01" placeholder="Orçado R$" />
          <button class="btn btn-mini btn-primary" type="submit">Salvar</button>
        </form>
        <div id="tabela-etapas">${tabelaEtapas(etapas, lancamentos)}</div>
      </section>

      <section class="card">
        <div class="row-between">
          <h2>Lançamentos</h2>
          ${lancamentos.length ? seletorOrdem('ord-lanc', 'data') : ''}
        </div>
        <div id="tabela-lancamentos">${tabelaLancamentos(ordenarLancamentos(lancamentos, 'data'))}</div>
      </section>
    </div>`;

  // Recarrega a tela inteira (após salvar/excluir algo).
  const recarregar = () => renderObra(container, obraId);

  container.querySelector('#sair').addEventListener('click', async () => {
    await supabase.auth.signOut();
  });

  // ---- Link do cliente ----
  container.querySelector('#copiar-link').addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(linkPublico);
      flash(container.querySelector('#copiar-link'), 'Copiado!');
    } catch {
      flash(container.querySelector('#copiar-link'), 'Copie manualmente');
    }
  });
  container.querySelector('#toggle-pub').addEventListener('change', async (e) => {
    await supabase.from('obras').update({ publicado: e.target.checked }).eq('id', obra.id);
  });

  // ---- Lançamento por voz / texto / IA ----
  configurarLancamento(container, obra, etapas, recarregar);

  // ---- Etapas ----
  const addEtapaBtn = container.querySelector('#add-etapa');
  const formEtapa = container.querySelector('#form-etapa');
  addEtapaBtn.addEventListener('click', () => {
    formEtapa.hidden = !formEtapa.hidden;
    if (!formEtapa.hidden) container.querySelector('#e-nome').focus();
  });
  formEtapa.addEventListener('submit', async (e) => {
    e.preventDefault();
    const nome = container.querySelector('#e-nome').value.trim();
    const orcado = Number(container.querySelector('#e-orcado').value || 0);
    if (!nome) return;
    await supabase.from('etapas').insert({ obra_id: obra.id, nome, orcado });
    recarregar();
  });
  container.querySelectorAll('[data-del-etapa]').forEach((b) => {
    b.addEventListener('click', async () => {
      await supabase.from('etapas').delete().eq('id', b.getAttribute('data-del-etapa'));
      recarregar();
    });
  });

  // ---- Lançamentos: ordenar + excluir ----
  const tabelaLancEl = container.querySelector('#tabela-lancamentos');
  const selOrd = container.querySelector('#ord-lanc');
  if (selOrd) {
    selOrd.addEventListener('change', () => {
      tabelaLancEl.innerHTML = tabelaLancamentos(ordenarLancamentos(lancamentos, selOrd.value));
    });
  }
  // Delegação: sobrevive à re-renderização da tabela ao reordenar.
  tabelaLancEl.addEventListener('click', async (e) => {
    const b = e.target.closest('[data-del-lanc]');
    if (!b) return;
    await supabase.from('lancamentos').delete().eq('id', b.getAttribute('data-del-lanc'));
    recarregar();
  });
}

// ---------------------------------------------------------------------------
// Lançamento (voz + IA)
// ---------------------------------------------------------------------------
function configurarLancamento(container, obra, etapas, recarregar) {
  const btnMic = container.querySelector('#btn-mic');
  const inputTexto = container.querySelector('#texto-livre');
  const btnInterpretar = container.querySelector('#btn-interpretar');
  const statusVoz = container.querySelector('#status-voz');
  const preview = container.querySelector('#preview');

  if (!reconhecimentoDisponivel()) {
    btnMic.disabled = true;
    btnMic.title = 'Seu navegador não suporta voz — use o campo de texto.';
  }

  const setStatus = (msg, tipo = '') => {
    if (!msg) { statusVoz.hidden = true; return; }
    statusVoz.hidden = false;
    statusVoz.textContent = msg;
    statusVoz.className = `status-voz ${tipo}`;
  };

  // Manda o texto para a IA (Netlify Function) e mostra o preview editável.
  async function interpretar(texto) {
    if (!texto || !texto.trim()) return;
    preview.innerHTML = '';
    setStatus('Organizando com a IA…');
    btnInterpretar.disabled = true;

    try {
      const resp = await fetch('/.netlify/functions/interpretar-lancamento', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ texto, etapas: etapas.map((e) => e.nome) }),
      });
      const dados = await resp.json();
      btnInterpretar.disabled = false;

      if (!resp.ok || !dados.ok) {
        setStatus('Não consegui interpretar agora. Confira a chave da IA ou tente de novo.', 'erro');
        return;
      }
      setStatus('');
      mostrarPreview(dados.lancamento);
    } catch {
      btnInterpretar.disabled = false;
      setStatus('Falha de conexão com a IA.', 'erro');
    }
  }

  function mostrarPreview(l) {
    preview.innerHTML = `
      <div class="preview-card">
        <p class="muted">Confira e ajuste antes de salvar:</p>
        <div class="form-grid">
          <label>Etapa<input id="p-etapa" value="${esc(l.etapa || '')}" /></label>
          <label>Descrição<input id="p-descricao" value="${esc(l.descricao || '')}" /></label>
          <label>Valor (R$)<input id="p-valor" type="number" min="0" step="0.01" value="${Number(l.valor || 0)}" /></label>
          <label>Status
            <select id="p-status">
              <option value="pago" ${l.status === 'pago' ? 'selected' : ''}>Pago</option>
              <option value="pendente" ${l.status === 'pendente' ? 'selected' : ''}>Pendente</option>
            </select>
          </label>
        </div>
        <div class="row-end">
          <button class="btn btn-ghost" id="p-cancelar">Descartar</button>
          <button class="btn btn-primary" id="p-salvar">Salvar lançamento</button>
        </div>
      </div>`;

    preview.querySelector('#p-cancelar').addEventListener('click', () => {
      preview.innerHTML = '';
    });
    preview.querySelector('#p-salvar').addEventListener('click', async () => {
      const novo = {
        obra_id: obra.id,
        etapa: preview.querySelector('#p-etapa').value.trim() || 'Geral',
        descricao: preview.querySelector('#p-descricao').value.trim() || null,
        valor: Number(preview.querySelector('#p-valor').value || 0),
        status: preview.querySelector('#p-status').value,
      };
      const btn = preview.querySelector('#p-salvar');
      btn.disabled = true; btn.textContent = 'Salvando…';
      const { error } = await supabase.from('lancamentos').insert(novo);
      if (error) {
        btn.disabled = false; btn.textContent = 'Salvar lançamento';
        setStatus(error.message, 'erro');
        return;
      }
      recarregar();
    });
  }

  // Botão de microfone — grava continuamente até clicar em "Parar".
  let rec = null;

  const resetMic = () => {
    rec = null;
    btnMic.classList.remove('gravando');
    btnMic.textContent = '🎤 Falar';
  };

  btnMic.addEventListener('click', () => {
    // Já está gravando -> encerra e manda pra IA.
    if (rec) {
      setStatus('Processando o que você falou…');
      parar(rec);
      return;
    }
    // Começa a gravar.
    setStatus('Ouvindo… fale à vontade e clique em "Parar" quando terminar.');
    btnMic.classList.add('gravando');
    btnMic.textContent = '■ Parar';
    rec = ouvir({
      onParcial: (texto) => {
        inputTexto.value = texto; // mostra o texto aparecendo ao vivo
      },
      onErro: (err) => {
        resetMic();
        setStatus(err === 'not-allowed' || err === 'service-not-allowed'
          ? 'Permita o microfone no navegador para usar a voz.'
          : 'Não foi possível ouvir. Use o campo de texto.', 'erro');
      },
      onFim: (textoFinal) => {
        resetMic();
        const texto = (textoFinal || inputTexto.value || '').trim();
        if (texto) interpretar(texto);
        else setStatus('Não captei nada. Tente de novo ou digite.', 'erro');
      },
    });
  });

  btnInterpretar.addEventListener('click', () => interpretar(inputTexto.value));
  inputTexto.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); interpretar(inputTexto.value); }
  });
}

// ---------------------------------------------------------------------------
// Tabelas
// ---------------------------------------------------------------------------
function tabelaEtapas(etapas, lancamentos) {
  // Realizado por etapa (casado pelo nome).
  const realizado = {};
  for (const l of lancamentos) {
    realizado[l.etapa] = (realizado[l.etapa] || 0) + Number(l.valor || 0);
  }

  // Linhas: etapas cadastradas + etapas que só aparecem em lançamentos.
  const nomes = new Set(etapas.map((e) => e.nome));
  const extras = Object.keys(realizado).filter((n) => !nomes.has(n));

  if (etapas.length === 0 && extras.length === 0) {
    return `<p class="muted">Nenhuma etapa ainda.</p>`;
  }

  const linhaEtapa = (nome, orcado, idEtapa) => {
    const real = realizado[nome] || 0;
    const p = pct(real, orcado);
    const estouro = orcado > 0 && real > orcado;
    return `
      <tr>
        <td>${esc(nome)}</td>
        <td class="num">${moeda(orcado)}</td>
        <td class="num">${moeda(real)}</td>
        <td>
          <div class="barra mini ${estouro ? 'estouro' : ''}">
            <span style="width:${Math.min(p, 100)}%"></span>
          </div>
          <small class="${estouro ? 'neg' : 'muted'}">${orcado > 0 ? p + '%' : '—'}</small>
        </td>
        <td class="acoes">
          ${idEtapa ? `<button class="btn btn-x" data-del-etapa="${esc(idEtapa)}" title="Remover etapa">×</button>` : ''}
        </td>
      </tr>`;
  };

  return `
    <table class="tabela">
      <thead>
        <tr><th>Etapa</th><th class="num">Orçado</th><th class="num">Realizado</th><th>Andamento</th><th></th></tr>
      </thead>
      <tbody>
        ${etapas.map((e) => linhaEtapa(e.nome, Number(e.orcado || 0), e.id)).join('')}
        ${extras.map((n) => linhaEtapa(n, 0, null)).join('')}
      </tbody>
    </table>`;
}

function tabelaLancamentos(lancamentos) {
  if (lancamentos.length === 0) return `<p class="muted">Nenhum lançamento ainda.</p>`;
  return `
    <table class="tabela">
      <thead>
        <tr><th>Data</th><th>Etapa</th><th>Descrição</th><th class="num">Valor</th><th>Status</th><th></th></tr>
      </thead>
      <tbody>
        ${lancamentos.map((l) => `
          <tr>
            <td>${dataBR(l.data)}</td>
            <td>${esc(l.etapa)}</td>
            <td>${esc(l.descricao || '')}</td>
            <td class="num">${moeda(l.valor)}</td>
            <td>${pillStatus(l.status)}</td>
            <td class="acoes"><button class="btn btn-x" data-del-lanc="${esc(l.id)}" title="Excluir">×</button></td>
          </tr>`).join('')}
      </tbody>
    </table>`;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function soma(arr) {
  return arr.reduce((t, l) => t + Number(l.valor || 0), 0);
}
function kpi(rotulo, valor, cls = '') {
  return `<div class="kpi"><small>${rotulo}</small><strong class="${cls}">${valor}</strong></div>`;
}
function flash(btn, msg) {
  const original = btn.textContent;
  btn.textContent = msg;
  setTimeout(() => { btn.textContent = original; }, 1500);
}
