import { supabase } from '../supabaseClient.js';
import { esc } from '../lib/format.js';
import { navBar } from '../lib/nav.js';

// Tela interna: cadastro e lista de fornecedores.
export async function renderFornecedores(container) {
  container.innerHTML = `<div class="app"><p class="muted center">Carregando…</p></div>`;

  const { data, error } = await supabase
    .from('fornecedores')
    .select('*')
    .order('nome', { ascending: true });

  if (error) {
    container.innerHTML = `
      <div class="app">
        <a class="voltar" data-link href="/">← Painel</a>
        <div class="card">
          <h2>Ative o Cadastro de Fornecedores</h2>
          <p class="muted">Rode o script <code>supabase/fase2-fornecedores.sql</code> no SQL Editor do Supabase e recarregue.</p>
          <p class="erro" style="display:block">${esc(error.message)}</p>
        </div>
      </div>`;
    return;
  }

  const fornecedores = data || [];

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
    await supabase.auth.signOut();
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
    const { error: err } = await supabase.from('fornecedores').insert(registro);
    if (err) {
      btn.disabled = false; btn.textContent = 'Salvar fornecedor';
      erro.textContent = err.message; erro.hidden = false;
      return;
    }
    renderFornecedores(container);
  });

  container.querySelectorAll('[data-del-forn]').forEach((b) => {
    b.addEventListener('click', async () => {
      await supabase.from('fornecedores').delete().eq('id', b.getAttribute('data-del-forn'));
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
