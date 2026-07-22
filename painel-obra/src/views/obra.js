import {
  obterObra, listarEtapas, listarLancamentos, atualizarObra, definirPublicado,
  criarEtapa, atualizarEtapa, excluirEtapa, criarLancamento, atualizarLancamento, excluirLancamento, sair,
  anexarRecibo, enviarFoto, listarFotos, excluirFoto,
} from '../dados.js';
import { navegar } from '../main.js';
import { moeda, dataBR, pct, esc, pillStatus } from '../lib/format.js';
import { reconhecimentoDisponivel, ouvir, parar } from '../lib/voice.js';
import { ordenarLancamentos, seletorOrdem } from '../lib/ordenar.js';
import { ETAPAS_PADRAO } from '../lib/etapasPadrao.js';
import { baixarExcel, numBR } from '../lib/exportar.js';
import { comprimirImagem } from '../lib/imagem.js';
import { abrirLightbox, baixarImagem } from '../lib/lightbox.js';
import { storagePronto } from '../firebase.js';

// Data 'YYYY-MM-DD' -> 'dd/mm/aaaa' (sem depender de fuso).
function fmtDataVisita(v) {
  if (!v) return '';
  const [a, m, d] = String(v).slice(0, 10).split('-');
  return d ? `${d}/${m}/${a}` : '';
}

// Corre uma promessa contra um tempo limite (para o upload não travar sem fim).
function comTempoLimite(promessa, ms, msg) {
  return Promise.race([
    promessa,
    new Promise((_, rej) => setTimeout(() => rej(new Error(msg)), ms)),
  ]);
}

// Traduz o erro do Firebase (Storage/Firestore) numa instrução clara do que
// corrigir — a causa quase sempre é uma Regra não publicada ou o bucket.
function msgErroAnexo(err) {
  const code = String(err?.code || '');
  const m = String(err?.message || err || '');
  if (code.includes('storage/unauthorized'))
    return 'As Regras do Storage não permitem o envio. No Firebase → Storage → aba Rules, cole o conteúdo de storage.rules e publique.';
  if (code.includes('permission-denied') || m.includes('insufficient permissions'))
    return 'As Regras do Firestore não permitem salvar. No Firebase → Firestore Database → Regras, publique firestore.rules (com a coleção "fotos").';
  if (code.includes('storage/retry-limit') || code.includes('storage/unknown') || m.includes('travou') || m.includes('demorou'))
    return 'O Storage não respondeu. Verifique se o Storage está ATIVO (plano Blaze) e se a variável VITE_FIREBASE_STORAGE_BUCKET no Netlify tem o valor EXATO do seu firebaseConfig (depois disso, refaça o deploy).';
  if (code.includes('storage/'))
    return 'Não foi possível enviar ao Storage (' + code + '). Confirme o bucket (VITE_FIREBASE_STORAGE_BUCKET) e se o Storage está ativo no Firebase.';
  return 'Falha ao enviar: ' + m;
}
import { navBar } from '../lib/nav.js';

// Detalhe interno de uma obra: KPIs, lançamento por voz/IA, etapas e lançamentos.
export async function renderObra(container, obraId) {
  container.innerHTML = `<div class="app"><p class="muted center">Carregando…</p></div>`;

  // A obra é o dado crítico. Carregamos ela primeiro e sozinha: só ela decide
  // se a tela existe ou não.
  let obra;
  try {
    obra = await obterObra(obraId);
  } catch {
    obra = null;
  }

  if (!obra) {
    container.innerHTML = `
      <div class="app">
        <a class="btn btn-ghost" data-link href="/obras">← Voltar</a>
        <p class="erro" style="display:block">Obra não encontrada.</p>
      </div>`;
    return;
  }

  // Etapas, lançamentos e fotos são complementares: se um falhar (ex.: regra do
  // Firestore ainda não publicada), degrada para vazio sem esconder a obra.
  const [etapas, lancamentos, fotos] = await Promise.all([
    listarEtapas(obraId).catch(() => []),
    listarLancamentos(obraId).catch(() => []),
    listarFotos(obraId).catch(() => []),
  ]);

  const executado = soma(lancamentos);
  const pago = soma(lancamentos.filter((l) => l.status === 'pago'));
  const pendente = soma(lancamentos.filter((l) => l.status === 'pendente'));
  const saldo = Number(obra.orcamento || 0) - executado;

  const linkPublico = `${window.location.origin}/obra/${obra.slug}`;

  container.innerHTML = `
    ${navBar('painel')}
    <div class="app">
      <div class="pagina-topo">
        <div>
          <a class="voltar" data-link href="/obras">← Obras</a>
          <h1>${esc(obra.nome)}</h1>
          <p class="muted">${esc(obra.cliente || 'Sem cliente definido')}
            <button class="btn btn-mini" id="abrir-editar">✎ Editar obra</button>
          </p>
        </div>
        <button class="btn btn-mini" id="exportar">⬇ Exportar (Excel)</button>
      </div>

      <form id="form-editar" class="card" hidden>
        <div class="form-grid">
          <label>Nome da obra
            <input id="ed-nome" value="${esc(obra.nome)}" />
          </label>
          <label>Cliente
            <input id="ed-cliente" value="${esc(obra.cliente || '')}" />
          </label>
          <label>Orçamento total (R$)
            <input id="ed-orcamento" type="number" min="0" step="0.01" value="${Number(obra.orcamento || 0)}" />
          </label>
        </div>
        <p class="muted" style="font-size:.8rem;margin:.2rem 0 0">
          Ao mudar o orçamento total, o saldo é recalculado automaticamente.
        </p>
        <div class="row-end">
          <button type="button" class="btn btn-ghost" id="ed-cancelar">Cancelar</button>
          <button type="submit" class="btn btn-primary">Salvar alterações</button>
        </div>
        <p class="erro" id="ed-erro" hidden></p>
      </form>

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
        ${chipsPadrao(etapas)}
        <div id="tabela-etapas">${tabelaEtapas(etapas, lancamentos)}</div>
      </section>

      <section class="card">
        <div class="row-between">
          <h2>Lançamentos</h2>
          ${lancamentos.length ? seletorOrdem('ord-lanc', 'data') : ''}
        </div>
        <div id="tabela-lancamentos">${tabelaLancamentos(ordenarLancamentos(lancamentos, 'data'))}</div>
      </section>

      <section class="card">
        <div class="row-between">
          <h2>Fotos das visitas</h2>
          <button class="btn btn-mini btn-primary" id="abrir-fotos" style="margin:0">+ Fotos</button>
        </div>
        ${storagePronto ? '' : `<p class="alerta">⚠️ O armazenamento de fotos não está configurado: defina a variável <strong>VITE_FIREBASE_STORAGE_BUCKET</strong> no Netlify e ative o Storage no Firebase. Enquanto isso, o envio de fotos/recibos não vai funcionar.</p>`}
        <form id="form-fotos" class="foto-form" hidden>
          <div class="foto-form-grid">
            <label>Data da visita
              <input type="date" id="foto-data" />
            </label>
            <label>Descrição da visita (opcional)
              <input type="text" id="foto-texto" placeholder="Ex.: Concretagem da laje, medições…" />
            </label>
          </div>
          <label>Fotos
            <input type="file" id="input-fotos" accept="image/*" multiple />
          </label>
          <div class="row-end">
            <button type="button" class="btn btn-ghost" id="cancelar-fotos">Cancelar</button>
            <button type="submit" class="btn btn-primary" id="enviar-fotos">Enviar fotos</button>
          </div>
          <p class="status-voz" id="status-fotos" hidden></p>
        </form>
        <div id="grid-fotos">${gridFotos(fotos)}</div>
      </section>
    </div>`;

  // Recarrega a tela inteira (após salvar/excluir algo).
  const recarregar = () => renderObra(container, obraId);

  container.querySelector('#sair').addEventListener('click', async () => {
    await sair();
  });

  // ---- Exportar a obra (Excel, com links dos anexos) ----
  container.querySelector('#exportar').addEventListener('click', () => {
    const realizado = {};
    for (const l of lancamentos) realizado[l.etapa] = (realizado[l.etapa] || 0) + Number(l.valor || 0);
    const fmtData = (v) => {
      if (!v) return '';
      const [a, m, d] = String(v).slice(0, 10).split('-');
      return d ? `${d}/${m}/${a}` : String(v);
    };
    const secoes = [
      { titulo: `Obra: ${obra.nome}`, linhas: [
        ['Cliente', obra.cliente || ''],
        ['Orçamento', 'R$ ' + numBR(obra.orcamento)],
        ['Executado', 'R$ ' + numBR(executado)],
        ['Saldo', 'R$ ' + numBR(saldo)],
      ] },
      { titulo: 'Etapas', cabecalho: ['Etapa', 'Orçado (R$)', 'Realizado (R$)'],
        linhas: etapas.map((et) => [et.nome, numBR(et.orcado), numBR(realizado[et.nome] || 0)]) },
      { titulo: 'Lançamentos', cabecalho: ['Data', 'Etapa', 'Descrição', 'Valor (R$)', 'Status', 'Recibo/NF'],
        linhas: ordenarLancamentos(lancamentos, 'data').map((l) => [
          dataBR(l.data), l.etapa, l.descricao || '', numBR(l.valor), l.status,
          l.reciboUrl ? { link: l.reciboUrl, texto: l.reciboNome || 'Ver recibo' } : '—',
        ]) },
      { titulo: 'Fotos das visitas', cabecalho: ['Data da visita', 'Descrição', 'Foto'],
        linhas: (fotos || []).map((f) => [
          fmtData(f.dataVisita || (f.criadoEm ? new Date(f.criadoEm).toISOString() : '')),
          f.texto || '',
          { link: f.url, texto: 'Abrir foto' },
        ]) },
    ];
    baixarExcel(`obra-${obra.slug}.xls`, secoes);
  });

  // ---- Editar obra (nome, cliente, orçamento total) ----
  const abrirEditar = container.querySelector('#abrir-editar');
  const formEditar = container.querySelector('#form-editar');
  const edErro = container.querySelector('#ed-erro');
  abrirEditar.addEventListener('click', () => {
    formEditar.hidden = !formEditar.hidden;
    if (!formEditar.hidden) container.querySelector('#ed-nome').focus();
  });
  container.querySelector('#ed-cancelar').addEventListener('click', () => {
    formEditar.hidden = true;
  });
  formEditar.addEventListener('submit', async (e) => {
    e.preventDefault();
    edErro.hidden = true;
    const nome = container.querySelector('#ed-nome').value.trim();
    const cliente = container.querySelector('#ed-cliente').value.trim() || null;
    const orcamento = Number(container.querySelector('#ed-orcamento').value || 0);
    if (!nome) { edErro.textContent = 'Dê um nome à obra.'; edErro.hidden = false; return; }
    const btn = formEditar.querySelector('button[type="submit"]');
    btn.disabled = true; btn.textContent = 'Salvando…';
    try {
      await atualizarObra(obra.id, { nome, cliente, orcamento });
    } catch (error) {
      btn.disabled = false; btn.textContent = 'Salvar alterações';
      edErro.textContent = error?.message || 'Erro ao salvar.'; edErro.hidden = false;
      return;
    }
    recarregar();
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
    await definirPublicado(obra.id, e.target.checked);
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
    await criarEtapa({ obraId: obra.id, nome, orcado });
    recarregar();
  });
  container.querySelectorAll('[data-del-etapa]').forEach((b) => {
    b.addEventListener('click', async () => {
      await excluirEtapa(b.getAttribute('data-del-etapa'));
      recarregar();
    });
  });
  // Editar etapa (nome + orçado) inline na própria linha da tabela.
  container.querySelectorAll('[data-edit-etapa]').forEach((b) => {
    b.addEventListener('click', () => {
      const tr = b.closest('tr');
      const id = b.getAttribute('data-edit-etapa');
      const nomeAtual = b.getAttribute('data-nome');
      const orcadoAtual = b.getAttribute('data-orcado');
      tr.innerHTML = `
        <td><input class="ed-et-nome" value="${esc(nomeAtual)}" /></td>
        <td class="num"><input class="ed-et-orcado" type="number" min="0" step="0.01" value="${esc(orcadoAtual)}" /></td>
        <td class="num muted">—</td>
        <td></td>
        <td class="acoes" style="white-space:nowrap">
          <button class="btn btn-mini btn-primary ed-et-salvar">Salvar</button>
          <button class="btn btn-mini ed-et-cancelar">Cancelar</button>
        </td>`;
      const inNome = tr.querySelector('.ed-et-nome');
      inNome.focus();
      tr.querySelector('.ed-et-cancelar').addEventListener('click', recarregar);
      tr.querySelector('.ed-et-salvar').addEventListener('click', async () => {
        const novoNome = inNome.value.trim();
        const novoOrcado = Number(tr.querySelector('.ed-et-orcado').value || 0);
        if (!novoNome) { inNome.focus(); return; }
        const salvar = tr.querySelector('.ed-et-salvar');
        salvar.disabled = true; salvar.textContent = 'Salvando…';
        try {
          await atualizarEtapa(id, { nome: novoNome, orcado: novoOrcado });
          // Se renomeou, repassa o novo nome aos lançamentos (o "realizado"
          // casa pelo nome da etapa).
          if (novoNome !== nomeAtual) {
            const afetados = lancamentos.filter((l) => l.etapa === nomeAtual);
            for (const l of afetados) await atualizarLancamento(l.id, { etapa: novoNome });
          }
          recarregar();
        } catch (err) {
          salvar.disabled = false; salvar.textContent = 'Salvar';
          alert('Erro ao salvar: ' + (err?.message || err));
        }
      });
    });
  });
  // Quick-add: adicionar uma etapa padrão (CAIXA) com um clique.
  container.querySelectorAll('[data-chip-etapa]').forEach((c) => {
    c.addEventListener('click', async () => {
      c.disabled = true;
      await criarEtapa({ obraId: obra.id, nome: c.getAttribute('data-chip-etapa'), orcado: 0 });
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
    const del = e.target.closest('[data-del-lanc]');
    if (del) { await excluirLancamento(del.getAttribute('data-del-lanc')); recarregar(); return; }
    const anexar = e.target.closest('[data-anexar-recibo]');
    if (anexar) abrirAnexoRecibo(anexar.getAttribute('data-anexar-recibo'));
  });

  // Anexar recibo/NF (imagem ou PDF) a um lançamento.
  function abrirAnexoRecibo(lancId) {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*,application/pdf';
    input.addEventListener('change', async () => {
      const file = input.files && input.files[0];
      if (!file) return;
      try {
        // Comprime se for imagem (PDF/NF passam intactos) — envio mais rápido.
        const arquivo = await comprimirImagem(file);
        await comTempoLimite(
          anexarRecibo(lancId, obra.id, arquivo),
          45000,
          'O envio travou (Storage não respondeu).',
        );
        recarregar();
      } catch (err) {
        alert(msgErroAnexo(err));
      }
    });
    input.click();
  }

  // ---- Fotos das visitas ----
  const abrirFotos = container.querySelector('#abrir-fotos');
  const formFotos = container.querySelector('#form-fotos');
  const inputFotos = container.querySelector('#input-fotos');
  const fotoData = container.querySelector('#foto-data');
  const fotoTexto = container.querySelector('#foto-texto');
  const statusFotos = container.querySelector('#status-fotos');
  if (fotoData) fotoData.value = new Date().toISOString().slice(0, 10); // hoje
  if (abrirFotos) {
    abrirFotos.addEventListener('click', () => {
      formFotos.hidden = !formFotos.hidden;
      if (!formFotos.hidden) inputFotos.focus();
    });
    container.querySelector('#cancelar-fotos').addEventListener('click', () => {
      formFotos.hidden = true;
    });
    formFotos.addEventListener('submit', async (e) => {
      e.preventDefault();
      const files = [...(inputFotos.files || [])];
      statusFotos.hidden = false;
      if (!files.length) {
        statusFotos.className = 'status-voz erro';
        statusFotos.textContent = 'Escolha ao menos uma foto.';
        return;
      }
      const meta = { texto: fotoTexto.value.trim() || null, dataVisita: fotoData.value || null };
      const btn = container.querySelector('#enviar-fotos');
      btn.disabled = true;
      statusFotos.className = 'status-voz';
      try {
        let i = 0;
        for (const f of files) {
          i++;
          statusFotos.textContent = `Otimizando e enviando ${i} de ${files.length}…`;
          const comprimida = await comprimirImagem(f);
          await comTempoLimite(
            enviarFoto(obra.id, comprimida, meta),
            45000,
            'O envio travou. Verifique no Firebase se o Storage está ativo e com as Regras publicadas (e a variável VITE_FIREBASE_STORAGE_BUCKET no Netlify).',
          );
        }
        recarregar();
      } catch (err) {
        btn.disabled = false;
        statusFotos.className = 'status-voz erro';
        statusFotos.textContent = msgErroAnexo(err);
      }
    });
  }
  const gridFotosEl = container.querySelector('#grid-fotos');
  gridFotosEl.addEventListener('click', async (e) => {
    const abrir = e.target.closest('[data-abrir-foto]');
    const baixarBtn = e.target.closest('[data-baixar-foto]');
    const del = e.target.closest('[data-del-foto]');

    if (abrir) {
      const itens = fotos.map((f) => ({
        url: f.url,
        nome: f.nome,
        data: fmtDataVisita(f.dataVisita) || dataBR(f.criadoEm ? new Date(f.criadoEm).toISOString() : ''),
        texto: f.texto,
      }));
      abrirLightbox(itens, Number(abrir.getAttribute('data-abrir-foto')) || 0);
      return;
    }
    if (baixarBtn) {
      baixarImagem(baixarBtn.getAttribute('data-url'), baixarBtn.getAttribute('data-nome'));
      return;
    }
    if (del) {
      if (!confirm('Excluir esta foto?')) return;
      await excluirFoto(del.getAttribute('data-del-foto'), del.getAttribute('data-foto-path'));
      recarregar();
    }
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
        obraId: obra.id,
        etapa: preview.querySelector('#p-etapa').value.trim() || 'Geral',
        descricao: preview.querySelector('#p-descricao').value.trim() || null,
        valor: Number(preview.querySelector('#p-valor').value || 0),
        status: preview.querySelector('#p-status').value,
      };
      const btn = preview.querySelector('#p-salvar');
      btn.disabled = true; btn.textContent = 'Salvando…';
      try {
        await criarLancamento(novo);
      } catch (error) {
        btn.disabled = false; btn.textContent = 'Salvar lançamento';
        setStatus(error?.message || 'Erro ao salvar.', 'erro');
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
// Sugestões de etapas padrão (CAIXA) ainda não cadastradas — 1 clique adiciona.
function chipsPadrao(etapas) {
  const tem = new Set(etapas.map((e) => e.nome.toLowerCase()));
  const faltam = ETAPAS_PADRAO.filter((n) => !tem.has(n.toLowerCase()));
  if (!faltam.length) return '';
  return `<div class="chips-padrao">
    <span class="chips-label">Etapas padrão — clique para adicionar:</span>
    ${faltam.map((n) => `<button type="button" class="chip" data-chip-etapa="${esc(n)}">+ ${esc(n)}</button>`).join('')}
  </div>`;
}

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
        <td class="acoes" style="white-space:nowrap">
          ${idEtapa ? `
            <button class="btn btn-x" data-edit-etapa="${esc(idEtapa)}" data-nome="${esc(nome)}" data-orcado="${orcado}" title="Editar etapa">✎</button>
            <button class="btn btn-x" data-del-etapa="${esc(idEtapa)}" title="Remover etapa">×</button>` : ''}
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

// Galeria de fotos das visitas: miniaturas (abrem o carrossel), data, descrição,
// baixar e excluir.
function gridFotos(fotos) {
  if (!fotos.length) return `<p class="muted">Nenhuma foto ainda. Envie as fotos das visitas à obra.</p>`;
  return `<div class="fotos-grid">
    ${fotos.map((f, idx) => {
      const data = fmtDataVisita(f.dataVisita) || dataBR(f.criadoEm ? new Date(f.criadoEm).toISOString() : '');
      return `
      <figure class="foto-item">
        <button class="foto-thumb" data-abrir-foto="${idx}" title="Ampliar">
          <img src="${esc(f.url)}" alt="${esc(f.nome || 'foto')}" loading="lazy" />
          <span class="foto-zoom">⤢</span>
        </button>
        <figcaption>
          <div class="foto-meta">
            <span class="foto-data">${data}</span>
            <span class="foto-acoes">
              <button class="btn btn-x" data-baixar-foto data-url="${esc(f.url)}" data-nome="${esc(f.nome || 'foto.jpg')}" title="Baixar">⬇</button>
              <button class="btn btn-x" data-del-foto="${esc(f.id)}" data-foto-path="${esc(f.path || '')}" title="Excluir">×</button>
            </span>
          </div>
          ${f.texto ? `<p class="foto-texto">${esc(f.texto)}</p>` : ''}
        </figcaption>
      </figure>`;
    }).join('')}
  </div>`;
}

function tabelaLancamentos(lancamentos) {
  if (lancamentos.length === 0) return `<p class="muted">Nenhum lançamento ainda.</p>`;
  return `
    <table class="tabela">
      <thead>
        <tr><th>Data</th><th>Etapa</th><th>Descrição</th><th class="num">Valor</th><th>Status</th><th>Recibo</th><th></th></tr>
      </thead>
      <tbody>
        ${lancamentos.map((l) => `
          <tr>
            <td>${dataBR(l.data)}</td>
            <td>${esc(l.etapa)}</td>
            <td>${esc(l.descricao || '')}</td>
            <td class="num">${moeda(l.valor)}</td>
            <td>${pillStatus(l.status)}</td>
            <td>${l.reciboUrl
              ? `<a class="btn btn-mini" href="${esc(l.reciboUrl)}" target="_blank" rel="noopener" title="${esc(l.reciboNome || 'recibo')}">📎 ver</a>`
              : `<button class="btn btn-mini" data-anexar-recibo="${esc(l.id)}">anexar</button>`}</td>
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
