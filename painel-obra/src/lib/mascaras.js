// Máscaras (telefone, CNPJ, CPF/CNPJ) e verificação de e-mail com sugestão.
// Usado nos formulários internos e nos links públicos de cliente/fornecedor.

export function soDigitos(v) {
  return String(v || '').replace(/\D+/g, '');
}

// (99) 9999-9999  ou  (99) 99999-9999 — formata progressivamente.
export function formatarTelefone(v) {
  const d = soDigitos(v).slice(0, 11);
  if (!d) return '';
  if (d.length <= 2) return `(${d}`;
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

// 99.999.999/9999-99
export function formatarCNPJ(v) {
  const d = soDigitos(v).slice(0, 14);
  let out = d.slice(0, 2);
  if (d.length > 2) out += '.' + d.slice(2, 5);
  if (d.length > 5) out += '.' + d.slice(5, 8);
  if (d.length > 8) out += '/' + d.slice(8, 12);
  if (d.length > 12) out += '-' + d.slice(12, 14);
  return out;
}

// CPF (999.999.999-99) até 11 dígitos; acima disso vira CNPJ.
export function formatarCpfCnpj(v) {
  const d = soDigitos(v).slice(0, 14);
  if (d.length <= 11) {
    let out = d.slice(0, 3);
    if (d.length > 3) out += '.' + d.slice(3, 6);
    if (d.length > 6) out += '.' + d.slice(6, 9);
    if (d.length > 9) out += '-' + d.slice(9, 11);
    return out;
  }
  return formatarCNPJ(d);
}

// Aplica uma máscara em tempo real ao input (e formata o valor já preenchido).
export function ligarMascara(input, formatar) {
  if (!input) return;
  const aplicar = () => { input.value = formatar(input.value); };
  if (input.value) aplicar();
  input.addEventListener('input', aplicar);
}

// Link do WhatsApp (wa.me) a partir de um telefone brasileiro. Sem texto —
// apenas abre a conversa. Devolve '' se o número for curto/inválido.
export function linkWhatsApp(tel) {
  const d = soDigitos(tel);
  let full;
  if (d.length === 12 || d.length === 13) full = d;          // já tem o 55 (país)
  else if (d.length === 10 || d.length === 11) full = '55' + d; // DDD + número
  else return '';
  return 'https://wa.me/' + full;
}

// ---------------------------------------------------------------------------
// E-mail: valida o formato e sugere correção de domínios comuns digitados errado.
// ---------------------------------------------------------------------------
const DOMINIOS = [
  'gmail.com', 'hotmail.com', 'outlook.com', 'yahoo.com', 'yahoo.com.br',
  'hotmail.com.br', 'outlook.com.br', 'live.com', 'icloud.com', 'bol.com.br',
  'uol.com.br', 'terra.com.br',
];

function distancia(a, b) {
  const m = a.length, n = b.length;
  const dp = Array.from({ length: m + 1 }, (_, i) => [i, ...Array(n).fill(0)]);
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const custo = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + custo);
    }
  }
  return dp[m][n];
}

// Devolve { ok, erro?, sugestao? }. E-mail vazio é ok (campo opcional).
export function validarEmail(email) {
  const e = String(email || '').trim();
  if (!e) return { ok: true };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e)) {
    return { ok: false, erro: 'E-mail parece incompleto. Confira (ex.: nome@gmail.com).' };
  }
  const dom = e.slice(e.lastIndexOf('@') + 1).toLowerCase();
  let melhor = null, best = 99;
  for (const d of DOMINIOS) {
    const dist = distancia(dom, d);
    if (dist < best) { best = dist; melhor = d; }
  }
  if (melhor && best > 0 && best <= 2 && dom !== melhor) {
    return { ok: true, sugestao: e.slice(0, e.lastIndexOf('@') + 1) + melhor };
  }
  return { ok: true };
}

// Liga a verificação de e-mail a um input + um elemento de mensagem (dica).
// Mostra erro de formato ou uma sugestão clicável ("Você quis dizer …?").
export function ligarEmail(input, msgEl) {
  if (!input || !msgEl) return;
  const checar = () => {
    const r = validarEmail(input.value);
    if (r.erro) {
      msgEl.textContent = r.erro; msgEl.hidden = false; msgEl.dataset.sug = '';
    } else if (r.sugestao) {
      msgEl.innerHTML = `Você quis dizer <a href="#" data-usar-email>${r.sugestao}</a>?`;
      msgEl.hidden = false; msgEl.dataset.sug = r.sugestao;
    } else {
      msgEl.hidden = true; msgEl.dataset.sug = '';
    }
  };
  input.addEventListener('blur', checar);
  input.addEventListener('input', () => { if (!msgEl.hidden) checar(); });
  msgEl.addEventListener('click', (e) => {
    const a = e.target.closest('[data-usar-email]');
    if (!a) return;
    e.preventDefault();
    if (msgEl.dataset.sug) { input.value = msgEl.dataset.sug; msgEl.hidden = true; }
  });
}
