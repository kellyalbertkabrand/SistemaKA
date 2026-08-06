import { sair } from '../dados.js';
import { navegar } from '../main.js';
import { logoImg } from '../lib/marca.js';

// Tela inicial (home) do sistema: um menu-lançador com os botões grandes
// Painel de Obras, Clientes e Fornecedores. É a primeira tela após o login.
export function renderHome(container) {
  const botoes = [
    { href: '/obras', icone: '🏗️', titulo: 'Painel de Obras', desc: 'Obras, KPIs, etapas e lançamentos' },
    { href: '/financeiro', icone: '💳', titulo: 'Financeiro', desc: 'Total a pagar, recebido e saldo por obra' },
    { href: '/clientes', icone: '👥', titulo: 'Clientes', desc: 'Cadastro e dados para contrato' },
    { href: '/fornecedores', icone: '🏢', titulo: 'Fornecedores', desc: 'Sua lista de fornecedores' },
  ];

  container.innerHTML = `
    <div class="home-wrap">
      <header class="home-cabecalho">
        ${logoImg('home-logo')}
      </header>

      <main class="home-conteudo">
        <h1 class="home-titulo">Controle de Obras</h1>

        <nav class="home-botoes">
          ${botoes.map((b) => `
            <a class="home-botao" data-link href="${b.href}">
              <span class="home-botao-icone">${b.icone}</span>
              <span class="home-botao-txt">
                <strong>${b.titulo}</strong>
                <small>${b.desc}</small>
              </span>
              <span class="home-botao-seta">→</span>
            </a>`).join('')}
        </nav>

        <button class="home-sair" id="sair">Sair</button>
      </main>
    </div>`;

  container.querySelector('#sair').addEventListener('click', async () => {
    await sair();
  });
}
