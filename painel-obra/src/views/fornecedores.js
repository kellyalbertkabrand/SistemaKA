import { listarFornecedores, criarFornecedor, atualizarFornecedor, excluirFornecedor, sair } from '../dados.js';
import { esc } from '../lib/format.js';
import { navBar } from '../lib/nav.js';

// Tela interna: cadastro, edição e lista de fornecedores.
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
            <button type="submit" class="btn btn-primary" id="salvar-forn">Salvar fornecedor</button>
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
  const btnSalvar = container.querySelector('#salvar-forn');
  const inNome = container.querySelector('#fo-nome');
  const inCategoria = container.querySelector('#fo-categoria');
  const inTelefone = container.querySelector('#fo-telefone');
  const inEmail = container.querySelector('#fo-email');
  const inCnpj = container.querySelector('#fo-cnpj');
  const inObs = container.querySelector('#fo-obs');

  // null = cadastrando um novo; id = editando aquele fornecedor.
  let editandoId = null;

  const abrirForm = (f = null) => {
    editandoId = f ? f.id : null;
    erro.hidden = true;
    inNome.value = f?.nome || '';
    inCategoria.value = f?.categoria || '';
    inTelefone.value = f?.telefone || '';
    inEmail.value = f?.email || '';
    inCnpj.value = f?.cnpj || '';
    inObs.value = f?.observacoes || '';
    btnSalvar.textContent = f ? 'Salvar alterações' : 'Salvar fornecedor';
    form.hidden = false;
    abrir.hidden = true;
    inNome.focus();
  };

  const fecharForm = () => {
    form.hidden = true;
    abrir.hidden = false;
    editandoId = null;
  };

  abrir.addEventListener('click', () => abrirForm(null));
  container.querySelector('#cancelar-forn').addEventListener('click', fecharForm);

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    erro.hidden = true;
    const nome = inNome.value.trim();
    if (!nome) { erro.textContent = 'Informe o nome do fornecedor.'; erro.hidden = false; return; }
    const registro = {
      nome,
      categoria: inCategoria.value.trim() || null,
      telefone: inTelefone.value.trim() || null,
      email: inEmail.value.trim() || null,
      cnpj: inCnpj.value.trim() || null,
      observacoes: inObs.value.trim() || null,
    };
    btnSalvar.disabled = true;
    const rotulo = btnSalvar.textContent;
    btnSalvar.textContent = 'Salvando…';
    try {
      if (editandoId) await atualizarFornecedor(editandoId, registro);
      else await criarFornecedor(registro);
    } catch (err) {
      btnSalvar.disabled = false; btnSalvar.textContent = rotulo;
      erro.textContent = err?.message || 'Erro ao salvar.'; erro.hidden = false;
      return;
    }
    renderFornecedores(container);
  });

  container.querySelectorAll('[data-edit-forn]').forEach((b) => {
    b.addEventListener('click', () => {
      const f = fornecedores.find((x) => x.id === b.getAttribute('data-edit-forn'));
      if (f) { abrirForm(f); form.scrollIntoView({ behavior: 'smooth', block: 'center' }); }
    });
  });

  container.querySelectorAll('[data-del-forn]').forEach((b) => {
    b.addEventListener('click', async () => {
      const f = fornecedores.find((x) => x.id === b.getAttribute('data-del-forn'));
      if (!confirm(`Excluir o fornecedor "${f?.nome || ''}"?`)) return;
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
        <span class="row-end">
          <button class="btn btn-x" data-edit-forn="${esc(f.id)}" title="Editar">✎</button>
          <button class="btn btn-x" data-del-forn="${esc(f.id)}" title="Excluir">×</button>
        </span>
      </div>
      <div class="cliente-dados muted">
        ${f.telefone ? `📞 ${esc(f.telefone)} ` : ''}
        ${f.email ? `· ✉️ ${esc(f.email)} ` : ''}
        ${f.cnpj ? `· ${esc(f.cnpj)}` : ''}
      </div>
      ${f.observacoes ? `<div class="muted cliente-dados">${esc(f.observacoes)}</div>` : ''}
    </div>`).join('');
}
