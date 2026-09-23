import { jsPDF } from 'jspdf';
import { listarBriefings, listarObras, criarConvite, obterBriefing, excluirBriefing, sair } from '../dados.js';
import { esc, dataBR } from '../lib/format.js';
import { navBar } from '../lib/nav.js';
import { MARCA, COR_ACENTO, RGB_ACENTO, logoMarca } from '../lib/marca.js';

// Tela interna: gerar o link do briefing para enviar ao cliente e ver as
// respostas recebidas.
export async function renderBriefings(container, opts = {}) {
  const manterScroll = opts.scrollY != null;
  const alvoScroll = manterScroll ? opts.scrollY : 0;
  if (!manterScroll) container.innerHTML = `<div class="app"><p class="muted center">Carregando…</p></div>`;

  let briefings, obras;
  try {
    [briefings, obras] = await Promise.all([listarBriefings(), listarObras()]);
  } catch (e) {
    container.innerHTML = `
      <div class="app">
        <a class="voltar" data-link href="/obras">← Painel</a>
        <div class="card">
          <h2>Não foi possível carregar</h2>
          <p class="erro" style="display:block">${esc(e?.message || e)}</p>
        </div>
      </div>`;
    return;
  }
  briefings = briefings || [];
  obras = obras || [];

  container.innerHTML = `
    ${navBar('briefing')}
    <div class="app">
      <div class="pagina-topo"><h1>Briefing</h1></div>

      <section class="card">
        <h2>Gerar link do briefing</h2>
        <p class="muted">Crie um link e envie ao cliente. Ele responde o briefing do projeto — e as respostas caem direto aqui.</p>
        <div class="form-inline">
          <input id="b-rotulo" placeholder="Identificação (ex.: César e Elisandra)" />
          <select id="b-obra">
            <option value="">Sem obra vinculada</option>
            ${obras.map((o) => `<option value="${esc(o.id)}">${esc(o.nome)}</option>`).join('')}
          </select>
          <button class="btn btn-primary btn-mini" id="gerar-link">Gerar link</button>
        </div>
        <div id="link-gerado"></div>
      </section>

      <section class="card">
        <h2>Respostas recebidas</h2>
        <div id="lista-briefings">${listaBriefings(briefings)}</div>
      </section>

      <div id="brf-modal"></div>
    </div>`;

  container.querySelector('#sair').addEventListener('click', async () => {
    await sair();
  });

  // ---- Gerar convite → link ----
  container.querySelector('#gerar-link').addEventListener('click', async () => {
    const rotulo = container.querySelector('#b-rotulo').value.trim() || null;
    const sel = container.querySelector('#b-obra');
    const obraId = sel.value || null;
    const obraNome = sel.value ? sel.options[sel.selectedIndex].text : null;
    const alvo = container.querySelector('#link-gerado');
    alvo.innerHTML = `<p class="muted">Gerando…</p>`;
    let token;
    try {
      token = await criarConvite({ rotulo, obraId, obraNome, tipo: 'briefing' });
    } catch (error) {
      alvo.innerHTML = `<p class="erro" style="display:block">${esc(error?.message || error)}</p>`;
      return;
    }
    const link = `${window.location.origin}/briefing/${token}`;
    alvo.innerHTML = `
      <div class="preview-card">
        <p class="muted">Link do briefing${rotulo ? ' — ' + esc(rotulo) : ''}:</p>
        <p class="mono">${esc(link)}</p>
        <div class="row-end">
          <button class="btn btn-mini" id="copiar-brf">Copiar link</button>
          <a class="btn btn-mini" href="/briefing/${esc(token)}" target="_blank" rel="noopener">Abrir</a>
        </div>
      </div>`;
    alvo.querySelector('#copiar-brf').addEventListener('click', async (e) => {
      try { await navigator.clipboard.writeText(link); e.target.textContent = 'Copiado!'; }
      catch { e.target.textContent = 'Copie manualmente'; }
    });
  });

  // ---- Ver respostas (modal) ----
  container.querySelectorAll('[data-ver-brf]').forEach((b) => {
    b.addEventListener('click', async () => {
      const brf = await obterBriefing(b.getAttribute('data-ver-brf'));
      if (brf) abrirModal(container, brf);
    });
  });

  // ---- Excluir briefing ----
  container.querySelectorAll('[data-del-brf]').forEach((b) => {
    b.addEventListener('click', async () => {
      if (!confirm('Excluir este briefing? Esta ação não pode ser desfeita.')) return;
      await excluirBriefing(b.getAttribute('data-del-brf'));
      renderBriefings(container, { scrollY: window.scrollY });
    });
  });

  if (manterScroll) requestAnimationFrame(() => window.scrollTo(0, alvoScroll));
}

function tituloBriefing(b) {
  return b.cliente || b.rotulo || b.obraNome || 'Briefing';
}

function listaBriefings(briefings) {
  if (!briefings.length) return `<p class="muted">Nenhum briefing recebido ainda.</p>`;
  return briefings.map((b) => {
    const selo = b.concluido
      ? '<span class="brf-selo concluido">Concluído</span>'
      : '<span class="brf-selo andamento">Em preenchimento</span>';
    const quando = b.atualizadoEm || b.criadoEm;
    return `
    <div class="cliente-item">
      <div class="row-between">
        <strong>${esc(tituloBriefing(b))}${selo}</strong>
        <span class="row-end">
          <button class="btn btn-mini btn-primary" data-ver-brf="${esc(b.id)}">Ver respostas</button>
          <button class="btn btn-x" data-del-brf="${esc(b.id)}" title="Excluir">×</button>
        </span>
      </div>
      <div class="cliente-dados muted">
        ${b.obraNome ? `🏗️ ${esc(b.obraNome)} · ` : ''}
        ${(b.respostas?.length || 0)} resposta(s)
      </div>
      <div class="cliente-data muted">Atualizado em ${dataBR(quando ? new Date(quando).toISOString() : '')}</div>
    </div>`;
  }).join('');
}

// Modal com todas as respostas (agrupadas por seção).
function abrirModal(container, b) {
  const respostas = b.respostas || [];
  const secoes = [];
  respostas.forEach((r) => {
    let s = secoes.find((x) => x.titulo === (r.secao || ''));
    if (!s) { s = { titulo: r.secao || '', itens: [] }; secoes.push(s); }
    s.itens.push(r);
  });
  const corpo = secoes.map((s) => `
    ${s.titulo ? `<h3 class="brf-modal-secao">${esc(s.titulo)}</h3>` : ''}
    ${s.itens.map((r) => `
      <div class="brf-resp">
        <p class="brf-resp-p">${esc(r.pergunta)}</p>
        <p class="brf-resp-r">${esc(r.resposta)}</p>
      </div>`).join('')}
  `).join('');

  const modal = container.querySelector('#brf-modal');
  modal.innerHTML = `
    <div class="modal-overlay aberto" id="brf-fundo">
      <div class="modal-card" role="dialog" aria-modal="true">
        <div class="modal-cab">
          <h3>${esc(tituloBriefing(b))}</h3>
          <button class="btn btn-x" id="brf-fechar" aria-label="Fechar">×</button>
        </div>
        ${b.obraNome ? `<p class="muted">🏗️ ${esc(b.obraNome)}</p>` : ''}
        <div class="modal-acoes" style="justify-content:flex-start;margin-bottom:.4rem">
          <button class="btn btn-mini btn-primary" id="brf-pdf">📄 Baixar PDF</button>
          <button class="btn btn-mini" id="brf-imprimir">🖨 Imprimir</button>
        </div>
        <div class="brf-modal-corpo">${corpo || '<p class="muted">Sem respostas.</p>'}</div>
      </div>
    </div>`;
  document.body.classList.add('modal-aberto');
  const fechar = () => { modal.innerHTML = ''; document.body.classList.remove('modal-aberto'); };
  modal.querySelector('#brf-fechar').addEventListener('click', fechar);
  modal.querySelector('#brf-fundo').addEventListener('click', (e) => {
    if (e.target.id === 'brf-fundo') fechar();
  });
  modal.querySelector('#brf-pdf').addEventListener('click', (e) => baixarPdfBriefing(b, secoes, e.currentTarget));
  modal.querySelector('#brf-imprimir').addEventListener('click', () => imprimirBriefing(b, secoes));
}

function carregarImagem(src) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

// Gera e BAIXA um arquivo .pdf de verdade (jsPDF), sem passar pela impressão.
async function baixarPdfBriefing(b, secoes, btn) {
  const rotuloBtn = btn ? btn.textContent : '';
  if (btn) { btn.disabled = true; btn.textContent = 'Gerando…'; }
  try {
    const doc = new jsPDF({ unit: 'pt', format: 'a4' });
    const M = 40;
    const W = doc.internal.pageSize.getWidth();
    const H = doc.internal.pageSize.getHeight();
    const TERRA = RGB_ACENTO;
    const ESCURO = [42, 38, 34];
    const MUTED = [138, 130, 118];
    const TEXTO = [55, 50, 45];
    const larguraUtil = W - M * 2;
    let y = M;

    const novaPaginaSePreciso = (altura) => {
      if (y + altura > H - M) { doc.addPage(); y = M; }
    };

    // Cabeçalho: logo + título.
    let logoUrl = logoMarca;
    try { logoUrl = new URL(logoMarca, window.location.href).href; } catch { /* mantém */ }
    const logo = await carregarImagem(logoUrl);
    if (logo && logo.width && logo.height) {
      const escala = Math.min(150 / logo.width, 40 / logo.height);
      try { doc.addImage(logo, 'PNG', M, y, logo.width * escala, logo.height * escala); } catch { /* segue */ }
    }
    doc.setTextColor(...TERRA); doc.setFont('helvetica', 'bold'); doc.setFontSize(16);
    doc.text('Briefing do projeto', W - M, y + 15, { align: 'right' });
    doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(...MUTED);
    doc.text(MARCA.nome, W - M, y + 29, { align: 'right' });

    y += 50;
    doc.setDrawColor(...TERRA); doc.setLineWidth(2); doc.line(M, y, W - M, y);
    y += 18;

    // Meta.
    const quando = b.atualizadoEm || b.criadoEm;
    const dataTxt = quando ? dataBR(new Date(quando).toISOString()) : '';
    const status = b.concluido ? 'Concluído' : 'Em preenchimento';
    doc.setFont('helvetica', 'bold'); doc.setFontSize(11); doc.setTextColor(...ESCURO);
    doc.text(tituloBriefing(b), M, y); y += 15;
    doc.setFont('helvetica', 'normal'); doc.setFontSize(9.5); doc.setTextColor(...TEXTO);
    const metaLinha = [
      b.obraNome && b.obraNome !== tituloBriefing(b) ? `Obra: ${b.obraNome}` : null,
      dataTxt ? `Atualizado em ${dataTxt}` : null,
      status,
    ].filter(Boolean).join('     ');
    if (metaLinha) { doc.text(metaLinha, M, y); y += 8; }
    y += 10;

    // Seções e respostas.
    secoes.forEach((s) => {
      if (s.titulo) {
        novaPaginaSePreciso(30);
        doc.setFont('helvetica', 'bold'); doc.setFontSize(12); doc.setTextColor(...TERRA);
        doc.text(s.titulo, M, y); y += 6;
        doc.setDrawColor(233, 227, 216); doc.setLineWidth(0.8); doc.line(M, y, W - M, y);
        y += 14;
      }
      s.itens.forEach((r) => {
        doc.setFont('helvetica', 'bold'); doc.setFontSize(9.5); doc.setTextColor(...MUTED);
        const perguntaLinhas = doc.splitTextToSize(r.pergunta, larguraUtil);
        doc.setFont('helvetica', 'normal'); doc.setFontSize(11); doc.setTextColor(...ESCURO);
        const respostaLinhas = doc.splitTextToSize(r.resposta, larguraUtil);
        const alturaBloco = perguntaLinhas.length * 12 + respostaLinhas.length * 14 + 12;
        novaPaginaSePreciso(alturaBloco);

        doc.setFont('helvetica', 'bold'); doc.setFontSize(9.5); doc.setTextColor(...MUTED);
        doc.text(perguntaLinhas, M, y); y += perguntaLinhas.length * 12 + 2;
        doc.setFont('helvetica', 'normal'); doc.setFontSize(11); doc.setTextColor(...ESCURO);
        doc.text(respostaLinhas, M, y); y += respostaLinhas.length * 14 + 8;
      });
      y += 6;
    });

    // Rodapé com numeração em todas as páginas.
    const total = doc.internal.getNumberOfPages();
    for (let i = 1; i <= total; i++) {
      doc.setPage(i);
      doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5); doc.setTextColor(...MUTED);
      doc.text(`Página ${i} de ${total}`, W - M, H - 20, { align: 'right' });
    }

    const nomeArq = `Briefing - ${tituloBriefing(b)}`.replace(/[\\/:*?"<>|]+/g, ' ').trim();
    doc.save(`${nomeArq}.pdf`);
  } catch (e) {
    alert('Não foi possível gerar o PDF. Tente "Imprimir" e salvar como PDF.');
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = rotuloBtn || '📄 Baixar PDF'; }
  }
}

// Abre uma janela de impressão do briefing (o navegador imprime/salva PDF).
function imprimirBriefing(b, secoes) {
  const w = window.open('', '_blank');
  if (!w) { alert('Permita pop-ups para gerar o PDF.'); return; }
  const quando = b.atualizadoEm || b.criadoEm;
  const dataTxt = quando ? dataBR(new Date(quando).toISOString()) : '';
  const status = b.concluido ? 'Concluído' : 'Em preenchimento';
  const corpo = secoes.map((s) => `
    <section class="brf-sec">
      ${s.titulo ? `<h2>${esc(s.titulo)}</h2>` : ''}
      ${s.itens.map((r) => `
        <div class="brf-item">
          <p class="brf-q">${esc(r.pergunta)}</p>
          <p class="brf-a">${esc(r.resposta)}</p>
        </div>`).join('')}
    </section>`).join('');

  w.document.write(`<!doctype html><html lang="pt-br"><head><meta charset="utf-8">
    <title>Briefing — ${esc(tituloBriefing(b))}</title>
    <style>
      @page { margin: 2cm 2cm; @bottom-right { content: "Página " counter(page) " de " counter(pages); font: 9pt Georgia, serif; color: #555; } }
      * { box-sizing: border-box; }
      body { margin: 0; font-family: Georgia, 'Times New Roman', serif; color: #241f1b; line-height: 1.5; }
      .topbar { position: sticky; top: 0; display: flex; gap: 10px; justify-content: space-between; align-items: center; flex-wrap: wrap; padding: 10px 14px; background: #f5f2ec; border-bottom: 1px solid #ddd6c8; font-family: Inter, -apple-system, system-ui, sans-serif; }
      .topbar button { font: inherit; font-size: 15px; padding: 9px 14px; border: 1px solid #cfc7ba; background: #fff; border-radius: 8px; cursor: pointer; }
      .topbar .voltar { border-color: ${COR_ACENTO}; color: ${COR_ACENTO}; font-weight: 600; }
      .corpo { padding: 24px 32px 40px; max-width: 760px; margin: 0 auto; }
      .cab { text-align: center; border-bottom: 2px solid ${COR_ACENTO}; padding-bottom: 14px; margin-bottom: 22px; }
      .cab .escritorio { font-family: Inter, system-ui, sans-serif; font-size: 12px; letter-spacing: .12em; color: #928a7e; text-transform: uppercase; }
      .cab h1 { font-size: 22px; margin: 8px 0 4px; }
      .cab .meta { font-family: Inter, system-ui, sans-serif; font-size: 13px; color: #574f47; }
      .brf-sec { margin: 0 0 20px; break-inside: avoid; }
      .brf-sec h2 { font-size: 16px; color: ${COR_ACENTO}; border-bottom: 1px solid #e9e3d8; padding-bottom: 5px; margin: 0 0 10px; }
      .brf-item { padding: 7px 0; border-bottom: 1px solid #f0ece3; break-inside: avoid; }
      .brf-item:last-child { border-bottom: 0; }
      .brf-q { font-family: Inter, system-ui, sans-serif; font-size: 12.5px; color: #8a8276; margin: 0 0 3px; }
      .brf-a { margin: 0; font-size: 14.5px; white-space: pre-wrap; }
      @media print { .no-print { display: none !important; } .corpo { padding: 0; } }
    </style></head>
    <body>
      <div class="topbar no-print">
        <button class="voltar" onclick="window.close()">← Voltar ao sistema</button>
        <button onclick="window.print()">🖨 Imprimir / Salvar PDF</button>
      </div>
      <div class="corpo">
        <div class="cab">
          <div class="escritorio">${esc(MARCA.nome)}</div>
          <h1>Briefing do projeto</h1>
          <div class="meta">
            ${esc(tituloBriefing(b))}${b.obraNome && b.obraNome !== tituloBriefing(b) ? ' · ' + esc(b.obraNome) : ''}
            ${dataTxt ? ' · ' + esc(dataTxt) : ''} · ${esc(status)}
          </div>
        </div>
        ${corpo || '<p>Sem respostas.</p>'}
      </div>
    </body></html>`);
  w.document.close(); w.focus();
  setTimeout(() => { try { w.print(); } catch (e) { /* imprime pelo botão */ } }, 400);
}
