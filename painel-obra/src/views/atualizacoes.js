import { esc } from '../lib/format.js';
import { caixaLogo } from '../lib/marca.js';
import { VERSAO, CHANGELOG } from '../lib/changelog.js';

// Página pública (sem login) com o histórico de atualizações do sistema.
// Pode ser enviada ao cliente para mostrar os ajustes contínuos.
export function renderAtualizacoes(container) {
  document.title = 'Atualizações do sistema';
  container.innerHTML = `
    <div class="publica">
      <header class="pub-logo-header">${caixaLogo('caixa-logo-cliente')}</header>

      <section class="pub-hero">
        <p class="pub-marca">Melhorias contínuas</p>
        <h1>Atualizações do sistema</h1>
        <p class="pub-cliente">Versão ${esc(VERSAO)}</p>
      </section>

      <section class="pub-bloco">
        <p class="muted" style="margin:0 0 1rem">
          Este sistema recebe ajustes e melhorias de forma contínua. Abaixo, o que
          já foi implementado, do mais recente para o mais antigo.
        </p>
        ${CHANGELOG.map((v) => `
          <div class="atu-bloco">
            <div class="atu-cab">
              <span class="atu-data">${esc(v.data)}</span>
              ${v.titulo ? `<span class="atu-titulo">${esc(v.titulo)}</span>` : ''}
            </div>
            <ul class="atu-lista">
              ${(v.itens || []).map((i) => `<li>${esc(i)}</li>`).join('')}
            </ul>
          </div>`).join('')}
      </section>

      <footer class="pub-rodape">
        <p class="pub-rodape-nome">SCHRAMM ARQUITETURA E ENGENHARIA</p>
        <p class="muted pub-rodape-nota">Sistema de gestão de obras — atualizações contínuas.</p>
      </footer>
    </div>`;
}
