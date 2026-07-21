import { listarClientes, listarObras, criarConvite, excluirCliente, sair } from '../dados.js';
import { esc, dataBR } from '../lib/format.js';
import { navBar } from '../lib/nav.js';

// Tela interna: lista de clientes + gerar link de autopreenchimento.
export async function renderClientes(container) {
  container.innerHTML = `<div class="app"><p class="muted center">Carregando…</p></div>`;

  let clientes, obras;
  try {
    [clientes, obras] = await Promise.all([listarClientes(), listarObras()]);
  } catch (e) {
    container.innerHTML = `
      <div class="app">
        <a class="voltar" data-link href="/">← Painel</a>
        <div class="card">
          <h2>Não foi possível carregar</h2>
          <p class="erro" style="display:block">${esc(e?.message || e)}</p>
        </div>
      </div>`;
    return;
  }
  clientes = clientes || [];
  obras = obras || [];

  container.innerHTML = `
    ${navBar('clientes')}
    <div class="app">
      <div class="pagina-topo"><h1>Clientes</h1></div>

      <section class="card">
        <h2>Gerar link de cadastro</h2>
        <p class="muted">Crie um link, envie ao cliente, e ele preenche os dados — que caem direto aqui.</p>
        <div class="form-inline">
          <input id="c-rotulo" placeholder="Identificação (ex.: Família Silva)" />
          <select id="c-obra">
            <option value="">Sem obra vinculada</option>
            ${obras.map((o) => `<option value="${esc(o.id)}">${esc(o.nome)}</option>`).join('')}
          </select>
          <button class="btn btn-primary btn-mini" id="gerar-link">Gerar link</button>
        </div>
        <div id="link-gerado"></div>
      </section>

      <section class="card">
        <h2>Cadastrados</h2>
        <div id="lista-clientes">${listaClientes(clientes)}</div>
      </section>
    </div>`;

  container.querySelector('#sair').addEventListener('click', async () => {
    await sair();
  });

  // Gerar convite → link
  container.querySelector('#gerar-link').addEventListener('click', async () => {
    const rotulo = container.querySelector('#c-rotulo').value.trim() || null;
    const obraId = container.querySelector('#c-obra').value || null;
    const alvo = container.querySelector('#link-gerado');
    alvo.innerHTML = `<p class="muted">Gerando…</p>`;
    let token;
    try {
      token = await criarConvite({ rotulo, obraId });
    } catch (error) {
      alvo.innerHTML = `<p class="erro" style="display:block">${esc(error?.message || error)}</p>`;
      return;
    }
    const link = `${window.location.origin}/cadastro/${token}`;
    alvo.innerHTML = `
      <div class="preview-card">
        <p class="muted">Link do cadastro${rotulo ? ' — ' + esc(rotulo) : ''}:</p>
        <p class="mono">${esc(link)}</p>
        <div class="row-end">
          <button class="btn btn-mini" id="copiar-cad">Copiar link</button>
          <a class="btn btn-mini" href="/cadastro/${esc(token)}" target="_blank" rel="noopener">Abrir</a>
        </div>
      </div>`;
    alvo.querySelector('#copiar-cad').addEventListener('click', async (e) => {
      try { await navigator.clipboard.writeText(link); e.target.textContent = 'Copiado!'; }
      catch { e.target.textContent = 'Copie manualmente'; }
    });
  });

  // Excluir cliente
  container.querySelectorAll('[data-del-cli]').forEach((b) => {
    b.addEventListener('click', async () => {
      await excluirCliente(b.getAttribute('data-del-cli'));
      renderClientes(container);
    });
  });
}

function listaClientes(clientes) {
  if (!clientes.length) return `<p class="muted">Nenhum cliente cadastrado ainda.</p>`;
  return clientes.map((c) => `
    <div class="cliente-item">
      <div class="row-between">
        <strong>${esc(c.nome)}</strong>
        <button class="btn btn-x" data-del-cli="${esc(c.id)}" title="Excluir">×</button>
      </div>
      <div class="cliente-dados muted">
        ${c.email ? `✉️ ${esc(c.email)} ` : ''}
        ${c.telefone ? `· 📞 ${esc(c.telefone)} ` : ''}
        ${c.documento ? `· ${esc(c.documento)} ` : ''}
        ${c.cidade ? `· ${esc(c.cidade)}` : ''}
      </div>
      ${c.endereco ? `<div class="muted cliente-dados">${esc(c.endereco)}</div>` : ''}
      ${c.observacoes ? `<div class="muted cliente-dados">${esc(c.observacoes)}</div>` : ''}
      <div class="cliente-data muted">Cadastrado em ${dataBR(c.criadoEm ? new Date(c.criadoEm).toISOString() : '')}</div>
    </div>`).join('');
}
