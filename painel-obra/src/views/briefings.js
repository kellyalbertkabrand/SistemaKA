import { listarBriefings, listarObras, criarConvite, obterBriefing, excluirBriefing, sair } from '../dados.js';
import { esc, dataBR } from '../lib/format.js';
import { navBar } from '../lib/nav.js';

// Tela interna: gerar o link do briefing para enviar ao cliente e ver as
// respostas recebidas.
export async function renderBriefings(container, opts = {}) {
  const manterScroll = opts.scrollY != null;
  const alvoScroll = manterScroll ? opts.scrollY : 0;
  if (!manterScroll) container.innerHTML = `<div class="app"><p class="muted center">Carregando…</p></div>`;

  let briefings, obras;
  try {
    [briefings, obras] = await Promise.all([listarBriefings(), listarObras()]);
  } catch (e) {
    container.innerHTML = `
      <div class="app">
        <a class="voltar" data-link href="/obras">← Painel</a>
        <div class="card">
          <h2>Não foi possível carregar</h2>
          <p class="erro" style="display:block">${esc(e?.message || e)}</p>
        </div>
      </div>`;
    return;
  }
  briefings = briefings || [];
  obras = obras || [];

  container.innerHTML = `
    ${navBar('briefing')}
    <div class="app">
      <div class="pagina-topo"><h1>Briefing</h1></div>

      <section class="card">
        <h2>Gerar link do briefing</h2>
        <p class="muted">Crie um link e envie ao cliente. Ele responde o briefing do projeto — e as respostas caem direto aqui.</p>
        <div class="form-inline">
          <input id="b-rotulo" placeholder="Identificação (ex.: César e Elisandra)" />
          <select id="b-obra">
            <option value="">Sem obra vinculada</option>
            ${obras.map((o) => `<option value="${esc(o.id)}">${esc(o.nome)}</option>`).join('')}
          </select>
          <button class="btn btn-primary btn-mini" id="gerar-link">Gerar link</button>
        </div>
        <div id="link-gerado"></div>
      </section>

      <section class="card">
        <h2>Respostas recebidas</h2>
        <div id="lista-briefings">${listaBriefings(briefings)}</div>
      </section>

      <div id="brf-modal"></div>
    </div>`;

  container.querySelector('#sair').addEventListener('click', async () => {
    await sair();
  });

  // ---- Gerar convite → link ----
  container.querySelector('#gerar-link').addEventListener('click', async () => {
    const rotulo = container.querySelector('#b-rotulo').value.trim() || null;
    const sel = container.querySelector('#b-obra');
    const obraId = sel.value || null;
    const obraNome = sel.value ? sel.options[sel.selectedIndex].text : null;
    const alvo = container.querySelector('#link-gerado');
    alvo.innerHTML = `<p class="muted">Gerando…</p>`;
    let token;
    try {
      token = await criarConvite({ rotulo, obraId, obraNome, tipo: 'briefing' });
    } catch (error) {
      alvo.innerHTML = `<p class="erro" style="display:block">${esc(error?.message || error)}</p>`;
      return;
    }
    const link = `${window.location.origin}/briefing/${token}`;
    alvo.innerHTML = `
      <div class="preview-card">
        <p class="muted">Link do briefing${rotulo ? ' — ' + esc(rotulo) : ''}:</p>
        <p class="mono">${esc(link)}</p>
        <div class="row-end">
          <button class="btn btn-mini" id="copiar-brf">Copiar link</button>
          <a class="btn btn-mini" href="/briefing/${esc(token)}" target="_blank" rel="noopener">Abrir</a>
        </div>
      </div>`;
    alvo.querySelector('#copiar-brf').addEventListener('click', async (e) => {
      try { await navigator.clipboard.writeText(link); e.target.textContent = 'Copiado!'; }
      catch { e.target.textContent = 'Copie manualmente'; }
    });
  });

  // ---- Ver respostas (modal) ----
  container.querySelectorAll('[data-ver-brf]').forEach((b) => {
    b.addEventListener('click', async () => {
      const brf = await obterBriefing(b.getAttribute('data-ver-brf'));
      if (brf) abrirModal(container, brf);
    });
  });

  // ---- Excluir briefing ----
  container.querySelectorAll('[data-del-brf]').forEach((b) => {
    b.addEventListener('click', async () => {
      if (!confirm('Excluir este briefing? Esta ação não pode ser desfeita.')) return;
      await excluirBriefing(b.getAttribute('data-del-brf'));
      renderBriefings(container, { scrollY: window.scrollY });
    });
  });

  if (manterScroll) requestAnimationFrame(() => window.scrollTo(0, alvoScroll));
}

function tituloBriefing(b) {
  return b.cliente || b.rotulo || b.obraNome || 'Briefing';
}

function listaBriefings(briefings) {
  if (!briefings.length) return `<p class="muted">Nenhum briefing recebido ainda.</p>`;
  return briefings.map((b) => {
    const selo = b.concluido
      ? '<span class="brf-selo concluido">Concluído</span>'
      : '<span class="brf-selo andamento">Em preenchimento</span>';
    const quando = b.atualizadoEm || b.criadoEm;
    return `
    <div class="cliente-item">
      <div class="row-between">
        <strong>${esc(tituloBriefing(b))}${selo}</strong>
        <span class="row-end">
          <button class="btn btn-mini btn-primary" data-ver-brf="${esc(b.id)}">Ver respostas</button>
          <button class="btn btn-x" data-del-brf="${esc(b.id)}" title="Excluir">×</button>
        </span>
      </div>
      <div class="cliente-dados muted">
        ${b.obraNome ? `🏗️ ${esc(b.obraNome)} · ` : ''}
        ${(b.respostas?.length || 0)} resposta(s)
      </div>
      <div class="cliente-data muted">Atualizado em ${dataBR(quando ? new Date(quando).toISOString() : '')}</div>
    </div>`;
  }).join('');
}

// Modal com todas as respostas (agrupadas por seção).
function abrirModal(container, b) {
  const respostas = b.respostas || [];
  const secoes = [];
  respostas.forEach((r) => {
    let s = secoes.find((x) => x.titulo === (r.secao || ''));
    if (!s) { s = { titulo: r.secao || '', itens: [] }; secoes.push(s); }
    s.itens.push(r);
  });
  const corpo = secoes.map((s) => `
    ${s.titulo ? `<h3 class="brf-modal-secao">${esc(s.titulo)}</h3>` : ''}
    ${s.itens.map((r) => `
      <div class="brf-resp">
        <p class="brf-resp-p">${esc(r.pergunta)}</p>
        <p class="brf-resp-r">${esc(r.resposta)}</p>
      </div>`).join('')}
  `).join('');

  const modal = container.querySelector('#brf-modal');
  modal.innerHTML = `
    <div class="modal-overlay aberto" id="brf-fundo">
      <div class="modal-card" role="dialog" aria-modal="true">
        <div class="modal-cab">
          <h3>${esc(tituloBriefing(b))}</h3>
          <button class="btn btn-x" id="brf-fechar" aria-label="Fechar">×</button>
        </div>
        ${b.obraNome ? `<p class="muted">🏗️ ${esc(b.obraNome)}</p>` : ''}
        <div class="brf-modal-corpo">${corpo || '<p class="muted">Sem respostas.</p>'}</div>
      </div>
    </div>`;
  document.body.classList.add('modal-aberto');
  const fechar = () => { modal.innerHTML = ''; document.body.classList.remove('modal-aberto'); };
  modal.querySelector('#brf-fechar').addEventListener('click', fechar);
  modal.querySelector('#brf-fundo').addEventListener('click', (e) => {
    if (e.target.id === 'brf-fundo') fechar();
  });
}
