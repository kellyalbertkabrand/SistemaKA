import {
  obterObra, listarEtapas, listarLancamentos, atualizarObra, excluirObra, definirPublicado,
  criarEtapa, atualizarEtapa, excluirEtapa, criarLancamento, atualizarLancamento, excluirLancamento, sair,
  anexarRecibo, removerRecibo, obterRecibo, enviarFoto, listarFotos, excluirFoto, atualizarFoto, obterFotoBin, salvarFotoBin, excluirBin,
  listarFornecedores,
} from '../dados.js';
import { navegar } from '../main.js';
import { moeda, dataBR, pct, esc, pillStatus } from '../lib/format.js';
import { reconhecimentoDisponivel, ouvir, parar } from '../lib/voice.js';
import { ordenarLancamentos, seletorOrdem } from '../lib/ordenar.js';
import { ETAPAS_PADRAO } from '../lib/etapasPadrao.js';
import { baixarBlob, montarExcelHTML, numBR } from '../lib/exportar.js';
import { baixarPdfReembolso, baixarExcelReembolso, montarMensagemWhatsApp } from '../lib/reembolso.js';
import { comprimirParaDataURL, arquivoParaDataURL, dataURLBytes, dataURLParaBytes, dataURLParaBlob } from '../lib/imagem.js';
import { criarZip } from '../lib/zip.js';
import { abrirLightbox, baixarImagem, abrirAnexo } from '../lib/lightbox.js';

// Data 'YYYY-MM-DD' -> 'dd/mm/aaaa' (sem depender de fuso).
function fmtDataVisita(v) {
  if (!v) return '';
  const [a, m, d] = String(v).slice(0, 10).split('-');
  return d ? `${d}/${m}/${a}` : '';
}

// Traduz o erro numa instrução clara do que corrigir.
function msgErroAnexo(err) {
  const code = String(err?.code || '');
  const m = String(err?.message || err || '');
  if (code.includes('permission-denied') || m.includes('insufficient permissions'))
    return 'As Regras do Firestore não permitem salvar. No Firebase → Firestore Database → Regras, publique o firestore.rules atualizado (com as coleções "fotos", "fotos_bin" e "recibos").';
  if (m.includes('longer than') || m.includes('maximum') || m.includes('exceeds') || code.includes('invalid-argument'))
    return 'A imagem ficou grande demais para o banco. Tente uma imagem um pouco menor.';
  return 'Não foi possível anexar: ' + m;
}
import { navBar } from '../lib/nav.js';

// Detalhe interno de uma obra: KPIs, lançamento por voz/IA, etapas e lançamentos.
export async function renderObra(container, obraId) {
  container.innerHTML = `<div class="app"><p class="muted center">Carregando…</p></div>`;

  // A obra é o dado crítico. Carregamos ela primeiro e sozinha: só ela decide
  // se a tela existe ou não.
  let obra;
  try {
    obra = await obterObra(obraId);
  } catch {
    obra = null;
  }

  if (!obra) {
    container.innerHTML = `
      <div class="app">
        <a class="btn btn-ghost" data-link href="/obras">← Voltar</a>
        <p class="erro" style="display:block">Obra não encontrada.</p>
      </div>`;
    return;
  }

  // Etapas e lançamentos entram no caminho crítico (os KPIs e as tabelas
  // dependem deles). As FOTOS são as mais pesadas (imagens em base64), então
  // NÃO seguram a abertura da tela: carregam em segundo plano logo abaixo.
  const [etapas, lancamentos, fornecedores] = await Promise.all([
    listarEtapas(obraId).catch(() => []),
    listarLancamentos(obraId).catch(() => []),
    listarFornecedores().catch(() => []),
  ]);
  let fotos = []; // preenchido em segundo plano após o primeiro render

  const executado = soma(lancamentos);
  const pago = soma(lancamentos.filter((l) => l.status === 'pago'));
  const pendente = soma(lancamentos.filter((l) => l.status === 'pendente'));
  const saldo = Number(obra.orcamento || 0) - executado;

  const linkPublico = `${window.location.origin}/obra/${obra.slug}`;

  container.innerHTML = `
    ${navBar('painel')}
    <div class="app">
      <div class="pagina-topo">
        <div>
          <a class="voltar" data-link href="/obras">← Obras</a>
          <h1>${esc(obra.nome)}</h1>
          <p class="muted">${esc(obra.cliente || 'Sem cliente definido')}
            <button class="btn btn-mini" id="abrir-editar">✎ Editar obra</button>
          </p>
        </div>
        <button class="btn btn-mini" id="exportar">⬇ Exportar (Excel + anexos)</button>
      </div>

      <form id="form-editar" class="card" hidden>
        <div class="form-grid">
          <label>Nome da obra
            <input id="ed-nome" value="${esc(obra.nome)}" />
          </label>
          <label>Cliente
            <input id="ed-cliente" value="${esc(obra.cliente || '')}" />
          </label>
          <label>Tipo de serviço
            <select id="ed-gestao">
              <option value="com" ${obra.gestao !== false ? 'selected' : ''}>Com gestão de obra (painel completo)</option>
              <option value="sem" ${obra.gestao === false ? 'selected' : ''}>Sem gestão de obra (só projeto)</option>
            </select>
          </label>
          <label id="ed-orcamento-label">Orçamento total (R$)
            <input id="ed-orcamento" type="number" min="0" step="0.01" value="${Number(obra.orcamento || 0)}" />
          </label>
          <label id="ed-parcelas-label" hidden>Pagamento do projeto
            <select id="ed-parcelas">
              <option value="1" ${Number(obra.parcelas || 1) <= 1 ? 'selected' : ''}>À vista</option>
              ${[2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((n) => `<option value="${n}" ${Number(obra.parcelas || 1) === n ? 'selected' : ''}>${n}x</option>`).join('')}
            </select>
          </label>
          <label id="ed-percentual-label">Percentual do escritório — gestão (%)
            <input id="ed-percentual" type="number" min="0" max="100" step="0.1" value="${Number(obra.percentualEscritorio || 0)}" placeholder="Ex.: 10" />
          </label>
        </div>
        <p class="muted" style="font-size:.8rem;margin:.2rem 0 0">
          Ao mudar o orçamento total, o saldo é recalculado automaticamente.
        </p>
        <div class="row-between" style="margin-top:.4rem">
          <button type="button" class="btn btn-perigo" id="excluir-obra">🗑 Excluir obra</button>
          <div class="row-end">
            <button type="button" class="btn btn-ghost" id="ed-cancelar">Cancelar</button>
            <button type="submit" class="btn btn-primary">Salvar alterações</button>
          </div>
        </div>
        <p class="erro" id="ed-erro" hidden></p>
      </form>

      <section class="kpis">
        ${kpi('Orçado', moeda(obra.orcamento), 'val-orcado')}
        ${kpi('Executado', moeda(executado))}
        ${kpi('Saldo', moeda(saldo), saldo < 0 ? 'neg' : 'val-saldo')}
        ${kpi('Pago', moeda(pago))}
        ${kpi('Pendente', moeda(pendente))}
      </section>

      <section class="card link-cliente">
        <div class="row-between">
          <div>
            <strong>Link do cliente</strong>
            <p class="muted mono">${esc(linkPublico)}</p>
          </div>
          <div class="row-end">
            <label class="switch">
              <input type="checkbox" id="toggle-pub" ${obra.publicado ? 'checked' : ''} />
              <span>Publicado</span>
            </label>
            <button class="btn btn-mini" id="copiar-link">Copiar</button>
            <a class="btn btn-mini" href="/obra/${esc(obra.slug)}" target="_blank" rel="noopener" title="Abre o painel do cliente numa nova aba">Abrir ↗</a>
            <button class="btn btn-mini btn-whats" id="whats-link" title="Enviar o link ao cliente pelo WhatsApp com o passo a passo para salvar como app">💬 Enviar por WhatsApp</button>
          </div>
        </div>
        <div id="whats-link-saida"></div>
      </section>

      <section class="card">
        <div class="row-between">
          <div>
            <strong>Relatório de reembolso (PDF)</strong>
            <p class="muted" style="margin:.15rem 0 0">Escolha o período e gere o PDF com o valor que o cliente precisa reembolsar.</p>
          </div>
          <button class="btn btn-mini" id="abrir-reembolso">📄 Gerar PDF</button>
        </div>
        <form id="form-reembolso" class="reembolso-form" hidden>
          <label>De
            <input type="date" id="reemb-de" />
          </label>
          <label>Até
            <input type="date" id="reemb-ate" />
          </label>
          <button class="btn btn-mini btn-primary" type="submit">⬇ Baixar PDF</button>
          <button type="button" class="btn btn-mini" id="reemb-excel">⬇ Excel</button>
          <button type="button" class="btn btn-mini btn-whats" id="reemb-whats">💬 Mensagem WhatsApp</button>
        </form>
        <p class="erro" id="reemb-erro" hidden></p>
        <div id="reemb-whats-saida"></div>
      </section>

      <section class="card lancar">
        <h2>Lançar custo</h2>
        <p class="muted">Fale ou escreva — a IA organiza etapa, valor e status.</p>
        <div class="lancar-controles">
          <textarea id="texto-livre" class="texto-livre" rows="2"
            placeholder='Ex.: "material elétrico, três mil e quinhentos, pago no Pix"'></textarea>
          <div class="lancar-botoes">
            <button class="btn btn-mic" id="btn-mic">🎤 Falar</button>
            <button class="btn btn-primary" id="btn-interpretar">✓ Organizar com a IA</button>
          </div>
        </div>
        <p class="status-voz" id="status-voz" hidden></p>
        <div id="preview"></div>
      </section>

      <section class="card">
        <div class="row-between">
          <h2>Etapas</h2>
          <div class="row-end">
            <button class="btn-toggle" id="toggle-etapas" aria-expanded="false">
              <span class="chev">▾</span><span class="tog-lbl">Ver etapas (${etapas.length})</span>
            </button>
            <button class="btn btn-mini" id="add-etapa">+ etapa</button>
          </div>
        </div>
        <form id="form-etapa" class="form-inline" hidden>
          <input id="e-nome" placeholder="Nome da etapa" />
          <input id="e-orcado" type="number" min="0" step="0.01" placeholder="Orçado R$" />
          <button class="btn btn-mini btn-primary" type="submit">Salvar</button>
        </form>
        ${chipsPadrao(etapas)}
        <div id="tabela-etapas" hidden>${tabelaEtapas(etapas, lancamentos)}</div>
      </section>

      <section class="card">
        <div class="row-between">
          <h2>Lançamentos</h2>
          ${lancamentos.length ? seletorOrdem('ord-lanc', 'data') : ''}
        </div>
        <datalist id="lista-etapas-edit">${etapas.map((e) => `<option value="${esc(e.nome)}"></option>`).join('')}</datalist>
        <p class="muted" style="font-size:.8rem;margin:.2rem 0 .4rem">Toque em um lançamento para ver todos os detalhes e editar.</p>
        <div id="tabela-lancamentos">${listaLancamentos(ordenarLancamentos(lancamentos, 'data'))}</div>
      </section>

      <section class="card">
        <div class="row-between">
          <h2>Fotos das visitas</h2>
          <button class="btn btn-mini btn-primary" id="abrir-fotos" style="margin:0">+ Fotos</button>
        </div>
        <form id="form-fotos" class="foto-form" hidden>
          <div class="foto-form-grid">
            <label>Data da visita
              <input type="date" id="foto-data" />
            </label>
            <label>Descrição da visita (opcional)
              <input type="text" id="foto-texto" placeholder="Ex.: Concretagem da laje, medições…" />
            </label>
          </div>
          <label>Fotos (pode escolher várias de uma vez)
            <input type="file" id="input-fotos" accept="image/*" multiple />
          </label>
          <div class="row-end">
            <button type="button" class="btn btn-ghost" id="cancelar-fotos">Cancelar</button>
            <button type="submit" class="btn btn-primary" id="enviar-fotos">Enviar fotos</button>
          </div>
          <p class="status-voz" id="status-fotos" hidden></p>
        </form>
        <div id="grid-fotos"><p class="muted"><span class="spinner"></span> Carregando fotos…</p></div>
      </section>

      <section class="card">
        <div class="row-between">
          <h2>Projeto da obra</h2>
          <div class="row-end">
            <button class="btn btn-mini btn-primary" id="abrir-projeto" style="margin:0">+ Arquivo</button>
            <button class="btn btn-mini" id="abrir-link" style="margin:0">+ Link</button>
          </div>
        </div>
        <form id="form-projeto" class="foto-form" hidden>
          <label>Nome / identificação
            <input id="proj-nome" placeholder="Ex.: Planta baixa, Projeto estrutural" />
          </label>
          <div id="proj-file-row">
            <label>Enviar imagem ou arquivo (mostra miniatura quando é imagem)
              <input type="file" id="proj-file"
                accept="image/*,application/pdf,.pdf,.dwg,.dxf,.dwf,.skp,.rvt,.rfa,.ifc,.pln,.3ds,.max,.doc,.docx,.xlsx,.zip" />
            </label>
            <div id="proj-arquivo-atual" hidden></div>
          </div>
          <div id="proj-link-row">
            <label><span id="proj-link-rotulo">… ou colar um link (Google Drive, Dropbox, etc.)</span>
              <input id="proj-link" placeholder="https://…" />
            </label>
            <p class="muted" style="font-size:.78rem;margin:-.3rem 0 0">
              Dica: para o link abrir sem pedir login, no Google Drive use
              <strong>Compartilhar → Qualquer pessoa com o link</strong>.
            </p>
          </div>
          <div class="row-end">
            <button type="button" class="btn btn-ghost" id="cancelar-projeto">Cancelar</button>
            <button type="submit" class="btn btn-primary" id="salvar-projeto">Adicionar</button>
          </div>
          <p class="status-voz" id="status-projeto" hidden></p>
        </form>
        <div id="lista-projetos">${listaProjetos(obra.projetos)}</div>
      </section>
    </div>`;

  // Recarrega a tela inteira (após salvar/excluir algo).
  const recarregar = () => renderObra(container, obraId);

  container.querySelector('#sair').addEventListener('click', async () => {
    await sair();
  });

  // ---- Exportar a obra: um ZIP com a planilha + notas fiscais + fotos ----
  container.querySelector('#exportar').addEventListener('click', async () => {
    const btnExp = container.querySelector('#exportar');
    const rotulo = btnExp.textContent;
    btnExp.disabled = true; btnExp.textContent = 'Gerando…';
    try {
      // As fotos carregam em segundo plano; se ainda não chegaram, busca agora.
      const fotosExp = fotos.length ? fotos : await listarFotos(obra.id).catch(() => []);
      const realizado = {};
      for (const l of lancamentos) realizado[l.etapa] = (realizado[l.etapa] || 0) + Number(l.valor || 0);
      const fmtData = (v) => {
        if (!v) return '';
        const [a, m, d] = String(v).slice(0, 10).split('-');
        return d ? `${d}/${m}/${a}` : String(v);
      };
      const nomeSeg = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '')
        .replace(/[^a-zA-Z0-9._-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40) || 'item';
      const extDe = (dado) => {
        const t = (/^data:([^;]+)/.exec(dado || '') || [])[1] || '';
        if (t.includes('pdf')) return 'pdf';
        if (t.includes('png')) return 'png';
        if (t.includes('webp')) return 'webp';
        return 'jpg';
      };

      const arquivos = [];
      const lancOrd = ordenarLancamentos(lancamentos, 'data');

      // Notas fiscais -> pasta notas-fiscais/ (e nome de referência p/ a planilha)
      const nfNome = new Map();
      let nfN = 0;
      for (const l of lancOrd) {
        let dado = l.reciboDataUrl || l.reciboUrl;
        if (!dado && (l.temRecibo || l.reciboNome)) dado = (await obterRecibo(l.id))?.dataUrl;
        if (dado && String(dado).startsWith('data:')) {
          nfN++;
          const nome = `notas-fiscais/${String(nfN).padStart(2, '0')}-${nomeSeg((l.data || '').slice(0, 10) + '-' + (l.etapa || ''))}.${extDe(dado)}`;
          arquivos.push({ nome, dados: dataURLParaBytes(dado) });
          nfNome.set(l.id, nome);
        }
      }

      // Fotos -> pasta fotos/
      const fotoNome = new Map();
      let fN = 0;
      for (const f of (fotosExp || [])) {
        let dado = f.dataUrl || f.url;
        if (!dado) dado = await obterFotoBin(f.id);
        if (dado && String(dado).startsWith('data:')) {
          fN++;
          const d = f.dataVisita || (f.criadoEm ? new Date(f.criadoEm).toISOString().slice(0, 10) : '') || 'foto';
          const nome = `fotos/${String(fN).padStart(2, '0')}-${nomeSeg(d)}.jpg`;
          arquivos.push({ nome, dados: dataURLParaBytes(dado) });
          fotoNome.set(f, nome);
        }
      }

      const secoes = [
        { titulo: `Obra: ${obra.nome}`, linhas: [
          ['Cliente', obra.cliente || ''],
          ['Orçamento', 'R$ ' + numBR(obra.orcamento)],
          ['Executado', 'R$ ' + numBR(executado)],
          ['Saldo', 'R$ ' + numBR(saldo)],
        ] },
        { titulo: 'Etapas', cabecalho: ['Etapa', 'Orçado (R$)', 'Realizado (R$)'],
          linhas: etapas.map((et) => [et.nome, numBR(et.orcado), numBR(realizado[et.nome] || 0)]) },
        { titulo: 'Lançamentos', cabecalho: ['Data', 'Etapa', 'Fornecedor', 'Descrição', 'Valor (R$)', 'Status', 'Nota fiscal (arquivo)'],
          linhas: lancOrd.map((l) => [
            dataBR(l.data), l.etapa, l.fornecedor || '', l.descricao || '', numBR(l.valor), l.status,
            nfNome.get(l.id) || ((l.reciboDataUrl || l.reciboUrl || l.temRecibo || l.reciboNome) ? 'anexada' : '—'),
          ]) },
        { titulo: 'Fotos das visitas', cabecalho: ['Data da visita', 'Descrição', 'Arquivo'],
          linhas: (fotosExp || []).map((f) => [
            fmtData(f.dataVisita || (f.criadoEm ? new Date(f.criadoEm).toISOString() : '')),
            f.texto || '', fotoNome.get(f) || '',
          ]) },
      ];

      // A planilha vai no topo do ZIP.
      arquivos.unshift({
        nome: `obra-${obra.slug}.xls`,
        dados: new TextEncoder().encode('﻿' + montarExcelHTML(secoes)),
      });

      baixarBlob(`obra-${obra.slug}.zip`, criarZip(arquivos));
    } catch (err) {
      alert('Não foi possível exportar: ' + (err?.message || err));
    } finally {
      btnExp.disabled = false; btnExp.textContent = rotulo;
    }
  });

  // ---- Relatório de reembolso (PDF por período) ----
  const abrirReembolso = container.querySelector('#abrir-reembolso');
  const formReembolso = container.querySelector('#form-reembolso');
  const reembErro = container.querySelector('#reemb-erro');
  const reembDe = container.querySelector('#reemb-de');
  const reembAte = container.querySelector('#reemb-ate');
  // Padrão: últimos 7 dias (relatório semanal).
  const hojeISO = new Date().toISOString().slice(0, 10);
  const seteDiasAtras = new Date(Date.now() - 6 * 864e5).toISOString().slice(0, 10);
  if (reembDe) reembDe.value = seteDiasAtras;
  if (reembAte) reembAte.value = hojeISO;
  abrirReembolso.addEventListener('click', () => {
    formReembolso.hidden = !formReembolso.hidden;
    reembErro.hidden = true;
  });
  formReembolso.addEventListener('submit', async (e) => {
    e.preventDefault();
    reembErro.hidden = true;
    const de = reembDe.value;
    const ate = reembAte.value;
    if (!de || !ate) {
      reembErro.textContent = 'Escolha a data inicial e a final.'; reembErro.hidden = false; return;
    }
    if (de > ate) {
      reembErro.textContent = 'A data inicial não pode ser depois da final.'; reembErro.hidden = false; return;
    }
    const btn = formReembolso.querySelector('button[type="submit"]');
    btn.disabled = true; const rot = btn.textContent; btn.textContent = 'Gerando…';
    try {
      await baixarPdfReembolso({ obra, lancamentos, de, ate });
    } catch (err) {
      reembErro.textContent = 'Não foi possível gerar o PDF: ' + (err?.message || err);
      reembErro.hidden = false;
    } finally {
      btn.disabled = false; btn.textContent = rot;
    }
  });

  // Excel do reembolso (mesmo período do PDF).
  container.querySelector('#reemb-excel').addEventListener('click', () => {
    reembErro.hidden = true;
    const de = reembDe.value;
    const ate = reembAte.value;
    if (!de || !ate) { reembErro.textContent = 'Escolha a data inicial e a final.'; reembErro.hidden = false; return; }
    if (de > ate) { reembErro.textContent = 'A data inicial não pode ser depois da final.'; reembErro.hidden = false; return; }
    try { baixarExcelReembolso({ obra, lancamentos, de, ate }); }
    catch (err) { reembErro.textContent = 'Não foi possível gerar o Excel: ' + (err?.message || err); reembErro.hidden = false; }
  });

  // Mensagem pronta para o WhatsApp (mesmo período) — abre o WhatsApp com o
  // texto e deixa uma cópia na tela com botão de copiar.
  const reembWhatsSaida = container.querySelector('#reemb-whats-saida');
  container.querySelector('#reemb-whats').addEventListener('click', () => {
    reembErro.hidden = true;
    const de = reembDe.value;
    const ate = reembAte.value;
    if (!de || !ate) {
      reembErro.textContent = 'Escolha a data inicial e a final.'; reembErro.hidden = false; return;
    }
    if (de > ate) {
      reembErro.textContent = 'A data inicial não pode ser depois da final.'; reembErro.hidden = false; return;
    }
    const msg = montarMensagemWhatsApp({ obra, lancamentos, de, ate });
    window.open('https://wa.me/?text=' + encodeURIComponent(msg), '_blank', 'noopener');
    reembWhatsSaida.innerHTML = `
      <div class="preview-card">
        <p class="muted">Mensagem gerada — abri o WhatsApp para você escolher o contato. Se preferir, copie:</p>
        <textarea class="texto-livre" rows="8" readonly id="reemb-whats-txt"></textarea>
        <div class="row-end"><button class="btn btn-mini" id="reemb-whats-copiar">Copiar mensagem</button></div>
      </div>`;
    reembWhatsSaida.querySelector('#reemb-whats-txt').value = msg;
    reembWhatsSaida.querySelector('#reemb-whats-copiar').addEventListener('click', async (ev) => {
      try { await navigator.clipboard.writeText(msg); ev.target.textContent = 'Copiado!'; }
      catch { ev.target.textContent = 'Copie manualmente'; }
    });
  });

  // ---- Editar obra (nome, cliente, orçamento total) ----
  const abrirEditar = container.querySelector('#abrir-editar');
  const formEditar = container.querySelector('#form-editar');
  const edErro = container.querySelector('#ed-erro');
  // "Sem gestão de obra" (só projeto): orçamento vira "Valor do projeto" e o
  // percentual de gestão some.
  const edGestaoSel = container.querySelector('#ed-gestao');
  const edOrcLabel = container.querySelector('#ed-orcamento-label');
  const edPctLabel = container.querySelector('#ed-percentual-label');
  const edParcLabel = container.querySelector('#ed-parcelas-label');
  const sincronizarTipoServicoEd = () => {
    const semGestao = edGestaoSel.value === 'sem';
    edOrcLabel.childNodes[0].nodeValue = semGestao ? 'Valor do projeto (R$)' : 'Orçamento total (R$)';
    edPctLabel.hidden = semGestao;
    edParcLabel.hidden = !semGestao;
  };
  edGestaoSel.addEventListener('change', sincronizarTipoServicoEd);
  sincronizarTipoServicoEd();
  abrirEditar.addEventListener('click', () => {
    formEditar.hidden = !formEditar.hidden;
    if (!formEditar.hidden) container.querySelector('#ed-nome').focus();
  });
  container.querySelector('#ed-cancelar').addEventListener('click', () => {
    formEditar.hidden = true;
  });
  // Excluir a obra inteira (com confirmação forte).
  container.querySelector('#excluir-obra').addEventListener('click', async () => {
    if (!confirm(`Excluir a obra "${obra.nome}" e TODOS os seus dados (etapas, lançamentos e fotos)?\n\nEsta ação NÃO pode ser desfeita.`)) return;
    const btn = container.querySelector('#excluir-obra');
    btn.disabled = true; btn.textContent = 'Excluindo…';
    try {
      await excluirObra(obra.id);
      navegar('/obras');
    } catch (err) {
      btn.disabled = false; btn.textContent = '🗑 Excluir obra';
      edErro.textContent = 'Não foi possível excluir: ' + (err?.message || err);
      edErro.hidden = false;
    }
  });
  formEditar.addEventListener('submit', async (e) => {
    e.preventDefault();
    edErro.hidden = true;
    const nome = container.querySelector('#ed-nome').value.trim();
    const cliente = container.querySelector('#ed-cliente').value.trim() || null;
    const orcamento = Number(container.querySelector('#ed-orcamento').value || 0);
    const percentualEscritorio = Number(container.querySelector('#ed-percentual').value || 0);
    const gestao = container.querySelector('#ed-gestao').value !== 'sem';
    const parcelas = Number(container.querySelector('#ed-parcelas').value || 1);
    if (!nome) { edErro.textContent = 'Dê um nome à obra.'; edErro.hidden = false; return; }
    const btn = formEditar.querySelector('button[type="submit"]');
    btn.disabled = true; btn.textContent = 'Salvando…';
    try {
      await atualizarObra(obra.id, { nome, cliente, orcamento, percentualEscritorio, gestao, parcelas });
    } catch (error) {
      btn.disabled = false; btn.textContent = 'Salvar alterações';
      edErro.textContent = error?.message || 'Erro ao salvar.'; edErro.hidden = false;
      return;
    }
    recarregar();
  });

  // ---- Link do cliente ----
  container.querySelector('#copiar-link').addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(linkPublico);
      flash(container.querySelector('#copiar-link'), 'Copiado!');
    } catch {
      flash(container.querySelector('#copiar-link'), 'Copie manualmente');
    }
  });
  container.querySelector('#toggle-pub').addEventListener('change', async (e) => {
    await definirPublicado(obra.id, e.target.checked);
  });
  // Enviar o link ao cliente pelo WhatsApp, já com o passo a passo para salvar
  // o painel como um app na tela inicial do celular.
  const whatsSaida = container.querySelector('#whats-link-saida');
  container.querySelector('#whats-link').addEventListener('click', () => {
    const msg = montarMensagemLinkCliente({ obra, link: linkPublico });
    window.open('https://wa.me/?text=' + encodeURIComponent(msg), '_blank', 'noopener');
    whatsSaida.innerHTML = `
      <div class="preview-card" style="margin-top:.6rem">
        <p class="muted">Abri o WhatsApp para você escolher o contato. Se preferir, copie a mensagem:</p>
        <textarea class="texto-livre" rows="10" readonly id="whats-link-txt"></textarea>
        <div class="row-end"><button class="btn btn-mini" id="whats-link-copiar">Copiar mensagem</button></div>
      </div>`;
    whatsSaida.querySelector('#whats-link-txt').value = msg;
    whatsSaida.querySelector('#whats-link-copiar').addEventListener('click', async (ev) => {
      try { await navigator.clipboard.writeText(msg); ev.target.textContent = 'Copiado!'; }
      catch { ev.target.textContent = 'Copie manualmente'; }
    });
  });

  // ---- Lançamento por voz / texto / IA ----
  configurarLancamento(container, obra, etapas, fornecedores, recarregar);

  // ---- Etapas ----
  const addEtapaBtn = container.querySelector('#add-etapa');
  const formEtapa = container.querySelector('#form-etapa');
  // Expandir/recolher a lista de etapas.
  const toggleEtapas = container.querySelector('#toggle-etapas');
  const tabelaEtapasEl = container.querySelector('#tabela-etapas');
  toggleEtapas.addEventListener('click', () => {
    tabelaEtapasEl.hidden = !tabelaEtapasEl.hidden;
    const aberto = !tabelaEtapasEl.hidden;
    toggleEtapas.classList.toggle('aberto', aberto);
    toggleEtapas.setAttribute('aria-expanded', String(aberto));
    toggleEtapas.querySelector('.tog-lbl').textContent = aberto
      ? 'Ocultar etapas'
      : `Ver etapas (${etapas.length})`;
  });
  addEtapaBtn.addEventListener('click', () => {
    formEtapa.hidden = !formEtapa.hidden;
    if (!formEtapa.hidden) container.querySelector('#e-nome').focus();
  });
  formEtapa.addEventListener('submit', async (e) => {
    e.preventDefault();
    const nome = container.querySelector('#e-nome').value.trim();
    const orcado = Number(container.querySelector('#e-orcado').value || 0);
    if (!nome) return;
    await criarEtapa({ obraId: obra.id, nome, orcado });
    recarregar();
  });
  container.querySelectorAll('[data-del-etapa]').forEach((b) => {
    b.addEventListener('click', async () => {
      await excluirEtapa(b.getAttribute('data-del-etapa'));
      recarregar();
    });
  });
  // Editar etapa (nome + orçado) inline na própria linha da tabela.
  container.querySelectorAll('[data-edit-etapa]').forEach((b) => {
    b.addEventListener('click', () => {
      const tr = b.closest('tr');
      const id = b.getAttribute('data-edit-etapa');
      const nomeAtual = b.getAttribute('data-nome');
      const orcadoAtual = b.getAttribute('data-orcado');
      tr.innerHTML = `
        <td><input class="ed-et-nome" value="${esc(nomeAtual)}" /></td>
        <td class="num"><input class="ed-et-orcado" type="number" min="0" step="0.01" value="${esc(orcadoAtual)}" /></td>
        <td class="num muted">—</td>
        <td></td>
        <td class="acoes" style="white-space:nowrap">
          <button class="btn btn-mini btn-primary ed-et-salvar">Salvar</button>
          <button class="btn btn-mini ed-et-cancelar">Cancelar</button>
        </td>`;
      const inNome = tr.querySelector('.ed-et-nome');
      inNome.focus();
      tr.querySelector('.ed-et-cancelar').addEventListener('click', recarregar);
      tr.querySelector('.ed-et-salvar').addEventListener('click', async () => {
        const novoNome = inNome.value.trim();
        const novoOrcado = Number(tr.querySelector('.ed-et-orcado').value || 0);
        if (!novoNome) { inNome.focus(); return; }
        const salvar = tr.querySelector('.ed-et-salvar');
        salvar.disabled = true; salvar.textContent = 'Salvando…';
        try {
          await atualizarEtapa(id, { nome: novoNome, orcado: novoOrcado });
          // Se renomeou, repassa o novo nome aos lançamentos (o "realizado"
          // casa pelo nome da etapa).
          if (novoNome !== nomeAtual) {
            const afetados = lancamentos.filter((l) => l.etapa === nomeAtual);
            for (const l of afetados) await atualizarLancamento(l.id, { etapa: novoNome });
          }
          recarregar();
        } catch (err) {
          salvar.disabled = false; salvar.textContent = 'Salvar';
          alert('Erro ao salvar: ' + (err?.message || err));
        }
      });
    });
  });
  // Quick-add: adicionar uma etapa padrão (CAIXA) com um clique.
  container.querySelectorAll('[data-chip-etapa]').forEach((c) => {
    c.addEventListener('click', async () => {
      c.disabled = true;
      await criarEtapa({ obraId: obra.id, nome: c.getAttribute('data-chip-etapa'), orcado: 0 });
      recarregar();
    });
  });

  // ---- Lançamentos: ordenar + abrir o popup de detalhes ----
  const tabelaLancEl = container.querySelector('#tabela-lancamentos');
  const selOrd = container.querySelector('#ord-lanc');
  if (selOrd) {
    selOrd.addEventListener('change', () => {
      tabelaLancEl.innerHTML = listaLancamentos(ordenarLancamentos(lancamentos, selOrd.value));
    });
  }
  // Tocar num lançamento abre o popup com todas as informações.
  tabelaLancEl.addEventListener('click', (e) => {
    const card = e.target.closest('[data-abrir-lanc]');
    if (card) mostrarDetalheLanc(card.getAttribute('data-abrir-lanc'));
  });

  // ---- Popup (modal) de um lançamento: ver tudo + editar com campos grandes ----
  let modalEl = null;
  function abrirModal(html) {
    if (!modalEl) {
      modalEl = document.createElement('div');
      modalEl.className = 'modal-overlay';
      modalEl.addEventListener('click', onModalClick);
      container.appendChild(modalEl);
    }
    modalEl.innerHTML = `<div class="modal-card">${html}</div>`;
    modalEl.classList.add('aberto');
    document.body.classList.add('modal-aberto');
  }
  function fecharModal() {
    if (modalEl) { modalEl.classList.remove('aberto'); modalEl.innerHTML = ''; }
    document.body.classList.remove('modal-aberto');
  }
  function mostrarDetalheLanc(id) {
    const l = lancamentos.find((x) => x.id === id);
    if (!l) return;
    abrirModal(detalheLancHTML(l));
  }
  function mostrarEdicaoLanc(id) {
    const l = lancamentos.find((x) => x.id === id);
    if (!l) return;
    abrirModal(edicaoLancHTML(l));
    ligarFornecedor(modalEl);
    modalEl.querySelector('.m-status').value = l.status === 'pendente' ? 'pendente' : 'pago';
    modalEl.querySelector('.m-pagopor').value = l.pagoPor === 'cliente' ? 'cliente' : 'escritorio';
    modalEl.querySelector('.m-etapa').focus();
  }
  async function onModalClick(e) {
    if (e.target === modalEl || e.target.closest('[data-fechar-modal]')) { fecharModal(); return; }
    const editar = e.target.closest('[data-editar-lanc-modal]');
    if (editar) { mostrarEdicaoLanc(editar.getAttribute('data-editar-lanc-modal')); return; }
    const cancelar = e.target.closest('[data-cancelar-edicao]');
    if (cancelar) { mostrarDetalheLanc(cancelar.getAttribute('data-cancelar-edicao')); return; }
    const salvar = e.target.closest('[data-salvar-lanc]');
    if (salvar) { await salvarEdicaoLanc(salvar.getAttribute('data-salvar-lanc'), salvar); return; }
    const excluir = e.target.closest('[data-excluir-lanc-modal]');
    if (excluir) {
      if (!confirm('Excluir este lançamento?')) return;
      await excluirLancamento(excluir.getAttribute('data-excluir-lanc-modal'));
      fecharModal(); recarregar(); return;
    }
    const ver = e.target.closest('[data-ver-recibo-modal]');
    if (ver) { abrirAnexoEmAba(lancamentos.find((l) => l.id === ver.getAttribute('data-ver-recibo-modal'))); return; }
    const remover = e.target.closest('[data-remover-recibo-modal]');
    if (remover) {
      if (!confirm('Remover a nota fiscal deste lançamento?')) return;
      await removerRecibo(remover.getAttribute('data-remover-recibo-modal'));
      fecharModal(); recarregar(); return;
    }
    const anexar = e.target.closest('[data-anexar-recibo-modal]');
    if (anexar) abrirAnexoRecibo(anexar, anexar.getAttribute('data-anexar-recibo-modal'));
  }
  async function salvarEdicaoLanc(id, botao) {
    const dados = {
      etapa: modalEl.querySelector('.m-etapa').value.trim() || 'Geral',
      fornecedor: lerFornecedor(modalEl),
      descricao: modalEl.querySelector('.m-desc').value.trim() || null,
      valor: Number(modalEl.querySelector('.m-valor').value || 0),
      status: modalEl.querySelector('.m-status').value === 'pendente' ? 'pendente' : 'pago',
      pagoPor: modalEl.querySelector('.m-pagopor').value === 'cliente' ? 'cliente' : 'escritorio',
    };
    botao.disabled = true; botao.textContent = 'Salvando…';
    try {
      await atualizarLancamento(id, dados);
      fecharModal(); recarregar();
    } catch (err) {
      botao.disabled = false; botao.textContent = 'Salvar';
      const erro = modalEl.querySelector('[data-m-erro]');
      if (erro) { erro.textContent = 'Erro ao salvar: ' + (err?.message || err); erro.hidden = false; }
    }
  }
  function detalheLancHTML(l) {
    const temNF = Boolean(l.reciboDataUrl || l.reciboUrl || l.temRecibo || l.reciboNome);
    const linha = (rot, val) => `<div class="det-linha"><dt>${rot}</dt><dd>${val}</dd></div>`;
    return `
      <div class="modal-cab">
        <h3>Lançamento</h3>
        <button class="btn btn-x" data-fechar-modal title="Fechar">×</button>
      </div>
      <dl class="lanc-detalhe">
        ${linha('Data', dataBR(l.data))}
        ${linha('Etapa', esc(l.etapa || '—'))}
        ${linha('Fornecedor', l.fornecedor ? esc(l.fornecedor) : '—')}
        ${linha('Descrição', l.descricao ? esc(l.descricao) : '—')}
        ${linha('Valor', `<strong>${moeda(l.valor)}</strong>`)}
        ${linha('Status', `${pillStatus(l.status)}${l.pagoPor === 'cliente' ? ' <span class="tag tag-off">pago direto</span>' : ''}`)}
        ${linha('Nota fiscal', temNF ? `📎 ${esc(l.reciboNome || 'anexada')}` : '—')}
      </dl>
      <div class="modal-acoes">
        ${temNF
          ? `<button class="btn btn-mini" data-ver-recibo-modal="${esc(l.id)}">📎 Ver NF</button>
             <button class="btn btn-mini" data-remover-recibo-modal="${esc(l.id)}">Remover NF</button>`
          : `<button class="btn btn-mini" data-anexar-recibo-modal="${esc(l.id)}">+ anexar NF</button>`}
        <button class="btn btn-mini btn-primary" data-editar-lanc-modal="${esc(l.id)}">✎ Editar</button>
        <button class="btn btn-mini btn-perigo" data-excluir-lanc-modal="${esc(l.id)}">🗑 Excluir</button>
      </div>`;
  }
  function edicaoLancHTML(l) {
    return `
      <div class="modal-cab">
        <h3>Editar lançamento</h3>
        <button class="btn btn-x" data-fechar-modal title="Fechar">×</button>
      </div>
      <div class="modal-form">
        <label>Etapa<input class="m-etapa" list="lista-etapas-edit" value="${esc(l.etapa || '')}" /></label>
        <label>Fornecedor${campoFornecedor(l.fornecedor, fornecedores)}</label>
        <label>Descrição<input class="m-desc" value="${esc(l.descricao || '')}" placeholder="O que foi comprado/pago" /></label>
        <label>Valor (R$)<input class="m-valor" type="number" min="0" step="0.01" value="${esc(String(Number(l.valor || 0)))}" /></label>
        <label>Status
          <select class="m-status"><option value="pago">Pago</option><option value="pendente">Pendente</option></select>
        </label>
        <label>Quem pagou
          <select class="m-pagopor"><option value="escritorio">Escritório (cliente reembolsa)</option><option value="cliente">Cliente (pago direto)</option></select>
        </label>
      </div>
      <p class="erro" data-m-erro hidden></p>
      <div class="modal-acoes">
        <button class="btn btn-ghost" data-cancelar-edicao="${esc(l.id)}">Cancelar</button>
        <button class="btn btn-primary" data-salvar-lanc="${esc(l.id)}">Salvar</button>
      </div>`;
  }

  // Abre a NF (imagem ou PDF) grande na própria tela, com botão de baixar.
  // Antigas têm o arquivo inline; novas ficam em "recibos" e buscamos na hora.
  async function abrirAnexoEmAba(lanc) {
    if (!lanc) return;
    let dado = lanc.reciboDataUrl || lanc.reciboUrl;
    if (!dado) {
      const r = await obterRecibo(lanc.id);
      dado = r?.dataUrl;
    }
    if (dado) abrirAnexo(dado, lanc.reciboNome);
  }

  // Anexar recibo/NF (imagem ou PDF) a um lançamento — otimiza e salva no banco.
  function abrirAnexoRecibo(botao, lancId) {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*,application/pdf';
    input.addEventListener('change', async () => {
      const file = input.files && input.files[0];
      if (!file) return;
      const rotulo = botao.textContent;
      botao.disabled = true;
      botao.textContent = '⏳ enviando…';
      try {
        let dataUrl;
        if (String(file.type).startsWith('image/')) {
          dataUrl = await comprimirParaDataURL(file);           // foto da NF: otimiza
        } else {
          dataUrl = await arquivoParaDataURL(file);             // PDF: mantém
          if (dataURLBytes(dataUrl) > 850_000) {
            throw new Error('PDF muito grande. Envie um PDF menor ou uma foto da nota.');
          }
        }
        await anexarRecibo(lancId, dataUrl, file.name, obra.id);
        recarregar();
      } catch (err) {
        botao.disabled = false;
        botao.textContent = rotulo;
        alert(msgErroAnexo(err));
      }
    });
    input.click();
  }

  // ---- Fotos das visitas ----
  const abrirFotos = container.querySelector('#abrir-fotos');
  const formFotos = container.querySelector('#form-fotos');
  const inputFotos = container.querySelector('#input-fotos');
  const fotoData = container.querySelector('#foto-data');
  const fotoTexto = container.querySelector('#foto-texto');
  const statusFotos = container.querySelector('#status-fotos');
  if (fotoData) fotoData.value = new Date().toISOString().slice(0, 10); // hoje
  if (abrirFotos) {
    abrirFotos.addEventListener('click', () => {
      formFotos.hidden = !formFotos.hidden;
      if (!formFotos.hidden) inputFotos.focus();
    });
    container.querySelector('#cancelar-fotos').addEventListener('click', () => {
      formFotos.hidden = true;
    });
    formFotos.addEventListener('submit', async (e) => {
      e.preventDefault();
      const files = [...(inputFotos.files || [])];
      statusFotos.hidden = false;
      if (!files.length) {
        statusFotos.className = 'status-voz erro';
        statusFotos.textContent = 'Escolha ao menos uma foto.';
        return;
      }
      const base = { texto: fotoTexto.value.trim() || null, dataVisita: fotoData.value || null };
      const btn = container.querySelector('#enviar-fotos');
      btn.disabled = true;
      const btnRotulo = btn.textContent;
      statusFotos.className = 'status-voz status-enviando';
      try {
        let i = 0;
        for (const f of files) {
          i++;
          btn.textContent = `Enviando ${i}/${files.length}…`;
          statusFotos.innerHTML = `<span class="spinner"></span> Otimizando e enviando ${i} de ${files.length}…`;
          // Miniatura leve (~30 KB) para a galeria abrir rápido + imagem cheia
          // (~160 KB) guardada à parte, carregada só ao ampliar/baixar.
          const thumbUrl = await comprimirParaDataURL(f, 30_000, 400);
          const fullUrl = await comprimirParaDataURL(f, 160_000, 1100);
          await enviarFoto(obra.id, { thumbUrl, fullUrl, ...base, nome: f.name });
        }
        recarregar();
      } catch (err) {
        btn.disabled = false;
        btn.textContent = btnRotulo;
        statusFotos.className = 'status-voz erro';
        statusFotos.textContent = msgErroAnexo(err);
      }
    });
  }
  const gridFotosEl = container.querySelector('#grid-fotos');
  gridFotosEl.addEventListener('click', async (e) => {
    const abrir = e.target.closest('[data-abrir-foto]');
    const baixarBtn = e.target.closest('[data-baixar-foto]');
    const del = e.target.closest('[data-del-foto]');
    const obsFoto = e.target.closest('[data-obs-foto]');
    const obsVisita = e.target.closest('[data-obs-visita]');

    // Escrever/editar a observação de UMA foto.
    if (obsFoto) {
      const id = obsFoto.getAttribute('data-obs-foto');
      const f = fotos.find((x) => x.id === id);
      const alvo = obsFoto.closest('figcaption').querySelector('.foto-legenda');
      abrirEdicaoObs(alvo, f?.legenda || '', 'Observação desta foto…', async (valor) => {
        await atualizarFoto(id, { legenda: valor || null });
        recarregar();
      });
      return;
    }

    // Escrever/editar a observação da VISITA (vale para todas as fotos do bloco).
    if (obsVisita) {
      const ids = obsVisita.getAttribute('data-obs-visita').split(',').filter(Boolean);
      const atual = (fotos.find((x) => ids.includes(x.id) && x.texto) || {}).texto || '';
      const alvo = obsVisita.closest('.visita-bloco').querySelector('.visita-obs');
      abrirEdicaoObs(alvo, atual, 'Observação da visita técnica…', async (valor) => {
        for (const id of ids) await atualizarFoto(id, { texto: valor || null });
        recarregar();
      });
      return;
    }

    if (abrir) {
      const numero = numerarFotos(fotos);
      const itens = fotos.map((f) => ({
        thumb: f.thumbUrl || f.dataUrl || f.url,
        url: f.dataUrl || f.url || null,               // antigas já têm a cheia inline
        obterUrl: () => obterFotoBin(f.id),            // novas: busca a cheia sob demanda
        numero: numero.get(f.id),
        nome: f.nome,
        data: fmtDataVisita(f.dataVisita) || dataBR(f.criadoEm ? new Date(f.criadoEm).toISOString() : ''),
        texto: f.texto,
      }));
      abrirLightbox(itens, Number(abrir.getAttribute('data-abrir-foto')) || 0);
      return;
    }
    if (baixarBtn) {
      const f = fotos[Number(baixarBtn.getAttribute('data-baixar-foto'))];
      if (f) {
        const url = f.dataUrl || f.url || await obterFotoBin(f.id);
        if (url) baixarImagem(url, f.nome || 'foto.jpg');
      }
      return;
    }
    if (del) {
      if (!confirm('Excluir esta foto?')) return;
      await excluirFoto(del.getAttribute('data-del-foto'));
      recarregar();
    }
  });

  // Carrega as fotos em segundo plano (são o dado mais pesado) e preenche a
  // grade quando chegam — a tela já abriu com o resto.
  listarFotos(obraId).then((fs) => {
    fotos = fs || [];
    if (gridFotosEl) gridFotosEl.innerHTML = gridFotos(fotos);
  }).catch(() => {
    if (gridFotosEl) gridFotosEl.innerHTML = `<p class="muted">Não foi possível carregar as fotos agora.</p>`;
  });

  // Editor inline de observação (foto ou visita): troca o texto por um campo
  // com Salvar/Cancelar. onSalvar recebe o novo valor e grava no banco.
  function abrirEdicaoObs(alvo, valorAtual, placeholder, onSalvar) {
    if (!alvo || alvo.querySelector('.obs-editor')) return;
    const original = alvo.innerHTML;
    alvo.innerHTML = `
      <div class="obs-editor">
        <textarea class="obs-input" rows="2" placeholder="${esc(placeholder)}">${esc(valorAtual || '')}</textarea>
        <div class="obs-editor-acoes">
          <button class="btn btn-mini obs-cancelar" type="button">Cancelar</button>
          <button class="btn btn-mini btn-primary obs-salvar" type="button">Salvar</button>
        </div>
      </div>`;
    const input = alvo.querySelector('.obs-input');
    input.focus();
    alvo.querySelector('.obs-cancelar').addEventListener('click', () => { alvo.innerHTML = original; });
    alvo.querySelector('.obs-salvar').addEventListener('click', async () => {
      const btn = alvo.querySelector('.obs-salvar');
      btn.disabled = true; btn.textContent = 'Salvando…';
      try {
        await onSalvar(input.value.trim());
      } catch (err) {
        btn.disabled = false; btn.textContent = 'Salvar';
        alert('Não foi possível salvar: ' + (err?.message || err));
      }
    });
  }

  // ---- Projeto da obra (link ou arquivo) ----
  // Os ARQUIVOS de projeto ficam FORA do documento da obra (em fotos_bin, por
  // id), para não estourar o limite de 1 MB do documento quando há vários. O
  // array obra.projetos guarda só metadados (nome, link ou nome do arquivo).
  const abrirProjeto = container.querySelector('#abrir-projeto');
  const abrirLink = container.querySelector('#abrir-link');
  const formProjeto = container.querySelector('#form-projeto');
  const listaProjEl = container.querySelector('#lista-projetos');
  const fileRow = container.querySelector('#proj-file-row');
  const linkRow = container.querySelector('#proj-link-row');
  const linkRotulo = container.querySelector('#proj-link-rotulo');
  let projEditando = null; // id do projeto em edição (ou null = novo)

  // Migra projetos antigos com arquivo inline (dataUrl no doc da obra) para o
  // cofre à parte, deixando o documento leve — senão qualquer gravação nova
  // reescreve os antigos e estoura o 1 MB.
  const enxugarProjetos = async () => {
    for (const p of (obra.projetos || [])) {
      if (p.dataUrl) {
        await salvarFotoBin(p.id, obra.id, p.dataUrl);
        // Se for imagem, gera a miniatura para aparecer na lista.
        if (/^data:image\//i.test(p.dataUrl) && !p.thumbUrl) {
          try { p.thumbUrl = await comprimirParaDataURL(dataURLParaBlob(p.dataUrl), 30_000, 400); p.ehImagem = true; } catch { /* segue sem thumb */ }
        }
        p.temArquivo = true;
        delete p.dataUrl;
      }
    }
  };

  const arquivoAtualEl = container.querySelector('#proj-arquivo-atual');

  // Mostra o arquivo já anexado (na edição) com a opção de remover só ele,
  // mantendo o projeto (vira link ou fica sem arquivo, sem apagar o registro).
  const mostrarArquivoAtual = (p) => {
    if (p && p.temArquivo) {
      arquivoAtualEl.hidden = false;
      arquivoAtualEl.innerHTML = `
        <span class="proj-arquivo-atual-nome">📎 ${esc(p.arquivo || 'arquivo anexado')}</span>
        <button type="button" class="btn btn-x" id="remover-arquivo-proj" title="Remover arquivo anexado">× remover arquivo</button>`;
    } else {
      arquivoAtualEl.hidden = true;
      arquivoAtualEl.innerHTML = '';
    }
  };

  // modo: 'arquivo' (mostra envio de arquivo + campo de link como alternativa)
  // ou 'link' (só o campo de link). Ao editar, o modo segue o tipo do item.
  const abrirFormProjeto = (p = null, modo = 'arquivo') => {
    projEditando = p ? p.id : null;
    if (p) modo = (p.link && !p.temArquivo) ? 'link' : 'arquivo';
    formProjeto.hidden = false;
    container.querySelector('#proj-nome').value = p?.nome || '';
    container.querySelector('#proj-link').value = p?.link || '';
    container.querySelector('#proj-file').value = '';
    // Em modo 'link' escondemos o envio de arquivo, deixando a ação inequívoca.
    fileRow.hidden = modo === 'link';
    linkRow.hidden = false;
    if (linkRotulo) {
      linkRotulo.textContent = modo === 'link'
        ? 'Cole o link (Google Drive, Dropbox, etc.)'
        : '… ou colar um link (Google Drive, Dropbox, etc.)';
    }
    container.querySelector('#salvar-projeto').textContent = p ? 'Salvar' : 'Adicionar';
    const st = container.querySelector('#status-projeto');
    if (st) st.hidden = true;
    mostrarArquivoAtual(p);
    (modo === 'link'
      ? container.querySelector('#proj-link')
      : container.querySelector('#proj-nome')).focus();
  };

  // Remove APENAS o arquivo anexado do projeto em edição (mantém o registro).
  arquivoAtualEl.addEventListener('click', async (e) => {
    if (!e.target.closest('#remover-arquivo-proj')) return;
    if (!projEditando) return;
    if (!confirm('Remover o arquivo anexado deste projeto? O projeto continua na lista.')) return;
    const p = (obra.projetos || []).find((x) => x.id === projEditando);
    if (!p) return;
    const atualizado = {
      ...p,
      temArquivo: false,
      arquivo: null,
      ehImagem: false,
      thumbUrl: null,
    };
    delete atualizado.dataUrl; // arquivo antigo inline: some do documento
    const novos = (obra.projetos || []).map((x) => (x.id === p.id ? atualizado : x));
    await atualizarObra(obra.id, { projetos: novos });
    await excluirBin(p.id).catch(() => {});
    obra.projetos = novos;
    listaProjEl.innerHTML = listaProjetos(obra.projetos);
    mostrarArquivoAtual(atualizado);
  });

  if (abrirProjeto) {
    abrirProjeto.addEventListener('click', () => {
      if (formProjeto.hidden || projEditando) abrirFormProjeto(null, 'arquivo');
      else formProjeto.hidden = true;
    });
    if (abrirLink) {
      abrirLink.addEventListener('click', () => abrirFormProjeto(null, 'link'));
    }
    container.querySelector('#cancelar-projeto').addEventListener('click', () => {
      formProjeto.hidden = true;
      projEditando = null;
    });
    formProjeto.addEventListener('submit', async (e) => {
      e.preventDefault();
      let nome = container.querySelector('#proj-nome').value.trim();
      const link = container.querySelector('#proj-link').value.trim();
      const file = container.querySelector('#proj-file').files[0];
      const status = container.querySelector('#status-projeto');
      status.hidden = false;
      if (!link && !file && !projEditando) {
        status.className = 'status-voz erro';
        status.textContent = 'Envie uma imagem/arquivo ou cole um link.';
        return;
      }
      if (!nome) nome = file ? file.name.replace(/\.[^.]+$/, '') : (link ? 'Link do projeto' : 'Projeto');
      const btn = container.querySelector('#salvar-projeto');
      const rot = btn.textContent;
      btn.disabled = true;
      status.className = 'status-voz';
      status.innerHTML = '<span class="spinner"></span> Salvando…';
      try {
        await enxugarProjetos(); // deixa o doc leve antes de gravar

        // Monta o projeto (novo ou o que está sendo editado).
        const base = projEditando
          ? { ...(obra.projetos || []).find((x) => x.id === projEditando) }
          : { id: crypto.randomUUID(), criadoEm: Date.now() };
        base.nome = nome;

        // O ARQUIVO tem prioridade (é o que mostra miniatura/abre no visor).
        // Só usa o link quando não há arquivo escolhido.
        if (file) {
          const ehImagem = String(file.type).startsWith('image/');
          const dataUrl = ehImagem
            ? await comprimirParaDataURL(file, 300_000, 1600)
            : await arquivoParaDataURL(file);
          // Cada arquivo vira um documento próprio (limite ~1 MB do Firestore).
          if (String(dataUrl).length > 1_000_000) {
            throw new Error('Esse arquivo é grande demais para anexar direto. Cole um LINK (Google Drive/Dropbox) no campo abaixo — ideal para PDF/DWG/RVT pesados.');
          }
          await salvarFotoBin(base.id, obra.id, dataUrl); // binário à parte
          base.temArquivo = true;
          base.arquivo = file.name;
          base.ehImagem = ehImagem;
          base.thumbUrl = ehImagem ? await comprimirParaDataURL(file, 30_000, 400) : null;
          base.link = null;
        } else if (link) {
          base.link = /^https?:\/\//i.test(link) ? link : 'https://' + link;
          // Se antes era arquivo, limpa o binário e a miniatura.
          if (base.temArquivo) { await excluirBin(base.id); }
          base.temArquivo = false;
          base.arquivo = null;
          base.thumbUrl = null;
          base.ehImagem = false;
        }

        const novos = projEditando
          ? (obra.projetos || []).map((x) => (x.id === base.id ? base : x))
          : [...(obra.projetos || []), base];
        await atualizarObra(obra.id, { projetos: novos });
        obra.projetos = novos;
        listaProjEl.innerHTML = listaProjetos(obra.projetos);
        formProjeto.reset();
        formProjeto.hidden = true;
        status.hidden = true;
        projEditando = null;
        btn.disabled = false;
        btn.textContent = rot;
      } catch (err) {
        btn.disabled = false;
        btn.textContent = rot;
        status.className = 'status-voz erro';
        status.textContent = err?.message || 'Não foi possível salvar.';
      }
    });
  }

  listaProjEl.addEventListener('click', async (e) => {
    const ver = e.target.closest('[data-ver-projeto]');
    if (ver) {
      const p = (obra.projetos || []).find((x) => x.id === ver.getAttribute('data-ver-projeto'));
      if (!p) return;
      let dado = p.dataUrl;                       // antigos: inline
      if (!dado && p.temArquivo) dado = await obterFotoBin(p.id); // novos: cofre
      if (dado) abrirAnexo(dado, p.arquivo || p.nome);
      else if (p.link) window.open(p.link, '_blank', 'noopener');
      return;
    }
    const editar = e.target.closest('[data-edit-projeto]');
    if (editar) {
      const p = (obra.projetos || []).find((x) => x.id === editar.getAttribute('data-edit-projeto'));
      if (p) abrirFormProjeto(p);
      return;
    }
    const del = e.target.closest('[data-del-projeto]');
    if (del) {
      if (!confirm('Remover este projeto?')) return;
      const id = del.getAttribute('data-del-projeto');
      const alvo = (obra.projetos || []).find((x) => x.id === id);
      const novos = (obra.projetos || []).filter((x) => x.id !== id);
      await atualizarObra(obra.id, { projetos: novos });
      if (alvo?.temArquivo) await excluirBin(id);
      obra.projetos = novos;
      listaProjEl.innerHTML = listaProjetos(obra.projetos);
    }
  });
}

// ---------------------------------------------------------------------------
// Lançamento (voz + IA)
// ---------------------------------------------------------------------------
function configurarLancamento(container, obra, etapas, fornecedores, recarregar) {
  const btnMic = container.querySelector('#btn-mic');
  const inputTexto = container.querySelector('#texto-livre');
  const btnInterpretar = container.querySelector('#btn-interpretar');
  const statusVoz = container.querySelector('#status-voz');
  const preview = container.querySelector('#preview');

  if (!reconhecimentoDisponivel()) {
    btnMic.disabled = true;
    btnMic.title = 'Seu navegador não suporta voz — use o campo de texto.';
  }

  const setStatus = (msg, tipo = '') => {
    if (!msg) { statusVoz.hidden = true; return; }
    statusVoz.hidden = false;
    statusVoz.textContent = msg;
    statusVoz.className = `status-voz ${tipo}`;
  };

  // Manda o texto para a IA (Netlify Function) e mostra o preview editável.
  async function interpretar(texto) {
    if (!texto || !texto.trim()) return;
    preview.innerHTML = '';
    setStatus('Organizando com a IA…');
    btnInterpretar.disabled = true;

    try {
      const resp = await fetch('/.netlify/functions/interpretar-lancamento', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ texto, etapas: etapas.map((e) => e.nome) }),
      });
      const dados = await resp.json();
      btnInterpretar.disabled = false;

      if (!resp.ok || !dados.ok) {
        setStatus('Não consegui interpretar agora. Confira a chave da IA ou tente de novo.', 'erro');
        return;
      }
      setStatus('');
      mostrarPreview(dados.lancamento);
    } catch {
      btnInterpretar.disabled = false;
      setStatus('Falha de conexão com a IA.', 'erro');
    }
  }

  function mostrarPreview(l) {
    preview.innerHTML = `
      <div class="preview-card">
        <p class="muted">Confira e ajuste antes de salvar:</p>
        <div class="form-grid">
          <label>Etapa<input id="p-etapa" value="${esc(l.etapa || '')}" /></label>
          <label>Fornecedor${campoFornecedor(l.fornecedor, fornecedores)}</label>
          <label>Descrição<input id="p-descricao" value="${esc(l.descricao || '')}" /></label>
          <label>Valor (R$)<input id="p-valor" type="number" min="0" step="0.01" value="${Number(l.valor || 0)}" /></label>
          <label>Status
            <select id="p-status">
              <option value="pago" ${l.status === 'pago' ? 'selected' : ''}>Pago</option>
              <option value="pendente" ${l.status === 'pendente' ? 'selected' : ''}>Pendente</option>
            </select>
          </label>
          <label>Quem pagou
            <select id="p-pagopor">
              <option value="escritorio">Escritório (cliente reembolsa)</option>
              <option value="cliente">Cliente (pago direto)</option>
            </select>
          </label>
        </div>
        <div class="row-end">
          <button class="btn btn-ghost" id="p-cancelar">Descartar</button>
          <button class="btn btn-primary" id="p-salvar">Salvar lançamento</button>
        </div>
      </div>`;

    ligarFornecedor(preview);
    preview.querySelector('#p-cancelar').addEventListener('click', () => {
      preview.innerHTML = '';
    });
    preview.querySelector('#p-salvar').addEventListener('click', async () => {
      const novo = {
        obraId: obra.id,
        etapa: preview.querySelector('#p-etapa').value.trim() || 'Geral',
        fornecedor: lerFornecedor(preview),
        descricao: preview.querySelector('#p-descricao').value.trim() || null,
        valor: Number(preview.querySelector('#p-valor').value || 0),
        status: preview.querySelector('#p-status').value,
        pagoPor: preview.querySelector('#p-pagopor').value,
      };
      const btn = preview.querySelector('#p-salvar');
      btn.disabled = true; btn.textContent = 'Salvando…';
      try {
        await criarLancamento(novo);
      } catch (error) {
        btn.disabled = false; btn.textContent = 'Salvar lançamento';
        setStatus(error?.message || 'Erro ao salvar.', 'erro');
        return;
      }
      recarregar();
    });
  }

  // Botão de microfone — grava continuamente até clicar em "Parar".
  let rec = null;

  const resetMic = () => {
    rec = null;
    btnMic.classList.remove('gravando');
    btnMic.textContent = '🎤 Falar';
  };

  btnMic.addEventListener('click', () => {
    // Já está gravando -> encerra e manda pra IA.
    if (rec) {
      setStatus('Processando o que você falou…');
      parar(rec);
      return;
    }
    // Começa a gravar.
    setStatus('Ouvindo… fale à vontade e clique em "Parar" quando terminar.');
    btnMic.classList.add('gravando');
    btnMic.textContent = '■ Parar';
    rec = ouvir({
      onParcial: (texto) => {
        inputTexto.value = texto; // mostra o texto aparecendo ao vivo
      },
      onErro: (err) => {
        resetMic();
        setStatus(err === 'not-allowed' || err === 'service-not-allowed'
          ? 'Permita o microfone no navegador para usar a voz.'
          : 'Não foi possível ouvir. Use o campo de texto.', 'erro');
      },
      onFim: (textoFinal) => {
        resetMic();
        const texto = (textoFinal || inputTexto.value || '').trim();
        if (texto) interpretar(texto);
        else setStatus('Não captei nada. Tente de novo ou digite.', 'erro');
      },
    });
  });

  btnInterpretar.addEventListener('click', () => interpretar(inputTexto.value));
  inputTexto.addEventListener('keydown', (e) => {
    // Enter comum quebra linha (é um textarea); Ctrl/Cmd+Enter organiza com a IA.
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      interpretar(inputTexto.value);
    }
  });
}

// ---------------------------------------------------------------------------
// Tabelas
// ---------------------------------------------------------------------------
// Sugestões de etapas padrão (CAIXA) ainda não cadastradas — 1 clique adiciona.
function chipsPadrao(etapas) {
  const tem = new Set(etapas.map((e) => e.nome.toLowerCase()));
  const faltam = ETAPAS_PADRAO.filter((n) => !tem.has(n.toLowerCase()));
  if (!faltam.length) return '';
  return `<div class="chips-padrao">
    <span class="chips-label">Etapas padrão — clique para adicionar:</span>
    ${faltam.map((n) => `<button type="button" class="chip" data-chip-etapa="${esc(n)}">+ ${esc(n)}</button>`).join('')}
  </div>`;
}

function tabelaEtapas(etapas, lancamentos) {
  // Realizado por etapa (casado pelo nome).
  const realizado = {};
  for (const l of lancamentos) {
    realizado[l.etapa] = (realizado[l.etapa] || 0) + Number(l.valor || 0);
  }

  // Linhas: etapas cadastradas + etapas que só aparecem em lançamentos.
  const nomes = new Set(etapas.map((e) => e.nome));
  const extras = Object.keys(realizado).filter((n) => !nomes.has(n));

  if (etapas.length === 0 && extras.length === 0) {
    return `<p class="muted">Nenhuma etapa ainda.</p>`;
  }

  const linhaEtapa = (nome, orcado, idEtapa) => {
    const real = realizado[nome] || 0;
    const p = pct(real, orcado);
    const estouro = orcado > 0 && real > orcado;
    return `
      <tr>
        <td>${esc(nome)}</td>
        <td class="num">${moeda(orcado)}</td>
        <td class="num">${moeda(real)}</td>
        <td>
          <div class="barra mini ${estouro ? 'estouro' : ''}">
            <span style="width:${Math.min(p, 100)}%"></span>
          </div>
          <small class="${estouro ? 'neg' : 'muted'}">${orcado > 0 ? p + '%' : '—'}</small>
        </td>
        <td class="acoes" style="white-space:nowrap">
          ${idEtapa ? `
            <button class="btn btn-x" data-edit-etapa="${esc(idEtapa)}" data-nome="${esc(nome)}" data-orcado="${orcado}" title="Editar etapa">✎</button>
            <button class="btn btn-x" data-del-etapa="${esc(idEtapa)}" title="Remover etapa">×</button>` : ''}
        </td>
      </tr>`;
  };

  return `
    <table class="tabela">
      <thead>
        <tr><th>Etapa</th><th class="num">Orçado</th><th class="num">Realizado</th><th>Andamento</th><th></th></tr>
      </thead>
      <tbody>
        ${etapas.map((e) => linhaEtapa(e.nome, Number(e.orcado || 0), e.id)).join('')}
        ${extras.map((n) => linhaEtapa(n, 0, null)).join('')}
      </tbody>
    </table>`;
}

// Lista dos projetos anexados à obra (link ou arquivo).
// Projetos com LINK abrem direto num <a> (novo aba); com ARQUIVO abrem no visor.
function listaProjetos(projetos) {
  const arr = projetos || [];
  if (!arr.length) return `<p class="muted">Nenhum projeto anexado. Adicione o link ou o arquivo do projeto.</p>`;
  return `<ul class="proj-lista">
    ${arr.map((p) => {
      const ehLink = Boolean(p.link);
      const href = ehLink ? (/^https?:\/\//i.test(p.link) ? p.link : 'https://' + p.link) : '';
      const ext = (p.arquivo && p.arquivo.includes('.')) ? p.arquivo.split('.').pop().toLowerCase() : '';
      const rotulo = ehLink ? '(link)' : (ext ? `(${ext})` : '');
      // Imagem: miniatura clicável (miniatura própria, ou a imagem inline antiga).
      // Link: 🔗. Outro arquivo: 📄/📐.
      const thumbSrc = p.thumbUrl || (p.dataUrl && /^data:image\//i.test(p.dataUrl) ? p.dataUrl : '');
      const visual = thumbSrc
        ? `<button class="proj-thumb" data-ver-projeto="${esc(p.id)}" title="Ver imagem"><img src="${esc(thumbSrc)}" alt="${esc(p.nome || 'projeto')}" loading="lazy" /></button>`
        : `<span class="proj-ico">${ehLink ? '🔗' : (ext === 'pdf' ? '📄' : '📐')}</span>`;
      const abrir = ehLink
        ? `<a class="btn btn-mini" href="${esc(href)}" target="_blank" rel="noopener">Abrir ↗</a>`
        : `<button class="btn btn-mini" data-ver-projeto="${esc(p.id)}">Abrir</button>`;
      return `
      <li class="proj-item">
        <span class="proj-info">
          ${visual}
          <span class="proj-nome">${esc(p.nome || 'Projeto')}${rotulo ? ` <small class="muted">${rotulo}</small>` : ''}</span>
        </span>
        <span class="proj-acoes">
          ${abrir}
          <button class="btn btn-x" data-edit-projeto="${esc(p.id)}" title="Editar">✎</button>
          <button class="btn btn-x" data-del-projeto="${esc(p.id)}" title="Remover">×</button>
        </span>
      </li>`;
    }).join('')}
  </ul>`;
}

// Numera as fotos na MESMA ordem em que aparecem (por visita, mais recente
// primeiro). O número é igual nos dois painéis (interno e do cliente), então a
// cliente pode dizer "a foto 5" e a arquiteta sabe qual é.
export function numerarFotos(fotos) {
  const grupos = new Map();
  fotos.forEach((f) => {
    const chave = String(f.dataVisita || '').slice(0, 10)
      || (f.criadoEm ? new Date(f.criadoEm).toISOString().slice(0, 10) : 'sem-data');
    if (!grupos.has(chave)) grupos.set(chave, []);
    grupos.get(chave).push(f);
  });
  const chaves = [...grupos.keys()].sort((a, b) => String(b).localeCompare(String(a)));
  const mapa = new Map();
  let n = 0;
  for (const c of chaves) for (const f of grupos.get(c)) mapa.set(f.id, ++n);
  return mapa;
}

// Fotos das visitas agrupadas em BLOCOS por visita técnica (uma data = um bloco).
// Cada bloco tem: título "Visita técnica" + data ao lado, um espaço para a
// observação da visita, e a grade de fotos — cada foto com observação própria.
function gridFotos(fotos) {
  if (!fotos.length) return `<p class="muted">Nenhuma foto ainda. Envie as fotos das visitas à obra.</p>`;

  const numero = numerarFotos(fotos);

  // Agrupa por visita. A chave é a data da visita; sem data, cai no dia em que
  // foi enviada. Guardamos o índice original de cada foto (o carrossel usa ele).
  const grupos = new Map();
  fotos.forEach((f, idx) => {
    const chave = String(f.dataVisita || '').slice(0, 10)
      || (f.criadoEm ? new Date(f.criadoEm).toISOString().slice(0, 10) : 'sem-data');
    if (!grupos.has(chave)) grupos.set(chave, []);
    grupos.get(chave).push({ f, idx });
  });

  // Visitas mais recentes primeiro.
  const chaves = [...grupos.keys()].sort((a, b) => String(b).localeCompare(String(a)));

  return chaves.map((chave) => {
    const itens = grupos.get(chave);
    const data = chave === 'sem-data' ? '' : fmtDataVisita(chave);
    // A observação da visita é compartilhada pelo bloco (vem do envio das fotos).
    const obsVisita = (itens.find((it) => it.f.texto) || {}).f?.texto || '';
    const ids = itens.map((it) => it.f.id).join(',');

    return `
    <div class="visita-bloco" data-visita="${esc(chave)}">
      <div class="visita-cab">
        <h3 class="visita-titulo">Visita técnica${data ? ` <span class="visita-data">${data}</span>` : ''}</h3>
        <button class="btn btn-x" data-obs-visita="${esc(ids)}" title="Observação da visita">✎</button>
      </div>
      <p class="visita-obs">${obsVisita
        ? esc(obsVisita)
        : '<span class="muted">Sem observação desta visita. Clique no ✎ para escrever.</span>'}</p>
      <div class="fotos-grid">
        ${itens.map(({ f, idx }) => `
        <figure class="foto-item">
          <button class="foto-thumb" data-abrir-foto="${idx}" title="Ampliar">
            <span class="foto-num">${numero.get(f.id)}</span>
            <img src="${esc(f.thumbUrl || f.dataUrl || f.url)}" alt="${esc(f.nome || 'foto')}" loading="lazy" />
            <span class="foto-zoom">⤢</span>
          </button>
          <figcaption>
            <div class="foto-meta">
              <span class="foto-legenda">${f.legenda
                ? esc(f.legenda)
                : '<span class="muted">sem observação</span>'}</span>
              <span class="foto-acoes">
                <button class="btn btn-x" data-obs-foto="${esc(f.id)}" title="Observação da foto">✎</button>
                <button class="btn btn-x" data-baixar-foto="${idx}" title="Baixar">⬇</button>
                <button class="btn btn-x" data-del-foto="${esc(f.id)}" title="Excluir">×</button>
              </span>
            </div>
          </figcaption>
        </figure>`).join('')}
      </div>
    </div>`;
  }).join('');
}

// Lista de lançamentos em CARTÕES (sem rolagem lateral no celular). Cada cartão
// é um resumo tocável (data, status, etapa, fornecedor/descrição e valor) que
// abre o popup com todos os detalhes e a edição.
function listaLancamentos(lancamentos) {
  if (lancamentos.length === 0) return `<p class="muted">Nenhum lançamento ainda.</p>`;
  return `<div class="lanc-lista">
    ${lancamentos.map((l) => {
      const temNF = Boolean(l.reciboDataUrl || l.reciboUrl || l.temRecibo || l.reciboNome);
      const sub = [l.fornecedor, l.descricao].filter(Boolean).map(esc).join(' · ');
      return `
      <button type="button" class="lanc-card" data-abrir-lanc="${esc(l.id)}">
        <span class="lanc-card-info">
          <span class="lanc-card-topo">
            <span class="lanc-card-data">${dataBR(l.data)}</span>
            ${pillStatus(l.status)}${l.pagoPor === 'cliente' ? '<span class="tag tag-off">pago direto</span>' : ''}
            ${temNF ? '<span class="lanc-card-nf" title="Nota fiscal anexada">📎</span>' : ''}
          </span>
          <span class="lanc-card-etapa">${esc(l.etapa || '')}</span>
          ${sub ? `<span class="lanc-card-sub">${sub}</span>` : ''}
        </span>
        <span class="lanc-card-lado">
          <strong class="lanc-card-valor">${moeda(l.valor)}</strong>
          <span class="lanc-card-chev">›</span>
        </span>
      </button>`;
    }).join('')}
  </div>`;
}

// ---------------------------------------------------------------------------
// Campo Fornecedor: um <select> nativo com a lista de fornecedores cadastrados
// (confiável no celular, ao contrário do <datalist>) + a opção "Outro" que
// revela um campo de texto para escrever um novo na hora.
// ---------------------------------------------------------------------------
function campoFornecedor(valorAtual, fornecedores) {
  const nomes = [...new Set((fornecedores || []).map((f) => f && f.nome).filter(Boolean))];
  const atual = (valorAtual || '').trim();
  const naLista = atual && nomes.includes(atual);
  const opcoes = ['<option value="">— Fornecedor —</option>']
    .concat(nomes.map((n) => `<option value="${esc(n)}"${n === atual ? ' selected' : ''}>${esc(n)}</option>`))
    .concat([`<option value="__novo__"${atual && !naLista ? ' selected' : ''}>➕ Outro (escrever)</option>`])
    .join('');
  const mostraInput = atual && !naLista;
  return `<span class="forn-campo" data-forn>
    <select class="forn-sel">${opcoes}</select>
    <input class="forn-input" placeholder="Nome do fornecedor" value="${mostraInput ? esc(atual) : ''}"${mostraInput ? '' : ' hidden'} />
  </span>`;
}
function ligarFornecedor(scope) {
  const campo = scope.querySelector('[data-forn]');
  if (!campo) return;
  const sel = campo.querySelector('.forn-sel');
  const inp = campo.querySelector('.forn-input');
  sel.addEventListener('change', () => {
    if (sel.value === '__novo__') { inp.hidden = false; inp.value = ''; inp.focus(); }
    else { inp.hidden = true; inp.value = ''; }
  });
}
function lerFornecedor(scope) {
  const campo = scope.querySelector('[data-forn]');
  if (!campo) return null;
  const sel = campo.querySelector('.forn-sel');
  const inp = campo.querySelector('.forn-input');
  if (sel.value === '__novo__') return inp.value.trim() || null;
  return sel.value.trim() || null;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function soma(arr) {
  return arr.reduce((t, l) => t + Number(l.valor || 0), 0);
}
function kpi(rotulo, valor, cls = '') {
  return `<div class="kpi"><small>${rotulo}</small><strong class="${cls}">${valor}</strong></div>`;
}
function flash(btn, msg) {
  const original = btn.textContent;
  btn.textContent = msg;
  setTimeout(() => { btn.textContent = original; }, 1500);
}

// Mensagem pronta para o WhatsApp: apresenta o link do acompanhamento da obra e
// ensina o cliente a salvar o painel como um app na tela inicial (iPhone e
// Android). Formatação com *asteriscos* (negrito do WhatsApp).
function montarMensagemLinkCliente({ obra, link }) {
  const saudacao = obra.cliente ? `Olá, ${obra.cliente}!` : 'Olá!';
  return [
    saudacao,
    '',
    `Aqui está o acompanhamento da sua obra *${obra.nome}* — você vê fotos, andamento e pagamentos em tempo real:`,
    '',
    link,
    '',
    '*Deixe como um app no seu celular* (abre com 1 toque, sem baixar nada):',
    '',
    '*iPhone (Safari):*',
    '1) Abra o link acima no Safari',
    '2) Toque no ícone de compartilhar (o quadradinho com a setinha para cima)',
    '3) Toque em "Adicionar à Tela de Início"',
    '4) Toque em "Adicionar"',
    '',
    '*Android (Chrome):*',
    '1) Abra o link acima no Chrome',
    '2) Toque no menu de três pontinhos, no canto',
    '3) Toque em "Adicionar à tela inicial" (ou "Instalar app")',
    '4) Confirme',
    '',
    'Pronto! O acompanhamento fica sempre à mão.',
  ].join('\n');
}
