import {
  listarClientes, listarObras, listarContratos, obterContrato,
  criarContrato, atualizarContrato, excluirContrato, sair,
} from '../dados.js';
import { esc, dataBR } from '../lib/format.js';
import { navBar } from '../lib/nav.js';
import { MODELOS, modeloPorId } from '../lib/contratos.js';

// Estilo do contrato — usado na tela, na impressão (PDF) e no Word baixado.
const ESTILO_CONTRATO = `
  .contrato-doc { font-family: Georgia, 'Times New Roman', serif; color:#1c1c1c; font-size:11pt; line-height:1.5; text-align:justify; }
  .contrato-doc .contrato-titulo { text-align:center; font-size:13pt; font-weight:bold; margin:0 0 18px; }
  .contrato-doc .contrato-clausula { font-size:11pt; font-weight:bold; margin:16px 0 6px; text-align:left; }
  .contrato-doc p { margin:0 0 9px; }
  .contrato-doc .contrato-banco { white-space:pre-line; font-family:inherit; margin:4px 0 9px; }
  .contrato-doc .contrato-assinaturas { display:flex; gap:32px; justify-content:space-between; margin-top:48px; text-align:center; }
  .contrato-doc .contrato-assinaturas > div { flex:1; }
  .contrato-doc .linha-assinatura { border-top:1px solid #000; margin:0 0 4px; }
  .contrato-doc .contrato-assinaturas p { margin:0; }
  .contrato-doc .contrato-testemunhas { margin-top:28px; }
  .contrato-doc .contrato-fim { break-inside:avoid; page-break-inside:avoid; }
`;

const documentoCompleto = (innerHTML) => `<div class="contrato-doc">${innerHTML}</div>`;

export async function renderContratos(container, opts = {}) {
  container.innerHTML = `<div class="app"><p class="muted center">Carregando…</p></div>`;

  let clientes = [], obras = [], contratos = [];
  try {
    [clientes, obras, contratos] = await Promise.all([
      listarClientes().catch(() => []),
      listarObras().catch(() => []),
      listarContratos().catch(() => []),
    ]);
  } catch { /* segue com listas vazias */ }
  clientes = clientes || []; obras = obras || []; contratos = contratos || [];

  // Estado da tela.
  let modeloId = null;
  let dados = {};
  let contratoId = null;   // id do registro salvo (null = novo)
  let corpoCarregado = null; // HTML editado salvo (ao reabrir)
  let clienteId = null, clienteNome = null, obraId = null, obraNome = null;

  const hoje = () => {
    const d = new Date();
    const meses = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
    return `${d.getDate()} de ${meses[d.getMonth()]} de ${d.getFullYear()}`;
  };
  const chrome = (miolo) => `${navBar('contratos')}<div class="app"><div class="pagina-topo"><h1>Contratos</h1></div>${miolo}</div>`;

  function resetNovo() { modeloId = null; dados = {}; contratoId = null; corpoCarregado = null; clienteId = clienteNome = obraId = obraNome = null; }

  // ---- Passo 1: modelos + contratos salvos ----
  function telaModelos() {
    const salvos = contratos.length ? `
      <section class="card">
        <h2>Contratos salvos</h2>
        <div class="contrato-lista">
          ${contratos.map((c) => `
            <div class="contrato-item">
              <div class="contrato-item-info">
                <strong>${esc(c.titulo || 'Contrato')}</strong>
                <span class="muted">${esc((modeloPorId(c.modeloId).nome) || '')}${c.obraNome ? ' · ' + esc(c.obraNome) : ''} · ${dataBR(new Date(c.atualizadoEm || c.criadoEm).toISOString())}</span>
              </div>
              <div class="row-end">
                <button class="btn btn-mini" data-abrir="${esc(c.id)}">Abrir</button>
                <button class="btn btn-x" data-del="${esc(c.id)}" title="Excluir">×</button>
              </div>
            </div>`).join('')}
        </div>
      </section>` : '';
    container.innerHTML = chrome(`
      <p class="muted" style="margin:.1rem 0 .8rem">Escolha o modelo, preencha os dados (o cliente cadastrado preenche sozinho), edite na tela e salve. Os contratos salvos ficam guardados aqui para reabrir e ajustar depois.</p>
      <section class="card">
        <h2>Novo contrato</h2>
        <div class="contrato-modelos">
          ${MODELOS.map((m) => `
            <button class="contrato-modelo-card" data-modelo="${esc(m.id)}">
              <strong>${esc(m.nome)}</strong>
              <span class="muted">${esc(m.resumo)}</span>
            </button>`).join('')}
        </div>
      </section>
      ${salvos}`);
    liga();
  }

  // ---- Passo 2: preencher dados ----
  function telaDados() {
    const m = modeloPorId(modeloId);
    if (dados.dataExt == null) dados.dataExt = hoje();
    const campoHtml = (c) => {
      const val = dados[c.id] != null ? dados[c.id] : (c.valor != null ? c.valor : '');
      const cls = c.full ? 'full' : '';
      const inner = c.tipo === 'textarea'
        ? `<textarea class="ct-campo" data-campo="${esc(c.id)}" rows="3">${esc(String(val))}</textarea>`
        : `<input class="ct-campo" data-campo="${esc(c.id)}" type="${c.tipo === 'number' ? 'number' : 'text'}" ${c.tipo === 'number' ? 'step="0.01" min="0"' : ''} value="${esc(String(val))}" ${c.placeholder ? `placeholder="${esc(c.placeholder)}"` : ''} />`;
      return `<label class="${cls}">${esc(c.rotulo)}${inner}</label>`;
    };
    container.innerHTML = chrome(`
      <div class="row-between">
        <button class="btn btn-mini btn-ghost" id="ct-voltar-modelos">← Voltar</button>
        <strong>${esc(m.nome)}</strong>
      </div>
      <section class="card">
        <div class="form-grid">
          <label class="full">Preencher com o cadastro do cliente
            <select id="ct-cliente">
              <option value="">— Selecione um cliente (opcional) —</option>
              ${clientes.map((c) => `<option value="${esc(c.id)}" ${clienteId === c.id ? 'selected' : ''}>${esc(c.contrato_nome || c.nome || 'Sem nome')}</option>`).join('')}
            </select>
          </label>
          <label class="full">Vincular a uma obra (opcional)
            <select id="ct-obra">
              <option value="">— Sem obra —</option>
              ${obras.map((o) => `<option value="${esc(o.id)}" ${obraId === o.id ? 'selected' : ''}>${esc(o.nome)}</option>`).join('')}
            </select>
          </label>
        </div>
        <form id="ct-form" class="form-grid" style="margin-top:.5rem">
          ${m.campos.map(campoHtml).join('')}
        </form>
        <div class="row-end" style="margin-top:.8rem">
          <button class="btn btn-primary" id="ct-gerar">Gerar contrato</button>
        </div>
      </section>`);
    liga();
  }

  // ---- Passo 3: contrato (editável) ----
  function telaContrato() {
    const m = modeloPorId(modeloId);
    const html = corpoCarregado || documentoCompleto(m.documento(dados));
    container.innerHTML = chrome(`
      <div class="contrato-toolbar">
        <button class="btn btn-mini btn-ghost" id="ct-voltar-dados">← Editar dados</button>
        <span class="row-end">
          <button class="btn btn-mini" id="ct-editar">✏️ Editar contrato</button>
          <button class="btn btn-mini" id="ct-salvar">💾 Salvar</button>
          <button class="btn btn-mini" id="ct-salvar-pdf">💾 Salvar e PDF</button>
          <button class="btn btn-mini" id="ct-imprimir">🖨 Imprimir / PDF</button>
          <button class="btn btn-mini btn-primary" id="ct-word">⬇ Baixar Word</button>
        </span>
      </div>
      <div class="card contrato-folha">
        <div id="ct-editavel" class="contrato-editavel" contenteditable="false">${html}</div>
      </div>
      <style>${ESTILO_CONTRATO}</style>`);
    liga();
  }

  // ---- Eventos ----
  function liga() {
    const s = container.querySelector('#sair'); if (s) s.addEventListener('click', () => sair());

    container.querySelectorAll('[data-modelo]').forEach((b) => b.addEventListener('click', () => {
      resetNovo(); modeloId = b.getAttribute('data-modelo'); telaDados();
    }));
    container.querySelectorAll('[data-abrir]').forEach((b) => b.addEventListener('click', () => abrirSalvo(b.getAttribute('data-abrir'))));
    container.querySelectorAll('[data-del]').forEach((b) => b.addEventListener('click', async () => {
      if (!confirm('Excluir este contrato salvo?')) return;
      await excluirContrato(b.getAttribute('data-del'));
      contratos = await listarContratos().catch(() => contratos.filter((c) => c.id !== b.getAttribute('data-del')));
      telaModelos();
    }));

    const voltarModelos = container.querySelector('#ct-voltar-modelos');
    if (voltarModelos) voltarModelos.addEventListener('click', telaModelos);

    container.querySelectorAll('.ct-campo').forEach((el) => {
      el.addEventListener('input', () => { dados[el.getAttribute('data-campo')] = el.value; });
    });

    const selCli = container.querySelector('#ct-cliente');
    if (selCli) selCli.addEventListener('change', () => {
      const c = clientes.find((x) => x.id === selCli.value);
      clienteId = c ? c.id : null; clienteNome = c ? (c.contrato_nome || c.nome) : null;
      if (!c) return;
      const m = modeloPorId(modeloId);
      m.campos.forEach((campo) => {
        if (!campo.auto) return;
        const chave = campo.auto.find((k) => c[k]);
        if (chave) {
          dados[campo.id] = c[chave];
          const el = container.querySelector(`.ct-campo[data-campo="${campo.id}"]`);
          if (el) el.value = c[chave];
        }
      });
    });
    const selObra = container.querySelector('#ct-obra');
    if (selObra) selObra.addEventListener('change', () => {
      const o = obras.find((x) => x.id === selObra.value);
      obraId = o ? o.id : null; obraNome = o ? o.nome : null;
    });

    const gerar = container.querySelector('#ct-gerar');
    if (gerar) gerar.addEventListener('click', () => {
      const m = modeloPorId(modeloId);
      m.campos.forEach((c) => { if (dados[c.id] == null && c.valor != null) dados[c.id] = c.valor; });
      corpoCarregado = null; // gera do zero a partir dos dados
      telaContrato();
    });

    const voltarDados = container.querySelector('#ct-voltar-dados');
    if (voltarDados) voltarDados.addEventListener('click', telaDados);

    const btnEditar = container.querySelector('#ct-editar');
    const editavel = container.querySelector('#ct-editavel');
    if (btnEditar && editavel) btnEditar.addEventListener('click', () => {
      const ligando = editavel.getAttribute('contenteditable') !== 'true';
      editavel.setAttribute('contenteditable', ligando ? 'true' : 'false');
      editavel.classList.toggle('editando', ligando);
      btnEditar.classList.toggle('btn-primary', ligando);
      btnEditar.textContent = ligando ? '✓ Concluir edição' : '✏️ Editar contrato';
      if (ligando) editavel.focus();
    });

    const btnSalvar = container.querySelector('#ct-salvar');
    if (btnSalvar) btnSalvar.addEventListener('click', () => salvar(btnSalvar));
    const btnSalvarPdf = container.querySelector('#ct-salvar-pdf');
    if (btnSalvarPdf) btnSalvarPdf.addEventListener('click', () => salvar(btnSalvarPdf, imprimir));
    const btnImp = container.querySelector('#ct-imprimir');
    if (btnImp) btnImp.addEventListener('click', imprimir);
    const btnWord = container.querySelector('#ct-word');
    if (btnWord) btnWord.addEventListener('click', baixarWord);
  }

  async function abrirSalvo(id) {
    const c = contratos.find((x) => x.id === id) || await obterContrato(id);
    if (!c) return;
    modeloId = c.modeloId; dados = c.dados || {}; contratoId = c.id;
    corpoCarregado = c.corpoHtml || null;
    clienteId = c.clienteId || null; clienteNome = c.clienteNome || null;
    obraId = c.obraId || null; obraNome = c.obraNome || null;
    telaContrato();
  }

  async function salvar(botao, depois) {
    const corpoHtml = conteudoAtual();
    const titulo = tituloContrato();
    const registro = { modeloId, titulo, dados, corpoHtml, clienteId, clienteNome, obraId, obraNome };
    const rot = botao.textContent; botao.disabled = true; botao.textContent = 'Salvando…';
    try {
      if (contratoId) await atualizarContrato(contratoId, registro);
      else contratoId = await criarContrato(registro);
      contratos = await listarContratos().catch(() => contratos);
      botao.textContent = '✓ Salvo';
      if (typeof depois === 'function') depois();
      setTimeout(() => { botao.disabled = false; botao.textContent = rot; }, 1500);
    } catch (err) {
      botao.disabled = false; botao.textContent = rot;
      alert('Não foi possível salvar: ' + (err?.message || err) + '\n\n(Se aparecer erro de permissão, publique as Regras do Firestore com a coleção "contratos".)');
    }
  }

  function conteudoAtual() {
    const el = container.querySelector('#ct-editavel');
    return el ? el.innerHTML : '';
  }
  // "Contrato entre [contratante] e Schramm Engenharia e Projetos" — usado no
  // título salvo e no nome do arquivo baixado.
  function tituloContrato() {
    const contratante = (dados.nome || clienteNome || 'Contratante').trim();
    return `Contrato entre ${contratante} e Schramm Engenharia e Projetos`;
  }
  function nomeArquivo() {
    return tituloContrato().replace(/[\\/:*?"<>|]+/g, '').replace(/\s+/g, ' ').trim().slice(0, 120);
  }

  function imprimir() {
    const w = window.open('', '_blank');
    if (!w) { alert('Permita pop-ups para imprimir, ou use "Baixar Word".'); return; }
    w.document.write(`<!doctype html><html lang="pt-br"><head><meta charset="utf-8"><title>Contrato</title>
      <style>
        @page { margin: 2.2cm 2cm; @bottom-right { content: "Página " counter(page) " de " counter(pages); font: 9pt Georgia, serif; color: #555; } }
        body { margin: 0; }
        .ct-topbar { position: sticky; top: 0; display: flex; gap: 10px; justify-content: space-between; align-items: center; flex-wrap: wrap; padding: 10px 14px; background: #f5f2ec; border-bottom: 1px solid #ddd6c8; font-family: Inter, -apple-system, system-ui, sans-serif; }
        .ct-topbar button { font: inherit; font-size: 15px; padding: 9px 14px; border: 1px solid #cfc7ba; background: #fff; border-radius: 8px; cursor: pointer; }
        .ct-topbar .ct-voltar { border-color: #c65a2e; color: #c65a2e; font-weight: 600; }
        .ct-corpo { padding: 0 14px; }
        @media print { .no-print { display: none !important; } .ct-corpo { padding: 0; } }
        ${ESTILO_CONTRATO}
      </style></head>
      <body>
        <div class="ct-topbar no-print">
          <button class="ct-voltar" onclick="window.close()">← Voltar ao sistema</button>
          <button onclick="window.print()">🖨 Imprimir / Salvar PDF</button>
        </div>
        <div class="ct-corpo">${conteudoAtual()}</div>
      </body></html>`);
    w.document.close(); w.focus();
    setTimeout(() => { try { w.print(); } catch (e) { /* imprime manual pelo botão */ } }, 400);
  }

  function baixarWord() {
    const rodape = `<div style='mso-element:footer' id='rodape1'><p class=MsoFooter style='text-align:right;font-size:9.0pt;color:#555'>Página <span style='mso-field-code:" PAGE "'></span> de <span style='mso-field-code:" NUMPAGES "'></span></p></div>`;
    const html = `<!doctype html><html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40"><head><meta charset="utf-8">
      <style>
        @page Section1 { size: 21.0cm 29.7cm; margin: 2.2cm 2.0cm; mso-footer: rodape1; }
        div.Section1 { page: Section1; }
        ${ESTILO_CONTRATO}
        body { font-family: Georgia, serif; }
      </style></head>
      <body><div class="Section1">${conteudoAtual()}${rodape}</div></body></html>`;
    const blob = new Blob(['﻿', html], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = nomeArquivo() + '.doc';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  // Abrir direto um contrato salvo via /contratos?abrir=<id> (link do painel da obra).
  const abrirId = opts.abrirId || new URLSearchParams(window.location.search).get('abrir');
  if (abrirId && contratos.some((c) => c.id === abrirId)) abrirSalvo(abrirId);
  else telaModelos();
}
