import { configurado } from '../firebase.js';
import { obterConvite, criarBriefingPublico } from '../dados.js';
import { esc } from '../lib/format.js';
import { caixaLogo } from '../lib/marca.js';
import { BRIEFING, perguntasDoBriefing } from '../lib/briefingModelo.js';

// Formulário público do briefing do projeto, acessado por /briefing/{token}.
// A arquiteta gera o link e envia ao cliente; as respostas vão direto ao banco
// (presas ao dono do convite pelas Regras).
export async function renderBriefingPublico(container, token) {
  if (!configurado) {
    container.innerHTML = `<div class="publica"><div class="pub-vazio">
      <h1>Indisponível</h1><p class="muted">Configuração do sistema incompleta.</p></div></div>`;
    return;
  }

  container.innerHTML = `<div class="publica"><p class="muted center">Carregando…</p></div>`;

  const convite = await obterConvite(token);
  if (!convite) {
    container.innerHTML = `<div class="publica"><div class="pub-vazio">
      <h1>Link inválido</h1>
      <p class="muted">Este link de briefing não é válido ou expirou. Peça um novo ao escritório.</p>
    </div></div>`;
    return;
  }

  const perguntas = perguntasDoBriefing();

  const campoPergunta = (p) => {
    const nome = `p_${p.id}`;
    if (p.tipo === 'texto') {
      return `<input class="brf-input" name="${nome}" />`;
    }
    if (p.tipo === 'textarea') {
      return `<textarea class="brf-input brf-area" name="${nome}" rows="3"></textarea>`;
    }
    if (p.tipo === 'radio') {
      const opts = p.opcoes.map((o) => `
        <label class="brf-opcao">
          <input type="radio" name="${nome}" value="${esc(o)}" /> <span>${esc(o)}</span>
        </label>`).join('');
      return `<div class="brf-opcoes">${opts}</div>`;
    }
    // check (múltipla escolha)
    const opts = (p.opcoes || []).map((o) => `
      <label class="brf-opcao">
        <input type="checkbox" name="${nome}" value="${esc(o)}" /> <span>${esc(o)}</span>
      </label>`).join('');
    const outro = p.outro ? `
      <label class="brf-opcao brf-outro">
        <input type="checkbox" data-outro="${nome}" /> <span>Outro:</span>
        <input class="brf-input brf-outro-txt" data-outrotxt="${nome}" disabled />
      </label>` : '';
    return `<div class="brf-opcoes">${opts}${outro}</div>`;
  };

  const secoesHtml = BRIEFING.secoes.map((s) => {
    const pgs = s.perguntas.map((p) => `
      <div class="brf-pergunta">
        <p class="brf-label">${esc(p.label)}</p>
        ${campoPergunta(p)}
      </div>`).join('');
    return `<section class="card brf-secao">
      <h2 class="brf-secao-titulo">${esc(s.titulo)}</h2>
      ${pgs}
    </section>`;
  }).join('');

  container.innerHTML = `
    <div class="publica">
      <header class="pub-logo-header">${caixaLogo('caixa-logo-cliente')}</header>

      <form id="form-brf" class="brf-form" novalidate>
        <section class="card brf-intro">
          <h1 class="cad-titulo">${esc(BRIEFING.titulo)}</h1>
          <p class="muted">${esc(BRIEFING.intro)}</p>
          <label class="brf-nome">Nome de quem está respondendo
            <input class="brf-input" id="brf-cliente" />
          </label>
        </section>

        ${secoesHtml}

        <section class="card brf-envio">
          <button class="btn btn-primary" type="submit" id="brf-enviar">Enviar briefing</button>
          <p class="erro" id="brf-erro" hidden></p>
        </section>
      </form>

      <footer class="pub-rodape">
        <p class="pub-rodape-nome">SCHRAMM ARQUITETURA E ENGENHARIA</p>
        <p class="muted">Suas respostas são usadas apenas para o desenvolvimento do seu projeto.</p>
      </footer>
    </div>`;

  const form = container.querySelector('#form-brf');
  const erro = container.querySelector('#brf-erro');

  // Habilita o campo livre "Outro" quando marcado.
  container.querySelectorAll('[data-outro]').forEach((chk) => {
    const alvo = chk.getAttribute('data-outro');
    const txt = container.querySelector(`[data-outrotxt="${alvo}"]`);
    chk.addEventListener('change', () => {
      txt.disabled = !chk.checked;
      if (chk.checked) txt.focus(); else txt.value = '';
    });
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    erro.hidden = true;

    const cliente = container.querySelector('#brf-cliente').value.trim();

    const respostas = [];
    perguntas.forEach((p) => {
      const nome = `p_${p.id}`;
      let resposta = '';
      if (p.tipo === 'texto' || p.tipo === 'textarea') {
        resposta = (form.querySelector(`[name="${nome}"]`)?.value || '').trim();
      } else if (p.tipo === 'radio') {
        resposta = form.querySelector(`input[name="${nome}"]:checked`)?.value || '';
      } else {
        const marcados = Array.from(form.querySelectorAll(`input[name="${nome}"]:checked`)).map((i) => i.value);
        const outroChk = form.querySelector(`[data-outro="${nome}"]`);
        if (outroChk && outroChk.checked) {
          const t = form.querySelector(`[data-outrotxt="${nome}"]`)?.value.trim();
          if (t) marcados.push(t);
        }
        resposta = marcados.join('; ');
      }
      if (resposta) respostas.push({ secao: p.secao, pergunta: p.label, resposta });
    });

    if (!respostas.length) {
      erro.textContent = 'Responda ao menos uma pergunta antes de enviar.';
      erro.hidden = false;
      return;
    }

    const registro = {
      token,
      ownerId: convite.ownerId,
      obraId: convite.obraId || null,
      obraNome: convite.obraNome || convite.rotulo || null,
      rotulo: convite.rotulo || null,
      cliente: cliente || null,
      respostas,
    };

    const btn = container.querySelector('#brf-enviar');
    btn.disabled = true; btn.textContent = 'Enviando…';

    try {
      await criarBriefingPublico(registro);
    } catch {
      btn.disabled = false; btn.textContent = 'Enviar briefing';
      erro.textContent = 'Não foi possível enviar agora. Tente novamente.';
      erro.hidden = false;
      return;
    }

    form.innerHTML = `
      <section class="card cadastro-card">
        <div class="cad-sucesso">
          <div class="cad-check">✓</div>
          <h1 class="cad-titulo">Briefing enviado!</h1>
          <p class="muted">Obrigado${cliente ? ', ' + esc(cliente) : ''}. O escritório já recebeu suas respostas. 🙌</p>
        </div>
      </section>`;
    window.scrollTo(0, 0);
  });
}
