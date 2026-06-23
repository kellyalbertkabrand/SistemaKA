// Pequenos utilitários de formatação e texto.

export function moeda(valor) {
  const n = Number(valor || 0);
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function dataBR(d) {
  if (!d) return '';
  const [ano, mes, dia] = String(d).slice(0, 10).split('-');
  if (!ano || !mes || !dia) return String(d);
  return `${dia}/${mes}/${ano}`;
}

export function pct(parte, total) {
  if (!total || total <= 0) return 0;
  return Math.round((Number(parte) / Number(total)) * 100);
}

// "Casa da Família Silva" -> "casa-da-familia-silva"
export function slugify(texto) {
  return String(texto || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // tira acentos
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// Escapa texto antes de jogar em innerHTML (evita HTML quebrado/injeção).
export function esc(texto) {
  return String(texto ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
