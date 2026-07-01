// Identidade visual do escritório (Schramm Arquitetura e Engenharia).
// Ainda NÃO temos o arquivo final do logo, então usamos um placeholder
// claro ("LOGO DO ESCRITÓRIO"). Quando o logo oficial chegar (PNG/SVG),
// basta trocar logoPlaceholder por uma <img> aqui.

export function logoPlaceholder(classe = '', texto = 'LOGO DO ESCRITÓRIO') {
  return `<div class="logo-ph ${classe}">${texto}</div>`;
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
