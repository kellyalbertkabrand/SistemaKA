import { listarFornecedores, criarFornecedor, atualizarFornecedor, excluirFornecedor, criarConvite, sair } from '../dados.js';
import { esc } from '../lib/format.js';
import { navBar } from '../lib/nav.js';
import { ligarMascara, ligarEmail, formatarCpfCnpj, formatarTelefone, validarEmail, linkWhatsApp } from '../lib/mascaras.js';

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
        <h2>Gerar link de cadastro</h2>
        <p class="muted">Crie um link, envie ao fornecedor, e ele mesmo preenche os dados — que caem direto aqui.</p>
        <div class="form-inline">
          <input id="fo-rotulo" placeholder="Identificação (ex.: Marmoraria Carvalho)" />
          <button class="btn btn-primary btn-mini" id="gerar-link-forn">Gerar link</button>
        </div>
        <div id="link-forn-gerado"></div>
      </section>

      <section class="card">
        <button class="btn btn-primary" id="abrir-novo">+ Novo fornecedor</button>
        <form id="form-forn" class="form-grid" hidden>
          <label>Nome / empresa *
            <input id="fo-nome" required />
          </label>
          <label>Categoria
            <input id="fo-categoria" placeholder="Ex.: Material, Elétrica, Mão de obra" />
          </label>
          <label>Vendedor (contato)
            <input id="fo-vendedor" placeholder="Nome de quem atende" />
          </label>
          <label>Telefone / WhatsApp
            <input id="fo-telefone" />
          </label>
          <label>E-mail
            <input id="fo-email" type="email" />
            <p class="dica-campo" id="fo-email-dica" hidden></p>
          </label>
          <label>CPF / CNPJ
            <input id="fo-cnpj" />
          </label>
          <label class="full">Endereço
            <input id="fo-endereco" />
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

  // ---- Gerar convite → link de autocadastro do fornecedor ----
  container.querySelector('#gerar-link-forn').addEventListener('click', async () => {
    const rotulo = container.querySelector('#fo-rotulo').value.trim() || null;
    const alvo = container.querySelector('#link-forn-gerado');
    alvo.innerHTML = `<p class="muted">Gerando…</p>`;
    let token;
    try {
      token = await criarConvite({ rotulo, tipo: 'fornecedor' });
    } catch (error) {
      alvo.innerHTML = `<p class="erro" style="display:block">${esc(error?.message || error)}</p>`;
      return;
    }
    const link = `${window.location.origin}/cadastro-fornecedor/${token}`;
    alvo.innerHTML = `
      <div class="preview-card">
        <p class="muted">Link do cadastro${rotulo ? ' — ' + esc(rotulo) : ''}:</p>
        <p class="mono">${esc(link)}</p>
        <div class="row-end">
          <button class="btn btn-mini" id="copiar-forn-link">Copiar link</button>
          <a class="btn btn-mini" href="/cadastro-fornecedor/${esc(token)}" target="_blank" rel="noopener">Abrir</a>
        </div>
      </div>`;
    alvo.querySelector('#copiar-forn-link').addEventListener('click', async (e) => {
      try { await navigator.clipboard.writeText(link); e.target.textContent = 'Copiado!'; }
      catch { e.target.textContent = 'Copie manualmente'; }
    });
  });

  const abrir = container.querySelector('#abrir-novo');
  const form = container.querySelector('#form-forn');
  const erro = container.querySelector('#erro-forn');
  const btnSalvar = container.querySelector('#salvar-forn');
  const inNome = container.querySelector('#fo-nome');
  const inCategoria = container.querySelector('#fo-categoria');
  const inVendedor = container.querySelector('#fo-vendedor');
  const inTelefone = container.querySelector('#fo-telefone');
  const inEmail = container.querySelector('#fo-email');
  const inCnpj = container.querySelector('#fo-cnpj');
  const inEndereco = container.querySelector('#fo-endereco');
  const inObs = container.querySelector('#fo-obs');

  // Máscaras + verificação de e-mail.
  ligarMascara(inTelefone, formatarTelefone);
  ligarMascara(inCnpj, formatarCpfCnpj);
  ligarEmail(inEmail, container.querySelector('#fo-email-dica'));

  // null = cadastrando um novo; id = editando aquele fornecedor.
  let editandoId = null;

  const abrirForm = (f = null) => {
    editandoId = f ? f.id : null;
    erro.hidden = true;
    inNome.value = f?.nome || '';
    inCategoria.value = f?.categoria || '';
    inVendedor.value = f?.vendedor || '';
    inTelefone.value = formatarTelefone(f?.telefone || '');
    inEmail.value = f?.email || '';
    inCnpj.value = formatarCpfCnpj(f?.cnpj || '');
    inEndereco.value = f?.endereco || '';
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
    const emailCheck = validarEmail(inEmail.value);
    if (!emailCheck.ok) { erro.textContent = emailCheck.erro; erro.hidden = false; inEmail.focus(); return; }
    const registro = {
      nome,
      categoria: inCategoria.value.trim() || null,
      vendedor: inVendedor.value.trim() || null,
      telefone: inTelefone.value.trim() || null,
      email: inEmail.value.trim() || null,
      cnpj: inCnpj.value.trim() || null,
      endereco: inEndereco.value.trim() || null,
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
          ${f.telefone && linkWhatsApp(f.telefone) ? `<a class="btn btn-mini btn-whats" href="${esc(linkWhatsApp(f.telefone, f.vendedor ? `Olá, ${f.vendedor}!` : ''))}" target="_blank" rel="noopener" title="Chamar no WhatsApp">💬 WhatsApp</a>` : ''}
          <button class="btn btn-x" data-edit-forn="${esc(f.id)}" title="Editar">✎</button>
          <button class="btn btn-x" data-del-forn="${esc(f.id)}" title="Excluir">×</button>
        </span>
      </div>
      <div class="cliente-dados muted">
        ${f.vendedor ? `👤 ${esc(f.vendedor)} ` : ''}
        ${f.telefone ? `${f.vendedor ? '· ' : ''}📞 ${esc(f.telefone)} ` : ''}
        ${f.email ? `· ✉️ ${esc(f.email)} ` : ''}
        ${f.cnpj ? `· ${esc(f.cnpj)}` : ''}
      </div>
      ${f.endereco ? `<div class="muted cliente-dados">📍 ${esc(f.endereco)}</div>` : ''}
      ${f.observacoes ? `<div class="muted cliente-dados">${esc(f.observacoes)}</div>` : ''}
    </div>`).join('');
}
