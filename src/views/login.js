import { entrar, redefinirSenha } from '../dados.js';
import { caixaLogo } from '../lib/marca.js';

// Tela de acesso da arquiteta. O usuário é criado no Firebase
// (Authentication -> Users) — este piloto não tem cadastro aberto.
export function renderLogin(container) {
  container.innerHTML = `
    <div class="auth-wrap">
      <div class="card auth-card">
        <div class="auth-marca">${caixaLogo('caixa-logo-login')}</div>
        <h1 class="logo">Painel de Controle<br>de Obras</h1>
        <p class="muted">Acesso Exclusivo do Escritório</p>
        <form id="form-login" novalidate>
          <label>E-mail
            <input type="email" id="email" required autocomplete="email" />
          </label>
          <label>Senha
            <input type="password" id="senha" required autocomplete="current-password" />
          </label>
          <button class="btn btn-primary" type="submit">Entrar</button>
          <button class="link-inline" type="button" id="esqueci-senha">Esqueci minha senha</button>
          <p class="erro" id="erro-login" hidden></p>
          <p class="aviso-ok" id="ok-login" hidden></p>
        </form>
      </div>
    </div>`;

  const form = container.querySelector('#form-login');
  const erro = container.querySelector('#erro-login');
  const okMsg = container.querySelector('#ok-login');

  // Redefinir senha: envia o e-mail de redefinição do Firebase.
  container.querySelector('#esqueci-senha').addEventListener('click', async () => {
    erro.hidden = true;
    okMsg.hidden = true;
    const email = container.querySelector('#email').value.trim();
    if (!email) {
      erro.textContent = 'Digite seu e-mail no campo acima e clique de novo em "Esqueci minha senha".';
      erro.hidden = false;
      container.querySelector('#email').focus();
      return;
    }
    const link = container.querySelector('#esqueci-senha');
    link.disabled = true;
    const rotulo = link.textContent;
    link.textContent = 'Enviando…';
    try {
      await redefinirSenha(email);
      okMsg.innerHTML = `Enviamos um link para <strong>${email}</strong>. Abra o e-mail (confira o spam) e crie uma nova senha.`;
      okMsg.hidden = false;
    } catch (err) {
      const code = err?.code || '';
      erro.textContent = /invalid-email/.test(code) ? 'E-mail inválido.'
        : /user-not-found/.test(code) ? 'Não encontramos esse e-mail no sistema.'
        : /too-many-requests/.test(code) ? 'Muitas tentativas. Tente de novo em instantes.'
        : 'Não foi possível enviar o e-mail agora. Tente novamente.';
      erro.hidden = false;
    } finally {
      link.disabled = false;
      link.textContent = rotulo;
    }
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    erro.hidden = true;

    const email = container.querySelector('#email').value.trim();
    const password = container.querySelector('#senha').value;
    const btn = form.querySelector('button');

    btn.disabled = true;
    btn.textContent = 'Entrando…';

    try {
      await entrar(email, password);
      // Em caso de sucesso, o aoMudarAuth (em main.js) redireciona sozinho.
    } catch (err) {
      btn.disabled = false;
      btn.textContent = 'Entrar';
      erro.textContent = traduzErro(err?.code || '');
      erro.hidden = false;
    }
  });
}

function traduzErro(code = '') {
  if (/invalid-credential|wrong-password|user-not-found/.test(code)) return 'E-mail ou senha incorretos.';
  if (/invalid-email/.test(code)) return 'E-mail inválido.';
  if (/too-many-requests/.test(code)) return 'Muitas tentativas. Tente de novo em instantes.';
  return 'Não foi possível entrar. Tente novamente.';
}
