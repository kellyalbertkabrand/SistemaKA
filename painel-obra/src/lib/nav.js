import { logoImg } from './marca.js';

// Barra de navegação padrão do sistema (estilo site), com menu hambúrguer no
// celular. Usada em todas as telas internas. Recebe qual item está ativo:
// 'painel' | 'clientes' | 'fornecedores'.
// O menu no mobile abre/fecha com um checkbox (sem JS) e fecha sozinho ao
// navegar (a tela é re-renderizada).
export function navBar(ativo = '') {
  const item = (href, rotulo, chave) =>
    `<a data-link href="${href}" class="nav-item${ativo === chave ? ' ativo' : ''}">${rotulo}</a>`;
  return `
  <nav class="nav">
    <a class="nav-brand" data-link href="/">
      ${logoImg('logo-schramm-nav')}
      <span class="nav-titulo">Controle de Obras</span>
    </a>
    <input type="checkbox" id="nav-toggle" class="nav-toggle" />
    <label for="nav-toggle" class="nav-burger" aria-label="Menu">☰</label>
    <div class="nav-links">
      ${item('/obras', 'Painel', 'painel')}
      ${item('/clientes', 'Clientes', 'clientes')}
      ${item('/fornecedores', 'Fornecedores', 'fornecedores')}
      <button class="nav-sair" id="sair">Sair</button>
    </div>
  </nav>`;
}
