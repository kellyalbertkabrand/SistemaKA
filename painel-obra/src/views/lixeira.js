import { listarLixeira, restaurarDaLixeira, excluirDaLixeira, esvaziarLixeira, sair } from '../dados.js';
import { dataBR, esc } from '../lib/format.js';
import { navBar } from '../lib/nav.js';

// Lixeira geral: itens excluídos (etapas e lançamentos) de todas as obras.
// A arquiteta pode Restaurar (volta para onde estava) ou Excluir de vez, e
// Esvaziar a lixeira quando quiser.
export async function renderLixeira(container) {
  container.innerHTML = `${navBar('lixeira')}<div class="app"><p class="muted center">Carregando…</p></div>`;
  container.querySelector('#sair')?.addEventListener('click', () => sair());

  let itens = [];
  try {
    itens = await listarLixeira();
  } catch (err) {
    container.querySelector('.app').innerHTML = `<p class="erro" style="display:block">Não foi possível abrir a lixeira: ${esc(err?.message || String(err))}</p>`;
    return;
  }

  const icone = (t) => (t === 'etapa' ? '🧱' : '💸');
  const tipoLabel = (t) => (t === 'etapa' ? 'Etapa' : 'Lançamento');

  const lista = itens.length
    ? `<div class="lixo-lista">
        ${itens.map((it) => `
          <div class="lixo-item" data-id="${esc(it.id)}">
            <span class="lixo-icone">${icone(it.tipo)}</span>
            <span class="lixo-info">
              <strong>${esc(it.rotulo || tipoLabel(it.tipo))}</strong>
              <small class="muted">${tipoLabel(it.tipo)}${it.obraNome ? ' · ' + esc(it.obraNome) : ''} · excluído em ${it.excluidoEm ? dataBR(new Date(it.excluidoEm).toISOString()) : '—'}</small>
            </span>
            <span class="lixo-acoes">
              <button class="btn btn-mini btn-primary" data-restaurar="${esc(it.id)}">↩ Restaurar</button>
              <button class="btn btn-mini" data-excluir="${esc(it.id)}" title="Excluir definitivamente">×</button>
            </span>
          </div>`).join('')}
      </div>`
    : `<p class="muted">A lixeira está vazia. Itens que você excluir (etapas e lançamentos) aparecem aqui e podem ser restaurados.</p>`;

  container.querySelector('.app').innerHTML = `
    <div class="pagina-topo">
      <div>
        <a class="voltar" data-link href="/">← Início</a>
        <h1>🗑 Lixeira</h1>
        <p class="muted">${itens.length} ${itens.length === 1 ? 'item excluído' : 'itens excluídos'}. Restaure o que precisar ou esvazie de tempos em tempos.</p>
      </div>
      ${itens.length ? `<button class="btn btn-perigo" id="esvaziar">🗑 Esvaziar lixeira</button>` : ''}
    </div>
    <section class="card">${lista}</section>`;

  const recarregar = () => renderLixeira(container);

  container.querySelectorAll('[data-restaurar]').forEach((b) => {
    b.addEventListener('click', async () => {
      b.disabled = true; b.textContent = 'Restaurando…';
      try { await restaurarDaLixeira(b.getAttribute('data-restaurar')); recarregar(); }
      catch (err) { b.disabled = false; b.textContent = '↩ Restaurar'; alert('Erro ao restaurar: ' + (err?.message || err)); }
    });
  });

  container.querySelectorAll('[data-excluir]').forEach((b) => {
    b.addEventListener('click', async () => {
      if (!confirm('Excluir este item DEFINITIVAMENTE? Esta ação não pode ser desfeita.')) return;
      b.disabled = true;
      try { await excluirDaLixeira(b.getAttribute('data-excluir')); recarregar(); }
      catch (err) { b.disabled = false; alert('Erro ao excluir: ' + (err?.message || err)); }
    });
  });

  const esvaziar = container.querySelector('#esvaziar');
  esvaziar?.addEventListener('click', async () => {
    if (!confirm('Esvaziar a lixeira? Todos os itens serão excluídos DEFINITIVAMENTE e não poderão ser restaurados.')) return;
    esvaziar.disabled = true; esvaziar.textContent = 'Esvaziando…';
    try { await esvaziarLixeira(); recarregar(); }
    catch (err) { esvaziar.disabled = false; esvaziar.textContent = '🗑 Esvaziar lixeira'; alert('Erro ao esvaziar: ' + (err?.message || err)); }
  });
}
