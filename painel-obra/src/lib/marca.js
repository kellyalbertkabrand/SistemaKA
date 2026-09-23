// Identidade visual do escritório (cliente). A marca vem da pasta
// clientes/<VITE_CLIENTE>/ — o alias "@cliente" é definido no vite.config.js.
// O Vite resolve o import do logo para a URL final (com hash) no build.
import MARCA from '@cliente/config.js';
import logoUrl from '@cliente/logo.png';

export { MARCA };

// URL do logo, caso alguma tela precise usar direto.
export const logoMarca = logoUrl;

// Nome do escritório em caixa alta (rodapés).
export const NOME_MARCA = MARCA.nome.toUpperCase();

// Cor principal da marca (usada nas páginas de impressão/PDF, que não
// carregam o styles.css).
export const COR_ACENTO = MARCA.cores?.acento || '#c65a2e';

// A mesma cor em [r, g, b] (jsPDF).
export const RGB_ACENTO = (() => {
  const h = COR_ACENTO.replace('#', '');
  const n = parseInt(h.length === 3 ? h.split('').map((x) => x + x).join('') : h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
})();

// Logo do escritório como <img>. `classe` ajusta o tamanho por contexto.
export function logoImg(classe = '') {
  return `<img class="logo-schramm ${classe}" src="${logoMarca}" alt="${MARCA.nome}" />`;
}

// Compatibilidade: antes existia um placeholder cinza. Agora devolve o logo.
export function logoPlaceholder(classe = '') {
  return logoImg(classe);
}

// Bloco do logo usado no login e no cabeçalho do painel do cliente.
// O lockup já traz o nome do escritório, então não repetimos o texto.
export function caixaLogo(classe = '') {
  return `<div class="caixa-logo ${classe}">${logoImg()}</div>`;
}

// Lockup do cabeçalho do cliente.
export function marcaSchramm() {
  return `<div class="marca">${logoImg('logo-schramm-lg')}</div>`;
}
