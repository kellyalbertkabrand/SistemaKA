import { listarClientes, sair } from '../dados.js';
import { esc } from '../lib/format.js';
import { navBar } from '../lib/nav.js';
import { MODELOS, modeloPorId } from '../lib/contratos.js';

// Estilo do contrato — usado na tela, na impressão (PDF) e no Word baixado, para
// o documento sair sempre com a mesma cara.
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
`;

// Envelope HTML (impressão / Word) com o logo/cabeçalho do escritório.
function documentoCompleto(innerHTML) {
  return `<div class="contrato-doc">${innerHTML}</div>`;
}

export async function renderContratos(container, opts = {}) {
  const manterScroll = opts.scrollY != null;
  const alvoScroll = manterScroll ? opts.scrollY : 0;
  if (!manterScroll) container.innerHTML = `<div class="app"><p class="muted center">Carregando…</p></div>`;

  let clientes = [];
  try { clientes = await listarClientes(); } catch { clientes = []; }
  clientes = clientes || [];

  // Estado da tela: escolher modelo -> preencher dados -> contrato editável.
  let modeloId = null;
  let dados = {}; // valores dos campos

  const hoje = () => {
    const d = new Date();
    const meses = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
    return `${d.getDate()} de ${meses[d.getMonth()]} de ${d.getFullYear()}`;
  };

  const chrome = (miolo) => `${navBar('contratos')}
    <div class="app">
      <div class="pagina-topo"><h1>Contratos</h1></div>
      ${miolo}
    </div>`;

  // ---- Passo 1: escolher o modelo ----
  function telaModelos() {
    container.innerHTML = chrome(`
      <p class="muted" style="margin:.1rem 0 .8rem">Escolha o modelo, preencha os dados (o cliente cadastrado preenche sozinho) e edite o contrato na própria tela antes de baixar ou imprimir.</p>
      <div class="contrato-modelos">
        ${MODELOS.map((m) => `
          <button class="contrato-modelo-card" data-modelo="${esc(m.id)}">
            <strong>${esc(m.nome)}</strong>
            <span class="muted">${esc(m.resumo)}</span>
          </button>`).join('')}
      </div>`);
    liga();
  }

  // ---- Passo 2: preencher os dados ----
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
        <button class="btn btn-mini btn-ghost" id="ct-voltar-modelos">← Modelos</button>
        <strong>${esc(m.nome)}</strong>
      </div>
      <section class="card">
        <label class="full" style="display:block;margin-bottom:.7rem">Preencher com o cadastro do cliente
          <select id="ct-cliente">
            <option value="">— Selecione um cliente (opcional) —</option>
            ${clientes.map((c) => `<option value="${esc(c.id)}">${esc(c.contrato_nome || c.nome || 'Sem nome')}</option>`).join('')}
          </select>
        </label>
        <form id="ct-form" class="form-grid">
          ${m.campos.map(campoHtml).join('')}
        </form>
        <div class="row-end" style="margin-top:.8rem">
          <button class="btn btn-primary" id="ct-gerar">Gerar contrato</button>
        </div>
      </section>`);
    liga();
  }

  // ---- Passo 3: contrato editável ----
  function telaContrato() {
    const m = modeloPorId(modeloId);
    const html = documentoCompleto(m.documento(dados));
    container.innerHTML = chrome(`
      <div class="contrato-toolbar">
        <button class="btn btn-mini btn-ghost" id="ct-voltar-dados">← Editar dados</button>
        <span class="muted contrato-dica">Você pode editar o texto abaixo direto aqui.</span>
        <span class="row-end">
          <button class="btn btn-mini" id="ct-imprimir">🖨 Imprimir / PDF</button>
          <button class="btn btn-mini btn-primary" id="ct-word">⬇ Baixar Word</button>
        </span>
      </div>
      <div class="card contrato-folha">
        <div id="ct-editavel" class="contrato-editavel" contenteditable="true">${html}</div>
      </div>
      <style>${ESTILO_CONTRATO}</style>`);
    liga();
  }

  // ---- Ligações de eventos (por tela) ----
  function liga() {
    const s = container.querySelector('#sair'); if (s) s.addEventListener('click', () => sair());

    container.querySelectorAll('[data-modelo]').forEach((b) => b.addEventListener('click', () => {
      modeloId = b.getAttribute('data-modelo'); dados = {}; telaDados();
    }));

    const voltarModelos = container.querySelector('#ct-voltar-modelos');
    if (voltarModelos) voltarModelos.addEventListener('click', telaModelos);

    // Guarda o que for digitado no estado (para não perder ao gerar/voltar).
    container.querySelectorAll('.ct-campo').forEach((el) => {
      el.addEventListener('input', () => { dados[el.getAttribute('data-campo')] = el.value; });
    });

    // Preencher a partir do cliente.
    const selCli = container.querySelector('#ct-cliente');
    if (selCli) selCli.addEventListener('change', () => {
      const c = clientes.find((x) => x.id === selCli.value);
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

    const gerar = container.querySelector('#ct-gerar');
    if (gerar) gerar.addEventListener('click', () => {
      // Garante defaults dos campos não tocados.
      const m = modeloPorId(modeloId);
      m.campos.forEach((c) => { if (dados[c.id] == null && c.valor != null) dados[c.id] = c.valor; });
      telaContrato();
    });

    const voltarDados = container.querySelector('#ct-voltar-dados');
    if (voltarDados) voltarDados.addEventListener('click', telaDados);

    const btnImp = container.querySelector('#ct-imprimir');
    if (btnImp) btnImp.addEventListener('click', imprimir);
    const btnWord = container.querySelector('#ct-word');
    if (btnWord) btnWord.addEventListener('click', baixarWord);

    if (manterScroll) requestAnimationFrame(() => window.scrollTo(0, alvoScroll));
  }

  function conteudoAtual() {
    const el = container.querySelector('#ct-editavel');
    return el ? el.innerHTML : '';
  }
  function nomeArquivo() {
    const m = modeloPorId(modeloId);
    const base = (dados.nome || 'contrato').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40);
    return `contrato-${m.id}-${base || 'cliente'}`;
  }

  function imprimir() {
    const w = window.open('', '_blank');
    if (!w) { alert('Permita pop-ups para imprimir, ou use "Baixar Word".'); return; }
    w.document.write(`<!doctype html><html lang="pt-br"><head><meta charset="utf-8"><title>Contrato</title>
      <style>@page{margin:2.2cm 2cm;} body{margin:0;}${ESTILO_CONTRATO}</style></head>
      <body>${conteudoAtual()}</body></html>`);
    w.document.close(); w.focus();
    setTimeout(() => { try { w.print(); } catch (e) { /* usuário imprime manual */ } }, 350);
  }

  function baixarWord() {
    const html = `<!doctype html><html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40"><head><meta charset="utf-8"><style>${ESTILO_CONTRATO} body{font-family:Georgia,serif;}</style></head><body>${conteudoAtual()}</body></html>`;
    const blob = new Blob(['﻿', html], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = nomeArquivo() + '.doc';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  telaModelos();
}
