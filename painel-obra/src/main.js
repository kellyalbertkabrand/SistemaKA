import './styles.css';
import { configurado } from './firebase.js';
import { aoMudarAuth, usuarioAtual } from './dados.js';
import { renderLogin } from './views/login.js';
import { renderHome } from './views/home.js';
import { renderObras } from './views/obras.js';
import { renderObra } from './views/obra.js';
import { renderPublica } from './views/publica.js';
import { renderClientes } from './views/clientes.js';
import { renderCadastroCliente } from './views/cadastroCliente.js';
import { renderFornecedores } from './views/fornecedores.js';

const app = document.getElementById('app');

// PWA — "adicionar à tela de início": nas páginas PÚBLICAS (link do cliente),
// o atalho precisa abrir a PRÓPRIA página, não a raiz "/". O manifesto padrão
// tem start_url "/", que no Android instala o app abrindo na raiz (cai no login).
// Então nessas rotas trocamos por um manifesto DINÂMICO apontando start_url/scope
// para a própria obra: no Android instala um app de verdade (standalone) que
// abre direto no painel do cliente; no iPhone o atalho usa esta mesma URL.
// Como o manifesto é servido como blob (sem caminho base próprio), TODAS as URLs
// dentro dele precisam ser absolutas.
(function ajustarPWAPublico() {
  try {
    const p = window.location.pathname;
    const ehPublica = /^\/(obra|cadastro|cadastro-fornecedor|briefing)\//.test(p)
      || /^\/atualizacoes\/?$/.test(p);
    if (!ehPublica) return;

    const origem = window.location.origin;
    const urlAtual = origem + p + window.location.search;
    const titulo = (document.title || 'Painel de Obras').trim();
    const manifesto = {
      name: titulo,
      short_name: (titulo.split('—').pop() || titulo).trim().slice(0, 24) || 'Obra',
      description: 'Acompanhamento da obra.',
      start_url: urlAtual,
      scope: origem + p,
      display: 'standalone',
      orientation: 'portrait',
      background_color: '#f5f2ec',
      theme_color: document.querySelector('meta[name="theme-color"]')?.content || '#c65a2e',
      icons: [
        { src: origem + '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
        { src: origem + '/apple-touch-icon.png', sizes: '180x180', type: 'image/png', purpose: 'any' },
      ],
    };
    const blob = new Blob([JSON.stringify(manifesto)], { type: 'application/manifest+json' });
    const href = URL.createObjectURL(blob);
    let link = document.querySelector('link[rel="manifest"]');
    if (!link) {
      link = document.createElement('link');
      link.rel = 'manifest';
      document.head.appendChild(link);
    }
    link.href = href;
  } catch { /* nunca bloqueia o app */ }
})();

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

  if (path === '/obras' || path === '/obras/') {
    return renderObras(app);
  }

  if (path === '/clientes' || path === '/clientes/') {
    return renderClientes(app);
  }

  if (path === '/fornecedores' || path === '/fornecedores/') {
    return renderFornecedores(app);
  }

  // Padrão (home): menu-lançador com os botões.
  return renderHome(app);
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
