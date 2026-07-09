import './styles.css';
import { supabase, configurado } from './supabaseClient.js';
import { renderLogin } from './views/login.js';
import { renderObras } from './views/obras.js';
import { renderObra } from './views/obra.js';
import { renderPublica } from './views/publica.js';
import { renderClientes } from './views/clientes.js';
import { renderCadastroCliente } from './views/cadastroCliente.js';
import { renderFornecedores } from './views/fornecedores.js';

const app = document.getElementById('app');

// Navegação interna sem recarregar a página.
export function navegar(caminho) {
  history.pushState({}, '', caminho);
  rotear();
}

window.addEventListener('popstate', rotear);

// Liga cliques em <a data-link> ao roteador (links internos).
document.addEventListener('click', (e) => {
  const a = e.target.closest('a[data-link]');
  if (!a) return;
  e.preventDefault();
  navegar(a.getAttribute('href'));
});

async function rotear() {
  const path = window.location.pathname;

  // 1) Rotas públicas (sem login):
  //    /obra/{slug} — painel do cliente
  const mPublica = path.match(/^\/obra\/([^/]+)\/?$/);
  if (mPublica) {
    return renderPublica(app, decodeURIComponent(mPublica[1]));
  }
  //    /cadastro/{token} — autopreenchimento do cliente
  const mCadastro = path.match(/^\/cadastro\/([^/]+)\/?$/);
  if (mCadastro) {
    return renderCadastroCliente(app, decodeURIComponent(mCadastro[1]));
  }

  // Sem as chaves do Supabase nada funciona — avisa em vez de quebrar.
  if (!configurado) {
    return renderConfigFaltando(app);
  }

  // 2) Rotas internas — exigem login da arquiteta.
  // Protege contra travamento (ex.: banco gratuito "acordando"): se a
  // verificação de sessão demorar demais ou falhar, cai no login em vez de
  // deixar a tela em branco.
  let session = null;
  try {
    const res = await Promise.race([
      supabase.auth.getSession(),
      new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 8000)),
    ]);
    session = res?.data?.session ?? null;
  } catch {
    session = null;
  }
  if (!session) {
    return renderLogin(app);
  }

  const mObra = path.match(/^\/painel\/([^/]+)\/?$/);
  if (mObra) {
    return renderObra(app, mObra[1]);
  }

  if (path === '/clientes' || path === '/clientes/') {
    return renderClientes(app);
  }

  if (path === '/fornecedores' || path === '/fornecedores/') {
    return renderFornecedores(app);
  }

  // Padrão: lista de obras.
  return renderObras(app);
}

function renderConfigFaltando(container) {
  container.innerHTML = `
    <div class="auth-wrap">
      <div class="card auth-card">
        <h1 class="logo">Painel de Obra</h1>
        <p class="erro" style="display:block">Configuração incompleta.</p>
        <p class="muted">
          Defina <code>VITE_SUPABASE_URL</code> e
          <code>VITE_SUPABASE_ANON_KEY</code> no arquivo <code>.env</code>
          (ou nas variáveis de ambiente do Netlify) e recarregue.
        </p>
      </div>
    </div>`;
}

// Quando a arquiteta faz login/logout, re-roteia automaticamente.
if (configurado) {
  supabase.auth.onAuthStateChange(() => rotear());
}

rotear();
