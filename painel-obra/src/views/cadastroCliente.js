import { configurado } from '../firebase.js';
import { obterConvite, criarClientePublico } from '../dados.js';
import { esc } from '../lib/format.js';
import { caixaLogo } from '../lib/marca.js';

// Formulário público de autopreenchimento do cliente, acessado por
// /cadastro/{token}. Valida o token do convite; se válido, o cliente preenche
// e os dados vão direto ao banco (presos ao dono do convite pelas Regras).
export async function renderCadastroCliente(container, token) {
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
      <p class="muted">Este link de cadastro não é válido ou expirou. Peça um novo ao escritório.</p>
    </div></div>`;
    return;
  }

  container.innerHTML = `
    <div class="publica">
      <header class="pub-logo-header">${caixaLogo('caixa-logo-cliente')}</header>

      <section class="card cadastro-card">
        <h1 class="cad-titulo">Cadastro do cliente</h1>
        <p class="muted">Preencha seus dados abaixo. É rápido — e ajuda o escritório a organizar tudo.</p>
        <form id="form-cad" class="form-grid" novalidate>
          <label class="full">Nome completo *
            <input id="f-nome" required />
          </label>
          <label>E-mail
            <input id="f-email" type="email" />
          </label>
          <label>Telefone / WhatsApp
            <input id="f-telefone" />
          </label>
          <label>CPF / CNPJ
            <input id="f-documento" />
          </label>
          <label>Cidade
            <input id="f-cidade" />
          </label>
          <label class="full">Endereço
            <input id="f-endereco" />
          </label>
          <label class="full">Observações
            <input id="f-observacoes" placeholder="Algo que o escritório deva saber" />
          </label>
          <div class="full">
            <button class="btn btn-primary" type="submit" id="cad-enviar">Enviar cadastro</button>
          </div>
          <p class="erro full" id="cad-erro" hidden></p>
        </form>
      </section>

      <footer class="pub-rodape">
        <p class="pub-rodape-nome">SCHRAMM ARQUITETURA E ENGENHARIA</p>
        <p class="muted">Seus dados são usados apenas para o acompanhamento da sua obra.</p>
      </footer>
    </div>`;

  const form = container.querySelector('#form-cad');
  const erro = container.querySelector('#cad-erro');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    erro.hidden = true;
    const nome = container.querySelector('#f-nome').value.trim();
    if (!nome) { erro.textContent = 'Informe o seu nome.'; erro.hidden = false; return; }

    const registro = {
      token,
      ownerId: convite.ownerId,
      nome,
      email: container.querySelector('#f-email').value.trim() || null,
      telefone: container.querySelector('#f-telefone').value.trim() || null,
      documento: container.querySelector('#f-documento').value.trim() || null,
      cidade: container.querySelector('#f-cidade').value.trim() || null,
      endereco: container.querySelector('#f-endereco').value.trim() || null,
      observacoes: container.querySelector('#f-observacoes').value.trim() || null,
    };

    const btn = container.querySelector('#cad-enviar');
    btn.disabled = true; btn.textContent = 'Enviando…';

    try {
      await criarClientePublico(registro);
    } catch {
      btn.disabled = false; btn.textContent = 'Enviar cadastro';
      erro.textContent = 'Não foi possível enviar agora. Tente novamente.';
      erro.hidden = false;
      return;
    }

    container.querySelector('.cadastro-card').innerHTML = `
      <div class="cad-sucesso">
        <div class="cad-check">✓</div>
        <h1 class="cad-titulo">Cadastro enviado!</h1>
        <p class="muted">Obrigado, ${esc(nome)}. O escritório já recebeu seus dados. 🙌</p>
      </div>`;
  });
}
