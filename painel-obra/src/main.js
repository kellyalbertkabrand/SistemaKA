import './styles.css';
import { configurado } from './firebase.js';
import { aoMudarAuth, usuarioAtual } from './dados.js';
import { renderLogin } from './views/login.js';
import { renderObras } from './views/obras.js';
import { renderObra } from './views/obra.js';
import { renderPublica } from './views/publica.js';
import { renderClientes } from './views/clientes.js';
import { renderCadastroCliente } from './views/cadastroCliente.js';
import { renderFornecedores } from './views/fornecedores.js';

const app = document.getElementById('app');

// Firebase resolve a sessão salva de forma assíncrona. Até resolver, seguramos
// as rotas internas numa telinha de "Carregando" para não piscar o login.
let authResolvido = !configurado;

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

function rotear() {
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

  // Sem a config do Firebase nada interno funciona — avisa em vez de quebrar.
  if (!configurado) {
    return renderConfigFaltando(app);
  }

  // Espera o Firebase confirmar se há sessão salva antes de decidir a rota.
  if (!authResolvido) {
    app.innerHTML = `<div class="app"><p class="muted center">Carregando…</p></div>`;
    return;
  }

  // 2) Rotas internas — exigem login da arquiteta.
  if (!usuarioAtual()) {
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
          Defina as variáveis <code>VITE_FIREBASE_*</code> no arquivo
          <code>.env</code> (ou nas variáveis de ambiente do Netlify) e recarregue.
        </p>
      </div>
    </div>`;
}

// Quando a arquiteta faz login/logout — e na 1ª resolução da sessão — re-roteia.
if (configurado) {
  aoMudarAuth(() => {
    authResolvido = true;
    rotear();
  });
}

rotear();
