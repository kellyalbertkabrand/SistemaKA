import { listarClientes, listarObras, criarConvite, criarClienteEscritorio, excluirCliente, sair } from '../dados.js';
import { esc, dataBR } from '../lib/format.js';
import { navBar } from '../lib/nav.js';
import { ligarMascara, ligarEmail, formatarCpfCnpj, formatarTelefone, validarEmail } from '../lib/mascaras.js';

// Tela interna: cadastrar cliente pelo escritório, gerar link de autopreenchimento
// e listar os cadastrados.
export async function renderClientes(container) {
  container.innerHTML = `<div class="app"><p class="muted center">Carregando…</p></div>`;

  let clientes, obras;
  try {
    [clientes, obras] = await Promise.all([listarClientes(), listarObras()]);
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
        <div class="row-between">
          <h2>Cadastrar cliente</h2>
          <button class="btn btn-primary btn-mini" id="abrir-cad">+ Novo cliente</button>
        </div>
        <form id="form-cli" class="form-grid" hidden>
          <div class="full"><strong>Dados de contato</strong></div>
          <label class="full">Nome / identificação *
            <input id="e-nome" required />
          </label>
          <label>E-mail<input id="e-email" type="email" /><p class="dica-campo" id="e-email-dica" hidden></p></label>
          <label>Telefone / WhatsApp<input id="e-telefone" /></label>
          <label>CPF / CNPJ<input id="e-documento" /></label>
          <label>Cidade<input id="e-cidade" /></label>
          <label class="full">Endereço<input id="e-endereco" /></label>
          <label class="full">Observações<input id="e-observacoes" /></label>

          <div class="full row-between" style="margin-top:.4rem">
            <strong>Dados para contrato</strong>
            <button type="button" class="btn btn-mini" id="copiar-contato">↑ Copiar dados de contato</button>
          </div>
          <label class="full">Nome completo / Razão social<input id="c-nome" /></label>
          <label>CPF / CNPJ<input id="c-doc" /></label>
          <label>RG / Inscrição Estadual<input id="c-rg" /></label>
          <label>Nacionalidade<input id="c-nacionalidade" /></label>
          <label>Estado civil<input id="c-estadocivil" /></label>
          <label>Profissão<input id="c-profissao" /></label>
          <label class="full">Endereço (contrato)<input id="c-endereco" /></label>

          <div class="full row-end">
            <button type="button" class="btn btn-ghost" id="cancelar-cli">Cancelar</button>
            <button type="submit" class="btn btn-primary">Salvar cliente</button>
          </div>
          <p class="erro full" id="erro-cli" hidden></p>
        </form>
      </section>

      <section class="card">
        <h2>Cadastrados</h2>
        <div id="lista-clientes">${listaClientes(clientes)}</div>
      </section>
    </div>`;

  container.querySelector('#sair').addEventListener('click', async () => {
    await sair();
  });

  // ---- Cadastrar cliente pelo escritório ----
  const abrirCad = container.querySelector('#abrir-cad');
  const formCli = container.querySelector('#form-cli');
  const erroCli = container.querySelector('#erro-cli');

  // Máscaras (telefone e CPF/CNPJ) + verificação de e-mail.
  ligarMascara(container.querySelector('#e-telefone'), formatarTelefone);
  ligarMascara(container.querySelector('#e-documento'), formatarCpfCnpj);
  ligarMascara(container.querySelector('#c-doc'), formatarCpfCnpj);
  ligarEmail(container.querySelector('#e-email'), container.querySelector('#e-email-dica'));
  abrirCad.addEventListener('click', () => {
    formCli.hidden = false; abrirCad.hidden = true;
    container.querySelector('#e-nome').focus();
  });
  container.querySelector('#cancelar-cli').addEventListener('click', () => {
    formCli.hidden = true; abrirCad.hidden = false;
  });

  // Copiar os dados de contato para o bloco de contrato (mesma pessoa).
  container.querySelector('#copiar-contato').addEventListener('click', () => {
    const v = (id) => container.querySelector(id).value;
    container.querySelector('#c-nome').value = v('#e-nome');
    container.querySelector('#c-doc').value = v('#e-documento');
    container.querySelector('#c-endereco').value = v('#e-endereco');
  });

  formCli.addEventListener('submit', async (e) => {
    e.preventDefault();
    erroCli.hidden = true;
    const val = (id) => container.querySelector(id).value.trim() || null;
    const nome = val('#e-nome');
    if (!nome) { erroCli.textContent = 'Informe o nome do cliente.'; erroCli.hidden = false; return; }
    const emailCheck = validarEmail(container.querySelector('#e-email').value);
    if (!emailCheck.ok) { erroCli.textContent = emailCheck.erro; erroCli.hidden = false; container.querySelector('#e-email').focus(); return; }

    const registro = {
      nome,
      email: val('#e-email'),
      telefone: val('#e-telefone'),
      documento: val('#e-documento'),
      cidade: val('#e-cidade'),
      endereco: val('#e-endereco'),
      observacoes: val('#e-observacoes'),
      contrato_nome: val('#c-nome'),
      contrato_documento: val('#c-doc'),
      contrato_rg: val('#c-rg'),
      contrato_nacionalidade: val('#c-nacionalidade'),
      contrato_estadocivil: val('#c-estadocivil'),
      contrato_profissao: val('#c-profissao'),
      contrato_endereco: val('#c-endereco'),
    };

    const btn = formCli.querySelector('button[type="submit"]');
    btn.disabled = true; btn.textContent = 'Salvando…';
    try {
      await criarClienteEscritorio(registro);
    } catch (err) {
      btn.disabled = false; btn.textContent = 'Salvar cliente';
      erroCli.textContent = err?.message || 'Não foi possível salvar.'; erroCli.hidden = false;
      return;
    }
    renderClientes(container);
  });

  // ---- Gerar convite → link ----
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

  // ---- Excluir cliente ----
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
      ${dadosContrato(c)}
      ${c.observacoes ? `<div class="muted cliente-dados">${esc(c.observacoes)}</div>` : ''}
      <div class="cliente-data muted">Cadastrado em ${dataBR(c.criadoEm ? new Date(c.criadoEm).toISOString() : '')}</div>
    </div>`).join('');
}

// Mostra os dados de contrato, se houver algum preenchido.
function dadosContrato(c) {
  const linhas = [
    c.contrato_nome && `Nome: ${esc(c.contrato_nome)}`,
    c.contrato_documento && `CPF/CNPJ: ${esc(c.contrato_documento)}`,
    c.contrato_rg && `RG/IE: ${esc(c.contrato_rg)}`,
    c.contrato_nacionalidade && esc(c.contrato_nacionalidade),
    c.contrato_estadocivil && esc(c.contrato_estadocivil),
    c.contrato_profissao && esc(c.contrato_profissao),
    c.contrato_endereco && `End.: ${esc(c.contrato_endereco)}`,
  ].filter(Boolean);
  if (!linhas.length) return '';
  return `<div class="cliente-dados muted"><strong>Contrato:</strong> ${linhas.join(' · ')}</div>`;
}
