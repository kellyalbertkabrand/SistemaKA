import { listarFornecedores, criarFornecedor, excluirFornecedor, sair } from '../dados.js';
import { esc } from '../lib/format.js';
import { navBar } from '../lib/nav.js';

// Tela interna: cadastro e lista de fornecedores.
export async function renderFornecedores(container) {
  container.innerHTML = `<div class="app"><p class="muted center">Carregando…</p></div>`;

  let fornecedores;
  try {
    fornecedores = await listarFornecedores();
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
  fornecedores = fornecedores || [];

  container.innerHTML = `
    ${navBar('fornecedores')}
    <div class="app">
      <div class="pagina-topo"><h1>Fornecedores</h1></div>

      <section class="card">
        <button class="btn btn-primary" id="abrir-novo">+ Novo fornecedor</button>
        <form id="form-forn" class="form-grid" hidden>
          <label>Nome / empresa *
            <input id="fo-nome" required />
          </label>
          <label>Categoria
            <input id="fo-categoria" placeholder="Ex.: Material, Elétrica, Mão de obra" />
          </label>
          <label>Telefone / WhatsApp
            <input id="fo-telefone" />
          </label>
          <label>E-mail
            <input id="fo-email" type="email" />
          </label>
          <label>CNPJ
            <input id="fo-cnpj" />
          </label>
          <label>Observações
            <input id="fo-obs" />
          </label>
          <div class="full row-end">
            <button type="button" class="btn btn-ghost" id="cancelar-forn">Cancelar</button>
            <button type="submit" class="btn btn-primary">Salvar fornecedor</button>
          </div>
          <p class="erro full" id="erro-forn" hidden></p>
        </form>
      </section>

      <section class="card">
        <h2>Cadastrados</h2>
        <div id="lista-forn">${listaForn(fornecedores)}</div>
      </section>
    </div>`;

  container.querySelector('#sair').addEventListener('click', async () => {
    await sair();
  });

  const abrir = container.querySelector('#abrir-novo');
  const form = container.querySelector('#form-forn');
  const erro = container.querySelector('#erro-forn');
  abrir.addEventListener('click', () => {
    form.hidden = false; abrir.hidden = true;
    container.querySelector('#fo-nome').focus();
  });
  container.querySelector('#cancelar-forn').addEventListener('click', () => {
    form.hidden = true; abrir.hidden = false;
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    erro.hidden = true;
    const nome = container.querySelector('#fo-nome').value.trim();
    if (!nome) { erro.textContent = 'Informe o nome do fornecedor.'; erro.hidden = false; return; }
    const registro = {
      nome,
      categoria: container.querySelector('#fo-categoria').value.trim() || null,
      telefone: container.querySelector('#fo-telefone').value.trim() || null,
      email: container.querySelector('#fo-email').value.trim() || null,
      cnpj: container.querySelector('#fo-cnpj').value.trim() || null,
      observacoes: container.querySelector('#fo-obs').value.trim() || null,
    };
    const btn = form.querySelector('button[type="submit"]');
    btn.disabled = true; btn.textContent = 'Salvando…';
    try {
      await criarFornecedor(registro);
    } catch (err) {
      btn.disabled = false; btn.textContent = 'Salvar fornecedor';
      erro.textContent = err?.message || 'Erro ao salvar.'; erro.hidden = false;
      return;
    }
    renderFornecedores(container);
  });

  container.querySelectorAll('[data-del-forn]').forEach((b) => {
    b.addEventListener('click', async () => {
      await excluirFornecedor(b.getAttribute('data-del-forn'));
      renderFornecedores(container);
    });
  });
}

function listaForn(fornecedores) {
  if (!fornecedores.length) return `<p class="muted">Nenhum fornecedor cadastrado ainda.</p>`;
  return fornecedores.map((f) => `
    <div class="cliente-item">
      <div class="row-between">
        <strong>${esc(f.nome)}${f.categoria ? ` <span class="tag tag-off">${esc(f.categoria)}</span>` : ''}</strong>
        <button class="btn btn-x" data-del-forn="${esc(f.id)}" title="Excluir">×</button>
      </div>
      <div class="cliente-dados muted">
        ${f.telefone ? `📞 ${esc(f.telefone)} ` : ''}
        ${f.email ? `· ✉️ ${esc(f.email)} ` : ''}
        ${f.cnpj ? `· ${esc(f.cnpj)}` : ''}
      </div>
      ${f.observacoes ? `<div class="muted cliente-dados">${esc(f.observacoes)}</div>` : ''}
    </div>`).join('');
}
