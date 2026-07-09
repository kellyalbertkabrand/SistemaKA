import { supabase } from '../supabaseClient.js';
import { esc, dataBR } from '../lib/format.js';
import { logoPlaceholder } from '../lib/marca.js';

// Tela interna: lista de clientes + gerar link de autopreenchimento.
export async function renderClientes(container) {
  container.innerHTML = `<div class="app"><p class="muted center">Carregando…</p></div>`;

  const [cliRes, obrasRes] = await Promise.all([
    supabase.from('clientes').select('*').order('created_at', { ascending: false }),
    supabase.from('obras').select('id, nome').order('created_at', { ascending: false }),
  ]);

  // Fase 2 ainda não ativada no banco → orienta a rodar o SQL.
  if (cliRes.error) {
    container.innerHTML = `
      <div class="app">
        <a class="voltar" data-link href="/">← Painel</a>
        <div class="card">
          <h2>Ative o Cadastro de Clientes</h2>
          <p class="muted">Para usar esta função, rode o script
            <code>supabase/fase2-clientes.sql</code> no SQL Editor do Supabase e recarregue esta página.</p>
          <p class="erro" style="display:block">${esc(cliRes.error.message)}</p>
        </div>
      </div>`;
    return;
  }

  const clientes = cliRes.data || [];
  const obras = obrasRes.data || [];

  container.innerHTML = `
    <div class="app">
      <header class="topo">
        <div class="topo-marca">
          ${logoPlaceholder('logo-ph-sm')}
          <div>
            <a class="voltar" data-link href="/">← Painel</a>
            <h1 class="logo">Clientes</h1>
          </div>
        </div>
        <button class="btn btn-ghost" id="sair">Sair</button>
      </header>

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
    await supabase.auth.signOut();
  });

  // Gerar convite → link
  container.querySelector('#gerar-link').addEventListener('click', async () => {
    const rotulo = container.querySelector('#c-rotulo').value.trim() || null;
    const obra_id = container.querySelector('#c-obra').value || null;
    const alvo = container.querySelector('#link-gerado');
    alvo.innerHTML = `<p class="muted">Gerando…</p>`;
    const { data, error } = await supabase
      .from('convites')
      .insert({ rotulo, obra_id })
      .select()
      .single();
    if (error) {
      alvo.innerHTML = `<p class="erro" style="display:block">${esc(error.message)}</p>`;
      return;
    }
    const link = `${window.location.origin}/cadastro/${data.token}`;
    alvo.innerHTML = `
      <div class="preview-card">
        <p class="muted">Link do cadastro${rotulo ? ' — ' + esc(rotulo) : ''}:</p>
        <p class="mono">${esc(link)}</p>
        <div class="row-end">
          <button class="btn btn-mini" id="copiar-cad">Copiar link</button>
          <a class="btn btn-mini" href="/cadastro/${esc(data.token)}" target="_blank" rel="noopener">Abrir</a>
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
      await supabase.from('clientes').delete().eq('id', b.getAttribute('data-del-cli'));
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
      <div class="cliente-data muted">Cadastrado em ${dataBR(c.created_at)}</div>
    </div>`).join('');
}
