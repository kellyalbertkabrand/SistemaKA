import './styles.css';
import { supabase, configurado } from './supabaseClient.js';
import { renderLogin } from './views/login.js';
import { renderObras } from './views/obras.js';
import { renderObra } from './views/obra.js';
import { renderPublica } from './views/publica.js';

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

  // 1) Rota pública do cliente: /obra/{slug} — sem login.
  const mPublica = path.match(/^\/obra\/([^/]+)\/?$/);
  if (mPublica) {
    return renderPublica(app, decodeURIComponent(mPublica[1]));
  }

  // Sem as chaves do Supabase nada funciona — avisa em vez de quebrar.
  if (!configurado) {
    return renderConfigFaltando(app);
  }

  // 2) Rotas internas — exigem login da arquiteta.
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    return renderLogin(app);
  }

  const mObra = path.match(/^\/painel\/([^/]+)\/?$/);
  if (mObra) {
    return renderObra(app, mObra[1]);
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
