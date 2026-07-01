import { supabase } from '../supabaseClient.js';
import { logoPlaceholder } from '../lib/marca.js';

// Tela de acesso da arquiteta. O usuário é criado no Supabase
// (Authentication -> Users) — este piloto não tem cadastro aberto.
export function renderLogin(container) {
  container.innerHTML = `
    <div class="auth-wrap">
      <div class="card auth-card">
        <div class="auth-marca">${logoPlaceholder('logo-ph-login', 'Espaço para o logotipo do escritório')}</div>
        <h1 class="logo">Painel de Controle de Obras</h1>
        <p class="muted">Acesso da arquiteta</p>
        <form id="form-login" novalidate>
          <label>E-mail
            <input type="email" id="email" required autocomplete="email" />
          </label>
          <label>Senha
            <input type="password" id="senha" required autocomplete="current-password" />
          </label>
          <button class="btn btn-primary" type="submit">Entrar</button>
          <p class="erro" id="erro-login" hidden></p>
        </form>
      </div>
    </div>`;

  const form = container.querySelector('#form-login');
  const erro = container.querySelector('#erro-login');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    erro.hidden = true;

    const email = container.querySelector('#email').value.trim();
    const password = container.querySelector('#senha').value;
    const btn = form.querySelector('button');

    btn.disabled = true;
    btn.textContent = 'Entrando…';

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    btn.disabled = false;
    btn.textContent = 'Entrar';

    if (error) {
      erro.textContent = traduzErro(error.message);
      erro.hidden = false;
    }
    // Em caso de sucesso, o onAuthStateChange (em main.js) redireciona sozinho.
  });
}

function traduzErro(msg = '') {
  if (/invalid login credentials/i.test(msg)) return 'E-mail ou senha incorretos.';
  if (/email not confirmed/i.test(msg)) return 'E-mail ainda não confirmado.';
  return 'Não foi possível entrar. Tente novamente.';
}
