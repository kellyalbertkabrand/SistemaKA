// Identidade visual do escritório (Schramm Arquitetura e Engenharia).
// O arquivo oficial do logo já chegou: é o lockup completo (monograma +
// "SCHRAMM" + "ARQUITETURA E ENGENHARIA"). O Vite resolve o import para a URL
// final (com hash) no build.
import logoSchramm from '../assets/logo-schramm.png';

// URL do logo, caso alguma tela precise usar direto.
export { logoSchramm };

// Logo do escritório como <img>. `classe` ajusta o tamanho por contexto.
export function logoImg(classe = '') {
  return `<img class="logo-schramm ${classe}" src="${logoSchramm}" alt="Schramm Arquitetura e Engenharia" />`;
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
