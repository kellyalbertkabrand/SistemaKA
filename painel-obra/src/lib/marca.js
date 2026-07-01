// Identidade visual do escritório (Schramm Arquitetura e Engenharia).
// Ainda NÃO temos o arquivo final do logo, então usamos um placeholder
// claro ("LOGO DO ESCRITÓRIO"). Quando o logo oficial chegar (PNG/SVG),
// basta trocar logoPlaceholder por uma <img> aqui.

export function logoPlaceholder(classe = '', texto = 'LOGO DO ESCRITÓRIO') {
  return `<div class="logo-ph ${classe}">${texto}</div>`;
}

// Retângulo cinza claro com o espaço do logotipo + nome do escritório.
// Usado no login e no cabeçalho do painel do cliente.
export function caixaLogo(classe = '') {
  return `<div class="caixa-logo ${classe}">
    <span class="caixa-logo-marca">LOGOTIPO</span>
    <span class="caixa-logo-nome">SCHRAMM ARQUITETURA E ENGENHARIA</span>
  </div>`;
}

// Lockup do cabeçalho do cliente: placeholder do logo + nome + assinatura.
export function marcaSchramm() {
  return `<div class="marca">
    ${logoPlaceholder('logo-ph-lg')}
    <div class="marca-txt">
      <span class="marca-nome">SCHRAMM</span>
      <span class="marca-sub">Arquitetura e Engenharia</span>
    </div>
  </div>`;
}
